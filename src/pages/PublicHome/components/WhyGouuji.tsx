import { motion } from "framer-motion";
import { ShieldCheck, Users, CheckCircle2, Award, Navigation, HeartPulse, Clock, Sparkles } from "lucide-react";

export const WhyGouuji = () => {
  const features = [
    { 
      icon: ShieldCheck, 
      title: "Secure Payments", 
      desc: "All transactions are encrypted. Escrow holds your money safely until service is completed.", 
      color: "text-purple-600 bg-purple-50 border-purple-200" 
    },
    { 
      icon: Users, 
      title: "Verified Partners", 
      desc: "Every resort owner, groomer & vet undergoes a strict 42-point physical inspection.", 
      color: "text-blue-600 bg-blue-50 border-blue-200" 
    },
    { 
      icon: Navigation, 
      title: "GPS Location tracking", 
      desc: "Live track your dog walker or pet taxi securely through our dedicated mobile app.", 
      color: "text-emerald-600 bg-emerald-50 border-emerald-200" 
    },
    { 
      icon: Clock, 
      title: "Live Booking", 
      desc: "Instant confirmations. Zero wait times. View real-time availability of suites.", 
      color: "text-orange-600 bg-orange-50 border-orange-200" 
    },
    { 
      icon: Award, 
      title: "Real Reviews", 
      desc: "Only verified parents who completed their stays can submit ratings and reviews.", 
      color: "text-amber-600 bg-amber-50 border-amber-200" 
    },
    { 
      icon: HeartPulse, 
      title: "24/7 Support", 
      desc: "Our veterinary experts and care team are available round-the-clock for emergencies.", 
      color: "text-rose-600 bg-rose-50 border-rose-200" 
    },
  ];

  return (
    <section className="py-16 px-3 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 sm:p-12 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-[100px] opacity-60 pointer-events-none -z-10" />
        
        <div className="text-center mb-12 relative z-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-purple-700 uppercase tracking-widest bg-purple-100 px-3 py-1 rounded-full mb-4 shadow-sm">
            <Sparkles size={12} /> THE GOUUJI DIFFERENCE
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Premium Care. Zero Compromise.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto leading-relaxed">
            We are building a trustworthy ecosystem for pets. No fake reviews, no hidden fees. Just verified professionals who love your pets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {features.map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="group bg-white p-6 rounded-3xl border border-slate-200/80 hover:-translate-y-2 hover:shadow-xl hover:border-purple-200 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className={`w-14 h-14 rounded-2xl ${item.color} border flex items-center justify-center mb-5 shadow-inner transition-transform group-hover:scale-110 duration-300`}>
                <item.icon size={24} strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-slate-900 text-lg mb-2 relative z-10">{item.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed relative z-10">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
