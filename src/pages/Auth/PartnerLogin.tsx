import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { Building2, Lock, ArrowRight, Loader2, Mail, User, Eye, EyeOff, PawPrint, CheckSquare, Square, MapPin, CheckCircle, Clock, UploadCloud, File as FileIcon, X } from "lucide-react";
import { auth, db, storage } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDocs, query, where, limit, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { setupRecaptcha, sendOTP, verifyOTP, loginWithGoogle } from "../../services/auth";
import { checkPasswordStrength } from "../../utils/security";
import { GoogleMap, useLoadScript, Marker, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export const PartnerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isApprovedParam = searchParams.get('approved') === 'true';

  const { isAuthenticated, user } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "", businessName: "", street: "", city: "", state: "", pincode: "" });
  const [certificates, setCertificates] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [facilityTypes, setFacilityTypes] = useState<string[]>(["boarding"]);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [mapLocation, setMapLocation] = useState({ lat: 20.5937, lng: 78.9629 });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        setMapLocation({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
      if (place.address_components) {
        let street = "";
        let city = "";
        let state = "";
        let pincode = "";
        for (const component of place.address_components) {
          const type = component.types[0];
          if (type === "street_number") street += component.long_name + " ";
          if (type === "route") street += component.long_name;
          if (type === "locality") city = component.long_name;
          if (type === "administrative_area_level_1") state = component.long_name;
          if (type === "postal_code") pincode = component.long_name;
        }
        setFormData(prev => ({
          ...prev,
          street: street.trim() || place.name || prev.street,
          city: city || prev.city,
          state: state || prev.state,
          pincode: pincode || prev.pincode
        }));
      } else {
        setFormData(prev => ({ ...prev, street: place.name || prev.street }));
      }
    }
  };

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ""));

  const handlePreviewLocation = async () => {
    setIsGeocoding(true);
    try {
      const addressStr = `${formData.street}, ${formData.city}, ${formData.state}, ${formData.pincode}`;
      if (addressStr.trim().length < 5) return;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLogin && formData.street && formData.city) {
        handlePreviewLocation();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData.street, formData.city, formData.state, formData.pincode, isLogin]);

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
        throw new Error("Your registration is pending confirmation from the Admin. Once approved, you can log in through the notification link!");
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
        setPendingGoogleUser(userCred.user);
        setFormData({
          ...formData,
          name: userCred.user.displayName || "",
          email: userCred.user.email || ""
        });
        setIsLogin(false);
        setError("");
        setSuccessMsg("Please complete your business profile to finish registering.");
        return;
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
      if (!formData.name || !formData.businessName || !formData.street || !formData.city || !formData.state || !formData.pincode) {
        setError("Please fill out all required fields.");
        setIsLoading(false);
        return;
      }
      if (facilityTypes.length === 0) {
        setError("Please select at least one service offered by your business.");
        setIsLoading(false);
        return;
      }
      
      if (!pendingGoogleUser) {
        const passwordCheck = checkPasswordStrength(formData.password);
        if (!passwordCheck.isStrong) {
          setError(passwordCheck.errors.join(" "));
          setIsLoading(false);
          return;
        }
      }
    }

    if (validPhone) {
      try {
        const recaptchaVerifier = setupRecaptcha("recaptcha-container");
        const confirmation = await sendOTP(loginIdentifier, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setShowOtpInput(true);
        setSuccessMsg(`OTP sent to ${loginIdentifier}`);
      } catch (err: any) {
        setError(err.message || "Failed to send OTP. Please check the number.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const finalEmail = loginIdentifier.toLowerCase();

    try {
      if (isLogin) {
        // ===== SIGN IN FLOW =====
        try {
          const userCredential = await signInWithEmailAndPassword(auth, finalEmail, formData.password);
          
          // Check if they have a business record
          const bizQuery = query(collection(db, "businesses"), where("owner_id", "==", userCredential.user.uid));
          const existingBizSnap = await getDocs(bizQuery);
          
          if (existingBizSnap.empty) {
            // They have an Auth account but no business — sign them out and tell them to register
            await signOut(auth);
            setIsLogin(false);
            setError("Your account exists but you haven't registered a facility yet. Please fill out the registration form below.");
            return;
          }
          
          const bizList = existingBizSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          const activeBiz = bizList.find(b => b.status === "active" || b.status === "approved" || b.status === "verified");
          
          if (!activeBiz) {
            const pendingBiz = bizList.find(b => b.status === "pending");
            await signOut(auth);
            if (pendingBiz) {
              setError("Your registration is still pending Admin approval. You will receive a notification once approved.");
            } else {
              const statusStr = bizList[0].status || "pending";
              setError(`Your account has been ${statusStr}. Please contact support.`);
            }
            return;
          }
          
          // Active — let them in
          await useAuthStore.getState().loadUser();
          navigate("/partner/dashboard");
        } catch (signInErr: any) {
          if (signInErr.code === "auth/invalid-credential" || signInErr.code === "auth/user-not-found" || signInErr.code === "auth/wrong-password") {
            try {
              const usersRef = collection(db, "users");
              const q = query(usersRef, where("email", "==", finalEmail), limit(1));
              const querySnap = await getDocs(q);
              if (!querySnap.empty && querySnap.docs[0].data()?.loginMethod === 'google') {
                setError("This email is registered via Google Sign-In. Please click the 'Sign in with Google' button below to log in.");
                setIsLoading(false);
                return;
              }
            } catch (e) {
              console.error(e);
            }
            setError("Incorrect email or password. If you just registered, make sure you don't have any typos in your email. If you don't have an account yet, please click 'Register' to create a new account.");
          } else {
            setError(signInErr.message || "Sign in failed.");
          }
        }
      } else {
        // ===== REGISTER FLOW =====
        try {
          let lat = 20.5937;
          let lng = 78.9629;
          try {
            const addressStr = `${formData.street}, ${formData.city}, ${formData.state}, ${formData.pincode}`;
            const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}`);
            const geocodeData = await geocodeRes.json();
            if (geocodeData && geocodeData.length > 0) {
              lat = parseFloat(geocodeData[0].lat);
              lng = parseFloat(geocodeData[0].lon);
            } else {
              lat = mapLocation.lat;
              lng = mapLocation.lng;
            }
          } catch (e) { 
            console.error("Geocoding failed", e);
            lat = mapLocation.lat;
            lng = mapLocation.lng;
          }

          let uid = "";
          
          if (pendingGoogleUser) {
            uid = pendingGoogleUser.uid;
          } else {
            const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, formData.password);
            uid = userCredential.user.uid;
          }
          
          let certUrls: string[] = [];
          if (certificates.length > 0) {
            try {
              for (const file of certificates) {
                const storageRef = ref(storage, `certificates/${uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                certUrls.push(url);
              }
            } catch (err) {
              console.error("Failed to upload certificates", err);
            }
          }

          await setDoc(doc(db, "users", uid), {
            full_name: formData.name,
            phone: validPhone ? loginIdentifier : formData.phone,
            email: pendingGoogleUser ? pendingGoogleUser.email : (validPhone ? '' : loginIdentifier),
            role: "partner",
            loginMethod: pendingGoogleUser ? 'google' : 'email'
          }, { merge: true });

          const bizRef = await addDoc(collection(db, "businesses"), {
            owner_id: uid,
            name: formData.businessName || `${formData.name}'s Facility`,
            type: facilityTypes[0] || "boarding",
            services: facilityTypes,
            address: `${formData.street}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
            latitude: lat,
            longitude: lng,
            certificates: certUrls,
            status: "pending",
            created_at: new Date().toISOString()
          });

          await addDoc(collection(db, "admin_notifications"), {
            title: "New Partner Registration Pending",
            message: `${formData.name} registered a new facility (${facilityTypes.join(", ")}) requiring admin verification.`,
            business_id: bizRef.id,
            owner_id: uid,
            type: "partner_registration",
            read: false,
            created_at: new Date().toISOString()
          });

          await signOut(auth);
          setPendingGoogleUser(null);
          setShowApprovalModal(true);
        } catch (regErr: any) {
          if (regErr.code === "auth/email-already-in-use") {
            setIsLogin(true);
            setError("This email is already registered. We've switched you to Sign In. Please enter your password to log in, or use 'Forgot?' to reset it.");
          } else {
            setError(regErr.message || "Registration failed.");
          }
        }
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
          throw new Error("NOT_REGISTERED");
        }
        let lat = 20.5937;
        let lng = 78.9629;
        try {
          const addressStr = `${formData.street}, ${formData.city}, ${formData.state}, ${formData.pincode}`;
          const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}`);
          const geocodeData = await geocodeRes.json();
          if (geocodeData && geocodeData.length > 0) {
            lat = parseFloat(geocodeData[0].lat);
            lng = parseFloat(geocodeData[0].lon);
          }
        } catch (e) { console.error("Geocoding failed", e); }

        let certUrls: string[] = [];
        if (certificates.length > 0) {
          try {
            for (const file of certificates) {
              const storageRef = ref(storage, `certificates/${userCredential.user.uid}/${Date.now()}_${file.name}`);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              certUrls.push(url);
            }
          } catch (err) {
            console.error("Failed to upload certificates", err);
          }
        }

        await setDoc(doc(db, "users", userCredential.user.uid), {
          full_name: formData.name || "Partner",
          phone: formData.email.trim(),
          email: "",
          role: "partner",
          loginMethod: 'phone'
        }, { merge: true });

        const bizRef = await addDoc(collection(db, "businesses"), {
          owner_id: userCredential.user.uid,
          name: formData.businessName || `${formData.name || 'My'}'s Facility`,
          type: facilityTypes[0] || "boarding",
          services: facilityTypes,
          address: `${formData.street}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          latitude: lat,
          longitude: lng,
          certificates: certUrls,
          status: "pending",
          created_at: new Date().toISOString()
        });

        await addDoc(collection(db, "admin_notifications"), {
          title: "New Partner Registration Pending",
          message: `${formData.name} registered a new facility (${facilityTypes.join(", ")}) requiring admin verification.`,
          business_id: bizRef.id,
          owner_id: userCredential.user.uid,
          type: "partner_registration",
          read: false,
          created_at: new Date().toISOString()
        });
        
        await signOut(auth);
        setShowOtpInput(false);
        setShowApprovalModal(true);
        setIsLoading(false);
        return;
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
              {/* Name & Credentials */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name / Facility Owner</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                      required
                      disabled={!!pendingGoogleUser}
                    />
                  </div>
                </div>
              )}

              {(!pendingGoogleUser) && (
                <>
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      {isLogin ? "Email Address or Mobile Number" : "Email Address"}
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={isLogin ? "example@email.com or +919876543210" : "example@email.com"}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
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
                </>
              )}

              {pendingGoogleUser && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex flex-col gap-1">
                  <span className="font-bold">Authenticated with Google</span>
                  <span className="text-green-600">{pendingGoogleUser.email}</span>
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

              {/* Business Details & Location Selector */}
              {!isLogin && (
                <>
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Business Name</label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Happy Paws Resort"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Complete Address</label>
                    <div className="space-y-3">
                      {isLoaded ? (
                        <Autocomplete
                          onLoad={(ac) => setAutocomplete(ac)}
                          onPlaceChanged={onPlaceChanged}
                        >
                          <input
                            type="text"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            placeholder="Street Address / Landmark (Start typing to search)"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                            required
                          />
                        </Autocomplete>
                      ) : (
                        <input
                          type="text"
                          value={formData.street}
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                          placeholder="Street Address / Landmark"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                          required
                        />
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="City"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                          required
                        />
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          placeholder="State"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                          required
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="Pincode"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                        required
                      />
                    </div>
                    
                    {isGeocoding && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-violet-600 bg-violet-50 px-3 py-2 rounded-lg border border-violet-200">
                        <Loader2 size={14} className="animate-spin" />
                        Finding location on map...
                      </div>
                    )}

                    {isLoaded && (
                      <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200 mt-3 shadow-inner">
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={mapLocation}
                          zoom={15}
                          options={{ disableDefaultUI: true, gestureHandling: "cooperative" }}
                        >
                          <Marker position={mapLocation} />
                        </GoogleMap>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Business Certificates (Optional)</label>
                    <div className="w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-all">
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            setCertificates([...certificates, ...Array.from(e.target.files)]);
                          }
                          e.target.value = ''; // Reset input to allow adding the same file again if needed
                        }}
                        className="hidden"
                        id="cert-upload"
                      />
                      <label htmlFor="cert-upload" className="cursor-pointer flex flex-col items-center justify-center">
                        <UploadCloud size={24} className="text-violet-500 mb-2" />
                        <span className="text-xs font-bold text-slate-700">
                          {certificates.length > 0 ? "Click to add more certificates" : "Click to upload certificates"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Accepts multiple Images and PDFs</span>
                      </label>
                    </div>
                    {certificates.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {certificates.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-violet-50 px-3 py-2 rounded-lg border border-violet-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon size={14} className="text-violet-600 shrink-0" />
                              <span className="text-xs font-medium text-violet-900 truncate">{file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))}
                              className="p-1 hover:bg-violet-100 rounded-md text-violet-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
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
