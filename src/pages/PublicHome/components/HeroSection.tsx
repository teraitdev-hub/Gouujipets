import { useState, useEffect } from "react";
import { Search, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { SkeletonLoader } from "./SkeletonLoader";

interface HeroSectionProps {
  onSearch: (searchData: { location: string; query: string }) => void;
}

export const HeroSection = ({ onSearch }: HeroSectionProps) => {
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState("Bangalore / Near Me");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchHeroImage = async () => {
      try {
        const q = query(collection(db, "cms_hero"), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          if (data.imageUrl) {
            setHeroImage(data.imageUrl);
          }
        }
      } catch (error) {
        console.error("Failed to fetch hero image from Firebase:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHeroImage();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ location: searchLocation, query: searchQuery });
  };

  return (
    <section className="relative pt-10 pb-16 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden border-b border-slate-200/60 flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto gap-10">
      
      {/* Left Side: Content & Search */}
      <div className="relative z-10 w-full md:w-1/2 flex flex-col items-start text-left space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-sm"
        >
          <Sparkles size={14} className="text-purple-600" />
          India's #1 Verified Pet Care Network
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight"
        >
          Find the Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Care</span> <br className="hidden sm:block" /> for your Best Friend
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm sm:text-base text-slate-600 font-semibold max-w-lg mt-6 leading-relaxed"
        >
          Book verified boarding resorts, professional groomers, and 24/7 vets near you. Transparent pricing, instant booking, and peace of mind.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pt-4 w-full"
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 shadow-xl focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all z-20 relative w-full max-w-2xl">
            <div className="flex items-center w-full sm:w-auto flex-1 gap-2 px-4 py-2 border-b sm:border-b-0 sm:border-r border-slate-200">
              <MapPin size={20} className="text-black shrink-0" />
              <select
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full bg-transparent text-slate-900 font-bold focus:outline-none appearance-none cursor-pointer"
              >
                <option value="Bangalore / Near Me">Bangalore / Near Me</option>
                <option value="Indiranagar">Indiranagar</option>
                <option value="Koramangala">Koramangala</option>
                <option value="Whitefield">Whitefield</option>
              </select>
            </div>
            <div className="flex items-center w-full flex-[2] gap-2 px-4 py-2">
              <Search size={20} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resorts, groomers, vets..."
                className="w-full bg-transparent text-slate-900 font-medium focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <button type="submit" className="w-full sm:w-auto bg-black hover:bg-black/80 text-white font-black px-8 py-4 rounded-xl shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap">
              Search
            </button>
          </form>
        </motion.div>
      </div>

      {/* Right Side: Image/Illustration */}
      <div className="w-full md:w-1/2 relative min-h-[400px] flex items-center justify-center">
        {isLoading ? (
          <SkeletonLoader type="hero" />
        ) : heroImage ? (
          <motion.img 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            src={heroImage} 
            alt="Premium Pet Care" 
            className="w-full h-auto max-h-[600px] object-cover rounded-[40px] shadow-2xl"
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full h-[500px] rounded-[40px] bg-gradient-to-br from-purple-100 to-pink-50 border border-purple-200/50 flex flex-col items-center justify-center text-center p-8 shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center text-5xl mb-6 z-10">
              🐕
            </div>
            <h2 className="text-2xl font-black text-purple-900 mb-2 z-10">Premium Care Awaits</h2>
            <p className="text-purple-700 font-medium max-w-sm z-10">Your pet's perfect vacation is just a few clicks away.</p>
          </motion.div>
        )}
      </div>

    </section>
  );
};
