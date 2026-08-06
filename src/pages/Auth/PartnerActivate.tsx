import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { functions } from "../../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { checkPasswordStrength } from "../../utils/security";

export const PartnerActivate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const businessId = searchParams.get('id');

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !businessId) {
      setError("Invalid or missing activation link. Please check your email.");
    }
  }, [token, businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const strength = checkPasswordStrength(password);
    if (!strength.isStrong) {
      setError(strength.errors.join(" "));
      return;
    }

    setIsLoading(true);
    
    try {
      const activateFn = httpsCallable(functions, 'activatePartner');
      await activateFn({
        token,
        businessId,
        newPassword: password
      });
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to activate account. The link may have expired or already been used.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !businessId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-8 overflow-hidden"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <ShieldCheck size={32} className="text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Activate Your Account
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-2">
            Create a secure password to activate your partner dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Account Activated!</h2>
            <p className="text-slate-500 text-sm mb-8">
              Your password has been set securely. You can now log in to your dashboard.
            </p>
            <button 
              onClick={() => navigate('/partner/login?approved=true')}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
            >
              Go to Login
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl mt-6">
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2">Password Requirements</h4>
              <ul className="text-xs text-purple-700 font-medium space-y-1.5 list-disc pl-4">
                <li>Minimum 12 characters</li>
                <li>At least one uppercase and lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character (@$!%*?&)</li>
              </ul>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 group mt-6"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  Activate Account
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
