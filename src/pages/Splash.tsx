import { motion } from "framer-motion";
import { PawPrint } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative"
      >
        <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/40 relative z-10">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 0.5, duration: 0.6, ease: "easeInOut" }}
          >
            <PawPrint size={48} />
          </motion.div>
        </div>
        
        {/* Animated background rings */}
        <motion.div 
          className="absolute inset-0 bg-primary/20 rounded-3xl -z-10"
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
        />
        <motion.div 
          className="absolute inset-0 bg-primary/20 rounded-3xl -z-10"
          animate={{ scale: [1, 2], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-8 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-text">Gouuji Pets</h1>
        <p className="text-text-light mt-2 text-sm font-medium">Premium Pet Care</p>
      </motion.div>
    </div>
  );
};
