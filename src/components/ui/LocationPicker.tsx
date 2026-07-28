import React, { useState, useRef } from 'react';
import { MapPin, Search, Navigation, Loader2, Building2, CheckCircle2, AlertCircle, ShieldAlert, Info, RefreshCw } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; exactAddress?: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultAddress?: string;
  className?: string;
}

type GpsStatus = 'idle' | 'locating' | 'success' | 'denied' | 'unavailable' | 'timeout';
type SearchStatus = 'idle' | 'searching' | 'success' | 'error';

// Nominatim reverse geocode: coords → address string
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
  } catch (e) { /* silent */ }
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Nominatim forward geocode: address → { lat, lng, display_name }
async function nominatimForward(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
      }
    }
  } catch (e) { /* silent */ }
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  defaultLocation = { lat: 12.9716, lng: 77.5946 },
  defaultAddress = '',
  className = 'w-full h-72 rounded-2xl overflow-hidden relative shadow-md border border-slate-200',
}) => {
  const [location, setLocation] = useState(defaultLocation);
  const [manualInput, setManualInput] = useState(defaultAddress);
  const [exactAddress, setExactAddress] = useState(defaultAddress);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Update everything when a lat/lng is chosen ──
  const applyCoords = async (lat: number, lng: number, knownAddress?: string) => {
    setLocation({ lat, lng });
    const addr = knownAddress ?? await nominatimReverse(lat, lng);
    setManualInput(addr);
    setExactAddress(addr);
    onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
  };

  // ── Forward search: address string → map pin ──
  const handleSearch = async () => {
    const q = manualInput.trim();
    if (!q) return;
    setSearchStatus('searching');
    const result = await nominatimForward(q);
    if (result) {
      await applyCoords(result.lat, result.lng, result.display);
      setSearchStatus('success');
    } else {
      setSearchStatus('error');
    }
  };

  // ── Live GPS ──
  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return; }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await applyCoords(lat, lng);
        setGpsStatus('success');
        setSearchStatus('success');
        setTimeout(() => setGpsStatus('idle'), 4000);
      },
      (err) => {
        if (err.code === 1) setGpsStatus('denied');
        else if (err.code === 2) setGpsStatus('unavailable');
        else setGpsStatus('timeout');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // ── Map pin clicked / dragged ──
  const handleMapPin = async (lat: number, lng: number) => {
    await applyCoords(lat, lng);
    setSearchStatus('success');
  };

  return (
    <div className="space-y-4 font-sans">

      {/* ─── 1. Address search bar ─── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Search size={14} className="text-violet-600" />
          Search address or area name
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={manualInput}
              onChange={(e) => { setManualInput(e.target.value); setSearchStatus('idle'); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="e.g. Indiranagar, Bangalore  or  Connaught Place, Delhi"
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchStatus === 'searching'}
            className="h-11 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow transition-colors"
          >
            {searchStatus === 'searching'
              ? <><Loader2 size={15} className="animate-spin" /> Searching...</>
              : <><Search size={15} /> Find on Map</>}
          </button>
        </div>

        {/* search feedback */}
        {searchStatus === 'success' && (
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> Location found and pinned on map!
          </p>
        )}
        {searchStatus === 'error' && (
          <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> Could not find this address. Try a more specific area name or click the map.
          </p>
        )}
      </div>

      {/* ─── 2. Live GPS button ─── */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGPS}
          disabled={gpsStatus === 'locating'}
          className={`w-full h-11 border font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
            gpsStatus === 'success'   ? 'bg-green-50 border-green-300 text-green-700' :
            gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout'
                                      ? 'bg-orange-50 border-orange-300 text-orange-700' :
            gpsStatus === 'locating'  ? 'bg-violet-100 border-violet-300 text-violet-700' :
                                        'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700'
          }`}
        >
          {gpsStatus === 'locating'   && <Loader2 size={16} className="animate-spin" />}
          {gpsStatus === 'success'    && <CheckCircle2 size={16} />}
          {(gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout') && <RefreshCw size={16} />}
          {gpsStatus === 'idle'       && <Navigation size={16} />}

          {gpsStatus === 'idle'       ? '📡 Use My Current Live GPS Location' :
           gpsStatus === 'locating'   ? 'Detecting GPS... please wait' :
           gpsStatus === 'success'    ? '✅ GPS Location Detected — pin & address updated!' :
           gpsStatus === 'denied'     ? 'Location Blocked — Tap to retry after enabling' :
           gpsStatus === 'unavailable'? 'GPS Unavailable — Tap to retry' :
                                        'GPS Timed Out — Tap to retry'}
        </button>

        {/* GPS error guidance */}
        {gpsStatus === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <ShieldAlert size={13} /> Location permission blocked
            </p>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              <strong>How to enable:</strong> Click the 🔒 lock icon in the browser address bar → <em>Site settings</em> → <em>Location</em> → change to <strong>Allow</strong>, then refresh the page and try again.
            </p>
            <p className="text-xs text-amber-600 font-semibold mt-1">
              Or just type your area/address in the search box above — it works without GPS.
            </p>
          </div>
        )}
        {(gpsStatus === 'unavailable' || gpsStatus === 'timeout') && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Info size={13} /> GPS signal not available right now
            </p>
            <p className="text-xs text-blue-600 font-medium mt-0.5 leading-relaxed">
              This often happens on desktops or in areas with weak signal. Use the <strong>address search</strong> above or <strong>click anywhere on the map</strong> to set your location.
            </p>
          </div>
        )}
      </div>

      {/* ─── 3. Interactive Leaflet Map (no API key needed) ─── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={12} className="text-violet-500" />
          Click on map or drag the pin to set exact location
        </p>
        <FallbackMap
          center={[location.lat, location.lng]}
          zoom={15}
          className={className}
          onLocationSelect={handleMapPin}
        />
      </div>

      {/* ─── 4. Editable exact address field ─── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Exact Flat / Building / Landmark (editable)
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
              // Try to geocode whatever is typed here too
              const result = await nominatimForward(val);
              if (result) {
                setLocation({ lat: result.lat, lng: result.lng });
                setManualInput(result.display);
                setSearchStatus('success');
                onLocationSelect({ lat: result.lat, lng: result.lng, address: result.display, exactAddress: val });
              }
            }
          }}
          placeholder="e.g. Flat 4B, Prestige Towers, MG Road, Bengaluru – 560001"
          className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 outline-none resize-none transition-all"
        />

        {/* Live coordinate display */}
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            📍 GPS Coordinates:
            <span className="text-violet-700 font-bold ml-1 font-mono">
              {location.lat.toFixed(6)},&nbsp;{location.lng.toFixed(6)}
            </span>
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
