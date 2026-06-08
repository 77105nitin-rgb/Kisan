export type LanguageCode = "en" | "hi" | "pa";

export type UserRole = "farmer" | "officer" | "admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  language: LanguageCode;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface DiseaseReport {
  id: string;
  userId: string;
  cropType: string;
  imageUrl: string;
  diseaseName: string;
  confidence: number;
  causes: string;
  symptoms: string[];
  prevention: string;
  treatment: string;
  createdAt: string;
}

export interface SoilReport {
  id: string;
  userId: string;
  crop: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilType: string;
  ph: number;
  analysis: string;
  fertilizerRecommendation: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  sender: "user" | "ai";
  language: LanguageCode;
  createdAt: string;
}

export interface PestAlert {
  id: string;
  userId: string;
  reporterName: string;
  district: string;
  state: string;
  cropType: string;
  pestName: string;
  severity: "low" | "medium" | "high";
  description: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "weather" | "disease" | "mandi" | "alert" | "scheme";
  read: boolean;
  createdAt: string;
}

export interface MandiRecord {
  id: string;
  cropName: string;
  market: string;
  state: string;
  price: number;
  minPrice: number;
  maxPrice: number;
  trend: "up" | "down" | "stable";
  date: string;
  category?: "vegetables" | "fruits" | "dry_fruits" | "cereals" | "pulses" | "oilseeds" | "spices" | "other";
  changePercent?: number;
}

export interface SchemeInfo {
  id: string;
  title: string;
  benefit: string;
  eligibility: string;
  documents: string;
  url: string;
}
