import { PageTransition } from "../layout/PageTransition";
import { motion } from "framer-motion";
import type { ElementType } from "react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: ElementType;
}

export const PlaceholderPage = ({ title, description, icon: Icon }: PlaceholderPageProps) => {
  const IconComponent = Icon as any;
  return (
    <PageTransition className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-24 h-24 bg-primary/10 text-primary rounded-[24px] flex items-center justify-center mb-8 shadow-sm border border-primary/20"
      >
        <IconComponent size={48} strokeWidth={1.5} />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-text mb-3">{title}</h1>
        <p className="text-text-light text-lg mb-8 max-w-lg mx-auto">
          {description}
        </p>
      </motion.div>

      {/* Dummy Data Skeleton */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full bg-card border border-secondary/50 rounded-[24px] p-6 shadow-sm"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-secondary/50 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-secondary/50 rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-secondary/50 rounded w-1/3 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-20 bg-secondary/30 rounded-xl w-full animate-pulse" />
          <div className="h-20 bg-secondary/30 rounded-xl w-full animate-pulse" />
        </div>
      </motion.div>
    </PageTransition>
  );
};
