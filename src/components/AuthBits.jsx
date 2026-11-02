import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { passwordProblem, passwordScore, SCORE_LABEL } from '../lib/password.js';

export function PasswordInput({ value, onChange, className = '', ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="pw-wrap">
      <input {...props} className={className} type={shown ? 'text' : 'password'} value={value} onChange={onChange} maxLength={4096} />
      <button type="button" className="pw-eye" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide password' : 'Show password'}>
        {shown ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
      </button>
    </span>
  );
}

export function PasswordMeter({ value }) {
  if (!value) return <p className="pw-hint">At least 8 characters, with letters and numbers</p>;
  const score = passwordScore(value);
  const problem = passwordProblem(value);
  return (
    <div className={`pw-meter score-${score}`} aria-live="polite">
      <span className="pw-bars" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="pw-label">{problem || SCORE_LABEL[score]}</span>
    </div>
  );
}

// One field for the 6 to 10 digit codes Supabase sends (email codes and authenticator apps).
export function CodeInput({ value, onChange, autoFocus = true, length = 10 }) {
  return (
    <input
      className="code-input mono"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={length}
      placeholder="000000"
      aria-label="Code"
      autoFocus={autoFocus}
      required
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
    />
  );
}
