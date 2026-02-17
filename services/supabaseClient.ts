
import { createClient } from '@supabase/supabase-js';

// Project Configuration
// These are the specific credentials for the Project Master environment
const SUPABASE_URL = "https://mdbbylxfglgzvftcsdvr.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_k2QaVRbmfnXHk5jtJdjkRw_7mow58Y-";

// Initialize the Supabase Client
// This instance will be shared across the application for Auth, Database, and Realtime interactions.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
