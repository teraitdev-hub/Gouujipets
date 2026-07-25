import { PageTransition } from "../../components/layout/PageTransition";
import { Star, ThumbsUp, Quote } from "lucide-react";
import { motion } from "framer-motion";

const reviews = [
  { id: 1, name: "Emily Clark", pet: "Max (Golden Retriever)", rating: 5, date: "May 20, 2025", text: "City Pet Boarding took amazing care of Max! The daily photo updates gave me so much peace of mind.", likes: 12 },
  { id: 2, name: "David Chen", pet: "Luna (Siamese Cat)", rating: 5, date: "Apr 15, 2025", text: "Dr. Jenkins is the best. Very thorough and answered all my questions about Luna's diet.", likes: 8 },
  { id: 3, name: "Sarah Williams", pet: "Bella (Poodle)", rating: 4, date: "Mar 02, 2025", text: "Great grooming service. Bella looks beautiful! Only giving 4 stars because we had to wait 15 minutes past our appointment time.", likes: 4 },
];

export const Reviews = () => {
  return (
    <PageTransition className="pb-24 max-w-4xl mx-auto space-y-6">
      
      <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 text-center flex flex-col items-center hover:shadow-lg transition-all">
        <h1 className="text-3xl font-black text-slate-900 mb-4">4.8</h1>
        <div className="flex items-center gap-1 text-purple-600 mb-2">
          <Star className="fill-purple-600" size={24} />
          <Star className="fill-purple-600" size={24} />
          <Star className="fill-purple-600" size={24} />
          <Star className="fill-purple-600" size={24} />
          <Star className="fill-purple-600" size={24} opacity={0.5} />
        </div>
        <p className="text-sm text-slate-500">Based on 1,245 reviews</p>
      </div>

      <div className="space-y-4">
        {reviews.map((review, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={review.id}
            className="bg-white/70 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 relative hover:-translate-y-1 hover:shadow-lg transition-all"
          >
            <Quote size={40} className="absolute top-6 right-6 text-purple-100 rotate-180" />
            
            <div className="flex items-center gap-1 text-purple-600 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className={i < review.rating ? "fill-purple-600" : ""} opacity={i < review.rating ? 1 : 0.3} />
              ))}
            </div>
            
            <p className="text-slate-900 leading-relaxed mb-6 italic">"{review.text}"</p>
            
            <div className="flex items-end justify-between border-t border-white/50 pt-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{review.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Parent of {review.pet}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-500">{review.date}</span>
                <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors">
                  <ThumbsUp size={14} /> {review.likes}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
    </PageTransition>
  );
};
