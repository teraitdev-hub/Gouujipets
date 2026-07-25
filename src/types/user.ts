export type UserRole = 'customer' | 'partner' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  phone?: string;
  email: string;
  photo?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  emergencyContact?: string;
  alternateNumber?: string;
  referralCode?: string;
  walletBalance: number;
  rewardPoints: number;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  language: string;
  timezone: string;
  createdDate: string;
  lastLogin: string;
  loginMethod: 'email' | 'google' | 'phone';
  role: UserRole;
  isActive: boolean;
}
