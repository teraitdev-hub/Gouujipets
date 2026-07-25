import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils'; // Assuming clsx/tailwind-merge is in lib/utils

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hoverEffect = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverEffect ? { y: -5, scale: 1.01 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md",
          "border border-white/20 dark:border-white/10",
          "shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]",
          "rounded-2xl p-6",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";
