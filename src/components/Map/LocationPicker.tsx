import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useMap } from '../../context/MapContext';
import { MapPin, Search } from 'lucide-react';

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

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      
      // Reverse Geocoding
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          setAddress(results[0].formatted_address);
          onLocationSelect({ lat, lng, address: results[0].formatted_address });
        } else {
          onLocationSelect({ lat, lng, address: `${lat}, ${lng}` });
        }
      });
    }
  }, [onLocationSelect]);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div className="animate-pulse bg-gray-200 rounded-xl" style={{ height }}></div>;

  return (
    <div className="flex flex-col gap-4 relative w-full">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-md">
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search location..."
              className="w-full pl-10 pr-4 py-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
              defaultValue={address}
            />
          </div>
        </Autocomplete>
      </div>

      <div className="rounded-xl overflow-hidden shadow-inner border border-gray-100" style={{ height }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={initialLocation ? 15 : 5}
          onClick={onMapClick}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker 
            position={markerPosition} 
            animation={window.google.maps.Animation.DROP}
          />
        </GoogleMap>
      </div>
    </div>
  );
};
