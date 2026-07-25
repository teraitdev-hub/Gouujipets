import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc, documentId, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  Check, X, LogIn, LogOut, Clock, CalendarDays,
  User, Phone, PawPrint, Loader2, RefreshCw, AlertCircle, ChevronRight, IndianRupee, MessageSquare,
  Camera, DollarSign, FileText
} from "lucide-react";
import { BookingDetailModal } from "../../components/bookings/BookingDetailModal";
import { BookingFinancialsModal } from "../../components/partner/BookingFinancialsModal";
import { PartnerMedicalModal } from "../../components/partner/PartnerMedicalModal";
import { createJournalEntry } from "../../utils/dbFallback";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  pet_count: number;
  total_amount: number;
  total_paid: number;
  actual_check_in?: string;
  actual_check_out?: string;
  type: string;
  customer_id: { full_name: string; phone: string; email: string } | null;
  business_id: { id: string; owner_id: string; name: string } | null;
  notes?: string;
  pet_updates?: any;
  pet_names?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function formatTime(d: string | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// Status badge styling
const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-purple-100 text-purple-700",
  confirmed:   "bg-blue-100 text-blue-700",
  checked_in:  "bg-purple-100 text-purple-700",
  checked_out: "bg-purple-100 text-purple-700",
  rejected:    "bg-purple-100 text-purple-700",
  cancelled:   "bg-gray-100 text-gray-500",
  completed:   "bg-purple-100 text-purple-700",
};

// ─── Page config driven by URL path ──────────────────────────────────────────
interface PageConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  emptyMsg: string;
  filter: (b: Booking) => boolean;
}

function usePageConfig(): PageConfig {
  const { pathname } = useLocation();

  if (pathname.includes("current-pets")) {
    return {
      title: "Current Pets (Active Stays)",
      subtitle: "Pets that are currently checked in at your facility",
      icon: <PawPrint size={22} className="text-purple-600" />,
      emptyMsg: "No pets are currently checked in.",
      filter: (b) => b.status === "checked_in",
    };
  }
  if (pathname.includes("check-in")) {
    return {
      title: "Today's Check-Ins",
      subtitle: "Confirmed bookings whose check-in date is today",
      icon: <LogIn size={22} className="text-blue-600" />,
      emptyMsg: "No check-ins scheduled for today.",
      // Any booking scheduled to check in today that hasn't been cancelled/rejected
      filter: (b) => b.check_in?.startsWith(today()) && ['confirmed', 'checked_in', 'checked_out', 'completed'].includes(b.status),
    };
  }
  if (pathname.includes("check-out")) {
    return {
      title: "Today's Check-Outs",
      subtitle: "Currently checked-in pets whose check-out date is today",
      icon: <LogOut size={22} className="text-purple-600" />,
      emptyMsg: "No check-outs scheduled for today.",
      // Any booking scheduled to check out today that actually arrived
      filter: (b) => b.check_out?.startsWith(today()) && ['checked_in', 'checked_out', 'completed'].includes(b.status),
    };
  }
  if (pathname.includes("upcoming")) {
    return {
      title: "Upcoming Bookings",
      subtitle: "Confirmed bookings arriving in the future",
      icon: <CalendarDays size={22} className="text-purple-600" />,
      emptyMsg: "No upcoming confirmed bookings.",
      // confirmed + check_in is in the future (strictly after today)
      filter: (b) => b.status === "confirmed" && b.check_in?.split('T')[0] > today(),
    };
  }
  // Default: /partner/bookings → All Bookings
  return {
    title: "All Bookings",
    subtitle: "Manage all bookings and history",
    icon: <CalendarDays size={22} className="text-purple-600" />,
    emptyMsg: "No bookings found.",
    filter: (b) => true, // Show all
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const PartnerBookings = () => {
  const { user } = useAuthStore();
  const config = usePageConfig();
  const { pathname } = useLocation();

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [financialsModalData, setFinancialsModalData] = useState<{ isOpen: boolean; booking: any | null }>({ isOpen: false, booking: null });
  const [medicalModalData, setMedicalModalData] = useState<{ isOpen: boolean; booking: any | null }>({ isOpen: false, booking: null });
  
  // Local tab state for the "All Bookings" view
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "past" | "all">("all");

  // ── Fetch all bookings for this partner ──────────────────────────────────
  const fetchBookings = useCallback(async () => {
    if (!user) return;

    // Step 1: Get all businesses owned by this partner
    const qBiz = query(collection(db, 'businesses'), where('owner_id', '==', user.id));
    const bizSnap = await getDocs(qBiz);
    let bizList: any[] = bizSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let primaryBiz: any = null;
    if (!bizList || bizList.length === 0) {
      primaryBiz = { id: `partner-facility-${user.id}`, name: `${user.full_name || 'Care Partner'}'s Facility` };
      bizList = [primaryBiz];
    } else {
      primaryBiz = bizList[0];
    }

    const bizIds = bizList.map(b => b.id);

    // Step 2: Fetch bookings for those businesses
    let data: any[] = [];
    if (bizIds.length > 0) {
      for (let i = 0; i < bizIds.length; i += 10) {
        const chunk = bizIds.slice(i, i + 10);
        const qBk = query(collection(db, 'bookings'), where('business_id', 'in', chunk));
        const bkSnap = await getDocs(qBk);
        bkSnap.docs.forEach(d => data.push({ id: d.id, ...d.data() }));
      }
    }
    
    // Sort descending by created_at
    data.sort((a: any, b: any) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    // Populate relations
    const customerIds = [...new Set(data.map(b => typeof b.customer_id === 'string' ? b.customer_id : b.customer_id?.id).filter(Boolean))];
    const customerMap = new Map();
    for (let i = 0; i < customerIds.length; i += 10) {
      const chunk = customerIds.slice(i, i + 10);
      const qUsers = query(collection(db, 'users'), where(documentId(), 'in', chunk));
      const uSnap = await getDocs(qUsers);
      uSnap.docs.forEach(d => customerMap.set(d.id, { id: d.id, ...d.data() }));
    }
    
    const bizMap = new Map(bizList.map(b => [b.id, b]));

    data = data.map(b => ({
      ...b,
      customer_id: typeof b.customer_id === 'string' ? customerMap.get(b.customer_id) : b.customer_id,
      business_id: typeof b.business_id === 'string' ? bizMap.get(b.business_id) : b.business_id,
      pet_updates: b.pet_updates || []
    }));

    // Keep empty if no bookings exist in database

    if (data && data.length > 0) {
      // Fetch pet names if missing
      const allPetIds = data.flatMap(b => b.pet_ids || []);
      const uniquePetIds = [...new Set(allPetIds)];
      if (uniquePetIds.length > 0) {
        let petData: any[] = [];
        for (let i = 0; i < uniquePetIds.length; i += 10) {
          const chunk = uniquePetIds.slice(i, i + 10);
          const qPets = query(collection(db, 'pets'), where(documentId(), 'in', chunk));
          const pSnap = await getDocs(qPets);
          pSnap.docs.forEach(d => petData.push({ id: d.id, ...d.data() }));
        }
        if (petData.length > 0) {
          const petMap = Object.fromEntries(petData.map(p => [p.id, p.name]));
          data.forEach(b => {
            if (!b.pet_names) {
              b.pet_names = (b.pet_ids || []).map((id: string) => petMap[id]).filter(Boolean).join(', ');
            }
          });
        }
      }
      setAllBookings(data as any);
    } else {
      setAllBookings([]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    fetchBookings();

    // Realtime subscription — refresh when bookings change
    const qBk = query(collection(db, 'bookings'));
    const unsubscribeBk = onSnapshot(qBk, () => {
      fetchBookings();
    });

    // 3-second polling — ensures new bookings appear even if realtime websocket lags
    const pollingInterval = setInterval(() => {
      fetchBookings();
    }, 3000);

    return () => {
      unsubscribeBk();
      clearInterval(pollingInterval);
    };
  }, [fetchBookings, user?.id]);

  // ── Status transitions ────────────────────────────────────────────────────
  const updateStatus = async (bookingId: string, newStatus: string, extraFields: Record<string, any> = {}) => {
    setActionLoading(bookingId + newStatus);
    
    if (newStatus === "checked_in") extraFields.actual_check_in = new Date().toISOString();
    if (newStatus === "checked_out") extraFields.actual_check_out = new Date().toISOString();

    let error = null;
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: newStatus, ...extraFields });
    } catch (e) {
      error = e;
    }

    if (!error) {
      setAllBookings(prev =>
        prev.map(b =>
          b.id === bookingId ? { ...b, status: newStatus, ...extraFields } : b
        )
      );
      
      // Fulfill checkout live feed deletion requirement: delete all live feed updates and chat fallback notes for this booking
      if (newStatus === "checked_out" || newStatus === "completed") {
        try {
          const qUpdates = query(collection(db, "pet_updates"), where("booking_id", "==", bookingId));
          const updatesSnap = await getDocs(qUpdates);
          for (const u of updatesSnap.docs) {
            await deleteDoc(doc(db, "pet_updates", u.id));
          }
          const bookingObj = allBookings.find(b => b.id === bookingId);
          if (bookingObj?.notes && bookingObj.notes.includes("[CHAT_JSON]")) {
            const cleanedNotes = bookingObj.notes.replace(/\[CHAT_JSON\].*?\[\/CHAT_JSON\]/gs, "").trim();
            await updateDoc(doc(db, "bookings", bookingId), { notes: cleanedNotes });
          }
        } catch (cleanErr) {
          console.error("Failed to delete live feed on checkout:", cleanErr);
        }
      }

      // Automate Journal Entry for Refunds
      if (newStatus === "cancelled" || newStatus === "rejected") {
        const booking = allBookings.find(b => b.id === bookingId);
        if (booking && booking.total_paid > 0) {
          await createJournalEntry({
            business_id: booking.business_id?.id || "",
            entry_type: 'expense',
            category: 'Booking Refund',
            amount: booking.total_paid,
            date: new Date().toISOString().split('T')[0],
            description: `Auto-refund for ${newStatus} booking (ID: ${booking.id})`,
            party_name: booking.customer_id?.full_name || "Customer",
            status: 'completed'
          });
        }
      }

      // Notify customer
      try {
        const booking = allBookings.find(b => b.id === bookingId);
        let title = "";
        let msg = "";
        
        if (newStatus === "confirmed") {
          title = "Booking Confirmed! ✅";
          msg = `Your booking at ${booking?.business_id?.name || 'the facility'} is confirmed.`;
        } else if (newStatus === "checked_in") {
          title = "Pet Checked In! 🐾";
          msg = `Your pet has been checked in at ${booking?.business_id?.name || 'the facility'}.`;
        } else if (newStatus === "checked_out") {
          title = "Pet Checked Out 🏠";
          msg = `Your pet has been checked out from ${booking?.business_id?.name || 'the facility'}.`;
        }
        
        if (title && booking?.customer_id) {
          await addDoc(collection(db, "notifications"), {
            user_id: (booking.customer_id as any).id || booking.customer_id,
            title,
            message: msg,
            type: "info",
            related_booking_id: bookingId,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Failed to send notification", err);
      }
    } else {
      console.error("Failed to update status:", error);
      alert("Failed to update booking status. Please ensure your database is up to date (run the latest migrations).");
    }
    setActionLoading(null);
  };

  const handleAccept  = (id: string) => updateStatus(id, "confirmed");
  const handleReject  = (id: string) => updateStatus(id, "rejected");
  const handleCheckIn = (id: string) => updateStatus(id, "checked_in", { actual_check_in: new Date().toISOString() });
  const handleCheckOut = (id: string) => updateStatus(id, "checked_out", { actual_check_out: new Date().toISOString() });

  // ── Apply page filter ────────────────────────────────────────────────────
  let displayed = allBookings.filter(config.filter);

  // If we are on the "All Bookings" page, apply the local tab filter
  if (pathname === "/partner/bookings") {
    if (activeTab === "pending") {
      displayed = displayed.filter(b => b.status === "pending");
    } else if (activeTab === "active") {
      displayed = displayed.filter(b => ["confirmed", "checked_in"].includes(b.status));
    } else if (activeTab === "past") {
      displayed = displayed.filter(b => ["completed", "checked_out", "cancelled", "rejected"].includes(b.status));
    }
  }

  // Also compute counts for the header pills
  const todayStr = today();
  const counts = {
    pending:   allBookings.filter(b => b.status === "pending").length,
    upcoming:  allBookings.filter(b => b.status === "confirmed" && b.check_in?.split('T')[0] > todayStr).length,
    checkIn:   allBookings.filter(b => b.check_in?.startsWith(todayStr) && ['confirmed', 'checked_in', 'checked_out', 'completed'].includes(b.status)).length,
    checkOut:  allBookings.filter(b => b.check_out?.startsWith(todayStr) && ['checked_in', 'checked_out', 'completed'].includes(b.status)).length,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-purple-50">
            {config.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black text-purple-950">{config.title}</h2>
            <p className="text-sm text-purple-600 mt-0.5">{config.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchBookings(); }}
          className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-white border border-purple-100 rounded-xl font-semibold text-sm hover:bg-purple-50 transition-colors shadow-sm"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Summary pills & Tabs – shown only on the main /bookings route */}
      {pathname === "/partner/bookings" && (
        <div className="space-y-6">
          {/* Quick counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Pending",       count: counts.pending,   color: "bg-purple-50 border-purple-100 text-purple-700" },
              { label: "Upcoming",      count: counts.upcoming,  color: "bg-blue-50 border-blue-100 text-blue-700" },
              { label: "Check-in Today",count: counts.checkIn,   color: "bg-purple-50 border-purple-100 text-purple-700" },
              { label: "Check-out Today",count: counts.checkOut, color: "bg-purple-50 border-purple-100 text-purple-700" },
            ].map(pill => (
              <div key={pill.label} className={`rounded-2xl border px-4 py-3 ${pill.color}`}>
                <p className="text-2xl font-black">{pill.count}</p>
                <p className="text-xs font-semibold mt-0.5">{pill.label}</p>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
            {[
              { id: "pending", label: `Pending (${counts.pending})` },
              { id: "active",  label: "Active Stays" },
              { id: "past",    label: "History" },
              { id: "all",     label: `All (${allBookings.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-purple-50 text-purple-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's date strip for check-in / check-out pages */}
      {(pathname.includes("check-in") || pathname.includes("check-out")) && (
        <div className="flex items-center gap-2 bg-white border border-purple-100 rounded-2xl px-5 py-3 shadow-sm">
          <CalendarDays size={18} className="text-purple-500" />
          <span className="font-bold text-purple-950">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span className="ml-auto text-sm text-purple-600 font-semibold bg-purple-50 px-3 py-1 rounded-full">
            {displayed.length} booking{displayed.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Booking Cards */}
      <div className="space-y-4">
        {displayed.map(booking => {
          const isActing = actionLoading?.startsWith(booking.id);
          const nightCount = Math.max(1, Math.ceil(
            (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
          ));

          return (
            <div
              key={booking.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Card top strip */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                {/* Left: customer & booking info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${STATUS_COLORS[booking.status] || "bg-gray-100 text-gray-500"}`}>
                      {booking.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{booking.id.slice(0, 8)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-900 font-bold text-lg mt-2">
                    <User size={16} className="text-purple-500 shrink-0" />
                    {booking.customer_id?.full_name || "Customer"}
                  </div>
                  {booking.customer_id?.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone size={13} className="shrink-0" /> {booking.customer_id.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <PawPrint size={13} className="shrink-0" /> {booking.pet_names ? booking.pet_names : `${booking.pet_count} pet(s)`}
                  </div>
                </div>

                {/* Right: dates and amount */}
                <div className="text-right shrink-0 pl-4">
                  <div className="text-sm font-bold text-gray-900">
                    {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{nightCount} night{nightCount > 1 ? "s" : ""}</div>
                  <div className="text-lg font-black text-purple-600 mt-1">
                    ₹{(booking.total_amount || booking.total_paid || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Direct Pet Intake Details */}
              {(() => {
                let intakeData: any = null;
                if (booking.notes && booking.notes.includes("[INTAKE_JSON]")) {
                  const startIdx = booking.notes.indexOf("[INTAKE_JSON]") + 13;
                  const endIdx = booking.notes.indexOf("[/INTAKE_JSON]");
                  if (endIdx > -1) {
                    try {
                      intakeData = JSON.parse(booking.notes.substring(startIdx, endIdx));
                    } catch (e) {}
                  }
                }

                if (!intakeData) {
                  return (
                    <div className="mx-6 mb-4 bg-purple-50/60 rounded-xl p-4 border border-purple-100">
                      <p className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText size={14} /> Booking Details & Notes
                      </p>
                      <div className="text-xs font-medium text-purple-950 whitespace-pre-wrap">
                        {booking.notes ? booking.notes.replace(/\[CHAT_JSON\].*?\[\/CHAT_JSON\]/gs, '').trim() : "No details available."}
                      </div>
                    </div>
                  );
                }

                if (intakeData.pets && Array.isArray(intakeData.pets)) {
                  return (
                    <div className="mx-6 mb-4 bg-purple-50/60 rounded-xl p-4 border border-purple-100 space-y-3">
                      <p className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} /> Customer Pet Intake Details ({intakeData.pets.length} Pet{intakeData.pets.length > 1 ? 's' : ''})
                      </p>
                      {intakeData.pets.map((p: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-purple-100 text-xs space-y-1.5 shadow-2xs">
                          <div className="font-black text-purple-950 flex justify-between">
                            <span>{p.name} ({p.breed || 'Mixed'} {p.species})</span>
                            {p.weight && <span>{p.weight} kg</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                            {p.food_preferences && <div><strong className="text-purple-500 block text-[9px] uppercase">Food & Diet:</strong> {p.food_preferences}</div>}
                            {p.allergies && <div><strong className="text-purple-600 block text-[9px] uppercase">Allergies:</strong> {p.allergies}</div>}
                            {p.medical_history && <div className="col-span-2"><strong className="text-purple-600 block text-[9px] uppercase">Medical History:</strong> {p.medical_history}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="mx-6 mb-4 bg-purple-50/60 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText size={14} /> Customer Pet Intake Details
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      {Object.entries(intakeData).map(([key, val]) => {
                        if (val === "" || val === false || val == null) return null;
                        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return (
                          <div key={key} className={`col-span-2 ${String(val).length > 40 ? '' : 'sm:col-span-1'}`}>
                            <span className="block text-[10px] font-bold text-purple-600/70 uppercase mb-0.5">{formattedKey}</span>
                            <span className="text-xs font-semibold text-purple-950 whitespace-pre-wrap">
                              {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Check-in / check-out timestamps (if available) */}
              {(booking.actual_check_in || booking.actual_check_out) && (
                <div className="mx-6 mb-3 flex gap-4 bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500">
                  {booking.actual_check_in && (
                    <span className="flex items-center gap-1">
                      <LogIn size={12} className="text-purple-500" />
                      Checked in: {formatTime(booking.actual_check_in)}
                    </span>
                  )}
                  {booking.actual_check_out && (
                    <span className="flex items-center gap-1">
                      <LogOut size={12} className="text-purple-500" />
                      Checked out: {formatTime(booking.actual_check_out)}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-50 px-6 py-4 flex gap-3 flex-wrap">
                {booking.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleAccept(booking.id)}
                      disabled={!!isActing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      {isActing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Accept Booking
                    </button>
                    <button
                      onClick={() => handleReject(booking.id)}
                      disabled={!!isActing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      <X size={15} /> Reject
                    </button>
                  </>
                )}

                {booking.status === "confirmed" && (
                  <button
                    onClick={() => handleCheckIn(booking.id)}
                    disabled={!!isActing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {isActing ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                    Mark Check-In
                  </button>
                )}

                {booking.status === "checked_in" && (
                  <button
                    onClick={() => handleCheckOut(booking.id)}
                    disabled={!!isActing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {isActing ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                    Mark Check-Out
                  </button>
                )}

                {booking.status === "checked_out" && (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl font-bold text-sm">
                    <Clock size={15} /> Stay Completed
                  </div>
                )}

              {booking.status === "rejected" && (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl font-bold text-sm">
                    <X size={15} /> Booking Rejected
                  </div>
                )}
                
                <div className="ml-auto flex items-center gap-2">
                  {(() => {
                    let allUpdates = booking.pet_updates || [];
                    if (booking.notes) {
                      const chatRegex = /\[CHAT_JSON\](.*?)\[\/CHAT_JSON\]/gs;
                      let match;
                      while ((match = chatRegex.exec(booking.notes)) !== null) {
                        try { allUpdates.push(JSON.parse(match[1])); } catch (e) {}
                      }
                    }
                    allUpdates.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    const hasUnread = allUpdates.length > 0 && allUpdates[allUpdates.length - 1].sender_id !== user?.id;
                    return (
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="relative px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                        )}
                        <MessageSquare size={14} /> Intake & Details
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => setFinancialsModalData({ isOpen: true, booking })}
                    className="px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <DollarSign size={14} /> Finance
                  </button>
                  <button
                    onClick={() => setMedicalModalData({ isOpen: true, booking })}
                    className="px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <FileText size={14} /> Medical
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-purple-200 text-center">
            <AlertCircle size={36} className="text-purple-300 mb-3" />
            <p className="text-purple-700 font-bold text-lg">{config.emptyMsg}</p>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          role="partner"
          onOpenFinancials={() => setFinancialsModalData({ isOpen: true, booking: selectedBooking })}
        />
      )}
      
      {financialsModalData.isOpen && (
        <BookingFinancialsModal 
          isOpen={financialsModalData.isOpen} 
          onClose={() => setFinancialsModalData({ isOpen: false, booking: null })} 
          booking={financialsModalData.booking} 
          businessBaseRate={500} 
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}

      {/* Medical/Vaccination Modal */}
      <PartnerMedicalModal
        isOpen={medicalModalData.isOpen}
        onClose={() => setMedicalModalData({ isOpen: false, booking: null })}
        booking={medicalModalData.booking}
      />

    </div>
  );
};
