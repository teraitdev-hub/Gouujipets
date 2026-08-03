import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";

export const FaqSection = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const q = query(collection(db, "faqs"), limit(6));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFaqs(data);
      } catch (error) {
        console.error("Failed to fetch FAQs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-3xl mx-auto">
        <SkeletonLoader type="text" count={6} />
      </section>
    );
  }

  if (faqs.length === 0) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <EmptyState 
          icon={<MessageCircleQuestion className="text-slate-400" size={32} />}
          title="No FAQs Available" 
          description="We are updating our frequently asked questions. Contact support if you need help." 
        />
      </section>
    );
  }

  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        <p className="text-slate-500 font-semibold mt-2">Everything you need to know about GouujiPets.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <motion.div 
            key={faq.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white border ${openIndex === index ? 'border-purple-300 shadow-md' : 'border-slate-200/80 shadow-xs'} rounded-2xl overflow-hidden transition-all duration-300`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
              <ChevronDown 
                size={20} 
                className={`text-slate-400 transition-transform duration-300 shrink-0 ${openIndex === index ? 'rotate-180 text-purple-600' : ''}`} 
              />
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-6 pb-6 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
