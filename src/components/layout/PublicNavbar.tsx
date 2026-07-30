import { useState } from "react";
import { Search, MapPin, User, Sparkles, Menu, X, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";

export const PublicNavbar = () => {
  const { isAuthenticated, openLoginModal, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Bangalore / Near Me");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

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
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="bg-white/70 backdrop-blur-3xl border-b border-white/40 sticky top-0 z-[60] shadow-[0_8px_32px_rgba(0,0,0,0.08)] font-sans"
    >
      {/* Main Header Row */}
      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left: Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-left group shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-all duration-300">
            G
          </div>
          <div className="leading-none hidden sm:block">
            <span className="text-base font-black text-slate-900 tracking-tight block">
              Gouuji<span className="text-purple-600">Pets</span>
            </span>
            <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest block mt-0.5">
              Premium Pet Care
            </span>
          </div>
        </button>

        {/* Center: Search & Location (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-2xl items-center bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-full p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all hover:shadow-md">
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
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-full shadow-md shadow-purple-600/25 transition-all ml-2 hover:shadow-lg hover:scale-105 active:scale-95"
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
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-purple-600/25 hover:shadow-lg hover:scale-105 active:scale-95"
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
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-purple-600/25 hover:shadow-lg hover:scale-105 active:scale-95"
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



      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <form onSubmit={handleSearch} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <MapPin size={16} className="text-purple-600 ml-1" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="bg-transparent text-slate-700 text-sm font-bold focus:outline-none w-full"
                  >
                    <option value="Bangalore / Near Me">Bangalore</option>
                    <option value="Indiranagar">Indiranagar</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <Search size={16} className="text-slate-400 ml-1" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pets..."
                    className="w-full bg-transparent text-slate-900 text-sm focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-black rounded-xl text-sm">
                  Search Directory
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2">
                {navLinks.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                    className="py-2 px-3 bg-slate-50 rounded-lg text-left text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {!isAuthenticated ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => { openLoginModal(); setIsMobileMenuOpen(false); }}
                    className="w-full py-3 bg-purple-600 text-white font-black rounded-xl text-sm shadow-sm"
                  >
                    Customer Sign In
                  </button>
                  <button
                    onClick={() => { navigate("/partner/login"); setIsMobileMenuOpen(false); }}
                    className="w-full py-3 bg-slate-900 text-white font-black rounded-xl text-sm shadow-sm"
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
                  className="w-full py-3 bg-purple-600 text-white font-black rounded-xl text-sm shadow-sm mt-2"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

