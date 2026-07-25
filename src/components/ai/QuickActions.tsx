import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  userRole: string;
  onAction: (text: string) => void;
}

const ROLES_ACTIONS: Record<string, string[]> = {
  customer: ["🏨 Book Boarding", "✂️ Book Grooming", "💉 Vaccination Schedule", "🍖 Diet Advice", "🩺 Find Vet", "📋 My Bookings"],
  partner: ["📊 Today's Check-ins", "📋 Pending Bookings", "💰 Generate Invoice", "🐕 Feed Schedule", "💊 Medicine Reminders"],
  admin: ["📈 Revenue Report", "📊 Booking Analytics", "👥 Active Users", "⭐ Top Services", "🏨 Occupancy Rate"],
  guest: ["🐕 Dog Breeds", "🐱 Cat Breeds", "💉 Vaccination Info", "🆘 Pet First Aid"],
};

export const QuickActions: React.FC<QuickActionsProps> = ({ userRole, onAction }) => {
  const actions = useMemo(() => {
    const roleKey = userRole?.toLowerCase() || 'guest';
    return ROLES_ACTIONS[roleKey] || ROLES_ACTIONS['guest'];
  }, [userRole]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10, scale: 0.95 },
    show: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="w-full overflow-hidden relative">
      {/* Fade edges for scrollability hint */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
      
      <motion.div 
        className="flex space-x-2.5 overflow-x-auto pb-4 pt-2 px-4 scrollbar-hide snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <style dangerouslySetInnerHTML={{__html: `
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}} />
        
        {actions.map((action, index) => (
          <motion.button
            key={index}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(action)}
            className="snap-start flex-shrink-0 px-4 py-2 bg-white/60 backdrop-blur-md dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-full text-[13px] font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md transition-all hover:bg-white dark:hover:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-500 whitespace-nowrap"
          >
            {action}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
