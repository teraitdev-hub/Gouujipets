import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { Bell, Calendar, Syringe, HeartPulse, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";

export const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      // Sort in JS to prevent index requirement crashes
      data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setNotifications(data);
    }, (err) => {
      console.error("Realtime notifications error:", err);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "booking":
      case "appointment":
        return Calendar;
      case "vaccine":
      case "health":
        return Syringe;
      case "message":
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "Just now";
    try {
      const d = new Date(timeStr);
      const diffMs = new Date().getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch (e) {
      return "Recently";
    }
  };

  if (!user) {
    return (
      <PageTransition className="pb-24 max-w-3xl mx-auto text-center py-12">
        <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-8 border border-white/80 max-w-md mx-auto shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-2">Access Denied</h2>
          <p className="text-xs text-slate-500">Please log in to view notifications.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="pb-24 max-w-3xl mx-auto space-y-6 px-4 sm:px-6 pt-6 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Bell size={20} />
          </div>
          Notifications
        </h1>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-colors shadow-sm">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notif, index) => {
          const IconComponent = getIcon(notif.type);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={notif.id}
              className={`rounded-[32px] p-6 border transition-all flex gap-5 group cursor-pointer ${
                notif.read 
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)]' 
                  : 'bg-slate-900 border-slate-800 text-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                notif.read 
                  ? 'bg-slate-50 text-slate-600 group-hover:bg-slate-100' 
                  : 'bg-slate-800 text-white'
              }`}>
                <IconComponent size={24} />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className={`text-base truncate ${notif.read ? 'text-slate-900 font-bold' : 'text-white font-black'}`}>
                    {notif.title}
                  </h4>
                  <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${notif.read ? 'text-slate-400' : 'text-slate-300'}`}>
                    {formatTime(notif.created_at)}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed pr-4 ${notif.read ? 'text-slate-500 font-medium' : 'text-slate-300 font-medium'}`}>
                  {notif.message || notif.content}
                </p>
              </div>
              {!notif.read && <div className="w-3 h-3 bg-emerald-500 rounded-full mt-2.5 shrink-0 shadow-sm border-2 border-slate-900" />}
            </motion.div>
          );
        })}
        
        {notifications.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[24px] flex items-center justify-center mx-auto mb-5">
              <Bell size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-900">All caught up!</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">You have no new notifications.</p>
          </div>
        )}
      </div>
      
    </PageTransition>
  );
};
