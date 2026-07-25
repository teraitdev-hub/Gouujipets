import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from "firebase/auth";
import type { UserCredential, ConfirmationResult } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, app, googleProvider } from "../lib/firebase";
import type { UserProfile, UserRole } from "../types/user";

// Email & Password Auth
export const registerWithEmail = async (email: string, password: string, name: string, role: UserRole = 'customer') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update auth profile
    await updateProfile(user, { displayName: name });
    
    // Send verification email
    await sendEmailVerification(user);

    // Create user document in Firestore
    const userProfile: Partial<UserProfile> = {
      uid: user.uid,
      name,
      email,
      role,
      loginMethod: 'email',
      isActive: true,
      walletBalance: 0,
      rewardPoints: 0,
      notificationPreferences: { email: true, sms: true, push: true },
      createdDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", user.uid), userProfile);
    return userCredential;
  } catch (error) {
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login
    await setDoc(doc(db, "users", userCredential.user.uid), {
      lastLogin: new Date().toISOString()
    }, { merge: true });

    return userCredential;
  } catch (error) {
    throw error;
  }
};

// Google Auth
export const loginWithGoogle = async (role: UserRole = 'customer') => {
  try {
    localStorage.setItem('petpro_intended_role', role);
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error("Google Auth Error:", error);
    throw error;
  }
};

// Phone OTP Auth
export const setupRecaptcha = (buttonId: string) => {
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined as any;
    }
  } catch (e) {
    console.warn("Error clearing recaptcha verifier", e);
  }

  // CRITICAL FIX: Clear the DOM element to prevent "reCAPTCHA has already been rendered" error
  const container = document.getElementById(buttonId);
  if (container) {
    container.innerHTML = '';
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    }
  });
  
  return window.recaptchaVerifier;
};

export const sendOTP = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error("Firebase Phone Auth failed:", error);
    throw error;
  }
};

export const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string, role: UserRole = 'customer') => {
  try {
    const userCredential = await confirmationResult.confirm(otp);
    const user = userCredential.user;

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // New Phone User
      const userProfile: Partial<UserProfile> = {
        uid: user.uid,
        name: 'User', // Needs to be updated by user later
        email: '',
        phone: user.phoneNumber || '',
        role,
        loginMethod: 'phone',
        isActive: true,
        walletBalance: 0,
        rewardPoints: 0,
        notificationPreferences: { email: true, sms: true, push: true },
        createdDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      await setDoc(docRef, userProfile);
    } else {
      // Existing Phone User
      await setDoc(docRef, {
        lastLogin: new Date().toISOString()
      }, { merge: true });
    }

    return userCredential;
  } catch (error) {
    throw error;
  }
};

// General Auth
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

// Add to window object for Recaptcha
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}
