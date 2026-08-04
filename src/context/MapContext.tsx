import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { APIProvider, useApiIsLoaded } from "@vis.gl/react-google-maps";

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

// A wrapper component to track loading state from vis.gl
const MapStateTracker = ({ children, authFailed }: { children: ReactNode; authFailed: boolean }) => {
  const isApiLoaded = useApiIsLoaded();

  const effectiveIsLoaded = isApiLoaded && !authFailed;
  const effectiveError = authFailed ? new Error("Google Maps Auth Failed") : undefined;

  return (
    <MapContext.Provider value={{ isLoaded: effectiveIsLoaded, loadError: effectiveError, authFailed }}>
      {children}
    </MapContext.Provider>
  );
};

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    // Intercept Google Maps Auth Failure (invalid/unactivated key)
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps API Auth Failure detected. Failing over to OpenStreetMap.");
      setAuthFailed(true);
    };
  }, []);

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY &&
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE"
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : import.meta.env.VITE_FIREBASE_API_KEY || "";

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={["places", "geocoding", "routes", "geometry", "marker"]}
      onLoad={() => console.log("Google Maps API loaded.")}
    >
      <MapStateTracker authFailed={authFailed}>{children}</MapStateTracker>
    </APIProvider>
  );
};

// Named useMapContext to avoid conflict with @vis.gl/react-google-maps's useMap
export const useMapContext = () => useContext(MapContext);

// Legacy alias — keeps old imports working during migration
export const useMap = useMapContext;
