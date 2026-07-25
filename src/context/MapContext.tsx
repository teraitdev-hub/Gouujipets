import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

interface MapContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const MapContext = createContext<MapContextType>({
  isLoaded: false,
  loadError: undefined,
});

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  return (
    <MapContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => useContext(MapContext);
