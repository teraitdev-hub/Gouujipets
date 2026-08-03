import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, title, description, actionText, onAction }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/80 p-10 text-center max-w-md mx-auto shadow-sm flex flex-col items-center justify-center min-h-[300px]"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center mb-4 shadow-inner border border-slate-200">
        {icon || <span className="text-2xl">🐾</span>}
      </div>
      <h3 className="font-black text-slate-900 text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">{description}</p>
      
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white text-sm font-black shadow-md active:scale-95"
        >
          {actionText}
        </button>
      )}
    </motion.div>
  );
};
