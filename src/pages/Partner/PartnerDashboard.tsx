import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { Users, Dog, Calendar, DollarSign, ArrowUpRight, FileText, Download, Scissors, Clock, PawPrint, Camera, X, MessageSquare, TrendingUp, Sparkles, Building2, ShieldCheck, Plus, Phone, CheckCircle2 } from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { useAuthStore } from "../../store/useAuthStore";
import { BusinessRegistrationModal } from "../../components/partner/BusinessRegistrationModal";
import { BusinessSettings } from "../../components/partner/BusinessSettings";
import { WalkInRegistrationModal } from "../../components/partner/WalkInRegistrationModal";
import { BookingFinancialsModal } from "../../components/partner/BookingFinancialsModal";
import { PartnerMedicalModal } from "../../components/partner/PartnerMedicalModal";
import { BookingDetailModal } from "../../components/bookings/BookingDetailModal";
import { ServicesManager } from "../../components/partner/ServicesManager";
import { ReportModal } from "../../components/partner/ReportModal";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc, documentId, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export const PartnerDashboard = ({ type }: { type?: 'Boarding' | 'Grooming' | 'Veterinary' }) => {
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<any>(null);
  const activeType = business?.type || type || 'Boarding';
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'services'>('overview');
  const [bookingFilter, setBookingFilter] = useState<string>('all');
  const [allMyBusinesses, setAllMyBusinesses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showRegistration, setShowRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Supplies & Food', amount: '', description: '', party_name: '', date: new Date().toISOString().split('T')[0] });
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [financialsModalData, setFinancialsModalData] = useState<{ isOpen: boolean; booking: any | null }>({ isOpen: false, booking: null });

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [medicalModalData, setMedicalModalData] = useState<{ isOpen: boolean; booking: any | null }>({ isOpen: false, booking: null });
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        const qBiz = query(collection(db, 'businesses'), where('owner_id', '==', user.id));
        const bizSnap = await getDocs(qBiz);
        let bList: any[] = bizSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let primaryBiz: any = null;
        if (!bList || bList.length === 0) {
          setShowRegistration(true);
        } else {
          primaryBiz = bList[0];
          setShowRegistration(false);
        }

        setAllMyBusinesses(bList);
        setBusiness(primaryBiz);

        const bizIds = bList.map(b => b.id);

        // Fetch Bookings strictly for this partner's facilities
        let bks: any[] = [];
        if (bizIds.length > 0) {
          for (let i = 0; i < bizIds.length; i += 10) {
            const chunk = bizIds.slice(i, i + 10);
            const qBk = query(collection(db, 'bookings'), where('business_id', 'in', chunk));
            const bkSnap = await getDocs(qBk);
            bkSnap.docs.forEach(d => bks.push({ id: d.id, ...d.data() }));
          }
        }
        bks.sort((a, b) => {
          const dateA = a.check_in ? new Date(a.check_in).getTime() : 0;
          const dateB = b.check_in ? new Date(b.check_in).getTime() : 0;
          return dateB - dateA;
        });

        // Resolve relations
        const customerIds = [...new Set(bks.map(b => typeof b.customer_id === 'string' ? b.customer_id : b.customer_id?.id).filter(Boolean))];
        const customerMap = new Map();
        for (let i = 0; i < customerIds.length; i += 10) {
          const chunk = customerIds.slice(i, i + 10);
          const qUsers = query(collection(db, "users"), where(documentId(), "in", chunk));
          const uSnap = await getDocs(qUsers);
          uSnap.docs.forEach(d => customerMap.set(d.id, { id: d.id, ...d.data() }));
        }
        const bizMap = new Map(bList.map(b => [b.id, b]));
        bks = bks.map(b => ({
          ...b,
          customer_id: typeof b.customer_id === 'string' ? customerMap.get(b.customer_id) : b.customer_id,
          business_id: typeof b.business_id === 'string' ? bizMap.get(b.business_id) : b.business_id
        }));

        // No bookings yet — empty array stays empty

        setBookings(bks);

        // Fetch Expenses strictly for this partner's facilities
        let exps: any[] = [];
        if (bizIds.length > 0) {
          for (let i = 0; i < bizIds.length; i += 10) {
            const chunk = bizIds.slice(i, i + 10);
            const qExp = query(collection(db, 'expenses'), where('business_id', 'in', chunk));
            const expSnap = await getDocs(qExp);
            expSnap.docs.forEach(d => {
              const data = d.data();
              if (data.entry_type === 'expense') {
                exps.push({ id: d.id, ...data });
              }
            });
          }
        }
        exps.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });

        // No expenses yet — empty array stays empty

        setExpenses(exps);
      } catch (err) {
        console.error("Error loading partner portal:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();

    const qBk = query(collection(db, 'bookings'));
    const unsubscribeBk = onSnapshot(qBk, () => { fetchAllData(); });
    const qExp = query(collection(db, 'expenses'));
    const unsubscribeExp = onSnapshot(qExp, () => { fetchAllData(); });

    const pollingInterval = setInterval(() => {
      fetchAllData();
    }, 3000);

    return () => {
      unsubscribeBk();
      unsubscribeExp();
      clearInterval(pollingInterval);
    };
  }, [user, type]);

  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !expenseForm.amount) return;
    setIsSubmittingExpense(true);
    try {
      const payload = { 
        business_id: business.id, 
        category: expenseForm.category, 
        amount: Number(expenseForm.amount), 
        description: expenseForm.description, 
        date: expenseForm.date, 
        party_name: expenseForm.party_name,
        entry_type: 'expense',
        status: 'completed'
      };
      await addDoc(collection(db, 'expenses'), payload);
      alert("Expense added successfully!");
      setShowAddExpense(false);
      setExpenseForm({ category: 'Supplies & Food', amount: '', description: '', party_name: '', date: new Date().toISOString().split('T')[0] });
      const qExp = query(collection(db, 'expenses'), where('business_id', '==', business.id));
      const expSnap = await getDocs(qExp);
      const data = expSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.entry_type === 'expense')
        .sort((a: any, b: any) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
      if (data) setExpenses(data);
    } catch (err) {
      alert("Failed to add expense");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    if (newStatus === 'cancelled' && !window.confirm("Are you sure you want to cancel this booking? If the customer has already paid, a refund will be initiated.")) return;
    else if (newStatus === 'confirmed' && !window.confirm("Confirm this booking?")) return;

    try {
      const booking = bookings.find(b => b.id === bookingId);
      
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'checked_in') updatePayload.actual_check_in = new Date().toISOString();
      else if (newStatus === 'checked_out') updatePayload.actual_check_out = new Date().toISOString();
      await updateDoc(doc(db, 'bookings', bookingId), updatePayload);
      
      if (newStatus === 'checked_out' || newStatus === 'completed') {
        try {
          const qUpdates = query(collection(db, "pet_updates"), where("booking_id", "==", bookingId));
          const updatesSnap = await getDocs(qUpdates);
          for (const u of updatesSnap.docs) {
            await deleteDoc(doc(db, "pet_updates", u.id));
          }
          if (booking && booking.notes && booking.notes.includes("[CHAT_JSON]")) {
            const cleanedNotes = booking.notes.replace(/\[CHAT_JSON\].*?\[\/CHAT_JSON\]/gs, "").trim();
            await updateDoc(doc(db, 'bookings', bookingId), { notes: cleanedNotes });
          }
        } catch (e) {}
      }

      if (booking && booking.customer_id) {
        let title = ""; let msg = "";
        if (newStatus === "confirmed") { title = "Booking Confirmed! ✅"; msg = `Your booking at ${business?.name || 'the facility'} is confirmed.`; }
        else if (newStatus === "checked_in") { title = "Pet Checked In! 🐾"; msg = `Your pet has been checked in at ${business?.name || 'the facility'}.`; }
        else if (newStatus === "checked_out") { title = "Pet Checked Out 🏠"; msg = `Your pet has been checked out from ${business?.name || 'the facility'}.`; }
        else if (newStatus === "cancelled") { title = "Booking Cancelled ❌"; msg = `Your booking at ${business?.name || 'the facility'} was cancelled.`; }
        if (title) {
          try { await addDoc(collection(db, "notifications"), { user_id: booking.customer_id.id || booking.customer_id, title, message: msg, type: "info", related_booking_id: bookingId, created_at: new Date().toISOString() }); } catch (err) {}
        }
      }
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err) { alert("An error occurred."); }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayCheckIns = bookings.filter(b => b.check_in === today).length;
  const pendingRequests = bookings.filter(b => b.status === 'pending').length;
  const todayRevenue = bookings.filter(b => b.status !== 'cancelled' && (b.created_at || '').startsWith(today)).reduce((sum, b) => sum + (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0), 0);
  const activeBookingsCount = bookings.filter(b => b.status === 'checked_in').length;

  if (!isLoading && business && business.status === 'pending') {
    return (
      <PageTransition className="max-w-2xl mx-auto space-y-6 font-sans pb-24 pt-16 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">Pending Admin Approval</h1>
          <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed max-w-md mx-auto">
            Your partner account is currently under review by our Admin team. We are verifying your credentials to ensure safety for our pets. You will receive an email once approved.
          </p>
          <button onClick={() => useAuthStore.getState().logout()} className="px-8 py-3.5 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-slate-800 transition-colors shadow-md">
            Sign Out
          </button>
        </div>
      </PageTransition>
    );
  }

  if (!isLoading && business && business.status === 'active' && !business.agreed_to_commission) {
    return (
      <PageTransition className="max-w-3xl mx-auto space-y-6 font-sans pb-24 pt-12 px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-purple-200 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600" />
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Partner Commission Agreement</h1>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mt-1">Required Action</p>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 space-y-4 text-sm text-slate-600 font-medium">
            <p>Welcome to GouujiPets! Before you can start accepting bookings and managing your facility, you must agree to our platform commission terms.</p>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="font-black text-slate-900 mb-2">1. Platform Commission</h3>
              <p className="text-xs">GouujiPets charges a flat <strong>15% commission</strong> on all bookings and services processed through the platform. This fee covers payment processing, marketing, customer support, and platform maintenance.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="font-black text-slate-900 mb-2">2. Offline / Cash Payments</h3>
              <p className="text-xs">If you collect payments in cash from the customer at your facility, the 15% commission will be deducted from your automated online payouts or added to your "Payable to Admin" ledger.</p>
            </div>

            <p className="text-xs italic">By clicking "I Agree", you legally bind yourself and your business to these terms.</p>
          </div>

          <button 
            onClick={async () => {
              try {
                await updateDoc(doc(db, 'businesses', business.id), { agreed_to_commission: true });
                setBusiness({ ...business, agreed_to_commission: true });
              } catch (err) {
                alert("Failed to update agreement. Please try again.");
              }
            }} 
            className="w-full py-4 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/25 active:scale-95 flex items-center justify-center gap-2"
          >
            I Agree to the Commission Terms <ArrowUpRight size={18} />
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="max-w-7xl mx-auto space-y-6 font-sans pb-24">
      
      {/* Premium Glassmorphic Operations Banner */}
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-purple-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

        <div className="relative z-10 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-purple-300 text-purple-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
              ✔ VERIFIED CARE PARTNER
            </span>
            <span className="text-[10px] text-purple-200 font-bold uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10">
              {String(activeType).split(',')[0]} DESK
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
            {business ? business.name : `Welcome, ${user?.name || 'Care Facility Desk'}`}
          </h1>
          <p className="text-sm text-purple-200 font-medium mt-2 max-w-xl leading-relaxed">
            Real-time operations desk. All check-ins, guest stays, and financial ledgers auto-sync instantly.
          </p>
        </div>
        
        {business && (
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
             <button 
               onClick={() => setShowWalkIn(true)} 
               className="px-6 py-3.5 bg-white hover:bg-purple-50 text-purple-900 rounded-2xl font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
             >
                <Plus size={16} className="stroke-[3]" /> Register Walk-in
             </button>
             <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-x-auto custom-scrollbar">
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-purple-900 font-black shadow-lg' : 'text-purple-100 hover:bg-white/10'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('bookings')} 
                className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'bookings' ? 'bg-white text-purple-900 font-black shadow-lg' : 'text-purple-100 hover:bg-white/10'}`}
              >
                Reservations <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'bookings' ? 'bg-purple-100 text-purple-900' : 'bg-white/20'}`}>{bookings.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('services')} 
                className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all whitespace-nowrap ${activeTab === 'services' ? 'bg-white text-purple-900 font-black shadow-lg' : 'text-purple-100 hover:bg-white/10'}`}
              >
                Services
              </button>
             </div>
          </div>
        )}
      </div>

      {activeTab === 'bookings' && business && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">All Reservations Management</h2>
              <p className="text-xs font-medium text-slate-500">Instant status tracking, guest intake check-ins, and direct customer contact</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((tab) => {
                const count = tab === 'all' ? bookings.length : bookings.filter(b => b.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setBookingFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs capitalize transition-all ${
                      bookingFilter === tab ? 'bg-slate-900 text-white shadow-sm font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.replace('_', ' ')} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-black text-slate-500 border-y border-slate-200">
                  <th className="py-3 px-4">Customer & Pet</th>
                  <th className="py-3 px-4">Dates & Time</th>
                  <th className="py-3 px-4">Stay Status</th>
                  <th className="py-3 px-4 text-right">Pricing Summary</th>
                  <th className="py-3 px-4 text-center">Desk Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {bookings
                  .filter((b) => bookingFilter === 'all' || b.status === bookingFilter)
                  .map((booking) => {
                    const totalAmt = (Number(booking.total_amount) || 0) + (Number(booking.extra_expenses) || 0);
                    const pendingAmt = Math.max(0, totalAmt - Number(booking.total_paid || 0));
                    const bizName = booking.business_id?.name || allMyBusinesses.find(b => b.id === (typeof booking.business_id === 'string' ? booking.business_id : booking.business_id?.id))?.name || business?.name || 'Your Care Facility';
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900">{booking.customer_id?.full_name || 'Pet Parent'}</div>
                          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                            <PawPrint size={11} className="text-purple-600"/> {booking.pet_count || 1} Pet(s)
                          </div>
                          {booking.customer_id?.phone && <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1"><Phone size={10}/> {booking.customer_id.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-800 text-xs mb-0.5">{bizName}</div>
                          <div className="font-bold text-slate-700 text-[11px]">{booking.check_in ? new Date(booking.check_in).toLocaleString('en-IN', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : 'N/A'}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">To {booking.check_out ? new Date(booking.check_out).toLocaleString('en-IN', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            booking.status === 'confirmed' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 
                            booking.status === 'cancelled' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            booking.status === 'checked_in' ? 'bg-purple-600 text-white font-black animate-pulse shadow-2xs' :
                            booking.status === 'pending' ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-slate-900 text-sm">₹{totalAmt.toLocaleString()}</div>
                          {booking.status === 'cancelled' && Number(booking.total_paid) > 0 ? (
                            <div className="text-[9px] font-black uppercase text-purple-700">
                              Refund Processed: ₹{booking.total_paid}
                            </div>
                          ) : pendingAmt > 0 ? (
                            <div className="text-[9px] font-black text-purple-700 uppercase">Due: ₹{pendingAmt}</div>
                          ) : (
                            <div className="text-[9px] font-black text-purple-600 uppercase flex items-center justify-end gap-0.5"><CheckCircle2 size={10} /> Paid in Full</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex justify-center gap-1.5">
                            <button onClick={() => setSelectedBooking(booking)} className="p-2 bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-900 rounded-lg transition-all" title="Chat & Intake">
                              <MessageSquare size={14} />
                            </button>
                            <button onClick={() => setFinancialsModalData({ isOpen: true, booking })} className="p-2 bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-900 rounded-lg transition-all" title="Financials">
                              <DollarSign size={14} />
                            </button>
                            <button onClick={() => setMedicalModalData({ isOpen: true, booking })} className="p-2 bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-900 rounded-lg transition-all" title="Medical Records">
                              <FileText size={14} />
                            </button>
                          </div>
                          {booking.status === 'pending' && (
                            <div className="flex gap-1 justify-center mt-1.5">
                              <button onClick={() => handleUpdateStatus(booking.id, 'confirmed')} className="flex-1 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-black shadow-2xs">Approve</button>
                              <button onClick={() => handleUpdateStatus(booking.id, 'cancelled')} className="flex-1 py-1 bg-purple-100 text-purple-900 hover:bg-purple-200 rounded text-[10px] font-bold">Deny</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {bookings.filter((b) => bookingFilter === 'all' || b.status === bookingFilter).length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                No reservations currently in `{bookingFilter}` state.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'services' && business && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <ServicesManager businessId={business.id} />
        </motion.div>
      )}

      {activeTab === 'overview' && business && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Operations Column (Span 2) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Amazon Seller & VERIFIED KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:border-purple-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Today's Revenue</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black">₹</div>
                </div>
                <p className="text-2xl font-black text-slate-900">{formatRupee(todayRevenue)}</p>
                <p className="text-[10px] text-purple-600 font-bold mt-1">Gross Intake Today</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:border-purple-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Today's Check-ins</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center"><Users size={14} /></div>
                </div>
                <p className="text-2xl font-black text-slate-900">{todayCheckIns}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1">Scheduled Arrivals</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:border-purple-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Live Occupancy</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center"><PawPrint size={14} /></div>
                </div>
                <p className="text-2xl font-black text-slate-900">{activeBookingsCount}</p>
                <p className="text-[10px] text-purple-600 font-bold mt-1">Guests Currently in Care</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:border-purple-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Pending Requests</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center"><Calendar size={14} /></div>
                </div>
                <p className="text-2xl font-black text-slate-900">{pendingRequests}</p>
                <p className="text-[10px] text-purple-600 font-bold mt-1">Awaiting Desk Action</p>
              </div>
            </div>

            {/* Recent Reservations Table */}
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black">📋</div>
                  <h3 className="text-base font-black text-purple-950">Recent Stay Reservations</h3>
                </div>
                <button onClick={() => setActiveTab('bookings')} className="text-xs font-black text-purple-600 hover:underline">View All ({bookings.length}) →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-[10px] uppercase tracking-wider font-black text-purple-900 border-b border-purple-200">
                      <th className="p-3.5 px-4">Customer & Pet</th>
                      <th className="p-3.5 px-4">Stay Dates</th>
                      <th className="p-3.5 px-4">Status</th>
                      <th className="p-3.5 px-4 text-right">Amount</th>
                      <th className="p-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-purple-100">
                    {bookings.slice(0, 6).map((booking) => {
                      const totalAmt = (Number(booking.total_amount) || 0) + (Number(booking.extra_expenses) || 0);
                      const pendingAmt = Math.max(0, totalAmt - Number(booking.total_paid || 0));
                      return (
                      <tr key={booking.id} className="hover:bg-purple-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900">{booking.customer_id?.full_name || 'Pet Parent'}</div>
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5"><PawPrint size={10} className="text-purple-600"/> {booking.pet_count || 1} Pet(s)</div>
                        </td>
                        <td className="py-3 px-4">
                           <div className="font-bold text-slate-800 text-[11px]">{booking.check_in ? new Date(booking.check_in).toLocaleString('en-IN', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : 'N/A'}</div>
                           <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">To {booking.check_out ? new Date(booking.check_out).toLocaleString('en-IN', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            booking.status === 'confirmed' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 
                            booking.status === 'cancelled' ? 'bg-purple-50 text-purple-700' :
                            booking.status === 'checked_in' ? 'bg-purple-600 text-white font-black animate-pulse' :
                            booking.status === 'pending' ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-black text-slate-900">₹{totalAmt.toLocaleString()}</div>
                          {pendingAmt > 0 ? (
                            <div className="text-[9px] font-bold text-purple-700 uppercase">Due: ₹{pendingAmt}</div>
                          ) : (
                            <div className="text-[9px] font-bold text-purple-600 uppercase">Paid</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => setSelectedBooking(booking)} className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-lg transition-all shadow-2xs">
                            Manage
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                {bookings.length === 0 && <div className="text-center py-10 text-purple-400 text-xs font-medium">No reservations recorded yet.</div>}
              </div>
            </div>

          </div>

          {/* Quick Actions & Expense Log Sidebar (Span 1) */}
          <div className="space-y-6">
            
            {/* Quick Actions Panel */}
            <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm">
               <h3 className="text-sm font-black text-purple-950 mb-3.5 flex items-center gap-1.5">
                 <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                 Desk Quick Actions
               </h3>
               <div className="space-y-2.5">
                 <button onClick={() => setShowWalkIn(true)} className="w-full text-left p-3.5 rounded-xl bg-purple-50/70 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 transition-all flex items-center gap-3.5 group shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shrink-0 group-hover:scale-105 transition-transform"><Dog size={16} /></div>
                    <div>
                      <h4 className="font-black text-xs">Walk-in Client Intake</h4>
                      <p className="text-[10px] text-purple-700 group-hover:text-purple-100 font-medium">Register instant offline booking</p>
                    </div>
                 </button>
                 <button onClick={handleGenerateReport} className="w-full text-left p-3.5 rounded-xl bg-purple-50/70 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 transition-all flex items-center gap-3.5 group shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-purple-950 text-white flex items-center justify-center font-black shrink-0 group-hover:scale-105 transition-transform"><FileText size={16} /></div>
                    <div>
                      <h4 className="font-black text-xs">Financial Statements</h4>
                      <p className="text-[10px] text-purple-700 group-hover:text-purple-100 font-medium">Export revenue & tax sheets</p>
                    </div>
                 </button>
               </div>
            </div>

            {/* Expense Log */}
            <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm">
               <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-purple-100">
                 <h3 className="text-sm font-black text-purple-950">Center Expense Log</h3>
                 <button onClick={() => setShowAddExpense(true)} className="text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2.5 py-1 rounded-lg hover:bg-purple-700 transition-colors shadow-2xs">
                   + Add Expense
                 </button>
               </div>
               
               <div className="space-y-2.5 overflow-y-visible">
                 {expenses.slice(0, 6).map((exp, i) => (
                   <div key={i} className="flex items-center justify-between p-2.5 bg-purple-50/50 border border-purple-200/60 rounded-xl text-xs">
                     <div className="flex items-center gap-2.5">
                       <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs"><DollarSign size={12}/></div>
                       <div>
                         <p className="font-black text-slate-900 leading-tight">{exp.category}</p>
                         <p className="text-[10px] text-purple-700 font-medium mt-0.5">{exp.date}</p>
                       </div>
                     </div>
                     <span className="font-black text-purple-900">-₹{exp.amount}</span>
                   </div>
                 ))}
                 {expenses.length === 0 && <div className="text-center text-xs text-purple-400 py-6 font-medium">No expenses logged for this facility.</div>}
               </div>
            </div>

          </div>
        </div>
      )}

      {user && (
        <BusinessRegistrationModal isOpen={showRegistration} onClose={() => {}} onSuccess={(b) => { setBusiness(b); setShowRegistration(false); }} ownerId={user.id} defaultType={type || 'Boarding'} />
      )}
      {business && (
        <WalkInRegistrationModal isOpen={showWalkIn} onClose={() => setShowWalkIn(false)} businessId={business.id} onSuccess={() => {}} />
      )}
      {business && (
        <BookingFinancialsModal isOpen={financialsModalData.isOpen} onClose={() => setFinancialsModalData({ isOpen: false, booking: null })} booking={financialsModalData.booking} businessBaseRate={business.base_rate_per_day || 500} onSuccess={() => {}} />
      )}
      
      <PartnerMedicalModal isOpen={medicalModalData.isOpen} onClose={() => setMedicalModalData({ isOpen: false, booking: null })} booking={medicalModalData.booking} />
      
      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} role="partner" onOpenFinancials={() => setFinancialsModalData({ isOpen: true, booking: selectedBooking })} />
      )}

      {showAddExpense && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-slate-200 font-sans">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900">Add Center Expense</h2>
              <button onClick={() => setShowAddExpense(false)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 transition-colors"><X size={14} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-purple-600">
                  <option>Supplies & Food</option><option>Staff Salary</option><option>Facility Maintenance</option><option>Water & Electricity</option><option>Marketing & Ads</option><option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-purple-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                  <input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-purple-600" placeholder="e.g. 1500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Party / Vendor Name</label>
                <input type="text" value={expenseForm.party_name} onChange={(e) => setExpenseForm({ ...expenseForm, party_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-purple-600" placeholder="e.g. Amazon, Local Vet" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-purple-600" placeholder="e.g. Premium dog biscuits" />
              </div>
              <button type="submit" disabled={isSubmittingExpense} className="w-full py-3 mt-2 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md">
                {isSubmittingExpense ? 'Saving...' : 'Save Expense Record'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      
      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} business={business} bookings={bookings} expenses={expenses} />

    </PageTransition>
  );
};
