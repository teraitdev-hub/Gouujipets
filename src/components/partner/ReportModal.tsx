import { motion } from "framer-motion";
import { X, DollarSign, TrendingUp, TrendingDown, Download, FileText } from "lucide-react";
import { formatRupee } from "../../utils/currency";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: any;
  bookings: any[];
  expenses: any[];
}

export const ReportModal = ({ isOpen, onClose, business, bookings, expenses }: ReportModalProps) => {
  if (!isOpen || !business) return null;

  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const downloadCSV = () => {
    const csvRows = [];
    csvRows.push(['Date', 'Type', 'Description', 'Amount (INR)', 'Status']);
    
    bookings.forEach(b => {
      const totalAmt = (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0);
      csvRows.push([
        new Date(b.created_at).toLocaleDateString(),
        'Revenue',
        `Booking: ${b.customer_id?.full_name || 'Customer'}`,
        totalAmt,
        b.status
      ]);
    });

    expenses.forEach(e => {
      csvRows.push([
        new Date(e.date).toLocaleDateString(),
        'Expense',
        `${e.category} - ${e.description || ''}`,
        `-${e.amount}`,
        'Logged'
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${business.name.replace(/\s+/g, '_')}_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Combine and sort for the detailed view
  const allTransactions = [
    ...bookings.map(b => ({
      id: b.id,
      date: new Date(b.created_at),
      type: 'revenue',
      description: `Booking: ${b.customer_id?.full_name || 'Customer'}`,
      amount: (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0)
    })),
    ...expenses.map(e => ({
      id: e.id,
      date: new Date(e.date),
      type: 'expense',
      description: `${e.category} - ${e.description || 'Expense'}`,
      amount: Number(e.amount) || 0
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-purple-100 flex items-center justify-between bg-purple-50/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2"><FileText size={24} className="text-purple-600"/> Financial Report</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">{business.name} • {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={downloadCSV} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-sm transition-colors shadow-2xs">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={onClose} className="w-10 h-10 bg-white hover:bg-purple-50 border border-purple-200 rounded-full flex items-center justify-center text-slate-500 hover:text-purple-600 transition-colors shadow-2xs">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 border border-purple-200 p-6 rounded-[24px] shadow-2xs">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3"><TrendingUp size={20}/></div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatRupee(totalRevenue)}</h3>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 p-6 rounded-[24px] shadow-2xs">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3"><TrendingDown size={20}/></div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Expenses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatRupee(totalExpenses)}</h3>
            </div>

            <div className="bg-purple-950 border border-purple-800 p-6 rounded-[24px] shadow-lg text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm"><DollarSign size={20}/></div>
                <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">Net Profit</p>
                <h3 className="text-2xl font-black text-white mt-1">{formatRupee(netProfit)}</h3>
              </div>
            </div>
          </div>

          {/* Detailed Ledger */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4">Detailed Ledger</h3>
            <div className="border border-purple-200 rounded-[24px] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-50/80 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-purple-100">
                    <th className="p-4 rounded-tl-[24px]">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right rounded-tr-[24px]">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {allTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-purple-50 hover:bg-purple-50/50 transition-colors">
                      <td className="p-4 text-slate-600 font-medium text-xs">{tx.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="p-4 font-bold text-slate-900">{tx.description}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${tx.type === 'revenue' ? 'bg-purple-100 text-purple-900' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-black ${tx.type === 'revenue' ? 'text-purple-600' : 'text-purple-900'}`}>
                        {tx.type === 'revenue' ? '+' : '-'}{formatRupee(tx.amount)}
                      </td>
                    </tr>
                  ))}
                  {allTransactions.length === 0 && (
                    <tr><td colSpan={4} className="text-center p-8 text-slate-500 font-medium">No transactions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        
        {/* Mobile Download Button */}
        <div className="sm:hidden p-4 border-t border-purple-100 bg-white shrink-0">
           <button onClick={downloadCSV} className="w-full flex items-center justify-center gap-2 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[20px] font-black text-sm shadow-md shadow-2xs">
             <Download size={18} /> Export Full CSV Report
           </button>
        </div>

      </motion.div>
    </div>
  );
};
