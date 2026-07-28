import { useState, useEffect } from "react";
import { Building2, Search, Filter } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, onSnapshot } from "firebase/firestore";

export const AdminBusinesses = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [financials, setFinancials] = useState<Record<string, { revenue: number, expenses: number, profit: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
    if (!window.confirm(`Are you sure you want to ${newStatus} this facility?`)) return;
    try {
      await updateDoc(doc(db, 'businesses', businessId), { status: newStatus });
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, status: newStatus } : b));
      
      const loginUrl = `${window.location.origin}/partner/login?approved=true`;
      
      const recipient = typeof ownerId === 'string' ? ownerId : (ownerId?.email || ownerId?.id || 'partner@example.com');
      await addDoc(collection(db, 'mail'), {
        to: recipient,
        message: {
          subject: `GouujiPets Partner Account ${newStatus === 'active' || newStatus === 'approved' ? 'Approved! 🎉' : 'Status Update'}`,
          text: `Your GouujiPets Partner Account has been ${newStatus}. Click here to log in to your Partner Dashboard: ${loginUrl}`,
          html: `<p>Your GouujiPets Partner Account has been ${newStatus}.</p><p><a href="${loginUrl}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Click Here to Login to Partner Dashboard</a></p>`
        },
        created_at: new Date().toISOString()
      });
      alert(`Facility marked as ${newStatus}. Direct login approval link (${loginUrl}) sent to partner.`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
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

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                        </div>
                      ) : (
                        <button className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-lg transition-all shadow-sm">
                          Manage
                        </button>
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
    </div>
  );
};
