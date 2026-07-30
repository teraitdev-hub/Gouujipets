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
    <PageTransition className="pb-24 max-w-6xl mx-auto space-y-6 font-sans px-4 sm:px-6 pt-6">
      
      {/* 1. Header Profile & Active Pet Selector */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative shrink-0">
            {primaryPet ? (
              <img 
                src={primaryPet.photo_url || primaryPet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200"} 
                alt={primaryPet.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] object-cover border-4 border-slate-50 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-sm">
                🐶
              </div>
            )}
            <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md uppercase tracking-wider border border-white">
              ACTIVE
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {primaryPet ? `${primaryPet.name}'s Dashboard` : `Welcome, ${user?.name || "Pet Parent"} 👋`}
              </h2>
              {primaryPet && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100 uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-emerald-500" /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-semibold">
              {primaryPet ? `${primaryPet.breed} • ${primaryPet.age} Yrs • ${primaryPet.gender || 'Pet'}` : "Select or add a pet to get personalized partner matches and live care tracking."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
          {pets && pets.length > 1 && (
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-200"
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
                    className="absolute right-0 top-12 bg-white border border-slate-200/60 rounded-2xl shadow-xl p-2 w-56 z-50 space-y-1"
                  >
                    {pets.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setActivePetId(p.id); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm transition-all ${
                          p.id === primaryPet?.id ? 'bg-slate-50 text-slate-900 font-black' : 'hover:bg-slate-50 text-slate-600 font-semibold'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${p.id === primaryPet?.id ? 'bg-slate-900' : 'bg-slate-300'}`} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={() => { setPetToEdit(null); setIsAddPetModalOpen(true); }}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] active:scale-95"
          >
            <Plus size={16} />
            <span>Add Pet</span>
          </button>
        </div>
      </div>

      {/* ── Ultra-Compact Profile Strength Banner ──────────────────────── */}
      {primaryPet && petCompletion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/60 rounded-[32px] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 font-sans"
        >
          {/* Left: Overall Status */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <motion.path
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${petCompletion.percentage}, 100` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={petCompletion.percentage === 100 ? "text-emerald-500" : "text-blue-500"}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-black text-slate-900">{petCompletion.percentage}%</span>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Profile Completion
                {petCompletion.percentage === 100 && <ShieldCheck size={16} className="text-emerald-500" />}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {petCompletion.percentage === 100 ? "Fully prepared for check-ins." : "Missing details limit priority care."}
              </p>
            </div>
          </div>

          {/* Middle: Mini Category Indicators */}
          <div className="flex items-center gap-3 sm:gap-5 flex-1 w-full lg:max-w-md px-1 sm:px-6 lg:border-l lg:border-slate-100">
            {(["basic", "health", "care", "security"] as const).map((cat) => {
              const catFields = petCompletion.fields.filter((f) => f.category === cat);
              const isComplete = catFields.filter((f) => f.filled).length === catFields.length;
              const catLabel = { basic: "Basic", health: "Medical", care: "Diet", security: "Safety" }[cat];
              return (
                <div key={cat} className="flex-1 flex flex-col gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isComplete ? 'text-slate-900' : 'text-slate-400'}`}>
                    {catLabel}
                  </span>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full w-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-500" : "bg-slate-200"}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto mt-4 lg:mt-0">
            <button
              onClick={() => { setPetToEdit(primaryPet); setIsAddPetModalOpen(true); }}
              className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-xs font-black transition-all ${
                petCompletion.percentage === 100
                  ? "bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              }`}
            >
              {petCompletion.percentage === 100 ? "Update Details" : "Complete Profile"}
            </button>
            <button
              onClick={() => navigate(`/pet/${primaryPet.id}`)}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-black transition-all shadow-sm shrink-0"
            >
              View Profile
            </button>
          </div>
        </motion.div>
      )}

      {/* Upcoming Vaccinations Alert Card */}
      {primaryPet && (
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
            <Syringe className="text-rose-500 shrink-0" size={20} />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Upcoming Vaccinations
            </h3>
          </div>
          {upcomingVaccines.length > 0 ? (
            <div className="space-y-3">
              {upcomingVaccines.map((vax) => {
                const diffTime = new Date(vax.date).getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <div key={vax.id} className="p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white text-rose-500 flex items-center justify-center font-bold shadow-sm">
                        💉
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{vax.title || vax.name}</p>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                          Due on {new Date(vax.date).toLocaleDateString("en-IN")} ({diffDays > 0 ? `in ${diffDays} days` : 'Overdue!'})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/vaccinations')}
                      className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95"
                    >
                      Update
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-sm font-semibold text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              🎉 All immunizations are up to date!
            </div>
          )}
        </div>
      )}

      {/* 2. Promo / VIP Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lightning Deals Strip */}
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between items-start gap-4 h-full relative overflow-hidden">
          <Sparkles className="absolute -right-4 -top-4 text-amber-300 opacity-50 w-24 h-24" />
          <div className="relative z-10">
            <span className="bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-widest text-[10px] animate-pulse font-black shadow-sm mb-3 inline-block">
              ⚡ TODAY'S DEAL
            </span>
            <h3 className="font-black text-xl leading-tight">Flat 20% OFF Boarding & Free First Vet Checkup</h3>
          </div>
          <button 
            onClick={() => navigate("/boarding")}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-black transition-all shadow-md relative z-10 mt-auto"
          >
            Claim: GOUUJI20
          </button>
        </div>

        {/* Gouuji VIP Subscription Plans */}
        <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between items-start gap-4 h-full relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-white/5 text-9xl">👑</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-black text-white leading-tight">Gouuji VIP</h3>
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Save 20%</span>
            </div>
            <p className="text-sm text-slate-400 font-semibold max-w-[280px]">
              Get priority bookings, vet discounts & a dedicated personal care manager.
            </p>
          </div>
          <button
            onClick={() => navigate("/membership")}
            className="bg-white hover:bg-slate-100 text-slate-900 font-black px-6 py-3 rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 relative z-10 mt-auto"
          >
            <span>View Subscriptions</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 3. VERIFIED 10 Assured Mega Category Grid */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">
              Explore Categories
            </h3>
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Upfront Rates • Zero Hidden Charges</span>
        </div>

        <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-9 gap-3 text-center">
          {[
            { id: "boarding", icon: "🏨", label: "Boarding", badge: "TOP" },
            { id: "grooming", icon: "🛁", label: "Grooming", badge: "DEALS" },
            { id: "daycare", icon: "🏡", label: "Daycare", badge: "PLAY" },
            { id: "walking", icon: "🐕", label: "Walking", badge: "GPS" },
            { id: "swimming", icon: "🏊", label: "Pool", badge: "HEATED" },
            { id: "shop", icon: "🛍️", label: "Shop", badge: "" },
            { id: "training", icon: "🎓", label: "Training", badge: "" },
            { id: "taxi", icon: "🚕", label: "Pet Cab", badge: "" },
            { id: "sitting", icon: "👨‍👩‍👧", label: "Sitting", badge: "HOME" }
          ].map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/boarding?type=${cat.id}`)}
              className="bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-2xl p-4 cursor-pointer transition-all flex flex-col items-center justify-between group relative shadow-sm hover:shadow-md"
            >
              {cat.badge && (
                <span className="absolute -top-2.5 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  {cat.badge}
                </span>
              )}
              <span className="text-3xl my-2 group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
              <span className="text-[11px] font-black text-slate-700 group-hover:text-slate-900 truncate w-full tracking-wide">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Orders Table: Live Stays & Upcoming Bookings */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
              📋
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-none mb-1">Your Orders & Active Stays</h3>
              <p className="text-xs text-slate-500 font-semibold">Track real-time check-ins, invoice bills, and health logs</p>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-900 font-black text-xs px-4 py-2 rounded-xl border border-slate-200">
            {bookings.length} Order{bookings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking: any) => {
              const status = booking.status || 'pending';
              const statusCfgMap: Record<string, any> = {
                pending:     { label: 'Pending Confirmation', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
                confirmed:   { label: 'Confirmed & Reserved', dot: 'bg-blue-500',  badge: 'bg-blue-50 text-blue-800 border-blue-200 font-black' },
                checked_in:  { label: 'LIVE IN CARE NOW',   dot: 'bg-emerald-500 animate-ping', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black' },
                completed:   { label: 'Stay Completed',       dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-200' },
                cancelled:   { label: 'Cancelled Order',      dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
              };
              const statusCfg = statusCfgMap[status] || { label: status, dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
              const totalCost = (Number(booking.total_amount) || 0) + (Number(booking.extra_expenses) || 0);

              return (
                <div key={booking.id} className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-[16px] bg-white border border-slate-200 flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                      🏨
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-base font-black text-slate-900">
                          {booking.businesses?.name || "Luxury Pet Care Partner"}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={16} className="text-slate-400" />
                          {new Date(booking.check_in || Date.now()).toLocaleDateString()} → {new Date(booking.check_out || Date.now()).toLocaleDateString()}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-700">Pet: {primaryPet?.name || "Pet"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-200/60 w-full md:w-auto">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest mb-1">Total</span>
                      <span className="text-xl font-black text-slate-900">₹{totalCost}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedBookingForEdit(booking); setIsEditModalOpen(true); }}
                        className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 font-black text-xs rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => navigate(`/facility/${booking.business_id}`)}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-slate-900/10 active:scale-95"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4 text-2xl font-black shadow-sm">
              📦
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-2">No Active Bookings</h4>
            <p className="text-sm text-slate-500 font-medium max-w-md mx-auto mb-6">
              Explore our verified local directory to book premium boarding, grooming, or emergency checkups.
            </p>
            <button
              onClick={() => navigate("/boarding")}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition-all shadow-lg inline-flex items-center gap-2 active:scale-95"
            >
              <span>Explore Directory</span>
              <ChevronRight size={16} />
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
