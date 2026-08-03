import { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { MapPin, Navigation } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
import { motion } from "framer-motion";

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "24px"
};

export const NearYou = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyPartners, setNearbyPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Note: VITE_GOOGLE_MAPS_API_KEY must be in .env
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const requestLocation = () => {
    setIsLoading(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Location error:", error);
          setLocationError("Location permission denied. Cannot show nearby partners.");
          setIsLoading(false);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation) {
      const fetchNearby = async () => {
        try {
          const q = query(collection(db, "businesses"), where("status", "==", "verified"));
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Filter dynamically (in a real app this uses GeoFire)
          setNearbyPartners(data);
        } catch (error) {
          console.error("Failed to fetch nearby:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchNearby();
    }
  }, [userLocation]);

  if (loadError) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
         <EmptyState icon={<MapPin />} title="Maps Unavailable" description="Google Maps failed to load. Please try again later." />
      </section>
    );
  }

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
             <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
               Partners Near You
             </h2>
             <p className="text-slate-500 font-semibold mt-1">Discover verified facilities in your neighborhood.</p>
          </div>
          {!userLocation && (
             <button onClick={requestLocation} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
               <Navigation size={16} /> Enable Location
             </button>
          )}
        </div>

        {!userLocation ? (
          <div className="w-full h-[400px] bg-slate-100 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center p-6">
             <MapPin size={48} className="text-slate-300 mb-4" />
             <h3 className="text-lg font-black text-slate-700 mb-2">Location Required</h3>
             <p className="text-slate-500 font-medium text-sm max-w-md">Please enable location services to view verified pet care partners on the map near you.</p>
             {locationError && <p className="text-red-500 text-xs mt-4 font-bold">{locationError}</p>}
          </div>
        ) : !isLoaded || isLoading ? (
          <div className="w-full h-[400px] bg-slate-200 animate-pulse rounded-3xl" />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl overflow-hidden border border-slate-200/80 shadow-inner">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={userLocation}
              zoom={13}
              options={{
                 disableDefaultUI: true,
                 zoomControl: true,
              }}
            >
              {/* User Location Marker */}
              <Marker position={userLocation} icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />
              
              {/* Partner Markers */}
              {nearbyPartners.map(partner => (
                 partner.location?.lat && partner.location?.lng && (
                   <Marker 
                     key={partner.id} 
                     position={{ lat: partner.location.lat, lng: partner.location.lng }} 
                     title={partner.name}
                   />
                 )
              ))}
            </GoogleMap>
          </motion.div>
        )}
      </div>
    </section>
  );
};
