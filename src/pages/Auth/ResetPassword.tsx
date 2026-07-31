import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { auth } from "../../lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("oobCode");

    if (!code) {
      setError("Invalid or missing password reset link. Please request a new one.");
      setIsVerifying(false);
      return;
    }

    setOobCode(code);
    
    // Verify the code with Firebase
    verifyPasswordResetCode(auth, code)
      .then((email) => {
        setUserEmail(email);
        setIsVerifying(false);
      })
      .catch((err) => {
        setError("Your request to reset your password has expired or the link has already been used. This is often caused by email security scanners.");
        setIsVerifying(false);
      });
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !oobCode) return;

    setIsLoading(true);
    setError("");

    try {
      await confirmPasswordReset(auth, oobCode, password);
      navigate("/login/admin");
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try requesting a new reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-8"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <KeyRound size={32} className="text-white" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Create New Password
          </h1>
          <p className="text-gray-500 font-medium mt-2">
            Your identity has been verified. Please enter a strong new password for your account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-medium text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="password" 
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group mt-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                Save New Password
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
