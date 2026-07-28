import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Navigation, Loader2, Building2, CheckCircle2, AlertCircle, ShieldAlert, Info, RefreshCw, Target } from 'lucide-react';
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
      const data = await res.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
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
  const [manualInput, setManualInput] = useState(defaultAddress);
  const [exactAddress, setExactAddress] = useState(defaultAddress);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const watchIdRef = useRef<number | null>(null);

  // Stop watching GPS on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const applyCoords = async (lat: number, lng: number, zoom: number, knownAddress?: string) => {
    setLocation({ lat, lng });
    setMapZoom(zoom);
    const addr = knownAddress ?? await nominatimReverse(lat, lng);
    setManualInput(addr);
    setExactAddress(addr);
    onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
  };

  const handleSearch = async () => {
    const q = manualInput.trim();
    if (!q) return;
    setSearchStatus('searching');
    const result = await nominatimForward(q);
    if (result) {
      await applyCoords(result.lat, result.lng, 16, result.display);
      setSearchStatus('success');
    } else {
      setSearchStatus('error');
    }
  };

  // Use watchPosition to keep upgrading accuracy until a good fix arrives
  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return; }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGpsStatus('locating');
    setGpsAccuracy(null);

    // Timeout after 20s if no good fix
    const giveUpTimer = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus(prev => prev === 'locating' ? 'timeout' : prev);
    }, 20000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));

        // Accept position immediately, but keep watching for better accuracy
        setGpsStatus('success');
        await applyCoords(lat, lng, accuracy < 100 ? 18 : accuracy < 500 ? 16 : 14);

        // Stop watching once we have a good-enough fix (<= 50m)
        if (accuracy <= 50) {
          clearTimeout(giveUpTimer);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
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

  const accuracyColor = gpsAccuracy === null ? '' : gpsAccuracy <= 20 ? 'text-green-600' : gpsAccuracy <= 100 ? 'text-blue-600' : 'text-orange-500';

  return (
    <div className="space-y-4 font-sans">

      {/* ─── 1. Address Search ─── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Search size={14} className="text-violet-600" />
          Search by address / area / landmark
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none" />
            <input
              type="text"
              value={manualInput}
              onChange={(e) => { setManualInput(e.target.value); setSearchStatus('idle'); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="e.g. Indiranagar Bangalore  or  Sector 18 Noida"
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
            />
          </div>
          <button
            type="button" onClick={handleSearch}
            disabled={searchStatus === 'searching'}
            className="h-11 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow transition-colors"
          >
            {searchStatus === 'searching' ? <><Loader2 size={15} className="animate-spin" /> Searching...</> : <><Search size={15} /> Find on Map</>}
          </button>
        </div>

        {searchStatus === 'success' && (
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> Location pinned on map!
          </p>
        )}
        {searchStatus === 'error' && (
          <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> Address not found. Try landmark name, city or area.
          </p>
        )}
      </div>

      {/* ─── 2. Live GPS Button ─── */}
      <div className="space-y-2">
        <button
          type="button" onClick={handleGPS}
          disabled={gpsStatus === 'locating'}
          className={`w-full h-12 border font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
            gpsStatus === 'success'    ? 'bg-green-50 border-green-300 text-green-700' :
            gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout'
                                       ? 'bg-orange-50 border-orange-300 text-orange-700' :
            gpsStatus === 'locating'   ? 'bg-violet-100 border-violet-300 text-violet-700 cursor-wait' :
                                         'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700'
          }`}
        >
          {gpsStatus === 'locating'  && <Loader2 size={17} className="animate-spin" />}
          {gpsStatus === 'success'   && <Target size={17} className="text-green-600" />}
          {(gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout') && <RefreshCw size={17} />}
          {gpsStatus === 'idle'      && <Navigation size={17} />}

          <span>
            {gpsStatus === 'idle'        && '📡 Detect My Exact Live GPS Location'}
            {gpsStatus === 'locating'    && 'Getting your precise GPS location…'}
            {gpsStatus === 'success'     && (gpsAccuracy !== null
              ? `✅ GPS locked — Accuracy ±${gpsAccuracy}m`
              : '✅ GPS Location Detected!')}
            {gpsStatus === 'denied'      && 'Permission Denied — Tap to retry after enabling'}
            {gpsStatus === 'unavailable' && 'GPS Unavailable — Tap to retry'}
            {gpsStatus === 'timeout'     && 'GPS Timed Out — Tap to retry'}
          </span>
        </button>

        {/* Accuracy indicator bar */}
        {gpsStatus === 'locating' && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <span className="text-[11px] text-violet-600 font-bold shrink-0">Acquiring signal…</span>
          </div>
        )}
        {gpsStatus === 'success' && gpsAccuracy !== null && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${gpsAccuracy <= 20 ? 'bg-green-500' : gpsAccuracy <= 100 ? 'bg-blue-500' : 'bg-orange-400'}`}
                style={{ width: `${Math.max(10, Math.min(100, 100 - (gpsAccuracy / 10)))}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold shrink-0 ${accuracyColor}`}>
              {gpsAccuracy <= 20 ? 'High precision' : gpsAccuracy <= 100 ? 'Good precision' : 'Low precision — drag pin to fine-tune'}
            </span>
          </div>
        )}

        {gpsStatus === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <ShieldAlert size={13} /> Browser blocked location access
            </p>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Click the 🔒 <strong>lock icon</strong> in your browser address bar → <em>Site Settings</em> → <em>Location</em> → set to <strong>Allow</strong> → refresh page.
            </p>
            <p className="text-xs text-amber-600 font-semibold">Alternatively, type your address in the search box above.</p>
          </div>
        )}
        {(gpsStatus === 'unavailable' || gpsStatus === 'timeout') && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Info size={13} /> GPS not available right now</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5 leading-relaxed">
              Desktop browsers use Wi-Fi or IP location which is less precise. On mobile, enable GPS in device settings for best results.
              You can also <strong>click any spot on the map</strong> below to set your location manually.
            </p>
          </div>
        )}
      </div>

      {/* ─── 3. Interactive Map ─── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={12} className="text-violet-500" />
          Click on map or drag the purple pin to fine-tune
        </p>
        <FallbackMap
          center={[location.lat, location.lng]}
          zoom={mapZoom}
          className={className}
          onLocationSelect={handleMapPin}
        />
      </div>

      {/* ─── 4. Exact address field ─── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Exact Flat / Building / Landmark (type or edit)
        </label>
        <textarea
          value={exactAddress}
          onChange={(e) => {
            setExactAddress(e.target.value);
            onLocationSelect({ lat: location.lat, lng: location.lng, address: e.target.value, exactAddress: e.target.value });
          }}
          onBlur={async (e) => {
            const val = e.target.value.trim();
            if (val && val !== manualInput) {
              const result = await nominatimForward(val);
              if (result) {
                setLocation({ lat: result.lat, lng: result.lng });
                setMapZoom(16);
                setManualInput(result.display);
                setSearchStatus('success');
                onLocationSelect({ lat: result.lat, lng: result.lng, address: result.display, exactAddress: val });
              }
            }
          }}
          placeholder="e.g. Flat 4B, Prestige Towers, MG Road, Bengaluru – 560001"
          className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 outline-none resize-none transition-all"
        />
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            📍 <span className="font-mono font-bold text-violet-700">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            {gpsAccuracy !== null && gpsStatus === 'success' && (
              <span className={`ml-2 font-bold ${accuracyColor}`}>(±{gpsAccuracy}m)</span>
            )}
          </p>
          {exactAddress && (
            <span className="text-[11px] text-green-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={11} /> Pinned
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
