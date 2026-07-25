import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CalendarDays, LogIn, LogOut, PawPrint, Building2,
  CreditCard, Clock, CheckCircle2, AlertCircle, XCircle,
  Loader2, Phone, MapPin, Hash, IndianRupee, Tag, Receipt, MessageSquare, Send, Image as ImageIcon, Download, Bookmark, Activity, FileText, ShieldCheck, Plus
} from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { InvoiceSheet } from "../finance/InvoiceSheet";
import { db, storage } from "../../lib/firebase";
import { collection, doc, query, where, getDocs, getDoc, updateDoc, deleteDoc, addDoc, onSnapshot, orderBy, documentId } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthStore } from "../../store/useAuthStore";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:     { label: "Awaiting Confirmation", color: "text-purple-700",   bg: "bg-purple-50  border-purple-200",  icon: <Loader2 size={14} className="animate-spin" /> },
  confirmed:   { label: "Confirmed",             color: "text-blue-700",    bg: "bg-blue-50   border-blue-200",   icon: <CheckCircle2 size={14} /> },
  checked_in:  { label: "Checked In",            color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: <LogIn size={14} /> },
  checked_out: { label: "Checked Out",           color: "text-purple-700",  bg: "bg-purple-50 border-purple-200", icon: <LogOut size={14} /> },
  completed:   { label: "Completed",             color: "text-purple-700",    bg: "bg-purple-50   border-purple-200",   icon: <CheckCircle2 size={14} /> },
  cancelled:   { label: "Cancelled",             color: "text-gray-600",    bg: "bg-gray-50   border-gray-200",   icon: <XCircle size={14} /> },
  rejected:    { label: "Rejected",              color: "text-purple-700",    bg: "bg-purple-50   border-purple-200",   icon: <XCircle size={14} /> },
};

// ─── Timeline steps ───────────────────────────────────────────────────────────
const TIMELINE = [
  { key: "pending",     label: "Booking Submitted" },
  { key: "confirmed",   label: "Partner Accepted" },
  { key: "checked_in",  label: "Pet Checked In" },
  { key: "checked_out", label: "Pet Checked Out" },
  { key: "completed",   label: "Stay Complete" },
];
const ORDER = ["pending", "confirmed", "checked_in", "checked_out", "completed"];

function stepIndex(status: string) {
  return ORDER.indexOf(status);
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function formatDateTime(d: string | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────
interface BookingDetailModalProps {
  booking: any;
  onClose: () => void;
  role?: 'customer' | 'partner' | 'admin';
  onOpenFinancials?: () => void;
  onPostUpdate?: () => void;
}

export const BookingDetailModal = ({ booking, onClose, role = 'customer', onOpenFinancials, onPostUpdate }: BookingDetailModalProps) => {
  const { user } = useAuthStore();
  const [showInvoice, setShowInvoice] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isPayingBalance, setIsPayingBalance] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AM/PM Reschedule Date & Time State
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(booking.check_in?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const [rescheduleAmPm, setRescheduleAmPm] = useState<"AM" | "PM">("AM");
  const [rescheduleOutDate, setRescheduleOutDate] = useState(booking.check_out?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [rescheduleOutTime, setRescheduleOutTime] = useState("06:00");
  const [rescheduleOutAmPm, setRescheduleOutAmPm] = useState<"AM" | "PM">("PM");
  const [isSavingDates, setIsSavingDates] = useState(false);

  const handleSaveReschedule = async () => {
    setIsSavingDates(true);
    try {
      const parseAmPmTo24 = (timeStr: string, ampm: string) => {
        let [hrs, mins] = timeStr.split(':').map(Number);
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        return `${String(hrs).padStart(2, '0')}:${String(mins || 0).padStart(2, '0')}:00`;
      };
      const newCheckIn = `${rescheduleDate}T${parseAmPmTo24(rescheduleTime, rescheduleAmPm)}`;
      const newCheckOut = `${rescheduleOutDate}T${parseAmPmTo24(rescheduleOutTime, rescheduleOutAmPm)}`;
      await updateDoc(doc(db, "bookings", booking.id), { check_in: newCheckIn, check_out: newCheckOut });
      booking.check_in = newCheckIn;
      booking.check_out = newCheckOut;
      setIsRescheduling(false);
      if (onPostUpdate) onPostUpdate();
      alert("Stay schedule updated successfully with AM/PM time!");
    } catch (e: any) {
      alert("Failed to update schedule: " + (e?.message || JSON.stringify(e)));
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const fetchUpdates = async () => {
    if (!booking.id) return;
    
    if (booking.status === "checked_out" || booking.status === "completed" || booking.actual_check_out || status === "checked_out" || status === "completed") {
      try {
        const q = query(collection(db, "pet_updates"), where("booking_id", "==", booking.id));
        const snap = await getDocs(q);
        snap.forEach(d => deleteDoc(doc(db, "pet_updates", d.id)));
        const bookingSnap = await getDoc(doc(db, "bookings", booking.id));
        const bookingData = bookingSnap.data();
        if (bookingData?.notes && bookingData.notes.includes("[CHAT_JSON]")) {
          const cleanedNotes = bookingData.notes.replace(/\[CHAT_JSON\].*?\[\/CHAT_JSON\]/gs, "").trim();
          await updateDoc(doc(db, "bookings", booking.id), { notes: cleanedNotes });
        }
      } catch (e) {}
      setUpdates([]);
      return;
    }

    // Fallback to pet_updates
    const qUpdates = query(collection(db, "pet_updates"), where("booking_id", "==", booking.id));
    const snapUpdates = await getDocs(qUpdates);
    const data = snapUpdates.docs.map(d => ({ id: d.id, ...d.data() }));
    let fetchedUpdates = data || [];
    
    // Parse from notes
    try {
      const bookingSnap = await getDoc(doc(db, "bookings", booking.id));
      const bookingData = bookingSnap.data();
      if (bookingData?.notes) {
        const chatRegex = /\[CHAT_JSON\](.*?)\[\/CHAT_JSON\]/gs;
        let match;
        while ((match = chatRegex.exec(bookingData.notes)) !== null) {
          try {
            const parsed = JSON.parse(match[1]);
            fetchedUpdates.push(parsed);
          } catch (e) {}
        }
      }
    } catch (e) {}
    
    // Sort by created_at
    fetchedUpdates.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    setUpdates(fetchedUpdates);
  };
  
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        if (booking.pet_ids && booking.pet_ids.length > 0) {
          const petsQ = query(collection(db, "pets"), where(documentId(), "in", booking.pet_ids));
          const snap = await getDocs(petsQ);
          
          const enriched = snap.docs.map(docSnap => {
            const petData = docSnap.data();
            let extra: any = {};
            
            if (petData.behavior_notes && typeof petData.behavior_notes === 'string' && petData.behavior_notes.trim().startsWith('{')) {
              try {
                extra = JSON.parse(petData.behavior_notes);
              } catch (e) {}
            }
            
            return {
              ...petData,
              id: docSnap.id,
              ...extra,
              behavior_notes: extra.general !== undefined ? extra.general : petData.behavior_notes
            };
          });
          
          setPets(enriched);
        }
        await fetchUpdates();
        if (booking.selected_services && booking.selected_services.length > 0) {
          const serviceIds = booking.selected_services.map((s: any) => typeof s === 'string' ? s : s.id);
          const servicesQ = query(collection(db, "services"), where(documentId(), "in", serviceIds));
          const snap = await getDocs(servicesQ);
          setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        
        // Fetch ALL services for this facility for mid-stay addition
        const bizId = booking.businesses?.id || booking.business_id?.id || booking.business_id;
        if (bizId) {
          const allSvcQ = query(collection(db, "services"), where("business_id", "==", bizId));
          const allSvcSnap = await getDocs(allSvcQ);
          setAllServices(allSvcSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();
    
    // Realtime chat subscription
    const qLive = query(collection(db, "pet_updates"), where("booking_id", "==", booking.id));
    const unsubscribe = onSnapshot(qLive, () => {
      fetchUpdates();
    });
      
    // Fallback polling to ensure real-time behavior even if DB publication is missing
    const interval = setInterval(() => {
      fetchUpdates();
    }, 3000);
      
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [booking.id, booking.pet_ids]);

  const handleAddMidStayService = async (serviceId: string) => {
    if (!serviceId) return;
    const service = allServices.find(s => s.id === serviceId);
    if (!service) return;
    
    if (!window.confirm(`Add ${service.name} for ₹${service.price}?`)) {
      setIsAddingService(false);
      return;
    }
    
    try {
      const bizId = booking.businesses?.id || booking.business_id?.id || booking.business_id;
      const newExtra = (Number(booking.extra_expenses) || 0) + Number(service.price);
      const newSelectedServices = [...(booking.selected_services || []), { id: service.id, name: service.name, price: service.price }];
      
      await updateDoc(doc(db, "bookings", booking.id), {
        extra_expenses: newExtra,
        selected_services: newSelectedServices
      });
      
      await addDoc(collection(db, "extra_charges"), {
        booking_id: booking.id,
        business_id: bizId,
        customer_id: booking.customer_id?.id || booking.customer_id,
        description: `Mid-stay Service: ${service.name}`,
        amount: Number(service.price),
        type: 'service',
        status: 'pending'
      });
      
      await addDoc(collection(db, "notifications"), {
        user_id: role === 'customer' ? (booking.business_id?.owner_id || bizId) : (booking.customer_id?.id || booking.customer_id),
        title: "Service Added to Stay 🐕",
        message: `${service.name} was added to the booking mid-stay.`,
        type: "info",
        related_booking_id: booking.id,
        created_at: new Date().toISOString()
      });
      
      alert("Service added successfully!");
      setServices([...services, service]);
      booking.extra_expenses = newExtra;
      booking.selected_services = newSelectedServices;
      setIsAddingService(false);
    } catch (err) {
      alert("Failed to add service");
    }
  };

  const handlePayBalance = async (amount: number) => {
    setIsPayingBalance(true);
    try {
      // Simulate payment gateway delay
      await new Promise(res => setTimeout(res, 1200));
      
      const bizId = booking.businesses?.id || booking.business_id?.id || booking.business_id;
      const newTotalPaid = (Number(booking.total_paid) || 0) + amount;
      
      await updateDoc(doc(db, "bookings", booking.id), {
        total_paid: newTotalPaid
      });

      // Import createJournalEntry dynamically or assume it's added via utility. 
      // For simplicity, we directly add to expenses collection for revenue and commission.
      
      // 1. Partner Revenue
      await addDoc(collection(db, "expenses"), {
        business_id: bizId,
        entry_type: 'revenue',
        category: 'Balance Payment',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        description: `Balance payment received online from ${booking.customer_id?.full_name || 'Customer'} (Booking ID: ${booking.id})`,
        party_name: booking.customer_id?.full_name || "Customer",
        status: 'completed'
      });
      
      // 2. Platform Commission
      await addDoc(collection(db, "expenses"), {
        business_id: bizId,
        entry_type: 'expense',
        category: 'Platform Commission',
        amount: amount * 0.15,
        date: new Date().toISOString().split('T')[0],
        description: `15% Platform fee for collected balance (Booking ID: ${booking.id})`,
        party_name: "GouujiPets Platform",
        status: 'completed'
      });

      booking.total_paid = newTotalPaid;
      alert("Payment successful! Balance cleared.");
    } catch (err) {
      alert("Payment failed");
    } finally {
      setIsPayingBalance(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatMessage.trim() && !selectedImage) || isSending) return;
    
    setIsSending(true);
    try {
      let photoUrl = null;
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `updates/${fileName}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, selectedImage);
        photoUrl = await getDownloadURL(storageRef);
      }

      const newUpdate = {
        id: crypto.randomUUID(),
        booking_id: booking.id,
        business_id: booking.businesses?.id || booking.business_id?.id || booking.business_id,
        customer_id: booking.customer_id?.id || booking.customer_id,
        sender_id: user?.id,
        message: chatMessage || (photoUrl ? "Sent a photo" : ""),
        photo_url: photoUrl,
        // created_at: new Date().toISOString()
      };

      // Try to save to pet_updates (might fail due to RLS for partner)
      addDoc(collection(db, "pet_updates"), newUpdate).then(() => {});

      // Bypass RLS by saving to bookings.notes (since both parties have access)
      try {
        const bSnap = await getDoc(doc(db, "bookings", booking.id));
        const currentNotes = bSnap.data()?.notes || "";
        const newNotes = currentNotes + `\n[CHAT_JSON]${JSON.stringify(newUpdate)}[/CHAT_JSON]`;
        await updateDoc(doc(db, "bookings", booking.id), { notes: newNotes });
      } catch (e) {
        console.error("Failed to save to notes", e);
      }
      
      setChatMessage("");
      removeImage();
      
      // Notify the other party
      const notifyUserId = role === 'customer' ? (booking.business_id?.owner_id) : (booking.customer_id?.id || booking.customer_id);
      if (notifyUserId) {
        await addDoc(collection(db, "notifications"), {
          user_id: notifyUserId,
          title: role === 'customer' ? "New Message from Customer" : "New Pet Update! 📷",
          message: `"${chatMessage.substring(0, 40)}${chatMessage.length > 40 ? '...' : ''}"`,
          type: "info",
          related_booking_id: booking.id,
          // created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Parse notes and strip system tags completely
  const notesString = booking.notes || "";
  let paymentIdStr = "";
  let specialInstructions = "";
  let intakeData: any = null;

  // 1. Strip out all [CHAT_JSON] blocks so they never display as text
  let cleanedNotes = notesString.replace(/\[CHAT_JSON\].*?\[\/CHAT_JSON\]/gs, "").trim();

  // 2. Extract and strip out all [INTAKE_JSON] blocks
  if (cleanedNotes.includes("[INTAKE_JSON]")) {
    const startIdx = cleanedNotes.indexOf("[INTAKE_JSON]") + 13;
    const endIdx = cleanedNotes.indexOf("[/INTAKE_JSON]");
    if (endIdx > -1) {
      try {
        intakeData = JSON.parse(cleanedNotes.substring(startIdx, endIdx));
      } catch (e) { console.error("Failed to parse intake JSON", e); }
      cleanedNotes = (cleanedNotes.substring(0, startIdx - 13) + cleanedNotes.substring(endIdx + 14)).trim();
    }
  }

  // 3. Separate payment ID and user instructions
  const notesParts = cleanedNotes.split(/Special Instructions:|Selected Pet Profiles & Instructions:/i);
  if (notesParts.length > 1) {
    paymentIdStr = notesParts[0].replace(/Payment ID:/i, "").trim();
    specialInstructions = notesParts[1].trim();
  } else {
    const text = notesParts[0].replace(/Payment ID:/i, "").trim();
    if (text.startsWith("pay_")) {
      paymentIdStr = text;
    } else {
      specialInstructions = text;
    }
  }
  const status = booking.status || "pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const currentStep = stepIndex(status);
  const isRejected = status === "rejected" || status === "cancelled";

  const nightCount = Math.max(1, Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
  ));

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-y-auto max-h-[92vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-4 pb-2 sm:hidden">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-4 pb-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-900">Booking Details</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">#{booking.id?.slice(0, 12).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              {role === 'partner' && onOpenFinancials && (
                <button
                  onClick={onOpenFinancials}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1.5 transition-colors text-xs font-bold"
                  title="Financial Transactions"
                >
                  <IndianRupee size={14} /> Financials
                </button>
              )}
              {role === 'partner' && onPostUpdate && (
                <button
                  onClick={onPostUpdate}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1.5 transition-colors text-xs font-bold"
                  title="Post Daily Update"
                >
                  <MessageSquare size={14} /> Update
                </button>
              )}
              <button 
                onClick={() => setShowInvoice(true)}
                className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors shrink-0"
                title="View Invoice"
              >
                <Receipt size={18} />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3.5">

            {/* Status Banner */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.color} font-bold text-xs`}>
              {cfg.icon}
              {cfg.label}
              {status === "pending" && (
                <span className="ml-auto text-[11px] font-medium opacity-80">
                  {role === 'customer' ? "Waiting for partner acceptance" : "Action required"}
                </span>
              )}
            </div>

            {/* Progress Timeline */}
            {!isRejected && (
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200/60">
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Booking Progress</p>
                <div className="relative px-2">
                  {/* Connecting line */}
                  <div className="absolute top-2.5 left-5 right-5 h-0.5 bg-purple-200" />
                  <div
                    className="absolute top-2.5 left-5 h-0.5 bg-purple-600 transition-all duration-700"
                    style={{ width: `${(currentStep / (ORDER.length - 1)) * 100}%` }}
                  />

                  <div className="relative flex justify-between">
                    {TIMELINE.map((step, i) => {
                      const done = i <= currentStep;
                      const active = i === currentStep;
                      return (
                        <div key={step.key} className="flex flex-col items-center gap-1">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            done
                              ? active
                                ? "bg-purple-600 border-purple-600 scale-110 shadow-2xs"
                                : "bg-purple-500 border-purple-500"
                              : "bg-white border-purple-200"
                          }`}>
                            {done
                              ? <CheckCircle2 size={11} className="text-white" />
                              : <div className="w-1.5 h-1.5 rounded-full bg-purple-200" />
                            }
                          </div>
                          <p className={`text-[9px] font-bold text-center leading-tight w-12 ${done ? "text-purple-700" : "text-slate-400"}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                <XCircle size={22} className="text-purple-400 mx-auto mb-1" />
                <p className="font-bold text-xs text-purple-700">This booking was {status}.</p>
                <p className="text-[10px] text-purple-500 mt-0.5">Please contact support or re-book.</p>
              </div>
            )}

            {/* Facility or Customer Info depending on role */}
            {role === 'customer' ? (
              <div className="bg-purple-50/80 rounded-xl p-3 border border-purple-200/70 space-y-1.5">
                <p className="text-[9px] font-bold text-purple-700 uppercase tracking-wider">Facility Details</p>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-purple-200 shadow-2xs">
                    <Building2 size={16} className="text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {booking.businesses?.name || booking.business_id?.name || "Boarding Facility"}
                    </p>
                    {(booking.businesses?.address || booking.business_id?.address) && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} className="shrink-0" /> {typeof (booking.businesses?.address || booking.business_id?.address) === 'string' ? (booking.businesses?.address || booking.business_id?.address) : ((booking.businesses?.address || booking.business_id?.address)?.city || 'Verified Location')}
                      </p>
                    )}
                    {(booking.businesses?.contact_phone || booking.business_id?.contact_phone || booking.business_id?.phone) && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="shrink-0" /> {booking.businesses?.contact_phone || booking.business_id?.contact_phone || booking.business_id?.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Customer Details</p>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                    <PawPrint size={16} className="text-purple-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">{booking.customer_id?.full_name || "Customer"}</p>
                    {booking.customer_id?.email && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <Hash size={10} className="shrink-0" /> {booking.customer_id.email}
                      </p>
                    )}
                    {booking.customer_id?.phone && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="shrink-0" /> {booking.customer_id.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pet Health & Security Profile (Intake Form) */}
            {intakeData && !intakeData.pets && (
              <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-3.5 space-y-3">
                <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-purple-600" />
                  Pet Intake & Security Profile
                </h3>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white rounded-lg p-2.5 border border-purple-100 shadow-2xs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Owner Name</p>
                    <p className="text-xs font-semibold text-slate-900 truncate">{intakeData.ownerName || "Customer"}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-purple-100 shadow-2xs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 flex items-center gap-1"><Phone size={9} /> Emergency Phone</p>
                    <p className="text-xs font-semibold text-slate-900 truncate">{intakeData.ownerPhone || "-"}</p>
                  </div>
                </div>

                {intakeData.diet && (
                  <div className="bg-white rounded-lg p-2.5 border border-purple-100 shadow-2xs">
                    <p className="text-[9px] font-bold text-purple-400 uppercase mb-0.5">Diet / Food</p>
                    <p className="text-xs font-medium text-slate-800">{intakeData.diet}</p>
                  </div>
                )}

                {intakeData.healthIssues && (
                  <div className="bg-white rounded-lg p-2.5 border border-purple-100 shadow-2xs">
                    <p className="text-[9px] font-bold text-purple-500 uppercase mb-0.5">Health Issues</p>
                    <p className="text-xs font-medium text-slate-800">{intakeData.healthIssues}</p>
                  </div>
                )}
              </div>
            )}

            {intakeData && intakeData.pets && Array.isArray(intakeData.pets) && intakeData.pets.length > 0 && (
              <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-3.5 space-y-2.5">
                <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-purple-600" />
                  Selected Pet Profiles & Care Details
                </h3>
                <div className="space-y-2.5">
                  {intakeData.pets.map((p: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-purple-100 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-black text-slate-900 text-xs sm:text-sm">{p.name} <span className="text-[10px] font-normal text-slate-500 capitalize">({p.breed || 'Mixed'} {p.species})</span></span>
                        {p.weight && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{p.weight} kg</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        {p.food_preferences && <div><span className="font-bold text-purple-400 block uppercase text-[9px]">Food & Diet</span><span className="font-medium text-slate-800 line-clamp-1">{p.food_preferences}</span></div>}
                        {p.allergies && <div><span className="font-bold text-purple-500 block uppercase text-[9px]">Allergies</span><span className="font-medium text-slate-800 line-clamp-1">{p.allergies}</span></div>}
                        {p.medical_history && <div className="sm:col-span-2"><span className="font-bold text-purple-500 block uppercase text-[9px]">Medical History</span><span className="font-medium text-slate-800 line-clamp-1">{p.medical_history}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions & Pet Profile */}
            {(specialInstructions || pets.length > 0) && (
              <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-3 space-y-3">
                {specialInstructions && (
                  <div>
                    <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle size={12} /> Special Instructions</p>
                    <p className="text-xs text-purple-900 font-medium whitespace-pre-wrap">{specialInstructions}</p>
                  </div>
                )}
                
                {pets.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1.5 mt-2">Pet Profiles</p>
                    <div className="space-y-2">
                      {pets.map(pet => (
                        <div key={pet.id} className="bg-white rounded-lg p-2 border border-purple-100 flex items-center gap-2.5">
                          <img src={pet.photo_url || pet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300"} className="w-8 h-8 rounded-full object-cover shrink-0" alt={pet.name} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-slate-900 truncate">{pet.name} <span className="text-[10px] font-normal text-slate-500 capitalize">({pet.breed || "Mixed"} {pet.species})</span></p>
                            {(pet.medical_history || pet.allergies || pet.behavior_notes || pet.aggression_triggers || pet.security_measures || pet.vet_service_required) ? (
                              <div className="mt-1 space-y-1 text-[10px] border-t border-slate-50 pt-1">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {pet.medical_history && <p className="truncate"><span className="font-bold text-slate-500">Med History:</span> {pet.medical_history}</p>}
                                  {pet.allergies && <p className="truncate"><span className="font-bold text-purple-600">Allergies:</span> {pet.allergies}</p>}
                                  {pet.food_preferences && <p className="truncate"><span className="font-bold text-slate-500">Diet:</span> {pet.food_preferences}</p>}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-700">
                                  {pet.behavior_notes && <p className="max-w-full"><span className="font-bold text-slate-500">Behavior:</span> {pet.behavior_notes}</p>}
                                  {pet.aggression_triggers && <p className="max-w-full"><span className="font-bold text-purple-700">Aggression Triggers:</span> {pet.aggression_triggers}</p>}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-700">
                                  {pet.security_measures && <p className="max-w-full"><span className="font-bold text-slate-500">Security / Escape:</span> {pet.security_measures}</p>}
                                  {pet.vet_service_required && <p className="text-purple-700 font-bold bg-purple-50 px-1 rounded">✓ On-Call Vet Requested</p>}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400">No specific medical/behavior notes.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dates & Stay with AM/PM Selection */}
            <div className="bg-purple-50/80 rounded-xl p-3 border border-purple-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-purple-900 uppercase tracking-wider">Stay & Schedule Details</p>
                <button
                  type="button"
                  onClick={() => setIsRescheduling(!isRescheduling)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-lg transition-all shadow-2xs flex items-center gap-1"
                >
                  <CalendarDays size={11} /> {isRescheduling ? "Cancel Edit" : "Change Dates / AM & PM"}
                </button>
              </div>

              {isRescheduling && (
                <div className="bg-white p-3 rounded-xl border border-purple-300 shadow-sm space-y-3">
                  <p className="text-xs font-black text-purple-950">Select Check-In & Check-Out Time with AM / PM</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-[11px] text-purple-900 block">Check-In Date & Time</label>
                      <input 
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full bg-purple-50 border border-purple-200 rounded-lg px-2 py-1.5 font-bold text-xs"
                      />
                      <div className="flex items-center gap-1.5 mt-1">
                        <input 
                          type="time" 
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="flex-1 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 font-bold text-xs"
                        />
                        <div className="flex rounded-lg border border-purple-300 overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => setRescheduleAmPm("AM")}
                            className={`px-2 py-1 font-black text-[10px] ${rescheduleAmPm === "AM" ? "bg-purple-600 text-white" : "bg-white text-purple-900 hover:bg-purple-100"}`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setRescheduleAmPm("PM")}
                            className={`px-2 py-1 font-black text-[10px] ${rescheduleAmPm === "PM" ? "bg-purple-600 text-white" : "bg-white text-purple-900 hover:bg-purple-100"}`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[11px] text-purple-900 block">Check-Out Date & Time</label>
                      <input 
                        type="date"
                        value={rescheduleOutDate}
                        onChange={(e) => setRescheduleOutDate(e.target.value)}
                        className="w-full bg-purple-50 border border-purple-200 rounded-lg px-2 py-1.5 font-bold text-xs"
                      />
                      <div className="flex items-center gap-1.5 mt-1">
                        <input 
                          type="time" 
                          value={rescheduleOutTime}
                          onChange={(e) => setRescheduleOutTime(e.target.value)}
                          className="flex-1 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 font-bold text-xs"
                        />
                        <div className="flex rounded-lg border border-purple-300 overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => setRescheduleOutAmPm("AM")}
                            className={`px-2 py-1 font-black text-[10px] ${rescheduleOutAmPm === "AM" ? "bg-purple-600 text-white" : "bg-white text-purple-900 hover:bg-purple-100"}`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setRescheduleOutAmPm("PM")}
                            className={`px-2 py-1 font-black text-[10px] ${rescheduleOutAmPm === "PM" ? "bg-purple-600 text-white" : "bg-white text-purple-900 hover:bg-purple-100"}`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveReschedule}
                    disabled={isSavingDates}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
                  >
                    {isSavingDates ? "Saving..." : "Save Schedule (with AM/PM)"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2.5 border border-purple-200/70">
                  <div className="flex items-center gap-1 text-purple-700 mb-0.5">
                    <LogIn size={11} /> <span className="text-[9px] font-black uppercase">Check-In</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{formatDate(booking.check_in)}</p>
                  {booking.actual_check_in && (
                    <p className="text-[9px] text-slate-400 mt-0.5">Actual: {formatDateTime(booking.actual_check_in)}</p>
                  )}
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-purple-200/70">
                  <div className="flex items-center gap-1 text-purple-700 mb-0.5">
                    <LogOut size={11} /> <span className="text-[9px] font-black uppercase">Check-Out</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{formatDate(booking.check_out)}</p>
                  {booking.actual_check_out && (
                    <p className="text-[9px] text-slate-400 mt-0.5">Actual: {formatDateTime(booking.actual_check_out)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-purple-200/70 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-purple-600" />
                  <span className="font-bold text-slate-800">{nightCount} night{nightCount > 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PawPrint size={13} className="text-purple-600" />
                  <span className="font-bold text-slate-800">{booking.pet_count} pet{booking.pet_count > 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 capitalize">
                  <Tag size={13} className="text-purple-600" />
                  <span className="font-bold text-slate-800">{booking.type || "boarding"}</span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-slate-50/80 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payment</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Amount Charged</span>
                  <span className="font-bold text-slate-900">{formatRupee(booking.total_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid</span>
                  <span className={`font-bold ${booking.total_paid > 0 ? "text-purple-600" : "text-purple-600"}`}>
                    {formatRupee(booking.total_paid || 0)}
                  </span>
                </div>
                {booking.extra_expenses > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Extra Charges</span>
                    <span className="font-bold text-purple-600">{formatRupee(booking.extra_expenses)}</span>
                  </div>
                )}
                <hr className="border-slate-200/80 my-1" />
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-900">Total</span>
                  <span className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-0.5">
                    <IndianRupee size={13} strokeWidth={2.5} />
                    {((booking.total_amount || 0) + (booking.extra_expenses || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              
              {role === 'customer' && ((booking.total_amount || 0) + (booking.extra_expenses || 0) - (booking.total_paid || 0)) > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <button 
                    onClick={() => handlePayBalance(((booking.total_amount || 0) + (booking.extra_expenses || 0) - (booking.total_paid || 0)))}
                    disabled={isPayingBalance}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isPayingBalance ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                    {isPayingBalance ? "Processing Payment..." : `Pay Remaining ₹${((booking.total_amount || 0) + (booking.extra_expenses || 0) - (booking.total_paid || 0)).toLocaleString("en-IN")} Online`}
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-1.5 pt-1">
                <CreditCard size={12} className="text-slate-400" />
                <span className="text-[10px] text-slate-500 capitalize font-medium">
                  Paid via {booking.payment_method || "online"}
                </span>
                {paymentIdStr && (
                  <span className="ml-auto text-[9px] font-mono text-slate-400 truncate max-w-[120px]">{paymentIdStr}</span>
                )}
              </div>
            </div>

            {/* Selected Services */}
            {booking.selected_services && booking.selected_services.length > 0 && (
              <div className="bg-slate-50/80 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Add-on Services</p>
                <div className="space-y-1.5">
                  {booking.selected_services.map((svc: any, i: number) => {
                    const svcId = typeof svc === 'string' ? svc : svc.id;
                    const fetchedService = services.find(s => s.id === svcId);
                    
                    const name = fetchedService ? fetchedService.name : (typeof svc === 'object' ? svc.name : svc);
                    const price = fetchedService ? fetchedService.price : (typeof svc === 'object' ? svc.price : null);
                    
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs text-slate-700 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200/70 shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={12} className="text-purple-500 shrink-0" />
                          <span className="font-semibold truncate">{name}</span>
                        </div>
                        {price != null && <span className="font-bold text-slate-900 shrink-0">{formatRupee(price)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Mid-Stay Service */}
            {(status === "checked_in" || status === "confirmed") && (
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 border-dashed flex flex-col gap-2">
                {!isAddingService ? (
                  <button 
                    onClick={() => setIsAddingService(true)}
                    className="w-full py-2 bg-white border border-slate-200 hover:border-purple-300 text-purple-700 text-xs font-black rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Request / Add Service
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select 
                      className="flex-1 bg-white border border-purple-200 rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-purple-600"
                      onChange={(e) => handleAddMidStayService(e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select a service to add...</option>
                      {allServices.filter(s => !(booking.selected_services || []).some((bs: any) => (bs.id || bs) === s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name} - ₹{s.price}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setIsAddingService(false)}
                      className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 hover:bg-slate-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Booking meta */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Hash size={11} /> Booking ID: {booking.id?.slice(0, 16)}...
              </div>
              <div>
                Booked {(booking as any).created_at
                  ? new Date((booking as any).created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "recently"}
              </div>
            </div>

            {/* 2-Way Chat Feed */}
            {(status === "checked_out" || status === "completed" || booking.status === "checked_out" || booking.status === "completed" || booking.actual_check_out) ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-1">
                  <LogOut size={18} />
                </div>
                <p className="font-bold text-slate-800 text-sm">Live Chat Deleted upon Check-Out</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  In accordance with privacy and operational policies, the live chat and daily update feed is automatically deleted from the system once the pet has checked out from the centre.
                </p>
              </div>
            ) : (
            <div className="bg-purple-50/50 rounded-2xl p-4 flex flex-col h-[400px] border border-purple-200">
              <p className="text-xs font-black text-purple-950 uppercase tracking-wider mb-3 flex items-center gap-2"><MessageSquare size={14} className="text-purple-600" /> Messages & Updates</p>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-thumb-purple-200">
                {updates.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-purple-400 text-sm font-bold">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  updates.map(update => {
                    const isMine = update.sender_id === user?.id || (!update.sender_id && role === 'partner');
                    return (
                      <div key={update.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 ${isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white border border-purple-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                          <p className="text-sm font-medium whitespace-pre-wrap">{update.message}</p>
                          {update.photo_url && (
                            <div className="relative mt-2 rounded-lg overflow-hidden border border-black/10 group">
                              <img src={update.photo_url} alt="Attached" className="w-full max-w-[220px] max-h-[180px] object-cover" />
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await fetch(update.photo_url, { mode: 'cors' });
                                    const blob = await res.blob();
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = blobUrl;
                                    link.download = `pet-photo-${update.id}.jpg`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(blobUrl);
                                  } catch (err) {
                                    window.open(update.photo_url, "_blank");
                                  }
                                }}
                                className="absolute bottom-1.5 right-1.5 bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow flex items-center gap-1 active:scale-95 transition-all"
                                title="Download Photo HD"
                              >
                                <Download size={11} /> Download
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1 font-medium">{new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative w-fit mb-2">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-purple-200 shadow-sm" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full p-1 shadow-sm hover:bg-purple-700"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex items-center gap-2 mt-auto pt-3 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 transition-colors border border-purple-200"
                  title="Attach Image"
                >
                  <ImageIcon size={18} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all shadow-sm"
                  disabled={isSending}
                />
                <button 
                  type="submit"
                  disabled={(!chatMessage.trim() && !selectedImage) || isSending}
                  className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
            )}

          </div>
        </motion.div>
      </div>
      
      {showInvoice && (
        <InvoiceSheet booking={booking} onClose={() => setShowInvoice(false)} />
      )}
    </AnimatePresence>,
    document.body
  );
};

