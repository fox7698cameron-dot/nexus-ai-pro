/**
 * i18nService.js
 * Nexus AI Pro — Internationalization & Auto-Translation Service
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Supports: 20 languages with RTL, locale-aware formatting,
 *           and auto-translate via backend proxy.
 *
 * Updated: 2026-08-07
 */

/* ─── Supported Locales ──────────────────────────────────────────────── */
export const LOCALES = [
  { code: 'en',    name: 'English',            dir: 'ltr', flag: '🇺🇸' },
  { code: 'es',    name: 'Español',            dir: 'ltr', flag: '🇪🇸' },
  { code: 'fr',    name: 'Français',           dir: 'ltr', flag: '🇫🇷' },
  { code: 'de',    name: 'Deutsch',            dir: 'ltr', flag: '🇩🇪' },
  { code: 'it',    name: 'Italiano',           dir: 'ltr', flag: '🇮🇹' },
  { code: 'pt',    name: 'Português',          dir: 'ltr', flag: '🇧🇷' },
  { code: 'zh',    name: '中文',               dir: 'ltr', flag: '🇨🇳' },
  { code: 'ja',    name: '日本語',              dir: 'ltr', flag: '🇯🇵' },
  { code: 'ko',    name: '한국어',              dir: 'ltr', flag: '🇰🇷' },
  { code: 'ar',    name: 'العربية',            dir: 'rtl', flag: '🇸🇦' },
  { code: 'he',    name: 'עברית',              dir: 'rtl', flag: '🇮🇱' },
  { code: 'fa',    name: 'فارسی',              dir: 'rtl', flag: '🇮🇷' },
  { code: 'ru',    name: 'Русский',            dir: 'ltr', flag: '🇷🇺' },
  { code: 'hi',    name: 'हिन्दी',             dir: 'ltr', flag: '🇮🇳' },
  { code: 'tr',    name: 'Türkçe',             dir: 'ltr', flag: '🇹🇷' },
  { code: 'nl',    name: 'Nederlands',         dir: 'ltr', flag: '🇳🇱' },
  { code: 'pl',    name: 'Polski',             dir: 'ltr', flag: '🇵🇱' },
  { code: 'sv',    name: 'Svenska',            dir: 'ltr', flag: '🇸🇪' },
  { code: 'vi',    name: 'Tiếng Việt',         dir: 'ltr', flag: '🇻🇳' },
  { code: 'th',    name: 'ภาษาไทย',           dir: 'ltr', flag: '🇹🇭' },
];

/* ─── Base English strings ───────────────────────────────────────────── */
const BASE_STRINGS = {
  // Navigation
  'nav.home':          'Home',
  'nav.analytics':     'Analytics',
  'nav.security':      'Security',
  'nav.projects':      'Projects',
  'nav.payments':      'Payments',
  'nav.settings':      'Settings',
  'nav.admin':         'Admin',
  // Auth
  'auth.login':        'Sign In',
  'auth.logout':       'Sign Out',
  'auth.register':     'Create Account',
  'auth.email':        'Email address',
  'auth.password':     'Password',
  'auth.username':     'Username',
  'auth.mfa.title':    'Two-Factor Verification',
  'auth.mfa.prompt':   'Enter your 6-digit authentication code',
  'auth.biometric':    'Use Biometrics',
  'auth.forgot':       'Forgot password?',
  // Dashboards
  'dash.security.title':   'Security Dashboard',
  'dash.analytics.title':  'Analytics Dashboard',
  'dash.projects.title':   'Project Tracker',
  'dash.payments.title':   'Payments & Subscriptions',
  // Common
  'common.save':       'Save',
  'common.cancel':     'Cancel',
  'common.delete':     'Delete',
  'common.confirm':    'Confirm',
  'common.loading':    'Loading…',
  'common.error':      'An error occurred',
  'common.success':    'Success!',
  'common.search':     'Search',
  'common.refresh':    'Refresh',
  // Payment
  'pay.plan.free':     'Free',
  'pay.plan.pro':      'Pro',
  'pay.plan.enterprise': 'Enterprise',
  'pay.method.card':   'Credit / Debit Card',
  'pay.method.crypto': 'Cryptocurrency',
  'pay.method.gift':   'Gift Card',
  'pay.subscribe':     'Subscribe',
  'pay.cancel':        'Cancel Subscription',
  // Errors
  'err.required':      'This field is required',
  'err.invalid_email': 'Invalid email address',
  'err.weak_password': 'Password does not meet strength requirements',
  'err.network':       'Network error — please try again',
};

/* ─── i18n Service ───────────────────────────────────────────────────── */
class I18nService {
  constructor() {
    this._locale   = this._detectLocale();
    this._strings  = { en: BASE_STRINGS };
    this._cache    = new Map();       // translation cache: `${src}:${target}` → text
    this._listeners = new Set();
  }

  /* ── Locale detection ── */
  _detectLocale() {
    const stored = localStorage.getItem('nexus:locale');
    if (stored && LOCALES.find(l => l.code === stored)) return stored;
    // Browser/OS language
    const lang = (navigator.language || 'en').split('-')[0].toLowerCase();
    return LOCALES.find(l => l.code === lang)?.code ?? 'en';
  }

  get locale() { return this._locale; }
  get localeInfo() { return LOCALES.find(l => l.code === this._locale) ?? LOCALES[0]; }
  get isRTL() { return this.localeInfo.dir === 'rtl'; }

  setLocale(code) {
    if (!LOCALES.find(l => l.code === code)) return;
    this._locale = code;
    localStorage.setItem('nexus:locale', code);
    document.documentElement.lang = code;
    document.documentElement.dir  = this.isRTL ? 'rtl' : 'ltr';
    this._notifyListeners();
  }

  /* ── String lookup ── */
  t(key, vars = {}) {
    const map = this._strings[this._locale] ?? this._strings.en ?? {};
    let str = map[key] ?? BASE_STRINGS[key] ?? key;
    // Interpolate {{variable}} placeholders
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{{${k}}}`, String(v));
    }
    return str;
  }

  /* ── Load locale file from server (lazy) ── */
  async loadLocale(code) {
    if (this._strings[code]) return;
    try {
      const resp = await fetch(`/api/i18n/${code}`);
      if (resp.ok) {
        this._strings[code] = await resp.json();
      }
    } catch { /* fall through to base strings */ }
  }

  /* ── Auto-translate arbitrary text ── */
  async translate(text, targetLocale, sourceLocale = 'en') {
    if (targetLocale === sourceLocale) return text;
    const cacheKey = `${sourceLocale}:${targetLocale}:${text.slice(0, 50)}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    try {
      const resp = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: sourceLocale, target: targetLocale }),
      });
      if (!resp.ok) return text;
      const { translated } = await resp.json();
      this._cache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    }
  }

  /* ── Locale-aware number/date formatting ── */
  formatNumber(n, opts = {}) {
    return new Intl.NumberFormat(this._locale, opts).format(n);
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this._locale, { style: 'currency', currency }).format(amount);
  }

  formatDate(date, opts = { dateStyle: 'medium' }) {
    return new Intl.DateTimeFormat(this._locale, opts).format(new Date(date));
  }

  /* ── Observer pattern for React re-renders ── */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notifyListeners() {
    this._listeners.forEach(fn => fn(this._locale));
  }
}

export const i18n = new I18nService();
// Convenience shorthand
export const t = (key, vars) => i18n.t(key, vars);
