import { t } from '../i18n/index.jsx';

// Same rules as the app (unlag/src/auth.js and supabase-client.js). Set the same minimum in
// Supabase > Authentication > Providers > Email so the server enforces it too.
export const MIN_PASSWORD = 8;

// What is still missing, or '' when the password is accepted.
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return t('password.min');
  if (password.length > 4096) return t('password.max');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return t('password.mix');
  return '';
}

// 0 empty, 1 weak, 2 fair, 3 good, 4 strong
export function passwordScore(password) {
  if (!password) return 0;
  if (passwordProblem(password)) return 1;
  let score = 2;
  if (password.length >= 12) score += 1;
  if ((/[a-z]/.test(password) && /[A-Z]/.test(password)) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export const scoreLabel = (score) => t('password.score')[score] || '';
