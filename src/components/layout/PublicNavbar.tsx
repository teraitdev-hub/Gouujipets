import { useState } from "react";
import { Search, MapPin, User, Sparkles, Menu, X, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

export const PublicNavbar = () => {
  const { isAuthenticated, openLoginModal, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Bangalore / Near Me");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/boarding?query=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/boarding");
    }
  };

  const navLinks = [
    { label: "Boarding", path: "/boarding" },
    { label: "Grooming", path: "/grooming" },
    { label: "Veterinary", path: "/veterinary" },
    { label: "Activities", path: "/activities" }
  ];

  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
      {/* Main Header Row */}
      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left: Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-left group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-black text-white text-lg shadow-sm group-hover:scale-105 transition-transform">
            G
          </div>
          <div className="leading-none hidden sm:block">
            <span className="text-base font-black text-slate-900 tracking-tight block">
              Gouuji<span className="text-purple-600">Pets</span>
            </span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">
              Verified Care
            </span>
          </div>
        </button>

        {/* Center: Search & Location (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-2xl items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-inner focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all">
          <div className="flex items-center gap-1.5 px-3 border-r border-slate-200 shrink-0 cursor-pointer">
            <MapPin size={14} className="text-purple-600" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option value="Bangalore / Near Me">Bangalore</option>
              <option value="Indiranagar">Indiranagar</option>
              <option value="Koramangala">Koramangala</option>
              <option value="Whitefield">Whitefield</option>
            </select>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 flex items-center px-2">
            <Search size={14} className="text-slate-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resorts, groomers, vets..."
              className="w-full bg-transparent text-slate-900 text-xs font-medium focus:outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-sm transition-all ml-2"
            >
              Search
            </button>
          </form>
        </div>

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="tel:18007383674" className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-purple-600 transition-colors mr-2">
            <Phone size={14} className="text-purple-500" />
            1800-PET-EMRG
          </a>
          
          {!isAuthenticated ? (
            <button
              onClick={openLoginModal}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs transition-colors"
            >
              <User size={14} className="stroke-[2.5]" />
              <span>Sign In</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (user?.role === 'partner') navigate("/partner/dashboard");
                else if (user?.role === 'admin' || user?.role === 'superadmin') navigate("/admin/dashboard");
                else navigate("/dashboard");
              }}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-colors shadow-sm"
            >
              <User size={14} className="stroke-[2.5]" />
              <span>Dashboard</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>



      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-[85vw] max-w-[320px] bg-white z-[101] lg:hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                <span className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-black text-white text-sm">
                    G
                  </div>
                  Menu
                </span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <MapPin size={18} className="text-purple-600 ml-1" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="bg-transparent text-slate-700 text-base font-bold focus:outline-none w-full min-h-[32px]"
                    >
                      <option value="Bangalore / Near Me">Bangalore</option>
                      <option value="Indiranagar">Indiranagar</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <Search size={18} className="text-slate-400 ml-1" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search pets..."
                      className="w-full bg-transparent text-slate-900 text-base focus:outline-none min-h-[32px]"
                    />
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-purple-600 text-white font-black rounded-xl text-base min-h-[48px]">
                    Search Directory
                  </button>
                </form>

                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Services</h4>
                  {navLinks.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                      className="w-full py-3.5 px-4 bg-transparent rounded-xl text-left text-base font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center justify-between min-h-[48px]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => { openLoginModal(); setIsMobileMenuOpen(false); }}
                      className="w-full py-3.5 bg-purple-600 text-white font-black rounded-xl text-base shadow-sm min-h-[48px]"
                    >
                      Customer Sign In
                    </button>
                    <button
                      onClick={() => { navigate("/partner/login"); setIsMobileMenuOpen(false); }}
                      className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl text-base shadow-sm min-h-[48px]"
                    >
                      Partner Portal Login
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { 
                      if (user?.role === 'partner') navigate("/partner/dashboard");
                      else if (user?.role === 'admin' || user?.role === 'superadmin') navigate("/admin/dashboard");
                      else navigate("/dashboard"); 
                      setIsMobileMenuOpen(false); 
                    }}
                    className="w-full py-3.5 bg-purple-600 text-white font-black rounded-xl text-base shadow-sm min-h-[48px]"
                  >
                    Go to Dashboard
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

