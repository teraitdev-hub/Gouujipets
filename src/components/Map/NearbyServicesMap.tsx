import React, { useMemo } from 'react';
import { Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
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

  if (loadError) return <div className="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100">Map failed to load</div>;
  if (!isLoaded) return <div className="w-full animate-pulse bg-gray-100 rounded-2xl" style={{ height }}></div>;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100">
      <Map
        mapId="NEARBY_SERVICES_MAP"
        style={{ width: '100%', height }}
        defaultCenter={userLocation}
        defaultZoom={13}
        disableDefaultUI={true}
        gestureHandling="cooperative"
      >
        {/* User Location Marker */}
        <AdvancedMarker
          position={userLocation}
        >
          <div className="w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md" />
        </AdvancedMarker>

        {/* Partner Markers */}
        {partners.map((partner) => (
          <AdvancedMarker
            key={partner.uid}
            position={{ lat: partner.latitude, lng: partner.longitude }}
            onClick={() => {
              setSelectedPartner(partner);
              onMarkerClick(partner);
            }}
          >
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(partner.businessName)}&background=random&color=fff&rounded=true&size=40`} 
              alt={partner.businessName}
              className="w-10 h-10 rounded-full shadow-lg border-2 border-white"
            />
          </AdvancedMarker>
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
      </Map>
    </div>
  );
};
