import { createClient } from '@supabase/supabase-js';

// Project Configuration
// Uses environment variables if available (Vite standard), falls back to provided keys for Demo/MVP reliability.
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://mdbbylxfglgzvftcsdvr.supabase.co";
const SUPABASE_PUBLIC_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_k2QaVRbmfnXHk5jtJdjkRw_7mow58Y-";

// Initialize the Supabase Client
// This instance will be shared across the application for Auth, Database, and Realtime interactions.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});