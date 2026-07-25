import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Search, MapPin, Filter, Star, CheckCircle, Calendar, Stethoscope, Phone, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatRupee } from "../../utils/currency";
import { useAuthStore } from "../../store/useAuthStore";
import { filterRealBusinesses } from "../../utils/filterRealBusinesses";

export const Veterinary = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLoginModal } = useAuthStore();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const today = new Date().toISOString().split('T')[0];
  const [searchDate, setSearchDate] = useState(today);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchFacilities = () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'businesses'), where('type', '==', 'veterinary'));
        
        unsubscribe = onSnapshot(q, async (bSnap) => {
          let data: any[] = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
          if (data) {
            const filtered = filterRealBusinesses(data);
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
                rating: biz.rating || 4.8,
                images: Array.isArray(biz.images) && biz.images.length > 0 ? biz.images : [biz.image_url || 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600'],
                priceFrom: biz.price_per_night || biz.price_from || biz.base_rate_per_day || biz.priceFrom || 999,
                phone: biz.contact_phone || owner?.phone || '',
                email: biz.contact_email || owner?.email || ''
              };
            });
            setFacilities(formattedData);
          }
          setIsLoading(false);
        }, (err) => {
          console.error("Failed to fetch vet clinics", err);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error setting up vet clinics listener", err);
        setIsLoading(false);
      }
    };
    
    fetchFacilities();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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

    return !searchLower ? true : (
      (f.name && f.name.toLowerCase().includes(searchLower)) ||
      (f.address && f.address.toLowerCase().includes(searchLower)) ||
      (f.description && f.description.toLowerCase().includes(searchLower)) ||
      (Array.isArray(svcs) && svcs.some((s: any) => {
        const sName = (s.name || s || "").toString().toLowerCase();
        const sDesc = (s.description || "").toString().toLowerCase();
        return sName.includes(searchLower) || sDesc.includes(searchLower) || searchTokens.every(t => sName.includes(t) || sDesc.includes(t));
      })) ||
      (Array.isArray(amens) && amens.some((a: string) => a.toLowerCase().includes(searchLower) || searchTokens.every(t => a.toLowerCase().includes(t))))
    );
  });

  return (
    <PageTransition className="pb-16 max-w-7xl mx-auto px-2.5 sm:px-6">
      
      {/* Header & Search — scrolls cleanly with the page */}
      <div className="pt-3 pb-3 bg-white relative z-30 border-b border-gray-100 mb-3">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 flex items-center gap-1.5">
          <Stethoscope className="text-purple-600" size={22} />
          Veterinary Clinics
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by clinic name or area..." 
              className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all shadow-inner outline-none"
            />
          </div>
          
          <div className="relative shrink-0 flex items-center bg-slate-50 border border-gray-200 rounded-xl px-3 h-10 shadow-2xs hover:border-purple-500 transition-colors hover:bg-white">
            <Calendar size={14} className="text-purple-600 mr-2" />
            <input 
              type="date" 
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-transparent border-none text-xs font-extrabold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <button className="h-10 px-4 rounded-xl bg-purple-900 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-950 transition-all shadow-2xs active:scale-95 shrink-0">
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="mt-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 h-64 rounded-xl"></div>
            ))}
          </div>
        ) : filteredFacilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredFacilities.map((facility, index) => (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/facility/${facility.id}`)}
                className="group cursor-pointer bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-200 flex flex-col justify-between relative"
              >
                {/* Image */}
                <div className="h-40 sm:h-48 relative overflow-hidden bg-slate-100 rounded-t-2xl">
                  <img 
                    src={facility.images[0]} 
                    alt={facility.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-slate-100">
                    <CheckCircle size={10} className="text-purple-500" />
                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">Verified</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-slate-100">
                    <Star size={10} className="text-purple-600 fill-purple-600" />
                    <span className="text-[10px] font-black text-slate-900">{facility.rating}</span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1 truncate">{facility.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mt-1">
                      <MapPin size={12} className="shrink-0 text-purple-500" />
                      <span className="truncate">{typeof facility.address === 'string' ? facility.address : (facility.address?.city || 'Verified Location')}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-[10px] font-bold">🏥 24/7 Emergency</span>
                      <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-[10px] font-bold">👨‍⚕️ Expert Docs</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-3">
                    <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 line-through font-medium">{formatRupee(Math.round((facility.priceFrom || 999) * 1.35))}</span>
                      <p className="text-sm font-black text-slate-900">{formatRupee(facility.priceFrom)}<span className="text-[10px] font-bold text-slate-500"> / visit</span></p>
                    </div>

                    <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
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
                        <span>⚡ Book Consult</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">No clinics found</h3>
            <p className="text-xs text-gray-500">Try adjusting your search criteria or date.</p>
          </div>
        )}
      </div>

    </PageTransition>
  );
};
