import { Map as VisMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useMap } from '../context/MapContext';
import { useState } from 'react';
import { FallbackMap } from './Map/FallbackMap';

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
  center = [12.9716, 77.5946], // Default Bangalore
  zoom = 13,
  markers = [],
  className = "h-[400px] w-full rounded-2xl shadow-lg border border-slate-200 z-0"
}: MapProps) => {
  const { isLoaded, loadError, authFailed } = useMap();
  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  // If Google Maps fail or auth errors out, render clean interactive FallbackMap (OpenStreetMap)
  if (loadError || authFailed) {
    return <FallbackMap center={center} zoom={zoom} markers={markers} className={className} />;
  }

  if (!isLoaded) {
    return <FallbackMap center={center} zoom={zoom} markers={markers} className={className} />;
  }

  const centerLatLng = { lat: center[0], lng: center[1] };

  return (
    <div className={className}>
      <VisMap
        mapId="PUBLIC_HOME_MAP"
        defaultCenter={centerLatLng}
        defaultZoom={zoom}
        disableDefaultUI={false}
        gestureHandling="cooperative"
      >
        {markers.map((marker, idx) => {
          const position = { lat: marker.position[0], lng: marker.position[1] };
          return (
            <AdvancedMarker 
              key={idx} 
              position={position}
              onClick={() => setActiveMarker(idx)}
            >
              {activeMarker === idx && marker.popupText && (
                <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                  <div className="p-1 max-w-[200px]">
                    <p className="text-sm font-medium text-gray-800">{marker.popupText}</p>
                  </div>
                </InfoWindow>
              )}
            </AdvancedMarker>
          );
        })}
      </VisMap>
    </div>
  );
};
