// Shared by the payment functions. Files starting with "_" are not deployed as their own endpoint.
// Server-only environment variables (Vercel > Settings > Environment Variables):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
//   and VITE_SUPABASE_URL (already set for the site).
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Prices in cents, set here and only here: the browser never decides what it pays.
export const PRICE = { premium: 1499, ultra: 2999 };
export const RANK = { free: 0, premium: 1, ultra: 2 };
export const PLAN_NAME = { premium: 'Premium', ultra: 'Ultimate' };

export const planOf = (user) => (['premium', 'ultra'].includes(user?.app_metadata?.plan) ? user.app_metadata.plan : 'free');

// An upgrade from Premium to Ultimate only pays the difference.
export const amountFor = (plan, current) => PRICE[plan] - (PRICE[current] || 0);

let stripe;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  return (stripe ||= new Stripe(process.env.STRIPE_SECRET_KEY));
}

let admin;
export function supabaseAdmin() {
  // The repo .env only reaches the build, not the functions, so the public project URL is the fallback.
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pajjpqegqkvwacnzcgtm.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return (admin ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
