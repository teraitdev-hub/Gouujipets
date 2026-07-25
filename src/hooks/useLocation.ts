import { useState, useCallback } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

export const useLocation = () => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(`Unable to retrieve your location: ${err.message}`);
        setIsLoading(false);
        // Fallback to IP based location could be implemented here via an external API
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const calculateDistance = async (origin: Coordinates, destination: Coordinates): Promise<{ distanceText: string; durationText: string; distanceValue: number } | null> => {
    if (!window.google) return null;
    
    const service = new window.google.maps.DistanceMatrixService();
    
    try {
      const response = await service.getDistanceMatrix({
        origins: [new window.google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [new window.google.maps.LatLng(destination.lat, destination.lng)],
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      if (response.rows[0].elements[0].status === 'OK') {
        const element = response.rows[0].elements[0];
        return {
          distanceText: element.distance.text,
          durationText: element.duration.text,
          distanceValue: element.distance.value // in meters
        };
      }
      return null;
    } catch (err) {
      console.error("Error calculating distance:", err);
      return null;
    }
  };

  return {
    currentLocation,
    error,
    isLoading,
    requestLocation,
    calculateDistance
  };
};
