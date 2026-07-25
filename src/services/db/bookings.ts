import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Booking } from "../../types/booking";

// Generate a random ID for booking if not provided by Firestore automatically
export const createBooking = async (bookingId: string, data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  const docRef = doc(db, "bookings", bookingId);
  await setDoc(docRef, {
    ...data,
    id: bookingId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<void> => {
  const docRef = doc(db, "bookings", bookingId);
  await updateDoc(docRef, { 
    status,
    updatedAt: new Date().toISOString()
  });
};

export const getCustomerBookings = async (customerId: string): Promise<Booking[]> => {
  const q = query(collection(db, "bookings"), where("customerId", "==", customerId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  const bookings: Booking[] = [];
  querySnapshot.forEach((doc) => {
    bookings.push(doc.data() as Booking);
  });
  return bookings;
};

export const getPartnerBookings = async (partnerId: string): Promise<Booking[]> => {
  const q = query(collection(db, "bookings"), where("partnerId", "==", partnerId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  const bookings: Booking[] = [];
  querySnapshot.forEach((doc) => {
    bookings.push(doc.data() as Booking);
  });
  return bookings;
};
