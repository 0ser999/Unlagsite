// The version shown on the site: the latest release on GitHub (the same one download.unlag.pro serves),
// so publishing a new app version updates the site without a redeploy. VERSION in data.js is shown
// first and stays when GitHub cannot be reached.
import { useEffect, useState } from 'react';
import { VERSION } from '../data.js';

const LATEST_URL = 'https://api.github.com/repos/0ser999/unlag/releases/latest';
const KEY = 'unlag:latest-version';
const MAX_AGE = 60 * 60 * 1000;
let request = null;

export const parseTag = (tag) => {
  const m = /^v?(\d+\.\d+\.\d+)$/.exec(String(tag || '').trim());
  return m ? m[1] : null;
};

function cached() {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return c && Date.now() - c.at < MAX_AGE ? parseTag(c.v) : null;
  } catch { return null; }
}

export function latestVersion() {
  const hit = cached();
  if (hit) return Promise.resolve(hit);
  request ??= fetch(LATEST_URL, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((r) => {
      const v = parseTag(r?.tag_name);
      if (v) try { sessionStorage.setItem(KEY, JSON.stringify({ v, at: Date.now() })); } catch { /* storage off */ }
      return v || VERSION;
    })
    .catch(() => VERSION)
    .finally(() => { request = null; });
  return request;
}

export function useVersion() {
  const [v, setV] = useState(() => cached() || VERSION);
  useEffect(() => {
    let live = true;
    latestVersion().then((x) => { if (live) setV(x); });
    return () => { live = false; };
  }, []);
  return v;
}
