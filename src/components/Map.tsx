import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useMap } from '../context/MapContext';
import { useState } from 'react';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popupText?: string;
  }>;
  className?: string;
}

export const Map = ({ 
  center = [51.505, -0.09], // Default center
  zoom = 13,
  markers = [],
  className = "h-[400px] w-full rounded-xl shadow-lg border border-slate-200 z-0"
}: MapProps) => {
  const { isLoaded, loadError } = useMap();
  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  if (loadError) return <div className="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100">Map failed to load</div>;
  if (!isLoaded) return <div className={`${className} animate-pulse bg-gray-200`} />;

  const centerLatLng = { lat: center[0], lng: center[1] };

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
        center={centerLatLng}
        zoom={zoom}
        options={{
          disableDefaultUI: false,
          scrollwheel: false,
        }}
      >
        {markers.map((marker, idx) => {
          const position = { lat: marker.position[0], lng: marker.position[1] };
          return (
            <Marker 
              key={idx} 
              position={position}
              onClick={() => setActiveMarker(idx)}
              animation={window.google.maps.Animation.DROP}
            >
              {activeMarker === idx && marker.popupText && (
                <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                  <div className="p-1 max-w-[200px]">
                    <p className="text-sm font-medium text-gray-800">{marker.popupText}</p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
      </GoogleMap>
    </div>
  );
};

