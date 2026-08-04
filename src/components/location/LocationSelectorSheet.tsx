/**
 * LocationSelectorSheet.tsx
 * Full-featured location selector bottom sheet — Amazon/Zomato/Swiggy style.
 * Features: GPS, Places Autocomplete search, Saved Addresses, Recent Searches.
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, MapPin, Home, Briefcase, Star,
  Clock, ChevronRight, Trash2, Loader2, Check
} from 'lucide-react';
import { useLocationStore, type SavedAddress } from '../../store/useLocationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PlacesAutocompleteInput, type PlaceResult } from './PlacesAutocompleteInput';
import { MapLocationPicker } from './MapLocationPicker';
import { type FullLocation } from '../../utils/locationUtils';

interface LocationSelectorSheetProps {
  open: boolean;
  onClose: () => void;
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
  home: <Home size={16} />,
  work: <Briefcase size={16} />,
  other: <Star size={16} />,
};

const LABEL_COLORS: Record<string, string> = {
  home: 'bg-blue-100 text-blue-700',
  work: 'bg-amber-100 text-amber-700',
  other: 'bg-purple-100 text-purple-700',
};

export const LocationSelectorSheet: React.FC<LocationSelectorSheetProps> = ({ open, onClose }) => {
  const {
    currentLocation, isDetecting, detectionError,
    requestGPS, setCurrentLocation, addRecentSearch,
    savedAddresses, loadSavedAddresses, removeSavedAddress,
    recentSearches,
  } = useLocationStore();
  const { user } = useAuthStore();
  const searchRef = useRef<HTMLInputElement>(null);

  // New state to toggle between views
  const [view, setView] = React.useState<'search' | 'map'>('search');
  const [pendingLocation, setPendingLocation] = React.useState<{ lat: number; lng: number } | undefined>();

  useEffect(() => {
    if (open && user?.id) {
      loadSavedAddresses(user.id);
    }
  }, [open, user?.id, loadSavedAddresses]);

  const handleGPS = async () => {
    // If they click GPS in search view, open the map view starting at their GPS
    await requestGPS();
    const state = useLocationStore.getState();
    if (state.currentLocation) {
       setPendingLocation({ lat: state.currentLocation.lat, lng: state.currentLocation.lng });
       setView('map');
    }
  };

  const handleSearchSelect = (result: PlaceResult) => {
    // Transition to Map View to let them confirm/pin-drop the searched place
    setPendingLocation({ lat: result.lat, lng: result.lng });
    setView('map');
  };

  const handleFinalConfirm = (loc: FullLocation) => {
    setCurrentLocation(loc);
    addRecentSearch(loc);
    setView('search');
    onClose();
  };

  // Reset view when sheet opens
  useEffect(() => {
    if (open) setView('search');
  }, [open]);

  const handleSavedAddressPick = (addr: SavedAddress) => {
    setCurrentLocation({
      lat: addr.lat,
      lng: addr.lng,
      formatted_address: addr.formatted_address,
      place_id: addr.place_id,
      area: addr.area,
      city: addr.city,
      postal_code: addr.pincode,
    });
    onClose();
  };

  const handleRecentPick = (loc: typeof recentSearches[0]) => {
    setCurrentLocation(loc);
    onClose();
  };

  const handleRemoveSaved = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (user?.id) await removeSavedAddress(id, user.id);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className={`fixed bottom-0 left-0 right-0 z-[151] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden ${
              view === 'map' ? 'h-[100dvh]' : 'max-h-[90vh] rounded-t-3xl'
            }`}
          >
            {view === 'map' ? (
               <MapLocationPicker 
                 key={pendingLocation ? `${pendingLocation.lat}-${pendingLocation.lng}` : 'map'}
                 initialLocation={pendingLocation} 
                 onConfirm={handleFinalConfirm} 
                 onBack={() => setView('search')} 
               />
            ) : (
               <>
                 {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-black text-slate-900">Select Location</h2>
                <p className="text-xs text-slate-500 font-medium">Choose where to find nearby pet care</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5 pt-4">

              {/* Search */}
              <PlacesAutocompleteInput
                placeholder="Search city, area, building, landmark..."
                onSelect={handleSearchSelect}
                autoFocus={open}
              />

              {/* GPS Button */}
              <button
                onClick={handleGPS}
                disabled={isDetecting}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all group disabled:opacity-60"
              >
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  {isDetecting ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                    <Navigation size={20} className="text-white group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900">
                    {isDetecting ? 'Detecting GPS...' : '📍 Use Current Location'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {isDetecting ? 'Please wait, acquiring GPS lock...' : 'Using device GPS for pinpoint accuracy'}
                  </p>
                </div>
                {!isDetecting && <ChevronRight size={16} className="text-purple-400 ml-auto flex-shrink-0" />}
              </button>

              {/* Select via Map Button */}
              <button
                onClick={() => setView('map')}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all group"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-slate-700 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900">
                    Select via Map
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Drag and drop a pin on the map
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 ml-auto flex-shrink-0 group-hover:text-slate-500" />
              </button>

              {detectionError && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  ⚠️ {detectionError}
                </p>
              )}

              {/* Current Location Preview */}
              {currentLocation && (
                <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
                  <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-green-800 uppercase tracking-wider mb-0.5">Current Location</p>
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {currentLocation.area || currentLocation.city || 'Location set'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{currentLocation.formatted_address}</p>
                  </div>
                </div>
              )}

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Saved Addresses
                  </p>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => handleSavedAddressPick(addr)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded-2xl transition-all group text-left"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${LABEL_COLORS[addr.label]}`}>
                          {LABEL_ICONS[addr.label]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-black text-slate-900 capitalize">{addr.title || addr.label}</p>
                            {addr.isDefault && (
                              <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{addr.formatted_address}</p>
                        </div>
                        <button
                          onClick={(e) => handleRemoveSaved(e, addr.id)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:text-red-600 flex items-center justify-center transition-all flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Recent Searches
                  </p>
                  <div className="space-y-1">
                    {recentSearches.slice(0, 5).map((loc, i) => (
                      <button
                        key={i}
                        onClick={() => handleRecentPick(loc)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Clock size={13} className="text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {loc.area || loc.city || 'Location'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{loc.formatted_address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {savedAddresses.length === 0 && recentSearches.length === 0 && (
                <div className="text-center py-6">
                  <MapPin size={32} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">
                    Search for a location or use GPS to get started
                  </p>
                </div>
              )}
            </div>
            </>
           )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
