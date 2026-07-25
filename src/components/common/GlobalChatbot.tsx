import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Bot, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { generateLocalResponse } from '../../services/ai/promptService';

interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
  isStreaming?: boolean;
}

const TypewriterText = ({ text, onTick }: { text: string; onTick: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i += 1;
        onTick(); // Trigger auto-scroll
      } else {
        clearInterval(interval);
      }
    }, 15); // Fast real-time typing effect
    
    return () => clearInterval(interval);
  }, [text, onTick]);

  return <span>{displayedText}</span>;
};

export const GlobalChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Initialize greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const view = window.location.pathname;
      let greeting = `Hi ${user?.full_name?.split(' ')[0] || 'there'}! I'm the Gouuji Assistant. `;
      
      if (view.includes('dashboard')) {
        greeting += `Welcome to your Dashboard! I can help you manage your pets and track your recent activities.`;
      } else if (view.includes('partner')) {
        greeting += `Welcome to the Partner Portal! I can assist you with your financials, bookings, and customer check-ins.`;
      } else if (view.includes('health')) {
        greeting += `Welcome to the Health section! Need help finding vaccination info or diet plans?`;
      } else if (view.includes('admin')) {
        greeting += `Welcome to Super Admin Control. How can I assist you with platform oversight today?`;
      } else if (view.includes('login') || view.includes('auth')) {
        greeting += `Welcome! I can help you get signed in or registered.`;
      } else {
        greeting += `How can I help you with your pet care needs today?`;
      }

      setMessages([
        {
          id: Date.now(),
          sender: 'bot',
          message: greeting,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [isOpen, messages.length, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      message: currentInput,
      timestamp: new Date().toISOString()
    }]);
    
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let botText = generateLocalResponse(currentInput, {
        userRole: (user as any)?.role || "customer",
        currentView: location.pathname,
        user: user || undefined
      });
      
      if (!botText.trim()) {
        botText = "I am still learning, so I might need human assistance for this specific query. Please open the 'Raise Support Ticket' form on our Support Desk, and our Super Admin team will resolve it promptly.";
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        message: botText,
        timestamp: new Date().toISOString(),
        isStreaming: true
      }]);
      setIsTyping(false);
    }, 400); // Reduced delay to 400ms for instant real-time start
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center z-[9999] transition-colors border-2 border-white"
          >
            <MessageSquare size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl z-[9999] border border-purple-200 overflow-hidden flex flex-col h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-purple-900 text-white p-4 flex items-center justify-between shadow-md relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center relative">
                  <Bot size={18} />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-purple-900 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-black text-sm">GouujiCare Assistant</h3>
                  <p className="text-[10px] text-purple-200 uppercase tracking-widest font-bold">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-purple-800 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-purple-50/50 custom-scrollbar">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === 'user' ? 'bg-purple-200 text-purple-700' : 'bg-purple-600 text-white'
                    }`}>
                      {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-sm' 
                        : 'bg-white border border-purple-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.isStreaming ? (
                          <TypewriterText 
                            text={msg.message} 
                            onTick={() => messagesEndRef.current?.scrollIntoView()}
                          />
                        ) : (
                          msg.message
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Bot size={12} />
                    </div>
                    <div className="p-4 bg-white border border-purple-100 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action (Support Desk Link) */}
            {messages.length > 2 && !isTyping && (
              <div className="px-4 pb-2 bg-purple-50/50">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/support');
                  }}
                  className="w-full py-2 bg-white border border-purple-200 hover:border-purple-500 rounded-xl text-xs font-bold text-purple-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  Open Full Support Desk <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-purple-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 w-9 h-9 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <Send size={14} className="-ml-0.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
