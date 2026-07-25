import type { SmartNotification, NotificationType, NotificationPriority } from '../../types/ai';

const NOTIFICATIONS_STORAGE_KEY = 'goujji_ai_smart_notifications_v2';

export const INITIAL_MOCK_NOTIFICATIONS: SmartNotification[] = [];

/** Notification Service for storage and state management */
export class NotificationService {
  /** Get all smart notifications from storage or initial mocks */
  static getNotifications(): SmartNotification[] {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load notifications from localStorage:', e);
    }
    this.saveNotifications(INITIAL_MOCK_NOTIFICATIONS);
    return INITIAL_MOCK_NOTIFICATIONS;
  }

  /** Save notifications to storage */
  static saveNotifications(notifications: SmartNotification[]): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications to localStorage:', e);
    }
  }

  /** Mark a notification as read */
  static markAsRead(id: string): SmartNotification[] {
    const list = this.getNotifications().map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.saveNotifications(list);
    return list;
  }

  /** Mark all as read */
  static markAllAsRead(): SmartNotification[] {
    const list = this.getNotifications().map(n => ({ ...n, isRead: true }));
    this.saveNotifications(list);
    return list;
  }

  /** Mark a notification as completed */
  static markAsDone(id: string): SmartNotification[] {
    const list = this.getNotifications().map(n =>
      n.id === id ? { ...n, status: 'completed' as const, isRead: true } : n
    );
    this.saveNotifications(list);
    return list;
  }

  /** Snooze a notification */
  static snoozeNotification(id: string, hours: number = 24): SmartNotification[] {
    const snoozeTime = new Date(Date.now() + hours * 3600000);
    const snoozeLabel = hours >= 24
      ? `Snoozed until ${snoozeTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
      : `Snoozed for ${hours}h`;

    const list = this.getNotifications().map(n =>
      n.id === id
        ? {
            ...n,
            status: 'snoozed' as const,
            snoozedUntil: snoozeLabel,
            isRead: true,
          }
        : n
    );
    this.saveNotifications(list);
    return list;
  }

  /** Un-snooze a notification */
  static unsnoozeNotification(id: string): SmartNotification[] {
    const list = this.getNotifications().map(n =>
      n.id === id
        ? {
            ...n,
            status: 'active' as const,
            snoozedUntil: undefined,
          }
        : n
    );
    this.saveNotifications(list);
    return list;
  }

  /** Add a new custom AI-generated reminder */
  static addReminder(
    title: string,
    description: string,
    type: NotificationType = 'ai_insight',
    petName: string = 'Pet',
    priority: NotificationPriority = 'medium',
    dueDate: string = 'Today'
  ): SmartNotification[] {
    const newNotif: SmartNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      description,
      petName,
      petAvatar: '🐾',
      dueDate,
      priority,
      status: 'active',
      isRead: false,
      createdAt: new Date().toISOString(),
      aiActionPrompt: `Tell me more details and advice regarding: "${title} - ${description}"`,
    };
    const list = [newNotif, ...this.getNotifications()];
    this.saveNotifications(list);
    return list;
  }

  /** Reset to default mock data */
  static resetToMocks(): SmartNotification[] {
    this.saveNotifications(INITIAL_MOCK_NOTIFICATIONS);
    return INITIAL_MOCK_NOTIFICATIONS;
  }
}
