import { useNavigate } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import { PublicNavbar } from "../../components/layout/PublicNavbar";
import { PublicFooter } from "../../components/layout/PublicFooter";
import { PublicBottomNav } from "../../components/navigation/PublicBottomNav";
import { ServiceQuickLinks } from "../../components/navigation/ServiceQuickLinks";
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

export const PublicHome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal } = useAuthStore();
  const [searchLocation, setSearchLocation] = useState("Bangalore / Near Me");
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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
    navigate(`/boarding?query=${encodeURIComponent(q)}&category=${activeCategoryTab === 'all' ? '' : activeCategoryTab}`);
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
    <PageTransition className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] font-sans overflow-x-hidden pb-20 md:pb-6 relative">
      <PublicNavbar />
      <ServiceQuickLinks />

      {/* ========== HERO SECTION (NEW & STUNNING) ========== */}
      <section className="relative pt-10 pb-16 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden border-b border-slate-200/60">
        

        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="bg-transparent p-8 sm:p-10 rounded-[40px] mx-auto max-w-3xl flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-sm mb-6"
            >
              <Sparkles size={14} className="text-purple-600" />
              India's #1 Verified Pet Care Network
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight"
            >
              Find the Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Care</span> <br className="hidden sm:block" /> for your Best Friend
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto mt-6"
            >
              Book verified boarding resorts, professional groomers, and 24/7 vets near you. Transparent pricing, instant booking, and peace of mind.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-4 max-w-2xl mx-auto"
          >
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 shadow-xl focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all z-20 relative">
              <div className="flex items-center w-full sm:w-auto flex-1 gap-2 px-4 py-2 border-b sm:border-b-0 sm:border-r border-slate-200">
                <MapPin size={20} className="text-black shrink-0" />
                <select
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full bg-transparent text-slate-900 font-bold focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="Bangalore / Near Me">Bangalore / Near Me</option>
                  <option value="Indiranagar">Indiranagar</option>
                  <option value="Koramangala">Koramangala</option>
                  <option value="Whitefield">Whitefield</option>
                </select>
              </div>
              <div className="flex items-center w-full flex-[2] gap-2 px-4 py-2">
                <Search size={20} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resorts, groomers, vets..."
                  className="w-full bg-transparent text-slate-900 font-medium focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <button type="submit" className="w-full sm:w-auto bg-black border border-black hover:bg-black/80 text-white font-black px-8 py-4 rounded-xl shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap">
                Search
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ========== SIMPLIFIED CORE CATEGORIES ========== */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-center mb-8 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Our Core Services
            </h2>
            <p className="text-slate-600 font-semibold mt-2">Select a category to explore verified partners</p>
          </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {CoreCategories.map((cat) => (
            <div
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
              className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 cursor-pointer flex flex-col items-center text-center hover:-translate-y-1 z-10 shadow-xs hover:shadow-md ${
                activeCategoryTab === cat.id ? "border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/50" : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-4 transition-colors shadow-inner border border-slate-200/60">
                <span className="group-hover:scale-110 transition-transform">{cat.icon}</span>
              </div>
              <h3 className="font-black text-base text-slate-900 transition-colors mb-1">
                {cat.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {cat.desc}
              </p>
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-slate-200/60 h-72 rounded-2xl border border-slate-200"></div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredFacilities.map((facility, idx) => (
              <motion.div
                key={facility.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => navigate(`/facility/${facility.id || facility._id}`, { state: { facility } })}
                className="group bg-white rounded-2xl border border-slate-200/80 hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative shadow-xs"
              >
                {/* Image Banner */}
                <div className="h-40 sm:h-48 relative overflow-hidden bg-slate-100 rounded-t-2xl">
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

                {/* Card Content & Specifications */}
                <div className="p-3 flex-1 flex flex-col justify-between gap-1">
                  <div>
                    <h3 className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-purple-600 transition-colors truncate">
                      {facility.name}
                    </h3>
                    
                    <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5 mt-0.5">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      <span className="truncate">{typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified Area')}</span>
                    </p>

                    {/* Compact Amenities/Services badging */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(() => {
                        const sList = Array.isArray(facility.services_offered) && facility.services_offered.length > 0
                          ? facility.services_offered.map((s: any) => s.name || s)
                          : Array.isArray(facility.amenities) && facility.amenities.length > 0
                          ? facility.amenities
                          : ['AC Suite', 'Vet On-Call', 'Play Area'];
                        
                        return sList.slice(0, 2).map((srv: string, i: number) => (
                          <span key={i} className="bg-slate-50 text-slate-600 border border-slate-200/80 px-1.5 py-0.5 rounded text-[8px] font-semibold">
                            ✔ {srv}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="mt-auto pt-2">
                    <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                      <span className="text-[8px] text-slate-400 line-through font-semibold">{formatRupee(facility.mrpPrice)}</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-slate-900 font-bold text-[10px]">₹</span>
                        <span className="text-xs sm:text-sm font-black text-slate-900">{facility.priceFrom}</span>
                        <span className="text-[8px] text-slate-500 font-semibold">/day</span>
                      </div>
                    </div>

                    {/* Single Row Actions */}
                    <div className="flex items-center gap-1 mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setShowContactModal(facility)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                        title="Call Now"
                      >
                        <Phone size={16} />
                      </button>

                      <button
                        onClick={() => {
                          const cleanPhone = (facility.phone || '919876543210').replace(/[\s+-]/g, '');
                          const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                          const msg = `Hi ${facility.name}, I found you on GouujiPets and would like to inquire about boarding/services for my pet!`;
                          window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </button>

                      <button
                        onClick={() => navigate(`/checkout/${facility.id || facility._id}`, { state: { facility } })}
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-purple-600 text-white font-black text-xs rounded-xl transition-all shadow-sm text-center flex items-center justify-center gap-1"
                      >
                        <span>⚡ Book Stay</span>
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
      <section className="py-10 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 text-center mb-2">Why 50,000+ Pet Parents Trust Gouuji Assured™</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-semibold text-center max-w-xl mx-auto mb-8">Every facility on our platform undergoes a rigorous 42-point physical inspection before listing.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: "100% Background Checked", desc: "Every resort owner, groomer & vet doctor's credentials are verified physically.", color: "text-purple-600 bg-purple-50" },
            { icon: Users, title: "Expert Care Managers", desc: "Dedicated professionals looking after your pet's needs round the clock.", color: "text-blue-600 bg-blue-50" },
            { icon: CheckCircle2, title: "Instant Booking & Refund", desc: "Book suites right away with transparent pricing. Zero cancellation fees up to 24h before.", color: "text-emerald-600 bg-emerald-50" },
            { icon: Award, title: "Verified Customer Reviews", desc: "Only pet parents who completed verified stays can submit ratings & testimonials.", color: "text-amber-600 bg-amber-50" },
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all shadow-xs">
              <div>
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3 border border-slate-200/60`}>
                  <item.icon size={20} />
                </div>
                <h3 className="font-black text-slate-900 text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
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

