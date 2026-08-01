import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, limit, documentId, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";
import { Users, Search, Phone, Mail, Calendar, IndianRupee, Loader2, BookOpen, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { fetchJournalEntries } from "../../utils/dbFallback";
import type { JournalEntry } from "../../utils/dbFallback";

interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  totalBookings: number;
  totalSpent: number;
  lastVisit: string | null;
}

export const PartnerCustomers = () => {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [customerEntries, setCustomerEntries] = useState<JournalEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchCustomers = async () => {
      if (!user) return;
      try {
        const qBiz = query(collection(db, "businesses"), where("owner_id", "==", user.id), limit(1));
        const bizSnap = await getDocs(qBiz);
        let bList = bizSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let business = bList?.[0] as any;
        if (!business) {
          business = { id: `partner-facility-${user.id}`, name: `${user.full_name || 'Care Partner'}'s Facility` };
        }

        const qBk = query(collection(db, "bookings"), where("business_id", "==", business.id));
        unsubscribe = onSnapshot(qBk, async (bkSnap) => {
          let bookings: any[] = bkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          bookings.sort((a, b) => {
            const dateA = a.check_out ? new Date(a.check_out).getTime() : 0;
            const dateB = b.check_out ? new Date(b.check_out).getTime() : 0;
            return dateB - dateA;
          });

          const customerIds = [...new Set(bookings.map(b => typeof b.customer_id === 'string' ? b.customer_id : b.customer_id?.id).filter(Boolean))];
          let userMap = new Map();
          for (let i = 0; i < customerIds.length; i += 10) {
            const chunk = customerIds.slice(i, i + 10);
            const qUsers = query(collection(db, "users"), where(documentId(), "in", chunk));
            const uSnap = await getDocs(qUsers);
            uSnap.docs.forEach(d => userMap.set(d.id, { id: d.id, ...d.data() }));
          }
          bookings = bookings.map(b => ({
            ...b,
            customer_id: typeof b.customer_id === 'string' ? userMap.get(b.customer_id) : b.customer_id
          }));

          let customerMap = new Map<string, CustomerData>();

          if (bookings) {
            bookings.forEach((b: any) => {
              const cust = b.customer_id;
              if (!cust || !cust.id) return;

              const spent = (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0);
              
              if (customerMap.has(cust.id)) {
                const existing = customerMap.get(cust.id)!;
                existing.totalBookings += 1;
                existing.totalSpent += spent;
                if (!existing.lastVisit || new Date(b.check_out) > new Date(existing.lastVisit)) {
                  existing.lastVisit = b.check_out;
                }
              } else {
                customerMap.set(cust.id, {
                  id: cust.id,
                  full_name: cust.full_name || "Unknown",
                  email: cust.email || "N/A",
                  phone: cust.phone || "N/A",
                  totalBookings: 1,
                  totalSpent: spent,
                  lastVisit: b.check_out
                });
              }
            });
          }

          setCustomers(Array.from(customerMap.values()));
          setIsLoading(false);
        }, (err) => {
          console.error("Failed to listen to bookings:", err);
          setIsLoading(false);
        });

      } catch (err) {
        console.error("Failed to fetch business:", err);
        setIsLoading(false);
      }
    };

    fetchCustomers();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-purple-950 flex items-center gap-2">
            <Users className="text-purple-600" />
            My Customers
          </h2>
          <p className="text-purple-600 mt-1">Directory of all clients who have booked with your facility.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-full sm:w-72 shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-hidden md:overflow-x-auto p-4 md:p-0">
            <table className="w-full text-left border-collapse min-w-full md:min-w-[800px] block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="p-4 font-bold">Customer Details</th>
                  <th className="p-4 font-bold">Contact</th>
                  <th className="p-4 font-bold text-center">Total Bookings</th>
                  <th className="p-4 font-bold text-right">Lifetime Value</th>
                  <th className="p-4 font-bold">Last Visit</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm block md:table-row-group">
                {filteredCustomers.map(cust => (
                  <tr key={cust.id} className="block md:table-row mb-4 md:mb-0 bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-2xl md:rounded-none overflow-hidden hover:bg-gray-50/50 transition-colors shadow-sm md:shadow-none">
                    <td className="flex justify-between items-center md:table-cell p-4 border-b border-gray-50 md:border-0">
                      <div className="md:hidden font-black text-xs text-slate-400 uppercase tracking-wider">Customer</div>
                      <div className="text-right md:text-left">
                        <div className="font-bold text-gray-900">{cust.full_name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{cust.id.slice(0, 8)}</div>
                      </div>
                    </td>
                    <td className="flex flex-col md:table-cell p-4 border-b border-gray-50 md:border-0 items-end md:items-start">
                      <div className="md:hidden font-black text-xs text-slate-400 uppercase tracking-wider mb-2 w-full text-left">Contact</div>
                      <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                        <Mail size={14} className="text-gray-400" /> {cust.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone size={14} className="text-gray-400" /> {cust.phone || "No phone"}
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-4 border-b border-gray-50 md:border-0 md:text-center">
                      <div className="md:hidden font-black text-xs text-slate-400 uppercase tracking-wider">Bookings</div>
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-bold">
                        {cust.totalBookings}
                      </span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-4 border-b border-gray-50 md:border-0 md:text-right">
                      <div className="md:hidden font-black text-xs text-slate-400 uppercase tracking-wider">Lifetime Value</div>
                      <span className="font-black text-purple-600 flex items-center gap-0.5">
                        <IndianRupee size={14} strokeWidth={2.5} />
                        {cust.totalSpent.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-4 border-b border-gray-50 md:border-0">
                      <div className="md:hidden font-black text-xs text-slate-400 uppercase tracking-wider">Last Visit</div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {cust.lastVisit ? new Date(cust.lastVisit).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                      </div>
                    </td>
                    <td className="flex justify-end items-center md:table-cell p-4 md:text-right bg-slate-50 md:bg-transparent">
                      <button 
                        onClick={async () => {
                          setSelectedCustomer(cust);
                          setIsLoadingLedger(true);
                          try {
                            const entries = await fetchJournalEntries();
                            const filtered = entries.filter(e => {
                              if (!e.party_name) return false;
                              const pName = e.party_name.toLowerCase();
                              const cName = cust.full_name.toLowerCase();
                              return pName === cName || pName.includes(cName) || cName.includes(pName);
                            });
                            setCustomerEntries(filtered);
                          } catch (err) {
                            console.error("Failed to fetch customer ledger:", err);
                          } finally {
                            setIsLoadingLedger(false);
                          }
                        }}
                        className="px-4 py-2 min-h-[48px] md:min-h-0 bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors w-full md:w-auto"
                      >
                        View Ledger <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-black mb-4 shadow-sm border border-purple-100">
                          🐾
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mb-1">No Customers Yet</h4>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">
                          When pet parents book your services, their details will automatically appear here for easy management.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Ledger Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-purple-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-purple-100 flex flex-col max-h-[90vh]">
            <div className="bg-purple-950 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">{selectedCustomer.full_name}'s Financial Ledger</h3>
                <p className="text-purple-200 text-[11px] mt-0.5 font-medium">Lifetime Spent: {selectedCustomer.totalSpent.toLocaleString("en-IN")} INR</p>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-purple-200 hover:text-white font-black p-2 bg-purple-800/50 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
              {isLoadingLedger ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="animate-spin text-purple-500" size={24} />
                </div>
              ) : customerEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <BookOpen size={32} className="text-purple-200 mb-2" />
                  <p className="text-slate-500 font-bold text-sm">No journal entries found for this customer.</p>
                  <p className="text-slate-400 text-xs mt-1">Bookings are tracked separately unless explicitly posted in the Journal.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="bg-white sticky top-0 shadow-sm border-b border-purple-100 text-[10px] font-black uppercase text-purple-900">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100/50">
                    {customerEntries.map((e, idx) => (
                      <tr key={e.id || idx} className="hover:bg-purple-50/50 bg-white transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{e.category}</p>
                          {e.description && <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{e.description}</p>}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {Number(e.amount).toLocaleString("en-IN")} INR
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                            e.entry_type === 'revenue' ? 'bg-emerald-100 text-emerald-800' :
                            e.entry_type === 'lending_lent' ? 'bg-blue-100 text-blue-800' :
                            e.entry_type === 'lending_borrowed' ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {e.entry_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            e.status === 'completed' || e.status === 'settled'
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-purple-600 text-white font-black animate-pulse'
                          }`}>
                            {e.status === 'completed' && <CheckCircle size={10} />}
                            {e.status === 'settled' && <CheckCircle size={10} />}
                            {e.status === 'pending' && <Clock size={10} />}
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-purple-100 bg-white">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-sm transition-colors"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
