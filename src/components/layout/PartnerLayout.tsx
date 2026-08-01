import { type ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PartnerSidebar } from "../navigation/PartnerSidebar";
import { Menu, Search, ShieldCheck, Sparkles, Star, Phone } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { db } from "../../lib/firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { NotificationBell } from "./NotificationBell";

interface PartnerLayoutProps {
  children: ReactNode;
}

export const PartnerLayout = ({ children }: PartnerLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessCategory, setBusinessCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (user?.id) {
        try {
          const q = query(
            collection(db, "businesses"),
            where("owner_id", "==", user.id),
            limit(1)
          );
          const snapshot = await getDocs(q);
          const bList = snapshot.docs.map(doc => doc.data());
          let data = bList?.[0];
          if (!data) {
            data = {
              name: `${user.full_name || user.email?.split('@')[0] || 'Care Partner'}'s Facility`,
              category: "Pet Care & Boarding Center",
              rating: 4.9,
              image_url: null
            };
          }
          if (data) {
            setAvatarUrl(data.image_url);
            setBusinessName(data.name);
            setBusinessCategory(data.category || "Boarding & Care");
          }
        } catch (err) {
          console.error("Failed to load business header:", err);
        }
      }
    };

    fetchBusiness();

    window.addEventListener("business-updated", fetchBusiness);
    return () => window.removeEventListener("business-updated", fetchBusiness);
  }, [user]);

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-900 flex overflow-hidden font-sans">
      <PartnerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="py-3 bg-white/90 backdrop-blur-md border-b border-purple-200 flex items-center justify-between px-3 sm:px-6 shrink-0 relative z-30 shadow-sm gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-900 hover:bg-purple-100 transition-colors border border-purple-200 shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-sm sm:text-base shadow-md uppercase shrink-0">
                {businessName ? businessName.charAt(0) : "P"}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
                  <h2 className="text-sm sm:text-base font-black text-purple-950 leading-tight truncate">
                    {businessName || "Your Care Facility Desk"}
                  </h2>
                  <span className="hidden sm:inline-block bg-purple-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 shadow-sm">
                    ✔ ASSURED
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-purple-700 font-bold mt-0.5 capitalize flex items-center gap-1 truncate">
                  <span className="truncate">{businessCategory || "Pet Boarding"}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:flex text-purple-950 items-center gap-0.5 font-black shrink-0">
                    <Star size={12} className="fill-purple-600 text-purple-600" /> 4.9
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Universal Booking & Guest Quick Search */}
          <div className="hidden lg:flex flex-1 max-w-md mx-6 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active guests, pet names, phone numbers..."
              className="w-full h-10 pl-10 pr-4 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-medium text-purple-950 placeholder:text-purple-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all shadow-inner"
            />
          </div>

          {/* Right: Live Status + Notification + Avatar */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200 text-[11px] font-bold text-green-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span>Live Stays</span>
            </div>

            <div className="shrink-0">
              <NotificationBell />
            </div>

            <button
              onClick={() => navigate("/partner/profile")}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-purple-200 bg-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Business" className="w-full h-full object-cover" />
              ) : (
                businessName ? businessName.charAt(0) : "P"
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-transparent p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
