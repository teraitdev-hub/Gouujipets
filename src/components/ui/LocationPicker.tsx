import React, { useState, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Navigation, Loader2, Building2, CheckCircle2, AlertCircle, Info, ShieldAlert, RefreshCw } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';
import { useMap } from '../../context/MapContext';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; exactAddress?: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultAddress?: string;
  className?: string;
}

const libraries: any[] = ['places'];

type GpsStatus = 'idle' | 'locating' | 'success' | 'denied' | 'unavailable' | 'timeout';
type SearchStatus = 'idle' | 'searching' | 'success' | 'error';

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  defaultLocation = { lat: 12.9716, lng: 77.5946 },
  defaultAddress = '',
  className = 'w-full h-72 rounded-2xl overflow-hidden relative shadow-md border border-slate-200',
}) => {
  const [location, setLocation] = useState(defaultLocation);
  const [mapCenter, setMapCenter] = useState(defaultLocation);
  const [address, setAddress] = useState(defaultAddress);
  const [manualInput, setManualInput] = useState(defaultAddress);
  const [exactAddress, setExactAddress] = useState(defaultAddress);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<any>(null);

  const { authFailed } = useMap();

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY &&
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE'
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : import.meta.env.VITE_FIREBASE_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries });

  // ── Reverse geocode: coords → address ──
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const res = await geocoder.geocode({ location: { lat, lng } });
        if (res.results?.[0]) {
          const addr = res.results[0].formatted_address;
          setAddress(addr); setManualInput(addr); setExactAddress(addr);
          onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
          return;
        }
      }
      // Nominatim fallback
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(addr); setManualInput(addr); setExactAddress(addr);
        onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
        return;
      }
    } catch (e) { console.warn('Reverse geocode error:', e); }
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setAddress(fallback); setManualInput(fallback); setExactAddress(fallback);
    onLocationSelect({ lat, lng, address: fallback, exactAddress: exactAddress || fallback });
  };

  // ── Forward geocode: typed address → coords + map pin ──
  const forwardGeocode = async (query: string) => {
    if (!query.trim()) return;
    setSearchStatus('searching');
    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const res = await geocoder.geocode({ address: query });
        if (res.results?.[0]?.geometry?.location) {
          const lat = res.results[0].geometry.location.lat();
          const lng = res.results[0].geometry.location.lng();
          const addr = res.results[0].formatted_address;
          setLocation({ lat, lng }); setMapCenter({ lat, lng });
          setAddress(addr); setManualInput(addr); setExactAddress(addr);
          setSearchStatus('success');
          onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
          return;
        }
      }
      // Nominatim fallback
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const addr = data[0].display_name;
          setLocation({ lat, lng }); setMapCenter({ lat, lng });
          setAddress(addr); setManualInput(addr); setExactAddress(addr);
          setSearchStatus('success');
          onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
          return;
        }
      }
      setSearchStatus('error');
    } catch (e) { console.error(e); setSearchStatus('error'); }
  };

  // ── Live GPS ──
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng }); setMapCenter({ lat, lng });
        setGpsStatus('success');
        reverseGeocode(lat, lng);
        // Reset success status after 4s
        setTimeout(() => setGpsStatus('idle'), 4000);
      },
      (err) => {
        if (err.code === 1) setGpsStatus('denied');
        else if (err.code === 2) setGpsStatus('unavailable');
        else setGpsStatus('timeout');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Google Autocomplete place selected ──
  const handlePlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const addr = place.formatted_address || place.name || 'Selected Location';
        setLocation({ lat, lng }); setMapCenter({ lat, lng });
        setAddress(addr); setManualInput(addr); setExactAddress(addr);
        setSearchStatus('success');
        onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
      }
    }
  };

  const useFallback = loadError || authFailed || !isLoaded;

  return (
    <div className="space-y-4 font-sans">

      {/* ── 1. Address Search Input ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Enter Address / Location to Pin on Map
        </label>

        {useFallback ? (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); forwardGeocode(manualInput); }}}
                placeholder="e.g. Indiranagar, Bangalore or Connaught Place, Delhi"
                className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => forwardGeocode(manualInput)}
              disabled={searchStatus === 'searching'}
              className="h-11 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-sm transition-colors"
            >
              {searchStatus === 'searching' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {searchStatus === 'searching' ? 'Searching...' : 'Find on Map'}
            </button>
          </div>
        ) : (
          <Autocomplete onLoad={(ac) => setAutocomplete(ac)} onPlaceChanged={handlePlaceChanged}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); forwardGeocode(manualInput); }}}
                  placeholder="e.g. Indiranagar, Bangalore or Connaught Place, Delhi"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => forwardGeocode(manualInput)}
                disabled={searchStatus === 'searching'}
                className="h-11 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-sm transition-colors"
              >
                {searchStatus === 'searching' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {searchStatus === 'searching' ? 'Searching...' : 'Find on Map'}
              </button>
            </div>
          </Autocomplete>
        )}

        {/* Search status feedback */}
        {searchStatus === 'success' && (
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> Location pinned successfully on the map!
          </p>
        )}
        {searchStatus === 'error' && (
          <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> Address not found. Try a more specific search, or click directly on the map below.
          </p>
        )}
      </div>

      {/* ── 2. GPS Button + Status Messages ── */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={gpsStatus === 'locating'}
          className={`w-full h-11 border font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
            gpsStatus === 'success'
              ? 'bg-green-50 border-green-300 text-green-700'
              : gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout'
              ? 'bg-orange-50 border-orange-300 text-orange-700'
              : 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700'
          }`}
        >
          {gpsStatus === 'locating' && <Loader2 size={16} className="animate-spin" />}
          {gpsStatus === 'success' && <CheckCircle2 size={16} />}
          {(gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'timeout') && <RefreshCw size={16} />}
          {gpsStatus === 'idle' && <Navigation size={16} />}

          {gpsStatus === 'idle' && '📡 Detect My Live GPS Location'}
          {gpsStatus === 'locating' && 'Detecting your GPS, please wait...'}
          {gpsStatus === 'success' && '✅ GPS Location Detected!'}
          {gpsStatus === 'denied' && 'Location Permission Denied — Click to Retry'}
          {gpsStatus === 'unavailable' && 'GPS Unavailable — Click to Retry'}
          {gpsStatus === 'timeout' && 'GPS Timed Out — Click to Retry'}
        </button>

        {/* GPS error guidance */}
        {gpsStatus === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <ShieldAlert size={13} /> Location permission was denied by your browser
            </p>
            <p className="text-xs text-amber-700 font-medium">
              To enable GPS: Click the 🔒 lock icon in your browser's address bar → Site Settings → Location → Allow
            </p>
            <p className="text-xs text-amber-600 font-semibold">
              Alternatively, type your address in the search box above or click on the map to pin your location.
            </p>
          </div>
        )}
        {(gpsStatus === 'unavailable' || gpsStatus === 'timeout') && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Info size={13} /> GPS signal not available right now
            </p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              This can happen on desktop browsers or in areas with weak signal. Please type your address in the search box above or click the map below to pin your location manually.
            </p>
          </div>
        )}
      </div>

      {/* ── 3. Interactive Map ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={12} className="text-violet-500" />
          Click on map or drag pin to set exact location
        </p>
        <div className={className}>
          {useFallback ? (
            <FallbackMap
              center={[location.lat, location.lng]}
              zoom={14}
              className="w-full h-full"
              onLocationSelect={(lat, lng) => {
                setLocation({ lat, lng });
                reverseGeocode(lat, lng);
                setSearchStatus('success');
              }}
            />
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={15}
              onClick={(e) => {
                if (e.latLng) {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  setLocation({ lat, lng });
                  reverseGeocode(lat, lng);
                  setSearchStatus('success');
                }
              }}
              onLoad={(map) => { mapRef.current = map; }}
              options={{ disableDefaultUI: true, zoomControl: true }}
            >
              <Marker
                position={location}
                draggable={true}
                onDragEnd={(e) => {
                  if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    setLocation({ lat, lng });
                    reverseGeocode(lat, lng);
                    setSearchStatus('success');
                  }
                }}
              />
            </GoogleMap>
          )}
        </div>
      </div>

      {/* ── 4. Exact Building Address (editable, syncs with map) ── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Exact Flat / Building / Landmark
        </label>
        <div className="relative">
          <textarea
            value={exactAddress}
            onChange={(e) => {
              setExactAddress(e.target.value);
              onLocationSelect({
                lat: location.lat,
                lng: location.lng,
                address: address || e.target.value,
                exactAddress: e.target.value,
              });
            }}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== address) {
                forwardGeocode(e.target.value);
              }
            }}
            placeholder="e.g. Flat 4B, Prestige Towers, MG Road, Bengaluru – 560001"
            className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 outline-none resize-none transition-all"
          />
        </div>
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
            📍 Coordinates:
            <span className="text-violet-700 font-bold ml-1">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
          </p>
          {address && (
            <p className="text-[11px] text-green-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={11} /> Pinned
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
