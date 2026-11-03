import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import en from './en.js';

// The site languages. English is the source; the others are loaded on demand.
export const LANGS = [
  ['en', 'English'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['de', 'Deutsch'],
  ['pt', 'Português'],
  ['it', 'Italiano'],
  ['pl', 'Polski'],
  ['tr', 'Türkçe'],
  ['ru', 'Русский'],
];
const LOADERS = {
  fr: () => import('./fr.js'),
  es: () => import('./es.js'),
  de: () => import('./de.js'),
  pt: () => import('./pt.js'),
  it: () => import('./it.js'),
  pl: () => import('./pl.js'),
  tr: () => import('./tr.js'),
  ru: () => import('./ru.js'),
};
const STORE = 'unlag:lang';
const supported = (code) => LANGS.some(([c]) => c === code);

// A choice made on the site wins, then the browser languages in order, then English.
export function detectLang() {
  try {
    const saved = localStorage.getItem(STORE);
    if (supported(saved)) return saved;
  } catch { /* storage blocked */ }
  const wanted = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const tag of wanted) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (supported(base)) return base;
  }
  return 'en';
}

export async function loadDict(lang) {
  if (lang === 'en' || !LOADERS[lang]) return en;
  try { return (await LOADERS[lang]()).default; } catch { return en; }
}

let current = { lang: 'en', dict: en };

function lookup(dict, key) {
  let node = dict;
  for (const part of key.split('.')) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

/* t('home.title') or t('plans.get', { plan: 'Premium' }). Missing keys fall back to English, then to the key. */
export function t(key, vars) {
  let value = lookup(current.dict, key);
  if (value === undefined) value = lookup(en, key);
  if (value === undefined) return key;
  if (typeof value === 'string' && vars) {
    return value.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
  }
  return value;
}
export const currentLang = () => current.lang;

const LangContext = createContext({ lang: 'en', setLang: () => {} });

export function LangProvider({ initial, children }) {
  const [state, setState] = useState(() => {
    current = initial;
    return initial;
  });
  useEffect(() => { document.documentElement.lang = state.lang; }, [state.lang]);
  const setLang = useCallback(async (lang) => {
    if (!supported(lang)) return;
    try { localStorage.setItem(STORE, lang); } catch { /* keeps working for this visit */ }
    const dict = await loadDict(lang);
    current = { lang, dict };
    setState(current);
  }, []);
  // key: every text is re-read in the new language
  return <LangContext.Provider value={{ lang: state.lang, setLang }}><div key={state.lang} style={{ display: 'contents' }}>{children}</div></LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
