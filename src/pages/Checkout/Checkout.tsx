import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import {
  ArrowLeft, Calendar, CreditCard, ShieldCheck, CheckCircle,
  Clock, Tag, IndianRupee, AlertCircle, Loader2, Check
} from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { createJournalEntry } from "../../utils/dbFallback";
import { useAuthStore } from "../../store/useAuthStore";
import { db } from "../../lib/firebase";
import { getDoc, doc, collection, query, where, getDocs, setDoc, addDoc } from "firebase/firestore";
import { usePet } from "../../context/PetContext";
import { useRazorpay } from "../../hooks/useRazorpay"; // kept for future live payment integration
import { UiverseButton } from "../../components/ui/UiverseButton";
import { UiverseLoader } from "../../components/ui/UiverseLoader";
import { AddPetModal } from "../../components/pets/AddPetModal";
import { LocationPicker } from "../../components/ui/LocationPicker";

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '0.75rem'
};

const center = {
  lat: 28.6139,
  lng: 77.2090
}; // Default to Delhi
// ─── Types ──────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_mins: number;
}

// ─── Payment method config ───────────────────────────
const PAYMENT_METHODS = [
  { id: "card",       label: "Credit / Debit Card", icon: "💳" },
  { id: "upi",        label: "UPI",                  icon: "📱" },
  { id: "netbanking", label: "Net Banking",           icon: "🏦" },
  { id: "wallet",     label: "Wallet",               icon: "👛" },
];

const parseTimeTo12h = (time24: string) => {
  if (!time24) return { hour: "10", minute: "00", period: "AM" as "AM" | "PM" };
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr || "10", 10);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return {
    hour: h.toString().padStart(2, "0"),
    minute: (mStr || "00").padStart(2, "0"),
    period,
  };
};

const formatTime12to24 = (hour: string, minute: string, period: "AM" | "PM") => {
  let h = parseInt(hour || "12", 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h < 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

export const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ ALL HOOKS AT THE TOP — no conditional calls
  const { user } = useAuthStore();
  const { pets } = usePet();
  const { openPayment } = useRazorpay();

  const [facility, setFacility] = useState<any>(location.state?.facility || null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>(location.state?.selectedServices || []);
  const [isLoading, setIsLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("10:00");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("10:00");
  
  const checkIn = checkInDate && checkInTime ? `${checkInDate}T${checkInTime}` : "";
  const checkOut = checkOutDate && checkOutTime ? `${checkOutDate}T${checkOutTime}` : "";
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentType, setPaymentType] = useState<"full" | "advance" | "paylater">("advance");
  const [customAdvance, setCustomAdvance] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [petToEditInModal, setPetToEditInModal] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; bookingId?: string; paymentId?: string } | null>(null);
  const [error, setError] = useState("");
  const [unavailableServices, setUnavailableServices] = useState<string[]>([]);
  const [isBoardingFull, setIsBoardingFull] = useState(false);
  const [needsPickup, setNeedsPickup] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);

  const nights = () => {
    if (!checkInDate || !checkOutDate) return 1;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const basePrice = () => {
    const rate = Number(facility?.price_per_night || facility?.base_rate_per_day || 999);
    return rate * nights() * Math.max(1, selectedPets.length);
  };

  const servicesTotal = selectedServices.reduce((sum, sid) => {
    const srv = services.find((s: any) => s.id === sid);
    return sum + Number(srv?.price || 0);
  }, 0);

  const taxes = Math.round((basePrice() + servicesTotal) * 0.18);

  const grandTotal = () => {
    return basePrice() + servicesTotal + taxes;
  };

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  
  useEffect(() => {
    const fetchAll = async () => {
      try {
        if (id) {
          // Facility
          if (!facility) {
            const docRef = doc(db, "businesses", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as any;
              setFacility({
                ...data,
                images: [data.image_url || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800"],
                priceFrom: data.price_per_night || data.priceFrom || 999,
              });
            }
          }

          // Active services for this partner
          const srvQ = query(collection(db, "services"), where("business_id", "==", id), where("is_active", "==", true));
          const srvSnap = await getDocs(srvQ);
          const srvData = srvSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
          if (srvData) setServices(srvData);
        }
      } catch (err) {
        console.error("Checkout fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [id, location.state]);

  // ── Capacity Check Effect ─────────────────────────────
  useEffect(() => {
    const checkAvailability = async () => {
      if (!id) return;
      try {
        const obQ = query(collection(db, "bookings"), where("business_id", "==", id), where("status", "in", ["pending", "confirmed", "checked_in"]));
        const obSnap = await getDocs(obQ);
        const overlappingBookings = obSnap.docs
          .map(d => d.data())
          .filter(b => b.check_in < checkOut && b.check_out > checkIn);
          
        if (!overlappingBookings.length) return;
        
        const currentBookedPets = overlappingBookings.reduce((sum, b) => sum + (b.pet_count || 1), 0);
        
        // Boarding Capacity
        const boardingService = services.find((s: any) => s.category === 'boarding' || s.name.toLowerCase().includes('boarding'));
        const maxCapacity = (boardingService as any)?.capacity || 15;
        
        if (currentBookedPets + (selectedPets.length || 1) > maxCapacity) {
          setIsBoardingFull(true);
        } else {
          setIsBoardingFull(false);
        }
        
        // Add-on Capacities
        const bookedServiceCounts: Record<string, number> = {};
        overlappingBookings.forEach(b => {
          if (b.selected_services && Array.isArray(b.selected_services)) {
            b.selected_services.forEach((svc: any) => {
               const svcId = typeof svc === 'string' ? svc : svc.id;
               if (svcId) {
                 bookedServiceCounts[svcId] = (bookedServiceCounts[svcId] || 0) + (b.pet_count || 1);
               }
            });
          }
        });
        
        const unavailable = [];
        for (const s of services) {
          const svcCapacity = (s as any).capacity;
          if (!svcCapacity) continue;
          const currentCount = bookedServiceCounts[s.id] || 0;
          if (currentCount + Math.max(1, selectedPets.length) > svcCapacity) {
            unavailable.push(s.id);
          }
        }
        setUnavailableServices(unavailable);
      } catch (err) {
        console.error("Availability check error:", err);
      }
    };
    if (checkInDate && checkOutDate) {
      checkAvailability();
    }
  }, [checkInDate, checkOutDate, checkInTime, checkOutTime, facility]);

  const handleBookNow = async () => {
    if (isProcessing) return;

    const start = new Date(`${checkInDate}T${checkInTime}`);
    const end = new Date(`${checkOutDate}T${checkOutTime}`);
    const now = new Date();
    
    if (start < now) {
      setError("Check-in date and time cannot be in the past.");
      return;
    }
    
    if (end <= start) {
      setError("Check-out date/time must be after check-in date/time.");
      return;
    }
    setError("");

    if (!user) { setError("Please log in to continue."); return; }
    if (selectedPets.length === 0) { setError("Please select at least one pet."); return; }
    if (!checkInDate) { setError("Please select a check-in date."); return; }
    if (!checkInTime) { setError("Please select a check-in time."); return; }
    if (!checkOutDate) { setError("Please select a check-out date."); return; }
    if (!checkOutTime) { setError("Please select a check-out time."); return; }
    if (needsPickup && !pickupLocation) { setError("Please select your pickup location on the map."); return; }
    setIsProcessing(true);
    try {
      await new Promise(res => setTimeout(res, 1200));

      const paymentId = `pay_demo_${Date.now()}`;

      await setDoc(doc(db, "users", user.id), {
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
        role: user.user_metadata?.role || "customer"
      }, { merge: true });

      const selectedPetsData = pets
        .filter(p => selectedPets.includes(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          weight: p.weight,
          behavior_notes: p.behavior_notes || '',
          aggression_triggers: p.aggression_triggers || '',
          calming_methods: p.calming_methods || '',
          food_preferences: p.food_preferences || '',
          allergies: p.allergies || '',
          skin_details: p.skin_details || '',
          ideal_temperature: p.ideal_temperature || '',
          vaccination_report: p.vaccination_report || '',
          next_vaccination_date: p.next_vaccination_date || '',
          security_measures: p.security_measures || '',
          vet_service_required: p.vet_service_required || false,
          medical_history: p.medical_history || ''
        }));

      const payload = {
        customer_id: user.id,
        business_id: facility.id,
        check_in: checkIn,
        check_out: checkOut,
        pet_count: selectedPets.length,
        pet_ids: selectedPets,
        total_amount: grandTotal(),
        total_paid: paymentType === "advance" ? (customAdvance ? Number(customAdvance) : grandTotal() / 2) : (paymentType === "paylater" ? 0 : grandTotal()),
        payment_method: paymentMethod,
        selected_services: selectedServices.map((id: string) => services.find((s: any) => s.id === id)).filter(Boolean),
        status: "pending",
        type: facility.type || "boarding",
        pickup_required: needsPickup,
        pickup_location: needsPickup ? pickupLocation : null,
        notes: `Payment ID: ${paymentId}\n\nSelected Pet Profiles & Instructions:\n[INTAKE_JSON]${JSON.stringify({ pets: selectedPetsData })}[/INTAKE_JSON]`,
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "bookings"), payload);

      await addDoc(collection(db, "notifications"), {
        user_id: facility.owner_id,
        title: "New Booking Request",
        message: `${user.full_name || "A customer"} has requested a booking for ${nights()} night(s). Payment of ${formatRupee(grandTotal())} received.`,
        type: "info",
        related_booking_id: docRef.id,
        created_at: new Date().toISOString()
      });

      // Automate Journal Entry for Partner Revenue
      const paidAmount = paymentType === "advance" ? (customAdvance ? Number(customAdvance) : grandTotal() / 2) : (paymentType === "paylater" ? 0 : grandTotal());
      if (paidAmount > 0) {
        await createJournalEntry({
          business_id: facility.id,
          entry_type: 'revenue',
          category: 'Booking Income',
          amount: paidAmount,
          date: new Date().toISOString().split('T')[0],
          description: `Booking deposit/payment received from ${user.full_name || 'Customer'} (Booking ID: ${docRef.id})`,
          party_name: user.full_name || "Customer",
          status: 'completed'
        });
        
        // Auto-deduct 15% Platform Commission
        const commissionAmount = paidAmount * 0.15;
        await createJournalEntry({
          business_id: facility.id,
          entry_type: 'expense',
          category: 'Platform Commission',
          amount: commissionAmount,
          date: new Date().toISOString().split('T')[0],
          description: `15% Platform fee for collected amount (Booking ID: ${docRef.id})`,
          party_name: "GouujiPets Platform",
          status: 'completed'
        });
      }

      setBookingResult({ success: true, bookingId: docRef.id, paymentId });
    } catch (err: any) {
      setError("Booking failed: " + (err.message || "Please try again."));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Conditional RENDERS (after all hooks) ──────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <UiverseLoader text="loading" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
        <AlertCircle size={40} className="text-purple-500" />
        <h2 className="text-2xl font-bold">Facility Not Found</h2>
        <button onClick={() => navigate(-1)} className="bg-gray-900 text-white px-6 py-2 rounded-full font-bold">Go Back</button>
      </div>
    );
  }

  if (bookingResult?.success) {
    return (
      <PageTransition className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[24px] shadow-sm text-center max-w-md w-full border border-purple-100">
          <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={44} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 font-medium mb-1">
            Your booking at <span className="font-bold text-gray-800">{facility.name}</span> is submitted.
          </p>
          <p className="text-sm text-purple-600 font-semibold mb-4">⏳ Awaiting partner confirmation</p>

          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Payment ID</span>
              <span className="font-mono font-bold text-gray-800 text-xs">{bookingResult.paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check-in</span>
              <span className="font-bold text-gray-800">{new Date(checkIn).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check-out</span>
              <span className="font-bold text-gray-800">{new Date(checkOut).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-black text-purple-600">{formatRupee(grandTotal())}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors"
            >
              View My Bookings
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const facilityImage = facility.images?.[0] || facility.image_url ||
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800";
  const nightCount = nights();

  return (
    <PageTransition className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] pb-32">
      <header className="bg-white border-b border-gray-100 py-3 px-4 sm:px-6 relative z-10 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">Secure Checkout</h1>
            <p className="text-[11px] text-gray-400">{facility.name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-8 space-y-3.5 sm:space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-2 rounded-xl text-xs font-medium">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
              Select Dates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/70 space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Check-in Date & Time</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  min={today}
                  onChange={e => {
                    setCheckInDate(e.target.value);
                    if (checkOutDate && e.target.value > checkOutDate) setCheckOutDate("");
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all text-xs shadow-2xs"
                />
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                  <select
                    value={parseTimeTo12h(checkInTime).hour}
                    onChange={e => {
                      const parsed = parseTimeTo12h(checkInTime);
                      setCheckInTime(formatTime12to24(e.target.value, parsed.minute, parsed.period));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-extrabold text-slate-900 text-xs outline-none focus:border-brand-500 cursor-pointer flex-1 text-center"
                  >
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="font-extrabold text-slate-400 text-xs">:</span>
                  <select
                    value={parseTimeTo12h(checkInTime).minute}
                    onChange={e => {
                      const parsed = parseTimeTo12h(checkInTime);
                      setCheckInTime(formatTime12to24(parsed.hour, e.target.value, parsed.period));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-extrabold text-slate-900 text-xs outline-none focus:border-brand-500 cursor-pointer flex-1 text-center"
                  >
                    {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseTimeTo12h(checkInTime);
                        setCheckInTime(formatTime12to24(parsed.hour, parsed.minute, "AM"));
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                        parseTimeTo12h(checkInTime).period === "AM"
                          ? "bg-slate-900 text-white shadow-2xs scale-105"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseTimeTo12h(checkInTime);
                        setCheckInTime(formatTime12to24(parsed.hour, parsed.minute, "PM"));
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                        parseTimeTo12h(checkInTime).period === "PM"
                          ? "bg-slate-900 text-white shadow-2xs scale-105"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/70 space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Check-out Date & Time</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  min={checkInDate || today}
                  onChange={e => setCheckOutDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all text-xs shadow-2xs"
                />
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                  <select
                    value={parseTimeTo12h(checkOutTime).hour}
                    onChange={e => {
                      const parsed = parseTimeTo12h(checkOutTime);
                      setCheckOutTime(formatTime12to24(e.target.value, parsed.minute, parsed.period));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-extrabold text-slate-900 text-xs outline-none focus:border-brand-500 cursor-pointer flex-1 text-center"
                  >
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="font-extrabold text-slate-400 text-xs">:</span>
                  <select
                    value={parseTimeTo12h(checkOutTime).minute}
                    onChange={e => {
                      const parsed = parseTimeTo12h(checkOutTime);
                      setCheckOutTime(formatTime12to24(parsed.hour, e.target.value, parsed.period));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-extrabold text-slate-900 text-xs outline-none focus:border-brand-500 cursor-pointer flex-1 text-center"
                  >
                    {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseTimeTo12h(checkOutTime);
                        setCheckOutTime(formatTime12to24(parsed.hour, parsed.minute, "AM"));
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                        parseTimeTo12h(checkOutTime).period === "AM"
                          ? "bg-slate-900 text-white shadow-2xs scale-105"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseTimeTo12h(checkOutTime);
                        setCheckOutTime(formatTime12to24(parsed.hour, parsed.minute, "PM"));
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                        parseTimeTo12h(checkOutTime).period === "PM"
                          ? "bg-slate-900 text-white shadow-2xs scale-105"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {isBoardingFull && (
              <p className="mt-2 text-purple-600 font-bold text-xs bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100">
                ⚠️ Facility is fully booked for these dates.
              </p>
            )}
          </section>

          <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</span>
              Select Pets
            </h2>
            {pets.length > 0 ? (
              <div className="space-y-2">
                {pets.map(pet => (
                  <label
                    key={pet.id}
                    className={`flex items-center gap-3 p-2.5 border rounded-xl cursor-pointer transition-all ${
                      selectedPets.includes(pet.id)
                        ? "border-brand-500 bg-brand-50/50 shadow-2xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-purple-600 cursor-pointer"
                      checked={selectedPets.includes(pet.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedPets((p: string[]) => [...p, pet.id]);
                        else setSelectedPets((p: string[]) => p.filter((x: string) => x !== pet.id));
                      }}
                    />
                    <img
                      src={pet.photo_url || pet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300"}
                      alt={pet.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white shadow"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{pet.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{pet.species} · {pet.breed || "Mixed"}</p>
                    </div>
                    {selectedPets.includes(pet.id) && (
                      <CheckCircle size={20} className="text-purple-600 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-purple-800 text-sm font-medium flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>No registered pets found. Add a pet from your dashboard before booking.</span>
              </div>
            )}
          </section>

          {services.length > 0 && (
            <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mb-0.5">Add-on Services</h3>
              <p className="text-xs text-slate-500 mb-3">Enhance your pet's stay with our premium services.</p>
              
              <div className="grid gap-2">
                {services.map((service: any) => {
                  const isSelected = selectedServices.includes(service.id);
                  const isUnavailable = unavailableServices.includes(service.id);
                  return (
                    <div 
                      key={service.id}
                      onClick={() => {
                        if (isUnavailable) return;
                        setSelectedServices((prev: string[]) => 
                          isSelected ? prev.filter((id: string) => id !== service.id) : [...prev, service.id]
                        );
                      }}
                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-all cursor-pointer text-xs ${
                        isUnavailable ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50" :
                        isSelected ? "border-purple-500 bg-purple-50/70" : "border-slate-200/80 hover:border-purple-300"
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-purple-500 border-purple-500" : "border-slate-300"
                      }`}>
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-900 truncate">{service.name}</p>
                          <span className="font-extrabold text-purple-600 ml-2">{formatRupee(service.price)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{service.description}</p>
                        {isUnavailable && <p className="text-[10px] text-purple-500 mt-0.5 font-bold">Not Available (Capacity reached)</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">4</span>
                <span>Selected Pet Profiles & Care Verification</span>
              </h2>
              <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 self-start sm:self-auto">
                Automatic Profile Link
              </span>
            </div>

            {selectedPets.length === 0 ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-purple-800 text-xs font-medium">
                👉 Please check one or more pets above in Section 2 to verify their care profile details.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  💡 We automatically attach your pet's essential profile (diet, allergies & medical history) to this booking. You do <span className="font-bold text-slate-900">not</span> need to fill out long intake forms during checkout!
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {selectedPets.map((petId: string) => {
                    const pet = pets.find(p => p.id === petId);
                    if (!pet) return null;
                    return (
                      <div key={pet.id} className="border border-slate-200/80 rounded-lg p-3 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                          <div className="flex items-center gap-2.5">
                            <img src={pet.photo_url || pet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300"} alt={pet.name} className="w-8 h-8 rounded-full object-cover border shadow-2xs" />
                            <div>
                              <h4 className="font-black text-slate-900 text-xs sm:text-sm">{pet.name}</h4>
                              <p className="text-[10px] text-slate-500 capitalize">{pet.species} • {pet.breed || 'Mixed'} • {pet.weight || 'Weight N/A'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPetToEditInModal(pet);
                              setIsEditModalOpen(true);
                            }}
                            className="bg-white hover:bg-brand-50 text-brand-600 border border-brand-200 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>✏️ Edit Profile</span>
                          </button>
                        </div>

                        {/* High density Amazon style spec grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-white p-2 rounded border border-slate-200/60">
                            <span className="font-bold text-slate-400 uppercase text-[8px] block mb-0.5">Diet & Food</span>
                            <p className="font-bold text-slate-800 line-clamp-1">{pet.food_preferences || 'Standard diet reported'}</p>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200/60">
                            <span className="font-bold text-slate-400 uppercase text-[8px] block mb-0.5">Allergies</span>
                            <p className="font-bold text-slate-800 line-clamp-1">{pet.allergies || 'No allergies reported'}</p>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200/60">
                            <span className="font-bold text-slate-400 uppercase text-[8px] block mb-0.5">Medical History</span>
                            <p className="font-bold text-slate-800 line-clamp-1">{pet.medical_history || 'Healthy / No ongoing issues'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">5</span>
              Transportation
            </h2>
            <label className="flex items-center gap-3 p-2.5 border rounded-xl cursor-pointer transition-all border-slate-200/80 bg-white hover:border-slate-300">
              <input
                type="checkbox"
                className="w-5 h-5 rounded accent-purple-600 cursor-pointer"
                checked={needsPickup}
                onChange={e => setNeedsPickup(e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">Need Pickup & Drop Service?</p>
                <p className="text-xs text-gray-500">We'll fetch the exact location for our driver.</p>
              </div>
            </label>
            
            {needsPickup && (
              <div className="mt-4 border border-purple-200 rounded-xl p-3 bg-purple-50/30">
                <p className="text-xs font-bold text-purple-800 mb-2">Pinpoint your exact location:</p>
                <LocationPicker
                  onLocationSelect={(loc) => {
                    setPickupLocation({ lat: loc.lat, lng: loc.lng });
                  }}
                  defaultLocation={pickupLocation || center}
                  className="w-full h-[250px] rounded-xl shadow-sm border border-slate-200 z-0"
                />
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80 relative lg:sticky lg:top-4">
            <div className="space-y-1.5 text-[11px] sm:text-xs mb-2.5">
              {checkIn && (
                <div className="flex justify-between text-slate-600">
                  <span>Check-in</span>
                  <span className="font-bold text-[11px]">{new Date(checkIn).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              )}
              {checkOut && (
                <div className="flex justify-between text-slate-600">
                  <span>Check-out</span>
                  <span className="font-bold text-[11px]">{new Date(checkOut).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Stay ({nightCount} nights)</span>
                <span className="font-bold">{formatRupee(basePrice())}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Taxes & Fees</span>
                <span>{formatRupee(taxes)}</span>
              </div>
              {selectedServices.map((sid: string) => {
                const srv = services.find((s: any) => s.id === sid);
                if (!srv) return null;
                return (
                  <div key={sid} className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1 truncate"><Tag size={11} /> {srv.name}</span>
                    <span className="font-bold shrink-0">{formatRupee(srv.price)}</span>
                  </div>
                );
              })}
            </div>

            <hr className="border-slate-100 my-2.5" />

            {/* Payment Type Selection */}
            <div className="mb-3 space-y-1.5">
              <label className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${paymentType === 'full' ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200/80 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="paymentType" checked={paymentType === 'full'} onChange={() => setPaymentType('full')} className="accent-brand-600 w-3.5 h-3.5" />
                  <span className="font-extrabold text-slate-900 text-xs">Pay Full Amount</span>
                </div>
                <span className="font-extrabold text-brand-700 text-xs">{formatRupee(grandTotal())}</span>
              </label>
              
              <label className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${paymentType === 'advance' ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200/80 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="paymentType" checked={paymentType === 'advance'} onChange={() => setPaymentType('advance')} className="accent-brand-600 w-3.5 h-3.5" />
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs block">Pay Advance</span>
                    <span className="text-[10px] text-slate-500">Pay balance later</span>
                  </div>
                </div>
                {paymentType === 'advance' ? (
                  <div className="flex items-center bg-white border border-brand-200 rounded px-1.5 py-1 w-20 shadow-2xs" onClick={e => e.stopPropagation()}>
                    <span className="text-brand-700 font-bold mr-0.5 text-xs">₹</span>
                    <input 
                      type="number" 
                      min="1"
                      max={grandTotal()}
                      value={customAdvance} 
                      onChange={e => setCustomAdvance(e.target.value)} 
                      placeholder={(grandTotal() / 2).toString()}
                      className="w-full bg-transparent outline-none text-brand-700 font-bold text-xs"
                    />
                  </div>
                ) : (
                  <span className="font-extrabold text-brand-700 text-xs">{formatRupee(customAdvance ? Number(customAdvance) : grandTotal() / 2)}</span>
                )}
              </label>

              <label className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${paymentType === 'paylater' ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200/80 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="paymentType" checked={paymentType === 'paylater'} onChange={() => setPaymentType('paylater')} className="accent-brand-600 w-3.5 h-3.5" />
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs block">Pay at Facility</span>
                    <span className="text-[10px] text-slate-500">Book now, pay later</span>
                  </div>
                </div>
                <span className="font-extrabold text-brand-700 text-xs">₹0</span>
              </label>
            </div>

            <hr className="border-slate-100 my-2.5" />

            <div className="flex justify-between items-center mb-3">
              <span className="font-extrabold text-xs text-slate-900">Total to Pay Now</span>
              <span className="text-base sm:text-lg font-black text-slate-900 flex items-center">
                <IndianRupee size={15} strokeWidth={2.5} className="text-slate-700" />
                {(paymentType === "advance" ? (customAdvance ? Number(customAdvance) : grandTotal() / 2) : (paymentType === "paylater" ? 0 : grandTotal())).toLocaleString("en-IN")}
              </span>
            </div>

            {/* CTA Button */}
            <UiverseButton
              onClick={handleBookNow}
              disabled={isProcessing || isBoardingFull || selectedPets.length === 0 || !checkInDate || !checkOutDate || !checkInTime || !checkOutTime}
              className={`w-full h-10 sm:h-11 ${isBoardingFull ? 'opacity-50 cursor-not-allowed' : ''}`}
              color="#10B981"
              icon={isProcessing ? <Loader2 size={18} className="animate-spin text-white" /> : <CreditCard size={16} className="text-white" />}
              text={
                isProcessing ? "Processing..."
                : isBoardingFull ? "Fully Booked"
                : paymentType === "paylater" ? "Book Now (Pay at Facility)"
                : `Pay ${formatRupee(paymentType === "advance" ? (customAdvance ? Number(customAdvance) : grandTotal() / 2) : grandTotal())} Now`
              }
            />

            {/* Validation hints */}
            <div className="mt-2 space-y-0.5 text-[11px]">
              {selectedPets.length === 0 && <p className="text-purple-500 flex items-center gap-1 font-medium"><AlertCircle size={11} /> Select pet profile</p>}
              {!checkInDate && <p className="text-purple-500 flex items-center gap-1 font-medium"><AlertCircle size={11} /> Select check-in date</p>}
              {checkInDate && !checkInTime && <p className="text-purple-500 flex items-center gap-1 font-medium"><AlertCircle size={11} /> Select check-in time</p>}
              {!checkOutDate && <p className="text-purple-500 flex items-center gap-1 font-medium"><AlertCircle size={11} /> Select check-out date</p>}
              {checkOutDate && !checkOutTime && <p className="text-purple-500 flex items-center gap-1 font-medium"><AlertCircle size={11} /> Select check-out time</p>}
            </div>

            <p className="text-center text-[10px] text-slate-400 font-semibold mt-2.5 flex items-center justify-center gap-1">
              <ShieldCheck size={12} /> Secured by Razorpay · SSL Encrypted
            </p>
          </div>
        </div>
      </div>

      <AddPetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        petToEdit={petToEditInModal}
      />
    </PageTransition>
  );
};
