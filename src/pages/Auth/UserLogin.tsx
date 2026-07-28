import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { PawPrint, Mail, Lock, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { checkPasswordStrength } from "../../utils/security";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP, loginWithGoogle } from "../../services/auth";

const SERVICE_INFO: Record<string, { title: string, desc: string, icon: string }> = {
  boarding: { title: "Pet Boarding", desc: "A safe, comfortable, and loving home away from home for your pets. Our trusted boarding partners provide clean accommodations, personalized care, nutritious meals, regular exercise, and 24/7 supervision to ensure your pet feels happy and secure while you're away.", icon: "🏠" },
  daycare: { title: "Pet Daycare", desc: "Give your pet a fun and active day filled with supervised play, socialization, exercise, and plenty of attention. Perfect for busy pet parents who want their pets to stay engaged and cared for throughout the day.", icon: "🌞" },
  grooming: { title: "Grooming & Spa", desc: "Keep your pet looking and feeling their best with professional grooming services, including bathing, hair trimming, nail clipping, ear cleaning, coat brushing, dental hygiene, and relaxing spa treatments.", icon: "💇" },
  veterinary: { title: "Veterinary Care", desc: "Connect with experienced veterinarians for routine health checkups, vaccinations, preventive care, medical consultations, diagnostics, emergency treatment, and personalized health advice to keep your pet healthy.", icon: "🩺" },
  training: { title: "Pet Training", desc: "Professional trainers help pets develop good behavior, obedience, social skills, and confidence through customized training programs designed for puppies, adult pets, and pets with behavioral challenges.", icon: "🎓" },
  walking: { title: "Dog Walking", desc: "Reliable dog walkers provide safe and enjoyable walks that help your dog stay active, healthy, mentally stimulated, and happy—even when you're busy.", icon: "🚶" },
  transportation: { title: "Pet Transportation", desc: "Convenient and secure pickup and drop-off services ensure your pet travels safely between your home, boarding center, grooming salon, veterinary clinic, or daycare facility.", icon: "🚗" },
  shop: { title: "Pet Shop", desc: "Shop premium pet food, treats, toys, accessories, grooming products, healthcare essentials, and other pet supplies from trusted brands—all in one place.", icon: "🛍️" },
  health_tracking: { title: "Pet Health Tracking", desc: "Maintain a complete digital health profile with vaccination records, medical history, medications, weight tracking, appointment reminders, and wellness reports—all accessible anytime.", icon: "📱" },
  default: { title: "Welcome to Goujji Pets", desc: "Join India's #1 verified pet care marketplace. Find trusted pet care providers, compare services, view availability, book instantly, make secure payments, and manage all your reservations through a single platform.", icon: "✨" }
};

export const UserLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, intendedRoute, setIntendedRoute, isAuthenticated, user } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  
  const searchParams = new URLSearchParams(location.search);
  const serviceKey = searchParams.get('service')?.toLowerCase() || '';
  const serviceInfo = SERVICE_INFO[serviceKey] || SERVICE_INFO.default;

  // Set intended route based on service query param on mount
  useEffect(() => {
    if (serviceKey && !intendedRoute) {
      if (serviceKey === 'health_tracking') setIntendedRoute('/health');
      else if (serviceKey === 'shop') setIntendedRoute('/shop');
      else if (serviceKey === 'daycare') setIntendedRoute('/boarding?type=daycare');
      else setIntendedRoute(`/${serviceKey}`);
    }
  }, [serviceKey, intendedRoute, setIntendedRoute]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'partner') navigate('/partner/dashboard');
      else if (user.role === 'admin' || user.role === 'superadmin') navigate('/admin/dashboard');
      else navigate(intendedRoute || '/dashboard');
    }
  }, [isAuthenticated, user, navigate, intendedRoute]);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "", 
    password: "",
    phone: "", 
    petName: "",
    petBreed: "",
    petType: "Dog"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  const isPhone = (input: string) => /^\+?[0-9]{10,15}$/.test(input.replace(/[\s-]/g, ''));

  const handleGoogleLogin = async () => {
    try {
      setError("");
      await loginWithGoogle('customer');
      await useAuthStore.getState().loadUser();
      navigate(intendedRoute || '/dashboard');
      setIntendedRoute(null);
    } catch (err: any) {
      setError(err.message || "Google Login failed or was cancelled.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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
        // Phone OTP Flow
        const recaptchaVerifier = setupRecaptcha("recaptcha-container");
        const formattedPhone = loginIdentifier.startsWith('+') ? loginIdentifier : `+91${loginIdentifier}`; // Default to India
        const result = await sendOTP(formattedPhone, recaptchaVerifier);
        setConfirmationResult(result);
        setShowOtpInput(true);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, loginIdentifier, formData.password);
        
        await useAuthStore.getState().loadUser();
        
        if (intendedRoute) {
          navigate(intendedRoute);
          setIntendedRoute(null);
        } else {
          navigate("/dashboard");
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, loginIdentifier, formData.password);
        await updateProfile(userCredential.user, { displayName: formData.name });
        
        if (formData.petName && userCredential.user) {
          try {
            await addDoc(collection(db, 'pets'), {
              name: formData.petName,
              species: formData.petType,
              breed: formData.petBreed,
              owner_id: userCredential.user.uid,
              gender: 'Male',
              status: 'Healthy',
              avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300'
            });
          } catch (petErr) {
            console.error("Failed to add pet during signup", petErr);
          }
        }
        
        await useAuthStore.getState().loadUser();
        navigate(intendedRoute || "/dashboard");
        setIntendedRoute(null);
      }
    } catch (err: any) {
      console.error("LOGIN ERROR DETAILS:", err);
      if (err.code === "auth/email-already-in-use" || err.message?.includes("email-already-in-use")) {
        // Try sign-in if password was entered
        try {
          await signInWithEmailAndPassword(auth, loginIdentifier, formData.password);
          await useAuthStore.getState().loadUser();
          navigate(intendedRoute || "/dashboard");
          setIntendedRoute(null);
        } catch (signInErr) {
          setIsLogin(true);
          setError("An account with this email already exists. We switched you to the 'Sign In' tab—please enter your password to sign in.");
        }
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.message?.includes("invalid-credential")) {
        setError("Incorrect email or password. If you just registered, make sure you don't have any typos in your email. If you don't have an account yet, please click 'Sign up' at the bottom to register!");
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
    
    try {
      await verifyOTP(confirmationResult, otp, 'customer');
      await useAuthStore.getState().loadUser();
      
      if (intendedRoute) {
        navigate(intendedRoute);
        setIntendedRoute(null);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError("Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex">
      {/* LEFT SIDE - Service Info / Marketing */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 p-12 text-white relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/20 blur-[100px]"></div>
        </div>

        <div className="relative z-10 max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-xl">
              <PawPrint size={22} className="text-purple-300" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">Goujji<span className="text-purple-400">Pets</span></span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-200 font-bold text-xs uppercase tracking-widest mb-6">
              <Sparkles size={14} className="text-purple-300" />
              {serviceKey ? 'Service Booking' : 'Verified Pet Care'}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
              <span className="mr-3">{serviceInfo.icon}</span>
              {serviceInfo.title}
            </h1>
            
            <p className="text-lg text-purple-100/80 leading-relaxed font-medium mb-12">
              {serviceInfo.desc}
            </p>

            <div className="space-y-4">
              {['Verified Professionals', 'Secure Payments', '24/7 Support'].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center border border-purple-400/50">
                    <CheckCircle2 size={14} className="text-purple-300" />
                  </div>
                  <span className="font-semibold text-purple-50">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <Link to="/" className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 mb-4">
              <PawPrint size={28} className="text-white" />
            </Link>
            <h2 className="text-2xl font-black text-slate-900">{serviceInfo.title}</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium px-4">{serviceInfo.desc}</p>
          </div>
          
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              {isLogin ? "Sign in to continue to your booking." : "Join India's #1 pet marketplace."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-medium text-sm border border-red-100 flex items-start gap-3">
              <span className="text-red-500 mt-0.5">⚠️</span>
              {error}
            </div>
          )}

          <div id="recaptcha-container"></div>

          {showOtpInput ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all text-center tracking-[0.5em] text-2xl shadow-sm"
                  maxLength={6}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 mt-4 hover:shadow-purple-600/40 active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : "Verify OTP"}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowOtpInput(false); setConfirmationResult(null); }}
                className="w-full bg-white text-slate-600 font-bold py-3 rounded-2xl transition-all mt-2"
              >
                Change Phone Number
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                    required={!isLogin}
                  />
                </div>
                
                {!isPhone(formData.email) && (
                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Phone Number (Optional)"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                    />
                  </div>
                )}

                <div className="pt-4 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Add Your First Pet (Optional)</h3>
                </div>

                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Pet Name"
                      value={formData.petName}
                      onChange={(e) => setFormData({...formData, petName: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                    />
                  </div>
                  <div className="relative w-32">
                    <select
                      value={formData.petType}
                      onChange={(e) => setFormData({...formData, petType: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Pet Breed (e.g. Golden Retriever)"
                    value={formData.petBreed}
                    onChange={(e) => setFormData({...formData, petBreed: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 transition-colors">
                <Mail size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Email Address or Phone Number"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                required
              />
            </div>

            {!isPhone(formData.email.trim()) && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                  required={!isPhone(formData.email.trim())}
                />
              </div>
            )}

            {isLogin && !isPhone(formData.email.trim()) && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline">Forgot Password?</Link>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 mt-4 hover:shadow-purple-600/40 active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  {isLogin ? "Sign In" : "Create Account"} 
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Or continue with</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              type="button"
              className="mt-6 w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-slate-600 font-semibold hover:text-purple-600 transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="font-black underline decoration-2 underline-offset-4">{isLogin ? "Sign up" : "Sign in"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
