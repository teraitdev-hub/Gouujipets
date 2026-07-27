import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { Building2, Lock, ArrowRight, Loader2, Mail, User, Eye, EyeOff, PawPrint, CheckSquare, Square, MapPin } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDocs, query, where, limit } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP, loginWithGoogle } from "../../services/auth";
import { checkPasswordStrength } from "../../utils/security";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";

export const PartnerLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [facilityTypes, setFacilityTypes] = useState<string[]>(["boarding"]);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [location, setLocation] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", // Ensure you have a valid Google Maps API Key
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
       // If no business doc found, they might be a customer trying to login as partner.
       // We can block or create a pending one, but better to block if it's a strict partner login
       await signOut(auth);
       throw new Error("No partner business found. Please register first.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setSuccessMsg("");
      const userCred = await loginWithGoogle('partner');
      
      // If registering (first time), it might bypass the form. We should check if business exists.
      const bizQuery = query(collection(db, "businesses"), where("owner_id", "==", userCred.user.uid), limit(1));
      const existingBizSnap = await getDocs(bizQuery);
      
      if (existingBizSnap.empty) {
         // Auto-create pending
         await addDoc(collection(db, "businesses"), {
          owner_id: userCred.user.uid,
          name: `${userCred.user.displayName || 'My'}'s Facility`,
          type: "boarding",
          address: "Address pending...",
          status: "pending",
        });
        await signOut(auth);
        setError("Your account has been registered via Google. Please wait for Admin approval.");
        return;
      }
      
      await checkApprovalStatus(userCred.user.uid);
      await useAuthStore.getState().loadUser();
      navigate("/partner/dashboard");
    } catch (err: any) {
      setError(err.message || "Google Login failed or was cancelled.");
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
        const formattedPhone = loginIdentifier.startsWith('+') ? loginIdentifier : `+91${loginIdentifier}`; // Default India
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
            await addDoc(collection(db, "businesses"), {
              owner_id: userCredential.user.uid,
              name: `${formData.name}'s Facility`,
              type: facilityTypes.join(","),
              address: "Address from map pin",
              latitude: location.lat,
              longitude: location.lng,
              status: "pending",
            });
          } catch (bizErr) {
            console.error("Failed to auto-create business", bizErr);
          }
        }

        await signOut(auth); // Force logout for pending approval
        setIsLogin(true);
        setSuccessMsg("Registration successful! Your account is now pending Admin approval. You will be able to log in once approved.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
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
            throw new Error("No partner account found. Please register first.");
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
        setIsLogin(true);
        setSuccessMsg("Registration successful! Your account is now pending Admin approval.");
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
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const services = [
    { id: "boarding",   label: "Boarding" },
    { id: "veterinary", label: "Veterinary Clinic" },
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
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-600">
              {successMsg}
            </div>
          )}

          <div id="recaptcha-container"></div>

          {showOtpInput ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-2xl tracking-[0.5em] text-center font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-violet-500/20 active:scale-95"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? "Verify & Sign In" : "Verify & Register")}
              </button>
              <button
                type="button"
                onClick={() => { setShowOtpInput(false); setConfirmationResult(null); }}
                className="w-full bg-white text-slate-600 font-bold py-3 rounded-xl transition-all mt-2"
              >
                Change Phone Number
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Register-only fields */}
            {!isLogin && (
              <>
                {/* Services offered */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Services Offered
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left ${
                          facilityTypes.includes(svc.id)
                            ? "bg-violet-50 border-violet-300 text-violet-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {facilityTypes.includes(svc.id)
                          ? <CheckSquare size={15} className="text-violet-600 shrink-0" />
                          : <Square size={15} className="text-slate-400 shrink-0" />
                        }
                        {svc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      required={!isLogin}
                      className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all"
                    />
                  </div>
                </div>

                {/* Location Map Pinning */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Business Location
                  </label>
                  <p className="text-xs text-slate-400 mb-2">Drag the pin to set your exact location.</p>
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 flex items-center justify-center">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={location}
                        zoom={5}
                        onClick={(e) => {
                          if (e.latLng) setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                        }}
                      >
                        <Marker 
                          position={location} 
                          draggable={true} 
                          onDragEnd={(e) => {
                            if (e.latLng) setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                          }} 
                        />
                      </GoogleMap>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <MapPin className="animate-bounce mb-2" size={24} />
                        <span className="text-xs font-semibold">Loading Map...</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Email / Phone */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Email Address or Phone Number
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="partner@example.com or +919876543210"
                  required
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            {!isPhone(formData.email.trim()) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Password
                  </label>
                  {isLogin && (
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••"
                    required={!isPhone(formData.email.trim())}
                    className="w-full h-12 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-violet-500/20 active:scale-95 mt-2"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In to Portal" : "Create Partner Account"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Divider */}
            {isLogin && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs font-semibold text-slate-400">Or continue with</span>
                </div>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </>
            )}
          </form>
          )}

          {/* Back to home */}
          <p className="mt-8 text-center text-xs font-medium text-slate-400">
            Not a partner yet?{" "}
            <Link to="/" className="text-violet-600 font-bold hover:underline">
              Back to GouujiPets
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

