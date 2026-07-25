export interface PartnerProfile {
  uid: string;
  businessName: string;
  partnerType: 'boarding' | 'veterinary' | 'grooming' | 'training' | 'walking' | 'taxi' | 'sitting' | 'daycare' | 'hotel' | 'breeding';
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  serviceRadius: number; // in km
  deliveryRadius: number; // in km
  workingHours: {
    [day: string]: { open: string; close: string; isClosed: boolean };
  };
  emergencyAvailability: boolean;
  services: {
    id: string;
    name: string;
    price: number;
    duration: number; // minutes
  }[];
  rating: number;
  reviewCount: number;
  photos: string[];
  documents: {
    license?: string;
    idProof?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  earnings: number;
  createdAt: string;
}
