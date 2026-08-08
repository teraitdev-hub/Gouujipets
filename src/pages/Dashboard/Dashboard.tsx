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
    <PageTransition className="pb-24 bg-slate-50 min-h-screen font-sans">
      
      {/* 1. Hero Header with Animated Gradient */}
      <div className="relative pt-10 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 overflow-hidden">
        {/* Subtle decorative background elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-10 -left-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="relative max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center text-2xl font-black text-white shrink-0">
              {primaryPet ? '🐾' : '👋'}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                Welcome back, {user?.name?.split(' ')[0] || "Pet Parent"}
              </h1>
              <p className="text-purple-200 font-medium mt-1 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base">
                <Sparkles size={16} className="text-yellow-400 shrink-0" />
                <span>{primaryPet ? `Managing ${primaryPet.name} • ${petCompletion?.percentage}% Profile complete` : 'Manage your pets and upcoming stays'}</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-5 text-center shadow-lg">
              <span className="block text-2xl font-black text-white">{bookings.length}</span>
              <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Bookings</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-5 text-center shadow-lg">
              <span className="block text-2xl font-black text-white">{pets.length}</span>
              <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Pets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 space-y-8 relative z-10">
        
        {/* 2. My Pets Carousel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Star className="text-purple-600" fill="currentColor" size={20} />
              My Pets
            </h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {/* Add New Pet Card */}
            <div 
              onClick={() => { setPetToEdit(null); setIsAddPetModalOpen(true); }}
              className="min-w-[260px] h-[180px] rounded-3xl border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg snap-start shrink-0 group"
            >
              <div className="w-14 h-14 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Plus size={28} strokeWidth={3} />
              </div>
              <span className="font-bold text-purple-900">Add New Pet</span>
            </div>

            {/* Existing Pets */}
            {pets.map((p: any) => (
              <div 
                key={p.id}
                onClick={() => setActivePetId(p.id)}
                className={`min-w-[260px] h-[180px] rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl snap-start shrink-0 border relative overflow-hidden ${
                  p.id === primaryPet?.id ? 'bg-white border-purple-400 shadow-lg ring-4 ring-purple-50' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {p.id === primaryPet?.id && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Selected
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <img 
                    src={p.photo_url || p.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200"} 
                    alt={p.name}
                    className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-100"
                  />
                  <div>
                    <h3 className="font-black text-lg text-slate-900 leading-tight">{p.name}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{p.breed}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                      <ShieldCheck size={12} /> Vaccinated
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/pet/${p.id}`); }}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPetToEdit(p); setIsAddPetModalOpen(true); }}
                    className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors border border-purple-200"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Active & Upcoming Bookings (Timeline Layout) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="text-purple-600" size={20} />
              Upcoming & Active Stays
            </h2>
            <button className="text-xs font-bold text-purple-600 hover:text-purple-800">View History →</button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6">
            {bookings.length > 0 ? (
              <div className="relative border-l-2 border-slate-100 ml-2 sm:ml-4 space-y-6 sm:space-y-8 pb-2 sm:pb-4">
                {bookings.map((booking: any, index: number) => {
                  const status = booking.status || 'pending';
                  const isLive = status === 'checked_in';
                  const isUpcoming = status === 'confirmed' || status === 'pending';
                  
                  // Status formatting
                  let statusConfig = { color: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200', text: status };
                  if (isLive) statusConfig = { color: 'bg-emerald-500 animate-pulse', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black', text: 'Live Boarding' };
                  else if (isUpcoming) statusConfig = { color: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 border-purple-300', text: 'Upcoming Stay' };
                  else if (status === 'completed') statusConfig = { color: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500 border-slate-200', text: 'Completed' };

                  return (
                    <div key={booking.id} className="relative pl-8">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm ${statusConfig.color}`} />
                      
                      <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg ${isLive ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                          
                          {/* Left: Details */}
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold border ${statusConfig.badge}`}>
                                {statusConfig.text}
                              </span>
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {new Date(booking.check_in || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div>
                              <h3 className="text-xl font-black text-slate-900">{booking.businesses?.name || "Premium Facility"}</h3>
                              <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                <MapPin size={14} className="text-slate-400" />
                                {booking.businesses?.address || "Address unavailable"}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 inline-flex">
                              <img 
                                src={primaryPet?.photo_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200"} 
                                className="w-8 h-8 rounded-lg object-cover" alt="Pet"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-700">Guest: {primaryPet?.name || 'Pet'}</p>
                                <p className="text-[10px] font-bold text-slate-500">{new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 lg:pl-6 lg:border-l border-slate-100 min-w-[200px] w-full lg:w-auto">
                            <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end w-full">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
                              <p className="text-xl font-black text-slate-900">₹{(Number(booking.total_amount) || 0) + (Number(booking.extra_expenses) || 0)}</p>
                            </div>
                            <div className="flex flex-col w-full gap-2">
                              <button 
                                onClick={() => { setSelectedBookingForEdit(booking); setIsEditModalOpen(true); }}
                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors shadow-md active:scale-95 text-center"
                              >
                                View Details & Live Updates
                              </button>
                              <button 
                                onClick={() => navigate(`/facility/${booking.business_id}`)}
                                className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors text-center"
                              >
                                Facility Info
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  🏡
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">No active stays right now</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">When you book a premium boarding or grooming session, you can track it live right here.</p>
                <button 
                  onClick={() => navigate('/boarding')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black text-sm hover:bg-purple-700 transition-colors shadow-md"
                >
                  Explore Premium Facilities
                </button>
              </div>
            )}
          </div>
        </section>

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
