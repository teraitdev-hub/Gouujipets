import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'update' | 'system';
}

export const sendNotification = async (payload: NotificationPayload) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      read: false,
      created_at: new Date().toISOString()
    });
    console.log(`[EMAIL SIMULATION to User ${payload.userId}] ${payload.title}: ${payload.message}`);
  } catch (err: any) {
    console.warn("Failed to insert notification into DB. Simulating locally.", err.message);
    // Simulate local notification
    console.log(`[EMAIL SIMULATION to User ${payload.userId}] ${payload.title}: ${payload.message}`);
  }
};
