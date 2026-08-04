import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Map as GoogleMap } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, ArrowLeft, Loader2, Check } from 'lucide-react';
import { useLocationStore } from '../../store/useLocationStore';
import { reverseGeocode, type FullLocation } from '../../utils/locationUtils';
import { FallbackMap } from '../Map/FallbackMap';
import { useMapContext } from '../../context/MapContext';

interface MapLocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onConfirm: (location: FullLocation) => void;
  onBack: () => void;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  initialLocation,
  onConfirm,
  onBack
}) => {
  const { currentLocation, requestGPS, isDetecting } = useLocationStore();
  const { isLoaded, loadError, authFailed } = useMapContext();
  
  // Start at initial location or user's current GPS, fallback to Bangalore
  const defaultCenter = initialLocation || currentLocation || { lat: 12.9716, lng: 77.5946 };
  
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [dragLocation, setDragLocation] = useState<FullLocation | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [houseFlatNo, setHouseFlatNo] = useState('');
  
  // Ref to hold debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When map camera changes (i.e. user drags map)
  const handleCameraChange = useCallback((ev: any) => {
    const newCenter = ev.detail.center;
    setMapCenter(newCenter);
    setIsGeocoding(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const result = await reverseGeocode(newCenter.lat, newCenter.lng);
      if (result) {
        setDragLocation(result);
      }
      setIsGeocoding(false);
    }, 600); // 600ms debounce
  }, []);

  // Initial geocode if we haven't dragged yet
  useEffect(() => {
    if (!dragLocation) {
      setIsGeocoding(true);
      reverseGeocode(defaultCenter.lat, defaultCenter.lng).then((result: FullLocation | null) => {
        if (result) setDragLocation(result);
        setIsGeocoding(false);
      });
    }
  }, [defaultCenter.lat, defaultCenter.lng]);

  const handleConfirm = () => {
    if (dragLocation) {
      // Prepend house/flat number if provided
      let finalAddress = dragLocation.formatted_address;
      if (houseFlatNo.trim()) {
        finalAddress = `${houseFlatNo.trim()}, ${finalAddress}`;
      }
      onConfirm({
        ...dragLocation,
        formatted_address: finalAddress
      });
    }
  };

  const mapAvailable = isLoaded && !loadError && !authFailed;

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 z-50 overflow-hidden rounded-t-3xl h-full w-full font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center shadow-sm z-10 relative shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors mr-2">
          <ArrowLeft size={22} className="text-slate-700" />
        </button>
        <h2 className="text-base font-black text-slate-900 tracking-tight">Select delivery location</h2>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-200 w-full h-full">
        {mapAvailable ? (
          <GoogleMap
            mapId="LOCATION_PICKER_MAP"
            style={{ width: '100%', height: '100%' }}
            defaultCenter={defaultCenter}
            defaultZoom={16}
            gestureHandling="greedy"
            disableDefaultUI={true}
            onCameraChanged={handleCameraChange}
          />
        ) : (
          <FallbackMap 
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={16}
            className="w-full h-full"
          />
        )}

        {/* Center Static Pin Overlay - Perfectly Centered Zomato-Style Needle */}
        <div className="absolute top-1/2 left-1/2 pointer-events-none z-10 flex flex-col items-center" style={{ transform: 'translate(-50%, -100%)' }}>
          {/* Tooltip / Label */}
          <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg mb-1 shadow-lg whitespace-nowrap animate-fade-in-up">
            {isGeocoding ? "Locating..." : "Order will be delivered here"}
          </div>
          
          {/* Zomato-style sharp pin marker */}
          <div className="relative flex flex-col items-center">
            {/* The circular head */}
            <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center shadow-md border-[3px] border-white z-10">
               <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
            {/* The sharp needle pointing exactly to the bottom center */}
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-red-500 -mt-[2px] z-0 drop-shadow-sm"></div>
          </div>
          
          {/* Ground shadow - perfectly aligned with the needle tip */}
          <div className="w-4 h-1.5 bg-black/30 rounded-[100%] blur-[1.5px] mt-0.5"></div>
        </div>

        {/* Floating GPS Button */}
        <button 
          onClick={async () => {
             await requestGPS();
             if (currentLocation) {
                setMapCenter(currentLocation);
             }
          }}
          className="absolute bottom-28 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors z-20 pointer-events-auto"
        >
          {isDetecting ? <Loader2 size={20} className="text-blue-600 animate-spin" /> : <Navigation size={20} className="text-blue-600" />}
        </button>
      </div>

      {/* Bottom Panel - Zomato/Swiggy Style */}
      <div className="bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-5 py-6 z-20 relative -mt-4 shrink-0 pointer-events-auto">
        <div className="flex items-start gap-4 mb-6">
           <div className="mt-1 flex-shrink-0">
             <MapPin size={28} className="text-red-500" strokeWidth={2.5} />
           </div>
           <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-900 text-[22px] tracking-tight leading-tight line-clamp-1 mb-1">
                {dragLocation?.area || dragLocation?.city || "Selected Location"}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-snug line-clamp-2 min-h-[40px]">
                {isGeocoding ? (
                  <span className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
                    <Loader2 size={14} className="animate-spin" /> Fetching address details...
                  </span>
                ) : (
                  dragLocation?.formatted_address || "Drag the map to pinpoint your exact location."
                )}
              </p>
           </div>
        </div>

        <div className="mb-5">
           <input 
             type="text" 
             placeholder="HOUSE / FLAT / BLOCK NO." 
             value={houseFlatNo}
             onChange={e => setHouseFlatNo(e.target.value)}
             className="w-full bg-slate-50 border-b-2 border-slate-200 px-2 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 transition-colors uppercase tracking-wide"
           />
        </div>

        <button
          onClick={handleConfirm}
          disabled={isGeocoding || !dragLocation}
          className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-lg tracking-wide uppercase"
        >
          {isGeocoding ? (
            <><Loader2 size={20} className="animate-spin" /> Locating...</>
          ) : (
            <>Confirm Location</>
          )}
        </button>
      </div>
    </div>
  );
};
