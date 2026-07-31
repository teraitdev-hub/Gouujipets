import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ActivitySquare, RefreshCw } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useAuthStore } from '../../store/useAuthStore';

export const VerifyEmail = () => {
  const { user, loadUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    // If the user's email is already verified, redirect them
    if (auth.currentUser?.emailVerified) {
      handleProceed();
    }
  }, [user]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleProceed = async () => {
    await auth.currentUser?.reload();
    await loadUser();
    if (auth.currentUser?.emailVerified) {
      if (!user?.isRegistrationComplete && user?.role === 'customer') {
          navigate('/complete-registration');
      } else {
          navigate('/dashboard');
      }
    } else {
      setError("Email is not verified yet. Please check your inbox and click the verification link.");
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (cooldown > 0) {
        setError(`Please wait ${cooldown} seconds before requesting a new email.`);
        setLoading(false);
        return;
      }
      
      await sendEmailVerification(auth.currentUser);
      setSuccess("Verification email sent! Please check your inbox.");
      setCooldown(60); // 60s cooldown
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError(err.message || 'Failed to send verification email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-slate-100 relative overflow-hidden">
        
        {/* Background Decorative Blob */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-purple-100 blur-2xl opacity-50 pointer-events-none"></div>

        <div className="flex justify-center mb-6 relative">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Mail className="w-8 h-8" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Verify Your Email</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">
          We've sent a verification email to <strong>{auth.currentUser?.email || 'your email'}</strong>. Please verify your email to activate your account.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-green-100 text-center">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleProceed}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            I've Verified My Email
            <ArrowRight className="w-5 h-5" />
          </button>

          <button 
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <ActivitySquare className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                {cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Email'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
