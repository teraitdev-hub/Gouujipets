// ============================================================
// Goujji AI — TypeScript Interfaces
// ============================================================

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    toolCalls?: AIToolCall[];
    toolResults?: AIToolResult[];
    imageUrl?: string;
    voiceTranscript?: boolean;
    language?: string;
    streaming?: boolean;
  };
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  summary?: string;
}

export interface AIMemory {
  id?: string;
  userId: string;
  category: 'pet' | 'preference' | 'health' | 'booking' | 'address' | 'emergency' | 'general' | 'user_info' | 'pet_info';
  key: string;
  value: string;
  source: 'conversation' | 'system' | 'manual' | 'user_message';
  createdAt: string | Date;
  updatedAt: string | Date;
  confidence?: number;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AIToolCall {
  id?: string;
  name?: string;
  function?: {
    name: string;
    arguments: string;
  };
  arguments?: Record<string, any>;
}

export interface AIToolResult {
  toolCallId?: string;
  toolName: string;
  name?: string;
  success: boolean;
  data?: any;
  error?: string;
  displayMessage?: string;
}

export interface GoujjiAIConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useLocalEngine?: boolean;
}

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  isComplete: boolean;
}

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  language: string;
  isSpeaking: boolean;
}

export type UserRole = 'customer' | 'partner' | 'superadmin' | 'admin' | 'guest';

export interface AIContext {
  userRole: UserRole;
  userName?: string;
  userId?: string;
  user?: any; // To allow the full user object
  currentView?: string;
  recentActivities?: any[];
  pets?: Array<{
    id: string;
    name: string;
    species: string;
    breed?: string;
    age?: number;
    weight?: number;
  }>;
  recentBookings?: Array<{
    id: string;
    businessName: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
  }>;
  memories?: AIMemory[];
}

// Vision Analysis Types
export type ImageAnalysisType = 'pet_photo' | 'document' | 'general' | 'auto';

export interface PetHealthIssue {
  severity: 'low' | 'medium' | 'high';
  condition: string;
  description: string;
  recommendation: string;
}

export interface PetVisionAnalysis {
  detectedSpecies: string;
  detectedBreed: string;
  breedConfidence: number;
  estimatedAgeRange: string;
  physicalTraits: string[];
  healthAssessment: {
    overallStatus: 'healthy' | 'attention_needed' | 'concern_detected';
    summary: string;
    potentialIssues: PetHealthIssue[];
    careRecommendations: string[];
  };
}

export interface DocumentVisionAnalysis {
  documentType: 'vaccination_record' | 'vet_invoice' | 'lab_report' | 'prescription' | 'general_document';
  title: string;
  summary: string;
  extractedInfo: {
    petName?: string;
    ownerName?: string;
    vetClinic?: string;
    date?: string;
    dueDate?: string;
    vaccinesOrTreatments?: string[];
    medications?: Array<{ name: string; dosage: string; frequency: string }>;
    totalAmount?: string;
  };
  keyActionItems: string[];
}

export interface VisionAnalysisResult {
  id: string;
  analysisType: 'pet' | 'document';
  confidence: number;
  summary: string;
  timestamp: string;
  petAnalysis?: PetVisionAnalysis;
  documentAnalysis?: DocumentVisionAnalysis;
  rawTags: string[];
  imageUrl?: string;
}

// Smart Notification & Reminder Types (Phase 4)
export type NotificationType =
  | 'booking_reminder'
  | 'vaccination_due'
  | 'post_booking'
  | 'medication'
  | 'ai_insight';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 'active' | 'snoozed' | 'completed';

export interface SmartNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  petName?: string;
  petAvatar?: string;
  dueDate?: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  snoozedUntil?: string;
  createdAt: string;
  aiActionPrompt: string;
  isRead?: boolean;
  metadata?: {
    bookingId?: string;
    location?: string;
    doctor?: string;
    serviceName?: string;
    suggestedActions?: string[];
  };
}

export const __IS_AI_TYPES = true;

// GPS & Health Tracker Wearable Types (Phase 5)
export type ActivityType = 'Sleeping' | 'Walking' | 'Running' | 'Playful' | 'Resting';

export interface PetVitalsData {
  heartRate: number;
  temperatureF: number;
  temperatureC: number;
  activityLevel: ActivityType;
  batteryLevel: number;
  signalStrength: number;
  stepsCount: number;
  caloriesBurned: number;
  distanceKm: number;
  speedKmh: number;
  timestamp: string;
}

export interface PetGPSLocation {
  id: string;
  petId: string;
  petName: string;
  species: string;
  breed: string;
  avatarUrl?: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  isInsideGeofence: boolean;
  geofenceName: string;
  geofenceRadiusMeters: number;
  distanceFromHomeMeters: number;
  collarId: string;
  vitals: PetVitalsData;
}



