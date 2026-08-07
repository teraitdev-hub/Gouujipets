import { useState, useEffect } from "react";
import { Building2, Search, Filter, X } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, getDoc, query, orderBy, doc, updateDoc, addDoc, onSnapshot } from "firebase/firestore";
import emailjs from "@emailjs/browser";
import { functions } from "../../lib/firebase";
import { httpsCallable } from "firebase/functions";

export const AdminBusinesses = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [financials, setFinancials] = useState<Record<string, { revenue: number, expenses: number, profit: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBizForManage, setSelectedBizForManage] = useState<any | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};

    const fetchFinancials = async (data: any[]) => {
      // Fetch all bookings to calculate revenue
      const bkQ = query(collection(db, 'bookings'));
      const bkSnap = await getDocs(bkQ);
      const bookings = bkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fetch all expenses to calculate expenses
      const expQ = query(collection(db, 'expenses'));
      const expSnap = await getDocs(expQ);
      const expensesData = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const finMap: Record<string, { revenue: number, expenses: number, profit: number }> = {};
      
      data.forEach(biz => {
        const bizId = biz.id;
        const bizBookings = bookings.filter((b: any) => b.business_id === bizId && b.status !== 'cancelled');
        const rev = bizBookings.reduce((sum, b: any) => sum + (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0), 0);
        
        const bizExpenses = expensesData.filter((e: any) => e.business_id === bizId && (e.entry_type === 'expense' || e.entry_type === 'loss' || !e.entry_type));
        const exp = bizExpenses.reduce((sum, e: any) => sum + (Number(e.amount) || 0), 0);
        
        finMap[bizId] = {
          revenue: rev,
          expenses: exp,
          profit: rev - exp
        };
      });

      setFinancials(finMap);
      setBusinesses(data || []);
      setIsLoading(false);
    };

    const setupListener = () => {
      setIsLoading(true);
      const q = query(collection(db, 'businesses'), orderBy('created_at', 'desc'));
      unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchFinancials(data).catch(console.error);
      }, (error) => {
        console.error("Error listening to businesses:", error);
        setIsLoading(false);
      });
    };
    
    setupListener();

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (businessId: string, newStatus: string, ownerId: any) => {
    if (!window.confirm(`Are you sure you want to change status to "${newStatus}" for this facility?`)) return;
    try {
      // First resolve the recipient email properly from the ownerId
      let recipient = 'partner@example.com';
      if (ownerId) {
        const ownerUid = typeof ownerId === 'string' ? ownerId : (ownerId?.id || ownerId?.uid);
        if (ownerUid) {
          const userDoc = await getDoc(doc(db, 'users', ownerUid));
          if (userDoc.exists() && userDoc.data()?.email) {
            recipient = userDoc.data().email;
          } else if (typeof ownerId === 'object' && ownerId.email) {
            recipient = ownerId.email;
          }
        }
      }

      if (newStatus === 'active' || newStatus === 'approved') {
        const approveFn = httpsCallable(functions, 'approvePartnerApplication');
        const response: any = await approveFn({ businessId, ownerEmail: recipient });
        
        const finalEmail = recipient !== 'partner@example.com' ? recipient : response.data?.targetEmail;
        
        // Dispatch EmailJS email if configured
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
        
        let sentViaEmailJs = false;
        if (serviceId && templateId && publicKey && finalEmail) {
           try {
              await emailjs.send(
                serviceId,
                templateId,
                {
                  to_email: finalEmail,
                  to_name: response.data?.businessName || "Partner",
                  subject: `Action Required: Welcome to GOUUJI Pets!`,
                  message: `Your partner application has been approved! Please activate your account using this link (expires in 24 hours): ${response.data?.activationLink}`
                },
                publicKey
              );
              console.log("Sent via EmailJS");
              sentViaEmailJs = true;
              alert("Email sent successfully via EmailJS!");
           } catch (emailErr) {
             console.error("Failed to send activation email via EmailJS:", emailErr);
           }
        }
        
        if (!sentViaEmailJs) {
           prompt("Facility approved, and the email request was sent to Firebase! Since email delivery might be delayed or misconfigured without SMTP, you can also copy the activation link below and send it manually:", response.data?.activationLink);
        }

        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, status: 'approved' } : b));
        return;
      }

      await updateDoc(doc(db, 'businesses', businessId), { status: newStatus });
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, status: newStatus } : b));
      
      const loginUrl = `${window.location.origin}/partner/login`;
      
      // recipient is already resolved above

      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey && recipient !== 'partner@example.com') {
        try {
          await emailjs.send(
            serviceId,
            templateId,
            {
              to_email: recipient,
              to_name: "Partner",
              subject: `GouujiPets Partner Account Status Update`,
              message: `Your GouujiPets Partner Account status has been updated to: ${newStatus}.`
            },
            publicKey
          );
        } catch (emailErr) {
          console.error("Failed to send email via EmailJS:", emailErr);
        }
      }

      await addDoc(collection(db, 'mail'), {
        to: recipient,
        message: {
          subject: `GouujiPets Partner Account Status Update`,
          text: `Your GouujiPets Partner Account status has been updated to: ${newStatus}.`,
          html: `<p>Your GouujiPets Partner Account status has been updated to: <strong>${newStatus}</strong>.</p>`
        },
        created_at: new Date().toISOString()
      });
      alert(`Facility marked as ${newStatus}. Status update processed.`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleResendActivation = async (businessId: string, ownerId: any) => {
    if (!window.confirm(`Resend activation email to this partner?`)) return;
    try {
      let recipient = 'partner@example.com';
      if (ownerId) {
        const ownerUid = typeof ownerId === 'string' ? ownerId : (ownerId?.id || ownerId?.uid);
        if (ownerUid) {
          const userDoc = await getDoc(doc(db, 'users', ownerUid));
          if (userDoc.exists() && userDoc.data()?.email) {
            recipient = userDoc.data().email;
          } else if (typeof ownerId === 'object' && ownerId.email) {
            recipient = ownerId.email;
          }
        }
      }

      const approveFn = httpsCallable(functions, 'approvePartnerApplication');
      const response: any = await approveFn({ businessId, ownerEmail: recipient });
      
      const finalEmail = recipient !== 'partner@example.com' ? recipient : response.data?.targetEmail;
      
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      let sentViaEmailJs = false;
      if (serviceId && templateId && publicKey && finalEmail) {
         try {
            await emailjs.send(
              serviceId,
              templateId,
              {
                to_email: finalEmail,
                to_name: response.data?.businessName || "Partner",
                subject: `Action Required: Welcome to GOUUJI Pets!`,
                message: `Your partner application has been approved! Please activate your account using this link (expires in 24 hours): ${response.data?.activationLink}`
              },
              publicKey
            );
            console.log("Sent via EmailJS");
            sentViaEmailJs = true;
            alert("Email sent successfully via EmailJS!");
         } catch (emailErr) {
           console.error("Failed to send activation email via EmailJS:", emailErr);
         }
      }
      
      if (!sentViaEmailJs) {
         prompt("Email request sent to Firebase successfully! If the partner does not receive it due to a missing Firebase SMTP configuration, you can manually copy and send them this activation link:", response.data?.activationLink);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to resend activation: ${err.message || 'Unknown error'}`);
    }
  };


  const filteredBusinesses = businesses.filter(b => {
    const q = searchQuery.toLowerCase();
    const name = b.name || '';
    const address = typeof b.address === 'string' ? b.address : (b.address?.city || '');
    return name.toLowerCase().includes(q) || address.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="text-purple-600" />
            Partner Facilities
          </h2>
          <p className="text-slate-500 mt-1">Manage pet care centers, boarding facilities, and clinics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search centers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-full sm:w-64 text-sm"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-black">Facility Details</th>
                <th className="p-4 font-black">Owner</th>
                <th className="p-4 font-black text-center">Category</th>
                <th className="p-4 font-black text-right">Financials</th>
                <th className="p-4 font-black text-center">Status</th>
                <th className="p-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                    Loading partner facilities...
                  </td>
                </tr>
              ) : filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                    No partner facilities found.
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((facility) => {
                  const fin = financials[facility.id] || { revenue: 0, expenses: 0, profit: 0 };
                  const isProfit = fin.profit >= 0;
                  return (
                  <tr key={facility.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{facility.name || 'Unnamed Facility'}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">{typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'No Location')}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{facility.owner_id?.full_name || 'Unknown Owner'}</div>
                      <div className="text-[10px] text-slate-500">{facility.owner_id?.phone || facility.contact_phone || 'No phone'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        {facility.type || facility.category || 'Boarding'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs font-black text-slate-900">Rev: ₹{fin.revenue.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-slate-500">Exp: ₹{fin.expenses.toLocaleString()}</div>
                      <div className={`text-[10px] font-black mt-0.5 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isProfit ? 'Profit' : 'Loss'}: ₹{Math.abs(fin.profit).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        facility.status === 'active' || facility.status === 'verified' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 
                        facility.status === 'pending' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                        'text-red-700 bg-red-50 border border-red-200'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        facility.status === 'active' || facility.status === 'verified' ? 'bg-emerald-500' : 
                        facility.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                        {facility.status || 'pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {facility.status === 'pending' ? (
                        <div className="flex flex-col gap-1.5 items-end">
                          <button onClick={() => handleUpdateStatus(facility.id, 'active', facility.owner_id)} className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black rounded shadow-sm w-full sm:w-auto text-center">
                            Approve
                          </button>
                          <button onClick={() => handleUpdateStatus(facility.id, 'rejected', facility.owner_id)} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 text-[10px] font-black rounded w-full sm:w-auto text-center">
                            Reject
                          </button>
                          <button 
                            onClick={() => setSelectedBizForManage(facility)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 text-[10px] font-black rounded w-full sm:w-auto text-center"
                          >
                            View Details
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-end">
                          <button 
                            onClick={() => handleResendActivation(facility.id, facility.owner_id)}
                            className="px-3 py-1.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-[10px] font-black rounded-lg transition-all shadow-sm w-full sm:w-auto text-center"
                          >
                            Resend Email
                          </button>
                          <button 
                            onClick={() => setSelectedBizForManage(facility)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-lg transition-all shadow-sm w-full sm:w-auto text-center"
                          >
                            Manage
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Showing {filteredBusinesses.length} facilities</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" disabled>Previous</button>
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {selectedBizForManage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setSelectedBizForManage(null)} 
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1">Manage Facility</h3>
            <p className="text-xs font-bold text-purple-600 mb-6 uppercase tracking-wider">
              {selectedBizForManage.name || "Unnamed Facility"}
            </p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const bizRef = doc(db, 'businesses', selectedBizForManage.id);
                await updateDoc(bizRef, {
                  name: selectedBizForManage.name,
                  type: selectedBizForManage.type,
                  address: selectedBizForManage.address,
                  status: selectedBizForManage.status
                });
                
                // Update state in lists
                setBusinesses(prev => prev.map(b => b.id === selectedBizForManage.id ? { ...b, ...selectedBizForManage } : b));
                
                // Send mail update
                const loginUrl = `${window.location.origin}/partner/login?approved=true`;
                
                let recipient = 'partner@example.com';
                const ownerId = selectedBizForManage.owner_id;
                if (ownerId) {
                  const ownerUid = typeof ownerId === 'string' ? ownerId : (ownerId?.id || ownerId?.uid);
                  if (ownerUid) {
                    const userDoc = await getDoc(doc(db, 'users', ownerUid));
                    if (userDoc.exists() && userDoc.data()?.email) {
                      recipient = userDoc.data().email;
                    } else if (typeof ownerId === 'object' && ownerId.email) {
                      recipient = ownerId.email;
                    }
                  }
                }
                
                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                if (serviceId && templateId && publicKey && recipient !== 'partner@example.com') {
                  try {
                    await emailjs.send(
                      serviceId,
                      templateId,
                      {
                        to_email: recipient,
                        to_name: selectedBizForManage.name || "Partner",
                        subject: `GouujiPets Partner Facility Update`,
                        message: `Your GouujiPets Facility "${selectedBizForManage.name}" has been updated. Status is now: ${selectedBizForManage.status}. Login here: ${loginUrl}`
                      },
                      publicKey
                    );
                  } catch (emailErr) {
                    console.error("Failed to send email via EmailJS:", emailErr);
                  }
                }
                
                await addDoc(collection(db, 'mail'), {
                  to: recipient,
                  message: {
                    subject: `GouujiPets Partner Facility Update`,
                    text: `Your GouujiPets Facility "${selectedBizForManage.name}" has been updated. Status is now: ${selectedBizForManage.status}. Login here: ${loginUrl}`,
                    html: `<p>Your GouujiPets Facility <strong>${selectedBizForManage.name}</strong> status is now: <strong>${selectedBizForManage.status}</strong>.</p><p><a href="${loginUrl}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Login to Dashboard</a></p>`
                  },
                  created_at: new Date().toISOString()
                });
                
                setSelectedBizForManage(null);
                alert("Facility details and status updated successfully!");
              } catch (err: any) {
                console.error(err);
                alert("Failed to update facility: " + err.message);
              }
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Facility Name</label>
                <input 
                  type="text" 
                  value={selectedBizForManage.name || ""} 
                  onChange={(e) => setSelectedBizForManage({ ...selectedBizForManage, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Category Type</label>
                <select 
                  value={selectedBizForManage.type || "boarding"} 
                  onChange={(e) => setSelectedBizForManage({ ...selectedBizForManage, type: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none cursor-pointer transition-all"
                >
                  <option value="boarding">Boarding</option>
                  <option value="daycare">Daycare</option>
                  <option value="grooming">Grooming</option>
                  <option value="veterinary">Veterinary Clinic</option>
                  <option value="training">Training</option>
                  <option value="walking">Walking</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Address / City</label>
                <input 
                  type="text" 
                  value={selectedBizForManage.address || ""} 
                  onChange={(e) => setSelectedBizForManage({ ...selectedBizForManage, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
                  required
                />
              </div>
              
              {selectedBizForManage.gstNumber && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">GST / Tax ID</label>
                  <div className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700">
                    {selectedBizForManage.gstNumber}
                  </div>
                </div>
              )}

              {selectedBizForManage.certificates && selectedBizForManage.certificates.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Uploaded Documents</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedBizForManage.certificates.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-purple-50 text-purple-700 font-semibold rounded-lg text-xs hover:bg-purple-100 transition-colors border border-purple-100">
                        View Document {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Verification Status</label>
                <select 
                  value={selectedBizForManage.status || "pending"} 
                  onChange={(e) => setSelectedBizForManage({ ...selectedBizForManage, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none cursor-pointer transition-all"
                >
                  <option value="active">Active / Approved</option>
                  <option value="pending">Pending Verification</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setSelectedBizForManage(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-all shadow-md shadow-purple-600/10 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
