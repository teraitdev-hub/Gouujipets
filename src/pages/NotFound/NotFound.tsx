import { useNavigate } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import { Home, Search, Calendar, HeartPulse, Bone } from "lucide-react";
import { motion } from "framer-motion";

export const NotFound = ({ type = "App" }: { type?: string }) => {
  const navigate = useNavigate();

  // Pick a random cute dog or cat image
  const petImages = [
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800", // Cute beagle
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=800", // Dog with glasses
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800", // Cat hiding
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800"  // Funny dog
  ];
  
  const randomImage = petImages[Math.floor(Math.random() * petImages.length)];

  return (
    <PageTransition className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      
      {/* Fun Background Elements */}
      <div className="absolute top-10 left-10 text-purple-100 opacity-50 rotate-12">
        <Bone size={120} />
      </div>
      <div className="absolute bottom-10 right-10 text-purple-100 opacity-50 -rotate-12">
        <HeartPulse size={100} />
      </div>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="relative z-10 max-w-lg mx-auto bg-white rounded-[40px] p-8 shadow-2xl border border-gray-100"
      >
        <div className="w-full aspect-video rounded-[24px] overflow-hidden mb-8 relative shadow-inner">
          <img 
            src={randomImage} 
            alt="Lost Pet" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-black text-gray-900 shadow-lg text-sm">
            404 Error
          </div>
        </div>

        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
          Ruh-roh! You seem lost.
        </h1>
        
        <p className="text-gray-500 mb-8 font-medium text-lg leading-relaxed">
          The {type.toLowerCase()} page you are looking for has wandered off and is currently digging holes in the backyard. Let's get you back on track!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            Go Back
          </button>
          
          <button 
            onClick={() => navigate(type === 'Admin' ? '/admin/dashboard' : type === 'Partner' ? '/partner/login' : '/dashboard')}
            className="w-full sm:w-auto px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Home size={18} /> 
            Return Home
          </button>
        </div>
      </motion.div>
    </PageTransition>
  );
};

