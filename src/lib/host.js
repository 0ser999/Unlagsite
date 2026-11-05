// The dashboard (account page) lives on its own subdomain; the rest of the site on www.
// Off unlag.pro (localhost, Vercel previews) everything stays on one origin as before.
export const WWW = 'https://www.unlag.pro';
export const DASHBOARD = 'https://dashboard.unlag.pro';

const host = typeof window === 'undefined' ? '' : window.location.hostname;
export const onUnlag = host === 'unlag.pro' || host.endsWith('.unlag.pro');
export const onDashboard = host === 'dashboard.unlag.pro';

// Absolute URL for a site path, used for sign-in and email links: /account goes to the dashboard.
export function siteUrl(path) {
  if (onUnlag && (path === '/account' || path.startsWith('/account?'))) return `${DASHBOARD}/${path.slice('/account'.length)}`;
  return `${window.location.origin}${path}`;
}
