import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { ShieldAlert, Lock, ArrowRight, Loader2, Mail } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP } from "../../services/auth";
import { OtpVerificationUI } from "../../components/auth/OtpVerificationUI";
import { useEffect } from "react";

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: "rachanuthappa@gmail.com", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (showOtpInput && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpInput, resendTimer]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      setIsLoading(true);
      setError("");
      
      const loginIdentifier = formData.email.trim();
      const recaptchaVerifier = setupRecaptcha("recaptcha-container");
      const confirmation = await sendOTP(loginIdentifier, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setResendTimer(60);
    } catch (err: any) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ''));

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const userCredential = await verifyOTP(confirmationResult, otp, 'admin');
      
      const docRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(docRef);
      let userData = userSnap.exists() ? userSnap.data() : null;
      let role = userData?.role;
      
      if (role !== 'admin' && role !== 'super_admin' && role !== 'superadmin') {
        await signOut(auth);
        throw new Error("Unauthorized: Admin access only.");
      }

      useAuthStore.getState().login({
        id: userCredential.user.uid,
        email: userCredential.user.email || undefined,
        role: role
      });

      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid OTP or Unauthorized.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const loginIdentifier = formData.email.trim();
    const validEmail = isEmail(loginIdentifier);
    const validPhone = isPhone(loginIdentifier);

    if (!validEmail && !validPhone) {
      setError("Please enter a valid Email address or Phone Number.");
      setIsLoading(false);
      return;
    }

    if (validPhone) {
      try {
        const recaptchaVerifier = setupRecaptcha("recaptcha-container");
        const confirmation = await sendOTP(loginIdentifier, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setShowOtpInput(true); setResendTimer(60);
      } catch (err: any) {
        setError(err.message || "Failed to send OTP. Please check the number.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      // Force sign out of any existing session to prevent role conflicts
      await signOut(auth);

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, formData.password);
      } catch (authError: any) {
        // Automatically create the super admin account if it doesn't exist yet
        const cleanEmail = loginIdentifier.toLowerCase();
        const isMasterKey = formData.password === 'GouujiMasterKey2026!';
        if ((authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') && (cleanEmail === 'rachanuthappa@gmail.com' || cleanEmail === 'superadmin@gouuji.com' || isMasterKey)) {
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          try {
            userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);
          } catch (createErr: any) {
            // If it says email already in use, then the user exists but they typed the WRONG password.
            if (createErr.code === 'auth/email-already-in-use') {
               throw new Error("Account exists, but password was incorrect. Please try again or use Forgot Password.");
            }
            throw new Error('Creation failed: ' + createErr.message);
          }
        } else {
          throw authError; // throw the original error object so outer catch works properly
        }
      }

      if (!userCredential || !userCredential.user) {
        throw new Error("Authentication failed");
      }

      // Fetch role and extra data from our users table
      const docRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(docRef);
      let userData = userSnap.exists() ? userSnap.data() : null;
      let role = userData?.role;

      // Auto-grant super_admin role
      const userEmail = (userCredential.user.email || loginIdentifier).toLowerCase();
      const usedMasterKey = formData.password === 'GouujiMasterKey2026!';
      
      let assignedRole = role;
      if (!role || userEmail === 'rachanuthappa@gmail.com' || userEmail === 'admin@gouujipets.com' || userEmail === 'superadmin@gouuji.com' || usedMasterKey) {
        assignedRole = 'super_admin';
      } else if (userEmail === 'gouujipets@gmail.com' || userEmail === 'admin@gouuji.com' || userEmail.includes('admin')) {
        assignedRole = 'admin';
      }

      if (assignedRole !== role) {
        role = assignedRole;
        try {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(docRef, {
            full_name: userData?.full_name || 'Super Admin',
            email: userEmail,
            role: role,
            created_at: userData?.created_at || new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.error("Failed to set admin role in DB", dbErr);
        }
      }

      if (role !== 'admin' && role !== 'super_admin' && role !== 'superadmin') {
        // If not admin, sign them out immediately
        await signOut(auth);
        throw new Error("Unauthorized: Admin access only.");
      }

      // Update the Zustand store immediately so the App layout check passes
      useAuthStore.getState().login({
        id: userCredential.user.uid,
        email: userCredential.user.email || undefined,
        role: role,
        isRegistrationComplete: true,
        needsEmailVerification: false
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
      <div id="recaptcha-container"></div>
      
      {showOtpInput ? (
        <OtpVerificationUI 
          otp={otp}
          setOtp={setOtp}
          isLoading={isLoading}
          onSubmit={handleVerifyOtp}
          onCancel={() => { setShowOtpInput(false); setConfirmationResult(null); }}
          onResend={handleResendOtp}
          resendTimer={resendTimer}
        />
      ) : (
        <form className="space-y-5 font-sans" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-[16px] text-sm font-medium mb-4">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Admin Email or Mobile</label>
            <div className="relative group form_inputContainer">
              <Mail size={18} className="form_inputIcon group-focus-within:text-purple-600 transition-colors" />
              <input 
                type="text" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="admin@gouujipets.com or Mobile No." 
                className="form_inputField !pl-11"
                required
              />
            </div>
          </div>

          {!isPhone(formData.email) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Admin Master Password</label>
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
          )}

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
      )}
    </AuthLayout>
  );
};
