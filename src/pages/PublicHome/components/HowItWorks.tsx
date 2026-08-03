import { motion } from "framer-motion";
import { Search, CalendarCheck, CreditCard, Activity, Star } from "lucide-react";

export const HowItWorks = () => {
  const steps = [
    { icon: Search, title: "Search", desc: "Find verified services near you." },
    { icon: CalendarCheck, title: "Choose", desc: "Pick the best provider." },
    { icon: CreditCard, title: "Book & Pay", desc: "Securely lock your dates." },
    { icon: Activity, title: "Track", desc: "Get live updates." },
    { icon: Star, title: "Review", desc: "Share your experience." },
  ];

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-slate-900 mb-2">How It Works</h2>
        <p className="text-slate-500 font-semibold">Book premium pet care in 5 easy steps</p>
      </div>

      <div className="relative">
        {/* Connecting Line */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-full bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-0 relative z-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center shadow-lg group-hover:border-purple-200 group-hover:scale-110 transition-all duration-300 z-10 relative">
                <div className="absolute inset-0 rounded-full bg-purple-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                <step.icon className="text-slate-700 group-hover:text-purple-600 transition-colors" size={24} />
              </div>
              <h3 className="font-black text-slate-900 mt-4 mb-1 text-sm">{step.title}</h3>
              <p className="text-xs text-slate-500 font-medium px-2">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
