import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getMessaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB1COW2uZ9YP-sYosaESXgRX1AOs6LVknE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gouujipets.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gouujipets",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gouujipets.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "591158355137",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:591158355137:web:83e6ecd166cd8cf522a040",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0TQ3BJ55BZ"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Bypass reCAPTCHA in local development to prevent 'auth/invalid-app-credential'
if (import.meta.env.DEV) {
  auth.settings.appVerificationDisabledForTesting = true;
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();
