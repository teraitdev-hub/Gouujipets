import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Crosshair, Building, Navigation, Loader2 } from 'lucide-react';
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
  defaultLocation = { lat: 12.9716, lng: 77.5946 }, // Bangalore default
  defaultAddress = "",
  className = "w-full h-72 rounded-2xl overflow-hidden relative shadow-md border border-slate-200"
}) => {
  const [location, setLocation] = useState(defaultLocation);
  const [address, setAddress] = useState(defaultAddress);
  const [exactAddress, setExactAddress] = useState(defaultAddress);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { authFailed } = useMap();

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE")
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    : (import.meta.env.VITE_FIREBASE_API_KEY || "");

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          const newAddr = response.results[0].formatted_address;
          setAddress(newAddr);
          setExactAddress(newAddr);
          onLocationSelect({ lat, lng, address: newAddr, exactAddress: newAddr });
          return;
        }
      }

      // Fallback: OpenStreetMap Nominatim reverse geocoding API
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        setAddress(formatted);
        setExactAddress(formatted);
        onLocationSelect({ lat, lng, address: formatted, exactAddress: formatted });
        return;
      }
    } catch (err) {
      console.warn("Reverse geocoding fallback:", err);
    }
    const fallbackAddr = `Selected Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setAddress(fallbackAddr);
    setExactAddress(fallbackAddr);
    onLocationSelect({ lat, lng, address: fallbackAddr, exactAddress: fallbackAddr });
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setIsLocating(false);
        fetchAddressFromCoords(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        alert("Could not fetch GPS location. Please select your pin manually on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchNominatim = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          setLocation({ lat, lng });
          setAddress(first.display_name);
          setExactAddress(first.display_name);
          onLocationSelect({ lat, lng, address: first.display_name, exactAddress: first.display_name });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setLocation({ lat, lng });
      fetchAddressFromCoords(lat, lng);
    }
  };

  const handlePlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLocation({ lat, lng });
        const newAddress = place.formatted_address || place.name || "Selected Location";
        setAddress(newAddress);
        setExactAddress(newAddress);
        onLocationSelect({ lat, lng, address: newAddress, exactAddress: newAddress });
      }
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Live GPS & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {isLoaded && !authFailed && !loadError ? (
          <div className="flex-1 relative z-10">
            <Autocomplete onLoad={(ac) => setAutocomplete(ac)} onPlaceChanged={handlePlaceChanged}>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search city, area, or street name..."
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
                />
              </div>
            </Autocomplete>
          </div>
        ) : (
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchNominatim(searchQuery); } }}
              placeholder="Type area/city and press Enter..."
              className="w-full h-11 pl-10 pr-20 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 transition-all shadow-sm"
            />
            <button
              type="button"
              onClick={() => handleSearchNominatim(searchQuery)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isLocating}
          className="h-11 px-4 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          {isLocating ? <Loader2 size={16} className="animate-spin text-violet-600" /> : <Navigation size={16} className="text-violet-600" />}
          {isLocating ? "Locating..." : "Detect My Live GPS"}
        </button>
      </div>

      {/* Interactive Map Box */}
      <div className={className}>
        {loadError || authFailed || !isLoaded ? (
          <FallbackMap
            center={[location.lat, location.lng]}
            zoom={14}
            className="w-full h-full"
            onLocationSelect={(lat, lng) => {
              setLocation({ lat, lng });
              fetchAddressFromCoords(lat, lng);
            }}
          />
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={location}
            zoom={15}
            onClick={handleMapClick}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            <Marker 
              position={location} 
              draggable={true} 
              onDragEnd={(e) => {
                if (e.latLng) {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  setLocation({ lat, lng });
                  fetchAddressFromCoords(lat, lng);
                }
              }} 
            />
          </GoogleMap>
        )}
      </div>

      {/* Exact Street Address Text Input & Display */}
      <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building size={14} className="text-violet-600" /> Exact Building / Flat No / Street Address
        </label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-3 text-violet-600" />
          <textarea
            value={exactAddress}
            onChange={(e) => {
              setExactAddress(e.target.value);
              onLocationSelect({ lat: location.lat, lng: location.lng, address: address || e.target.value, exactAddress: e.target.value });
            }}
            placeholder="e.g. Flat 402, Royal Palms, 100ft Road, Indiranagar, Bangalore"
            className="w-full h-20 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/20 focus:border-violet-500 outline-none resize-none transition-all"
            required
          />
        </div>
        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <span>📍 Pin Coords:</span> <span className="font-bold text-violet-700">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
        </p>
      </div>
    </div>
  );
};
