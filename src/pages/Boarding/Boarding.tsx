import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { Search, MapPin, Filter, Star, CheckCircle, Calendar, Sparkles, HeartPulse, Award, ChevronRight, X, Check, Tag, Phone, ShieldCheck, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatRupee } from "../../utils/currency";
import { useAuthStore } from "../../store/useAuthStore";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, orderBy, where, documentId, onSnapshot } from "firebase/firestore";
import { MVP_CATEGORIES, ALL_CATEGORIES, getCategoryById } from "../../lib/serviceCategories";
import { filterRealBusinesses } from "../../utils/filterRealBusinesses";

export const Boarding = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, openLoginModal } = useAuthStore();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || searchParams.get("service") || "");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || searchParams.get("type") || "all");
  
  // Parse required services passed via URL (e.g. from /services page or filters)
  const initialServicesParam = searchParams.get("services");
  const initialServicesList = initialServicesParam ? initialServicesParam.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean) : [];
  const [selectedServicesFilter, setSelectedServicesFilter] = useState<string[]>(initialServicesList);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const [searchDate, setSearchDate] = useState(today);

  // Sync URL changes into local state if navigated back or forward
  useEffect(() => {
    const urlServices = searchParams.get("services");
    if (urlServices) {
      setSelectedServicesFilter(urlServices.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean));
    } else {
      setSelectedServicesFilter([]);
    }
    const urlCat = searchParams.get("category") || searchParams.get("type") || "all";
    setActiveCategory(urlCat);
  }, [searchParams]);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchFacilities = () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'businesses'), orderBy('created_at', 'desc'));
        
        unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
          if (data && data.length > 0) {
            const filtered = filterRealBusinesses(data);
            
            // Fetch owners for these businesses to get their phone/email fallback
            const ownerIds = filtered.map((b: any) => b.owner_id).filter(Boolean);
            let ownersMap = new Map();
            if (ownerIds.length > 0) {
              const chunks = [];
              for (let i = 0; i < ownerIds.length; i += 10) chunks.push(ownerIds.slice(i, i + 10));
              const owners = [];
              for (const chunk of chunks) {
                const ownerQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const ownerSnap = await getDocs(ownerQuery);
                owners.push(...ownerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
              }
              if (owners.length > 0) {
                ownersMap = new Map(owners.map((o: any) => [o.id, o]));
              }
            }

            const formattedData = filtered.map((biz: any) => {
              const owner = ownersMap.get(biz.owner_id) as any;
              return {
                ...biz,
                rating: biz.rating || 4.9,
                images: Array.isArray(biz.images) && biz.images.length > 0 ? biz.images : [biz.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800'],
                priceFrom: biz.price_per_night || biz.price_from || biz.base_rate_per_day || biz.priceFrom || 999,
                capacity: biz.capacity || 10,
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
          console.error("Failed to fetch boarding facilities", err);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error setting up boarding facilities listener", err);
        setIsLoading(false);
      }
    };
    
    fetchFacilities();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const toggleRequiredServiceFilter = (srvName: string) => {
    setSelectedServicesFilter(prev => {
      const next = prev.includes(srvName) ? prev.filter(s => s !== srvName) : [...prev, srvName];
      if (next.length > 0) {
        setSearchParams({ ...Object.fromEntries(searchParams), services: next.join(',') });
      } else {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("services");
        setSearchParams(newParams);
      }
      return next;
    });
  };

  const filteredFacilities = facilities.filter(f => {
    let svcs = f.services_offered;
    if (typeof svcs === 'string') {
      try { svcs = JSON.parse(svcs); } catch (e) { svcs = []; }
    }
    let amens = f.amenities;
    if (typeof amens === 'string') {
      amens = amens.split(',');
    }

    const searchLower = searchQuery.toLowerCase().trim();
    const searchTokens = searchLower.split(/\s+/).filter(Boolean);

    const matchesSearch = !searchLower ? true : (
      (f.name && f.name.toLowerCase().includes(searchLower)) ||
      (f.address && f.address.toLowerCase().includes(searchLower)) ||
      (f.type && f.type.toLowerCase().includes(searchLower)) ||
      (f.description && f.description.toLowerCase().includes(searchLower)) ||
      (Array.isArray(svcs) && svcs.some((s: any) => {
        const sName = (s.name || s || "").toString().toLowerCase();
        const sDesc = (s.description || "").toString().toLowerCase();
        const sCat = (s.category || "").toString().toLowerCase();
        return sName.includes(searchLower) || sDesc.includes(searchLower) || sCat.includes(searchLower) ||
               searchTokens.every(t => sName.includes(t) || sDesc.includes(t) || sCat.includes(t));
      })) ||
      (Array.isArray(amens) && amens.some((a: string) => a.toLowerCase().includes(searchLower) || searchTokens.every(t => a.toLowerCase().includes(t))))
    );
                          
    const matchesCategory = activeCategory === "all" ? true : (
      (f.type && f.type.toLowerCase().includes(activeCategory.toLowerCase())) ||
      (f.category && f.category.toLowerCase().includes(activeCategory.toLowerCase())) ||
      (Array.isArray(svcs) && svcs.some((s: any) => (s.category || s.name || s || "").toString().toLowerCase().includes(activeCategory.toLowerCase())))
    );

    const matchesRequiredServices = selectedServicesFilter.length === 0 ? true : selectedServicesFilter.every(req => {
      const reqTokens = req.toLowerCase().split(/\s+/).filter(Boolean);
      
      const inServicesOffered = Array.isArray(svcs) && svcs.some((s: any) => {
        const sName = (s.name || s || "").toString().toLowerCase();
        const sCat = (s.category || "").toString().toLowerCase();
        return reqTokens.some(token => sName.includes(token) || sCat.includes(token));
      });
      
      const inAmenities = Array.isArray(amens) && amens.some((a: string) => {
        const aLower = a.toLowerCase();
        return reqTokens.some(token => aLower.includes(token));
      });
      
      const fType = (f.type || "").toLowerCase();
      const inType = reqTokens.some(token => fType.includes(token));
      
      return inServicesOffered || inAmenities || inType;
    });

    return matchesSearch && matchesCategory && matchesRequiredServices;
  });

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("category", category);
      return p;
    });
  };

  return (
    <PageTransition className="pb-16 max-w-7xl mx-auto px-2.5 sm:px-6 font-sans">
      
      {/* Hero Banner & Search Header in Light Purple Color Only */}
      <div className="pt-3 pb-3 bg-purple-50/60 relative z-30 border-b border-purple-200 mb-3 px-3 rounded-2xl shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2.5 gap-2">
          <div>
            <div className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1 mb-0.5">
              <Sparkles size={12} className="text-purple-600" /> Verified Pet Care Network • Upfront Transparent Pricing
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">Explore Luxury Stays & Clinics</h1>
          </div>

          {/* Category Filter Pills */}
          <div className="overflow-x-auto pb-1 -mx-2.5 px-2.5 sm:mx-0 sm:px-0 custom-scrollbar">
            <div className="flex gap-1.5 w-max">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all shrink-0 ${activeCategory === 'all' ? 'bg-purple-600 text-white shadow-xs scale-102' : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100 hover:text-purple-950'}`}
              >
                All Categories
              </button>
              {MVP_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shrink-0 ${activeCategory === cat.id ? 'bg-purple-600 text-white shadow-xs scale-102' : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100 hover:text-purple-950'}`}
                >
                  <cat.icon size={13} />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Search Bar & Filter Button Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, resort name, or service (e.g. AC Rooms, Grooming)..." 
              className="w-full h-10 pl-9 pr-3 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 placeholder:text-purple-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-600 transition-all shadow-inner outline-none"
            />
          </div>
          
          <div className="relative shrink-0 flex items-center bg-white border border-purple-200 rounded-xl px-3 h-10 shadow-2xs hover:border-purple-400 transition-colors">
            <Calendar size={14} className="text-purple-600 mr-2" />
            <input 
              type="date" 
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-transparent border-none text-xs font-extrabold text-purple-950 outline-none cursor-pointer"
            />
          </div>

          <button 
            onClick={() => setShowFilterModal(true)}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0 relative"
          >
            <Filter size={14} />
            <span>Required Services Filter</span>
            {selectedServicesFilter.length > 0 && (
              <span className="w-4 h-4 bg-white text-purple-900 rounded-full text-[9px] font-black flex items-center justify-center shadow-2xs">
                {selectedServicesFilter.length}
              </span>
            )}
          </button>
        </div>



        {/* Active Required Services Bar */}
        {selectedServicesFilter.length > 0 && (
          <div className="mt-2 pt-2 border-t border-purple-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Required by Pet:</span>
              {selectedServicesFilter.map((srv, idx) => (
                <span key={idx} className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 shadow-2xs">
                  <span>{srv}</span>
                  <button onClick={() => toggleRequiredServiceFilter(srv)} className="hover:text-purple-200 font-black">×</button>
                </span>
              ))}
            </div>
            <button 
              onClick={() => {
                setSelectedServicesFilter([]);
                const newP = new URLSearchParams(searchParams);
                newP.delete("services");
                setSearchParams(newP);
              }}
              className="text-xs font-extrabold text-purple-700 hover:text-purple-950 underline"
            >
              Clear Service Filters
            </button>
          </div>
        )}
      </div>

      {/* Grid List - Horizontal Cards Directory */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex flex-col gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse bg-slate-100 h-14 sm:h-16 border-b border-slate-200"></div>
            ))}
          </div>
        ) : filteredFacilities.length > 0 ? (
          <div className="flex flex-col border border-slate-200 rounded-sm bg-white overflow-hidden">
            {filteredFacilities.map((facility, index) => (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/facility/${facility.id}`, { state: { facility, selectedServices: selectedServicesFilter } })}
                className="group cursor-pointer bg-white border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors duration-200 flex flex-row relative"
              >
                {/* Image */}
                <div className="w-[88px] sm:w-28 shrink-0 relative bg-slate-50 overflow-hidden flex self-stretch min-h-[72px] sm:min-h-[64px]">
                  <img 
                    src={facility.images[0]} 
                    alt={facility.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-1 left-1 flex flex-row flex-wrap gap-1 w-[calc(100%-8px)] overflow-hidden">
                    {(() => {
                      const typeStr = facility.type || 'Boarding';
                      const types = typeStr.split(',').map((t: string) => t.trim()).filter(Boolean);
                      
                      return types.map((t: string, idx: number) => {
                        const catInfo = getCategoryById(t.toLowerCase());
                        return (
                          <div key={idx} className="bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-slate-200 max-w-full">
                            {catInfo ? <catInfo.icon size={8} className="text-purple-600 shrink-0" /> : <CheckCircle size={8} className="text-purple-600 shrink-0" />}
                            <span className="text-[8px] font-black text-purple-950 uppercase tracking-tight truncate">{catInfo ? catInfo.name : t}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="absolute bottom-1 left-1 bg-white/95 backdrop-blur-md px-1 py-0.5 rounded-sm flex items-center gap-0.5 shadow-sm border border-slate-200">
                    <Star size={8} className="text-purple-600 fill-purple-600" />
                    <span className="text-[9px] font-black text-purple-950">{facility.rating}</span>
                  </div>
                </div>
                
                {/* Content - Justdial Inspired Ultra Thin Mobile Optimized */}
                <div className="p-1.5 sm:px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between flex-1 gap-1.5 min-w-0">
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 w-full">
                      <h3 className="font-black text-xs sm:text-sm text-blue-700 group-hover:underline transition-colors line-clamp-1 truncate flex-1 min-w-0">{facility.name}</h3>
                      <div className="bg-green-100 text-green-700 px-1 py-0.5 rounded-sm text-[8px] font-black uppercase flex items-center gap-0.5 border border-green-200 shrink-0">
                        <CheckCircle size={8} /> <span className="hidden xs:inline">Verified</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5">
                          {facility.rating} <Star size={8} className="fill-white" />
                        </span>
                        <span className="text-[8px] text-slate-500 font-medium hidden sm:inline">120 Ratings</span>
                      </div>
                      <div className="hidden sm:block w-px h-2.5 bg-slate-200"></div>
                      <div className="flex items-center gap-0.5 text-[9px] font-medium text-slate-600 min-w-0">
                        <MapPin size={9} className="shrink-0 text-slate-400" />
                        <span className="truncate max-w-[100px] sm:max-w-[120px] lg:max-w-none">{typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified Location')}</span>
                      </div>
                      <div className="hidden sm:block w-px h-2.5 bg-slate-200"></div>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const sList = Array.isArray(facility.services_offered) && facility.services_offered.length > 0
                            ? facility.services_offered.map((s: any) => s.name || s)
                            : Array.isArray(facility.amenities)
                            ? facility.amenities
                            : typeof facility.amenities === 'string'
                            ? facility.amenities.split(',').map((a: string) => a.trim())
                            : ['Deluxe Suite', '24/7 Care', 'Vet On-Call'];
                          
                          return sList.slice(0, 1).map((srvName: string, idx: number) => {
                            const isHighlighted = selectedServicesFilter.some(req => srvName.toLowerCase().includes(req.toLowerCase()));
                            return (
                              <span 
                                key={idx} 
                                className={`px-1.5 py-0.5 rounded text-[7px] font-bold tracking-tight transition-all ${
                                  isHighlighted
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {srvName}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-1 sm:mt-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-1.5 sm:gap-0.5 pl-0 sm:pl-2 sm:border-l sm:border-slate-100 shrink-0">
                    <div className="flex flex-col sm:flex-col items-start sm:items-end justify-center shrink-0">
                      <div className="flex items-baseline gap-0.5">
                        <p className="text-[11px] sm:text-xs font-black text-purple-950 leading-tight">{formatRupee(facility.priceFrom)}</p>
                      </div>
                      <span className="text-[7px] text-purple-400 line-through font-bold leading-tight">{formatRupee(Math.round(facility.priceFrom * 1.35))}</span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <a 
                        href={`tel:${facility.phone || '+919876543210'}`}
                        className="px-1.5 py-1 rounded-sm bg-green-600 hover:bg-green-700 border border-green-600 text-white font-bold flex items-center gap-1 transition-colors text-[9px]"
                        title="Show Number"
                      >
                        <Phone size={10} />
                        <span className="hidden sm:inline">Call</span>
                      </a>
                      <button 
                        onClick={() => {
                          const cleanPhone = (facility.phone || '919876543210').replace(/[\s+-]/g, '');
                          const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                          const msg = `Hi ${facility.name}, I found you on GouujiPets and would like to inquire about booking/services!`;
                          window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="p-1 rounded-sm bg-slate-100 hover:bg-slate-200 border border-slate-200 text-emerald-700 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle size={12} />
                      </button>
                      <button 
                        onClick={() => { 
                          if (!isAuthenticated) {
                            openLoginModal();
                          } else {
                            navigate(`/checkout/${facility.id || facility._id}`, { state: { facility, selectedServices: selectedServicesFilter } });
                          }
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded-sm transition-all flex items-center justify-center gap-1 whitespace-nowrap"
                      >
                        <span>Enquire</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-purple-50/60 rounded-[36px] border border-purple-200 max-w-xl mx-auto my-8 p-8">
            <div className="w-16 h-16 rounded-3xl bg-white border border-purple-200 text-purple-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search size={28} />
            </div>
            <h3 className="text-xl font-black text-purple-950 mb-2">No exact partner matches required services</h3>
            <p className="text-purple-700 text-sm font-medium mb-6">
              You selected <span className="font-bold text-purple-950">{selectedServicesFilter.join(", ")}</span>. Try removing one or more specific filters or searching across all cities.
            </p>
            <button 
              onClick={() => { 
                setSelectedServicesFilter([]); 
                setSearchQuery(""); 
                handleCategoryChange("all"); 
                const p = new URLSearchParams();
                setSearchParams(p);
              }} 
              className="bg-purple-600 text-white font-black px-6 py-3 rounded-2xl shadow-md hover:bg-purple-700 transition-all text-xs"
            >
              Show All Partner Stays & Clinics
            </button>
          </div>
        )}
      </div>

      {/* ── Required Services Refinement Modal / Drawer in Light Purple ── */}
      <AnimatePresence>
        {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-purple-200 font-sans"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-purple-200 flex items-center justify-between bg-purple-50/60">
                <div>
                  <h3 className="text-xl font-black text-purple-950 flex items-center gap-2">
                    <Filter size={20} className="text-purple-600" /> Filter Facilities by Required Services
                  </h3>
                  <p className="text-xs text-purple-700 mt-0.5 font-medium">Check the exact services your pet needs and we will show matching partners</p>
                </div>
                <button onClick={() => setShowFilterModal(false)} className="p-2 rounded-full hover:bg-purple-100 text-purple-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Checkable Pill Strip */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                {ALL_CATEGORIES.map(cat => (
                  <div key={cat.id} className="space-y-2.5">
                    <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                      <cat.icon size={14} className="text-purple-600" /> {cat.name} Options
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {cat.subServices.map(sub => {
                        const isChecked = selectedServicesFilter.includes(sub.name);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => toggleRequiredServiceFilter(sub.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 active:scale-95 ${
                              isChecked
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${isChecked ? 'bg-white text-purple-600' : 'border border-purple-300'}`}>
                              {isChecked && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span>{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-purple-200 bg-purple-50/80 flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setSelectedServicesFilter([]);
                    const p = new URLSearchParams(searchParams);
                    p.delete("services");
                    setSearchParams(p);
                  }}
                  className="text-xs font-bold text-purple-700 hover:text-purple-950 px-4 py-2"
                >
                  Clear All Filters
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg transition-all text-sm flex items-center gap-2 active:scale-95"
                >
                  <Check size={16} />
                  <span>Show {filteredFacilities.length} Matching Facilities</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </PageTransition>
  );
};
