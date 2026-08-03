import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
import { useAuthStore } from "../../../store/useAuthStore";

export const ServicesSection = () => {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, "services"), where("status", "==", "active"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(data);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <SkeletonLoader type="card" count={8} />
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <EmptyState 
          icon="🛠️"
          title="No Services Available" 
          description="We are currently updating our service catalogue. Please check back later." 
        />
      </section>
    );
  }

  const handleServiceClick = (serviceId: string) => {
    if (!isAuthenticated) {
      navigate(`/login/user?service=${serviceId}`);
    } else {
      navigate(`/${serviceId}`);
    }
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Our Core Services
          </h2>
          <p className="text-slate-600 font-semibold mt-2">Select a category to explore verified partners</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleServiceClick(service.id)}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col items-center text-center hover:-translate-y-1 relative shadow-xs group"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-4 transition-colors shadow-inner border border-slate-200/60 group-hover:bg-purple-50 group-hover:border-purple-200">
                <span className="group-hover:scale-110 transition-transform">{service.icon || "🐾"}</span>
              </div>
              <h3 className="font-black text-base text-slate-900 mb-1">
                {service.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500 line-clamp-2">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
