/**
 * useLocationStore.ts — Global Zustand store for location state.
 * Single source of truth for user GPS, saved addresses, and recent searches.
 * Persists to localStorage and syncs to Firebase for logged-in users.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { haversineDistance } from '../utils/locationUtils';

export interface LocationData {
  lat: number;
  lng: number;
  formatted_address: string;
  place_id?: string;
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  accuracy?: number;
  timestamp?: string;
}

export type AddressLabel = 'home' | 'work' | 'other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  title: string;
  lat: number;
  lng: number;
  place_id?: string;
  formatted_address: string;
  area?: string;
  city?: string;
  pincode?: string;
  isDefault: boolean;
  createdAt: string;
}

export type LocationPermission = 'granted' | 'denied' | 'prompt' | null;

interface LocationState {
  // Current detected location
  currentLocation: LocationData | null;
  locationPermission: LocationPermission;
  isDetecting: boolean;
  detectionError: string | null;

  // Saved addresses (synced with Firestore)
  savedAddresses: SavedAddress[];

  // Recent searches (last 20, stored locally)
  recentSearches: LocationData[];

  // Whether to show the permission prompt modal
  showPermissionModal: boolean;

  // Actions
  setShowPermissionModal: (show: boolean) => void;
  requestGPS: () => Promise<LocationData | null>;
  setCurrentLocation: (loc: LocationData) => void;
  clearCurrentLocation: () => void;

  addRecentSearch: (loc: LocationData) => void;
  clearRecentSearches: () => void;

  // Saved addresses — pass userId for Firestore sync
  loadSavedAddresses: (userId: string) => Promise<void>;
  addSavedAddress: (address: Omit<SavedAddress, 'id' | 'createdAt'>, userId: string) => Promise<void>;
  updateSavedAddress: (id: string, updates: Partial<SavedAddress>, userId: string) => Promise<void>;
  removeSavedAddress: (id: string, userId: string) => Promise<void>;
  setDefaultAddress: (id: string, userId: string) => Promise<void>;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      currentLocation: null,
      locationPermission: null,
      isDetecting: false,
      detectionError: null,
      savedAddresses: [],
      recentSearches: [],
      showPermissionModal: false,

      setShowPermissionModal: (show) => set({ showPermissionModal: show }),

      setCurrentLocation: (loc) =>
        set({ currentLocation: { ...loc, timestamp: new Date().toISOString() } }),

      clearCurrentLocation: () => set({ currentLocation: null }),

      /**
       * Request GPS with high accuracy and accuracy polling.
       * Keeps watching until accuracy < 50m or 8 seconds pass.
       */
      requestGPS: async (): Promise<LocationData | null> => {
        if (!navigator.geolocation) {
          set({ detectionError: 'Geolocation not supported by your browser.', locationPermission: 'denied' });
          return null;
        }

        set({ isDetecting: true, detectionError: null });

        return new Promise((resolve) => {
          let bestResult: GeolocationPosition | null = null;
          let watchId: number | null = null;
          const TIMEOUT_MS = 8000;
          const DESIRED_ACCURACY_M = 50;

          const finish = async (pos: GeolocationPosition) => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;

            // Reverse geocode with Google if available, else OSM
            let locData: LocationData = {
              lat, lng, accuracy,
              formatted_address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              timestamp: new Date().toISOString(),
            };

            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
              );
              if (res.ok) {
                const data = await res.json();
                const a = data.address || {};
                locData = {
                  ...locData,
                  formatted_address: data.display_name || locData.formatted_address,
                  street: a.road || a.pedestrian || '',
                  area: a.suburb || a.neighbourhood || a.county || '',
                  city: a.city || a.town || a.village || '',
                  district: a.county || '',
                  state: a.state || '',
                  country: a.country || 'India',
                  postal_code: a.postcode || '',
                };
              }
            } catch (_) {}

            set({
              currentLocation: locData,
              locationPermission: 'granted',
              isDetecting: false,
              detectionError: null,
            });
            resolve(locData);
          };

          const onError = (err: GeolocationPositionError) => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            const msg =
              err.code === 1
                ? 'Location permission denied. Please allow access in your browser settings.'
                : err.code === 2
                ? 'Unable to determine location. Please check your GPS or try searching manually.'
                : 'Location request timed out. Please try again.';
            set({
              isDetecting: false,
              detectionError: msg,
              locationPermission: err.code === 1 ? 'denied' : 'prompt',
            });
            resolve(null);
          };

          // Timeout safety net
          const timer = setTimeout(() => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (bestResult) {
              finish(bestResult);
            } else {
              onError({ code: 3, message: 'Timeout', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
            }
          }, TIMEOUT_MS);

          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              bestResult = pos;
              if (pos.coords.accuracy <= DESIRED_ACCURACY_M) {
                clearTimeout(timer);
                finish(pos);
              }
            },
            (err) => {
              clearTimeout(timer);
              onError(err);
            },
            { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 }
          );
        });
      },

      addRecentSearch: (loc) => {
        const current = get().recentSearches;
        // Deduplicate by proximity (within 100m)
        const deduped = current.filter(
          (r) => haversineDistance(r.lat, r.lng, loc.lat, loc.lng) > 0.1
        );
        set({ recentSearches: [loc, ...deduped].slice(0, 20) });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      // ── Firestore Saved Addresses ──────────────────────────────────────

      loadSavedAddresses: async (userId) => {
        try {
          const snap = await getDocs(collection(db, 'users', userId, 'savedAddresses'));
          const addresses: SavedAddress[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedAddress));
          set({ savedAddresses: addresses });
        } catch (err) {
          console.error('Failed to load saved addresses:', err);
        }
      },

      addSavedAddress: async (address, userId) => {
        try {
          const id = `addr_${Date.now()}`;
          const newAddr: SavedAddress = {
            ...address,
            id,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', userId, 'savedAddresses', id), {
            ...newAddr,
            createdAt: serverTimestamp(),
          });
          set((s) => ({ savedAddresses: [...s.savedAddresses, newAddr] }));
        } catch (err) {
          console.error('Failed to save address:', err);
        }
      },

      updateSavedAddress: async (id, updates, userId) => {
        try {
          await updateDoc(doc(db, 'users', userId, 'savedAddresses', id), updates as Record<string, unknown>);
          set((s) => ({
            savedAddresses: s.savedAddresses.map((a) => (a.id === id ? { ...a, ...updates } : a)),
          }));
        } catch (err) {
          console.error('Failed to update address:', err);
        }
      },

      removeSavedAddress: async (id, userId) => {
        try {
          await deleteDoc(doc(db, 'users', userId, 'savedAddresses', id));
          set((s) => ({ savedAddresses: s.savedAddresses.filter((a) => a.id !== id) }));
        } catch (err) {
          console.error('Failed to remove address:', err);
        }
      },

      setDefaultAddress: async (id, userId) => {
        try {
          const current = get().savedAddresses;
          // Unset all defaults in Firestore, then set the new one
          await Promise.all(
            current.map((a) =>
              updateDoc(doc(db, 'users', userId, 'savedAddresses', a.id), { isDefault: a.id === id })
            )
          );
          set((s) => ({
            savedAddresses: s.savedAddresses.map((a) => ({ ...a, isDefault: a.id === id })),
          }));
        } catch (err) {
          console.error('Failed to set default address:', err);
        }
      },
    }),
    {
      name: 'gouujipets-location',
      // Only persist these fields to localStorage
      partialize: (state) => ({
        currentLocation: state.currentLocation,
        locationPermission: state.locationPermission,
        recentSearches: state.recentSearches,
      }),
    }
  )
);
