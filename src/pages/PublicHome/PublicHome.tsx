import { useNavigate } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import { PublicNavbar } from "../../components/layout/PublicNavbar";
import { PublicFooter } from "../../components/layout/PublicFooter";
import { PublicBottomNav } from "../../components/navigation/PublicBottomNav";
import {
  Search, MapPin, Star, ShieldCheck, HeartPulse, ChevronRight,
  Sparkles, Award, Video, Clock, CheckCircle2, Building2, Leaf,
  Truck, FlaskConical, Phone, MessageCircle, Navigation, Zap, Filter, Tag, Check, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/useAuthStore";
import { formatRupee } from "../../utils/currency";
import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { ALL_CATEGORIES, getCategoryById } from "../../lib/serviceCategories";
import { filterRealBusinesses } from "../../utils/filterRealBusinesses";
import { useMap } from "../../context/MapContext";
import { Autocomplete } from "@react-google-maps/api";

export const PublicHome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal } = useAuthStore();
  const [searchLocation, setSearchLocation] = useState("Bangalore / Near Me");
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const { isLoaded, loadError } = useMap();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("All Bangalore");
  const [showContactModal, setShowContactModal] = useState<any | null>(null);
  
  // Replaced video with 2D animated effects

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchFacilities = () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'businesses'), where('status', '==', 'active'));
        
        unsubscribe = onSnapshot(q, async (bSnap) => {
          let data: any[] = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          if (data && data.length > 0) {
            const filtered = filterRealBusinesses(data);
            
            // Fetch owners for these businesses to get their phone/email fallback
            const ownerIds = filtered.map((b: any) => b.owner_id).filter(Boolean);
            let ownersMap = new Map();
            if (ownerIds.length > 0) {
              let owners: any[] = [];
              for (let i = 0; i < ownerIds.length; i += 10) {
                const chunk = ownerIds.slice(i, i + 10);
                const uQ = query(collection(db, 'users'), where('id', 'in', chunk));
                const uSnap = await getDocs(uQ);
                owners.push(...uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
              }
              if (owners) {
                ownersMap = new Map(owners.map((o: any) => [o.id, o]));
              }
            }

            const formattedData = filtered.map((biz) => {
              const owner = ownersMap.get(biz.owner_id) as any;
              return {
                ...biz,
                rating: biz.rating || 4.9,
                reviewsCount: biz.reviews_count || 128,
                images: Array.isArray(biz.images) && biz.images.length > 0 ? biz.images : [biz.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800'],
                priceFrom: biz.price_per_night || biz.price_from || biz.base_rate_per_day || biz.priceFrom || 999,
                mrpPrice: Math.round((biz.price_per_night || biz.base_rate_per_day || 999) * 1.35),
                verified: true,
                open24Hours: biz.type?.toLowerCase() === 'veterinary' || biz.type?.toLowerCase() === 'boarding',
                phone: biz.contact_phone || owner?.phone || '',
                email: biz.contact_email || owner?.email || ''
              };
            });
            setFacilities(formattedData);
          } else {
            setFacilities([]);
          }
          setIsLoading(false);
        }, (err) => {
          console.error("Failed to fetch facilities", err);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error setting up facilities listener", err);
        setIsLoading(false);
      }
    };
    
    fetchFacilities();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim() || activeCategoryTab;
    navigate(`/boarding?query=${encodeURIComponent(q)}&category=${activeCategoryTab === 'all' ? '' : activeCategoryTab}&location=${encodeURIComponent(searchLocation)}`);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setSearchLocation(place.formatted_address);
      } else if (place.name) {
        setSearchLocation(place.name);
      }
    }
  };

  const CoreCategories = [
    { id: "boarding", icon: "🏠", title: "Pet Boarding", desc: "Safe, comfortable home away from home" },
    { id: "daycare", icon: "🌞", title: "Pet Daycare", desc: "Fun and active supervised play" },
    { id: "grooming", icon: "💇", title: "Grooming & Spa", desc: "Professional grooming & spa treatments" },
    { id: "veterinary", icon: "🩺", title: "Veterinary Care", desc: "Routine health checkups & consults" },
    { id: "training", icon: "🎓", title: "Pet Training", desc: "Customized behavior & obedience programs" },
    { id: "transportation", icon: "🚗", title: "Pet Transportation", desc: "Secure pickup and drop-off services" },
    { id: "shop", icon: "🛍️", title: "Pet Shop", desc: "Premium pet food, toys, and supplies" },
    { id: "health_tracking", icon: "📱", title: "Pet Health Tracking", desc: "Digital health profile & wellness reports" }
  ];

  const cities = ["All Bangalore", "Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Jayanagar", "Near Me (GPS)"];

  const filteredFacilities = facilities.filter(f => {
    if (activeCategoryTab !== "all") {
      const typeMatches = f.type?.toLowerCase().includes(activeCategoryTab.toLowerCase());
      const svcs = typeof f.services_offered === 'string' ? f.services_offered.toLowerCase() : JSON.stringify(f.services_offered || '').toLowerCase();
      if (!typeMatches && !svcs.includes(activeCategoryTab.toLowerCase())) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.name?.toLowerCase().includes(q);
      const matchAddr = typeof f.address === 'string' ? f.address.toLowerCase().includes(q) : JSON.stringify(f.address || '').toLowerCase().includes(q);
      const matchType = f.type?.toLowerCase().includes(q);
      return matchName || matchAddr || matchType;
    }
    return true;
  });

  return (
    <PageTransition className="min-h-screen bg-[#fafbff] font-sans overflow-x-hidden pb-20 md:pb-6 relative">
      <PublicNavbar />

      {/* ========== HERO SECTION (PREMIUM AIRBNB/APPLE TIER) ========== */}
      <section className="relative pt-16 pb-28 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden">
        
        {/* Subtle dynamic background blobs for glassmorphism */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-teal-400/15 rounded-full blur-[140px] pointer-events-none mix-blend-multiply" />
        
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-8">
          <div className="bg-transparent p-6 sm:p-12 rounded-[40px] mx-auto max-w-5xl flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-slate-200/60 text-slate-800 font-bold text-xs uppercase tracking-widest shadow-sm mb-8"
            >
              <Sparkles size={14} className="text-purple-600" />
              India's #1 Premium Pet Care Platform
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="text-5xl sm:text-7xl md:text-8xl font-black text-slate-900 tracking-tight leading-[1.05]"
            >
              Extraordinary Care <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-glow">For Your Best Friend</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto mt-8 leading-relaxed"
            >
              Book verified luxury boarding resorts, professional groomers, and 24/7 vets near you. Transparent pricing, instant booking, and absolute peace of mind.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 150, damping: 25 }}
            className="pt-4 max-w-4xl mx-auto"
          >
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3 glass-panel p-3 rounded-[40px] focus-within:ring-4 focus-within:ring-purple-500/20 focus-within:border-purple-300 transition-all z-20 relative">
              <div className="flex items-center w-full sm:w-1/3 gap-3 px-5 py-4 border-b sm:border-b-0 sm:border-r border-slate-200/60">
                <MapPin size={24} className="text-slate-400 shrink-0" />
                {isLoaded ? (
                  <Autocomplete
                    onLoad={setAutocomplete}
                    onPlaceChanged={onPlaceChanged}
                    options={{ types: ['(regions)'], componentRestrictions: { country: 'in' } }}
                    className="w-full"
                  >
                    <input
                      type="text"
                      placeholder="Where?"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full bg-transparent text-slate-900 font-bold text-lg focus:outline-none placeholder:text-slate-400 placeholder:font-medium"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    placeholder="Loading map..."
                    disabled
                    className="w-full bg-transparent text-slate-400 font-medium text-lg focus:outline-none"
                  />
                )}
              </div>
              <div className="flex items-center w-full sm:w-1/3 flex-[2] gap-3 px-5 py-4">
                <Search size={24} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Resorts, groomers, vets..."
                  className="w-full bg-transparent text-slate-900 font-bold text-lg focus:outline-none placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full sm:w-auto bg-slate-900 hover:bg-purple-600 text-white font-black px-12 py-5 rounded-[32px] shadow-lg transition-all shrink-0 text-lg flex items-center justify-center gap-2">
                <Search size={20} />
                Search
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ========== PREMIUM CORE CATEGORIES ========== */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/40 backdrop-blur-md rounded-[40px] p-8 sm:p-12 border border-purple-100/50 shadow-[0_20px_60px_-15px_rgba(124,58,237,0.08)] relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
          
          <div className="text-center mb-10 relative z-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] uppercase tracking-widest mb-4">
              <Sparkles size={12} />
              8 Categories
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Explore Our Services
            </h2>
            <p className="text-slate-500 font-medium mt-3 text-base">Tap any category to find verified professionals near you</p>
          </div>

        <div className="flex overflow-x-auto gap-5 sm:gap-6 pb-6 pt-4 px-2 snap-x snap-mandatory">
          {CoreCategories.map((cat) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: CoreCategories.indexOf(cat) * 0.05 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={cat.id}
              onClick={() => {
                if (!isAuthenticated) {
                  navigate(`/login/user?service=${cat.id}`);
                } else {
                  if (cat.id === 'health_tracking') navigate('/health');
                  else if (cat.id === 'shop') navigate('/shop');
                  else if (cat.id === 'daycare') navigate('/boarding?type=daycare');
                  else navigate(`/${cat.id}`);
                }
              }}
              className={`snap-start shrink-0 w-72 relative bg-white rounded-[28px] p-7 border-2 transition-all duration-300 cursor-pointer flex flex-col items-start z-10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(124,58,237,0.12)] ${
                activeCategoryTab === cat.id ? "border-purple-500 ring-4 ring-purple-500/10 bg-gradient-to-br from-purple-50 to-indigo-50" : "border-transparent hover:border-purple-200"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center text-3xl mb-5 shadow-sm border border-purple-100/60">
                <span>{cat.icon}</span>
              </div>
              <h3 className="font-black text-lg text-slate-900 mb-1.5">
                {cat.title}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                {cat.desc}
              </p>
            </motion.div>
          ))}
          </div>
        </div>
      </section>

      {/* ========== VERIFIED x AMAZON DIRECTORY LISTINGS (Featured Local Businesses) ========== */}
      <section className="py-6 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 border-b border-slate-200/80 pb-3 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-white uppercase tracking-widest bg-slate-900 px-2.5 py-0.5 rounded-full mb-1">
              <Award size={12} className="stroke-[3]" /> VERIFIED LOCAL PARTNERS IN {selectedCity.toUpperCase()}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Popular Pet Resorts, Vets & Grooming Centers
            </h2>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Compare ratings, verified amenities, transparent rates and book directly with instant confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setActiveCategoryTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${activeCategoryTab === 'all' ? 'bg-slate-900 text-white shadow-md border border-slate-900' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              All ({facilities.length})
            </button>
            <button
              onClick={() => navigate('/boarding')}
              className="bg-white hover:bg-gray-100 text-black font-black px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-2xs transition-all border border-gray-200"
            >
              <span>Explore All & Map View</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse rounded-[28px] border border-slate-200/60 overflow-hidden bg-white">
                <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded-lg w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded-lg w-1/2"></div>
                  <div className="flex gap-2 mt-2">
                    <div className="h-6 bg-slate-100 rounded-md w-16"></div>
                    <div className="h-6 bg-slate-100 rounded-md w-20"></div>
                  </div>
                  <div className="h-10 bg-slate-200 rounded-xl w-full mt-3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center max-w-md mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3 font-black text-xl border border-slate-200">
              🔍
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1">No matching partners found</h3>
            <p className="text-xs text-slate-500 mb-4">We couldn't find facilities matching "{searchQuery || activeCategoryTab}". Try resetting filters to explore all verified centers.</p>
            <button 
              onClick={() => { setSearchQuery(""); setActiveCategoryTab("all"); }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white text-xs font-black shadow-sm"
            >
              Reset Filters & Show All
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredFacilities.map((facility, idx) => (
              <motion.div
                key={facility.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => navigate(`/facility/${facility.id || facility._id}`, { state: { facility } })}
                className="group bg-white rounded-[28px] border border-slate-200/60 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
              >
                {/* Image Banner */}
                <div className="h-56 relative overflow-hidden bg-slate-100">
                  <img
                    src={facility.images[0]}
                    alt={facility.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                  {/* Top Category Badge */}
                  <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs border border-slate-200">
                    <Check size={9} className="stroke-[3] text-purple-600" />
                    <span className="text-[8px] font-black text-slate-800 uppercase tracking-tight">{facility.type || "Resort"}</span>
                  </div>

                  {/* Top Rating Badge */}
                  <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs border border-slate-200">
                    <Star size={9} className="text-amber-500 fill-amber-500" />
                    <span className="text-[9px] font-black text-slate-800">{facility.rating}</span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-1">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base group-hover:text-purple-600 transition-colors truncate">
                        {facility.name}
                      </h3>
                      <button className="text-slate-300 hover:text-rose-500 transition-colors">
                        <HeartPulse size={18} />
                      </button>
                    </div>
                    
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified Area')}</span>
                    </p>

                    {/* Compact Amenities/Services badging */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(() => {
                        const sList = Array.isArray(facility.services_offered) && facility.services_offered.length > 0
                          ? facility.services_offered.map((s: any) => s.name || s)
                          : Array.isArray(facility.amenities) && facility.amenities.length > 0
                          ? facility.amenities
                          : ['AC Suite', 'Vet On-Call', 'Play Area'];
                        
                        return sList.slice(0, 2).map((srv: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold">
                            {srv}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 line-through font-semibold leading-none">{formatRupee(facility.mrpPrice)}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-slate-900 font-bold text-xs">₹</span>
                          <span className="text-lg font-black text-slate-900 leading-none">{facility.priceFrom}</span>
                          <span className="text-[10px] text-slate-500 font-semibold">/night</span>
                        </div>
                      </div>
                    </div>

                    {/* Single Row Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setShowContactModal(facility)}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 text-slate-700 hover:text-purple-700 transition-all shadow-sm"
                        title="Call Now"
                      >
                        <Phone size={18} />
                      </button>

                      <button
                        onClick={() => {
                          const cleanPhone = (facility.phone || '919876543210').replace(/[\s+-]/g, '');
                          const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                          const msg = `Hi ${facility.name}, I found you on GouujiPets and would like to inquire about boarding/services for my pet!`;
                          window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-[#25D366]/10 border border-slate-200 hover:border-[#25D366]/30 text-slate-700 hover:text-[#25D366] transition-all shadow-sm"
                        title="WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/checkout/${facility.id || facility._id}`, { state: { facility } }) }}
                        className="flex-1 py-3 bg-slate-900 hover:bg-purple-600 text-white font-black text-sm rounded-xl transition-all shadow-md text-center flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>Book</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      </section>

      {/* ========== EMERGENCY VET & CLINIC CAROUSEL ========== */}
      <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto my-6 bg-gradient-to-r from-rose-50 to-red-50 border border-red-200 text-slate-900 rounded-3xl relative overflow-hidden shadow-xs">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max mb-3 shadow-2xs">
              <HeartPulse size={13} /> 24/7 EMERGENCY & AMBULANCE DISPATCH
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mb-2 leading-tight text-slate-900">
              Need Urgent Veterinary Assistance or ICU Care?
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              Our verified emergency hospitals offer oxygen support, surgical ICUs, and on-call specialist doctors ready within 15 minutes anywhere across {selectedCity}.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                alert("Direct Emergency Dispatch Hotline: 1800-PET-EMERGENCY (Connected to nearest 24/7 hospital)");
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
            >
              <Phone size={16} className="text-white animate-bounce" />
              <span>Call Emergency Line</span>
            </button>
            <button
              onClick={() => navigate('/boarding?type=veterinary')}
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-6 py-3.5 rounded-2xl border border-slate-300 text-center text-sm transition-colors shadow-2xs"
            >
              Explore 24/7 Clinics
            </button>
          </div>
        </div>
      </section>

      {/* ========== WHY TRUST GOUUJIPETS (VERIFIED CARE Features) ========== */}
      <section className="py-16 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 rounded-[40px] p-8 sm:p-14 border border-purple-500/20 shadow-[0_30px_80px_-20px_rgba(124,58,237,0.15)] relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-purple-300 font-black text-[10px] uppercase tracking-widest mb-4 border border-white/10">
              <ShieldCheck size={12} />
              Gouuji Assured™
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">Why 50,000+ Pet Parents Trust Us</h2>
            <p className="text-sm sm:text-base text-purple-200/70 font-medium max-w-xl mb-10">Every facility undergoes a rigorous 42-point physical inspection before listing.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: ShieldCheck, title: "100% Background Checked", desc: "Every resort owner, groomer & vet's credentials verified.", color: "text-purple-400 bg-purple-500/20 border-purple-500/30" },
                { icon: Users, title: "Expert Care Managers", desc: "Dedicated professionals for round-the-clock care.", color: "text-blue-400 bg-blue-500/20 border-blue-500/30" },
                { icon: CheckCircle2, title: "Instant Booking", desc: "Transparent pricing. Zero cancellation fees up to 24h.", color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30" },
                { icon: Award, title: "Verified Reviews", desc: "Only completed verified stays can submit ratings.", color: "text-amber-400 bg-amber-500/20 border-amber-500/30" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-all group">
                  <div>
                    <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4 border`}>
                      <item.icon size={22} />
                    </div>
                    <h3 className="font-black text-white text-sm mb-2">{item.title}</h3>
                    <p className="text-xs text-purple-200/60 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== ABOUT GOUUJIPETS ========== */}
      <section className="py-10 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-purple-700 uppercase tracking-widest bg-purple-100 px-3 py-1 rounded-full mb-3">
              🐾 OUR STORY
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
              India's Most Trusted Pet Care Marketplace
            </h2>
            <p className="text-slate-600 text-sm font-semibold max-w-2xl mx-auto leading-relaxed">
              GouujiPets was founded by pet parents, for pet parents. We connect India's most caring and verified pet service professionals directly with families who love their animals.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { stat: facilities.length > 0 ? `${facilities.length}+` : 'Growing', label: 'Verified Partners', icon: '🏨' },
              { stat: '24/7', label: 'Emergency Support', icon: '🚨' },
              { stat: '100%', label: 'Background Checked', icon: '🛡️' },
              { stat: '5★', label: 'Average Rating', icon: '⭐' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center border border-slate-200/80 shadow-xs">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-2xl font-black text-slate-900">{item.stat}</div>
                <div className="text-xs font-bold text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: '🔍 Smart Matching', desc: 'Our AI matches your pet\'s breed, age, and health requirements with the perfect local care facility.' },
              { title: '📱 Real-Time Updates', desc: 'Get live photo/video updates, GPS tracking, and instant messages from your pet\'s caretaker during their stay.' },
              { title: '💳 Secure Payments', desc: 'All transactions are encrypted and traceable. Transparent pricing with zero hidden fees.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <h3 className="font-black text-slate-900 text-sm mb-2">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/partner/login')}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-3.5 rounded-2xl shadow-md transition-all active:scale-95 text-sm"
            >
              🤝 Become a Verified Partner
            </button>
            <p className="text-slate-500 text-xs mt-3 font-semibold">Join hundreds of pet care professionals on India's fastest growing pet marketplace.</p>
          </div>
        </div>
      </section>

      {/* ========== CONTACT / CALL MODAL ========== */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative"
            >
              <button
                onClick={() => setShowContactModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4">
                <img src={showContactModal.images?.[0]} alt="" className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />
                <div>
                  <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Verified Partner</span>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mt-0.5">{showContactModal.name}</h3>
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <MapPin size={12} className="text-black" /> {typeof showContactModal.address === 'string' ? showContactModal.address : 'Verified Center'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between items-center">
                  <span>📞 Direct Phone / Helpdesk:</span>
                  <span className="text-black font-black">{showContactModal.phone || "+91 98765 43210"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>⏰ Business Hours:</span>
                  <span className="text-slate-900 font-black">{showContactModal.open24Hours ? '24/7 Open All Days' : '8:00 AM - 9:00 PM'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>🛡️ Gouuji Assured ID:</span>
                  <span className="text-slate-900 font-black">#GP-{showContactModal.id?.slice(0, 6).toUpperCase() || '7721A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${showContactModal.phone || '+919876543210'}`}
                  className="w-full py-3 bg-transparent border border-black/50 hover:bg-black/10 text-black font-black rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-all text-center"
                >
                  <Phone size={14} /> Call Business
                </a>
                <button
                  onClick={() => {
                    const cleanPhone = (showContactModal.phone || '919876543210').replace(/[\s+-]/g, '');
                    const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                    const msg = `Hi ${showContactModal.name}, I am interested in booking boarding/services for my pet from GouujiPets. Please share details!`;
                    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="w-full py-3 bg-transparent border border-black/30 hover:bg-black/10 text-black font-black rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-all"
                >
                  <MessageCircle size={14} className="text-black" /> WhatsApp Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PublicFooter />
      <PublicBottomNav />
    </PageTransition>
  );
};

