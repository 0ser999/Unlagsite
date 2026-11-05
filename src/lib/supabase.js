import { createClient } from '@supabase/supabase-js';
import { onUnlag } from './host.js';

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

// On unlag.pro the session is kept in cookies for .unlag.pro, so www and dashboard share one
// sign-in. Values are URL-encoded and split in chunks under the 4 KB cookie limit.
const CHUNK = 3000;
const YEAR = 60 * 60 * 24 * 365;
function readCookie(name) {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit === undefined ? null : hit.slice(name.length + 1);
}
function writeCookie(name, value, maxAge) {
  document.cookie = `${name}=${value}; Domain=.unlag.pro; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
}
const cookieStorage = {
  getItem(key) {
    const count = Number(readCookie(`${key}.n`));
    if (!count) return null;
    let raw = '';
    for (let i = 0; i < count; i += 1) {
      const part = readCookie(`${key}.${i}`);
      if (part === null) return null;
      raw += part;
    }
    try { return decodeURIComponent(raw); } catch { return null; }
  },
  setItem(key, value) {
    cookieStorage.removeItem(key);
    const raw = encodeURIComponent(value);
    const parts = raw.match(new RegExp(`.{1,${CHUNK}}`, 'g')) || [''];
    parts.forEach((part, i) => writeCookie(`${key}.${i}`, part, YEAR));
    writeCookie(`${key}.n`, String(parts.length), YEAR);
  },
  removeItem(key) {
    const count = Number(readCookie(`${key}.n`)) || 0;
    for (let i = 0; i < count; i += 1) writeCookie(`${key}.${i}`, '', 0);
    writeCookie(`${key}.n`, '', 0);
  },
};

// Sessions saved before the move to cookies sit in this origin's localStorage: move them over once.
if (onUnlag) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('sb-')) continue;
      if (cookieStorage.getItem(key) === null) cookieStorage.setItem(key, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
  } catch { /* storage blocked: nothing to move */ }
}

export const supabase = supabaseReady
  ? createClient(url, key, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, ...(onUnlag && { storage: cookieStorage }) },
      global: {
        // Same 20 s limit as the app, so a stuck request never leaves a page spinning.
        fetch: (input, options = {}) => fetch(input, {
          ...options,
          signal: options.signal && AbortSignal.any ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : options.signal || AbortSignal.timeout(20000),
        }),
      },
    })
  : null;
