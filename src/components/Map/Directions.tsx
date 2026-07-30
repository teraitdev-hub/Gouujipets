import { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface DirectionsProps {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  onRouteFetch?: (result: google.maps.DirectionsResult) => void;
}

export const Directions = ({ origin, destination, onRouteFetch }: DirectionsProps) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!routesLib || !map) return;
    setDirectionsService(new routesLib.DirectionsService());
    setDirectionsRenderer(new routesLib.DirectionsRenderer({
      map,
      polylineOptions: {
        strokeColor: '#9333ea',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    }));
  }, [routesLib, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin) return;

    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          if (onRouteFetch) onRouteFetch(result);
        }
      }
    );
  }, [directionsService, directionsRenderer, origin, destination]);

  return null;
};
