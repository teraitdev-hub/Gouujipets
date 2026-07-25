import { PageTransition } from "../../components/layout/PageTransition";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, CreditCard, Plus } from "lucide-react";
import { formatRupee } from "../../utils/currency";

export const Wallet = () => {
  const transactions = [
    { id: 1, type: "debit", amount: 1500, title: "Boarding at Happy Paws", date: "Today, 10:30 AM" },
    { id: 2, type: "credit", amount: 5000, title: "Added to Wallet via UPI", date: "Yesterday, 2:15 PM" },
    { id: 3, type: "debit", amount: 899, title: "Premium Salmon Dog Food", date: "Mon, 14 Jul" },
    { id: 4, type: "debit", amount: 1200, title: "Grooming Session - Bella", date: "Sat, 12 Jul" },
  ];

  return (
    <PageTransition className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">My Wallet</h1>
          <p className="text-gray-500 font-medium">Manage your balance and transactions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-[24px] border border-slate-700/50 text-white shadow-xl shadow-brand-900/20 relative overflow-hidden transition-all hover:-translate-y-1">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <WalletIcon size={32} className="text-brand-400 mb-6" />
            <p className="text-slate-400 font-medium mb-1">Available Balance</p>
            <h2 className="text-4xl font-black mb-8">{formatRupee(12500)}</h2>
            
            <button className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
              <Plus size={20} /> Add Funds
            </button>
          </div>
          
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 bg-white/50 border border-white/60 rounded-full flex items-center justify-center text-slate-900 shadow-sm">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Manage Payment Methods</h3>
              <p className="text-sm text-slate-500">Add or remove cards & UPI</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2">
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Transactions</h2>
            
            <div className="space-y-6">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-white/40 border border-white/50 hover:bg-white/80 hover:border-white transition-all rounded-[20px]">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-white/60 ${t.type === 'credit' ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-900'}`}>
                      {t.type === 'credit' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.title}</h4>
                      <p className="text-sm text-slate-500">{t.date}</p>
                    </div>
                  </div>
                  <span className={`font-black text-lg ${t.type === 'credit' ? 'text-purple-700' : 'text-slate-900'}`}>
                    {t.type === 'credit' ? '+' : '-'}{formatRupee(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
