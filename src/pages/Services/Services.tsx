import { useState } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { Search, ChevronDown, ChevronRight, Sparkles, ArrowRight, CheckCircle, Check, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_CATEGORIES, MVP_CATEGORIES, type ServiceCategory } from "../../lib/serviceCategories";

export const Services = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("boarding");
  const [showAll, setShowAll] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const filtered = ALL_CATEGORIES.filter(cat => {
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.subServices.some(s => s.name.toLowerCase().includes(q))
    );
  });

  const displayedCategories = searchQuery
    ? filtered
    : showAll
    ? ALL_CATEGORIES
    : MVP_CATEGORIES;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const toggleServiceSelection = (serviceName: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const handleBookSelected = () => {
    if (selectedServices.length === 0) {
      navigate('/boarding');
      return;
    }
    const queryStr = selectedServices.map(s => encodeURIComponent(s)).join(',');
    navigate(`/boarding?services=${queryStr}`);
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-28 space-y-8">

        {/* ── Hero ── */}
        <div className="relative bg-gradient-to-br from-purple-900 via-purple-950 to-purple-900 rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-2xl border border-purple-800">
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-600 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-bold mb-5 backdrop-blur-sm">
              <Sparkles size={12} className="text-purple-300" />
              GOUUJI ASSURED™ • VERIFIED x AMAZON DIRECTORY
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight leading-tight">
              Select What Your Pet Needs &<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white">Discover Exact Partner Matches</span>
            </h1>
            <p className="text-sm sm:text-base text-purple-100 mb-5 leading-relaxed font-medium max-w-lg">
              Click any service tags below (like <span className="text-white font-bold bg-purple-800/80 px-1.5 py-0.5 rounded">AC Rooms</span>, <span className="text-white font-bold bg-purple-800/80 px-1.5 py-0.5 rounded">Medicated Bath</span>, or <span className="text-white font-bold bg-purple-800/80 px-1.5 py-0.5 rounded">24/7 Vet</span>) and we will instantly show you ONLY verified local partners with transparent rates!
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-lg border border-purple-400"
              >
                <span>🌟 Open Main Directory Portal</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => navigate("/boarding")}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20"
              >
                📍 All Verified Centers
              </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search services, e.g. grooming, AC rooms, vaccine, vet..."
                className="w-full h-12 bg-white/10 border border-white/20 rounded-2xl pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Selected Services Active Banner ── */}
        {selectedServices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                {selectedServices.length}
              </div>
              <div>
                <h4 className="font-black text-sm text-purple-950">Required Services Selected:</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedServices.map(srv => (
                    <span key={srv} className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      {srv}
                      <button onClick={() => toggleServiceSelection(srv)} className="hover:text-purple-700 font-black ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setSelectedServices([])}
                className="text-xs font-bold text-purple-600 hover:text-purple-900 px-3 py-2"
              >
                Clear All
              </button>
              <button
                onClick={handleBookSelected}
                className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span>Find Matching Partners ({selectedServices.length})</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Quick Pill Navigation ── */}
        {!searchQuery && (
          <div className="overflow-x-auto pb-1 -mx-4 px-4">
            <div className="flex gap-2 w-max">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setExpandedId(cat.id);
                    document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
                    cat.phase === 1
                      ? `${cat.color} ${cat.borderColor} hover:shadow-sm`
                      : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  <cat.icon size={12} />
                  {cat.name}
                  {cat.phase === 2 && <span className="text-[9px] bg-purple-600 text-white px-1 rounded-full">NEW</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Category Grid ── */}
        <div>
          {searchQuery && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-gray-600">No services match "{searchQuery}"</p>
              <button onClick={() => setSearchQuery("")} className="mt-3 text-sm text-purple-600 hover:underline font-bold">Clear search</button>
            </div>
          )}

          {!searchQuery && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">
                {showAll ? "All 20 Categories" : "Core Services & Selectable Packages"}
              </h2>
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-sm font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                {showAll ? "Show Less" : `See All 20`}
                <ChevronRight size={14} className={showAll ? "rotate-90 transition-transform" : "transition-transform"} />
              </button>
            </div>
          )}

          <div className="columns-1 sm:columns-2 gap-4">
            <AnimatePresence>
              {displayedCategories.map((cat, index) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  index={index}
                  isExpanded={expandedId === cat.id}
                  selectedServices={selectedServices}
                  onToggleExpand={() => toggleExpand(cat.id)}
                  onSelectService={toggleServiceSelection}
                  onBookCategory={() => {
                    if (selectedServices.length > 0) {
                      handleBookSelected();
                    } else {
                      navigate(`/boarding?category=${cat.id}`);
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Sticky Bottom Floating CTA if items are selected ── */}
        <AnimatePresence>
          {selectedServices.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-4 right-4 max-w-3xl mx-auto z-50 bg-purple-950 text-white p-4 rounded-2xl shadow-2xl border border-purple-800 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-base shrink-0 border border-purple-400">
                  {selectedServices.length}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-xs text-purple-200 font-bold uppercase tracking-wider">Ready to filter shops?</p>
                  <p className="text-sm font-black truncate">{selectedServices.join(", ")}</p>
                </div>
              </div>
              <button
                onClick={handleBookSelected}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-95 text-xs sm:text-sm border border-purple-400"
              >
                <span>Find Matching Partners</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

/* ── Category Card Component ── */
const CategoryCard = ({
  cat,
  index,
  isExpanded,
  selectedServices,
  onToggleExpand,
  onSelectService,
  onBookCategory,
}: {
  cat: ServiceCategory;
  index: number;
  isExpanded: boolean;
  selectedServices: string[];
  onToggleExpand: () => void;
  onSelectService: (name: string) => void;
  onBookCategory: () => void;
}) => {
  const selectedCountInCategory = cat.subServices.filter(s => selectedServices.includes(s.name)).length;

  return (
    <motion.div
      id={`cat-${cat.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md break-inside-avoid inline-block w-full mb-4 ${selectedCountInCategory > 0 ? "border-purple-500 ring-1 ring-purple-500" : cat.borderColor}`}
    >
      {/* Card Header */}
      <button
        onClick={onToggleExpand}
        className={`w-full flex items-center gap-3 p-4 bg-gradient-to-r ${cat.bgGradient} text-left group`}
      >
        <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center shrink-0 shadow-sm relative`}>
          <cat.icon size={20} />
          {selectedCountInCategory > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
              {selectedCountInCategory}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm leading-tight">{cat.name}</h3>
            {cat.phase === 2 && (
              <span className="text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-full leading-none shrink-0">NEW</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-1">{cat.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-xs text-gray-400 font-medium">{cat.subServices.length} services</span>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded Sub-services with Interactive Selection */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-3 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                <Check size={12} /> Click to select specific services needed:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {cat.subServices.map(sub => {
                  const isSelected = selectedServices.includes(sub.name);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectService(sub.name);
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 active:scale-95 ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm pr-2.5"
                          : `bg-white ${cat.borderColor} text-gray-700 hover:bg-purple-50`
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isSelected ? "bg-white text-purple-600" : "border border-gray-300"}`}>
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={onBookCategory}
                className={`w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ${
                  cat.phase === 1
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-purple-400 hover:bg-purple-500"
                }`}
              >
                <span>
                  {selectedCountInCategory > 0
                    ? `Find Partners Providing Selected Services (${selectedCountInCategory})`
                    : cat.phase === 1 ? `Browse All ${cat.name} Partners` : "Coming Soon — Notify Me"}
                </span>
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
