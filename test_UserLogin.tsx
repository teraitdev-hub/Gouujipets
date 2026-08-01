import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { PawPrint, Mail, Lock, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { checkPasswordStrength } from "../../utils/security";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, getAdditionalUserInfo } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, limit } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP, loginWithGoogle } from "../../services/auth";

const SERVICE_INFO: Record<string, { title: string, desc: string, icon: string }> = {
  boarding: { title: "Pet Boarding", desc: "A safe, comfortable, and loving home away from home for your pets. Our trusted boarding partners provide clean accommodations, personalized care, nutritious meals, regular exercise, and 24/7 supervision to ensure your pet feels happy and secure while you're away.", icon: "뿯½Ÿ뿯½뿯½" },
  daycare: { title: "Pet Daycare", desc: "Give your pet a fun and active day filled with supervised play, socialization, exercise, and plenty of attention. Perfect for busy pet parents who want their pets to stay engaged and cared for throughout the day.", icon: "뿯½ŸŒž" },
  grooming: { title: "Grooming & Spa", desc: "Keep your pet looking and feeling their best with professional grooming services, including bathing, hair trimming, nail clipping, ear cleaning, coat brushing, dental hygiene, and relaxing spa treatments.", icon: "뿯½Ÿ’‡" },
  veterinary: { title: "Veterinary Care", desc: "Connect with experienced veterinarians for routine health checkups, vaccinations, preventive care, medical consultations, diagnostics, emergency treatment, and personalized health advice to keep your pet healthy.", icon: "뿯½Ÿ뿯½뿯½" },
  training: { title: "Pet Training", desc: "Professional trainers help pets develop good behavior, obedience, social skills, and confidence through customized training programs designed for puppies, adult pets, and pets with behavioral challenges.", icon: "뿯½ŸŽ“" },
  walking: { title: "Dog Walking", desc: "Reliable dog walkers provide safe and enjoyable walks that help your dog stay active, healthy, mentally stimulated, and happy뿯½뿯₽”even when you're busy.", icon: "뿯½Ÿš뿯½" },
  transportation: { title: "Pet Transportation", desc: "Convenient and secure pickup and drop-off services ensure your pet travels safely between your home, boarding center, grooming salon, veterinary clinic, or daycare facility.", icon: "뿯½Ÿš—" },
  shop: { title: "Pet Shop", desc: "Shop premium pet food, treats, toys, accessories, grooming products, healthcare essentials, and other pet supplies from trusted brands뿯½뿯₽”all in one place.", icon: "뿯½Ÿ›뿯½뿯½뿯½뿯½" },
  health_tracking: { title: "Pet Health Tracking", desc: "Maintain a complete digital health profile with vaccination records, medical history, medications, weight tracking, appointment reminders, and wellness reports뿯½뿯₽”all accessible anytime.", icon: "뿯½Ÿ“뿯½" },
  default: { title: "Welcome to Goujji Pets", desc: "Join India's #1 verified pet care marketplace. Find trusted pet care providers, compare services, view availability, book instantly, make secure payments, and manage all your reservations through a single platform.", icon: "뿯½œ뿯½" }
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

import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { PawPrint, Mail, Lock, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { checkPasswordStrength } from "../../utils/security";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, getAdditionalUserInfo } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, limit } from "firebase/firestore";
import { setupRecaptcha, sendOTP, verifyOTP, loginWithGoogle } from "../../services/auth";

const SERVICE_INFO: Record<string, { title: string, desc: string, icon: string }> = {
  boarding: { title: "Pet Boarding", desc: "A safe, comfortable, and loving home away from home for your pets. Our trusted boarding partners provide clean accommodations, personalized care, nutritious meals, regular exercise, and 24/7 supervision to ensure your pet feels happy and secure while you're away.", icon: "뿯½Ÿ뿯½뿯½" },
  daycare: { title: "Pet Daycare", desc: "Give your pet a fun and active day filled with supervised play, socialization, exercise, and plenty of attention. Perfect for busy pet parents who want their pets to stay engaged and cared for throughout the day.", icon: "뿯½ŸŒž" },
  grooming: { title: "Grooming & Spa", desc: "Keep your pet looking and feeling their best with professional grooming services, including bathing, hair trimming, nail clipping, ear cleaning, coat brushing, dental hygiene, and relaxing spa treatments.", icon: "뿯½Ÿ’‡" },
  veterinary: { title: "Veterinary Care", desc: "Connect with experienced veterinarians for routine health checkups, vaccinations, preventive care, medical consultations, diagnostics, emergency treatment, and personalized health advice to keep your pet healthy.", icon: "뿯½Ÿ뿯½뿯½" },
  training: { title: "Pet Training", desc: "Professional trainers help pets develop good behavior, obedience, social skills, and confidence through customized training programs designed for puppies, adult pets, and pets with behavioral challenges.", icon: "뿯½ŸŽ“" },
  walking: { title: "Dog Walking", desc: "Reliable dog walkers provide safe and enjoyable walks that help your dog stay active, healthy, mentally stimulated, and happy뿯½뿯₽”even when you're busy.", icon: "뿯½Ÿš뿯½" },
  transportation: { title: "Pet Transportation", desc: "Convenient and secure pickup and drop-off services ensure your pet travels safely between your home, boarding center, grooming salon, veterinary clinic, or daycare facility.", icon: "뿯½Ÿš—" },
  shop: { title: "Pet Shop", desc: "Shop premium pet food, treats, toys, accessories, grooming products, healthcare essentials, and other pet supplies from trusted brands뿯½뿯₽”all in one place.", icon: "뿯½Ÿ›뿯½뿯½뿯½뿯½" },
  health_tracking: { title: "Pet Health Tracking", desc: "Maintain a complete digital health profile with vaccination records, medical history, medications, weight tracking, appointment reminders, and wellness reports뿯½뿯₽”all accessible anytime.", icon: "뿯½Ÿ“뿯½" },
  default: { title: "Welcome to Goujji Pets", desc: "Join India's #1 verified pet care marketplace. Find trusted pet care providers, compare services, view availability, book instantly, make secure payments, and manage all your reservations through a single platform.", icon: "뿯½œ뿯½" }
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

    if (validPhone) {
      try {
        const recaptchaVerifier = setupRecaptcha("recaptcha-container");
        const confirmation = await sendOTP(loginIdentifier, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setShowOtpInput(true);
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
        await signInWithEmailAndPassword(auth, finalEmail, formData.password);
        
        await useAuthStore.getState().loadUser();
        
        if (intendedRoute) {
          navigate(intendedRoute);
          setIntendedRoute(null);
        } else {
          navigate("/dashboard");
        }
      } else {
        // Frontend validation for disposable emails
        const { isDisposableEmail } = await import('../../utils/security');
        if (isDisposableEmail(finalEmail)) {
           setError("Temporary email addresses are not supported.");
           setIsLoading(false);
           return;
        }

        const { registerWithEmail } = await import('../../services/auth');
        const userCredential = await registerWithEmail(finalEmail, formData.password, formData.name, 'customer');
        
        // Save pet data temporarily in local storage to be created upon full activation
        if (formData.petName) {
           localStorage.setItem('pending_pet_registration', JSON.stringify({
              name: formData.petName,
              species: formData.petType,
              breed: formData.petBreed,
           }));
        }
        
        await useAuthStore.getState().loadUser();
        // Since it's a new email registration, they MUST verify email first. 
        // useAuthStore will detect `needsEmailVerification` and set the state. 
        // We let the App router (or we can navigate here) handle the redirection.
        navigate('/verify-email');
      }
    } catch (err: any) {
      console.error("LOGIN ERROR DETAILS:", err);
      if (err.code === "auth/email-already-in-use" || err.message?.includes("email-already-in-use")) {
        // Try sign-in if password was entered
        try {
          const userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, formData.password);
          const uid = userCredential.user.uid;
          
          // They successfully authenticated but the outer block failed to register them.
          // Since they are logging in from the register form, auto-repair their missing Firestore user doc
          const { setDoc, doc } = await import('firebase/firestore');
          await setDoc(doc(db, "users", uid), {
            full_name: formData.name || "Customer",
            email: finalEmail,
            role: "customer",
            loginMethod: 'email',
            created_at: new Date().toISOString()
          }, { merge: true });

          await useAuthStore.getState().loadUser();
          navigate(intendedRoute || "/dashboard");
          setIntendedRoute(null);
        } catch (signInErr) {
          setIsLogin(true);
          setError("An account with this email already exists. We switched you to the 'Sign In' tab—please enter your password to sign in.");
        }
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.message?.includes("invalid-credential")) {
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
      const userCredential = await verifyOTP(confirmationResult, otp, 'customer');
      
      if (!isLogin) {
        // Set user name since verifyOTP creates a generic "User" name
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, "users", userCredential.user.uid), {
          full_name: formData.name || "Customer",
          phone: formData.email.trim(),
          email: "",
          role: "customer",
          loginMethod: 'phone'
        }, { merge: true });

        // Save pet data temporarily in local storage to be created upon full activation
        if (formData.petName) {
           localStorage.setItem('pending_pet_registration', JSON.stringify({
              name: formData.petName,
              species: formData.petType,
              breed: formData.petBreed,
           }));
        }
      }

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

  return null;
};
