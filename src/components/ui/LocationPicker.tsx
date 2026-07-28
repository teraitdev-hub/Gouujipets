import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Search, CheckCircle2, ChevronRight, X, Building2, Target } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; exactAddress?: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultAddress?: string;
  className?: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: any;
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

function formatAddress(data: any): { short: string; full: string; pincode: string } {
  if (!data?.address) return { short: data?.display_name || '', full: data?.display_name || '', pincode: '' };
  const a = data.address;
  const parts = [
    a.road || a.pedestrian || a.footway || '',
    a.neighbourhood || a.suburb || a.quarter || '',
    a.city || a.town || a.village || a.county || '',
  ].filter(Boolean);
  const short = parts.slice(0, 2).join(', ');
  const full = data.display_name;
  const pincode = a.postcode || '';
  return { short: short || full, full, pincode };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  defaultLocation = { lat: 12.9716, lng: 77.5946 },
  defaultAddress = '',
  className = 'w-full h-64 rounded-2xl overflow-hidden',
}) => {
  const [phase, setPhase] = useState<'idle' | 'detecting' | 'done'>('idle');
  const [location, setLocation] = useState(defaultLocation);
  const [mapZoom, setMapZoom] = useState(13);
  const [shortAddr, setShortAddr] = useState('');
  const [fullAddr, setFullAddr] = useState(defaultAddress);
  const [pincode, setPincode] = useState('');
  const [exactInput, setExactInput] = useState(defaultAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const debounceRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const applyLocation = async (lat: number, lng: number, zoom = 16, knownData?: any) => {
    setLocation({ lat, lng });
    setMapZoom(zoom);
    const data = knownData || await reverseGeocode(lat, lng);
    if (data) {
      const fmt = formatAddress(data);
      setShortAddr(fmt.short);
      setFullAddr(fmt.full);
      setPincode(fmt.pincode);
      setExactInput(fmt.short);
      onLocationSelect({ lat, lng, address: fmt.full, exactAddress: fmt.short });
    } else {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setShortAddr(fallback); setFullAddr(fallback);
      onLocationSelect({ lat, lng, address: fallback, exactAddress: fallback });
    }
    setPhase('done');
  };

  // ── Live GPS (watchPosition for max accuracy) ──
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Your browser does not support location detection. Please type your address below.');
      setPhase('done');
      return;
    }
    setPhase('detecting');
    setGpsError('');

    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }

    const timeout = setTimeout(() => {
      if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      setGpsError('Location detection timed out. Please search your address below.');
      setPhase('done');
    }, 15000);

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (accuracy <= 100 || !watchRef.current) {
          clearTimeout(timeout);
          if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
          await applyLocation(lat, lng, accuracy < 50 ? 18 : 16);
        }
        // Keep watching until we get ≤100m accuracy
      },
      (err) => {
        clearTimeout(timeout);
        if (err.code === 1) {
          setGpsError('Location permission denied. Please allow location access and try again, or type your address below.');
        } else {
          setGpsError('Could not detect location. Please type your address below.');
        }
        setPhase('done');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ── Search suggestions dropdown ──
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (res.ok) {
          const data: Suggestion[] = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch (_) {}
      setIsSuggesting(false);
    }, 500);
  };

  const handleSuggestionSelect = async (s: Suggestion) => {
    setShowSuggestions(false);
    setSearchQuery('');
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const fmt = formatAddress({ address: s.address, display_name: s.display_name });
    await applyLocation(lat, lng, 16, { address: s.address, display_name: s.display_name });
  };

  const handleMapPin = async (lat: number, lng: number) => {
    await applyLocation(lat, lng, mapZoom);
  };

  // ─── Phase: idle — Flipkart-style prompt ───
  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6 space-y-5 font-sans">
        {/* Detect button — primary CTA */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
            <Target size={32} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Set Your Location</h3>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Detect live location or search your address</p>
          </div>
          <button
            type="button"
            onClick={handleDetectLocation}
            className="w-full h-14 bg-violet-600 hover:bg-violet-700 active:scale-98 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-violet-200 transition-all"
          >
            <Navigation size={20} />
            📡 Detect My Current Location
          </button>
          <p className="text-[11px] text-slate-400 font-medium">We will ask for your browser's location permission</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase">or enter manually</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Manual search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {isSuggesting && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search area, street, landmark, city…"
            className="w-full h-12 pl-11 pr-10 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all shadow-sm"
          />
          {showSuggestions && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              {suggestions.map((s, i) => {
                const fmt = formatAddress({ address: s.address, display_name: s.display_name });
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionSelect(s)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-violet-50 active:bg-violet-100 text-left border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <MapPin size={16} className="text-violet-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{fmt.short || s.display_name.split(',')[0]}</p>
                      <p className="text-xs text-slate-400 truncate font-medium">{s.display_name}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Phase: detecting ───
  if (phase === 'detecting') {
    return (
      <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-8 flex flex-col items-center justify-center gap-4 min-h-[180px] font-sans">
        <div className="relative">
          <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center">
            <Navigation size={28} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-violet-400 animate-ping opacity-30" />
        </div>
        <div className="text-center">
          <p className="font-black text-violet-900 text-base">Detecting your location…</p>
          <p className="text-sm text-violet-600 font-medium mt-0.5">Please allow location access if prompted</p>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Phase: done — show confirmed location + map ───
  return (
    <div className="space-y-4 font-sans">
      {/* GPS error banner */}
      {gpsError && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-orange-500 text-lg shrink-0">⚠️</span>
          <p className="text-xs font-semibold text-orange-700 leading-relaxed">{gpsError}</p>
        </div>
      )}

      {/* Confirmed address card */}
      {shortAddr && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-green-900 text-sm">{shortAddr}</p>
            {pincode && <p className="text-xs font-bold text-green-700 mt-0.5">📮 PIN: {pincode}</p>}
            <p className="text-[11px] text-green-600 mt-0.5 truncate">{fullAddr}</p>
          </div>
          <button type="button" onClick={() => { setPhase('idle'); setShortAddr(''); setSearchQuery(''); }}
            className="shrink-0 text-green-400 hover:text-green-600 p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Change location search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {isSuggesting && <Loader2 size={13} className="absolute right-14 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search different area or address…"
          className="w-full h-11 pl-11 pr-28 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all"
        />
        <button
          type="button"
          onClick={handleDetectLocation}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors"
        >
          <Navigation size={11} /> GPS
        </button>
        {showSuggestions && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            {suggestions.map((s, i) => {
              const fmt = formatAddress({ address: s.address, display_name: s.display_name });
              return (
                <button key={i} type="button" onClick={() => handleSuggestionSelect(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-violet-50 text-left border-b border-slate-50 last:border-0 transition-colors">
                  <MapPin size={15} className="text-violet-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{fmt.short || s.display_name.split(',')[0]}</p>
                    <p className="text-xs text-slate-400 truncate">{s.display_name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={11} className="text-violet-500" /> Tap or drag pin to fine-tune
        </p>
        <FallbackMap center={[location.lat, location.lng]} zoom={mapZoom} className={className} onLocationSelect={handleMapPin} />
      </div>

      {/* Exact address field */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={13} className="text-violet-600" /> House / Flat / Floor / Building
        </label>
        <input
          type="text"
          value={exactInput}
          onChange={(e) => {
            setExactInput(e.target.value);
            onLocationSelect({ lat: location.lat, lng: location.lng, address: fullAddr || e.target.value, exactAddress: e.target.value });
          }}
          placeholder="e.g. Flat 4B, 2nd Floor, Prestige Tower"
          className="w-full h-11 px-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all"
        />
        <p className="text-[11px] text-slate-400 font-mono px-1">
          📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </p>
      </div>
    </div>
  );
};
