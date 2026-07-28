import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Search, CheckCircle2, ChevronRight, X, Building2, Target, AlertTriangle } from 'lucide-react';
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

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const HAS_GMAPS = GMAPS_KEY && GMAPS_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

/* ── Geocoding helpers ── */

// Reverse geocode: coords → address (Google first, Nominatim fallback)
async function reverseGeocode(lat: number, lng: number) {
  if (HAS_GMAPS) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAPS_KEY}&language=en&region=in`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]) {
        return { source: 'google', result: data.results[0] };
      }
    } catch (_) {}
  }
  // Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) return { source: 'osm', result: await res.json() };
  } catch (_) {}
  return null;
}

// Forward geocode: text → coords + address (Google first, Nominatim fallback)
async function forwardGeocode(query: string): Promise<Suggestion[]> {
  if (HAS_GMAPS) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GMAPS_KEY}&language=en&region=in`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        return data.results.slice(0, 5).map((r: any) => ({
          display_name: r.formatted_address,
          lat: String(r.geometry.location.lat),
          lon: String(r.geometry.location.lng),
        }));
      }
    } catch (_) {}
  }
  // Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

function parseAddress(geo: any): { short: string; full: string; pincode: string } {
  if (!geo) return { short: '', full: '', pincode: '' };
  if (geo.source === 'google') {
    const r = geo.result;
    const comps = r.address_components || [];
    const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || '';
    const pincode = get('postal_code');
    const area = get('sublocality_level_1') || get('sublocality') || get('neighborhood');
    const city = get('locality') || get('administrative_area_level_2');
    const short = [area, city].filter(Boolean).join(', ');
    return { short: short || r.formatted_address, full: r.formatted_address, pincode };
  }
  // OSM format
  const a = geo.result?.address || {};
  const parts = [a.road || a.pedestrian || '', a.suburb || a.neighbourhood || '', a.city || a.town || a.village || ''].filter(Boolean);
  return {
    short: parts.slice(0, 2).join(', ') || geo.result?.display_name || '',
    full: geo.result?.display_name || '',
    pincode: a.postcode || '',
  };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  defaultLocation = { lat: 12.9716, lng: 77.5946 },
  defaultAddress = '',
  className = 'w-full h-64 rounded-2xl overflow-hidden',
}) => {
  const [phase, setPhase] = useState<'idle' | 'detecting' | 'done'>(defaultAddress ? 'done' : 'idle');
  const [location, setLocation] = useState(defaultLocation);
  const [mapZoom, setMapZoom] = useState(defaultAddress ? 15 : 13);
  const [shortAddr, setShortAddr] = useState('');
  const [fullAddr, setFullAddr] = useState(defaultAddress);
  const [pincode, setPincode] = useState('');
  const [exactInput, setExactInput] = useState(defaultAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const debounceRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const applyLocation = async (lat: number, lng: number, zoom = 16) => {
    setLocation({ lat, lng });
    setMapZoom(zoom);
    const geo = await reverseGeocode(lat, lng);
    const parsed = parseAddress(geo);
    setShortAddr(parsed.short);
    setFullAddr(parsed.full);
    setPincode(parsed.pincode);
    setExactInput(parsed.short);
    onLocationSelect({ lat, lng, address: parsed.full, exactAddress: parsed.short });
    setPhase('done');
  };

  /* ── GPS detect ── */
  const handleDetect = () => {
    if (!navigator.geolocation) {
      setGpsError('Location not supported on this browser. Please search manually below.');
      setPhase('done');
      return;
    }
    setPhase('detecting');
    setGpsError('');
    setGpsAccuracy(null);

    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }

    const giveUp = setTimeout(() => {
      if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      setGpsError('Location detection timed out. Please search your address below.');
      setPhase('done');
    }, 20000);

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        // Accept first result immediately, stop on good fix
        if (watchRef.current !== null) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
        clearTimeout(giveUp);
        await applyLocation(lat, lng, accuracy < 100 ? 18 : 15);
      },
      (err) => {
        clearTimeout(giveUp);
        if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
        setGpsError(
          err.code === 1
            ? 'Location permission denied. Allow location in browser settings and try again.'
            : 'Could not get your location. Please type your address in the search box.'
        );
        setPhase('done');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  /* ── Search with suggestions ── */
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      const results = await forwardGeocode(val);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSuggesting(false);
    }, 400);
  };

  const handleSuggestionPick = async (s: Suggestion) => {
    setShowSuggestions(false);
    setSearchQuery('');
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const short = s.display_name.split(',').slice(0, 2).join(',').trim();
    setShortAddr(short);
    setFullAddr(s.display_name);
    setExactInput(short);
    setLocation({ lat, lng });
    setMapZoom(16);
    onLocationSelect({ lat, lng, address: s.display_name, exactAddress: short });
    setPhase('done');
  };

  const handleMapPin = async (lat: number, lng: number) => {
    await applyLocation(lat, lng, mapZoom);
  };

  /* ── IDLE SCREEN ── */
  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 space-y-4 font-sans">
        {/* Icon + title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
            <Target size={28} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Set Your Business Location</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Just like Swiggy / Zomato — tap detect or type below</p>
          </div>
        </div>

        {/* Detect CTA */}
        <button
          type="button" onClick={handleDetect}
          className="w-full h-14 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-violet-200 transition-all"
        >
          <Navigation size={20} className="animate-pulse" />
          📡 Detect My Exact Location
        </button>
        <p className="text-center text-[11px] text-slate-400 font-medium -mt-1">Your browser will ask for location permission</p>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">or search</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {isSuggesting && <Loader2 size={13} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
          <input
            type="text" value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search area, street, colony, city…"
            className="w-full h-12 pl-11 pr-10 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all"
          />
          {showSuggestions && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestionPick(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-violet-50 active:bg-violet-100 text-left border-b border-slate-50 last:border-0 transition-colors">
                  <MapPin size={15} className="text-violet-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{s.display_name.split(',')[0]}</p>
                    <p className="text-xs text-slate-400 truncate">{s.display_name}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── DETECTING SCREEN ── */
  if (phase === 'detecting') {
    return (
      <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-8 flex flex-col items-center justify-center gap-4 min-h-[200px] font-sans">
        <div className="relative">
          <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-300">
            <Navigation size={28} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-violet-400 animate-ping opacity-25" />
          <div className="absolute inset-[-8px] rounded-full border-2 border-violet-300 animate-ping opacity-15" style={{ animationDelay: '0.3s' }} />
        </div>
        <div className="text-center">
          <p className="font-black text-violet-900 text-base">Finding your exact location…</p>
          <p className="text-sm text-violet-600 font-medium mt-1">Allow location access when your browser asks</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── DONE SCREEN ── */
  return (
    <div className="space-y-3 font-sans">
      {/* Error banner */}
      {gpsError && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex gap-2">
          <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-orange-700 leading-relaxed">{gpsError}</p>
        </div>
      )}

      {/* Confirmed address card */}
      {shortAddr && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl px-4 py-3 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-green-900 text-sm leading-tight">{shortAddr}</p>
            {pincode && <span className="inline-block mt-1 text-[11px] font-bold bg-green-200 text-green-800 rounded-full px-2 py-0.5">📮 {pincode}</span>}
            <p className="text-[11px] text-green-600 mt-1 leading-relaxed">{fullAddr}</p>
          </div>
          <button type="button" onClick={() => { setPhase('idle'); setShortAddr(''); setSearchQuery(''); }}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-green-200 hover:bg-green-300 text-green-700 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* GPS accuracy pill */}
      {gpsAccuracy && !gpsError && (
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${
          gpsAccuracy <= 30 ? 'bg-green-100 text-green-700' : gpsAccuracy <= 100 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'
        }`}>
          <Target size={11} />
          GPS accuracy: ±{gpsAccuracy}m
          {gpsAccuracy > 100 && ' — drag pin below to fine-tune'}
        </div>
      )}

      {/* Search different location */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {isSuggesting && <Loader2 size={13} className="absolute right-14 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
        <input
          type="text" value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Change location — search area, street, city…"
          className="w-full h-11 pl-10 pr-20 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all"
        />
        <button type="button" onClick={handleDetect}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors">
          <Navigation size={11} /> GPS
        </button>

        {showSuggestions && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-56 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => handleSuggestionPick(s)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-violet-50 text-left border-b border-slate-50 last:border-0 transition-colors">
                <MapPin size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.display_name.split(',')[0]}</p>
                  <p className="text-xs text-slate-400 truncate">{s.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={11} className="text-violet-500" /> Drag the pin to fine-tune your exact spot
        </p>
        <FallbackMap center={[location.lat, location.lng]} zoom={mapZoom} className={className} onLocationSelect={handleMapPin} />
      </div>

      {/* Exact address / flat details */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={13} className="text-violet-600" /> Flat / Floor / Building name
        </label>
        <input
          type="text" value={exactInput}
          onChange={(e) => {
            setExactInput(e.target.value);
            onLocationSelect({ lat: location.lat, lng: location.lng, address: fullAddr || e.target.value, exactAddress: e.target.value });
          }}
          placeholder="e.g. Flat 4B, 2nd Floor, Prestige Towers"
          className="w-full h-11 px-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all"
        />
        <p className="text-[11px] text-slate-400 font-mono px-1">
          📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          {!HAS_GMAPS && <span className="ml-2 text-orange-400 font-sans font-semibold">(Add Google Maps key for better accuracy)</span>}
        </p>
      </div>
    </div>
  );
};
