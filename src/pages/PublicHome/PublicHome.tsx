import { useNavigate } from "react-router-dom";
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
import { LocationSelectorSheet } from "../../components/location/LocationSelectorSheet";
import { useLocationStore } from "../../store/useLocationStore";

export const PublicHome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal, setIntendedRoute } = useAuthStore();
  
  const handleProtectedNavigate = (path: string) => {
    if (!isAuthenticated) {
      setIntendedRoute(path);
      openLoginModal();
    } else {
      navigate(path);
    }
  };
  const [searchLocation, setSearchLocation] = useState("Bangalore / Near Me");
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("All Bangalore");
  const [showContactModal, setShowContactModal] = useState<any | null>(null);
  
  // State for the big hero location picker
  const [heroLocationSheetOpen, setHeroLocationSheetOpen] = useState(false);
  const { currentLocation, isDetecting } = useLocationStore();

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchFacilities = () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'businesses'));
        
        unsubscribe = onSnapshot(q, async (bSnap) => {
          try {
            let data: any[] = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime());

            if (data && data.length > 0) {
              const filtered = filterRealBusinesses(data);
              
              const ownerIds = filtered.map((b: any) => b.owner_id).filter(Boolean);
              let ownersMap = new Map();
              if (ownerIds.length > 0) {
                let owners: any[] = [];
                for (let i = 0; i < ownerIds.length; i += 10) {
                  const chunk = ownerIds.slice(i, i + 10);
                  try {
                    const uQ = query(collection(db, 'users'), where('id', 'in', chunk));
                    const uSnap = await getDocs(uQ);
                    owners.push(...uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                  } catch (err) {
                    console.warn("Could not fetch owner details", err);
                  }
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
          } catch (err) {
            console.error("Error processing facilities data", err);
          } finally {
            setIsLoading(false);
          }
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
    <div className="font-sans bg-white overflow-hidden">
      <main className="min-h-screen relative">

      {/* ========== HERO SECTION (NEW AESTHETIC) ========== */}
      <section className="relative pt-16 lg:pt-24 pb-32 px-4 sm:px-6 lg:px-8 bg-[var(--color-petwise-bg)]">
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Text Content */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="relative inline-block">
              <span className="font-script text-3xl sm:text-4xl text-slate-800 absolute -top-8 -left-4 sm:-left-8 -rotate-6">
                Welcome To GouujiPets
              </span>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-black tracking-tight leading-tight mt-6 relative z-10"
              >
                The Best Care For<br/>Your Best Friend
              </motion.h1>
              {/* Decorative sparks */}
              <div className="absolute top-0 right-0 sm:-right-10 text-[var(--color-petwise-brown)] hidden sm:block opacity-50 text-2xl">✨</div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 max-w-xl mx-auto lg:mx-0"
            >
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch gap-2 bg-white p-2 rounded-full border border-slate-200/80 shadow-xl focus-within:ring-2 focus-within:ring-[var(--color-petwise-brown)]/20 transition-all z-20 relative">
                
                <div className="flex items-center w-full sm:w-[40%] border-b sm:border-b-0 sm:border-r border-slate-200 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setHeroLocationSheetOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-full transition-colors group"
                  >
                    <MapPin size={18} className="text-[var(--color-petwise-brown)] shrink-0" />
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-900 truncate w-full text-left">
                        {currentLocation ? (currentLocation.area || currentLocation.city || currentLocation.formatted_address) : 'Select Location'}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="flex items-center w-full flex-1 gap-2 px-3 py-2">
                  <Search size={18} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resorts, groomers..."
                    className="w-full bg-transparent text-slate-900 font-medium focus:outline-none placeholder:text-slate-400 text-sm"
                  />
                </div>
                <button type="submit" className="w-full sm:w-auto bg-[var(--color-petwise-brown)] hover:bg-[var(--color-petwise-brown-hover)] text-white font-black px-6 py-3 rounded-full transition-all active:scale-95 shrink-0 whitespace-nowrap">
                  Search Directory
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex-1 relative w-full max-w-[500px] aspect-square mx-auto"
          >
            {/* Brush stroke border effect created with rounded circle and pseudo-elements */}
            <div className="absolute inset-0 rounded-full border-[8px] border-dashed border-[var(--color-petwise-brown)]/20 animate-spin-slow"></div>
            <div className="absolute inset-2 rounded-full overflow-hidden border-4 border-white shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800" 
                alt="Happy dog and owner" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating paw prints */}
            <div className="absolute -bottom-4 -right-4 text-4xl opacity-40 animate-bounce" style={{animationDelay: '1s'}}>🐾</div>
            <div className="absolute top-10 -left-6 text-3xl opacity-30 animate-pulse">🦴</div>
          </motion.div>
        </div>

        {/* Wavy bottom divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-0 transform translate-y-px text-white">
          <svg className="relative block w-full h-[60px] sm:h-[100px] fill-current" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118,130.81,119.56,192.39,105.46,236.21,95.53,280.4,75.12,321.39,56.44Z"></path>
          </svg>
        </div>
        
        {/* Hidden sheet triggered by the hero button */}
        <LocationSelectorSheet open={heroLocationSheetOpen} onClose={() => setHeroLocationSheetOpen(false)} />
      </section>

      {/* ========== OUR SERVICES SECTION ========== */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
        <div className="text-center mb-12">
          <span className="font-script text-3xl text-slate-800 mb-1 block">Our Services</span>
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            All Pet Care Services
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {/* Card 1: Boarding */}
          <div
            onClick={() => handleProtectedNavigate('/boarding')}
            className="group cursor-pointer flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--color-petwise-peach)] flex flex-col items-center justify-center p-4 transition-transform group-hover:-translate-y-2 group-hover:shadow-xl">
              <span className="text-4xl mb-2">🏠</span>
              <h3 className="font-black text-black text-sm sm:text-base">Boarding</h3>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-1 leading-tight hidden sm:block">Safe home away from home</p>
            </div>
          </div>
          
          {/* Card 2: Daycare */}
          <div
            onClick={() => handleProtectedNavigate('/boarding?type=daycare')}
            className="group cursor-pointer flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--color-petwise-pink)] flex flex-col items-center justify-center p-4 transition-transform group-hover:-translate-y-2 group-hover:shadow-xl">
              <span className="text-4xl mb-2">🌞</span>
              <h3 className="font-black text-black text-sm sm:text-base">Daycare</h3>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-1 leading-tight hidden sm:block">Supervised active play</p>
            </div>
          </div>

          {/* Card 3: Grooming (General) */}
          <div
            onClick={() => handleProtectedNavigate('/grooming')}
            className="group cursor-pointer flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--color-petwise-yellow)] flex flex-col items-center justify-center p-4 transition-transform group-hover:-translate-y-2 group-hover:shadow-xl">
              <span className="text-4xl mb-2">💇</span>
              <h3 className="font-black text-black text-sm sm:text-base">Grooming</h3>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-1 leading-tight hidden sm:block">Professional spa treatments</p>
            </div>
          </div>

          {/* Card 4: Veterinary */}
          <div
            onClick={() => handleProtectedNavigate('/veterinary')}
            className="group cursor-pointer flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--color-petwise-green)] flex flex-col items-center justify-center p-4 transition-transform group-hover:-translate-y-2 group-hover:shadow-xl">
              <span className="text-4xl mb-2">🩺</span>
              <h3 className="font-black text-black text-sm sm:text-base">Vet Care</h3>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-1 leading-tight hidden sm:block">Routine & emergency care</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => handleProtectedNavigate('/boarding')}
            className="bg-[var(--color-petwise-brown)] hover:bg-[var(--color-petwise-brown-hover)] text-white font-bold px-8 py-3.5 rounded-lg shadow-md transition-colors"
          >
            See All Services
          </button>
        </div>
      </section>

      {/* ========== ABOUT US SECTION ========== */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#fbfbfb]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Left Image (Arch Mask) */}
          <div className="flex-1 relative w-full max-w-md mx-auto">
            <div className="absolute -top-10 -left-10 text-[var(--color-petwise-brown)] opacity-40 text-4xl hidden sm:block">✨</div>
            {/* Arch shaped container */}
            <div className="w-full aspect-[3/4] bg-[var(--color-petwise-brown)]/10 rounded-t-full rounded-b-[40px] overflow-hidden relative shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=600" 
                alt="Happy dog" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Text Content */}
          <div className="flex-1 space-y-6">
            <div>
              <span className="font-script text-3xl text-slate-800 mb-1 block">About Us</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tight leading-tight">
                Our Journey To GouujiPets <br/>A Passion For Pets
              </h2>
            </div>
            
            <p className="text-slate-500 font-medium leading-relaxed">
              Every facility on our platform undergoes a rigorous 42-point physical inspection before listing. We connect India's most caring and verified pet service professionals directly with families who love their animals.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {[
                "100% Background Checked", 
                "24/7 Emergency Support", 
                "Instant Booking & Refund", 
                "Verified Customer Reviews",
                "50,000+ Happy Pets",
                "Top Tier Veterinary Clinics"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[var(--color-petwise-brown)] text-sm">🐾</span>
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button 
                onClick={() => navigate('/contact')}
                className="bg-[var(--color-petwise-brown)] hover:bg-[var(--color-petwise-brown-hover)] text-white font-bold px-8 py-3.5 rounded-lg shadow-md transition-colors"
              >
                More About Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== WHY CHOOSE US (VERIFIED DIRECTORY) ========== */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto bg-white">
        <div className="text-center mb-12">
          <span className="font-script text-3xl text-slate-800 mb-1 block">Why Choose Us</span>
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            Your Pets Will <br/>Be Extremely Happy With Us
          </h2>
        </div>

        {/* Existing Grid for Featured Businesses */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-xl text-slate-900">Popular Local Partners</h3>
          <button
            onClick={() => navigate('/boarding')}
            className="text-[var(--color-petwise-brown)] hover:text-[var(--color-petwise-brown-hover)] font-bold text-sm flex items-center gap-1"
          >
            Explore Directory <ChevronRight size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-slate-100 h-72 rounded-[32px]"></div>
            ))}
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-slate-50 rounded-[32px] p-10 text-center max-w-md mx-auto">
            <h3 className="font-black text-slate-900 text-lg mb-2">No matching partners found</h3>
            <p className="text-sm text-slate-500 mb-6">We couldn't find facilities in this area.</p>
            <button 
              onClick={() => { setSearchQuery(""); setActiveCategoryTab("all"); }}
              className="px-6 py-3 rounded-xl bg-[var(--color-petwise-brown)] hover:bg-[var(--color-petwise-brown-hover)] transition-colors text-white font-bold"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFacilities.slice(0, 4).map((facility, idx) => (
              <motion.div
                key={facility.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => {
                  if (!isAuthenticated) navigate(`/login/user?redirect=/facility/${facility.id || facility._id}`);
                  else navigate(`/facility/${facility.id || facility._id}`, { state: { facility } });
                }}
                className="group bg-white rounded-[32px] border border-slate-100 hover:-translate-y-2 hover:shadow-2xl hover:border-[var(--color-petwise-brown)]/30 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
              >
                <div className="h-48 relative overflow-hidden bg-slate-100">
                  <img
                    src={facility.images[0]}
                    alt={facility.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-slate-800">{facility.rating}</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-[var(--color-petwise-brown)] transition-colors truncate">
                      {facility.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      {typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified Area')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-900 font-bold text-xs">₹</span>
                      <span className="text-xl font-black text-slate-900">{facility.priceFrom}</span>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-[var(--color-petwise-brown)] group-hover:text-white flex items-center justify-center transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ========== CONTACT MODAL ========== */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowContactModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4">
                <img src={showContactModal.images?.[0]} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{showContactModal.name}</h3>
                  <p className="text-xs font-bold text-slate-500">{typeof showContactModal.address === 'string' ? showContactModal.address : 'Verified Center'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6">
                <a
                  href={`tel:${showContactModal.phone || '+919876543210'}`}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 font-black rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <Phone size={14} /> Call
                </a>
                <button
                  onClick={() => {
                    const cleanPhone = (showContactModal.phone || '919876543210').replace(/[\s+-]/g, '');
                    const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                    const msg = `Hi ${showContactModal.name}, I found you on GouujiPets!`;
                    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </main>
    </div>
  );
};
