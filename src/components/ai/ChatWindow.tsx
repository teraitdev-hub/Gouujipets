import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Minimize2, Maximize2, Send, Image as ImageIcon,
  History, Sparkles, Volume2, VolumeX, Moon, Sun, ChevronDown
} from 'lucide-react';
import { useGoujjiAI } from '../../hooks/useGoujjiAI';
import { useVoice } from '../../hooks/useVoice';
import { MessageBubble } from './MessageBubble';
import { VoiceInput } from './VoiceInput';
import { QuickActions } from './QuickActions';
import { ChatHistory } from './ChatHistory';
import { ImageUpload } from './ImageUpload';
import type { VisionAnalysisResult } from '../../types/ai';

export const ChatWindow = ({ aiState }: { aiState: ReturnType<typeof useGoujjiAI> }) => {
  const {
    messages, conversations, isLoading, streaming, isOpen, setIsOpen,
    showHistory, setShowHistory, searchQuery, setSearchQuery,
    sendMessage, newConversation, selectConversation,
    deleteConversation, renameConversation, pinConversation,
    activeConversationId, userRole, userName, isAuthenticated,
    guestMessageCount, guestLimit
  } = aiState;

  const { speak, stopSpeaking, isSpeaking } = useVoice();

  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streaming.currentText]);

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-speak new bot messages
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && !streaming.isStreaming) {
        speak(last.content.replace(/[*#_`\[\]]/g, ''));
      }
    }
  }, [messages.length, streaming.isStreaming, autoSpeak, speak]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleVoiceTranscript = (text: string) => {
    if (text.trim()) {
      sendMessage(text.trim());
    }
  };

  const handleQuickAction = (text: string) => {
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-slate-700/50' : 'border-purple-100';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400';
  const msgBg = isDark ? 'bg-slate-800/50' : 'bg-purple-50/30';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed z-[9999] ${
          isExpanded
            ? 'inset-0 sm:inset-4 sm:rounded-[32px]'
            : 'bottom-4 right-4 w-[380px] sm:w-[420px] h-[600px] max-h-[85vh] rounded-[28px]'
        } ${bg} shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}
        style={{
          boxShadow: isDark
            ? '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 25px 60px rgba(124,58,237,0.15), 0 0 0 1px rgba(124,58,237,0.08)',
        }}
      >
        {/* ======== HEADER ======== */}
        <div className="relative bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%20fill-rule%3D%22evenodd%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%223%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
          <div className="flex items-center gap-3 relative z-10">
            <button onClick={() => setShowHistory(!showHistory)} className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center transition-all">
              <History size={16} className="text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-sm tracking-tight">Goujji AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
              </div>
              <p className="text-[10px] text-purple-200 font-semibold">Your pet care companion</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10">
            <button onClick={() => setAutoSpeak(!autoSpeak)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${autoSpeak ? 'bg-white/25 text-white' : 'text-white/60 hover:bg-white/10'}`} title={autoSpeak ? 'Voice ON' : 'Voice OFF'}>
              {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button onClick={() => setIsDark(!isDark)} className="w-8 h-8 text-white/60 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all" title="Toggle theme">
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-8 h-8 text-white/60 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all" title="Expand">
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 text-white/60 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ======== CHAT HISTORY SIDEBAR ======== */}
        <AnimatePresence>
          {showHistory && (
            <ChatHistory
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(id) => {
                const conv = conversations.find(c => c.id === id);
                if (conv) selectConversation(conv);
              }}
              onNew={newConversation}
              onDelete={deleteConversation}
              onRename={renameConversation}
              onPin={pinConversation}
              onClose={() => setShowHistory(false)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </AnimatePresence>

        {/* ======== IMAGE UPLOAD OVERLAY ======== */}
        <AnimatePresence>
          {showImageUpload && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-x-0 bottom-[60px] top-[60px] z-40 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 border-t border-purple-100 dark:border-slate-800"
            >
              <div className="relative h-full flex flex-col">
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="absolute top-2 right-2 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full z-10 transition-colors"
                >
                  <X size={16} className="text-slate-500 dark:text-slate-400" />
                </button>
                <div className="p-4 flex-1">
                  <ImageUpload
                    onAnalysisComplete={(result: VisionAnalysisResult) => {
                      sendMessage(`I analyzed this image. Here is the summary:\n\n${result.summary}`, result.imageUrl);
                      setShowImageUpload(false);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======== QUICK ACTIONS ======== */}
        {messages.length <= 1 && (
          <div className={`px-4 pt-3 pb-1 ${border} border-b shrink-0`}>
            <QuickActions userRole={userRole} onAction={handleQuickAction} />
          </div>
        )}

        {/* ======== MESSAGES AREA ======== */}
        <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${msgBg} custom-scrollbar relative`}>
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} isLatest={i === messages.length - 1} isDark={isDark} />
          ))}

          {/* Streaming response */}
          {streaming.isStreaming && streaming.currentText && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streaming.currentText,
                timestamp: new Date().toISOString(),
                metadata: { streaming: true }
              }}
              isLatest={true}
              isDark={isDark}
            />
          )}

          {/* Typing indicator */}
          {isLoading && !streaming.currentText && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm shrink-0 shadow-lg shadow-purple-500/20">
                🐾
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-md ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'} border shadow-sm`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button onClick={scrollToBottom} className="absolute bottom-28 left-1/2 -translate-x-1/2 w-8 h-8 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-purple-700 transition-all">
            <ChevronDown size={16} />
          </button>
        )}

        {/* ======== GUEST LIMIT BANNER ======== */}
        {!isAuthenticated && guestMessageCount >= 3 && guestMessageCount < guestLimit && (
          <div className={`px-4 py-2 ${isDark ? 'bg-amber-900/30 border-amber-800/50' : 'bg-amber-50 border-amber-200'} border-t text-center`}>
            <p className={`text-[11px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              {guestLimit - guestMessageCount} free message{guestLimit - guestMessageCount !== 1 ? 's' : ''} remaining • <button className="underline font-black">Log in</button> for unlimited access
            </p>
          </div>
        )}

        {/* ======== INPUT AREA ======== */}
        <form onSubmit={handleSubmit} className={`px-4 py-3 ${border} border-t ${bg} shrink-0`}>
          <div className={`flex items-end gap-2 p-1.5 rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-purple-200 bg-slate-50'} transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about pet care..."
              rows={1}
              className={`flex-1 px-3 py-2.5 text-sm bg-transparent resize-none outline-none ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
              style={{ maxHeight: '120px' }}
              disabled={!isAuthenticated && guestMessageCount >= guestLimit}
            />
            <div className="flex items-center gap-1 pb-1 pr-1">
              <button
                type="button"
                onClick={() => setShowImageUpload(!showImageUpload)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                  showImageUpload
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Upload Image or Document"
              >
                <ImageIcon size={18} />
              </button>
              <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none active:scale-95"
              >
                <Send size={14} className="-ml-0.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1">
              <Sparkles size={10} className="text-purple-400" />
              <span className={`text-[9px] font-bold ${subtext}`}>Powered by Goujji AI Engine</span>
            </div>
            <button type="button" onClick={newConversation} className={`text-[10px] font-bold ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'} transition-colors`}>
              + New Chat
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
