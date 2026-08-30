import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

// Fallback guest UUID helper stored in localStorage
const GUEST_STORAGE_KEY = 'flow_guest_user_id';

export function getFallbackUserId() {
  try {
    let localId = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!localId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        localId = crypto.randomUUID();
      } else {
        localId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
      localStorage.setItem(GUEST_STORAGE_KEY, localId);
    }
    return localId;
  } catch {
    // If localStorage is blocked in private browsing
    return '00000000-0000-0000-0000-000000000000';
  }
}

// Check if credentials are properly configured
const isValidUrl = Boolean(
  supabaseUrl &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id')
);

const isValidKey = Boolean(
  supabaseAnonKey &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const isSupabaseConfigured = isValidUrl && isValidKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
