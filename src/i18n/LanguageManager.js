/**
 * LanguageManager.js
 * Created: 2026-10-24
 * Multi-language and regional support with auto-translate capability
 */

export const SUPPORTED_LOCALES = {
  'en': { name: 'English', nativeName: 'English', dir: 'ltr', region: 'US' },
  'es': { name: 'Spanish', nativeName: 'Español', dir: 'ltr', region: 'ES' },
  'fr': { name: 'French', nativeName: 'Français', dir: 'ltr', region: 'FR' },
  'de': { name: 'German', nativeName: 'Deutsch', dir: 'ltr', region: 'DE' },
  'ja': { name: 'Japanese', nativeName: '日本語', dir: 'ltr', region: 'JP' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '中文(简体)', dir: 'ltr', region: 'CN' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '中文(繁體)', dir: 'ltr', region: 'TW' },
  'ko': { name: 'Korean', nativeName: '한국어', dir: 'ltr', region: 'KR' },
  'pt': { name: 'Portuguese', nativeName: 'Português', dir: 'ltr', region: 'BR' },
  'ar': { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', region: 'SA' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', region: 'IN' },
  'ru': { name: 'Russian', nativeName: 'Русский', dir: 'ltr', region: 'RU' },
  'it': { name: 'Italian', nativeName: 'Italiano', dir: 'ltr', region: 'IT' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', region: 'NL' },
  'pl': { name: 'Polish', nativeName: 'Polski', dir: 'ltr', region: 'PL' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', region: 'TR' },
  'sv': { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr', region: 'SE' },
};

// Base English strings — all other locales fall back here
const BASE_STRINGS = {
  // Auth
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.confirm_password': 'Confirm Password',
  'auth.mfa_prompt': 'Enter your 6-digit authenticator code',
  'auth.biometric_prompt': 'Authenticate with biometrics',
  'auth.password_hint': 'Min 13 characters with uppercase, lowercase, number, and special character',
  'auth.forgot_password': 'Forgot password?',
  'auth.already_account': 'Already have an account?',
  'auth.no_account': "Don't have an account?",

  // Dashboards
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.projects': 'Projects',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'nav.dashboard': 'Dashboard',

  // Analytics
  'analytics.title': 'Analytics Dashboard',
  'analytics.total_reach': 'Total Reach',
  'analytics.total_views': 'Total Views',
  'analytics.engagement': 'Engagement Rate',
  'analytics.followers': 'Followers',
  'analytics.retention': 'Retention',
  'analytics.likes': 'Likes',
  'analytics.shares': 'Shares',
  'analytics.comments': 'Comments',
  'analytics.live_viewers': 'Live Viewers',
  'analytics.peak_viewers': 'Peak Viewers',
  'analytics.watch_time': 'Watch Time',
  'analytics.real_time': 'Real-Time',
  'analytics.last_updated': 'Last updated',

  // Security
  'security.title': 'Security Center',
  'security.scan_now': 'Run Scan',
  'security.scanning': 'Scanning…',
  'security.score': 'Security Score',
  'security.threats': 'Active Threats',
  'security.vulnerabilities': 'Vulnerabilities',
  'security.network': 'Network',
  'security.device': 'Device',
  'security.encryption': 'Encryption',
  'security.status_secure': 'Secure',
  'security.status_warning': 'Warning',
  'security.status_critical': 'Critical',

  // Projects
  'projects.title': 'Project Tracker',
  'projects.new': 'New Project',
  'projects.status.active': 'Active',
  'projects.status.completed': 'Completed',
  'projects.status.paused': 'Paused',
  'projects.type.coding': 'Coding',
  'projects.type.game': 'Game Dev',
  'projects.type.ar_vr': 'AR/VR',
  'projects.type.app': 'App Dev',

  // General
  'common.loading': 'Loading…',
  'common.error': 'An error occurred',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.export': 'Export',
  'common.refresh': 'Refresh',
};

export class LanguageManager {
  constructor() {
    this.locale = this._detectLocale();
    this.strings = new Map([['en', BASE_STRINGS]]);
    this.translationCache = new Map();
    this._applyDirection();
  }

  get currentLocale() { return this.locale; }
  get localeInfo() { return SUPPORTED_LOCALES[this.locale] || SUPPORTED_LOCALES['en']; }
  get isRTL() { return this.localeInfo.dir === 'rtl'; }

  setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) return false;
    this.locale = locale;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', locale);
    this._applyDirection();
    return true;
  }

  t(key, params = {}) {
    const localeStrings = this.strings.get(this.locale) || {};
    const baseStrings = this.strings.get('en') || BASE_STRINGS;
    let str = localeStrings[key] ?? baseStrings[key] ?? key;

    // Simple {placeholder} interpolation
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return str;
  }

  // Load translations for a locale (call when switching)
  loadTranslations(locale, strings) {
    this.strings.set(locale, { ...BASE_STRINGS, ...strings });
  }

  // Auto-translate via server endpoint (requires API key server-side)
  async autoTranslate(text, targetLocale = this.locale, sourceLocale = 'en') {
    if (targetLocale === sourceLocale) return text;
    const cacheKey = `${sourceLocale}:${targetLocale}:${text}`;
    if (this.translationCache.has(cacheKey)) return this.translationCache.get(cacheKey);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: sourceLocale, target: targetLocale }),
      });
      if (!res.ok) return text;
      const { translated } = await res.json();
      this.translationCache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    }
  }

  format = {
    date: (ts) => new Intl.DateTimeFormat(this.locale).format(new Date(ts)),
    time: (ts) => new Intl.DateTimeFormat(this.locale, { timeStyle: 'short' }).format(new Date(ts)),
    number: (n) => new Intl.NumberFormat(this.locale).format(n),
    currency: (amount, currency = 'USD') =>
      new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(amount),
    relativeTime: (ts) => {
      const diff = ts - Date.now();
      const abs = Math.abs(diff);
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
      if (abs < 60000) return rtf.format(Math.round(diff / 1000), 'second');
      if (abs < 3600000) return rtf.format(Math.round(diff / 60000), 'minute');
      if (abs < 86400000) return rtf.format(Math.round(diff / 3600000), 'hour');
      return rtf.format(Math.round(diff / 86400000), 'day');
    },
  };

  _detectLocale() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('nexus:locale');
      if (stored && SUPPORTED_LOCALES[stored]) return stored;
    }
    if (typeof navigator !== 'undefined') {
      const nav = navigator.language || navigator.languages?.[0] || 'en';
      const base = nav.split('-')[0];
      if (SUPPORTED_LOCALES[nav]) return nav;
      if (SUPPORTED_LOCALES[base]) return base;
    }
    return 'en';
  }

  _applyDirection() {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', this.localeInfo.dir);
      document.documentElement.setAttribute('lang', this.locale);
    }
  }
}

export const lang = new LanguageManager();
