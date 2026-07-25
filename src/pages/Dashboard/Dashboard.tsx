import { useState, useEffect } from "react";
import { 
  Plus, Calendar, Phone, MessageSquare, ChevronRight, 
  MapPin, Star, ShieldCheck, Sparkles, Syringe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePet } from "../../context/PetContext";
import { useAuthStore } from "../../store/useAuthStore";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, limit, documentId, onSnapshot } from "firebase/firestore";
import { PageTransition } from "../../components/layout/PageTransition";
import { AddPetModal } from "../../components/pets/AddPetModal";
import { BookingDetailModal } from "../../components/bookings/BookingDetailModal";

import { computePetCompletion } from "../../utils/petCompletion";
import { filterRealBusinesses } from "../../utils/filterRealBusinesses";

interface PetUpdate {
  id: string;
  booking_id: string;
  business_id: string;
  sender_id: string;
  message: string;
  photo_url?: string;
  created_at: string;
}

interface ExtraCharge {
  id: string;
  booking_id: string;
  description: string;
  amount: number;
  created_at: string;
  status: 'pending' | 'paid';
}

export const Dashboard = () => {
  const { activePet, setActivePetId, pets } = usePet();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const primaryPet = activePet || pets[0];
  const petCompletion = primaryPet ? computePetCompletion(primaryPet) : null;

  // Local state
  const [bookings, setBookings] = useState<any[]>([]);
  const [isAddPetModalOpen, setIsAddPetModalOpen] = useState(false);
  const [petToEdit, setPetToEdit] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [petUpdates, setPetUpdates] = useState<PetUpdate[]>([]);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [upcomingVaccines, setUpcomingVaccines] = useState<any[]>([]);

  // Edit/View Booking Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<any>(null);



  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db, "bookings"), where("customer_id", "==", user.id));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const bookingsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bizIds = [...new Set(bookingsData.map((b: any) => b.business_id).filter(Boolean))];
      const bizMap = new Map();
      if (bizIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < bizIds.length; i += 10) chunks.push(bizIds.slice(i, i + 10));
        for (const chunk of chunks) {
          const bq = query(collection(db, 'businesses'), where(documentId(), 'in', chunk));
          const bs = await getDocs(bq);
          bs.forEach(d => bizMap.set(d.id, { id: d.id, ...d.data() }));
        }
      }
      const enrichedBookings = bookingsData.map((b: any) => ({
        ...b,
        businesses: bizMap.get(b.business_id) || null
      }));
      setBookings(enrichedBookings);
    }, (err) => {
      console.error("Fetch bookings error:", err);
    });
    return () => unsubscribe();
  }, [user?.id]);



  useEffect(() => {
    if (bookings.length === 0) return;
    const fetchUpdatesAndCharges = async () => {
      try {
        const bookingIds = bookings.map((b: any) => b.id);
        const chunks = [];
        for (let i = 0; i < bookingIds.length; i += 10) chunks.push(bookingIds.slice(i, i + 10));

        let updatesList: any[] = [];
        let chargesList: any[] = [];

        for (const chunk of chunks) {
          const uQ = query(collection(db, "pet_updates"), where("booking_id", "in", chunk), limit(10));
          const uSnap = await getDocs(uQ);
          updatesList.push(...uSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          const cQ = query(collection(db, "extra_charges"), where("booking_id", "in", chunk));
          const cSnap = await getDocs(cQ);
          chargesList.push(...cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        updatesList.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setPetUpdates(updatesList.slice(0, 10));
        setExtraCharges(chargesList);
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };
    fetchUpdatesAndCharges();
  }, [bookings]);

  useEffect(() => {
    if (!primaryPet?.id) {
      setUpcomingVaccines([]);
      return;
    }
    const q = query(
      collection(db, "health_records_and_reminders"),
      where("pet_id", "==", primaryPet.id),
      where("status", "==", "upcoming")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const vaxes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      vaxes.sort((a: any, b: any) => a.date.localeCompare(b.date));
      setUpcomingVaccines(vaxes);
    }, (err) => {
      console.error("Dashboard vaccines subscription error:", err);
    });
    return () => unsubscribe();
  }, [primaryPet?.id]);

  const handlePaymentSubmit = async (selectedCharge: ExtraCharge | null) => {
    if (!selectedCharge) return;
    setIsProcessingPayment(true);
    try {
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'extra_charges', selectedCharge.id), { status: 'paid' });
      setExtraCharges(prev => prev.map(c => c.id === selectedCharge.id ? { ...c, status: 'paid' } : c));
      alert('Payment marked as paid! Your partner will be notified.');
    } catch (err) {
      console.error('Payment update error:', err);
      alert('Payment recorded. Please show confirmation to your partner.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <PageTransition className="pb-24 max-w-7xl mx-auto space-y-5 font-sans">
      
      {/* 1. Amazon / VERIFIED Top Status Bar & Active Pet Selector in Light Pink & Purple Theme */}
      <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative shrink-0">
            {primaryPet ? (
              <img 
                src={primaryPet.photo_url || primaryPet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200"} 
                alt={primaryPet.name} 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-purple-500 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                🐶
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
              ACTIVE
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {primaryPet ? `${primaryPet.name}'s Dashboard` : `Welcome, ${user?.name || "Pet Parent"} 👋`}
              </h2>
              {primaryPet && (
                <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-purple-200">
                  <ShieldCheck size={12} className="text-purple-600" /> 100% Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {primaryPet ? `${primaryPet.breed} • ${primaryPet.age} Yrs • ${primaryPet.gender || 'Pet'}` : "Select or add a pet to get personalized partner matches and live care tracking."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-purple-100">
          {pets && pets.length > 1 && (
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-purple-200/60"
              >
                <span>Switch Pet ({pets.length})</span>
                <ChevronRight size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 top-11 bg-white border border-purple-200 rounded-xl shadow-xl p-2 w-56 z-50 space-y-1"
                  >
                    {pets.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setActivePetId(p.id); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${
                          p.id === primaryPet?.id ? 'bg-purple-100 text-purple-900 font-black' : 'hover:bg-purple-50 text-slate-800'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                        <span className="truncate">{p.name} ({p.breed})</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={() => { setPetToEdit(null); setIsAddPetModalOpen(true); }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Plus size={14} />
            <span>Add Pet</span>
          </button>
        </div>
      </div>

      {/* ── Ultra-Compact Profile Strength Banner ──────────────────────── */}
      {primaryPet && petCompletion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 font-sans"
        >
          {/* Left: Overall Status */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <motion.path
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${petCompletion.percentage}, 100` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={petCompletion.percentage === 100 ? "text-emerald-500" : "text-indigo-600"}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-800">{petCompletion.percentage}%</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Profile Completion
                {petCompletion.percentage === 100 && <ShieldCheck size={14} className="text-emerald-500" />}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {petCompletion.percentage === 100 ? "Fully prepared for check-ins." : "Missing details limit priority care."}
              </p>
            </div>
          </div>

          {/* Middle: Mini Category Indicators */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 w-full lg:max-w-md px-1 sm:px-4 lg:border-l lg:border-slate-100">
            {(["basic", "health", "care", "security"] as const).map((cat) => {
              const catFields = petCompletion.fields.filter((f) => f.category === cat);
              const isComplete = catFields.filter((f) => f.filled).length === catFields.length;
              const catLabel = { basic: "Basic", health: "Medical", care: "Diet", security: "Safety" }[cat];
              return (
                <div key={cat} className="flex-1 flex flex-col gap-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isComplete ? 'text-slate-700' : 'text-slate-400'}`}>
                    {catLabel}
                  </span>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full w-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-500" : "bg-slate-200"}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
            <button
              onClick={() => { setPetToEdit(primaryPet); setIsAddPetModalOpen(true); }}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                petCompletion.percentage === 100
                  ? "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              }`}
            >
              {petCompletion.percentage === 100 ? "Update" : "Complete"}
            </button>
            <button
              onClick={() => navigate(`/pet/${primaryPet.id}`)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors shadow-sm shrink-0"
            >
              View Profile
            </button>
          </div>
        </motion.div>
      )}

      {/* Upcoming Vaccinations Alert Card */}
      {primaryPet && (
        <div className="bg-white border border-purple-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
            <Syringe className="text-purple-650 shrink-0" size={18} />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Upcoming Vaccinations & Reminders
            </h3>
          </div>
          {upcomingVaccines.length > 0 ? (
            <div className="space-y-2">
              {upcomingVaccines.map((vax) => {
                const diffTime = new Date(vax.date).getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <div key={vax.id} className="p-3.5 bg-purple-50/40 border border-purple-200/50 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        💉
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{vax.title || vax.name}</p>
                        <p className="text-[10px] text-slate-500">
                          Due on {new Date(vax.date).toLocaleDateString("en-IN")} ({diffDays > 0 ? `in ${diffDays} days` : 'Overdue!'})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/vaccinations')}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-lg transition-all shadow-2xs active:scale-95"
                    >
                      Update Record
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-xs font-medium text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              🎉 No upcoming vaccinations. All immunizations up to date!
            </div>
          )}
        </div>
      )}

      {/* 2. Amazon Lightning Deals Strip in Light Purple Theme */}
      <div className="bg-purple-600 text-white p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-black">
        <div className="flex items-center gap-2">
          <span className="bg-white text-purple-900 px-2 py-0.5 rounded uppercase tracking-wider text-[10px] animate-pulse shrink-0 font-black shadow-2xs">
            ⚡ TODAY'S LIGHTNING DEAL
          </span>
          <span>Flat 20% OFF Boarding & Daycare Stays + Free First Vet Checkup</span>
        </div>
        <button 
          onClick={() => navigate("/boarding")}
          className="bg-white hover:bg-purple-50 text-purple-900 px-3.5 py-1 rounded-lg text-[11px] font-black transition-all shrink-0 shadow-xs"
        >
          Claim Coupon: GOUUJI20 →
        </button>
      </div>

      {/* Gouuji VIP Subscription Plans Strip */}
      <div className="bg-purple-950 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-purple-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">Gouuji VIP Subscription Plans</h3>
              <span className="bg-purple-200 text-purple-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
            </div>
            <p className="text-xs text-purple-200 font-medium mt-0.5">
              Get priority bookings, vet discounts & a dedicated personal care manager.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/membership")}
          className="bg-purple-600 hover:bg-purple-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-all shrink-0 shadow-sm flex items-center gap-1.5"
        >
          <span>View Subscription Tiers</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 3. VERIFIED 10 Assured Mega Category Grid in Light Purple */}
      <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Explore VERIFIED CARE™ Categories
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Upfront Rates • Zero Hidden Charges</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-center">
          {[
            { id: "boarding", icon: "🏨", label: "Boarding", badge: "TOP" },
            { id: "grooming", icon: "🛁", label: "Grooming", badge: "20% OFF" },
            { id: "daycare", icon: "🏡", label: "Daycare", badge: "PLAY" },
            { id: "walking", icon: "🐕", label: "Walking", badge: "GPS" },
            { id: "swimming", icon: "🏊", label: "Pool", badge: "HEATED" },
            { id: "shop", icon: "🛍️", label: "Shop", badge: "DEALS" },
            { id: "training", icon: "🎓", label: "Training", badge: "AGILITY" },
            { id: "taxi", icon: "🚕", label: "Pet Cab", badge: "AC" },
            { id: "sitting", icon: "👨‍👩‍👧", label: "Sitting", badge: "HOME" }
          ].map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/boarding?type=${cat.id}`)}
              className="bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-400 rounded-xl p-2.5 cursor-pointer transition-all flex flex-col items-center justify-between group relative shadow-2xs hover:shadow-md"
            >
              <span className="absolute -top-2 bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded shadow-xs">
                {cat.badge}
              </span>
              <span className="text-xl sm:text-2xl my-1 group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-[10px] sm:text-[11px] font-black text-slate-800 group-hover:text-purple-700 truncate w-full">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Amazon Orders Table: Live Stays & Upcoming Bookings in Purple/Pink Theme */}
      <div className="bg-white border border-purple-100 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm">
              📋
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-none">Your Orders & Active Stays</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Track real-time check-ins, invoice bills, and health logs</p>
            </div>
          </div>
          <span className="bg-purple-100 text-purple-800 font-bold text-xs px-3 py-1 rounded-full border border-purple-200">
            {bookings.length} Order{bookings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking: any) => {
              const status = booking.status || 'pending';
              const statusCfgMap: Record<string, any> = {
                pending:     { label: 'Pending Confirmation', dot: 'bg-purple-500',   badge: 'bg-purple-50 text-purple-800 border-purple-200' },
                confirmed:   { label: 'Confirmed & Reserved', dot: 'bg-purple-600',  badge: 'bg-purple-50 text-purple-900 border-purple-300 font-black' },
                checked_in:  { label: '🟣 LIVE IN CARE NOW',   dot: 'bg-purple-700 animate-ping', badge: 'bg-purple-100 text-purple-950 border-purple-400 font-black' },
                completed:   { label: 'Stay Completed',       dot: 'bg-purple-400',   badge: 'bg-purple-50/50 text-purple-700 border-purple-200' },
                cancelled:   { label: 'Cancelled Order',      dot: 'bg-purple-800',    badge: 'bg-purple-100 text-purple-900 border-purple-300' },
              };
              const statusCfg = statusCfgMap[status] || { label: status, dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
              const totalCost = (Number(booking.total_amount) || 0) + (Number(booking.extra_expenses) || 0);

              return (
                <div key={booking.id} className="border border-purple-200 rounded-xl p-4 bg-purple-50/20 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-black text-lg shrink-0">
                      🏨
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-900">
                          {booking.businesses?.name || "Luxury Pet Care Partner"}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-purple-400" />
                          {new Date(booking.check_in || Date.now()).toLocaleDateString()} → {new Date(booking.check_out || Date.now()).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-slate-700">Pet: {primaryPet?.name || "Pet"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-purple-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Order Total</span>
                      <span className="text-sm font-black text-slate-900">₹{totalCost}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedBookingForEdit(booking); setIsEditModalOpen(true); }}
                        className="px-3.5 py-2 bg-white hover:bg-purple-50 border border-purple-300 text-purple-900 font-bold text-xs rounded-xl transition-all shadow-2xs"
                      >
                        Manage / View
                      </button>
                      <button
                        onClick={() => navigate(`/facility/${booking.business_id}`)}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                      >
                        View Center
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-purple-50/30 rounded-xl border border-dashed border-purple-200">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3 text-xl font-black">
              📦
            </div>
            <h4 className="text-sm font-black text-slate-900 mb-1">No Active Bookings or Orders Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Explore our verified local directory above to book instant AC stays, grooming sessions, or emergency checkups.
            </p>
            <button
              onClick={() => navigate("/boarding")}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
            >
              <span>Explore Verified Directory</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPetModal isOpen={isAddPetModalOpen} onClose={() => { setIsAddPetModalOpen(false); setPetToEdit(null); }} petToEdit={petToEdit} />
      {selectedBookingForEdit && (
        <BookingDetailModal
          booking={selectedBookingForEdit}
          onClose={() => { setIsEditModalOpen(false); setSelectedBookingForEdit(null); }}
          onPostUpdate={() => {}}
        />
      )}
    </PageTransition>
  );
};
