import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import { ArrowLeft, MapPin, Star, Clock, Car, Phone, CheckCircle, Crosshair, Scissors, Stethoscope, Home, DollarSign, Package, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { motion } from "framer-motion";
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useMap } from '../../context/MapContext';
import { FallbackMap } from '../../components/Map/FallbackMap';
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";



export const FacilityDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState<any>(location.state?.facility || null);
  const [isLoading, setIsLoading] = useState(!location.state?.facility);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { isLoaded, loadError, authFailed } = useMap();
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

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
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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

  useEffect(() => {
    if (!userLoc || !facility || !isLoaded) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    const facilityCoords = {
      lat: Number(facility.lat || facility.latitude || 19.0760),
      lng: Number(facility.lng || facility.longitude || 72.8777)
    };
    
    directionsService.route(
      {
        origin: userLoc,
        destination: facilityCoords,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResult(result);
        }
      }
    );
  }, [userLoc, facility, isLoaded]);

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

  const facilityCoords = {
    lat: Number(facility.lat || facility.latitude || 19.0760),
    lng: Number(facility.lng || facility.longitude || 72.8777)
  };

  return (
    <PageTransition className="pb-32 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] min-h-screen font-sans">
      {/* Header Image Section - Airbnb Style Masonry */}
      <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden bg-slate-900 group">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-full w-full p-2">
          {/* Main Image */}
          <div className="md:col-span-2 h-full relative overflow-hidden rounded-l-[24px] rounded-r-[24px] md:rounded-r-none">
            <img 
              src={facility.images[0]} 
              alt={facility.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </div>
          {/* Side Images (Mocked as copies of main for now, in a real app would be images[1], [2], etc.) */}
          <div className="hidden md:grid col-span-1 gap-2 h-full">
            <img src={facility.images[0]} className="w-full h-full object-cover" />
            <img src={facility.images[0]} className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:grid col-span-1 gap-2 h-full">
            <img src={facility.images[0]} className="w-full h-full object-cover rounded-tr-[24px]" />
            <img src={facility.images[0]} className="w-full h-full object-cover rounded-br-[24px]" />
          </div>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent pointer-events-none" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-30 bg-white/95 backdrop-blur-md p-3 rounded-full text-slate-900 hover:scale-105 transition-transform shadow-md cursor-pointer border border-slate-200"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-wrap items-end justify-between gap-3 text-white max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                ✔ VERIFIED PARTNER
              </span>
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                {facility.type || 'Boarding Suite'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight drop-shadow-lg">{facility.name}</h1>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-32 lg:pb-12 flex flex-col lg:flex-row gap-10">
        {/* Main Content Column */}
        <div className="flex-1 space-y-10">
        
        {/* Title & Quick Action Strip */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 text-slate-700 font-medium text-sm">
            <span className="flex items-center gap-1.5 font-black text-slate-900">
              <Star size={18} className="text-amber-500 fill-amber-500" />
              {facility.rating} <span className="text-slate-500 underline ml-1 cursor-pointer font-bold hover:text-slate-900 transition-colors">{facility.reviewCount} reviews</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 font-bold">
              <MapPin size={18} className="text-slate-400" />
              {typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified Location')} ({facility.distance?.toFixed(1) || 2.4} km)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a 
              href={`tel:${facility.phone || '+919876543210'}`}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Phone size={16} /> Call
            </a>
            <button 
              onClick={() => {
                const cleanPhone = (facility.phone || '919876543210').replace(/[\s+-]/g, '');
                const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const msg = `Hi ${facility.name}, inquiring from GouujiPets about booking/rates!`;
                window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span className="text-emerald-600">WhatsApp</span>
            </button>
          </div>
        </div>
        
        {/* High-Density Care Specifications Grid in Apple Style */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-2xl text-slate-900">
              Verified Standards
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">Physically Inspected</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Travel & Route</span>
                <MapPin size={16} className="text-blue-500" />
              </div>
              <p className="font-black text-slate-900 text-base sm:text-lg">{facility.travelTime || '15-25'} mins</p>
              <p className="text-[11px] text-slate-500 font-bold">Live GPS enabled</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Climate Suite</span>
                <Sparkles size={16} className="text-amber-500" />
              </div>
              <p className="font-black text-slate-900 text-base sm:text-lg">22°C - 24°C</p>
              <p className="text-[11px] text-slate-500 font-bold">Auto-regulated AC</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monitoring</span>
                <ShieldCheck size={16} className="text-emerald-500" />
              </div>
              <p className="font-black text-slate-900 text-base sm:text-lg">24/7 Care</p>
              <p className="text-[11px] text-slate-500 font-bold">On-site staff</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Medical Shield</span>
                <Stethoscope size={16} className="text-rose-500" />
              </div>
              <p className="font-black text-slate-900 text-base sm:text-lg">On-Call Vet</p>
              <p className="text-[11px] text-slate-500 font-bold">30-min response</p>
            </motion.div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Description */}
        <div>
          <h3 className="font-black text-2xl text-slate-900 mb-4">About this {facility.type || 'Facility'}</h3>
          <p className="text-slate-600 text-base leading-relaxed font-medium">
            {facility.description ||
              `${facility.name} is a premier ${facility.type?.toLowerCase() || 'facility'} dedicated to providing top-tier service for your pets. Located conveniently in ${typeof facility.address === 'string' ? facility.address.split(',')[0] : 'the area'}, we offer a wide range of services to ensure your pet is happy, healthy, and well taken care of.`
            }
          </p>
        </div>

        <hr className="border-slate-100" />

        {/* Services Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-2xl text-slate-900">Add-on Services</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">Customize your pet's stay package</p>
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
                  className={`bg-white border-2 rounded-3xl p-6 cursor-pointer transition-all ${
                    selectedServices.includes(srv.id || srv.name)
                      ? "border-slate-900 shadow-md bg-slate-50"
                      : "border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedServices.includes(srv.id || srv.name) ? 'bg-slate-900 border-slate-900' : 'border-slate-300 bg-transparent'}`}>
                        {selectedServices.includes(srv.id || srv.name) && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <h4 className="font-black text-slate-900 text-lg">{srv.name}</h4>
                    </div>
                    <span className="text-slate-900 font-black text-lg shrink-0 ml-2">{formatRupee(srv.price || 499)}</span>
                  </div>
                  {srv.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2 pl-9 font-semibold">{srv.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs pl-9">
                    <Clock size={14} />
                    <span>{srv.duration_mins || 30} mins</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl p-8 text-center border border-slate-200/60">
              <p className="text-slate-900 font-bold">No specific add-on services listed yet.</p>
              <p className="text-sm text-slate-500 mt-2 font-semibold">Deluxe room boarding and 24/7 care are included in the base price.</p>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Address, Contact & Map Route */}
        <div className="pb-10">
          <h3 className="font-black text-2xl text-slate-900 mb-6">Location</h3>
          
          <div className="space-y-4 text-base text-slate-700 font-semibold mb-6">
            <p className="flex items-start gap-4">
              <MapPin size={20} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{typeof facility.address === 'string' ? facility.address : (facility.address?.street || facility.address?.city || 'Verified Facility Address')}</span>
            </p>
            <p className="flex items-center gap-4">
              <Phone size={20} className="text-slate-400 shrink-0" />
              <span>{facility.contact_phone || '+91 98765 43210'}</span>
            </p>
            {facility.contact_email && (
              <p className="flex items-center gap-4 text-slate-700">
                <span className="text-xl">✉</span>
                <span>{facility.contact_email}</span>
              </p>
            )}
          </div>

          {/* Interactive Routing Map */}
          <div className="w-full h-[400px] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative border border-slate-200/60">
            {isLocating && (
              <div className="absolute top-4 right-4 z-[1000] bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-lg font-bold text-sm flex items-center gap-2">
                 <Crosshair size={16} className="animate-spin" /> Locating...
              </div>
            )}
            
            {(loadError || authFailed || !isLoaded) ? (
              <FallbackMap
                center={[facilityCoords.lat, facilityCoords.lng]}
                zoom={14}
                markers={[
                  { position: [facilityCoords.lat, facilityCoords.lng] as [number, number], popupText: facility.name },
                  ...(userLoc ? [{ position: [userLoc.lat, userLoc.lng] as [number, number], popupText: "Your Current GPS Location" }] : [])
                ]}
                className="w-full h-full"
              />
            ) : (
              <GoogleMap 
                center={facilityCoords} 
                zoom={15} 
                mapContainerStyle={{ height: '100%', width: '100%' }}
                options={{
                  disableDefaultUI: false,
                  scrollwheel: false,
                  styles: [
                    {
                      "featureType": "all",
                      "elementType": "geometry.fill",
                      "stylers": [{"weight": "2.00"}]
                    },
                    {
                      "featureType": "all",
                      "elementType": "geometry.stroke",
                      "stylers": [{"color": "#9c9c9c"}]
                    },
                    {
                      "featureType": "all",
                      "elementType": "labels.text",
                      "stylers": [{"visibility": "on"}]
                    },
                    {
                      "featureType": "landscape",
                      "elementType": "all",
                      "stylers": [{"color": "#f2f2f2"}]
                    },
                    {
                      "featureType": "landscape",
                      "elementType": "geometry.fill",
                      "stylers": [{"color": "#ffffff"}]
                    },
                    {
                      "featureType": "landscape.man_made",
                      "elementType": "geometry.fill",
                      "stylers": [{"color": "#ffffff"}]
                    },
                    {
                      "featureType": "poi",
                      "elementType": "all",
                      "stylers": [{"visibility": "off"}]
                    },
                    {
                      "featureType": "road",
                      "elementType": "all",
                      "stylers": [{"saturation": -100},{"lightness": 45}]
                    },
                    {
                      "featureType": "road",
                      "elementType": "geometry.fill",
                      "stylers": [{"color": "#eeeeee"}]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.text.fill",
                      "stylers": [{"color": "#7b7b7b"}]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.text.stroke",
                      "stylers": [{"color": "#ffffff"}]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "all",
                      "stylers": [{"visibility": "simplified"}]
                    },
                    {
                      "featureType": "road.arterial",
                      "elementType": "labels.icon",
                      "stylers": [{"visibility": "off"}]
                    },
                    {
                      "featureType": "transit",
                      "elementType": "all",
                      "stylers": [{"visibility": "off"}]
                    },
                    {
                      "featureType": "water",
                      "elementType": "all",
                      "stylers": [{"color": "#46bcec"},{"visibility": "on"}]
                    },
                    {
                      "featureType": "water",
                      "elementType": "geometry.fill",
                      "stylers": [{"color": "#c8d7d4"}]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.fill",
                      "stylers": [{"color": "#070707"}]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.stroke",
                      "stylers": [{"color": "#ffffff"}]
                    }
                  ]
                }}
              >
                {/* Destination Marker */}
                <Marker 
                  position={facilityCoords} 
                  onClick={() => setActiveMarker("facility")}
                >
                  {activeMarker === "facility" && (
                    <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                      <div className="p-2 min-w-[200px] font-sans">
                        <div className="font-black text-base text-slate-900">{facility.name}</div>
                        <div className="text-sm text-slate-500 mt-1 flex items-start gap-1">
                          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="font-semibold">{typeof facility.address === 'string' ? facility.address : 'Verified Center'}</span>
                        </div>
                        <div className="mt-3 text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
                          Starting from {formatRupee(facility.priceFrom || 999)}/day
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Marker>

                {/* Start (User) Marker */}
                {userLoc && !directionsResult && (
                  <Marker 
                    position={userLoc} 
                    onClick={() => setActiveMarker("user")}
                  >
                    {activeMarker === "user" && (
                      <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                        <div className="font-bold p-1">You are here</div>
                      </InfoWindow>
                    )}
                  </Marker>
                )}

                {/* Draw Live Route */}
                {directionsResult && (
                  <DirectionsRenderer 
                    directions={directionsResult} 
                    options={{
                      polylineOptions: {
                        strokeColor: '#0f172a',
                        strokeWeight: 4,
                        strokeOpacity: 0.8
                      }
                    }}
                  />
                )}
              </GoogleMap>
            )}
          </div>
        </div>
        </div>

        {/* Desktop Sticky Booking Sidebar */}
        <div className="hidden lg:block w-[380px] shrink-0">
          <div className="sticky top-28 bg-white rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgb(0,0,0,0.1)] border border-slate-200/60 flex flex-col z-20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Starting Price</span>
              <span className="flex items-center gap-1 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                {facility.rating}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="font-black text-4xl text-slate-900 tracking-tight">{formatRupee(facility.priceFrom || facility.price_per_night || 999)}</span>
              <span className="text-slate-500 font-bold text-base">/ night</span>
            </div>

            {selectedServices.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200/60">
                <p className="text-xs font-black text-slate-900 mb-2 uppercase tracking-wide">Selected Add-ons</p>
                <div className="space-y-2">
                  {selectedServices.map(srvId => {
                    const s = services.find(x => x.id === srvId || x.name === srvId);
                    return s ? (
                      <div key={srvId} className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>{s.name}</span>
                        <span className="text-slate-900 font-bold">{formatRupee(s.price || 499)}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <button 
              onClick={() => navigate(`/checkout/${facility.id}`, { state: { facility, selectedServices } })}
              className="w-full bg-slate-900 hover:bg-purple-600 text-white font-black py-4 rounded-2xl transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-95 text-base flex items-center justify-center gap-2 cursor-pointer mt-auto"
            >
              Reserve Base Stay
            </button>
            <p className="text-center text-[11px] text-slate-500 font-bold mt-4">You won't be charged yet</p>
          </div>
        </div>
      </div>

      {/* Apple-Style Floating Bottom Booking Bar */}
      {/* Mobile/Tablet Apple-Style Floating Bottom Booking Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-3xl border-t border-slate-200/60 p-4 sm:p-5 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Starting Price</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">{formatRupee(facility.priceFrom || facility.price_per_night || 999)}</span>
              <span className="text-slate-500 font-bold text-sm">/ night</span>
            </div>
            {selectedServices.length > 0 ? (
              <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                {selectedServices.length} add-on{selectedServices.length > 1 ? 's' : ''} selected
              </p>
            ) : services.length > 0 ? (
              <p className="text-xs font-semibold text-slate-400 mt-1">
                {services.length} optional add-ons available
              </p>
            ) : null}
          </div>
          <button 
            onClick={() => navigate(`/checkout/${facility.id}`, { state: { facility, selectedServices } })}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 sm:px-10 py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-95 text-sm flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Proceed to Checkout</span>
          </button>
        </div>
      </div>
    </PageTransition>
  );
};
