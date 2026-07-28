import { useEffect, useRef, useCallback } from "react";

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

// Singleton: load Leaflet script once globally
let leafletReady = false;
let leafletCallbacks: (() => void)[] = [];

function loadLeaflet(cb: () => void) {
  if (leafletReady || (window as any).L) { leafletReady = true; cb(); return; }
  leafletCallbacks.push(cb);
  if (document.getElementById("leaflet-js")) return; // already loading

  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  const script = document.createElement("script");
  script.id = "leaflet-js";
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = () => {
    leafletReady = true;
    leafletCallbacks.forEach(fn => fn());
    leafletCallbacks = [];
  };
  document.body.appendChild(script);
}

export const FallbackMap = ({
  center,
  zoom = 14,
  markers = [],
  className = "h-[400px] w-full rounded-2xl shadow-lg border border-slate-200 z-0",
  onLocationSelect,
}: FallbackMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pinRef = useRef<any>(null);
  const centerRef = useRef(center);
  centerRef.current = center;

  const initMap = useCallback((L: any) => {
    if (!containerRef.current) return;

    // Destroy existing map to avoid duplicate
    if ((containerRef.current as any)._leaflet_id) {
      try { mapRef.current?.remove(); } catch (_) {}
      containerRef.current.innerHTML = "";
      (containerRef.current as any)._leaflet_id = undefined;
    }

    const map = L.map(containerRef.current, { zoomControl: true }).setView(centerRef.current, zoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
    }).addTo(map);

    // Static markers (e.g. facility locations)
    markers.forEach((m) => {
      if (!isNaN(m.position[0]) && !isNaN(m.position[1])) {
        const mk = L.marker(m.position).addTo(map);
        if (m.popupText) mk.bindPopup(`<div style="font-weight:700;font-size:13px;color:#1e293b;padding:4px">${m.popupText}</div>`);
      }
    });

    // Draggable interactive pin
    if (onLocationSelect) {
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:#7c3aed;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(124,58,237,0.5)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: ""
      });
      pinRef.current = L.marker(centerRef.current, { draggable: true, icon }).addTo(map);

      pinRef.current.on("dragend", (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        onLocationSelect(lat, lng);
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        pinRef.current?.setLatLng([lat, lng]);
        onLocationSelect(lat, lng);
      });
    }
  }, []);

  useEffect(() => {
    loadLeaflet(() => initMap((window as any).L));
    return () => {
      try { mapRef.current?.remove(); } catch (_) {}
    };
  }, []);

  // Reactively pan & move pin when center prop changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom, { animate: true });
    pinRef.current?.setLatLng(center);
  }, [center[0], center[1]]);

  return <div ref={containerRef} className={className} />;
};
