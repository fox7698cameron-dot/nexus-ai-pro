/**
 * @file translations.js
 * @description Multi-Language / Regional Support & Auto-Translation
 *   Supported languages: en, es, fr, de, zh, ja, ko, ar, pt, ru, hi, it, nl, pl, sv, tr
 *   RTL languages: ar, he, fa, ur
 *   Auto-translate via server-side proxy (never expose API keys client-side)
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

// ─── Supported Locales ─────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English',    nativeName: 'English',    region: 'US', rtl: false, flag: '🇺🇸' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',    region: 'ES', rtl: false, flag: '🇪🇸' },
  { code: 'fr', name: 'French',     nativeName: 'Français',   region: 'FR', rtl: false, flag: '🇫🇷' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',    region: 'DE', rtl: false, flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',        region: 'CN', rtl: false, flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',      region: 'JP', rtl: false, flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',      region: 'KR', rtl: false, flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',    region: 'SA', rtl: true,  flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',  region: 'BR', rtl: false, flag: '🇧🇷' },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',    region: 'RU', rtl: false, flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',      region: 'IN', rtl: false, flag: '🇮🇳' },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano',   region: 'IT', rtl: false, flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch',      nativeName: 'Nederlands', region: 'NL', rtl: false, flag: '🇳🇱' },
  { code: 'pl', name: 'Polish',     nativeName: 'Polski',     region: 'PL', rtl: false, flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish',    nativeName: 'Svenska',    region: 'SE', rtl: false, flag: '🇸🇪' },
  { code: 'tr', name: 'Turkish',    nativeName: 'Türkçe',     region: 'TR', rtl: false, flag: '🇹🇷' }
];

export const RTL_LOCALES = new Set(SUPPORTED_LOCALES.filter(l => l.rtl).map(l => l.code));

// ─── Base Translations (English) ───────────────────────────────────────────────

const BASE_TRANSLATIONS = {
  // Navigation
  'nav.home': 'Home',
  'nav.dashboard': 'Dashboard',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.projects': 'Projects',
  'nav.settings': 'Settings',
  'nav.signOut': 'Sign Out',

  // Auth
  'auth.signIn': 'Sign In',
  'auth.signUp': 'Create Account',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.confirm': 'Confirm password',
  'auth.biometric': 'Sign in with Biometrics',
  'auth.mfa': 'Enter your 2FA code',
  'auth.forgot': 'Forgot password?',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.passwordHint': '13+ characters, uppercase, lowercase, digit, special char',

  // Dashboards
  'analytics.title': 'Analytics Dashboard',
  'analytics.subtitle': 'Cross-platform social media metrics',
  'security.title': 'Security Dashboard',
  'security.subtitle': 'Real-time threat detection',
  'projects.title': 'Project Tracker',
  'projects.subtitle': 'Coding · Game Dev · AR/VR/3D',

  // Payments
  'payment.choosePlan': 'Choose Your Plan',
  'payment.monthly': 'Monthly',
  'payment.annual': 'Annual',
  'payment.subscribe': 'Subscribe',
  'payment.card': 'Credit / Debit Card',
  'payment.crypto': 'Cryptocurrency',
  'payment.giftcard': 'Gift Card',
  'payment.success': 'Payment Successful!',

  // Common
  'common.loading': 'Loading…',
  'common.error': 'An error occurred',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.refresh': 'Refresh',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.close': 'Close',
  'common.new': 'New',
  'common.create': 'Create',
  'common.back': 'Back',
  'common.next': 'Next',

  // Roles
  'role.admin': 'Admin',
  'role.developer': 'Developer',
  'role.moderator': 'Moderator',
  'role.user': 'User'
};

// ─── Translation Cache ─────────────────────────────────────────────────────────

const translationCache = new Map();

// Preload English
translationCache.set('en', { ...BASE_TRANSLATIONS });

// ─── Auto-Translate via Server Proxy ──────────────────────────────────────────

/**
 * Request a translation from the server.
 * Server proxies to DeepL / Google Translate / LibreTranslate —
 * API keys are NEVER sent to or from the client.
 *
 * @param {string} targetLang
 * @returns {Promise<Record<string, string>>}
 */
async function fetchTranslations(targetLang) {
  if (targetLang === 'en') return BASE_TRANSLATIONS;

  try {
    const res = await fetch(`/api/i18n/translations/${targetLang}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return data.translations || {};
    }
  } catch {
    // Network error — fall back to English
  }

  // Fallback: return English strings (better than empty / broken UI)
  return { ...BASE_TRANSLATIONS };
}

// ─── Translation Service ───────────────────────────────────────────────────────

class I18nService {
  constructor() {
    this._locale = 'en';
    this._translations = { ...BASE_TRANSLATIONS };
    this._listeners = new Set();
    this._loading = false;
  }

  /** Current BCP-47 locale code */
  get locale() { return this._locale; }

  /** Is the current locale right-to-left? */
  get isRTL() { return RTL_LOCALES.has(this._locale); }

  /** Locale info object */
  get localeInfo() {
    return SUPPORTED_LOCALES.find(l => l.code === this._locale) || SUPPORTED_LOCALES[0];
  }

  /** Load locale. Cached after first fetch. */
  async setLocale(code) {
    if (!SUPPORTED_LOCALES.find(l => l.code === code)) {
      console.warn(`[i18n] Unsupported locale: ${code}, falling back to en`);
      code = 'en';
    }

    if (this._locale === code && translationCache.has(code)) return;

    this._loading = true;
    let translations;

    if (translationCache.has(code)) {
      translations = translationCache.get(code);
    } else {
      translations = await fetchTranslations(code);
      translationCache.set(code, translations);
    }

    this._locale = code;
    this._translations = translations;
    this._loading = false;

    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code;
      document.documentElement.dir = RTL_LOCALES.has(code) ? 'rtl' : 'ltr';
    }

    this._notify();
  }

  /**
   * Translate a key with optional interpolation.
   * @param {string} key
   * @param {Record<string, string|number>} [vars]
   * @returns {string}
   */
  t(key, vars = {}) {
    let str = this._translations[key] || BASE_TRANSLATIONS[key] || key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{{${k}}}`, String(v));
    }
    return str;
  }

  /**
   * Translate arbitrary text (not a key) using the server auto-translate endpoint.
   * Use sparingly — meant for user-generated content.
   *
   * @param {string} text
   * @param {string} [targetLang]
   * @returns {Promise<string>}
   */
  async autoTranslate(text, targetLang = this._locale) {
    if (!text || targetLang === 'en') return text;
    try {
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: targetLang })
      });
      if (res.ok) {
        const data = await res.json();
        return data.translated || text;
      }
    } catch { /* fall through */ }
    return text;
  }

  /** Format a number using Intl */
  formatNumber(value, opts = {}) {
    return new Intl.NumberFormat(this._locale, opts).format(value);
  }

  /** Format a date using Intl */
  formatDate(date, opts = { dateStyle: 'medium' }) {
    return new Intl.DateTimeFormat(this._locale, opts).format(date instanceof Date ? date : new Date(date));
  }

  /** Format currency */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this._locale, { style: 'currency', currency }).format(amount);
  }

  /** Subscribe to locale changes */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const fn of this._listeners) fn(this._locale);
  }

  /**
   * Detect the best locale from browser settings.
   * @returns {string} locale code
   */
  static detectBrowserLocale() {
    if (typeof navigator === 'undefined') return 'en';
    const preferred = (navigator.languages || [navigator.language || 'en']);
    for (const lang of preferred) {
      const code = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_LOCALES.find(l => l.code === code)) return code;
    }
    return 'en';
  }
}

// Singleton
export const i18n = new I18nService();

// ─── React Hook ───────────────────────────────────────────────────────────────

// React must be imported by the consumer — this hook is exported for React components only.
// Import in your component: import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for i18n. Import this in React component files only.
 * Usage: const { t, locale, setLocale } = useI18n();
 * @returns {{ t: Function, locale: string, setLocale: Function, isRTL: boolean, i18n: I18nService }}
 */
export function createUseI18n(React) {
  const { useState, useEffect, useCallback } = React;
  return function useI18n() {
    const [locale, setLocaleState] = useState(i18n.locale);

    useEffect(() => {
      const unsub = i18n.subscribe(code => setLocaleState(code));
      return unsub;
    }, []);

    const setLocale = useCallback((code) => i18n.setLocale(code), []);
    // locale dependency intentional — t must re-bind when locale changes
    const t = useCallback((key, vars) => i18n.t(key, vars), [locale]);

    return { t, locale, setLocale, isRTL: i18n.isRTL, localeInfo: i18n.localeInfo, i18n };
  };
}

// ─── Locale Selector Component ─────────────────────────────────────────────────

// Named export for React consumers (import separately to avoid circular deps)
export const LOCALE_SELECTOR_DATA = SUPPORTED_LOCALES.map(l => ({
  value: l.code,
  label: `${l.flag} ${l.nativeName}`,
  flag: l.flag,
  rtl: l.rtl
}));

// ─── Auto-init: detect + set locale from browser / localStorage ───────────────

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('nexus_locale');
  const detected = stored || I18nService.detectBrowserLocale();
  // Non-blocking
  i18n.setLocale(detected).catch(() => {});
}

export default i18n;
