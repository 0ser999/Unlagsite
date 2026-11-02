// Same rules as the app (unlag/src/auth.js and supabase-client.js). Set the same minimum in
// Supabase > Authentication > Providers > Email so the server enforces it too.
export const MIN_PASSWORD = 8;

// What is still missing, or '' when the password is accepted.
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  if (password.length > 4096) return 'Use 4096 characters or fewer';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Mix letters and numbers';
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

export const SCORE_LABEL = ['', 'Too weak', 'Fair', 'Good', 'Strong'];
