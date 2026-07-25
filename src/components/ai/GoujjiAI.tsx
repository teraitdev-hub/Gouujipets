import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useGoujjiAI } from '../../hooks/useGoujjiAI';
import { ChatWindow } from './ChatWindow';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * GoujjiAI — Main orchestrator component
 *
 * Renders a floating action button and the expandable AI chat window.
 * Drop-in replacement for the old GlobalChatbot component.
 * Rendered globally in App.tsx — appears on every page.
 */
export const GoujjiAI = () => {
  const aiState = useGoujjiAI();

  return (
    <>
      {/* ======== FLOATING ACTION BUTTON ======== */}
      <AnimatePresence>
        {!aiState.isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={aiState.openChat}
            className="fixed bottom-6 right-6 z-[9998] group"
            aria-label="Open Goujji AI Assistant"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 w-full h-full rounded-full bg-purple-500/30 animate-ping" />

            {/* Outer glow */}
            <span className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-purple-500/40 to-indigo-500/40 blur-md group-hover:blur-lg transition-all" />

            {/* Button */}
            <div className="relative w-14 h-14 bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 rounded-full shadow-2xl shadow-purple-500/30 flex items-center justify-center border-2 border-white/20">
              <div className="relative">
                <MessageSquare size={22} className="text-white" />
                <Sparkles size={10} className="absolute -top-1.5 -right-1.5 text-yellow-300" />
              </div>
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Ask Goujji AI 🐾
              <div className="absolute top-full right-5 w-2 h-2 bg-slate-900 rotate-45 -translate-y-1" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ======== CHAT WINDOW ======== */}
      <AnimatePresence>
        {aiState.isOpen && (
          <ErrorBoundary>
            <ChatWindow aiState={aiState} />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </>
  );
};
