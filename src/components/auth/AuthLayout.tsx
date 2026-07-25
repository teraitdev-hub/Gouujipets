import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { PawPrint } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  imageUrl: string;
  title: string;
  subtitle: string;
}

export const AuthLayout = ({ children, imageUrl, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col md:flex-row font-sans">
      
      {/* Left Form Section */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-start md:justify-center overflow-y-auto px-8 md:px-16 lg:px-24 py-12 min-h-screen md:min-h-0">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <PawPrint size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#2D2D2D]">Gouuji Pets</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="form_main !max-w-md mx-auto"
          >
            <div className="z-[2] relative w-full">
              <h1 className="form_heading">{title}</h1>
              <p className="text-[#7A7A7A] mb-8 font-medium">{subtitle}</p>
              
              {children}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden md:block flex-1 relative overflow-hidden bg-[#F5E6CC]">
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img 
            src={imageUrl} 
            alt="Authentication Cover" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </motion.div>
      </div>

    </div>
  );
};
