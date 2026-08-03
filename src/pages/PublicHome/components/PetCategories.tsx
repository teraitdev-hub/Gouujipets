import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { SkeletonLoader } from "./SkeletonLoader";

export const PetCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "pet_categories"));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch pet categories:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <SkeletonLoader type="card" count={4} />
      </section>
    );
  }

  if (categories.length === 0) {
    return null; // hide if none
  }

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Browse by Pet</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="min-w-[120px] bg-white rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group shrink-0"
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-3xl mb-3 shadow-inner group-hover:scale-110 transition-transform">
                {cat.icon || "🐾"}
              </div>
              <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
