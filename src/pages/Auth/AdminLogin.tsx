import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { ShieldAlert, Lock, ArrowRight, Loader2, Mail } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: "admin@gouuji.com", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Force sign out of any existing session to prevent role conflicts
      await signOut(auth);

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } catch (authError: any) {
        throw new Error(authError.message || 'Authentication failed');
      }

      if (!userCredential.user) {
        throw new Error("Authentication failed");
      }

      // Fetch role and extra data from our users table
      const docRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(docRef);
      let userData = null;
      if (userSnap.exists()) {
        userData = userSnap.data();
      } else {
        console.error('Error fetching user role: Not found');
      }

      const role = userData?.role || 'admin';
      
      if (role !== 'admin' && role !== 'superadmin') {
        // If not admin, sign them out immediately
        await signOut(auth);
        throw new Error("Unauthorized: Admin access only.");
      }

      // Update the Zustand store immediately so the App layout check passes
      useAuthStore.getState().login({
        id: userCredential.user.uid,
        email: userCredential.user.email || undefined,
        role: role
      });

      // Navigate to dashboard
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="System Admin" 
      subtitle="Secure access for system administrators only."
      imageUrl="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000"
    >
      <form className="space-y-5 font-sans" onSubmit={handleSubmit}>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-[16px] space-y-1 mb-6">
          <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
            <ShieldAlert className="text-purple-600 shrink-0" size={16} />
            <span>Authorized Super Admin Access</span>
          </div>
          <p className="text-[11px] text-purple-700 font-medium leading-relaxed">
            Default Admin credentials: <span className="font-bold underline">admin@gouuji.com</span> / <span className="font-bold underline">admin123</span>
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-[16px] text-sm font-medium mb-4">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Admin Email</label>
          <div className="relative group form_inputContainer">
            <Mail size={18} className="form_inputIcon group-focus-within:text-purple-600 transition-colors" />
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="admin@gouuji.com" 
              className="form_inputField !pl-11"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Master Password</label>
            <a href="/forgot-password" className="text-xs font-bold text-purple-600 hover:underline">Forgot?</a>
          </div>
          <div className="relative group form_inputContainer">
            <Lock size={18} className="form_inputIcon group-focus-within:text-purple-600 transition-colors" />
            <input 
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••••••" 
              className="form_inputField !pl-11"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            disabled={isLoading}
            type="submit"
            className="form_button flex items-center justify-center gap-2 disabled:bg-gray-400 !bg-purple-600 hover:!bg-purple-700 text-white font-bold"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>Authenticate Control Desk <ArrowRight size={18} /></>
            )}
          </button>
        </div>

      </form>
    </AuthLayout>
  );
};
