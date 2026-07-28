import { useEffect, useRef } from "react";

interface FallbackMapProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popupText?: string;
  }>;
  className?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export const FallbackMap = ({
  center,
  zoom = 13,
  markers = [],
  className = "h-[400px] w-full rounded-2xl shadow-lg border border-slate-200 z-0",
  onLocationSelect,
}: FallbackMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inject Leaflet CSS dynamically if not present
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = (L: any) => {
      if (!containerRef.current) return;

      // Clean up previous map if container already initialized
      if ((containerRef.current as any)._leaflet_id) {
        containerRef.current.innerHTML = "";
        (containerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(containerRef.current).setView(center, zoom);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add provided markers
      markers.forEach((m) => {
        if (Array.isArray(m.position) && !isNaN(m.position[0]) && !isNaN(m.position[1])) {
          const marker = L.marker(m.position).addTo(map);
          if (m.popupText) {
            marker.bindPopup(`<div style="padding:4px; font-weight:bold; font-size:13px; color:#1e293b;">${m.popupText}</div>`);
          }
        }
      });

      // Handle interactive location selection on click
      if (onLocationSelect) {
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          if (markerInstanceRef.current) {
            map.removeLayer(markerInstanceRef.current);
          }
          markerInstanceRef.current = L.marker([lat, lng]).addTo(map);
          onLocationSelect(lat, lng);
        });
      }
    };

    if ((window as any).L) {
      initMap((window as any).L);
    } else {
      let script = document.getElementById("leaflet-js") as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        document.body.appendChild(script);
      }
      script.addEventListener("load", () => {
        if ((window as any).L) initMap((window as any).L);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
      }
    };
  }, [center[0], center[1], zoom, markers.length]);

  return <div ref={containerRef} className={className} />;
};
