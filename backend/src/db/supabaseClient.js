const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Default prototype guest user ID for foreign keys
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000000';

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project-id')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    isConfigured = true;
    console.log('[Supabase] Initialized Supabase client with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err.message);
    supabase = null;
    isConfigured = false;
  }
} else {
  console.log('[Supabase] Environment variables (SUPABASE_URL, SUPABASE_KEY) not configured. Gracefully operating with local storage.');
}

module.exports = {
  supabase,
  isConfigured,
  DEFAULT_USER_ID
};
