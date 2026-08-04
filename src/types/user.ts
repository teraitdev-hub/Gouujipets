export type UserRole = 'customer' | 'partner' | 'admin';

export interface UserLocation {
  latitude: number;
  longitude: number;
  place_id?: string;
  formatted_address: string;
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  accuracy?: number;
  timestamp?: string;
}

export interface SavedAddress {
  id: string;
  label: 'home' | 'work' | 'other';
  title: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  formatted_address: string;
  area?: string;
  city?: string;
  pincode?: string;
  isDefault: boolean;
  createdAt: string;
}

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
  location?: UserLocation;
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
