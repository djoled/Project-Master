
import { createClient } from '@supabase/supabase-js';

// Project Configuration using user-provided credentials
const SUPABASE_URL = "https://mdbbylxfglgzvftcsdvr.supabase.co";
const SUPABASE_PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYmJ5bHhmZ2xnenZmdGNzZHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzA4ODQsImV4cCI6MjA4Njc0Njg4NH0.p3OPQEmCXcdF3giT2gy2ZTCfP1DBRwTdU1gn9dkEvGo";

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
