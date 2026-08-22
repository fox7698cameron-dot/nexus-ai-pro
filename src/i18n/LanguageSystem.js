// ================================================
// src/i18n/LanguageSystem.js
// Multi-Language & Regional Support System
// Auto-translate via LibreTranslate / DeepL
// RTL support, regional formatting, translation cache
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';

// ─── Language definitions ─────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    nativeName: 'English',     flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',     flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French',     nativeName: 'Français',    flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',     flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',   flag: '🇧🇷', dir: 'ltr' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',          flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',         flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',         flag: '🇰🇷', dir: 'ltr' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',      flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',          flag: '🇮🇳', dir: 'ltr' },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',     flag: '🇷🇺', dir: 'ltr' },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano',    flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', name: 'Dutch',      nativeName: 'Nederlands',  flag: '🇳🇱', dir: 'ltr' },
  { code: 'pl', name: 'Polish',     nativeName: 'Polski',      flag: '🇵🇱', dir: 'ltr' },
  { code: 'tr', name: 'Turkish',    nativeName: 'Türkçe',      flag: '🇹🇷', dir: 'ltr' },
  { code: 'sv', name: 'Swedish',    nativeName: 'Svenska',     flag: '🇸🇪', dir: 'ltr' },
  { code: 'da', name: 'Danish',     nativeName: 'Dansk',       flag: '🇩🇰', dir: 'ltr' },
  { code: 'fi', name: 'Finnish',    nativeName: 'Suomi',       flag: '🇫🇮', dir: 'ltr' },
  { code: 'no', name: 'Norwegian',  nativeName: 'Norsk',       flag: '🇳🇴', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian',  nativeName: 'Українська',  flag: '🇺🇦', dir: 'ltr' },
];

export const RTL_LANGUAGES = new Set(SUPPORTED_LANGUAGES.filter(l => l.dir === 'rtl').map(l => l.code));

const LANG_MAP = Object.fromEntries(SUPPORTED_LANGUAGES.map(l => [l.code, l]));

// ─── Built-in English strings (fallback) ─────────────────────────────────────
const BASE_STRINGS = {
  'nav.dashboard': 'Dashboard',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.game_dev': 'Game Dev',
  'nav.ar_vr': 'AR/VR',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.role': 'Account type',
  'auth.mfa_title': 'Two-Factor Authentication',
  'auth.mfa_enter': 'Enter your authentication code',
  'auth.biometric': 'Use Biometrics',
  'auth.forgot': 'Forgot password?',
  'auth.no_account': "Don't have an account?",
  'auth.have_account': 'Already have an account?',
  'payment.checkout': 'Checkout',
  'payment.plan': 'Select Plan',
  'payment.pay': 'Pay Now',
  'payment.crypto': 'Pay with Crypto',
  'payment.gift_card': 'Redeem Gift Card',
  'analytics.views': 'Views',
  'analytics.likes': 'Likes',
  'analytics.reach': 'Reach',
  'analytics.retention': 'Retention',
  'analytics.followers': 'Followers',
  'analytics.engagement': 'Engagement',
  'security.scan': 'Run Security Scan',
  'security.status': 'Security Status',
  'security.alerts': 'Security Alerts',
  'common.loading': 'Loading…',
  'common.error': 'An error occurred',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.export': 'Export',
  'common.refresh': 'Refresh',
  'common.demo_data': 'Demo data — configure API keys for live data',
};

// ─── Translation cache ─────────────────────────────────────────────────────────
const translationCache = new Map(); // key: `${lang}:${text}`

function cacheKey(lang, text) { return `${lang}:${text}`; }

function getCached(lang, text) { return translationCache.get(cacheKey(lang, text)); }
function setCached(lang, text, translated) { translationCache.set(cacheKey(lang, text), translated); }

// Persist cache to sessionStorage
function loadCacheFromStorage() {
  try {
    const raw = sessionStorage.getItem('nexus_i18n_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) translationCache.set(k, v);
    }
  } catch {}
}

function saveCacheToStorage() {
  try {
    const obj = Object.fromEntries(translationCache.entries());
    sessionStorage.setItem('nexus_i18n_cache', JSON.stringify(obj));
  } catch {}
}

// ─── Auto-translate via LibreTranslate or DeepL ──────────────────────────────
async function autoTranslate(text, targetLang) {
  if (targetLang === 'en') return text;

  const cached = getCached(targetLang, text);
  if (cached) return cached;

  // Try LibreTranslate
  const ltUrl = typeof window !== 'undefined'
    ? window.__NEXUS_LIBRETRANSLATE_URL__
    : process.env?.LIBRETRANSLATE_URL;

  const ltKey = typeof window !== 'undefined'
    ? window.__NEXUS_LIBRETRANSLATE_KEY__
    : process.env?.LIBRETRANSLATE_API_KEY;

  if (ltUrl) {
    try {
      const res = await fetch(`${ltUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'en', target: targetLang, api_key: ltKey || '' }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.translatedText;
        if (translated) {
          setCached(targetLang, text, translated);
          saveCacheToStorage();
          return translated;
        }
      }
    } catch {}
  }

  // Try DeepL fallback (server-side only)
  if (typeof process !== 'undefined' && process.env?.DEEPL_API_KEY) {
    try {
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}` },
        body: new URLSearchParams({ text, source_lang: 'EN', target_lang: targetLang.toUpperCase() }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data?.translations?.[0]?.text;
        if (translated) {
          setCached(targetLang, text, translated);
          saveCacheToStorage();
          return translated;
        }
      }
    } catch {}
  }

  // Fallback: return original
  return text;
}

// ─── Regional formatters ─────────────────────────────────────────────────────
export function formatDate(date, lang = 'en', options = {}) {
  try {
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'pt' ? 'pt-BR' : lang;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      ...options,
    }).format(date instanceof Date ? date : new Date(date));
  } catch {
    return String(date);
  }
}

export function formatNumber(num, lang = 'en', options = {}) {
  try {
    const locale = lang === 'zh' ? 'zh-CN' : lang;
    return new Intl.NumberFormat(locale, options).format(num);
  } catch {
    return String(num);
  }
}

export function formatCurrency(amount, lang = 'en', currency = 'USD') {
  try {
    const locale = lang === 'zh' ? 'zh-CN' : lang;
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

// ─── Language detection ───────────────────────────────────────────────────────
function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || navigator.userLanguage || 'en';
  const code = lang.split('-')[0].toLowerCase();
  return LANG_MAP[code] ? code : 'en';
}

function getStoredLanguage() {
  try {
    return localStorage.getItem('nexus_lang') || null;
  } catch {
    return null;
  }
}

function storeLanguage(lang) {
  try {
    localStorage.setItem('nexus_lang', lang);
  } catch {}
}

// ─── React Context ────────────────────────────────────────────────────────────
const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  dir: 'ltr',
  t: (key) => key,
  translate: (text) => text,
  formatDate,
  formatNumber,
  formatCurrency,
  languageInfo: LANG_MAP['en'],
  isLoading: false,
});

export function LanguageProvider({ children, defaultLang }) {
  const [lang, setLangState] = useState(() => {
    return defaultLang || getStoredLanguage() || detectBrowserLanguage();
  });
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load cache on mount
  useEffect(() => {
    loadCacheFromStorage();
  }, []);

  // Apply RTL and lang attribute to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
  }, [lang]);

  // Pre-translate base strings when language changes
  useEffect(() => {
    if (lang === 'en') {
      setTranslations(BASE_STRINGS);
      return;
    }

    setIsLoading(true);
    const entries = Object.entries(BASE_STRINGS);
    let done = 0;
    const translated = {};

    Promise.all(entries.map(async ([key, value]) => {
      translated[key] = await autoTranslate(value, lang);
    })).then(() => {
      setTranslations(translated);
      setIsLoading(false);
    }).catch(() => {
      setTranslations(BASE_STRINGS);
      setIsLoading(false);
    });
  }, [lang]);

  const setLang = useCallback((newLang) => {
    if (!LANG_MAP[newLang]) return;
    storeLanguage(newLang);
    setLangState(newLang);
  }, []);

  // t() — look up a translation key
  const t = useCallback((key, fallback = null) => {
    return translations[key] || BASE_STRINGS[key] || fallback || key;
  }, [translations]);

  // translate() — auto-translate arbitrary text
  const translate = useCallback(async (text) => {
    if (lang === 'en') return text;
    return autoTranslate(text, lang);
  }, [lang]);

  const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
  const languageInfo = LANG_MAP[lang];

  const value = useMemo(() => ({
    lang,
    setLang,
    dir,
    t,
    translate,
    formatDate: (d, opts) => formatDate(d, lang, opts),
    formatNumber: (n, opts) => formatNumber(n, lang, opts),
    formatCurrency: (a, cur) => formatCurrency(a, lang, cur),
    languageInfo,
    isLoading,
  }), [lang, setLang, dir, t, translate, languageInfo, isLoading]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTranslation() {
  return useContext(LanguageContext);
}

// ─── Language Selector Component ───────────────────────────────────────────────
export function LanguageSelector({ compact = false }) {
  const { lang, setLang, languageInfo } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ padding: compact ? '4px 8px' : '8px 12px', borderRadius: 8, border: '1px solid var(--border, #2a2d3a)', background: 'var(--card-bg, #1a1d27)', color: 'var(--text, #e2e8f0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
      >
        <span>{languageInfo?.flag}</span>
        {!compact && <span>{languageInfo?.nativeName}</span>}
        <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--card-bg, #1a1d27)', border: '1px solid var(--border, #2a2d3a)', borderRadius: 10, padding: 8, zIndex: 1000, width: 200, maxHeight: 300, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {SUPPORTED_LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 6, border: 'none', background: lang === l.code ? 'var(--accent, #60A5FA)22' : 'transparent', color: lang === l.code ? 'var(--accent, #60A5FA)' : 'var(--text, #e2e8f0)', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
            >
              <span>{l.flag}</span>
              <span>{l.nativeName}</span>
              {l.dir === 'rtl' && <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>RTL</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Server-side translate utility (for Node.js routes) ──────────────────────
export async function translateServerSide(text, targetLang) {
  if (targetLang === 'en' || !text) return text;

  const cached = getCached(targetLang, text);
  if (cached) return cached;

  // LibreTranslate
  const ltUrl = process.env?.LIBRETRANSLATE_URL;
  const ltKey = process.env?.LIBRETRANSLATE_API_KEY;

  if (ltUrl) {
    try {
      const res = await fetch(`${ltUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'en', target: targetLang, api_key: ltKey || '' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setCached(targetLang, text, data.translatedText);
          return data.translatedText;
        }
      }
    } catch {}
  }

  // DeepL
  if (process.env?.DEEPL_API_KEY) {
    try {
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}` },
        body: new URLSearchParams({ text, source_lang: 'EN', target_lang: targetLang.toUpperCase() }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data?.translations?.[0]?.text;
        if (translated) {
          setCached(targetLang, text, translated);
          return translated;
        }
      }
    } catch {}
  }

  return text;
}

export default { LanguageProvider, useTranslation, LanguageSelector, translate: autoTranslate, SUPPORTED_LANGUAGES, RTL_LANGUAGES, formatDate, formatNumber, formatCurrency };
