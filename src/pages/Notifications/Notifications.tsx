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
    <PageTransition className="pb-24 max-w-3xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="text-purple-600"/> Notifications
        </h1>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} className="text-purple-700 text-xs font-bold hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notif, index) => {
          const IconComponent = getIcon(notif.type);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={notif.id}
              className={`rounded-[24px] p-5 shadow-xs border transition-all flex gap-4 hover:-translate-y-0.5 hover:shadow-md ${
                notif.read 
                  ? 'bg-white/75 backdrop-blur-md border-purple-100' 
                  : 'bg-purple-50/50 border-purple-300 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                notif.read 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-purple-600 text-white shadow-sm'
              }`}>
                <IconComponent size={20} />
              </div>
              <div className="flex-1 pt-1">
                <h4 className={`text-sm mb-1 ${notif.read ? 'text-slate-655 font-medium' : 'text-slate-900 font-bold'}`}>
                  {notif.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                  {notif.message || notif.content}
                </p>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {formatTime(notif.created_at)}
                </span>
              </div>
              {!notif.read && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full mt-2" />}
            </motion.div>
          );
        })}
        
        {notifications.length === 0 && (
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl rounded-[24px] border border-purple-100">
            <Bell className="text-slate-300 mx-auto mb-3" size={32} />
            <h3 className="text-sm font-bold text-slate-900">All caught up!</h3>
            <p className="text-xs text-slate-500 mt-1">You have no new notifications.</p>
          </div>
        )}
      </div>
      
    </PageTransition>
  );
};
