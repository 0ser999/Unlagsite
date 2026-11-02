import { useCallback, useEffect, useRef } from 'react';

// Cloudflare Turnstile in front of every Supabase call that can be abused by bots (sign-in, sign-up,
// email codes, password reset, resending a confirmation). The site key is public. Without
// VITE_TURNSTILE_SITE_KEY the site behaves as before, so it can ship before captcha is turned on in Supabase.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
export const captchaEnabled = Boolean(SITE_KEY);

let loader = null;
export function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => { loader = null; reject({ code: 'auth/captcha' }); };
      document.head.appendChild(script);
    });
  }
  return loader;
}

export function renderTurnstile(turnstile, element, options) {
  return turnstile.render(element, { sitekey: SITE_KEY, theme: 'dark', ...options });
}

/* An invisible widget: it only shows a challenge when Cloudflare is unsure. getToken() returns a
   fresh single-use token for one Supabase call, or undefined when captcha is not configured. */
export function useCaptcha() {
  const box = useRef(null);
  const widget = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    if (!captchaEnabled) return undefined;
    let gone = false;
    loadTurnstile().then((turnstile) => {
      if (gone || !box.current) return;
      widget.current = renderTurnstile(turnstile, box.current, {
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token) => { pending.current?.resolve(token); pending.current = null; },
        'error-callback': () => { pending.current?.reject({ code: 'auth/captcha' }); pending.current = null; },
      });
    }).catch(() => {});
    return () => {
      gone = true;
      if (widget.current != null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  const getToken = useCallback(async () => {
    if (!captchaEnabled) return undefined;
    const turnstile = await loadTurnstile();
    for (let i = 0; i < 50 && widget.current == null; i += 1) await new Promise((r) => setTimeout(r, 100));
    if (widget.current == null) throw { code: 'auth/captcha' };
    turnstile.reset(widget.current);
    return new Promise((resolve, reject) => {
      pending.current = { resolve, reject };
      turnstile.execute(widget.current);
      setTimeout(() => { if (pending.current) { pending.current = null; reject({ code: 'auth/captcha' }); } }, 60000);
    });
  }, []);

  const element = captchaEnabled ? <div ref={box} className="captcha" /> : null;
  return { element, getToken };
}
