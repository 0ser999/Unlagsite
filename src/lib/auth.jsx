import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { fetchUser, invalidSession, mfaStatus, refreshPlan, userInfo } from './account.js';

// Read from the session itself (no network): an account with a verified authenticator whose token is
// not yet aal2 must enter its code before anything is shown.
function sessionNeedsMfa(session) {
  if (!session?.user?.factors?.some((f) => f.status === 'verified')) return false;
  try {
    const part = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).aal !== 'aal2';
  } catch { return true; }
}

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
      if (!user) { await supabase.auth.signOut({ scope: 'local' }); apply(null, true); return; }
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
      setState((s) => ({ ...s, user: data.session?.user ?? null, info: userInfo(data.session?.user), loading: Boolean(data.session), mfaRequired: sessionNeedsMfa(data.session) }));
      verify();
    });
    // Never await SDK calls inside onAuthStateChange: it holds the auth lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({
        ...s,
        user: session?.user ?? null,
        info: userInfo(session?.user),
        loading: false,
        mfaRequired: sessionNeedsMfa(session),
        recovery: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : s.recovery,
      }));
      if (['SIGNED_IN', 'USER_UPDATED', 'MFA_CHALLENGE_VERIFIED'].includes(event)) setTimeout(verify, 0);
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
