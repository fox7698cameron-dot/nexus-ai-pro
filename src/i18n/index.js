/**
 * i18n/index.js
 * Nexus AI Pro — Internationalization & Auto-Translation
 * Date: 2026-08-27
 * Supported: en, es, fr, de, ja, ko, zh, ar, pt, ru, hi, it, nl, pl, tr, sv
 * Features: auto-detect locale, RTL support, date/number formatting, auto-translate API
 * No hard-coded API keys — TRANSLATE_API_KEY loaded from environment server-side
 */

// ── Supported locales ─────────────────────────────────────────────────────────
export const LOCALES = {
  en: { name: 'English',    flag: '🇺🇸', rtl: false, dateLocale: 'en-US'  },
  es: { name: 'Español',    flag: '🇪🇸', rtl: false, dateLocale: 'es-ES'  },
  fr: { name: 'Français',   flag: '🇫🇷', rtl: false, dateLocale: 'fr-FR'  },
  de: { name: 'Deutsch',    flag: '🇩🇪', rtl: false, dateLocale: 'de-DE'  },
  ja: { name: '日本語',      flag: '🇯🇵', rtl: false, dateLocale: 'ja-JP'  },
  ko: { name: '한국어',      flag: '🇰🇷', rtl: false, dateLocale: 'ko-KR'  },
  zh: { name: '中文',        flag: '🇨🇳', rtl: false, dateLocale: 'zh-CN'  },
  ar: { name: 'العربية',    flag: '🇸🇦', rtl: true,  dateLocale: 'ar-SA'  },
  pt: { name: 'Português',  flag: '🇧🇷', rtl: false, dateLocale: 'pt-BR'  },
  ru: { name: 'Русский',    flag: '🇷🇺', rtl: false, dateLocale: 'ru-RU'  },
  hi: { name: 'हिन्दी',    flag: '🇮🇳', rtl: false, dateLocale: 'hi-IN'  },
  it: { name: 'Italiano',   flag: '🇮🇹', rtl: false, dateLocale: 'it-IT'  },
  nl: { name: 'Nederlands', flag: '🇳🇱', rtl: false, dateLocale: 'nl-NL'  },
  pl: { name: 'Polski',     flag: '🇵🇱', rtl: false, dateLocale: 'pl-PL'  },
  tr: { name: 'Türkçe',     flag: '🇹🇷', rtl: false, dateLocale: 'tr-TR'  },
  sv: { name: 'Svenska',    flag: '🇸🇪', rtl: false, dateLocale: 'sv-SE'  },
};

// ── Base English strings ───────────────────────────────────────────────────────
const EN = {
  // General
  'app.name':             'Nexus AI Pro',
  'app.tagline':          'Enterprise AI Platform',
  'nav.dashboard':        'Dashboard',
  'nav.analytics':        'Analytics',
  'nav.security':         'Security',
  'nav.projects':         'Projects',
  'nav.subscription':     'Subscription',
  'nav.settings':         'Settings',
  'nav.admin':            'Admin',
  'nav.signIn':           'Sign In',
  'nav.signOut':          'Sign Out',

  // Auth
  'auth.login':           'Sign In',
  'auth.register':        'Create Account',
  'auth.username':        'Username',
  'auth.email':           'Email',
  'auth.password':        'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.mfaCode':         'MFA Code',
  'auth.biometric':       'Use Biometrics',
  'auth.forgotPassword':  'Forgot password?',
  'auth.passwordWeak':    'Password is too weak',
  'auth.passwordMin':     'Minimum 13 characters required',
  'auth.successLogin':    'Signed in successfully',
  'auth.successRegister': 'Account created! Welcome aboard.',

  // Analytics
  'analytics.title':      'Analytics Dashboard',
  'analytics.views':      'Views',
  'analytics.likes':      'Likes',
  'analytics.reach':      'Reach',
  'analytics.retention':  'Retention',
  'analytics.shares':     'Shares',
  'analytics.followers':  'Followers',
  'analytics.comments':   'Comments',
  'analytics.lastUpdated':'Last updated',

  // Security
  'security.title':       'Security Dashboard',
  'security.score':       'Security Score',
  'security.scan':        'Scan Now',
  'security.scanning':    'Scanning…',
  'security.networkIssues':'Network Issues',
  'security.deviceIssues':'Device Issues',
  'security.openVulns':   'Open Vulnerabilities',
  'security.patch':       'Patch',
  'security.patched':     'Patched',

  // Projects
  'projects.title':       'Project Tracker',
  'projects.new':         'New Project',
  'projects.progress':    'Progress',
  'projects.status':      'Status',
  'projects.tasks':       'Tasks',
  'projects.commits':     'Commits',
  'projects.achievement': 'Achievement',

  // Subscription
  'sub.title':            'Choose Your Plan',
  'sub.free':             'Free',
  'sub.pro':              'Pro',
  'sub.enterprise':       'Enterprise',
  'sub.lifetime':         'Lifetime',
  'sub.payNow':           'Pay Now',
  'sub.payCard':          'Credit / Debit Card',
  'sub.payCrypto':        'Cryptocurrency',
  'sub.payGift':          'Gift Card',
  'sub.success':          'Payment Successful!',

  // Common
  'common.loading':       'Loading…',
  'common.error':         'An error occurred',
  'common.save':          'Save',
  'common.cancel':        'Cancel',
  'common.delete':        'Delete',
  'common.search':        'Search',
  'common.filter':        'Filter',
  'common.refresh':       'Refresh',
  'common.all':           'All',
  'common.none':          'None',
};

// ── Translation cache (from auto-translate API) ───────────────────────────────
const _cache = new Map();

// ── Locale detection ──────────────────────────────────────────────────────────
export function detectLocale() {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus:locale') : null;
  if (stored && LOCALES[stored]) return stored;
  const browser = navigator?.language?.split('-')[0] || 'en';
  return LOCALES[browser] ? browser : 'en';
}

// ── Auto-translate via server proxy (no client-side API key) ──────────────────
async function fetchTranslation(text, targetLang) {
  const key = `${targetLang}::${text}`;
  if (_cache.has(key)) return _cache.get(key);
  try {
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) return text; // Fallback to original
    const data = await res.json();
    const translated = data.translatedText || text;
    _cache.set(key, translated);
    return translated;
  } catch {
    return text; // Silent fallback
  }
}

// ── Translation class ─────────────────────────────────────────────────────────
class I18n {
  constructor() {
    this.locale    = detectLocale();
    this.strings   = new Map();
    this.listeners = new Set();
    this._loadBase();
  }

  _loadBase() {
    this.strings.set('en', EN);
  }

  setLocale(locale) {
    if (!LOCALES[locale]) return;
    this.locale = locale;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', locale);
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', LOCALES[locale].rtl ? 'rtl' : 'ltr');
    this.listeners.forEach(fn => fn(locale));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  t(key, replacements = {}) {
    const dict = this.strings.get(this.locale) || this.strings.get('en') || {};
    const base  = dict[key] || EN[key] || key;
    return Object.entries(replacements).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      base
    );
  }

  async tAsync(key, replacements = {}) {
    if (this.locale === 'en') return this.t(key, replacements);
    const base = EN[key] || key;
    const translated = await fetchTranslation(base, this.locale);
    return Object.entries(replacements).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      translated
    );
  }

  async translateText(text) {
    if (this.locale === 'en' || !text) return text;
    return fetchTranslation(text, this.locale);
  }

  formatDate(date, options = {}) {
    const localeInfo = LOCALES[this.locale] || LOCALES.en;
    return new Intl.DateTimeFormat(localeInfo.dateLocale, options).format(date instanceof Date ? date : new Date(date));
  }

  formatNumber(n, options = {}) {
    const localeInfo = LOCALES[this.locale] || LOCALES.en;
    return new Intl.NumberFormat(localeInfo.dateLocale, options).format(n);
  }

  formatCurrency(amount, currency = 'USD') {
    const localeInfo = LOCALES[this.locale] || LOCALES.en;
    return new Intl.NumberFormat(localeInfo.dateLocale, { style: 'currency', currency }).format(amount);
  }

  isRTL() {
    return LOCALES[this.locale]?.rtl || false;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const i18n = new I18n();

// ── React hook ────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

export function useI18n() {
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    const unsub = i18n.subscribe(setLocale);
    return unsub;
  }, []);

  return {
    locale,
    t:             (...args) => i18n.t(...args),
    tAsync:        (...args) => i18n.tAsync(...args),
    translateText: (...args) => i18n.translateText(...args),
    setLocale:     loc => i18n.setLocale(loc),
    formatDate:    (...args) => i18n.formatDate(...args),
    formatNumber:  (...args) => i18n.formatNumber(...args),
    formatCurrency:(...args) => i18n.formatCurrency(...args),
    isRTL:         () => i18n.isRTL(),
    locales:       LOCALES,
  };
}

// ── LocaleSelector component ──────────────────────────────────────────────────
import React from 'react';

export function LocaleSelector({ compact = false }) {
  const { locale, setLocale, locales } = useI18n();
  return (
    <select
      value={locale}
      onChange={e => setLocale(e.target.value)}
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        color: '#e2e8f0',
        padding: compact ? '4px 8px' : '8px 12px',
        fontSize: compact ? 12 : 14,
        cursor: 'pointer',
      }}
      aria-label="Select language"
    >
      {Object.entries(locales).map(([code, meta]) => (
        <option key={code} value={code}>
          {meta.flag} {compact ? code.toUpperCase() : meta.name}
        </option>
      ))}
    </select>
  );
}
