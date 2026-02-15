import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in various environments (Vite, Webpack, Node)
const getEnv = (key: string) => {
  // Check for Vite (import.meta.env)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key];
  }
  // Check for standard process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('--------------------------------------------------------------------------------');
  console.error('CRITICAL: Supabase credentials missing.');
  console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your environment.');
  console.error('--------------------------------------------------------------------------------');
}

// Initialize Supabase Client
// We provide placeholders if keys are missing to prevent the app from crashing immediately with "supabaseUrl is required".
// API calls will fail, but the UI will load.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);
