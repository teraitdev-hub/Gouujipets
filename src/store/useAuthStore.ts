import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface User {
  id: string;
  email?: string;
  role?: 'customer' | 'partner' | 'superadmin' | string;
  full_name?: string;
  user_metadata?: Record<string, any>;
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
              // Create missing user document!
              currentRole = intendedRole || 'customer';
              await setDoc(userDocRef, {
                role: currentRole,
                email: firebaseUser.email || '',
                full_name: firebaseUser.displayName || 'Unknown',
                avatar_url: firebaseUser.photoURL || '',
                loginMethod: 'google',
                isActive: true,
                walletBalance: 0,
                rewardPoints: 0,
                createdDate: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
              });
              
              if (currentRole === 'partner') {
                const bizRef = doc(db, 'businesses', firebaseUser.uid);
                await setDoc(bizRef, {
                  owner_id: firebaseUser.uid,
                  name: `${firebaseUser.displayName || 'My'}'s Facility`,
                  type: 'boarding',
                  address: "Address pending...",
                  status: 'pending'
                });
              }
            } else {
              // Document exists, update it
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
            role: currentRole,
            full_name: userData?.full_name || firebaseUser.displayName || '',
            name: userData?.full_name || firebaseUser.displayName || '',
            phone: userData?.phone || firebaseUser.phoneNumber || '',
            photoUrl: userData?.avatar_url || firebaseUser.photoURL || '',
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
