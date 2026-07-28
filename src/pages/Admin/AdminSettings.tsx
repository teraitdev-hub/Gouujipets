import { useState } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { ShieldCheck, Lock, Mail, User, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { auth, db } from "../../lib/firebase";
import { updatePassword, updateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

export const AdminSettings = () => {
  const { user } = useAuthStore();
  const [email, setEmail] = useState(user?.email || "admin@gouuji.com");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const currentUser = auth.currentUser;

      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters long.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (currentUser) {
          await updatePassword(currentUser, newPassword);
        }
      }

      if (email && currentUser && email !== currentUser.email) {
        await updateEmail(currentUser, email);
      }

      // Update Firestore user profile doc
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), {
          email: email,
          updated_at: new Date().toISOString()
        });
      }

      setMessage({ type: 'success', text: 'Admin account settings and master password updated successfully!' });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Error updating admin settings:", err);
      setMessage({ type: 'error', text: err.message || "Failed to update admin settings. You may need to re-authenticate." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-6 font-sans pb-24">
      {/* Header */}
      <div className="bg-purple-950 text-white rounded-3xl p-6 shadow-sm border border-purple-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-purple-400" />
            <h1 className="text-xl font-black text-white leading-none">Admin System & Account Settings</h1>
          </div>
          <p className="text-xs text-purple-200 mt-1 font-medium">
            Manage super admin account credentials, master authentication password, and security preferences.
          </p>
        </div>
        <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
          SUPER ADMIN
        </span>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl font-bold text-xs flex items-center gap-2 border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white border border-purple-200 rounded-3xl p-6 shadow-sm space-y-6">
        <h2 className="text-base font-black text-purple-950 border-b border-purple-100 pb-3 flex items-center gap-2">
          <User size={18} className="text-purple-600" /> Super Admin Credentials
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Admin ID / Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">This email address is used for primary Super Admin authentication.</p>
          </div>

          <hr className="border-purple-100 my-4" />

          <h3 className="text-xs font-black text-purple-950 uppercase tracking-widest flex items-center gap-2">
            <Lock size={16} className="text-purple-600" /> Change Master Password
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">New Password</label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 px-4 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/30"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-sm cursor-pointer active:scale-95"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Admin Credentials</span>
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
};
