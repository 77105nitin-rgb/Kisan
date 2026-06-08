import { createClient } from "@supabase/supabase-js";

// Retrieve key/url from either env variables or local storage for interactive testing
export function getSupabaseUrl(): string {
  const localUrl = localStorage.getItem("VITE_SUPABASE_URL");
  return localUrl || import.meta.env.VITE_SUPABASE_URL || "https://zxirdlcuejjufsfxhmtq.supabase.co";
}

export function getSupabaseAnonKey(): string {
  const localKey = localStorage.getItem("VITE_SUPABASE_ANON_KEY");
  return localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
}

// Check if a real key has been entered (either via .env or specified in browser settings)
export function isSupabaseConfigured(): boolean {
  const key = getSupabaseAnonKey();
  return typeof key === "string" && key.trim().length > 10 && !key.includes("dummy");
}

// Return a client instance based on current settings
export function getSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey() || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_startup_compatibility";
  return createClient(url, key);
}

// Default export of standard client for quick imports
export const supabase = getSupabaseClient();

/**
 * Sync the authenticated user's profile to the Supabase profiles table.
 */
export async function syncProfileToSupabase(profile: {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  language: string;
  role: string;
}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("profiles")
      .upsert({
        id: profile.uid,
        name: profile.name,
        email: profile.email || `${profile.uid}@example.com`,
        phone: profile.phone || "",
        language: profile.language || "pa",
        role: profile.role || "farmer",
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) {
      console.warn("Supabase profile sync warning:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e: any) {
    console.warn("Supabase profile sync bypassed:", e.message);
    return { success: false, error: e };
  }
}

/**
 * Sync a crop disease report into public.disease_reports.
 */
export async function syncDiseaseReportToSupabase(report: {
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
}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("disease_reports")
      .insert([{
        id: report.id,
        user_id: report.userId,
        crop_type: report.cropType,
        image_url: report.imageUrl,
        disease_name: report.diseaseName,
        confidence: report.confidence,
        causes: report.causes,
        symptoms: report.symptoms || [],
        prevention: report.prevention,
        treatment: report.treatment,
        created_at: report.createdAt
      }]);

    if (error) {
      console.warn("Supabase disease report insert failed:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e: any) {
    console.warn("Supabase disease report write error:", e.message);
    return { success: false, error: e };
  }
}

/**
 * Sync a soil test analysis to public.soil_reports.
 */
export async function syncSoilReportToSupabase(report: {
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
}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("soil_reports")
      .insert([{
        id: report.id,
        user_id: report.userId,
        crop: report.crop,
        nitrogen: Math.floor(report.nitrogen),
        phosphorus: Math.floor(report.phosphorus),
        potassium: Math.floor(report.potassium),
        soil_type: report.soilType,
        ph: Number(report.ph),
        analysis: report.analysis,
        fertilizer_recommendation: report.fertilizerRecommendation,
        created_at: report.createdAt
      }]);

    if (error) {
      console.warn("Supabase soil report insert failed:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e: any) {
    console.warn("Supabase soil write error:", e.message);
    return { success: false, error: e };
  }
}

/**
 * Sync public pest outbreak report to public.pest_alerts.
 */
export async function syncPestAlertToSupabase(alertItem: {
  id: string;
  userId: string;
  reporterName: string;
  district: string;
  state: string;
  cropType: string;
  pestName: string;
  severity: string;
  description: string;
  createdAt: string;
}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("pest_alerts")
      .insert([{
        id: alertItem.id,
        user_id: alertItem.userId,
        reporter_name: alertItem.reporterName,
        district: alertItem.district,
        state: alertItem.state,
        crop_type: alertItem.cropType,
        pest_name: alertItem.pestName,
        severity: alertItem.severity,
        description: alertItem.description,
        created_at: alertItem.createdAt
      }]);

    if (error) {
      console.warn("Supabase pest alert insert failed:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e: any) {
    console.warn("Supabase pest write error:", e.message);
    return { success: false, error: e };
  }
}

/**
 * Sync AI conversational chat message.
 */
export async function syncChatMessageToSupabase(chatMsg: {
  id: string;
  userId: string;
  message: string;
  sender: "user" | "ai";
  language: string;
  createdAt: string;
}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("chat_messages")
      .insert([{
        id: chatMsg.id,
        user_id: chatMsg.userId,
        message: chatMsg.message,
        sender: chatMsg.sender,
        language: chatMsg.language,
        created_at: chatMsg.createdAt
      }]);

    if (error) {
      console.warn("Supabase chat message insert failed:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e: any) {
    console.warn("Supabase chat message write error:", e.message);
    return { success: false, error: e };
  }
}

/**
 * Sync real-time push advisories notifications.
 */
export async function syncNotificationToSupabase(notif: {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("notifications")
      .insert([{
        id: notif.id,
        user_id: notif.userId,
        title: notif.title,
        body: notif.body,
        type: notif.type,
        read: notif.read,
        created_at: notif.createdAt
      }]);

    if (error) {
      console.warn("Supabase notification insert failed:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e: any) {
    console.warn("Supabase notification write error:", e.message);
    return { success: false, error: e };
  }
}
