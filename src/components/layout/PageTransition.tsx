import { motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition: Transition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4,
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
};
