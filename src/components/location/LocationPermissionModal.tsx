/**
 * LocationPermissionModal.tsx
 * Premium Zomato/Swiggy-style location permission bottom sheet.
 * Shown on first visit to request GPS access.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X, Shield } from 'lucide-react';
import { useLocationStore } from '../../store/useLocationStore';

export const LocationPermissionModal: React.FC = () => {
  const { showPermissionModal, setShowPermissionModal, requestGPS, isDetecting } = useLocationStore();

  const handleAllow = async () => {
    await requestGPS();
    setShowPermissionModal(false);
  };

  const handleDismiss = () => {
    setShowPermissionModal(false);
  };

  return (
    <AnimatePresence>
      {showPermissionModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            onClick={handleDismiss}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 px-6 pt-5 pb-10 sm:max-w-md sm:mx-auto sm:bottom-8 sm:rounded-3xl sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full"
          >
            {/* Handle Bar */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-200">
                  <MapPin size={36} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center border-2 border-white">
                  <Shield size={14} className="text-white" />
                </div>
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-3xl border-2 border-purple-400 animate-ping opacity-20" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6 space-y-2">
              <h2 className="text-xl font-black text-slate-900">Enable Location</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                GouujiPets uses your location to show you the nearest verified pet care partners, real travel times, and the best prices near you.
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex justify-center gap-4 mb-6">
              {['🔒 100% Secure', '📍 GPS Only', '🚫 Never Shared'].map((label) => (
                <span key={label} className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                  {label}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                onClick={handleAllow}
                disabled={isDetecting}
                className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-70 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-purple-200 transition-all active:scale-98"
              >
                {isDetecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Detecting your location...
                  </>
                ) : (
                  <>
                    <Navigation size={20} />
                    Allow Location Access
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className="w-full h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm rounded-2xl transition-colors"
              >
                Not Now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
