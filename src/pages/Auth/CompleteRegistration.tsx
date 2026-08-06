import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, ActivitySquare, CheckCircle, Dog, MapPin, Building2, UserCircle } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { RecaptchaVerifier, linkWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { OtpVerificationUI } from '../../components/auth/OtpVerificationUI';

export const CompleteRegistration = () => {
  const { user, loadUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Details State
  const [formData, setFormData] = useState({
    street: '', city: '', state: '', pincode: '',
    petName: '', petType: 'Dog', petBreed: '',
    agreedToTerms: false
  });

  useEffect(() => {
    // Check local storage for pending pet data (from Email Registration)
    const pendingPet = localStorage.getItem('pending_pet_registration');
    if (pendingPet) {
      try {
        const petData = JSON.parse(pendingPet);
        setFormData(prev => ({
          ...prev,
          petName: petData.name || '',
          petType: petData.species || 'Dog',
          petBreed: petData.breed || ''
        }));
      } catch (e) {}
    }
    
    // Skip phone verification if phone is already linked
    if (user?.phone || auth.currentUser?.phoneNumber) {
      setStep(2);
    }
  }, [user]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) {}
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
      setCooldown(60);
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
      setStep(2); // Proceed to details
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

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!formData.agreedToTerms) {
      setError("You must agree to the Terms & Conditions.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Fetch existing user to preserve name
      const existingUserSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const existingData = existingUserSnap.data() || {};

      // 1. Create User Document
      const role = localStorage.getItem('petpro_intended_role') || 'customer';
      const userProfile = {
        uid: auth.currentUser.uid,
        name: existingData.full_name || existingData.name || auth.currentUser.displayName || 'User',
        full_name: existingData.full_name || existingData.name || auth.currentUser.displayName || 'User',
        email: auth.currentUser.email || existingData.email || '',
        phone: auth.currentUser.phoneNumber || phoneNumber || existingData.phone || '',
        role: existingData.role || role,
        loginMethod: auth.currentUser.providerData.some(p => p.providerId === 'google.com') ? 'google' : auth.currentUser.providerData.some(p => p.providerId === 'phone') ? 'phone' : 'email',
        isActive: true,
        walletBalance: existingData.walletBalance || 0,
        rewardPoints: existingData.rewardPoints || 0,
        notificationPreferences: existingData.notificationPreferences || { email: true, sms: true, push: true },
        createdDate: existingData.createdDate || existingData.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        }
      };
      
      await setDoc(doc(db, "users", auth.currentUser.uid), userProfile, { merge: true });

      // 2. Create Pet Document if provided
      if (formData.petName && role === 'customer') {
        await addDoc(collection(db, 'pets'), {
          name: formData.petName,
          species: formData.petType,
          breed: formData.petBreed,
          owner_id: auth.currentUser.uid,
          gender: 'Unknown',
          status: 'Healthy',
          avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300'
        });
        localStorage.removeItem('pending_pet_registration');
      }

      await loadUser();
      
      if (role === 'partner') {
        navigate('/partner/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-8 sm:py-12 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-6 sm:p-8 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2 relative z-10">Complete Registration</h1>
          <p className="text-purple-100 font-medium relative z-10 text-sm sm:text-base">Just a few more details to activate your account.</p>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 sm:gap-4 mt-6 sm:mt-8 relative z-10">
            <div className={`flex items-center gap-1.5 sm:gap-2 ${step >= 1 ? 'text-white' : 'text-purple-300/50'}`}>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${step >= 1 ? 'bg-purple-500 text-white' : 'bg-purple-900/50'}`}>1</div>
              <span className="font-semibold text-[10px] sm:text-sm uppercase tracking-wider sm:normal-case sm:tracking-normal">Phone<span className="hidden sm:inline"> Verification</span></span>
            </div>
            <div className="h-px flex-1 sm:w-12 bg-purple-700 max-w-[40px]"></div>
            <div className={`flex items-center gap-1.5 sm:gap-2 ${step >= 2 ? 'text-white' : 'text-purple-300/50'}`}>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${step >= 2 ? 'bg-purple-500 text-white' : 'bg-purple-900/50'}`}>2</div>
              <span className="font-semibold text-[10px] sm:text-sm uppercase tracking-wider sm:normal-case sm:tracking-normal">Profile<span className="hidden sm:inline"> Details</span></span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Phone className="text-purple-600" size={24} /> 
                Secure your account
              </h2>
              
              {!showOtp ? (
                <form onSubmit={handleSendOTP} className="space-y-4 max-w-md">
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
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium text-base sm:text-sm min-h-[48px]"
                        required
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? <ActivitySquare className="w-5 h-5 animate-spin" /> : (cooldown > 0 ? `Wait ${cooldown}s` : 'Send OTP')}
                  </button>
                </form>
              ) : (
                <OtpVerificationUI 
                  otp={otp}
                  setOtp={setOtp}
                  isLoading={loading}
                  onSubmit={handleVerifyOTP}
                  onCancel={() => setShowOtp(false)}
                  onResend={handleSendOTP as any}
                  resendTimer={cooldown}
                />
              )}
              <div id="recaptcha-container-link"></div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="animate-fade-in space-y-8">
              {/* Address Section */}
              <section>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin className="text-purple-600" size={20} />
                  Address Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Street Address</label>
                    <input 
                      type="text" required
                      value={formData.street} onChange={(e) => setFormData({...formData, street: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">City</label>
                    <input 
                      type="text" required
                      value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">State</label>
                    <input 
                      type="text" required
                      value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pincode</label>
                    <input 
                      type="text" required
                      value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Pet Section */}
              <section>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Dog className="text-purple-600" size={20} />
                  Pet Details (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pet Name</label>
                    <input 
                      type="text"
                      value={formData.petName} onChange={(e) => setFormData({...formData, petName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pet Type</label>
                    <select 
                      value={formData.petType} onChange={(e) => setFormData({...formData, petType: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium appearance-none"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pet Breed</label>
                    <input 
                      type="text"
                      value={formData.petBreed} onChange={(e) => setFormData({...formData, petBreed: e.target.value})}
                      placeholder="e.g. Golden Retriever"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600/20 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Terms */}
              <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" required
                  checked={formData.agreedToTerms}
                  onChange={(e) => setFormData({...formData, agreedToTerms: e.target.checked})}
                  className="mt-1 w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-600"
                />
                <span className="text-sm text-slate-700 font-medium leading-relaxed">
                  I agree to the <a href="#" className="text-purple-600 hover:underline">Terms of Service</a> and <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>. I consent to having my identity verified.
                </span>
              </label>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? <ActivitySquare className="w-5 h-5 animate-spin" /> : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Complete Registration & Activate Account
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
