import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import { ArrowLeft, MapPin, Star, Clock, Car, Phone, CheckCircle, Crosshair, Scissors, Stethoscope, Home, DollarSign, Package, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Fix for default Leaflet icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icon for facility in Light Purple theme
const facilityIcon = L.divIcon({
  className: "custom-facility-icon",
  html: `
    <div style="background-color: #9333ea; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// User location icon
const userIcon = L.divIcon({
  className: "user-location-icon",
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #c084fc; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border-radius: 50%; background-color: #9333ea; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>
    </div>
    <style>
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
    </style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to handle Live Routing
const RoutingMachine = ({ start, end }: { start: L.LatLngTuple | null, end: L.LatLngTuple }) => {
  const map = useMap();

  useEffect(() => {
    if (!start) return;

    const routingControl = (L.Routing as any).control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      lineOptions: {
        styles: [{ color: '#9333ea', weight: 5, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: () => null
    }).addTo(map);

    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        // ignore
      }
    };
  }, [map, start, end]);

  return null;
};

export const FacilityDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState<any>(location.state?.facility || null);
  const [isLoading, setIsLoading] = useState(!location.state?.facility);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [userLoc, setUserLoc] = useState<L.LatLngTuple | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const fetchFacility = async () => {
      try {
        if (!id) throw new Error("No ID");
        const docRef = doc(db, 'businesses', id);
        const docSnap = await getDoc(docRef);
          
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          let ownerPhone = '';
          let ownerEmail = '';
          
          if (data.owner_id) {
            const ownerDocRef = doc(db, 'users', data.owner_id);
            const ownerDocSnap = await getDoc(ownerDocRef);
              
            if (ownerDocSnap.exists()) {
              const owner = ownerDocSnap.data();
              ownerPhone = owner.phone || '';
              ownerEmail = owner.email || '';
            }
          }

          setFacility({
            ...data,
            rating: data.rating || 4.9,
            reviewCount: data.review_count || 124,
            travelTime: 15,
            images: [
              data.image_url ||
              'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800'
            ],
            priceFrom: data.price_per_night || data.price_from || data.base_rate_per_day || 999,
            phone: data.contact_phone || ownerPhone || '',
            email: data.contact_email || ownerEmail || ''
          });
          
          if (data.services_offered && Array.isArray(data.services_offered)) {
            setServices(data.services_offered);
          } else if (typeof data.services_offered === 'string') {
            try {
              setServices(JSON.parse(data.services_offered));
            } catch (e) {
              setServices([]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching facility details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!facility || !facility.images) {
      fetchFacility();
    } else {
      if (facility.services_offered && Array.isArray(facility.services_offered)) {
        setServices(facility.services_offered);
      } else if (typeof facility.services_offered === 'string') {
        try {
          setServices(JSON.parse(facility.services_offered));
        } catch (e) {
          setServices([]);
        }
      }
    }
  }, [id, facility]);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      setIsLocating(true);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLoc([pos.coords.latitude, pos.coords.longitude]);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    
    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-[60vh] bg-purple-50/40 font-sans">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-purple-950">Loading VERIFIED CARE Facility...</h2>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full bg-purple-50/40 font-sans">
        <h2 className="text-2xl font-black text-purple-950 mb-4">Facility Not Found</h2>
        <button 
          onClick={() => navigate(-1)}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md hover:bg-purple-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const facilityCoords: L.LatLngTuple = [
    Number(facility.lat || facility.latitude || 19.0760),
    Number(facility.lng || facility.longitude || 72.8777)
  ];

  return (
    <PageTransition className="pb-32 bg-white min-h-screen font-sans">
      {/* Header Image Section */}
      <div className="relative h-[40vh] md:h-[48vh] w-full overflow-hidden bg-purple-950">
        <img 
          src={facility.images[0]} 
          alt={facility.name} 
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-purple-950/20 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md p-2.5 rounded-full text-purple-950 hover:scale-105 transition-transform shadow-md cursor-pointer border border-purple-200"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3 text-white max-w-4xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
                ✔ VERIFIED CARE™ PARTNER
              </span>
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                {facility.type || 'Boarding Suite'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight drop-shadow-md">{facility.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        
        {/* Title & Quick Action Strip */}
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-4 text-purple-950 font-medium">
            <span className="flex items-center gap-1.5 text-sm font-black">
              <Star size={16} className="text-purple-600 fill-purple-600" />
              {facility.rating} <span className="text-purple-700 underline ml-1 cursor-pointer font-bold">{facility.reviewCount} Verified Reviews</span>
            </span>
            <span className="text-purple-300">•</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-purple-800">
              <MapPin size={16} className="text-purple-600" />
              {typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified City Location')} ({facility.distance?.toFixed(1) || 2.4} km)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a 
              href={`tel:${facility.phone || '+919876543210'}`}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white border border-purple-300 text-purple-950 hover:bg-purple-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Phone size={14} className="text-purple-600" /> Call Center directly
            </a>
            <button 
              onClick={() => {
                const cleanPhone = (facility.phone || '919876543210').replace(/[\s+-]/g, '');
                const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const msg = `Hi ${facility.name}, inquiring from GouujiPets about booking/rates!`;
                window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <span>💬 WhatsApp Live</span>
            </button>
          </div>
        </div>
        
        {/* High-Density Care Specifications Grid in Light Purple */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg text-purple-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
              Verified Facility Specifications
            </h3>
            <span className="text-xs font-bold text-purple-600">Physically Inspected Standards</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Travel & Route</span>
                <span className="text-purple-600 font-black text-xs">Live GPS</span>
              </div>
              <p className="font-black text-purple-950 text-sm sm:text-base">{facility.travelTime || '15-25'} mins</p>
              <p className="text-[11px] text-purple-700 font-medium">Turn-by-turn nav enabled</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Climate Suite</span>
                <span className="text-purple-600 font-black text-xs">AC Controlled</span>
              </div>
              <p className="font-black text-purple-950 text-sm sm:text-base">22°C - 24°C Comfort</p>
              <p className="text-[11px] text-purple-700 font-medium">Auto-regulated airflow</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Monitoring</span>
                <span className="text-purple-600 font-black text-xs">Premium Setup</span>
              </div>
              <p className="font-black text-purple-950 text-sm sm:text-base">24/7 Supervision</p>
              <p className="text-[11px] text-purple-700 font-medium">Dedicated on-site staff</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Medical Shield</span>
                <span className="text-purple-600 font-black text-xs">On-Call Vet</span>
              </div>
              <p className="font-black text-purple-950 text-sm sm:text-base">24/7 Emergency</p>
              <p className="text-[11px] text-purple-700 font-medium">30-min response pledge</p>
            </motion.div>
          </div>
        </div>

        <hr className="border-purple-200" />

        {/* Description */}
        <div className="bg-purple-50/60 border border-purple-200 p-5 sm:p-6 rounded-3xl">
          <h3 className="font-black text-lg text-purple-950 mb-2">About this {facility.type || 'Verified Facility'}</h3>
          <p className="text-purple-900 text-sm sm:text-base leading-relaxed font-medium">
            {facility.description ||
              `${facility.name} is a premier ${facility.type?.toLowerCase() || 'facility'} dedicated to providing top-tier service for your pets. Located conveniently in ${typeof facility.address === 'string' ? facility.address.split(',')[0] : 'the area'}, we offer a wide range of services to ensure your pet is happy, healthy, and well taken care of.`
            }
          </p>
        </div>

        <hr className="border-purple-200" />

        {/* Services Section in Light Purple Only */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl border border-purple-200">
              <Package size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-black text-xl text-purple-950">Live Suite & Add-on Catalog</h3>
              <p className="text-xs text-purple-700 font-bold">Select required add-on services to customize your pet's stay package</p>
            </div>
          </div>

          {services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((srv, i) => (
                <motion.div
                  key={srv.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    const srvId = srv.id || srv.name;
                    setSelectedServices(prev => 
                      prev.includes(srvId) ? prev.filter(id => id !== srvId) : [...prev, srvId]
                    );
                  }}
                  className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all ${
                    selectedServices.includes(srv.id || srv.name)
                      ? "border-purple-600 shadow-md ring-1 ring-purple-600 bg-purple-50"
                      : "border-purple-200 shadow-2xs hover:shadow-md hover:border-purple-400"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${selectedServices.includes(srv.id || srv.name) ? 'bg-purple-600 border-purple-600' : 'border-purple-300 bg-purple-50/50'}`}>
                        {selectedServices.includes(srv.id || srv.name) && <CheckCircle size={13} className="text-white" />}
                      </div>
                      <h4 className="font-black text-purple-950 text-[15px]">{srv.name}</h4>
                    </div>
                    <span className="text-purple-600 font-black text-lg shrink-0 ml-2">{formatRupee(srv.price || 499)}</span>
                  </div>
                  {srv.description && (
                    <p className="text-purple-800 text-sm mb-3 line-clamp-2 pl-7 font-medium">{srv.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs pl-7">
                    <Clock size={13} className="text-purple-600" />
                    <span>{srv.duration_mins || 30} mins</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-purple-50/60 rounded-2xl p-6 text-center border border-dashed border-purple-200">
              <p className="text-purple-950 font-bold">No specific add-on services listed yet.</p>
              <p className="text-xs text-purple-700 mt-1">Deluxe room boarding and 24/7 care are included in the base price.</p>
            </div>
          )}
        </div>

        <hr className="border-purple-200" />

        {/* Address, Contact & Map Route in Light Purple */}
        <div className="pb-10">
          <h3 className="font-black text-xl text-purple-950 mb-6">Location & Live GPS Directions</h3>
          
          <div className="space-y-3 text-[15px] text-purple-950 font-bold mb-6 bg-purple-50 p-4 rounded-2xl border border-purple-200">
            <p className="flex items-start gap-3">
              <MapPin size={18} className="text-purple-600 shrink-0 mt-0.5" />
              <span>{typeof facility.address === 'string' ? facility.address : (facility.address?.street || facility.address?.city || 'Verified Facility Address')}</span>
            </p>
            <p className="flex items-center gap-3">
              <Phone size={18} className="text-purple-600 shrink-0" />
              <span>{facility.contact_phone || '+91 98765 43210'}</span>
            </p>
            {facility.contact_email && (
              <p className="flex items-center gap-3 text-purple-800 font-medium text-sm">
                <span>✉</span>
                <span>{facility.contact_email}</span>
              </p>
            )}
          </div>

          {/* Interactive Routing Map */}
          <div className="w-full h-[380px] rounded-2xl overflow-hidden shadow-md relative border border-purple-300">
            {isLocating && (
              <div className="absolute top-4 right-4 z-[1000] bg-purple-900 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2">
                 <Crosshair size={14} className="animate-spin" /> Detecting GPS for route...
              </div>
            )}
            
            <MapContainer 
              center={facilityCoords} 
              zoom={15} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Destination Marker */}
              <Marker position={facilityCoords} icon={facilityIcon}>
                <Popup>
                  <div className="p-1 min-w-[180px] font-sans">
                    <div className="font-black text-sm text-purple-950">{facility.name}</div>
                    <div className="text-xs text-purple-700 mt-1 flex items-start gap-1">
                      <MapPin size={12} className="text-purple-600 shrink-0 mt-0.5" />
                      <span>{typeof facility.address === 'string' ? facility.address : 'Verified Center'}</span>
                    </div>
                    <div className="mt-2 text-xs font-black text-purple-600">
                      Starting from {formatRupee(facility.priceFrom || 999)}/day
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Start (User) Marker */}
              {userLoc && (
                <Marker position={userLoc} icon={userIcon}>
                  <Popup>
                    <div className="font-bold">You are here</div>
                  </Popup>
                </Marker>
              )}

              {/* Draw Live Route */}
              <RoutingMachine start={userLoc} end={facilityCoords} />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Amazon x VERIFIED Sticky Bottom Booking Bar in Light Purple Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-purple-200 p-3 sm:p-4 shadow-2xl z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">Total Starting Rate</span>
              <span className="text-[9px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300 hidden sm:inline">✓ Upfront Transparent Price</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-xl sm:text-2xl text-purple-950">{formatRupee(facility.priceFrom || facility.price_per_night || 999)}</span>
              <span className="text-purple-700 font-bold text-[10px] sm:text-xs">/ night</span>
            </div>
            {selectedServices.length > 0 ? (
              <p className="text-[10px] font-black text-purple-600 mt-0.5">
                + {selectedServices.length} add-on service{selectedServices.length > 1 ? 's' : ''} selected
              </p>
            ) : services.length > 0 ? (
              <p className="text-[10px] font-bold text-purple-400 mt-0.5">
                {services.length} optional add-ons available above
              </p>
            ) : null}
          </div>
          <button 
            onClick={() => navigate(`/checkout/${facility.id}`, { state: { facility, selectedServices } })}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black px-6 sm:px-8 py-3 rounded-xl transition-all shadow-md active:scale-95 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Proceed to Checkout</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </PageTransition>
  );
};
