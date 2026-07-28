import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Navigation, Loader2, Building2, CheckCircle2, AlertCircle, ShieldAlert, Info, RefreshCw, Target, ArrowRight } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; exactAddress?: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultAddress?: string;
  className?: string;
}

type GpsStatus = 'idle' | 'locating' | 'success' | 'denied' | 'unavailable' | 'timeout';
type SearchStatus = 'idle' | 'searching' | 'success' | 'error';

async function nominatimReverse(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const d = await res.json();
      return d.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  } catch (_) {}
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

async function nominatimForward(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    }
  } catch (_) {}
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  defaultLocation = { lat: 12.9716, lng: 77.5946 },
  defaultAddress = '',
  className = 'w-full h-72 rounded-2xl overflow-hidden relative shadow-md border border-slate-200',
}) => {
  const [location, setLocation] = useState(defaultLocation);
  const [mapZoom, setMapZoom] = useState(13);
  const [searchInput, setSearchInput] = useState(defaultAddress);
  const [exactInput, setExactInput] = useState(defaultAddress);
  const [pinnedAddress, setPinnedAddress] = useState(defaultAddress);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [exactSearchStatus, setExactSearchStatus] = useState<SearchStatus>('idle');
  const watchIdRef = useRef<number | null>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const applyCoords = async (lat: number, lng: number, zoom: number, knownAddress?: string) => {
    setLocation({ lat, lng });
    setMapZoom(zoom);
    const addr = knownAddress ?? await nominatimReverse(lat, lng);
    setPinnedAddress(addr);
    setSearchInput(addr);
    setExactInput(addr);
    onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
  };

  // ── Main search input with debounced auto-search ──
  const handleSearchInputChange = (val: string) => {
    setSearchInput(val);
    setSearchStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length > 4) {
      debounceRef.current = setTimeout(async () => {
        setSearchStatus('searching');
        const result = await nominatimForward(val);
        if (result) {
          await applyCoords(result.lat, result.lng, 16, result.display);
          setSearchStatus('success');
        } else {
          setSearchStatus('error');
        }
      }, 900); // wait 900ms after user stops typing
    }
  };

  const handleSearchNow = async () => {
    const q = searchInput.trim();
    if (!q) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchStatus('searching');
    const result = await nominatimForward(q);
    if (result) {
      await applyCoords(result.lat, result.lng, 16, result.display);
      setSearchStatus('success');
    } else {
      setSearchStatus('error');
    }
  };

  // ── Exact address field with its own search button ──
  const handleExactAddressSearch = async () => {
    const q = exactInput.trim();
    if (!q) return;
    setExactSearchStatus('searching');
    const result = await nominatimForward(q);
    if (result) {
      await applyCoords(result.lat, result.lng, 17, result.display);
      setExactSearchStatus('success');
    } else {
      // Even if not geocodable, still save the text
      onLocationSelect({ lat: location.lat, lng: location.lng, address: pinnedAddress || exactInput, exactAddress: exactInput });
      setExactSearchStatus('error');
    }
  };

  // ── GPS watchPosition ──
  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return; }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setGpsStatus('locating'); setGpsAccuracy(null);

    const giveUpTimer = setTimeout(() => {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      setGpsStatus(prev => prev === 'locating' ? 'timeout' : prev);
    }, 20000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        setGpsStatus('success');
        await applyCoords(lat, lng, accuracy < 50 ? 18 : accuracy < 200 ? 16 : 14);
        if (accuracy <= 50) {
          clearTimeout(giveUpTimer);
          if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        }
      },
      (err) => {
        clearTimeout(giveUpTimer);
        if (err.code === 1) setGpsStatus('denied');
        else if (err.code === 2) setGpsStatus('unavailable');
        else setGpsStatus('timeout');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleMapPin = async (lat: number, lng: number) => {
    await applyCoords(lat, lng, mapZoom);
    setSearchStatus('success');
  };

  const accuracyColor = !gpsAccuracy ? '' : gpsAccuracy <= 20 ? 'text-green-600' : gpsAccuracy <= 100 ? 'text-blue-600' : 'text-orange-500';

  return (
    <div className="space-y-4 font-sans">

      {/* ─── 1. Address Search ─── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Search size={14} className="text-violet-600" />
          Type your address — map updates automatically
        </label>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none" />
            {searchStatus === 'searching' && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />
            )}
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchNow(); } }}
              placeholder="Start typing — e.g. MG Road Bangalore, Bandra Mumbai…"
              className="w-full h-12 pl-10 pr-10 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all shadow-sm"
            />
          </div>
          <button
            type="button" onClick={handleSearchNow}
            disabled={searchStatus === 'searching'}
            className="h-12 px-5 bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-md transition-all"
          >
            {searchStatus === 'searching' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span className="hidden sm:inline">Find</span>
          </button>
        </div>

        {searchStatus === 'success' && (
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> Location found and pinned on map!
          </p>
        )}
        {searchStatus === 'error' && (
          <p className="text-xs font-semibold text-orange-600 flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> Not found. Try a simpler name like "Indiranagar" or your city name.
          </p>
        )}
      </div>

      {/* ─── 2. GPS ─── */}
      <div className="space-y-2">
        <button
          type="button" onClick={handleGPS}
          disabled={gpsStatus === 'locating'}
          className={`w-full h-12 border-2 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
            gpsStatus === 'success'    ? 'bg-green-50 border-green-400 text-green-700' :
            gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout'
                                       ? 'bg-orange-50 border-orange-300 text-orange-700' :
            gpsStatus === 'locating'   ? 'bg-violet-100 border-violet-300 text-violet-700 cursor-wait' :
                                         'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700'
          }`}
        >
          {gpsStatus === 'locating'  && <Loader2 size={17} className="animate-spin" />}
          {gpsStatus === 'success'   && <Target size={17} />}
          {(gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout') && <RefreshCw size={17} />}
          {gpsStatus === 'idle'      && <Navigation size={17} />}
          <span>
            {gpsStatus === 'idle'        && '📡 Use My Live GPS Location'}
            {gpsStatus === 'locating'    && 'Getting your exact location…'}
            {gpsStatus === 'success'     && (gpsAccuracy ? `✅ GPS Locked ±${gpsAccuracy}m` : '✅ GPS Location Set!')}
            {gpsStatus === 'denied'      && 'Location Blocked — Tap to retry'}
            {gpsStatus === 'unavailable' && 'GPS Unavailable — Tap to retry'}
            {gpsStatus === 'timeout'     && 'GPS Timed Out — Tap to retry'}
          </span>
        </button>

        {gpsStatus === 'success' && gpsAccuracy && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${gpsAccuracy <= 20 ? 'bg-green-500' : gpsAccuracy <= 100 ? 'bg-blue-500' : 'bg-orange-400'}`}
                style={{ width: `${Math.max(10, Math.min(100, 100 - (gpsAccuracy / 8)))}%` }} />
            </div>
            <span className={`text-[11px] font-bold shrink-0 ${accuracyColor}`}>
              {gpsAccuracy <= 20 ? '🎯 Precise' : gpsAccuracy <= 100 ? '👍 Good' : '⚠️ Low — drag pin to adjust'}
            </span>
          </div>
        )}

        {gpsStatus === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
              <ShieldAlert size={12} /> Permission denied
            </p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Tap the 🔒 lock in your browser bar → <strong>Site Settings</strong> → <strong>Location → Allow</strong>, then refresh. Or just type your address above.
            </p>
          </div>
        )}
        {(gpsStatus === 'unavailable' || gpsStatus === 'timeout') && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-800 flex items-center gap-1"><Info size={12} /> Signal unavailable</p>
            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">Type your area in the search bar above or tap anywhere on the map to set location manually.</p>
          </div>
        )}
      </div>

      {/* ─── 3. Map ─── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={12} className="text-violet-500" />
          Tap map or drag the purple pin to fine-tune location
        </p>
        <FallbackMap
          center={[location.lat, location.lng]}
          zoom={mapZoom}
          className={className}
          onLocationSelect={handleMapPin}
        />
      </div>

      {/* ─── 4. Exact Address with its own SET button ─── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Exact Flat / Building / Landmark
        </label>

        <textarea
          value={exactInput}
          onChange={(e) => {
            setExactInput(e.target.value);
            setExactSearchStatus('idle');
            onLocationSelect({ lat: location.lat, lng: location.lng, address: pinnedAddress || e.target.value, exactAddress: e.target.value });
          }}
          placeholder="e.g. Flat 4B, Prestige Tower, MG Road, Bengaluru – 560001"
          rows={2}
          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 outline-none resize-none transition-all"
        />

        <button
          type="button"
          onClick={handleExactAddressSearch}
          disabled={exactSearchStatus === 'searching' || !exactInput.trim()}
          className="w-full h-11 bg-slate-800 hover:bg-slate-900 active:scale-95 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow transition-all"
        >
          {exactSearchStatus === 'searching'
            ? <><Loader2 size={15} className="animate-spin" /> Finding location on map…</>
            : <><ArrowRight size={15} /> Set This Address on Map</>}
        </button>

        {exactSearchStatus === 'success' && (
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> Address pinned on map!
          </p>
        )}
        {exactSearchStatus === 'error' && (
          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Info size={13} /> Exact flat details saved — search the area name above to move the map pin.
          </p>
        )}

        {/* Coordinates */}
        <div className="flex items-center justify-between px-0.5 pt-0.5">
          <p className="text-[11px] text-slate-400 font-semibold">
            📍 <span className="font-mono text-violet-600 font-bold">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            {gpsAccuracy && gpsStatus === 'success' && <span className={`ml-2 ${accuracyColor}`}>(±{gpsAccuracy}m)</span>}
          </p>
          {pinnedAddress && <span className="text-[11px] text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={11} /> Pinned</span>}
        </div>
      </div>
    </div>
  );
};
