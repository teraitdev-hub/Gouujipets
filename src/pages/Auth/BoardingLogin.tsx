import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Building2, KeyRound, ArrowRight, Loader2, Phone, Lock } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP } from "../../services/auth";

export const BoardingLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ phone: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ''));

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const userCredential = await verifyOTP(confirmationResult, otp, 'partner');
      
      const docRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(docRef);
      let userData = userSnap.exists() ? userSnap.data() : null;
      let role = userData?.role;
      
      if (role !== 'staff' && role !== 'partner' && role !== 'admin' && role !== 'super_admin') {
        await signOut(auth);
        throw new Error("Unauthorized: Staff access only.");
      }

      useAuthStore.getState().login({
        id: userCredential.user.uid,
        email: userCredential.user.email || undefined,
        role: role
      });

      navigate("/partner/dashboard");
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

    const validPhone = isPhone(formData.phone);

    if (!validPhone) {
      setError("Please enter a valid Phone Number.");
      setIsLoading(false);
      return;
    }

    try {
      // Force sign out of any existing session
      await signOut(auth);

      const recaptchaVerifier = setupRecaptcha("recaptcha-container");
      const confirmation = await sendOTP(formData.phone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check the number.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Staff Portal" 
      subtitle="Access boarding facility management dashboard."
      imageUrl="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=1000"
    >
      <div id="recaptcha-container"></div>
      
      {showOtpInput ? (
        <form className="space-y-5 font-sans" onSubmit={handleVerifyOtp}>
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-[16px] text-sm font-medium mb-4">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Enter 6-Digit Staff OTP</label>
            <div className="relative group form_inputContainer">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] group-focus-within:text-[#2D2D2D] transition-colors" />
              <input 
                type="text" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456" 
                maxLength={6}
                className="w-full h-12 bg-white border border-[#EBE6DF] rounded-[16px] pl-11 pr-4 tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 focus:border-[#2D2D2D]/50 transition-all shadow-sm"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6 flex-col">
            <button 
              disabled={isLoading}
              type="submit"
              className="w-full h-12 bg-[#2D2D2D] text-white font-bold rounded-[16px] shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Verify Staff OTP"}
            </button>
            <button 
              type="button"
              onClick={() => { setShowOtpInput(false); setConfirmationResult(null); }}
              className="w-full bg-white text-slate-600 font-bold py-3 rounded-[16px] border border-[#EBE6DF] hover:bg-slate-50 transition-all"
            >
              Change Staff Phone Number
            </button>
          </div>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-[16px] text-sm font-medium mb-4">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Staff Mobile Number</label>
            <div className="relative group">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] group-focus-within:text-[#2D2D2D] transition-colors" />
              <input 
                type="text" 
                placeholder="+91 98765 43210" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full h-12 bg-white border border-[#EBE6DF] rounded-[16px] pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 focus:border-[#2D2D2D]/50 transition-all shadow-sm"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#2D2D2D] text-white font-bold rounded-[16px] shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>Access Facility <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
