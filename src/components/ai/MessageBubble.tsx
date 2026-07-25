import React from 'react';
import { motion } from 'framer-motion';
import { User, CheckCircle, FileText } from 'lucide-react';
import type {  AIMessage  }   from '../../types/ai';

interface MessageBubbleProps {
  message: AIMessage;
  isLatest?: boolean;
  isDark?: boolean;
}

const parseMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-3 rounded-md my-2 overflow-x-auto text-xs sm:text-sm"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-pink-600 dark:text-pink-400">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    .replace(/- (.*)/g, '<li class="ml-4 list-disc marker:text-purple-500">$1</li>')
    .replace(/\d+\. (.*)/g, '<li class="ml-4 list-decimal marker:text-purple-500">$1</li>')
    .replace(/\n/g, '<br />');
  
  return html;
};

const formatTime = (date?: Date | number | string) => {
  if (!date) return 'just now';
  const now = new Date();
  const msgDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - msgDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLatest }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3 w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-white dark:from-purple-900/50 dark:to-gray-800 flex items-center justify-center border border-purple-200 dark:border-purple-800 shadow-sm z-10 self-end mb-5">
          <span className="text-sm">🐾</span>
        </div>
      )}
      
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`px-4 py-3 rounded-2xl shadow-sm relative backdrop-blur-xl ${
            isUser 
              ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-br-sm' 
              : 'bg-white/80 border border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-gray-800 rounded-bl-sm dark:bg-gray-800/80 dark:border-gray-700/50 dark:text-gray-100 dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)]'
          }`}
        >
          {message.metadata?.streaming ? (
            <div className="flex space-x-1.5 h-6 items-center px-2">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
              <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
              <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
            </div>
          ) : (
            <>
              {message.content && (
                <div 
                  className={`prose prose-sm max-w-none break-words [&>br]:mb-1 [&>li]:my-0.5 [&>p]:my-1 ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`} 
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                />
              )}
              
              {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.metadata.toolCalls.map((tool: any, idx: number) => (
                    <div key={idx} className="mt-3 bg-white/50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 backdrop-blur-md">
                      <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                        <span>Action: {tool.name}</span>
                      </div>
                      <pre className="text-[11px] overflow-x-auto p-2.5 bg-gray-100/50 dark:bg-gray-800/80 rounded-lg text-gray-600 dark:text-gray-400 font-mono">
                        {JSON.stringify(tool.arguments, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              
              {message.metadata?.toolResults && message.metadata.toolResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.metadata.toolResults.map((result: any, idx: number) => (
                    <div key={idx} className="mt-3 bg-green-50/80 dark:bg-green-900/20 rounded-xl p-3 border border-green-100/50 dark:border-green-800/30 backdrop-blur-md">
                      <div className="flex items-center text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        <span>Completed: {result.toolName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <span className={`text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 ml-3 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm z-10 self-end mb-5">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  );
};
