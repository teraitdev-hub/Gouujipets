import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { SkeletonLoader } from "./SkeletonLoader";

export const TrustSection = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, "cms_stats"), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setStats(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Failed to fetch trust stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <SkeletonLoader type="stats" count={4} />
      </section>
    );
  }

  // If no data, hide section as requested
  if (!stats || Object.keys(stats).length === 0) {
    return null;
  }

  const statItems = [
    { label: "Verified Partners", value: stats.partnersCount, icon: "🏨" },
    { label: "Happy Customers", value: stats.customersCount, icon: "😊" },
    { label: "Cities Served", value: stats.citiesCount, icon: "📍" },
    { label: "Completed Bookings", value: stats.bookingsCount, icon: "✅" },
  ].filter(item => item.value); // only show if value exists

  if (statItems.length === 0) return null;

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-purple-700 uppercase tracking-widest bg-purple-100 px-3 py-1 rounded-full mb-3">
            🐾 PLATFORM TRUST
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            India's Most Trusted Pet Care Marketplace
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">{item.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
