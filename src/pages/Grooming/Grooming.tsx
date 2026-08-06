import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, documentId, onSnapshot } from "firebase/firestore";
import { Search, MapPin, Filter, Star, CheckCircle, Calendar, Scissors, LayoutGrid, List, Sparkles, TrendingUp, Tag as TagIcon, X, Phone, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatRupee } from "../../utils/currency";
import { useAuthStore } from "../../store/useAuthStore";
import { filterRealBusinesses } from "../../utils/filterRealBusinesses";

export const Grooming = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal } = useAuthStore();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const categories = ["Grooming", "Training", "Walking", "Pet Sitting", "Daycare", "Swimming"];
  
  useEffect(() => {
    let unsubscribe: () => void;

    const fetchFacilities = () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'businesses'), where('type', '==', 'grooming'));
        
        unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          
          if (data) {
            const filtered = filterRealBusinesses(data);
            const ownerIds = filtered.map((b: any) => b.owner_id).filter(Boolean);
            let ownersMap = new Map();
            if (ownerIds.length > 0) {
              let owners: any[] = [];
              for (let i = 0; i < ownerIds.length; i += 10) {
                const chunk = ownerIds.slice(i, i + 10);
                const qUsers = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const snap = await getDocs(qUsers);
                snap.docs.forEach(d => owners.push({ id: d.id, ...d.data() }));
              }
              if (owners.length > 0) {
                ownersMap = new Map(owners.map((o: any) => [o.id, o]));
              }
            }

            const formattedData = filtered.map((biz) => {
              const owner = ownersMap.get(biz.owner_id) as any;
              return {
                ...biz,
                rating: biz.rating || 4.5,
                images: Array.isArray(biz.images) && biz.images.length > 0 ? biz.images : [biz.image_url || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600'],
                priceFrom: biz.price_per_night || biz.price_from || biz.base_rate_per_day || biz.priceFrom || 999,
                phone: biz.contact_phone || owner?.phone || '',
                email: biz.contact_email || owner?.email || ''
              };
            });
            setFacilities(formattedData);
          }
          setIsLoading(false);
        }, (err) => {
          console.error("Failed to fetch services", err);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error setting up services listener", err);
        setIsLoading(false);
      }
    };
    
    fetchFacilities();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredFacilities = facilities.filter(f => {
    const addressStr = typeof f.address === 'string' ? f.address : (f.address?.city || f.address?.street || '');
    const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          addressStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPrice = (f.priceFrom || 0) <= priceRange;
    const matchesRating = (f.rating || 0) >= minRating;
    
    return matchesSearch && matchesPrice && matchesRating;
  });

  const trendingFacilities = [...filteredFacilities].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);

  return (
    <PageTransition className="pt-4 pb-12 max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-8">
      
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <span className="font-bold">Filters & Sorting</span>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-gray-100 rounded-xl"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Left Sidebar (Filters) */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl p-6 overflow-y-auto md:relative md:w-72 md:shadow-none md:p-0 md:bg-transparent md:z-auto ${!isSidebarOpen && 'hidden md:block'}`}
          >
            <div className="flex items-center justify-between mb-8 md:hidden">
              <h2 className="text-xl font-black">Filters</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="relative z-30 space-y-4 bg-white md:bg-gray-50 md:p-3.5 md:rounded-2xl md:border border-gray-100">
              <div>
                <h3 className="font-black text-xs sm:text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                  <Search size={14} className="text-purple-600" />
                  Search
                </h3>
                <input 
                  type="text" 
                  placeholder="Service name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none shadow-2xs"
                />
              </div>

              <div>
                <h3 className="font-black text-xs sm:text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                  <TagIcon size={16} className="text-purple-600" />
                  Max Price: {formatRupee(priceRange)}
                </h3>
                <input 
                  type="range" 
                  min="500" 
                  max="5000" 
                  step="100"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-bold">
                  <span>₹500</span>
                  <span>₹5000+</span>
                </div>
              </div>

              <div>
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={16} className="text-purple-600" />
                  Minimum Rating
                </h3>
                <div className="space-y-3">
                  {[4, 3, 2, 0].map(rating => (
                    <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${minRating === rating ? 'bg-purple-600 border-purple-600' : 'border-gray-300 group-hover:border-purple-400'}`}>
                        {minRating === rating && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                        {rating === 0 ? 'Any Rating' : (
                          <>
                            {rating}.0 <Star size={14} className="text-yellow-500 fill-yellow-500" /> & Up
                          </>
                        )}
                      </span>
                      <input 
                        type="radio" 
                        name="rating" 
                        value={rating} 
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setPriceRange(5000);
                    setMinRating(0);
                  }}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 space-y-12">
        
      {/* Hero Banner & Search Header in Light Purple Color */}
      <div className="pt-3 pb-3 bg-purple-50/60 relative z-30 border-b border-purple-200 mb-3 px-3 rounded-2xl shadow-2xs mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2.5 gap-2">
          <div>
            <div className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1 mb-0.5">
              <Scissors size={12} className="text-purple-600" /> Premium Pet Grooming
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">Top Certified Pet Stylists</h1>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by spa name, style, or area..." 
              className="w-full h-10 pl-9 pr-3 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 placeholder:text-purple-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-600 transition-all shadow-inner outline-none"
            />
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0 relative"
          >
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

        {/* Top Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Scissors className="text-purple-600" />
            Service Catalogue
          </h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 h-64 rounded-xl"></div>
            ))}
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="text-gray-400" size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">No services found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">We couldn't find any services matching your current filters. Try adjusting the price range or removing search terms.</p>
          </div>
        ) : (
          <>
            {/* Trending Section */}
            {trendingFacilities.length > 0 && !searchQuery && minRating === 0 && priceRange === 5000 && (
              <div className="mb-8">
                <h3 className="text-base sm:text-lg font-black text-gray-900 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="text-red-500" size={18} />
                  Trending & Top Rated
                </h3>
                <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-3 snap-x snap-mandatory scrollbar-hide">
                  {trendingFacilities.map((facility, index) => (
                    <div key={facility.id} className="snap-start shrink-0 w-[48vw] sm:w-[220px]">
                      <FacilityCard facility={facility} index={index} navigate={navigate} isAuthenticated={isAuthenticated} openLoginModal={openLoginModal} isTrending />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Catalogue Grouped by Category */}
            <div className="space-y-8">
              {categories.map(cat => {
                const categoryFacilities = filteredFacilities.filter(f => f.type?.toLowerCase() === cat.toLowerCase());
                if (categoryFacilities.length === 0) return null;
                
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg sm:text-xl font-black text-gray-900">{cat}</h2>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {categoryFacilities.length} {categoryFacilities.length === 1 ? 'Service' : 'Services'}
                      </span>
                    </div>
                    
                    <div className={viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                      : "grid grid-cols-1 gap-2 sm:gap-3"
                    }>
                      {categoryFacilities.map((facility, index) => (
                        <div key={facility.id} className="w-full">
                          <FacilityCard facility={facility} index={index} navigate={navigate} isAuthenticated={isAuthenticated} openLoginModal={openLoginModal} layout={viewMode} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </PageTransition>
  );
};

// Facility Card Component extracted for reuse
const FacilityCard = ({ facility, index, navigate, isAuthenticated, openLoginModal, layout = 'grid', isTrending = false }: any) => {
  const addressStr = typeof facility.address === 'string' ? facility.address : (facility.address?.city || facility.address?.street || 'Unknown');
  
  // Randomly assign a badge to some items for the catalogue feel
  const badges = ["10% OFF", "Best Seller", "New", ""];
  const badgeIndex = (facility.name?.length || 0) % badges.length;
  const badge = badges[badgeIndex];

  if (layout === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => {
          if (!isAuthenticated) {
            openLoginModal();
          } else {
            navigate(`/facility/${facility.id || facility._id}`);
          }
        }}
        className="group cursor-pointer bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row"
      >
        <div className="h-48 sm:h-auto sm:w-64 shrink-0 relative overflow-hidden">
          <img 
            src={facility.images && facility.images.length > 0 ? facility.images[0] : 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600'} 
            alt={facility.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {badge && (
            <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm ${badge === '10% OFF' ? 'bg-red-500 text-white' : 'bg-black text-white'}`}>
              <Sparkles size={12} />
              <span className="text-[10px] font-black uppercase tracking-wider">{badge}</span>
            </div>
          )}
        </div>
        
        <div className="p-5 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-xl text-gray-900 group-hover:text-purple-600 transition-colors">{facility.name}</h3>
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg shrink-0">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold text-yellow-700">{facility.rating || '4.5'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-sm text-purple-600 font-bold mb-2">
              <span>{facility.type || 'Pet Service'}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
              <MapPin size={14} className="shrink-0" />
              <span>{addressStr}</span>
            </div>
            
            {facility.description && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed max-w-xl">
                {facility.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Starting from</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">{formatRupee(facility.priceFrom || 999)}</span>
                {badge === '10% OFF' && <span className="text-sm text-gray-400 line-through">{formatRupee((facility.priceFrom || 999) + 500)}</span>}
              </div>
            </div>
            <button 
              onClick={(e) => { 
                e.stopPropagation();
                if (!isAuthenticated) {
                  openLoginModal();
                } else {
                  navigate(`/checkout/${facility.id || facility._id}`, { state: { facility } });
                }
              }}
              className="px-6 py-3 bg-black text-white font-bold rounded-xl group-hover:bg-purple-600 transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default Grid Layout
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => {
        if (!isAuthenticated) {
          openLoginModal();
        } else {
          navigate(`/facility/${facility.id || facility._id}`);
        }
      }}
      className="group cursor-pointer bg-white rounded-xl border border-purple-200 shadow-2xs hover:shadow-lg hover:border-purple-600 transition-all duration-200 flex flex-col justify-between relative"
    >
      {/* Image */}
      <div className="h-40 sm:h-48 relative overflow-hidden bg-slate-100 rounded-t-2xl">
        <img 
          src={facility.images && facility.images.length > 0 ? facility.images[0] : 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600'} 
          alt={facility.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs border border-purple-100">
          <CheckCircle size={9} className="text-purple-500" />
          <span className="text-[8px] font-black text-purple-950 uppercase tracking-tight">Verified</span>
        </div>

        <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs border border-purple-100">
          <Star size={9} className="text-purple-600 fill-purple-600" />
          <span className="text-[9px] font-black text-purple-950">{facility.rating || '4.5'}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 gap-1">
        <div>
          <h3 className="font-black text-xs sm:text-sm text-purple-950 group-hover:text-purple-600 transition-colors line-clamp-1 truncate">{facility.name}</h3>
          
          <div className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500 mt-0.5">
            <MapPin size={10} className="shrink-0 text-purple-500" />
            <span className="truncate">{addressStr}</span>
          </div>

          {/* Compact Amenities/Services badging */}
          {facility.amenities && facility.amenities.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1.5">
              {facility.amenities.slice(0, 2).map((amenity: string, idx: number) => (
                <span key={idx} className="bg-purple-50 text-purple-800 border border-purple-100 px-1.5 py-0.2 rounded text-[8px] font-bold">
                  ✔ {amenity}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-auto pt-1">
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-1">
            <span className="text-[8px] text-purple-400 line-through font-bold">{formatRupee(Math.round((facility.priceFrom || 999) * 1.35))}</span>
            <p className="text-xs sm:text-sm font-black text-purple-950">{formatRupee(facility.priceFrom)}<span className="text-[8px] font-bold text-purple-600"> / night</span></p>
          </div>

          <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
            <a 
              href={`tel:${facility.phone || '+919876543210'}`}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 transition-colors"
              title="Call Now"
            >
              <Phone size={16} />
            </a>
            <button 
              onClick={() => {
                const cleanPhone = (facility.phone || '919876543210').replace(/[\s+-]/g, '');
                const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const msg = `Hi ${facility.name}, I found you on GouujiPets and would like to inquire about booking/services!`;
                window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
              title="Chat"
            >
              <MessageCircle size={16} />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation();
                if (!isAuthenticated) {
                  openLoginModal();
                } else {
                  navigate(`/checkout/${facility.id || facility._id}`, { state: { facility } });
                }
              }}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all shadow-md text-center flex items-center justify-center gap-1.5"
            >
              <span>⚡ Book Stay</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

