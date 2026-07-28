import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

interface MapContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  authFailed: boolean;
}

const MapContext = createContext<MapContextType>({
  isLoaded: false,
  loadError: undefined,
  authFailed: false,
});

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    // Intercept Google Maps Auth Failure (invalid/unactivated key)
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps API Auth Failure detected. Failing over to OpenStreetMap.");
      setAuthFailed(true);
    };
  }, []);

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE")
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    : (import.meta.env.VITE_FIREBASE_API_KEY || "");

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const effectiveIsLoaded = isLoaded && !authFailed;
  const effectiveError = loadError || (authFailed ? new Error("Google Maps Auth Failed") : undefined);

  return (
    <MapContext.Provider value={{ isLoaded: effectiveIsLoaded, loadError: effectiveError, authFailed }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => useContext(MapContext);
