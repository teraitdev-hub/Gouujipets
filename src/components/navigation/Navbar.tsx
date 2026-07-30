import { useState } from "react";
import { Menu, Search, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { NotificationBell } from "../layout/NotificationBell";

export const Navbar = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Bangalore / Near Me");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/boarding?query=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/boarding");
    }
  };

  return (
    <header className="bg-purple-50 text-purple-950 border-b border-purple-200 sticky top-0 z-40 shadow-sm font-sans">
      {/* Top micro bar for VERIFIED / Amazon credibility in Soft Light Purple */}
      <div className="bg-purple-100/80 px-3 md:px-6 py-1 flex items-center justify-between text-[11px] border-b border-purple-200 font-bold">
        <div className="flex items-center gap-2 text-purple-900">
          <ShieldCheck size={13} className="stroke-[3] text-purple-700" />
          <span>Gouuji Assured™ Verified Network</span>
          <span className="hidden sm:inline text-purple-700 font-medium">| 50,000+ Pet Parents & Physical Inspections</span>
        </div>
        <div className="flex items-center gap-3 text-purple-900">
          <a href="tel:18007383674" className="hover:text-purple-700 flex items-center gap-1 transition-colors">
            <Phone size={11} className="text-purple-700 animate-pulse" />
            <span>24/7 Emergency Line: 1800-PET-EMRG</span>
          </a>
        </div>
      </div>

      {/* Main Light Purple Header Row */}
      <div className="px-3 md:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/90">
        {/* Left: Menu + Logo + Location Selector */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center hover:bg-purple-200 transition-colors border border-purple-200"
              title="Toggle Menu"
            >
              <Menu size={18} />
            </button>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-black text-white text-base shadow-sm group-hover:scale-105 transition-transform">
                G
              </div>
              <div className="leading-none">
                <span className="text-sm md:text-base font-black text-purple-950 tracking-tight block">
                  Gouuji<span className="text-purple-600">Directory</span>
                </span>
                <span className="text-[8px] font-bold text-purple-700 uppercase tracking-widest block -mt-0.5">
                  VERIFIED for Pets
                </span>
              </div>
            </button>
          </div>

          {/* Location Selector */}
          <div className="flex items-center gap-1.5 bg-purple-100 border border-purple-300 px-2.5 py-1.5 rounded-xl text-xs font-bold text-purple-900 hover:bg-purple-200 transition-colors cursor-pointer shrink-0">
            <MapPin size={13} className="text-purple-700 shrink-0" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-transparent text-purple-950 text-xs font-bold focus:outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option className="text-slate-900" value="Bangalore / Near Me">📍 Bangalore</option>
              <option className="text-slate-900" value="Indiranagar">📍 Indiranagar</option>
              <option className="text-slate-900" value="Koramangala">📍 Koramangala</option>
              <option className="text-slate-900" value="Whitefield">📍 Whitefield</option>
              <option className="text-slate-900" value="HSR Layout">📍 HSR Layout</option>
              <option className="text-slate-900" value="Jayanagar">📍 Jayanagar</option>
            </select>
          </div>
        </div>

        {/* Center: Universal Search Bar */}
        <form onSubmit={handleSearch} className="w-full sm:flex-1 sm:max-w-xl mx-0 sm:mx-4 relative">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-purple-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, breed care, grooming, swimming pool, vet..."
              className="w-full h-10 pl-10 pr-24 bg-purple-50/80 text-purple-950 placeholder:text-purple-400 text-xs font-medium rounded-xl border border-purple-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
            >
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Right: Quick Action & Notification & User Status */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <NotificationBell />

          <button
            onClick={() => {
              if (user?.role === 'partner') navigate("/partner/dashboard");
              else if (user?.role === 'admin' || user?.role === 'superadmin') navigate("/admin/dashboard");
              else navigate("/dashboard");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 border border-purple-200 text-purple-900 text-xs font-bold transition-all shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center text-[10px] uppercase shadow-xs">
              {user?.name ? user.name.charAt(0) : (user?.role === 'partner' ? 'P' : 'U')}
            </div>
            <div className="text-left leading-none">
              <span className="block text-[11px] font-black text-purple-950 group-hover:text-purple-700 transition-colors">
                {user?.role === 'partner' ? 'Partner Account' : user?.role === 'admin' || user?.role === 'superadmin' ? 'Admin Panel' : 'Customer Account'}
              </span>
              <span className="block text-[9px] text-purple-700 font-medium mt-0.5">
                {user?.name || (user?.role === 'partner' ? 'Partner Desk' : 'Dashboard')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Directory Fast Category Bar */}
      <div className="bg-purple-100/90 px-3 md:px-6 py-1.5 flex items-center gap-3 overflow-x-auto no-scrollbar text-xs border-t border-purple-200 font-bold">
        <span className="text-purple-900 uppercase tracking-wider text-[10px] font-black shrink-0 flex items-center gap-1">
          <Sparkles size={11} className="text-purple-700" /> DIRECTORY FEED:
        </span>
        {[
          { label: "🏨 All Boarding Resorts", path: "/boarding" },
          { label: "✂️ Grooming & Spas", path: "/grooming" },
          { label: "🩺 Vet Clinics & On-Call", path: "/veterinary" },
          { label: "🏊 Swimming & Activities", path: "/activities" },
          { label: "🍖 Diet & Nutrition", path: "/diet" },
          { label: "🛍️ Pet Essentials Shop", path: "/shop" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="text-purple-900 hover:text-purple-700 hover:bg-purple-200/80 px-2.5 py-0.5 rounded-lg transition-all whitespace-nowrap text-[11px]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
