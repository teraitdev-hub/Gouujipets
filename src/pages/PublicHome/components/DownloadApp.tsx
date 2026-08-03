import { motion } from "framer-motion";
import { Apple, Play } from "lucide-react";

export const DownloadApp = () => {
  const isAppAvailable = false; // Mocking app availability based on instruction

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="bg-slate-900 rounded-[40px] p-8 sm:p-16 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
        
        {/* Background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/40 to-transparent pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full md:w-1/2 text-center md:text-left">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 leading-tight">
            Premium Pet Care, <br /> Now in Your Pocket.
          </h2>
          <p className="text-slate-400 font-medium text-sm sm:text-base max-w-md mx-auto md:mx-0 mb-8 leading-relaxed">
            Manage bookings, get live photo updates from caretakers, and track your dog walker on a live GPS map using the Gouuji Pets mobile app.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <button 
              disabled={!isAppAvailable}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold transition-all ${
                isAppAvailable 
                  ? "bg-white text-slate-900 hover:bg-slate-100 shadow-lg active:scale-95" 
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              }`}
            >
              <Apple size={24} />
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider font-bold">Download on the</div>
                <div className="text-sm font-black">App Store</div>
              </div>
            </button>

            <button 
              disabled={!isAppAvailable}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold transition-all ${
                isAppAvailable 
                  ? "bg-white text-slate-900 hover:bg-slate-100 shadow-lg active:scale-95" 
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              }`}
            >
              <Play size={24} />
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-wider font-bold">GET IT ON</div>
                <div className="text-sm font-black">Google Play</div>
              </div>
            </button>
          </div>
          
          {!isAppAvailable && (
             <p className="text-purple-400 text-xs mt-4 font-bold">Mobile apps launching soon! Join the waitlist.</p>
          )}
        </div>

        <div className="relative z-10 w-full md:w-1/2 flex justify-center">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-64 h-[500px] bg-slate-800 rounded-[40px] border-8 border-slate-700 shadow-2xl relative overflow-hidden flex flex-col"
          >
            {/* Phone Notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-700 rounded-b-2xl w-32 mx-auto z-20" />
            
            {/* Phone Screen Mockup content */}
            <div className="flex-1 bg-slate-50 p-4 pt-10 flex flex-col gap-4 relative">
               <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🐕</div>
                  <div>
                    <div className="h-3 w-20 bg-slate-200 rounded mb-1"></div>
                    <div className="h-2 w-16 bg-slate-100 rounded"></div>
                  </div>
               </div>
               <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-32 flex flex-col justify-end">
                  <div className="h-2 w-full bg-slate-100 rounded mb-2"></div>
                  <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
