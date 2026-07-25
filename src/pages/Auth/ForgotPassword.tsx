import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ArrowRight, Loader2, KeyRound, Smartphone, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [authType, setAuthType] = useState<'email' | 'phone'>('email');

  const isGmail = (input: string) => /^[a-zA-Z0-9._%+-]+@(?:gmail|googlemail)\.com$/.test(input.toLowerCase());
  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ''));

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    const cleanId = identifier.trim();
    const validGmail = isGmail(cleanId);
    const validPhone = isPhone(cleanId);

    if (!validGmail && !validPhone) {
      setError("Please enter a valid Gmail address or Phone Number.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (validPhone) {
        throw new Error("Phone reset not configured for this demo.");
      } else {
        await sendPasswordResetEmail(auth, cleanId);
        setAuthType('email');
        setError("Password reset email sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
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
            Enter your Gmail to receive a password reset link.
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-xl font-medium text-sm text-center ${error.includes('sent') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'request' && (
            <motion.form 
              key="request-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRequestOTP} 
              className="space-y-4"
            >
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Gmail Address"
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
                    Send Reset Link
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
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
