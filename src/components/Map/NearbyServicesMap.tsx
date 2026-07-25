import React, { useMemo } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { useMap } from '../../context/MapContext';
import type { PartnerProfile } from '../../types/partner';

interface NearbyServicesMapProps {
  userLocation: { lat: number; lng: number };
  radiusInKm: number;
  partners: PartnerProfile[];
  onMarkerClick: (partner: PartnerProfile) => void;
  height?: string;
}

export const NearbyServicesMap: React.FC<NearbyServicesMapProps> = ({
  userLocation,
  radiusInKm,
  partners,
  onMarkerClick,
  height = "500px"
}) => {
  const { isLoaded, loadError } = useMap();
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerProfile | null>(null);

  // Convert km to meters for the Circle radius
  const radiusInMeters = radiusInKm * 1000;

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ]
  }), []);

  if (loadError) return <div className="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100">Map failed to load</div>;
  if (!isLoaded) return <div className="w-full animate-pulse bg-gray-100 rounded-2xl" style={{ height }}></div>;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={userLocation}
        zoom={13}
        options={mapOptions}
      >
        {/* User Location Marker */}
        <Marker
          position={userLocation}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6", // Blue for user
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          }}
        />

        {/* Radius Circle */}
        <Circle
          center={userLocation}
          radius={radiusInMeters}
          options={{
            fillColor: "#3b82f6",
            fillOpacity: 0.1,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.5,
            strokeWeight: 1,
          }}
        />

        {/* Partner Markers */}
        {partners.map((partner) => (
          <Marker
            key={partner.uid}
            position={{ lat: partner.latitude, lng: partner.longitude }}
            onClick={() => {
              setSelectedPartner(partner);
              onMarkerClick(partner);
            }}
            animation={window.google.maps.Animation.DROP}
            icon={{
              url: `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.businessName)}&background=random&color=fff&rounded=true&size=40`,
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        ))}

        {/* Info Window for Selected Partner */}
        {selectedPartner && (
          <InfoWindow
            position={{ lat: selectedPartner.latitude, lng: selectedPartner.longitude }}
            onCloseClick={() => setSelectedPartner(null)}
          >
            <div className="p-2 max-w-[200px]">
              <h3 className="font-semibold text-gray-800">{selectedPartner.businessName}</h3>
              <p className="text-sm text-gray-500 capitalize">{selectedPartner.partnerType}</p>
              <div className="mt-2 flex items-center text-sm text-yellow-500">
                ★ {selectedPartner.rating.toFixed(1)} ({selectedPartner.reviewCount})
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};
