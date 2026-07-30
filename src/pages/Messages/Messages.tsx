import { PageTransition } from "../../components/layout/PageTransition";
import { Search, Edit, CheckCheck, MoreHorizontal, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";

interface Conversation {
  id: string;
  senderName: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
  avatar: string;
  online: boolean;
}

export const Messages = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("user_id", "==", user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      
      data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setMessages(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const filteredMessages = messages.filter(msg => 
    msg.senderName?.toLowerCase().includes(search.toLowerCase()) || 
    msg.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition className="pb-24 max-w-3xl mx-auto space-y-6 px-4 sm:px-6 pt-6 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Messages</h1>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-sm">
            <CheckCheck size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm">
            <Edit size={18} />
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
        <input 
          type="text" 
          placeholder="Search messages..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 bg-white border border-slate-200 rounded-[20px] pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
        />
      </div>

      <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg, index) => {
            const timeFormatted = new Date(msg.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={msg.id}
                className="flex items-start gap-4 p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="relative shrink-0">
                  <img src={msg.avatar} alt={msg.senderName} className="w-14 h-14 rounded-full object-cover shadow-sm" />
                  {msg.online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className={`font-bold text-sm truncate ${msg.unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>{msg.senderName}</h4>
                    <span className={`text-[11px] shrink-0 font-semibold ${msg.unread > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{timeFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-sm truncate pr-4 ${msg.unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>{msg.lastMessage}</p>
                    {msg.unread > 0 ? (
                      <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                        {msg.unread}
                      </span>
                    ) : (
                      <MoreHorizontal size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No Messages Found</h3>
            <p className="text-sm font-medium text-slate-500">Try adjusting your search to find what you're looking for.</p>
          </div>
        )}
      </div>
      
    </PageTransition>
  );
};

