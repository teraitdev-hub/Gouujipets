import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, ArrowRight, ActivitySquare } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { RecaptchaVerifier, linkWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export const CompleteVerification = () => {
  const { user, loadUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // Anti-spam cooldown
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    // If the user already has a phone number, redirect them
    if (user && user.phone) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
    }
    const container = document.getElementById('recaptcha-container-link');
    if (container) container.innerHTML = '';

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-link', {
      size: 'invisible'
    });
    return window.recaptchaVerifier;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError('');

    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/[^0-9]/g, '');
    }

    try {
      if (cooldown > 0) {
        setError(`Please wait ${cooldown} seconds before requesting a new OTP.`);
        setLoading(false);
        return;
      }

      const verifier = setupRecaptcha();
      const confirmation = await linkWithPhoneNumber(auth.currentUser, formattedPhone, verifier);
      
      setConfirmationResult(confirmation);
      setShowOtp(true);
      setCooldown(60); // 60s cooldown for anti-spam
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/credential-already-in-use') {
        setError('This phone number is already registered to another account.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format.');
      } else {
        setError(err.message || 'Failed to send OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !auth.currentUser) return;

    setLoading(true);
    setError('');

    try {
      await confirmationResult.confirm(otp);
      
      // Update Firestore with the new phone number
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        phone: auth.currentUser.phoneNumber || phoneNumber
      });

      await loadUser();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP.');
      } else {
        setError(err.message || 'Failed to verify OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><ActivitySquare className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-slate-100 relative overflow-hidden">
        
        {/* Background Decorative Blob */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-purple-100 blur-2xl opacity-50 pointer-events-none"></div>

        <div className="flex justify-center mb-6 relative">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Mandatory Security Step</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">
          To ensure platform security and prevent spam, we require all users to link a verified phone number to their account before continuing.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100 text-center">
            {error}
          </div>
        )}

        {!showOtp ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mobile Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600">
                  <Phone size={18} />
                </div>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium"
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <ActivitySquare className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {cooldown > 0 ? `Wait ${cooldown}s` : 'Send OTP'}
                  {cooldown === 0 && <ArrowRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Enter OTP</label>
              <input 
                type="text" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium text-center tracking-[0.5em]"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <ActivitySquare className="w-5 h-5 animate-spin" />
              ) : (
                'Verify & Continue'
              )}
            </button>

            <button 
              type="button"
              onClick={() => setShowOtp(false)}
              className="w-full text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors mt-2"
            >
              Use a different number
            </button>
          </form>
        )}

        <div id="recaptcha-container-link"></div>
      </div>
    </div>
  );
};
