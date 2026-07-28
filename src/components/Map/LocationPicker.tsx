import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useMap } from '../../context/MapContext';
import { MapPin, Search, Crosshair, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  height?: string;
}

const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // Center of India

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
  initialLocation, 
  onLocationSelect,
  height = "400px" 
}) => {
  const { isLoaded, loadError } = useMap();
  const [mapCenter, setMapCenter] = useState(initialLocation || defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(initialLocation || defaultCenter);
  const [address, setAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const newPos = { lat, lng };
        
        setMapCenter(newPos);
        setMarkerPosition(newPos);
        setAddress(place.formatted_address || place.name || "");
        onLocationSelect({ lat, lng, address: place.formatted_address || place.name || "" });
      }
    }
  };

  const handleGeocode = useCallback((lat: number, lng: number) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const formatted = results[0].formatted_address;
        setAddress(formatted);
        onLocationSelect({ lat, lng, address: formatted });
      } else {
        const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAddress(fallback);
        onLocationSelect({ lat, lng, address: fallback });
      }
    });
  }, [onLocationSelect]);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      handleGeocode(lat, lng);
    }
  }, [handleGeocode]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos = { lat, lng };
        setMapCenter(newPos);
        setMarkerPosition(newPos);
        handleGeocode(lat, lng);
        setIsLocating(false);
      },
      async (error) => {
        try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          if (data.latitude && data.longitude) {
            const newPos = { lat: data.latitude, lng: data.longitude };
            setMapCenter(newPos);
            setMarkerPosition(newPos);
            handleGeocode(data.latitude, data.longitude);
            setIsLocating(false);
            return;
          }
        } catch (fallbackErr) {
          console.error("IP fallback failed:", fallbackErr);
        }
        console.error("Error getting location:", error);
        setIsLocating(false);
        alert("Unable to retrieve your location. Please check your browser permissions.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  if (loadError) return <div className="p-4 text-red-500 bg-red-50 rounded-xl">Error loading maps</div>;
  if (!isLoaded) return <div className="animate-pulse bg-gray-200 rounded-xl" style={{ height }}></div>;

  return (
    <div className="flex flex-col gap-4 relative w-full font-sans">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-md flex gap-2">
        <div className="flex-1">
          <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search location..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600/50 text-sm text-gray-800"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </Autocomplete>
        </div>

        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          title="Use My Current GPS Location"
          className="shrink-0 p-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all flex items-center justify-center cursor-pointer border border-purple-400 active:scale-95"
        >
          {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden shadow-inner border border-gray-200 relative" style={{ height }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={initialLocation ? 15 : 12}
          onClick={onMapClick}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker 
            position={markerPosition} 
            draggable={true}
            onDragEnd={(e) => {
              if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setMarkerPosition({ lat, lng });
                handleGeocode(lat, lng);
              }
            }}
            animation={window.google.maps.Animation.DROP}
          />
        </GoogleMap>
      </div>

      {address && (
        <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-purple-900">
          <MapPin size={16} className="text-purple-600 shrink-0" />
          <span className="truncate">Selected Location: {address}</span>
        </div>
      )}
    </div>
  );
};

