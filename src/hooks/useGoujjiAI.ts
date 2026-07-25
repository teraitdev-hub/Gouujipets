import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { AIMessage, AIConversation, AIContext, StreamingState } from '../types/ai';

const GUEST_MESSAGE_LIMIT = 5;
const GUEST_KEY = 'goujji_ai_guest_count';

/** Main hook for Goujji AI state management */
export const useGoujjiAI = () => {
  const { user, isAuthenticated } = useAuthStore();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState<StreamingState>({ isStreaming: false, currentText: '', isComplete: false });
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Services loaded lazily to avoid circular deps
  const servicesRef = useRef<any>(null);
  const loadServices = useCallback(async () => {
    if (!servicesRef.current) {
      const [openaiMod, memoryMod, toolMod, promptMod] = await Promise.all([
        import('../services/ai/openaiService'),
        import('../services/ai/memoryService'),
        import('../services/ai/toolService'),
        import('../services/ai/promptService'),
      ]);
      servicesRef.current = {
        engine: openaiMod.goujjiAI,
        memory: memoryMod,
        tools: toolMod,
        prompt: promptMod,
      };
    }
    return servicesRef.current;
  }, []);

  // Load guest message count
  useEffect(() => {
    if (!isAuthenticated) {
      const count = parseInt(localStorage.getItem(GUEST_KEY) || '0', 10);
      setGuestMessageCount(count);
    }
  }, [isAuthenticated]);

  // Load conversations for logged-in users
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const svc = await loadServices();
        const convs = await svc.memory.getConversations(user.id);
        if (!cancelled) setConversations(convs);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id, loadServices]);

  /** Build AI context from current user state */
  const buildContext = useCallback(async (): Promise<AIContext> => {
    const ctx: AIContext = {
      userRole: (user?.role as any) || 'guest',
      userName: user?.full_name?.split(' ')[0] || undefined,
      userId: user?.id || undefined,
      pets: [],
      recentBookings: [],
      memories: [],
      currentView: window.location.pathname,
    };

    if (isAuthenticated && user?.id) {
      try {
        const svc = await loadServices();
        const memories = await svc.memory.getMemories(user.id);
        ctx.memories = memories;
      } catch {}
    }

    return ctx;
  }, [user, isAuthenticated, loadServices]);

  /** Start a new conversation */
  const newConversation = useCallback(() => {
    const id = `conv-${Date.now()}`;
    const greeting: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Hi ${user?.full_name?.split(' ')[0] || 'there'}! 🐾 I'm **Goujji AI**, your personal pet care assistant. I can help you with bookings, health advice, diet recommendations, grooming tips, and so much more!\n\nHow can I help you today?`,
      timestamp: new Date().toISOString(),
    };
    setMessages([greeting]);
    setActiveConversationId(id);
    setShowHistory(false);
  }, [user]);

  /** Open chat — start new conversation if none active */
  const openChat = useCallback(() => {
    setIsOpen(true);
    if (!activeConversationId || messages.length === 0) {
      newConversation();
    }
  }, [activeConversationId, messages.length, newConversation]);

  /** Select an existing conversation */
  const selectConversation = useCallback((conv: AIConversation) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setShowHistory(false);
  }, []);

  /** Send a message */
  const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
    if (!text.trim() && !imageUrl) return;

    // Guest limit check
    if (!isAuthenticated) {
      if (guestMessageCount >= GUEST_MESSAGE_LIMIT) {
        const limitMsg: AIMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: '🔒 You\'ve used all 5 free messages! Please **log in** to continue our conversation with personalized pet care assistance, booking help, and much more.\n\nYour data will be saved and synced across devices!',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, limitMsg]);
        return;
      }
      setGuestMessageCount(prev => {
        const next = prev + 1;
        localStorage.setItem(GUEST_KEY, String(next));
        return next;
      });
    }

    // Add user message
    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      metadata: imageUrl ? { imageUrl } : undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    // Show typing state
    setIsLoading(true);
    setStreaming({ isStreaming: true, currentText: '', isComplete: false });

    try {
      const svc = await loadServices();
      const context = await buildContext();

      // Check for tool calls
      const toolCalls = svc.engine.detectToolCalls(text);
      let toolResultText = '';

      if (toolCalls.length > 0 && user?.id) {
        for (const call of toolCalls) {
          try {
            const result = await svc.tools.executeTool(call, user.id);
            toolResultText += svc.tools.formatToolResult(result) + '\n\n';
          } catch (err) {
            console.error('Tool execution failed:', err);
          }
        }
      }

      // Get AI response with streaming
      const allMessages = [...messages, userMsg];
      let fullResponse = '';

      await svc.engine.streamChat(allMessages, context, (chunk: string) => {
        fullResponse = chunk;
        setStreaming({ isStreaming: true, currentText: chunk, isComplete: false });
      });

      // Append tool results if any
      if (toolResultText) {
        fullResponse = toolResultText + fullResponse;
      }

      const botMsg: AIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString(),
        metadata: toolCalls.length > 0 ? { toolCalls } : undefined,
      };

      setMessages(prev => [...prev, botMsg]);

      // Save conversation for logged-in users
      if (isAuthenticated && user?.id && activeConversationId) {
        const updatedMessages = [...allMessages, botMsg];
        const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
        try {
          // Check if conversation exists
          const existing = conversations.find(c => c.id === activeConversationId);
          if (existing) {
            await svc.memory.updateConversation(activeConversationId, {
              messages: updatedMessages,
              updatedAt: new Date().toISOString(),
            });
          } else {
            await svc.memory.saveConversation({
              userId: user.id,
              title,
              messages: updatedMessages,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          // Extract and save memories
          const newMemories = svc.memory.extractMemories(text, context);
          for (const mem of newMemories) {
            await svc.memory.saveMemory(mem);
          }

          // Refresh conversations list
          const convs = await svc.memory.getConversations(user.id);
          setConversations(convs);
        } catch (err) {
          console.error('Failed to save conversation:', err);
        }
      }
    } catch (err) {
      console.error('AI response failed:', err);
      const errorMsg: AIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request. Please try again! 🙏\n\n**Debug Info:** ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreaming({ isStreaming: false, currentText: '', isComplete: true });
    }
  }, [isAuthenticated, guestMessageCount, messages, user, activeConversationId, conversations, buildContext, loadServices]);

  /** Delete conversation */
  const deleteConversation = useCallback(async (id: string) => {
    try {
      const svc = await loadServices();
      await svc.memory.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        newConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeConversationId, newConversation, loadServices]);

  /** Rename conversation */
  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const svc = await loadServices();
      await svc.memory.updateConversation(id, { title });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  }, [loadServices]);

  /** Pin/unpin conversation */
  const pinConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    try {
      const svc = await loadServices();
      const pinned = !conv.pinned;
      await svc.memory.updateConversation(id, { pinned });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned } : c));
    } catch (err) {
      console.error('Failed to pin conversation:', err);
    }
  }, [conversations, loadServices]);

  return {
    // State
    messages,
    conversations,
    activeConversationId,
    isLoading,
    streaming,
    isOpen,
    showHistory,
    searchQuery,
    guestMessageCount,
    guestLimit: GUEST_MESSAGE_LIMIT,
    isAuthenticated,
    userRole: (user?.role as any) || 'guest',
    userName: user?.full_name?.split(' ')[0] || '',

    // Actions
    setIsOpen,
    openChat,
    setShowHistory,
    setSearchQuery,
    sendMessage,
    newConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    pinConversation,
  };
};
