import { useState, useEffect } from "react";
import { Search, User, Menu, X, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { LocationHeaderBar } from "../location/LocationHeaderBar";
import { MagneticButton } from "../ui/MagneticButton";

export const PublicNavbar = () => {
  const { isAuthenticated, openLoginModal, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { label: "Boarding", path: "/boarding" },
    { label: "Grooming", path: "/grooming" },
    { label: "Veterinary", path: "/veterinary" },
    { label: "Activities", path: "/activities" }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/boarding?query=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/boarding");
    }
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 font-sans ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm py-2' : 'bg-transparent py-4'}`}>
      {/* Main Header Row */}
      <div className="px-4 md:px-8 flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left: Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-left shrink-0"
        >
          <img src="/logo.png" alt="Gouuji Pets" className="h-12 w-12 object-cover rounded-full shadow-lg border border-slate-800 transition-transform duration-300 hover:scale-105" />
        </button>

        {/* Center: Location Bar + Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-2xl items-center gap-3">
          {/* Location Selector */}
          <div className={`flex items-center rounded-2xl px-4 py-2.5 transition-all duration-300 cursor-pointer ${scrolled ? 'bg-slate-50 border border-slate-200 hover:border-purple-300' : 'bg-white/50 border border-white/40 hover:bg-white/80'}`}>
            <LocationHeaderBar />
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className={`flex-1 flex items-center rounded-2xl p-1 shadow-inner focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all duration-300 ${scrolled ? 'bg-slate-50 border border-slate-200' : 'bg-white/50 border border-white/40 backdrop-blur-sm focus-within:bg-white'}`}>
            <Search size={14} className="text-slate-500 mx-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resorts, groomers, vets..."
              className="w-full bg-transparent text-slate-900 text-xs font-semibold focus:outline-none placeholder:text-slate-500"
            />
            <MagneticButton
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition-all ml-1"
            >
              Search
            </MagneticButton>
          </form>
        </div>

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="tel:18007383674" className={`hidden md:flex items-center gap-1.5 text-xs font-bold transition-colors mr-2 ${scrolled ? 'text-slate-600 hover:text-purple-600' : 'text-slate-800 hover:text-purple-700'}`}>
            <Phone size={14} className="text-purple-600" />
            1800-PET-EMRG
          </a>
          
          {!isAuthenticated ? (
            <MagneticButton
              onClick={openLoginModal}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-colors shadow-sm ${scrolled ? 'bg-purple-50 hover:bg-purple-100 text-purple-700' : 'bg-white/80 hover:bg-white text-slate-900 backdrop-blur-md'}`}
            >
              <User size={14} className="stroke-[2.5]" />
              <span>Sign In</span>
            </MagneticButton>
          ) : (
            <MagneticButton
              onClick={() => {
                if (user?.role === 'partner') navigate("/partner/profile");
                else if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'super_admin') navigate("/admin/dashboard");
                else navigate("/profile");
              }}
              className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-md overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer shrink-0"
              title="My Profile"
            >
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitial()
              )}
            </MagneticButton>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className={`lg:hidden p-2 rounded-xl transition-colors ${scrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-800 hover:bg-white/50'}`}
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
                {/* Location Selector in mobile menu */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Your Location</p>
                  <LocationHeaderBar />
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <Search size={18} className="text-slate-400 ml-1" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search resorts, groomers, vets..."
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

