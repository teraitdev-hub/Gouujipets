import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, MessageSquare, MoreVertical, Edit2, Trash2, Pin, X } from 'lucide-react';
import type {  AIConversation  }   from '../../types/ai';

interface ChatHistoryProps {
  conversations: AIConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onPin,
  onClose,
  searchQuery,
  onSearchChange
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Group conversations by time/pinned
  const pinned = conversations.filter(c => c.pinned);
  const unpinned = conversations.filter(c => !c.pinned);
  
  const now = new Date();
  const today = unpinned.filter(c => {
    const d = new Date(c.updatedAt);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = unpinned.filter(c => {
    const d = new Date(c.updatedAt);
    return d.getDate() === yesterdayDate.getDate() && d.getMonth() === yesterdayDate.getMonth() && d.getFullYear() === yesterdayDate.getFullYear();
  });
  
  const thisWeek = unpinned.filter(c => {
    const d = new Date(c.updatedAt);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 1 && diffDays <= 7;
  });
  
  const older = unpinned.filter(c => {
    const d = new Date(c.updatedAt);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 7;
  });

  const renderGroup = (title: string, items: AIConversation[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="px-4 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
        <div className="space-y-1 px-2">
          {items.map(conv => (
            <div 
              key={conv.id}
              className={`relative group flex items-center w-full p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                activeId === conv.id 
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 shadow-sm' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className={`w-4 h-4 mr-3 flex-shrink-0 ${activeId === conv.id ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
              <div className="flex-1 truncate text-sm font-medium">
                {conv.title || 'New Conversation'}
              </div>
              {conv.pinned && <Pin className="w-3 h-3 ml-2 text-purple-500 opacity-70" />}
              
              <button 
                className="opacity-0 group-hover:opacity-100 p-1 ml-1 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                }}
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              <AnimatePresence>
                {menuOpenId === conv.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-8 top-8 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 overflow-hidden"
                    onMouseLeave={() => setMenuOpenId(null)}
                  >
                    <button 
                      className="w-full text-left px-4 py-2 text-xs flex items-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={(e) => { e.stopPropagation(); onPin(conv.id); setMenuOpenId(null); }}
                    >
                      <Pin className="w-3.5 h-3.5 mr-2" /> {conv.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 text-xs flex items-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const newTitle = prompt('Enter new title:', conv.title);
                        if (newTitle) onRename(conv.id, newTitle);
                        setMenuOpenId(null); 
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                    <button 
                      className="w-full text-left px-4 py-2 text-xs flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => { e.stopPropagation(); onDelete(conv.id); setMenuOpenId(null); }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-72 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-r border-gray-200/50 dark:border-gray-800/50 z-50 flex flex-col shadow-2xl md:relative md:shadow-none"
      >
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Chats
          </h2>
          <button onClick={onClose} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4">
          <button 
            onClick={onNew}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>

          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100/80 dark:bg-gray-800/80 border border-transparent focus:border-purple-300 dark:focus:border-purple-700 rounded-xl text-sm focus:ring-4 focus:ring-purple-500/10 text-gray-900 dark:text-gray-100 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
          <style dangerouslySetInnerHTML={{__html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
          `}} />
          
          {conversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 opacity-40 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin exploring!</p>
              </div>
            </div>
          ) : (
            <>
              {renderGroup('Pinned', pinned)}
              {renderGroup('Today', today)}
              {renderGroup('Yesterday', yesterday)}
              {renderGroup('This Week', thisWeek)}
              {renderGroup('Older', older)}
            </>
          )}
        </div>
      </motion.div>
      
      {/* Mobile Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />
    </>
  );
};
