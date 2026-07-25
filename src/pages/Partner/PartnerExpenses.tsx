import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { 
  DollarSign, 
  Plus, 
  Filter, 
  BookOpen, 
  ClipboardList, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  User, 
  FileText,
  CheckCircle,
  Clock,
  Briefcase
} from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { 
  fetchJournalEntries, 
  createJournalEntry, 
  updateJournalEntryStatus
} from "../../utils/dbFallback";
import { db } from "../../lib/firebase";
import { collection, query, where, limit, getDocs, onSnapshot } from "firebase/firestore";

export const PartnerExpenses = () => {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [businessId, setBusinessId] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [entryType, setEntryType] = useState<any['entry_type']>('revenue');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<any['status']>('completed');

  // Load Primary Business & Journal Entries with real-time onSnapshot
  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      // Resolve business ID (one-time fetch is fine here)
      let bizId = `partner-facility-${user.id}`;
      try {
        const q = query(collection(db, 'businesses'), where('owner_id', '==', user.id), limit(1));
        const businessesSnapshot = await getDocs(q);
        const businesses = businessesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (businesses && businesses.length > 0) {
          bizId = businesses[0].id;
        }
      } catch (err) {
        console.warn("Could not load business, using default", err);
      }
      setBusinessId(bizId);

      // Do an initial full load (expenses + bookings + localStorage)
      const initialData = await fetchJournalEntries(bizId);
      setEntries(initialData);

      // Subscribe to real-time expense changes via onSnapshot
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('business_id', '==', bizId)
      );
      unsubscribe = onSnapshot(expensesQuery, async () => {
        // Re-fetch full merged journal (expenses + bookings + localStorage) on any change
        const updatedData = await fetchJournalEntries(bizId);
        setEntries(updatedData);
      }, (err) => {
        console.warn('onSnapshot error on expenses, falling back silently:', err);
      });
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Date Filtering logic
  const getFilteredEntries = () => {
    const now = new Date();
    return entries.filter(e => {
      const entryDate = new Date(e.date);
      if (dateFilter === 'today') {
        return entryDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return entryDate >= weekAgo;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        return entryDate >= monthAgo;
      }
      return true; // all
    });
  };

  const filteredEntries = getFilteredEntries();

  // Financial Calculations
  const totalRevenue = entries
    .filter(e => e.entry_type === 'revenue' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('received')))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalExpenses = entries
    .filter(e => e.entry_type === 'expense' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('paid')))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalLoss = entries
    .filter(e => e.entry_type === 'loss')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalLent = entries
    .filter(e => e.entry_type === 'lending_lent' && e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalBorrowed = entries
    .filter(e => e.entry_type === 'lending_borrowed' && e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Cash running balance calculation
  let runningCash = 0;
  const cashLedgerData = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => {
      let isDebit = false; // Debit is Cash Inflow in Asset ledger
      let isCredit = false; // Credit is Cash Outflow in Asset ledger
      let impactAmount = 0;

      if (e.entry_type === 'revenue' || e.entry_type === 'lending_borrowed') {
        isDebit = true;
        impactAmount = Number(e.amount);
        runningCash += impactAmount;
      } else if (e.entry_type === 'expense' || e.entry_type === 'lending_lent' || e.entry_type === 'loss') {
        isCredit = true;
        impactAmount = Number(e.amount);
        runningCash -= impactAmount;
      } else if (e.entry_type === 'settlement') {
        if (e.category.toLowerCase().includes('received') || e.category.toLowerCase().includes('collection')) {
          isDebit = true;
          impactAmount = Number(e.amount);
          runningCash += impactAmount;
        } else {
          isCredit = true;
          impactAmount = Number(e.amount);
          runningCash -= impactAmount;
        }
      }

      return {
        ...e,
        debit: isDebit ? impactAmount : 0,
        credit: isCredit ? impactAmount : 0,
        balance: runningCash
      };
    })
    .reverse(); // Display newest first

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !category) {
      alert("Please enter a valid amount and category");
      return;
    }

    const payload: any = {
      business_id: businessId,
      entry_type: entryType,
      category,
      amount: Number(amount),
      date,
      description,
      party_name: partyName || undefined,
      status,
      // created_at is set inside createJournalEntry automatically
    };

    await createJournalEntry(payload);
    
    // Reset Form
    setCategory('');
    setAmount('');
    setPartyName('');
    setDescription('');
    setEntryType('revenue');
    setStatus('completed');
    setShowAddModal(false);
    // No manual reload needed — onSnapshot will trigger automatically for expense entries.
    // For non-expense types (stored locally), do a manual reload:
    if (entryType !== 'expense') {
      const data = await fetchJournalEntries(businessId);
      setEntries(data);
    }
  };

  const handleSettle = async (id: string, currentType: string, party: string, amt: number) => {
    if (!window.confirm(`Are you sure you want to settle the transaction with ${party} for ${formatRupee(amt)}?`)) {
      return;
    }

    const setType = currentType === 'lending_lent' ? 'settlement' : 'settlement';
    const setCategoryName = currentType === 'lending_lent' ? 'Collection Received (Lending)' : 'Payment Settled (Debt)';
    const setDesc = `Settled outstanding loan for ${party}`;

    // 1. Update old transaction status to settled
    await updateJournalEntryStatus(id, 'settled');

    // 2. Add a settlement cash transaction
    await createJournalEntry({
      business_id: businessId,
      entry_type: 'settlement',
      category: setCategoryName,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      description: setDesc,
      party_name: party,
      status: 'completed'
    });

    // Reload after settlement (settlement entries are stored locally)
    const data = await fetchJournalEntries(businessId);
    setEntries(data);
  };

  return (
    <div className="space-y-6 font-sans pb-24">
      {/* Financial Summary KPIs */}
      <div className="bg-purple-950 text-white rounded-3xl p-6 shadow-sm border border-purple-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            <h1 className="text-xl font-black tracking-tight">Complete Financial Statement</h1>
          </div>
          <p className="text-xs text-purple-200 mt-1 font-medium">Complete Ledger, Journal, and Profit & Loss statements.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => {
              setEntryType('revenue');
              setCategory('Booking Income');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all scale-102"
          >
            <Plus size={14} className="stroke-[3]" /> Post Journal Entry
          </button>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest">Total Balance</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-indigo-600 flex items-center justify-center font-bold">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-indigo-600">{formatRupee(runningCash)}</h2>
            <p className="text-[10px] text-purple-600 font-bold mt-1">Net account balance</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-emerald-600">{formatRupee(totalRevenue)}</h2>
            <p className="text-[10px] text-purple-600 font-bold mt-1">Total revenue generated</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest">Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-rose-600">{formatRupee(totalExpenses)}</h2>
            <p className="text-[10px] text-purple-600 font-bold mt-1">Total expenses logged</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest">Net Profit</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-purple-900">{formatRupee(Math.max(0, totalRevenue - totalExpenses))}</h2>
            <p className="text-[10px] text-purple-600 font-bold mt-1">Total profit (Revenue - Expenses)</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest">Net Loss</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-red-600 flex items-center justify-center">
              <TrendingUp size={16} className="transform rotate-180" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-red-600">{formatRupee(Math.max(0, totalExpenses - totalRevenue) + totalLoss)}</h2>
            <p className="text-[10px] text-purple-600 font-bold mt-1">Total loss incurred</p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center border-b border-purple-100 pb-2 gap-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-purple-700" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-purple-50 border border-purple-200 text-purple-800 font-bold rounded-xl px-3 py-1.5 text-xs outline-none focus:border-purple-600 transition-all"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time Records</option>
          </select>
        </div>
      </div>



      {/* ============================================================
          SECTION 2: GENERAL JOURNAL (Double-Entry Chronological Log)
          ============================================================ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 space-y-4">
          <div>
            <h2 className="text-sm font-black text-purple-950 flex items-center gap-2">
              📖 General Journal Entries
            </h2>
            <p className="text-[11px] text-purple-600 font-medium">Daily chronological registry of all business debit/credit accounts transactions.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-purple-50 border-y border-purple-200 text-[10px] uppercase font-black tracking-wider text-purple-900">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Account Type & description</th>
                  <th className="py-3 px-4">Reference/Party</th>
                  <th className="py-3 px-4 text-right">Debit (Inflow)</th>
                  <th className="py-3 px-4 text-right">Credit (Outflow)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 text-xs font-medium">
                {filteredEntries.map(e => {
                  // In double-entry formatting, Debit represents incoming asset/exp, Credit represents outgoing asset/revenue
                  const isDebit = e.entry_type === 'revenue' || e.entry_type === 'lending_borrowed' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('received'));
                  const isCredit = e.entry_type === 'expense' || e.entry_type === 'lending_lent' || e.entry_type === 'loss' || (e.entry_type === 'settlement' && !e.category.toLowerCase().includes('received'));

                  return (
                    <tr key={e.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3 px-4 text-purple-700 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-purple-400" />
                          {new Date(e.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                        </span>
                      </td>
                      <td className="py-4 px-4 min-w-[300px]">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase inline-block mb-1.5 ${
                          e.entry_type === 'revenue' ? 'bg-emerald-100 text-emerald-800' :
                          e.entry_type === 'expense' ? 'bg-amber-100 text-amber-800' :
                          e.entry_type === 'loss' ? 'bg-rose-100 text-rose-800' :
                          e.entry_type === 'lending_lent' ? 'bg-blue-100 text-blue-800' :
                          e.entry_type === 'lending_borrowed' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {e.category}
                        </span>
                        <p className="text-slate-900 font-bold leading-relaxed whitespace-pre-wrap">{e.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        {e.party_name ? (
                          <span className="flex items-center gap-1 text-purple-900 font-bold">
                            <User size={11} className="text-purple-400" />
                            {e.party_name}
                          </span>
                        ) : (
                          <span className="text-purple-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        {isDebit ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+{formatRupee(e.amount)}</span> : <span className="text-purple-300 font-normal">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        {isCredit ? <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md">-{formatRupee(e.amount)}</span> : <span className="text-purple-300 font-normal">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
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
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-purple-400 font-bold">
                      No journal records found. Click "Post Journal Entry" to write one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>





      {/* ============================================================
          MODAL DIALOG: POST JOURNAL ENTRY
          ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-purple-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-purple-100 flex flex-col max-h-[90vh]">
            <div className="bg-purple-950 text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-black text-xs uppercase tracking-wider">Post New Journal Transaction</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-purple-200 hover:text-white font-black text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Type Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-purple-700 uppercase">Entry Class</label>
                <select
                  value={entryType}
                  onChange={(e) => {
                    const type = e.target.value as any['entry_type'];
                    setEntryType(type);
                    // Autofill category options
                    if (type === 'revenue') setCategory('Booking Income');
                    else if (type === 'expense') setCategory('Supplies');
                    else if (type === 'lending_lent') setCategory('Client Credit');
                    else if (type === 'lending_borrowed') setCategory('Capital Loan');
                    else if (type === 'loss') setCategory('Damaged Stock');
                    else if (type === 'settlement') setCategory('Payment Settlement');
                  }}
                  className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-purple-600"
                >
                  <option value="revenue">Revenue (Cash Inflow / Earning)</option>
                  <option value="expense">Expense (Cash Outflow / Bill)</option>
                  <option value="lending_lent">Lending Lent (Money you lent out)</option>
                  <option value="lending_borrowed">Lending Borrowed (Money you borrowed)</option>
                  <option value="loss">Loss (Asset Damage / Write-off)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-purple-700 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-purple-700 uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-purple-700 uppercase">Account Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Booking Income, Salary, Supplies, Utilities"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                />
              </div>

              {/* Party Name (Lending/Borrowing/Revenue) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-purple-700 uppercase">Party Name (Lender/Borrower/Client)</label>
                <input
                  type="text"
                  placeholder="e.g. Aditi Sharma, HDFC Bank (Optional)"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                />
              </div>

              {/* Status (For lending/borrowing) */}
              {(entryType === 'lending_lent' || entryType === 'lending_borrowed') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-purple-700 uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                  >
                    <option value="pending">Pending Settlement</option>
                    <option value="completed">Instantly Settled</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-purple-700 uppercase">Description / Memo</label>
                <textarea
                  placeholder="Enter transaction narrative..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all pt-0.5 mt-2"
              >
                Post Ledger Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
