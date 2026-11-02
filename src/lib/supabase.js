import { createClient } from '@supabase/supabase-js';

// The same Supabase project as the app (unlag/supabase.config.json), public URL and
// publishable key only. Same check as readConfig() in the app: https, never a secret key.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function valid() {
  try { return Boolean(url && key) && new URL(url).protocol === 'https:' && !key.startsWith('sb_secret_'); }
  catch { return false; }
}

export const supabaseReady = valid();

// A second client that never stores a session: checks a password without replacing the one in use.
export function scratchClient() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export const supabase = supabaseReady
  ? createClient(url, key, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
      global: {
        // Same 20 s limit as the app, so a stuck request never leaves a page spinning.
        fetch: (input, options = {}) => fetch(input, {
          ...options,
          signal: options.signal && AbortSignal.any ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : options.signal || AbortSignal.timeout(20000),
        }),
      },
    })
  : null;
