import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { fetchUser, invalidSession, mfaStatus, refreshPlan, userInfo } from './account.js';

function claims(session) {
  try {
    const part = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part));
  } catch { return null; }
}

// Read from the session itself (no network): an account with a verified authenticator whose token is
// not yet aal2 must enter its code before anything is shown.
function sessionNeedsMfa(session) {
  if (!session?.user?.factors?.some((f) => f.status === 'verified')) return false;
  return claims(session)?.aal !== 'aal2';
}

/* Two-step sign-in by email (Account > Settings, app_metadata.email_2fa): a session opened with the
   password alone is not enough, the code sent by email must follow. Same rule as the database
   (require_full_sign_in) and the app. */
export function needsEmailCode(session, user = session?.user) {
  if (!session || user?.app_metadata?.email_2fa !== true) return false;
  const amr = claims(session)?.amr;
  return !Array.isArray(amr) || amr.every((m) => m?.method === 'password');
}
const dropSession = () => setTimeout(() => supabase.auth.signOut({ scope: 'local' }).catch(() => {}), 0);

const AuthContext = createContext({ user: null, info: null, loading: true, recovery: false, verified: false, mfaRequired: false, refresh: async () => {}, recheck: async () => {} });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, info: null, loading: Boolean(supabase), recovery: false, verified: false, mfaRequired: false });
  const checking = useRef(false);

  const apply = useCallback((user, verified, mfaRequired = false) => {
    setState((s) => ({ ...s, user, info: userInfo(user), loading: false, verified, mfaRequired: Boolean(user) && mfaRequired }));
  }, []);

  // Never trust the token alone: getUser() asks Supabase, so a plan changed in the dashboard,
  // a deleted or banned account, or a revoked session is seen here too.
  const verify = useCallback(async () => {
    if (!supabase || checking.current) return;
    checking.current = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { apply(null, true); return; }
      const user = await fetchUser();
      if (!user || needsEmailCode(data.session, user)) { await supabase.auth.signOut({ scope: 'local' }); apply(null, true); return; }
      // A plan set after the token was issued: get a token that carries it.
      if (user.app_metadata?.plan !== data.session.user.app_metadata?.plan) await supabase.auth.refreshSession();
      // Accounts with an authenticator app stay locked until its code is entered (aal2).
      const mfa = await mfaStatus();
      apply(user, true, mfa.required);
    } catch (error) {
      if (invalidSession(error)) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        apply(null, true);
      } else {
        // A network error must not sign the person out. Keep what we know, unverified.
        setState((s) => ({ ...s, loading: false, verified: false }));
      }
    } finally {
      checking.current = false;
    }
  }, [apply]);

  const refresh = useCallback(async () => {
    const user = await refreshPlan();
    apply(user, true, (await mfaStatus()).required);
    return userInfo(user);
  }, [apply]);

  useEffect(() => {
    if (!supabase) return undefined;
    // Show the cached session at once, then confirm it with the server.
    supabase.auth.getSession().then(({ data }) => {
      const blocked = needsEmailCode(data.session);
      if (blocked) dropSession();
      const user = blocked ? null : data.session?.user ?? null;
      setState((s) => ({ ...s, user, info: userInfo(user), loading: Boolean(user), mfaRequired: sessionNeedsMfa(data.session) }));
      verify();
    });
    // Never await SDK calls inside onAuthStateChange: it holds the auth lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const blocked = needsEmailCode(session);
      if (blocked) dropSession();
      const user = blocked ? null : session?.user ?? null;
      setState((s) => ({
        ...s,
        user,
        info: userInfo(user),
        loading: false,
        mfaRequired: sessionNeedsMfa(session),
        recovery: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : s.recovery,
      }));
      if (!blocked && ['SIGNED_IN', 'USER_UPDATED', 'MFA_CHALLENGE_VERIFIED'].includes(event)) setTimeout(verify, 0);
    });
    const onFocus = () => { if (document.visibilityState === 'visible') verify(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    const timer = setInterval(verify, 60000);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [verify]);

  return <AuthContext.Provider value={{ ...state, refresh, recheck: verify }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
