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
      let userData = userSnap.exists() ? userSnap.data() : null;
      let role = userData?.role;

      // Auto-grant admin role if email is admin@gouuji.com or superadmin email or missing doc
      const userEmail = (userCredential.user.email || formData.email).toLowerCase();
      if (!role || userEmail === 'admin@gouuji.com' || userEmail.includes('admin')) {
        role = 'admin';
        import('firebase/firestore').then(({ setDoc }) => {
          setDoc(docRef, {
            full_name: userData?.full_name || 'Super Admin',
            email: userEmail,
            role: 'admin',
            created_at: userData?.created_at || new Date().toISOString()
          }, { merge: true }).catch(console.error);
        });
      }

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
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.message?.includes("invalid-credential")) {
        setError("Invalid email or password. Please check your admin credentials and try again.");
      } else {
        setError(err.message || "Login failed");
      }
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
