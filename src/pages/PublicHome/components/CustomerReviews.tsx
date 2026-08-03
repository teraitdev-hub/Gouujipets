import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, limit, getDocs, orderBy, where } from "firebase/firestore";
import { Star, CheckCircle } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";

export const CustomerReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(collection(db, "reviews"), where("status", "==", "approved"), limit(6));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(data);
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <SkeletonLoader type="review" count={3} />
      </section>
    );
  }

  if (reviews.length === 0) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <EmptyState 
          icon={<Star className="text-amber-400" size={32} />}
          title="No Customer Reviews Yet" 
          description="Reviews will appear here once verified customers complete their stays and leave feedback." 
        />
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Real Reviews from Real Parents</h2>
        <p className="text-slate-500 font-semibold mt-2">Only verified customers can leave a review on GouujiPets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, idx) => (
                  <Star 
                    key={idx} 
                    size={14} 
                    className={idx < (review.rating || 5) ? "text-amber-400 fill-amber-400" : "text-slate-200"} 
                  />
                ))}
              </div>
              <p className="text-slate-700 font-medium text-sm italic leading-relaxed">
                "{review.text}"
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
              {review.userPhoto ? (
                <img src={review.userPhoto} alt={review.userName} className="w-10 h-10 rounded-full object-cover bg-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {review.userName?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                  {review.userName || "Pet Parent"}
                  <CheckCircle size={12} className="text-emerald-500" />
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold">{new Date(review.date || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
