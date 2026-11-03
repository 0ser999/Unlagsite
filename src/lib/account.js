// Same rules as the app (unlag/supabase-client.js and session-monitor.js), so the site and
// the app always agree on who is signed in and which plan they have.
import { supabase, scratchClient } from './supabase.js';
import { passwordProblem } from './password.js';
import { t } from '../i18n/index.jsx';

export const PLAN_NAME = { free: 'Free', premium: 'Premium', ultra: 'Ultimate' };
export const AI_LIMIT = { free: 3, premium: 7, ultra: 20 };
const RANK = { free: 0, premium: 1, ultra: 2 };
export const hasPlan = (info, level) => Boolean(info) && RANK[info.plan] >= RANK[level];

// The error codes that mean the session is gone for good. A network error is not one of them.
export const invalidSession = (error) =>
  ['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt', 'user_not_found', 'user_banned'].includes(error?.code) ||
  error?.name === 'AuthSessionMissingError' || error?.status === 401;

function profilePhoto(user) {
  const social = user.identities?.filter((i) => ['google', 'discord'].includes(i.provider)) || [];
  const metadata = [user.user_metadata, ...social.map((i) => i.identity_data)];
  for (const data of metadata) {
    for (const value of [data?.avatar_url, data?.picture]) {
      if (typeof value !== 'string') continue;
      try {
        const url = new URL(value);
        const allowed = url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com') || ['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname);
        if (url.protocol === 'https:' && !url.username && !url.password && allowed) return url.href;
      } catch { /* initials instead */ }
    }
  }
  return null;
}

// Mirror of userInfo() in the app.
export function userInfo(user) {
  if (!user) return null;
  const providers = user.app_metadata?.providers || user.identities?.map((p) => p.provider) || [];
  const meta = user.user_metadata || {};
  return {
    uid: user.id,
    email: user.email || null,
    photoUrl: profilePhoto(user),
    displayName: meta.display_name || meta.full_name || meta.name || meta.preferred_username || user.email?.split('@')[0] || 'Unlag user',
    emailVerified: Boolean(user.email_confirmed_at),
    providers: [...new Set(providers)],
    createdAt: user.created_at,
    // app_metadata can only be written with the service role, so users cannot raise their own plan.
    plan: ['premium', 'ultra'].includes(user.app_metadata?.plan) ? user.app_metadata.plan : 'free',
    // A paid plan is tied to one PC, claimed by the app through claim_hwid.
    pcLinked: Boolean(user.app_metadata?.hwid),
  };
}


// Mirror of resultError() in the app.
export function errorCode(error) {
  const codes = {
    invalid_credentials: 'auth/invalid-credential', email_not_confirmed: 'auth/email-not-confirmed',
    user_already_exists: 'auth/email-already-in-use', email_exists: 'auth/email-already-in-use',
    weak_password: 'auth/weak-password', same_password: 'auth/same-password',
    over_request_rate_limit: 'auth/too-many-requests', over_email_send_rate_limit: 'auth/too-many-requests',
    signup_disabled: 'auth/operation-not-allowed', provider_disabled: 'auth/social-not-configured',
    validation_failed: 'auth/invalid-credential', reauthentication_needed: 'auth/requires-login',
    captcha_failed: 'auth/captcha', otp_expired: 'auth/code-invalid', otp_disabled: 'auth/operation-not-allowed',
    mfa_verification_failed: 'auth/mfa-invalid', mfa_challenge_expired: 'auth/mfa-invalid', insufficient_aal: 'auth/mfa-required',
  };
  if (error?.code?.startsWith?.('auth/')) return error.code;
  if (error?.code === 'P0401') return 'auth/email-code-required';
  if (invalidSession(error)) return 'auth/requires-login';
  return codes[error?.code] || (error?.status === 429 ? 'auth/too-many-requests' : 'auth/service-unavailable');
}

export const authMessage = (error) => t(`errors.${errorCode(error)}`);

function checked(result) { if (result.error) throw result.error; return result.data; }

// Asks the server, not the cached token: a plan set in the dashboard shows up right away.
export async function fetchUser() {
  const { user } = checked(await supabase.auth.getUser());
  return user;
}

// Like Plans > Refresh plan in the app: new token with the current app_metadata.
export async function refreshPlan() {
  checked(await supabase.auth.refreshSession());
  return fetchUser();
}

export async function updateDisplayName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 32 || /[\p{C}<>]/u.test(name)) throw { code: 'auth/invalid-display-name' };
  return checked(await supabase.auth.updateUser({ data: { display_name: name } })).user;
}

// The app asks for the current password before changing it. The site does the same. The check runs on
// a throwaway client, so the current session (and its two-factor level) is not replaced by a weaker one.
export async function changePassword(currentPassword, password, captchaToken) {
  const user = await fetchUser();
  if (!userInfo(user).providers.includes('email')) throw { code: 'auth/operation-not-allowed' };
  if (passwordProblem(password)) throw { code: 'auth/weak-password' };
  const scratch = scratchClient();
  const verified = await scratch.auth.signInWithPassword({ email: user.email, password: currentPassword, options: { captchaToken } });
  if (verified.error) throw verified.error.code === 'invalid_credentials' ? { code: 'auth/wrong-password' } : verified.error;
  await scratch.auth.signOut({ scope: 'local' }).catch(() => {});
  if (verified.data.user.id !== user.id) throw { code: 'auth/requires-login' };
  checked(await supabase.auth.updateUser({ password }));
}

export async function resendConfirmation(email, captchaToken) {
  checked(await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/account`, captchaToken } }));
}

// Two-factor (TOTP authenticator apps)
export async function mfaStatus() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return { required: data.nextLevel === 'aal2' && data.currentLevel !== 'aal2', level: data.currentLevel };
}

export async function verifiedTotp() {
  const data = checked(await supabase.auth.mfa.listFactors());
  return (data.totp || []).find((f) => f.status === 'verified') || null;
}

export async function verifyMfa(code) {
  const factor = await verifiedTotp();
  if (!factor) throw { code: 'auth/mfa-invalid' };
  checked(await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code }));
}

// Reads today's assistant count without using a message (ai_daily_quota, p_consume false).
// The site has no PC id, so the server answers with the Free cap; the plan's cap comes from the plan.
export async function readQuota(plan) {
  const result = await supabase.rpc('ai_daily_quota', { p_consume: false, p_hwid: '' });
  if (result.error) throw result.error;
  const q = result.data;
  if (!q || !Number.isInteger(q.used) || q.used < 0 || !Number.isFinite(Date.parse(q.resetsAt))) throw new Error('Invalid quota');
  const limit = AI_LIMIT[plan];
  return { used: q.used, limit, remaining: Math.max(0, limit - q.used), resetsAt: new Date(q.resetsAt) };
}

// Same function the app's "Rate unlag" uses: verified accounts, 3 reviews a day.
export async function submitReview(rating, comment) {
  const text = typeof comment === 'string' ? comment.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error(t('errors.ratingRange'));
  if (text.length > 2000) throw new Error(t('errors.reviewTooLong'));
  const result = await supabase.rpc('submit_review', { p_rating: rating, p_comment: text, p_version: 'website' });
  if (result.error?.code === 'P0429') throw new Error(t('errors.reviewLimit'));
  if (result.error) throw new Error(t('errors.reviewFailed'));
}
