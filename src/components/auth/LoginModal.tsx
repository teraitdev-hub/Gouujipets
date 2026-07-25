import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Smartphone, PawPrint, Sparkles, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";
import { loginWithGoogle } from "../../services/auth";
import { useState } from "react";

export const LoginModal = () => {
  const { isLoginModalOpen, closeLoginModal } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError("");
      await loginWithGoogle('customer');
      await useAuthStore.getState().loadUser();
      closeLoginModal();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "Google Login failed or was cancelled.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoginModalOpen) return null;

  return (
    <AnimatePresence>
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Blurred Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            onClick={closeLoginModal}
          />
          
          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[36px] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-white/80"
          >
            {/* Ambient Header Glow */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-purple-500/10 blur-xl pointer-events-none" />

            {/* Header */}
            <div className="p-7 pb-2 relative text-center">
              <button 
                onClick={closeLoginModal} 
                className="absolute top-6 right-6 w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl flex items-center justify-center transition-colors shadow-xs active:scale-90"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-purple-500 to-purple-400 flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-brand-500/30 group">
                <PawPrint size={30} className="transform -rotate-12 transition-transform duration-300" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-brand-200/60 shadow-xs">
                <Sparkles size={12} className="text-purple-500" /> Verified Pet Parent Portal
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 text-xs sm:text-sm font-bold">Sign in to manage bookings, live feeds & wallet rewards.</p>
            </div>
            
            {/* Body */}
            <div className="p-7 pt-5 space-y-4">
              
              {error && (
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl font-bold text-xs text-center border border-purple-200 shadow-xs">
                  {error}
                </div>
              )}

              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white border-2 border-slate-200/80 hover:border-brand-300 hover:bg-slate-50 text-slate-900 font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm active:scale-95 disabled:opacity-50 group"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                <span>{isLoading ? "Connecting Securely..." : "Continue with Google"}</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200/80"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-slate-200/80"></div>
              </div>

              <button 
                onClick={() => { closeLoginModal(); navigate('/login/user'); }}
                className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 hover:from-black hover:to-slate-900 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 group"
              >
                <div className="flex items-center gap-1.5 text-brand-400">
                  <Mail size={18} />
                  <Smartphone size={18} />
                </div>
                <span>Email or Mobile Login</span>
              </button>

            </div>
            
            {/* Footer */}
            <div className="p-6 pt-3 text-center text-xs font-bold text-slate-500 bg-slate-50/80 mt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
              <span>Don't have an account yet?</span>
              <span 
                onClick={() => { closeLoginModal(); navigate('/login/user'); }} 
                className="text-brand-600 font-black hover:underline cursor-pointer flex items-center gap-1"
              >
                Create Free Account →
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

