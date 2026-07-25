import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Sparkles,
  Calendar,
  Syringe,
  CheckCircle2,
  Clock,
  MessageSquare,
  X,
  Plus,
  RefreshCw,
  Search,
  Check,
  ShieldAlert,
  Volume2,
  VolumeX,
  Brain,
  ChevronRight,
  Filter,
  Trash2,
  Zap,
  Info,
  ChevronDown,
  RotateCcw,
  Sparkle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SmartNotification, NotificationType, NotificationPriority } from '../../types/ai';
import { NotificationService, INITIAL_MOCK_NOTIFICATIONS } from '../../services/ai/notificationService';

export interface SmartNotificationsProps {
  /** Mode: 'dropdown' popover, 'sidebar' panel, or 'embedded' card */
  mode?: 'dropdown' | 'sidebar' | 'embedded';
  /** External control for open/closed state (optional) */
  isOpen?: boolean;
  /** Callback when panel closes */
  onClose?: () => void;
  /** Callback when user clicks "Ask Goujji AI about this" */
  onAskAI?: (prompt: string, notification?: SmartNotification) => void;
  /** Role of current user */
  userRole?: string;
  /** Name of current user */
  userName?: string;
  /** Additional container classes */
  className?: string;
}

export const SmartNotifications: React.FC<SmartNotificationsProps> = ({
  mode = 'dropdown',
  isOpen: externalIsOpen,
  onClose,
  onAskAI,
  userRole = 'customer',
  userName = 'Pet Parent',
  className = '',
}) => {
  // Local state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snoozeMenuId, setSnoozeMenuId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPet, setNewPet] = useState('Bella');
  const [newType, setNewType] = useState<NotificationType>('booking_reminder');
  const [newPriority, setNewPriority] = useState<NotificationPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('Tomorrow 10:00 AM');

  // Sync open state between prop and internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const toggleOpen = () => {
    if (externalIsOpen !== undefined) {
      if (isOpen && onClose) onClose();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  // Load initial notifications
  useEffect(() => {
    const data = NotificationService.getNotifications();
    setNotifications(data);
  }, []);

  // Compute Unread / Active Count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead && n.status === 'active').length;
  }, [notifications]);

  const activeCount = useMemo(() => {
    return notifications.filter(n => n.status === 'active').length;
  }, [notifications]);

  // AI Daily Briefing sentence
  const aiBriefingText = useMemo(() => {
    const bookingNotifs = notifications.filter(n => n.type === 'booking_reminder' && n.status === 'active');
    const vaccineNotifs = notifications.filter(n => n.type === 'vaccination_due' && n.status === 'active');
    const postNotifs = notifications.filter(n => n.type === 'post_booking' && n.status === 'active');
    const insightNotifs = notifications.filter(n => n.type === 'ai_insight' && n.status === 'active');

    const parts: string[] = [];
    if (bookingNotifs.length > 0) parts.push(`${bookingNotifs.length} upcoming booking schedule${bookingNotifs.length > 1 ? 's' : ''}`);
    if (vaccineNotifs.length > 0) parts.push(`${vaccineNotifs.length} vaccine due date${vaccineNotifs.length > 1 ? 's' : ''}`);
    if (postNotifs.length > 0) parts.push(`${postNotifs.length} post-stay check-in`);
    if (insightNotifs.length > 0) parts.push(`${insightNotifs.length} weather & care insight`);

    if (parts.length === 0) return `Good day, ${userName}! All pet reminders are up to date and your schedule is clear! 🐾`;
    return `Good day, ${userName}! Goujji AI detected ${parts.join(', ')} needing your attention today.`;
  }, [notifications, userName]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      if (activeTab === 'all' && n.status === 'completed') return false;
      if (activeTab === 'snoozed' && n.status !== 'snoozed') return false;
      if (activeTab === 'completed' && n.status !== 'completed') return false;
      if (activeTab === 'bookings' && (n.type !== 'booking_reminder' || n.status === 'completed')) return false;
      if (activeTab === 'vaccines' && (n.type !== 'vaccination_due' || n.status === 'completed')) return false;
      if (activeTab === 'checkins' && (n.type !== 'post_booking' || n.status === 'completed')) return false;
      if (activeTab === 'insights' && (n.type !== 'ai_insight' || n.status === 'completed')) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesDesc = n.description.toLowerCase().includes(q);
        const matchesPet = n.petName?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesPet;
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // Actions
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = NotificationService.markAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = NotificationService.markAllAsRead();
    setNotifications(updated);
    showToast('All notifications marked as read');
  };

  const handleMarkAsDone = (id: string, title: string) => {
    const updated = NotificationService.markAsDone(id);
    setNotifications(updated);
    showToast(`Completed: "${title}"`);
  };

  const handleSnooze = (id: string, hours: number) => {
    const updated = NotificationService.snoozeNotification(id, hours);
    setNotifications(updated);
    setSnoozeMenuId(null);
    showToast(`Snoozed for ${hours >= 24 ? `${hours / 24} day(s)` : `${hours} hour(s)`}`);
  };

  const handleUnsnooze = (id: string) => {
    const updated = NotificationService.unsnoozeNotification(id);
    setNotifications(updated);
    showToast('Reminder moved back to active list');
  };

  const handleAskAI = (notification: SmartNotification) => {
    handleMarkAsRead(notification.id);
    const prompt = notification.aiActionPrompt || `Tell me more about: ${notification.title}`;
    
    // Call prop if provided
    if (onAskAI) {
      onAskAI(prompt, notification);
    }
    
    // Also dispatch global event for integration
    window.dispatchEvent(
      new CustomEvent('goujji:ask-ai', {
        detail: { prompt, notification },
      })
    );

    showToast('Sent prompt to Goujji AI 🐾');
    if (mode === 'dropdown') {
      if (onClose) onClose();
      else setInternalIsOpen(false);
    }
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const updated = NotificationService.addReminder(
      newTitle.trim(),
      newDesc.trim(),
      newType,
      newPet,
      newPriority,
      newDueDate
    );
    setNotifications(updated);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    showToast('AI Smart Reminder created!');
  };

  const handleResetMocks = () => {
    const reset = NotificationService.resetToMocks();
    setNotifications(reset);
    showToast('Reset to sample notifications');
  };

  // Helper icon for notification type
  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'booking_reminder':
        return {
          icon: Calendar,
          label: 'Booking',
          gradient: 'from-blue-500 to-indigo-600',
          text: 'text-blue-400',
          bg: 'bg-blue-500/10 border-blue-500/30',
        };
      case 'vaccination_due':
        return {
          icon: Syringe,
          label: 'Vaccine',
          gradient: 'from-amber-500 to-orange-600',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
        };
      case 'post_booking':
        return {
          icon: CheckCircle2,
          label: 'Check-in',
          gradient: 'from-emerald-500 to-teal-600',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30',
        };
      case 'medication':
        return {
          icon: Clock,
          label: 'Health & Meds',
          gradient: 'from-purple-500 to-pink-600',
          text: 'text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/30',
        };
      case 'ai_insight':
      default:
        return {
          icon: Sparkles,
          label: 'AI Insight',
          gradient: 'from-purple-600 to-indigo-600',
          text: 'text-purple-300',
          bg: 'bg-purple-500/20 border-purple-500/40',
        };
    }
  };

  // Render Trigger Button for dropdown mode
  const renderTriggerButton = () => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleOpen}
      className="relative p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-xl border border-white/10 text-slate-200 hover:text-white shadow-xl group transition-all"
      aria-label="Smart Notifications"
    >
      <Bell size={20} className={cn("transition-transform group-hover:rotate-12", unreadCount > 0 && "text-purple-400")} />
      
      {/* Sparkle accent */}
      <Sparkles size={10} className="absolute top-2 right-2 text-amber-300 animate-pulse" />

      {/* Unread Ping Counter */}
      {unreadCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-ping opacity-75" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center border border-white/20 shadow-md">
            {unreadCount}
          </span>
        </>
      )}
    </motion.button>
  );

  // Render Inner Panel Content
  const renderPanelContent = () => (
    <div className="flex flex-col h-full bg-slate-950/95 dark:bg-slate-950/95 backdrop-blur-2xl text-slate-100 rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden font-sans">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xl flex items-center justify-between border border-purple-400/40"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-300" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          HEADER BAR
         ========================================== */}
      <div className="p-4 sm:p-5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-purple-400 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Brain size={20} className="text-purple-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Goujji Smart Reminders
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              AI-driven schedule & health insights
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
            title="Create Custom AI Reminder"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add</span>
          </button>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs disabled:opacity-40"
            title="Mark all as read"
          >
            <CheckCircle2 size={16} />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
            title={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
          >
            {soundEnabled ? <Volume2 size={16} className="text-purple-400" /> : <VolumeX size={16} />}
          </button>

          {mode !== 'embedded' && (
            <button
              onClick={toggleOpen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Close panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ==========================================
          AI DAILY BRIEFING GLASS BANNER
         ========================================== */}
      <div className="p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border-b border-purple-500/20 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} className="text-amber-300 animate-spin [animation-duration:6s]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-purple-300 uppercase tracking-wider text-[10px]">
              <span>Goujji AI Intelligence Briefing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-slate-200 leading-relaxed">
              {aiBriefingText}
            </p>
          </div>
        </div>
      </div>

      {/* ==========================================
          SEARCH & FILTER TABS
         ========================================== */}
      <div className="p-3 border-b border-white/5 space-y-2.5 shrink-0 bg-slate-900/50">
        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders by pet name, service, or disease..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
          {[
            { id: 'all', label: `Active (${activeCount})` },
            { id: 'bookings', label: 'Bookings' },
            { id: 'vaccines', label: 'Vaccines' },
            { id: 'checkins', label: 'Check-ins' },
            { id: 'insights', label: 'AI Alert' },
            { id: 'snoozed', label: 'Snoozed' },
            { id: 'completed', label: 'Done' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                activeTab === tab.id
                  ? "bg-purple-600 text-white border-purple-400/50 shadow-md shadow-purple-500/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/10"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          NOTIFICATIONS LIST (SCROLLABLE)
         ========================================== */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center space-y-3"
            >
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-white/10 mx-auto flex items-center justify-center text-slate-500">
                <CheckCircle2 size={28} className="text-emerald-500/60" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-300">No Reminders Found</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {searchQuery ? `No items matching "${searchQuery}"` : "You're all caught up! No active reminders in this category."}
                </p>
              </div>
              <button
                onClick={handleResetMocks}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-400 hover:text-white transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Reload Sample Data</span>
              </button>
            </motion.div>
          ) : (
            filteredNotifications.map((notification) => {
              const badge = getTypeBadge(notification.type);
              const BadgeIcon = badge.icon;

              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, height: 0, transition: { duration: 0.25 } }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-4 transition-all group",
                    notification.status === 'completed'
                      ? "bg-slate-900/40 border-white/5 opacity-60"
                      : notification.status === 'snoozed'
                      ? "bg-slate-900/60 border-amber-500/20"
                      : !notification.isRead
                      ? "bg-slate-900/90 border-purple-500/30 shadow-lg shadow-purple-500/5"
                      : "bg-slate-900/60 border-white/10 hover:border-purple-500/20"
                  )}
                >
                  {/* Priority Indicator Pill */}
                  {notification.priority === 'urgent' && notification.status === 'active' && (
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl bg-rose-500/20 border-l border-b border-rose-500/40 text-[10px] font-extrabold text-rose-400 flex items-center gap-1">
                      <ShieldAlert size={10} />
                      <span>URGENT</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Pet Avatar / Type Icon */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-lg shadow-inner">
                        {notification.petAvatar || '🐾'}
                      </div>
                      <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-slate-950 shadow-md", badge.gradient)}>
                        <BadgeIcon size={10} className="text-white" />
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap pr-16">
                        <span className={cn("px-2 py-0.5 text-[10px] font-extrabold rounded-md border", badge.bg, badge.text)}>
                          {badge.label}
                        </span>
                        {notification.petName && (
                          <span className="text-[11px] font-semibold text-purple-300">
                            • {notification.petName}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400">
                          • {notification.dueDate}
                        </span>
                      </div>

                      <h3 className={cn("text-sm font-bold tracking-tight text-white leading-snug", notification.status === 'completed' && "line-through text-slate-400")}>
                        {notification.title}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {notification.description}
                      </p>

                      {/* Snoozed Label if applicable */}
                      {notification.status === 'snoozed' && notification.snoozedUntil && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium pt-1">
                          <Clock size={12} />
                          <span>{notification.snoozedUntil}</span>
                          <button
                            onClick={() => handleUnsnooze(notification.id)}
                            className="ml-2 underline text-slate-400 hover:text-white text-[10px]"
                          >
                            Un-snooze
                          </button>
                        </div>
                      )}

                      {/* Suggested Action Metadata Pills */}
                      {notification.metadata?.suggestedActions && notification.status === 'active' && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {notification.metadata.suggestedActions.map((action, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-950/70 border border-white/10 text-[10px] text-slate-400 font-medium">
                              {action}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ==========================================
                          ACTION BUTTONS: SNOOZE / DONE / ASK AI
                         ========================================== */}
                      <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-white/5">
                        
                        {/* Ask Goujji AI About This Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAskAI(notification)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Sparkles size={13} className="text-yellow-300" />
                          <span>Ask Goujji AI</span>
                          <ChevronRight size={12} className="opacity-60" />
                        </motion.button>

                        {/* Right Action Icons: Snooze & Mark as Done */}
                        <div className="flex items-center gap-1.5 relative">
                          
                          {/* Snooze Popover Toggle */}
                          {notification.status === 'active' && (
                            <div className="relative">
                              <button
                                onClick={() => setSnoozeMenuId(snoozeMenuId === notification.id ? null : notification.id)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-white/5 transition-all text-xs flex items-center gap-1"
                                title="Snooze reminder"
                              >
                                <Clock size={14} />
                                <span className="text-[10px] font-semibold hidden sm:inline">Snooze</span>
                              </button>

                              {/* Snooze Menu Dropdown */}
                              <AnimatePresence>
                                {snoozeMenuId === notification.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute right-0 bottom-full mb-2 z-50 w-36 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-1.5 space-y-1 text-xs"
                                  >
                                    <div className="px-2 py-1 text-[10px] font-bold text-amber-400 uppercase border-b border-white/10">
                                      Snooze For:
                                    </div>
                                    <button
                                      onClick={() => handleSnooze(notification.id, 1)}
                                      className="w-full text-left px-2.5 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
                                    >
                                      1 Hour
                                    </button>
                                    <button
                                      onClick={() => handleSnooze(notification.id, 4)}
                                      className="w-full text-left px-2.5 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
                                    >
                                      4 Hours
                                    </button>
                                    <button
                                      onClick={() => handleSnooze(notification.id, 24)}
                                      className="w-full text-left px-2.5 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
                                    >
                                      Tomorrow (24h)
                                    </button>
                                    <button
                                      onClick={() => handleSnooze(notification.id, 72)}
                                      className="w-full text-left px-2.5 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
                                    >
                                      3 Days
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Mark as Done Button */}
                          {notification.status !== 'completed' ? (
                            <button
                              onClick={() => handleMarkAsDone(notification.id, notification.title)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1"
                              title="Mark as done"
                            >
                              <Check size={14} />
                              <span className="text-[10px] font-semibold hidden sm:inline">Done</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl flex items-center gap-1">
                              <Check size={12} /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* ==========================================
          FOOTER / RESET DEFAULT BUTTON
         ========================================== */}
      <div className="p-3 bg-slate-900/80 border-t border-white/10 flex items-center justify-between gap-2 text-xs shrink-0 text-slate-400">
        <span className="flex items-center gap-1.5 text-[11px]">
          <Sparkle size={12} className="text-purple-400" />
          <span>Goujji AI Phase 4 Reminders</span>
        </span>
        <button
          onClick={handleResetMocks}
          className="hover:text-white transition-colors text-[11px] underline"
        >
          Reset Mock Data
        </button>
      </div>

      {/* ==========================================
          ADD CUSTOM REMINDER MODAL
         ========================================== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="w-full max-w-sm bg-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Plus size={18} className="text-purple-400" />
                  <h3 className="font-extrabold text-sm text-white">Create AI Pet Reminder</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Reminder Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Grooming Session or Heartworm Pill"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide context or instructions for Goujji AI..."
                    rows={2}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Pet Name</label>
                    <input
                      type="text"
                      value={newPet}
                      onChange={(e) => setNewPet(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Due Date</label>
                    <input
                      type="text"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as NotificationType)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="booking_reminder">Booking Reminder</option>
                      <option value="vaccination_due">Vaccine Due</option>
                      <option value="post_booking">Post-Stay Check-in</option>
                      <option value="medication">Medication & Care</option>
                      <option value="ai_insight">AI Insight Alert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as NotificationPriority)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25"
                  >
                    Save Reminder
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Embedded Mode Return
  if (mode === 'embedded') {
    return (
      <div className={cn("w-full h-full min-h-[500px]", className)}>
        {renderPanelContent()}
      </div>
    );
  }

  // Sidebar Mode Return
  if (mode === 'sidebar') {
    return (
      <div className={cn("relative", className)}>
        {renderTriggerButton()}

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleOpen}
                className="fixed inset-0 z-[9990] bg-slate-950/50 backdrop-blur-xs"
              />

              {/* Slide-over Sidebar Panel */}
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 bottom-0 z-[9995] w-full max-w-md p-4 sm:p-6"
              >
                {renderPanelContent()}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default Dropdown Mode Return
  return (
    <div className={cn("relative inline-block", className)}>
      {renderTriggerButton()}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-3 z-[9995] w-[380px] sm:w-[440px] h-[600px] max-h-[85vh]"
          >
            {renderPanelContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
