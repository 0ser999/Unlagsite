import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { fetchUser, invalidSession, refreshPlan, userInfo } from './account.js';

const AuthContext = createContext({ user: null, info: null, loading: true, recovery: false, verified: false, refresh: async () => {} });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, info: null, loading: Boolean(supabase), recovery: false, verified: false });
  const checking = useRef(false);

  const apply = useCallback((user, verified) => {
    setState((s) => ({ ...s, user, info: userInfo(user), loading: false, verified }));
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
      apply(user, true);
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
    apply(user, true);
    return userInfo(user);
  }, [apply]);

  useEffect(() => {
    if (!supabase) return undefined;
    // Show the cached session at once, then confirm it with the server.
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => ({ ...s, user: data.session?.user ?? null, info: userInfo(data.session?.user), loading: Boolean(data.session) }));
      verify();
    });
    // Never await SDK calls inside onAuthStateChange: it holds the auth lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({
        ...s,
        user: session?.user ?? null,
        info: userInfo(session?.user),
        loading: false,
        recovery: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : s.recovery,
      }));
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') setTimeout(verify, 0);
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

  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
