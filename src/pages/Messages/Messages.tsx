import { PageTransition } from "../../components/layout/PageTransition";
import { Search, Edit } from "lucide-react";
import { motion } from "framer-motion";

const messages: any[] = [];

export const Messages = () => {
  return (
    <PageTransition className="pb-24 max-w-3xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <button className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center hover:bg-brand-600 hover:text-white transition-colors">
          <Edit size={18} />
        </button>
      </div>

      <div className="relative group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search messages..." 
          className="w-full h-12 bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
        />
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium">You have no new messages.</div>
        ) : (
          messages.map((msg, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={msg.id}
              className="flex items-center gap-4 p-4 border-b border-white/50 last:border-0 hover:bg-white/50 transition-colors cursor-pointer"
            >
              <div className="relative">
                <img src={msg.avatar} alt={msg.sender} className="w-14 h-14 rounded-full object-cover border border-slate-200" />
                {msg.unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{msg.unread}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-bold text-sm truncate ${msg.unread > 0 ? 'text-slate-900' : 'text-slate-500'}`}>{msg.sender}</h4>
                  <span className={`text-[10px] shrink-0 ${msg.unread > 0 ? 'text-brand-600 font-bold' : 'text-slate-500'}`}>{msg.time}</span>
                </div>
                <p className={`text-xs truncate ${msg.unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{msg.preview}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
    </PageTransition>
  );
};
