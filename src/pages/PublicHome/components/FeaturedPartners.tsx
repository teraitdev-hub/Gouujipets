import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Star, MapPin, Check, Phone, MessageCircle, ChevronRight, Award } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
import { formatRupee } from "../../../utils/currency";

export const FeaturedPartners = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const q = query(
          collection(db, "businesses"), 
          where("status", "==", "verified"),
          limit(8)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Note: Client-side sort by rating since Firestore requires composite indexes for orderBy + where
        data.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
        setPartners(data);
      } catch (error) {
        console.error("Failed to fetch verified partners:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <SkeletonLoader type="card" count={4} />
      </section>
    );
  }

  if (partners.length === 0) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <EmptyState 
          icon={<Award className="text-slate-400" size={32} />}
          title="No Verified Partners Available" 
          description="We couldn't find any verified partners in your area at this moment. We are expanding quickly, please check back soon!" 
        />
      </section>
    );
  }

  return (
    <section className="py-10 px-3 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-slate-200/80 pb-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-white uppercase tracking-widest bg-slate-900 px-2.5 py-0.5 rounded-full mb-2">
              <Award size={12} className="stroke-[3]" /> VERIFIED PARTNERS
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Top Rated Facilities Near You
            </h2>
          </div>
          <button
            onClick={() => navigate('/boarding')}
            className="bg-white hover:bg-slate-50 text-black font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all border border-slate-200 active:scale-95"
          >
            <span>Explore All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {partners.map((facility, idx) => (
            <motion.div
              key={facility.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              onClick={() => navigate(`/facility/${facility.id}`, { state: { facility } })}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative shadow-xs"
            >
              <div className="h-48 relative overflow-hidden bg-slate-100 rounded-t-2xl">
                {facility.images && facility.images.length > 0 ? (
                   <img
                     src={facility.images[0]}
                     alt={facility.name}
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300 font-bold">No Image</div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />

                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 shadow-sm border border-slate-200">
                  <Check size={10} className="stroke-[3] text-purple-600" />
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight">{facility.type}</span>
                </div>

                {facility.rating && (
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 shadow-sm border border-slate-200">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-slate-800">{facility.rating}</span>
                  </div>
                )}
                
                {facility.open24Hours !== undefined && (
                   <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md shadow-sm border border-white/20 text-[9px] font-black uppercase tracking-tight backdrop-blur-md bg-black/50 text-white">
                     {facility.open24Hours ? "Open 24/7" : "Closed"}
                   </div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                    {facility.name}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin size={10} className="text-slate-400 shrink-0" />
                    {typeof facility.address === 'string' ? facility.address : facility.address?.city || 'Location unavailable'}
                  </p>
                </div>

                <div className="mt-auto pt-2">
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                    {facility.price_per_night || facility.price_from ? (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-slate-900 font-bold text-xs">₹</span>
                        <span className="text-sm font-black text-slate-900">{facility.price_per_night || facility.price_from}</span>
                        <span className="text-[9px] text-slate-500 font-semibold">/day</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Price on request</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                    {facility.contact_phone && (
                      <button
                        onClick={() => setShowContactModal(facility)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-sm"
                        title="Contact"
                      >
                        <Phone size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/checkout/${facility.id}`, { state: { facility } })}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-purple-600 text-white font-black text-xs rounded-xl transition-all shadow-sm text-center"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

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

              <div className="flex items-center gap-4 mb-6">
                {showContactModal.images?.[0] && (
                  <img src={showContactModal.images[0]} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-200" />
                )}
                <div>
                  <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Verified</span>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mt-1">{showContactModal.name}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <a
                  href={`tel:${showContactModal.contact_phone}`}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all text-center"
                >
                  <Phone size={16} /> Call {showContactModal.contact_phone}
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
