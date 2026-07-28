import React, { useState } from 'react';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';
import { useMap } from '../../context/MapContext';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number, lng: number, address: string }) => void;
  defaultLocation?: { lat: number, lng: number };
  className?: string;
}

const libraries: any[] = ['places'];

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onLocationSelect, 
  defaultLocation = { lat: 20.5937, lng: 78.9629 }, // Default to India
  className = "w-full h-64 rounded-xl overflow-hidden relative"
}) => {
  const [location, setLocation] = useState(defaultLocation);
  const [address, setAddress] = useState("");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { authFailed } = useMap();

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE")
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    : (import.meta.env.VITE_FIREBASE_API_KEY || "");

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          const newAddress = response.results[0].formatted_address;
          setAddress(newAddress);
          onLocationSelect({ lat, lng, address: newAddress });
          return;
        }
      }
      onLocationSelect({ lat, lng, address: `Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}` });
    } catch (e) {
      onLocationSelect({ lat, lng, address: `Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}` });
    }
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
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLocation({ lat, lng });
        const newAddress = place.formatted_address || place.name || "Selected Location";
        setAddress(newAddress);
        onLocationSelect({ lat, lng, address: newAddress });
      }
    }
  };

  if (loadError || authFailed || !isLoaded) {
    return (
      <div className="space-y-3">
        <FallbackMap 
          center={[location.lat, location.lng]} 
          zoom={14} 
          className={className} 
          onLocationSelect={(lat, lng) => {
            setLocation({ lat, lng });
            onLocationSelect({ lat, lng, address: `Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
          }} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative z-10">
        <Autocomplete
          onLoad={(ac) => setAutocomplete(ac)}
          onPlaceChanged={handlePlaceChanged}
        >
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search for a location..."
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all shadow-sm"
            />
          </div>
        </Autocomplete>
      </div>
      
      <div className={`border border-slate-200 bg-slate-50 ${className}`}>
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
                reverseGeocode(lat, lng);
              }
            }} 
          />
        </GoogleMap>
      </div>
      
      {address && (
        <div className="flex items-start gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
          <MapPin size={16} className="text-violet-600 mt-0.5 shrink-0" />
          <p className="text-xs font-semibold text-violet-900">{address}</p>
        </div>
      )}
    </div>
  );
};
