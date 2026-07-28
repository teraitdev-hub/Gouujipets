import React, { useState, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Navigation, Loader2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';
import { useMap } from '../../context/MapContext';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; exactAddress?: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultAddress?: string;
  className?: string;
}

const libraries: any[] = ['places'];

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
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<any>(null);

  const { authFailed } = useMap();

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY &&
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE'
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : import.meta.env.VITE_FIREBASE_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  // Reverse geocode: coords → address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const res = await geocoder.geocode({ location: { lat, lng } });
        if (res.results?.[0]) {
          const addr = res.results[0].formatted_address;
          setAddress(addr);
          setManualInput(addr);
          setExactAddress(addr);
          onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
          return;
        }
      }
      // Fallback: Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(addr);
        setManualInput(addr);
        setExactAddress(addr);
        onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
        return;
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setAddress(fallback);
    setManualInput(fallback);
    setExactAddress(fallback);
    onLocationSelect({ lat, lng, address: fallback, exactAddress: exactAddress || fallback });
  };

  // Forward geocode: typed address → coords + map pin
  const forwardGeocode = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchStatus('idle');
    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const res = await geocoder.geocode({ address: query });
        if (res.results?.[0]?.geometry?.location) {
          const lat = res.results[0].geometry.location.lat();
          const lng = res.results[0].geometry.location.lng();
          const addr = res.results[0].formatted_address;
          setLocation({ lat, lng });
          setMapCenter({ lat, lng });
          setAddress(addr);
          setManualInput(addr);
          setExactAddress(addr);
          setSearchStatus('success');
          onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
          setIsSearching(false);
          return;
        }
      }
      // Fallback: Nominatim forward search
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const addr = data[0].display_name;
          setLocation({ lat, lng });
          setMapCenter({ lat, lng });
          setAddress(addr);
          setManualInput(addr);
          setExactAddress(addr);
          setSearchStatus('success');
          onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
          setIsSearching(false);
          return;
        }
      }
      setSearchStatus('error');
    } catch (e) {
      console.error('Forward geocode error:', e);
      setSearchStatus('error');
    }
    setIsSearching(false);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        setMapCenter({ lat, lng });
        setIsLocating(false);
        reverseGeocode(lat, lng);
      },
      () => {
        setIsLocating(false);
        alert('Could not fetch GPS. Please pin manually on map or type your address below.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setLocation({ lat, lng });
      reverseGeocode(lat, lng);
    }
  };

  const handlePlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const addr = place.formatted_address || place.name || 'Selected Location';
        setLocation({ lat, lng });
        setMapCenter({ lat, lng });
        setAddress(addr);
        setManualInput(addr);
        setExactAddress(addr);
        setSearchStatus('success');
        onLocationSelect({ lat, lng, address: addr, exactAddress: addr });
      }
    }
  };

  const useFallback = loadError || authFailed || !isLoaded;

  return (
    <div className="space-y-4 font-sans">

      {/* ── Row 1: Manual Address Entry (always visible) ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Enter Full Address / Location Name
        </label>

        <div className="relative">
          {useFallback ? (
            /* Plain text input with Search button for OSM fallback */
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); forwardGeocode(manualInput); }
                  }}
                  placeholder="e.g. Indiranagar, Bangalore or 100ft Road, Bengaluru"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => forwardGeocode(manualInput)}
                disabled={isSearching}
                className="h-11 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-sm transition-colors"
              >
                {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {isSearching ? 'Searching...' : 'Find on Map'}
              </button>
            </div>
          ) : (
            /* Google Places Autocomplete */
            <Autocomplete onLoad={(ac) => setAutocomplete(ac)} onPlaceChanged={handlePlaceChanged}>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); forwardGeocode(manualInput); }
                  }}
                  placeholder="e.g. Indiranagar, Bangalore or 100ft Road, Bengaluru"
                  className="w-full h-11 pl-10 pr-36 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => forwardGeocode(manualInput)}
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  {isSearching ? 'Searching...' : 'Find on Map'}
                </button>
              </div>
            </Autocomplete>
          )}
        </div>

        {/* Search status feedback */}
        {searchStatus === 'success' && (
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
            <CheckCircle2 size={13} /> Location found & map pin updated!
          </p>
        )}
        {searchStatus === 'error' && (
          <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertCircle size={13} /> Address not found. Try a different search or pin manually.
          </p>
        )}
      </div>

      {/* ── Row 2: GPS Button ── */}
      <button
        type="button"
        onClick={handleDetectGPS}
        disabled={isLocating}
        className="w-full h-11 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
      >
        {isLocating ? (
          <Loader2 size={16} className="animate-spin text-violet-600" />
        ) : (
          <Navigation size={16} className="text-violet-600" />
        )}
        {isLocating ? 'Detecting your GPS location...' : '📡 Use My Current Live Location (GPS)'}
      </button>

      {/* ── Row 3: Interactive Map ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <MapPin size={12} className="text-violet-500" />
          Or click / drag the pin on map to set exact location
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
              }}
            />
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={15}
              onClick={handleMapClick}
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
                  }
                }}
              />
            </GoogleMap>
          )}
        </div>
      </div>

      {/* ── Row 4: Exact Building Address (always editable, syncs with map) ── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={14} className="text-violet-600" />
          Exact Building / Flat / Street Details
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
              // If user types a full address and tabs away, try to geocode it
              if (e.target.value && e.target.value !== address) {
                forwardGeocode(e.target.value);
              }
            }}
            placeholder="e.g. Flat 4B, Prestige Towers, MG Road, Bengaluru – 560001"
            className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 outline-none resize-none transition-all"
          />
        </div>

        {/* Coordinates display */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
            📍 Coordinates:
            <span className="text-violet-700 font-bold">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
          </p>
          {address && (
            <p className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={11} /> Pinned
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
