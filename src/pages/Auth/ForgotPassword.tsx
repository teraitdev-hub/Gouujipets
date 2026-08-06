import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ArrowRight, Loader2, KeyRound, Smartphone, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../../lib/firebase";
import { sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { OtpVerificationUI } from "../../components/auth/OtpVerificationUI";

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [authType, setAuthType] = useState<'email' | 'phone'>('email');
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (showOtp && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtp, resendTimer]);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) {}
    }
    const container = document.getElementById('recaptcha-container-forgot');
    if (container) container.innerHTML = '';
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-forgot', {
      size: 'invisible'
    });
    return window.recaptchaVerifier;
  };

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ''));

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    const cleanId = identifier.trim();
    const validPhone = isPhone(cleanId);

    if (!validPhone) {
      setError("Please enter a valid Phone Number.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (validPhone) {
        let formattedPhone = cleanId;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone.replace(/[^0-9]/g, '');
        }
        const verifier = setupRecaptcha();
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        setConfirmationResult(confirmation);
        setShowOtp(true);
        setResendTimer(60);
        setError(""); // Clear error for OTP input
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      setIsLoading(true);
      setError("");
      
      let formattedPhone = identifier.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/[^0-9]/g, '');
      }

      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setResendTimer(60);
    } catch (err: any) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;

    setIsLoading(true);
    setError("");

    try {
      await confirmationResult.confirm(otp);
      // User is authenticated, navigate to reset password page with method query
      navigate("/reset-password?method=phone");
    } catch (err: any) {
      setError("Invalid OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-8 overflow-hidden"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <KeyRound size={32} className="text-white" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Account Recovery
          </h1>
          <p className="text-gray-500 font-medium mt-2">
            Enter your phone number to receive the OTP.
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-xl font-medium text-sm text-center ${error.includes('sent') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {error}
          </div>
        )}

        <div id="recaptcha-container-forgot"></div>

        <AnimatePresence mode="wait">
          {!showOtp ? (
            <motion.form 
              key="request-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRequestOTP} 
              className="space-y-4"
            >
              <div className="relative">
                <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Enter your phone number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <>
                    Get OTP
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="mt-8 text-center">
                <Link 
                  to="/login/user"
                  className="text-gray-500 font-medium hover:text-gray-900 transition-colors inline-flex items-center gap-2"
                >
                  <ArrowRight size={16} className="rotate-180" /> Back to Login
                </Link>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <OtpVerificationUI 
                otp={otp}
                setOtp={setOtp}
                isLoading={isLoading}
                onSubmit={handleVerifyOTP}
                onCancel={() => { setShowOtp(false); setConfirmationResult(null); }}
                onResend={handleResendOTP}
                resendTimer={resendTimer}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
