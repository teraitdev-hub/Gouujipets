/**
 * LocationHeaderBar.tsx
 * Compact location pill shown in the navbar — Amazon/Zomato style.
 * Clicking opens the LocationSelectorSheet.
 */

import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { useLocationStore } from '../../store/useLocationStore';
import { LocationSelectorSheet } from './LocationSelectorSheet';

export const LocationHeaderBar: React.FC = () => {
  const { currentLocation, isDetecting, locationPermission, setShowPermissionModal } = useLocationStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Show permission modal on first load if not yet asked
  useEffect(() => {
    if (locationPermission === null) {
      // Small delay to let the page render first
      const t = setTimeout(() => setShowPermissionModal(true), 1800);
      return () => clearTimeout(t);
    }
  }, [locationPermission, setShowPermissionModal]);

  const displayCity =
    currentLocation?.area || currentLocation?.city
      ? `${currentLocation.area || ''}${currentLocation.area && currentLocation.city ? ', ' : ''}${currentLocation.city || ''}`
      : null;

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="flex items-center gap-1.5 max-w-[200px] sm:max-w-xs group"
        aria-label="Change delivery location"
      >
        <div className="relative flex-shrink-0">
          <MapPin
            size={16}
            className={`transition-colors ${currentLocation ? 'text-purple-600' : 'text-slate-400'}`}
          />
          {isDetecting && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
          )}
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {currentLocation ? 'Delivering to' : 'Set Location'}
          </span>
          <div className="flex items-center gap-0.5">
            {isDetecting ? (
              <span className="text-xs font-black text-purple-600 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Detecting...
              </span>
            ) : (
              <span className="text-xs font-black text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                {displayCity || 'Select Location'}
              </span>
            )}
            <ChevronDown
              size={12}
              className="text-slate-400 group-hover:text-purple-600 transition-colors flex-shrink-0 mt-px"
            />
          </div>
        </div>
      </button>

      <LocationSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};
