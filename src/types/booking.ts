export interface Booking {
  id: string;
  customerId: string;
  partnerId: string;
  serviceId: string;
  serviceName: string;
  petIds: string[];
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  amount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  pickupAddress?: string;
  dropAddress?: string;
  distance?: number;
  travelTime?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
