import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { Building2, Lock, ArrowRight, Loader2, Mail, User, Eye, EyeOff, PawPrint, CheckSquare, Square, MapPin, CheckCircle, Clock } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDocs, query, where, limit } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP, loginWithGoogle } from "../../services/auth";
import { checkPasswordStrength } from "../../utils/security";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { FallbackMap } from "../../components/Map/FallbackMap";
import { LocationPicker } from "../../components/ui/LocationPicker";

export const PartnerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isApprovedParam = searchParams.get('approved') === 'true';

  const { isAuthenticated, user } = useAuthStore();
  const [isLogin, setIsLogin] = useState(!isApprovedParam);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [facilityTypes, setFacilityTypes] = useState<string[]>(["boarding"]);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [location, setLocation] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  });

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ""));

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'customer') navigate('/dashboard');
      else if (user.role === 'admin' || user.role === 'superadmin') navigate('/admin/dashboard');
      else navigate('/partner/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const checkApprovalStatus = async (uid: string) => {
    const bizQuery = query(collection(db, "businesses"), where("owner_id", "==", uid), limit(1));
    const existingBizSnap = await getDocs(bizQuery);
    
    if (!existingBizSnap.empty) {
      const bizData = existingBizSnap.docs[0].data();
      if (bizData.status === "pending") {
        await signOut(auth);
        throw new Error("Your account is pending admin approval. Please wait for an admin to approve your registration.");
      } else if (bizData.status === "rejected" || bizData.status === "suspended") {
        await signOut(auth);
        throw new Error(`Your account has been ${bizData.status}. Please contact support.`);
      }
    } else {
       await signOut(auth);
       throw new Error("NOT_REGISTERED");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setSuccessMsg("");
      const userCred = await loginWithGoogle('partner');
      
      const bizQuery = query(collection(db, "businesses"), where("owner_id", "==", userCred.user.uid), limit(1));
      const existingBizSnap = await getDocs(bizQuery);
      
      if (existingBizSnap.empty) {
        await signOut(auth);
        throw new Error("NOT_REGISTERED");
      }
      
      await checkApprovalStatus(userCred.user.uid);
      await useAuthStore.getState().loadUser();
      navigate("/partner/dashboard");
    } catch (err: any) {
      if (err.message === "NOT_REGISTERED") {
        setIsLogin(false);
        setError("You are not a registered partner yet. Please fill out your details below to sign up and request Admin approval.");
      } else {
        setError(err.message || "Google Login failed or was cancelled.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    const loginIdentifier = formData.email.trim();
    const validEmail = isEmail(loginIdentifier);
    const validPhone = isPhone(loginIdentifier);

    if (!validEmail && !validPhone) {
      setError("Please enter a valid Email address or Phone Number.");
      setIsLoading(false);
      return;
    }

    if (!isLogin && !validPhone) {
      const passwordCheck = checkPasswordStrength(formData.password);
      if (!passwordCheck.isStrong) {
        setError(passwordCheck.errors.join(" "));
        setIsLoading(false);
        return;
      }
    }

    try {
      if (validPhone) {
        const recaptchaVerifier = setupRecaptcha("recaptcha-container");
        const formattedPhone = loginIdentifier.startsWith('+') ? loginIdentifier : `+91${loginIdentifier}`;
        const result = await sendOTP(formattedPhone, recaptchaVerifier);
        setConfirmationResult(result);
        setShowOtpInput(true);
        setIsLoading(false);
        return;
      }

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, formData.password);
        
        await checkApprovalStatus(userCredential.user.uid);
        
        await useAuthStore.getState().loadUser();
        navigate("/partner/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, loginIdentifier, formData.password);
        
        await setDoc(doc(db, "users", userCredential.user.uid), {
          full_name: formData.name,
          phone: formData.phone,
          role: "partner"
        }, { merge: true });

        if (userCredential.user) {
          try {
            const bizRef = await addDoc(collection(db, "businesses"), {
              owner_id: userCredential.user.uid,
              name: `${formData.name}'s Facility`,
              type: facilityTypes.join(","),
              address: "Address from map pin",
              latitude: location.lat,
              longitude: location.lng,
              status: "pending",
              created_at: new Date().toISOString()
            });

            // Trigger real-time Admin Notification record
            await addDoc(collection(db, "admin_notifications"), {
              title: "New Partner Registration Pending",
              message: `${formData.name} registered a new facility (${facilityTypes.join(", ")}) requiring admin verification.`,
              business_id: bizRef.id,
              owner_id: userCredential.user.uid,
              type: "partner_registration",
              read: false,
              created_at: new Date().toISOString()
            });
          } catch (bizErr) {
            console.error("Failed to auto-create business or admin notification", bizErr);
          }
        }

        await signOut(auth); // Force logout for pending approval
        setShowApprovalModal(true);
      }
    } catch (err: any) {
      if (err.message === "NOT_REGISTERED") {
        setIsLogin(false);
        setError("You are not a registered partner yet. Please fill out your details below to sign up and request Admin approval.");
      } else if (err.code === "auth/email-already-in-use" || err.message?.includes("email-already-in-use")) {
        // Attempt login if password is provided, otherwise switch tab
        try {
          const userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, formData.password);
          // Check if business doc exists
          const bizQuery = query(collection(db, "businesses"), where("owner_id", "==", userCredential.user.uid), limit(1));
          const existingBizSnap = await getDocs(bizQuery);
          if (existingBizSnap.empty) {
            await setDoc(doc(db, "users", userCredential.user.uid), { role: "partner" }, { merge: true });
            const bizRef = await addDoc(collection(db, "businesses"), {
              owner_id: userCredential.user.uid,
              name: `${formData.name || 'My'}'s Facility`,
              type: facilityTypes.join(","),
              address: "Address from map pin",
              latitude: location.lat,
              longitude: location.lng,
              status: "pending",
              created_at: new Date().toISOString()
            });
            await addDoc(collection(db, "admin_notifications"), {
              title: "New Partner Registration Pending",
              message: `${formData.name || 'Partner'} registered a new facility (${facilityTypes.join(", ")}) requiring admin verification.`,
              business_id: bizRef.id,
              owner_id: userCredential.user.uid,
              type: "partner_registration",
              read: false,
              created_at: new Date().toISOString()
            });
            await signOut(auth);
            setShowApprovalModal(true);
          } else {
            await checkApprovalStatus(userCredential.user.uid);
            await useAuthStore.getState().loadUser();
            navigate("/partner/dashboard");
          }
        } catch (signInErr: any) {
          setIsLogin(true);
          setError("An account with this email already exists. We have switched you to the 'Sign In' tab—please enter your password to log in, or click 'Forgot?' to reset it.");
        }
      } else {
        setError(err.message || "Authentication failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setIsLoading(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const userCredential = await verifyOTP(confirmationResult, otp, 'partner');
      
      const bizQuery = query(collection(db, "businesses"), where("owner_id", "==", userCredential.user.uid), limit(1));
      const existingBizSnap = await getDocs(bizQuery);
        
      if (existingBizSnap.empty) {
        if (isLogin) {
            await signOut(auth);
            throw new Error("NOT_REGISTERED");
        }
        await setDoc(doc(db, "users", userCredential.user.uid), { role: "partner" }, { merge: true });
        await addDoc(collection(db, "businesses"), {
          owner_id: userCredential.user.uid,
          name: `${formData.name || 'My'}'s Facility`,
          type: facilityTypes.length ? facilityTypes.join(",") : "boarding",
          address: "Address from map pin",
          latitude: location.lat,
          longitude: location.lng,
          status: "pending",
        });
        
        await signOut(auth);
        setShowOtpInput(false);
        setShowApprovalModal(true);
        setIsLoading(false);
        return;
      } else {
        if (!isLogin) {
            await signOut(auth);
            throw new Error("Account already exists. Please Sign In.");
        }
      }

      await checkApprovalStatus(userCredential.user.uid);
      await useAuthStore.getState().loadUser();
      navigate("/partner/dashboard");
    } catch (err: any) {
      if (err.message === "NOT_REGISTERED") {
        setIsLogin(false);
        setError("You are not a registered partner yet. Please fill out your details below to sign up and request Admin approval.");
      } else {
        setError(err.message || "Invalid OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const services = [
    { id: "boarding",   label: "Boarding" },
    { id: "veterinary", label: "Veterinary Clinic" },
    { id: "petshop",    label: "Pet Shop" },
    { id: "grooming",   label: "Grooming" },
    { id: "training",   label: "Training" },
    { id: "daycare",    label: "Daycare" },
    { id: "walking",    label: "Dog Walking" },
  ];

  const toggleService = (id: string) => {
    setFacilityTypes((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((t) => t !== id) : prev
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left: Hero image panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-slate-100">
        <img
          src="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=85&w=1000"
          alt="Pet care partner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-900/70 via-violet-700/30 to-transparent" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <PawPrint size={22} className="text-white" />
            </div>
            <span className="text-white font-black text-xl">GouujiPets</span>
          </div>
          <h2 className="text-white font-black text-3xl leading-tight mb-3">
            Manage your pet care<br />business with ease.
          </h2>
          <p className="text-white/75 text-sm font-medium max-w-sm leading-relaxed">
            Access 50,000+ pet parents, automate bookings, track revenue, and grow your facility — all from one dashboard.
          </p>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-sm shadow-violet-400/30">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <span className="text-base font-black text-slate-900">Partner Portal</span>
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">GouujiPets Business</p>
            </div>
          </div>

          {/* Direct Approval Banner */}
          {isApprovedParam && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 animate-fade-in shadow-sm">
              <CheckCircle size={22} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Account Approved by Admin! 🎉</h4>
                <p className="text-xs text-emerald-700 mt-0.5">Your partner registration has been approved. Log in below to access your Partner Dashboard.</p>
              </div>
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-black text-slate-900 mb-1">
            {isLogin ? "Welcome back" : "Become a Partner"}
          </h1>
          <p className="text-sm text-slate-500 font-medium mb-8">
            {isLogin
              ? "Sign in to manage your facility and bookings."
              : "Register your pet care business and start accepting bookings."}
          </p>

          {/* Tab toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-7">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                !isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Register
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-amber-800">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-600">
              {successMsg}
            </div>
          )}

          <div id="recaptcha-container"></div>

          {/* OTP Section */}
          {showOtpInput ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold tracking-widest focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Verify OTP & Continue"}
              </button>
            </form>
          ) : (
            /* Regular Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name / Facility Owner</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@example.com or +919876543210"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number (For OTP Verification)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                    required
                  />
                </div>
              )}

              {/* Password field */}
              {(!isPhone(formData.email) || isLogin) && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Password</label>
                    {isLogin && (
                      <Link to="/forgot-password" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
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
              )}

              {/* Service types selection for registration */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                    Services Offered by Your Business
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((s) => {
                      const selected = facilityTypes.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            selected
                              ? "border-violet-500 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {selected ? (
                            <CheckSquare size={14} className="text-violet-600 shrink-0" />
                          ) : (
                            <Square size={14} className="text-slate-400 shrink-0" />
                          )}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Map & Location Selector */}
              {!isLogin && (
                <div className="pt-2">
                  <LocationPicker
                    defaultLocation={location}
                    onLocationSelect={(loc) => {
                      setLocation({ lat: loc.lat, lng: loc.lng });
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In to Dashboard" : "Register Business & Request Approval"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">or continue with</span>
            </div>
          </div>

          {/* Social login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google
          </button>
        </div>
      </div>

      {/* Admin Approval Confirmation Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200">
              <Clock size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Registration Submitted! 🎉</h3>
            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
              Your business and facility registration has been submitted to the Admin for verification. Once the admin approves your account, you will receive an approval notification link to log in to your Partner Dashboard.
            </p>
            <button
              onClick={() => {
                setShowApprovalModal(false);
                setIsLogin(true);
                setSuccessMsg("Registration successful! Once approved by the Admin, you can log in below.");
              }}
              className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-violet-500/20 transition-all"
            >
              Understood, Return to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
