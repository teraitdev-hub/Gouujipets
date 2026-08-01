import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface User {
  id: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  role?: 'customer' | 'partner' | 'admin' | 'super_admin' | string;
  full_name?: string;
  user_metadata?: Record<string, any>;
  isRegistrationComplete?: boolean;
  needsEmailVerification?: boolean;
  [key: string]: any;
}

interface AuthState {
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  
  intendedRoute: string | null;
  setIntendedRoute: (route: string | null) => void;
  
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  
  login: (user: User) => void;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

let authUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoginModalOpen: false,
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  
  intendedRoute: null,
  setIntendedRoute: (route) => set({ intendedRoute: route }),
  
  isAuthenticated: false,
  user: null,
  isLoading: true,
  
  login: (user) => {
    set({ isAuthenticated: true, user, isLoginModalOpen: false });
  },
  
  logout: async () => {
    localStorage.removeItem('petpro_demo_admin');
    await signOut(auth);
    set({ isAuthenticated: false, user: null });
  },
  
  loadUser: async () => {
    return new Promise<void>(async (resolve) => {
      try {
        const demoAdminStr = localStorage.getItem('petpro_demo_admin');
        if (demoAdminStr) {
          set({ isAuthenticated: true, user: JSON.parse(demoAdminStr), isLoading: false });
          resolve();
          return;
        }



        if (authUnsubscribe) {
          authUnsubscribe();
        }

        authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            resolve();
            return;
          }

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDocSnap = await getDoc(userDocRef);
          let userData = userDocSnap.exists() ? userDocSnap.data() : null;

          let currentRole = userData?.role || 'customer';
          const intendedRole = localStorage.getItem('petpro_intended_role');

          try {
            if (!userDocSnap.exists()) {
              // User signed in (e.g. via Google or Email/Password) but hasn't completed registration
              currentRole = intendedRole || 'customer';
              const loginMethod = firebaseUser.providerData.some(p => p.providerId === 'password') ? 'email' : 'google';
              
              const partialUser: User = {
                ...firebaseUser,
                id: firebaseUser.uid,
                email: firebaseUser.email || undefined,
                emailVerified: firebaseUser.emailVerified,
                role: currentRole,
                full_name: firebaseUser.displayName || '',
                name: firebaseUser.displayName || '',
                phone: firebaseUser.phoneNumber || '',
                photoUrl: firebaseUser.photoURL || '',
                isRegistrationComplete: false,
                needsEmailVerification: loginMethod === 'email' && !firebaseUser.emailVerified
              };
              
              set({ isAuthenticated: true, user: partialUser, isLoading: false });
              resolve();
              return; // Exit early so we don't proceed to the normal user creation
            } else {
              // Document exists, check if email is verified for email users
              const loginMethod = userData?.loginMethod || (firebaseUser.providerData.some(p => p.providerId === 'password') ? 'email' : 'google');
              
              if (loginMethod === 'email' && !firebaseUser.emailVerified) {
                 // Needs email verification
                 const partialUser: User = {
                  ...firebaseUser,
                  id: firebaseUser.uid,
                  email: firebaseUser.email || undefined,
                  emailVerified: firebaseUser.emailVerified,
                  role: currentRole,
                  full_name: userData?.full_name || firebaseUser.displayName || '',
                  name: userData?.full_name || firebaseUser.displayName || '',
                  phone: userData?.phone || firebaseUser.phoneNumber || '',
                  photoUrl: userData?.avatar_url || firebaseUser.photoURL || '',
                  isRegistrationComplete: true, // But needs email verification
                  needsEmailVerification: true
                 };
                 set({ isAuthenticated: true, user: partialUser, isLoading: false });
                 resolve();
                 return;
              }

              // Normal flow for existing user
              if (intendedRole && intendedRole !== currentRole) {
                await updateDoc(userDocRef, { role: intendedRole });
                
                if (intendedRole === 'partner') {
                  const bizRef = doc(db, 'businesses', firebaseUser.uid);
                  const bizSnap = await getDoc(bizRef);
                  if (!bizSnap.exists()) {
                    await setDoc(bizRef, {
                      owner_id: firebaseUser.uid,
                      name: `${firebaseUser.displayName || 'My'}'s Facility`,
                      type: 'boarding',
                      address: "Address pending...",
                      status: 'pending'
                    });
                  }
                }
                currentRole = intendedRole;
              }
              await updateDoc(userDocRef, { lastLogin: new Date().toISOString() });
            }
          } catch (e) {
            console.error("Failed to sync user document:", e);
          }
          
          localStorage.removeItem('petpro_intended_role');

          const user: User = {
            ...firebaseUser,
            id: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            emailVerified: firebaseUser.emailVerified,
            role: currentRole,
            full_name: userData?.full_name || firebaseUser.displayName || '',
            name: userData?.full_name || firebaseUser.displayName || '',
            phone: userData?.phone || firebaseUser.phoneNumber || '',
            photoUrl: userData?.avatar_url || firebaseUser.photoURL || '',
            isRegistrationComplete: true,
          };

          set({ isAuthenticated: true, user, isLoading: false });
          resolve();
        });
        
      } catch (error) {
        console.error('Auth check failed:', error);
        set({ isAuthenticated: false, isLoading: false });
        resolve();
      }
    });
  }
}));
