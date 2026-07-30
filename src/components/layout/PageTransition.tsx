import { motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 15,
    scale: 0.98,
    filter: "blur(4px)"
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)"
  },
  out: {
    opacity: 0,
    y: -10,
    scale: 1.02,
    filter: "blur(4px)"
  },
};

const pageTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
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
