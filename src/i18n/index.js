// i18n/index.js - 2026-10-07
// Multi-language support with auto-translate fallback

const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr', region: 'US' },
  { code: 'es', name: 'Español', dir: 'ltr', region: 'ES' },
  { code: 'fr', name: 'Français', dir: 'ltr', region: 'FR' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', region: 'DE' },
  { code: 'ja', name: '日本語', dir: 'ltr', region: 'JP' },
  { code: 'zh', name: '中文 (简体)', dir: 'ltr', region: 'CN' },
  { code: 'zh-TW', name: '中文 (繁體)', dir: 'ltr', region: 'TW' },
  { code: 'ko', name: '한국어', dir: 'ltr', region: 'KR' },
  { code: 'pt', name: 'Português', dir: 'ltr', region: 'BR' },
  { code: 'ar', name: 'العربية', dir: 'rtl', region: 'SA' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', region: 'IN' },
  { code: 'ru', name: 'Русский', dir: 'ltr', region: 'RU' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', region: 'TR' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', region: 'NL' },
  { code: 'pl', name: 'Polski', dir: 'ltr', region: 'PL' },
  { code: 'sv', name: 'Svenska', dir: 'ltr', region: 'SE' },
  { code: 'it', name: 'Italiano', dir: 'ltr', region: 'IT' }
];

const BASE_STRINGS = {
  en: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Home',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.projects': 'Projects',
    'nav.settings': 'Settings',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.username': 'Username',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.rememberDevice': 'Remember this device',
    'auth.biometric.fingerprint': 'Fingerprint / Touch ID',
    'auth.biometric.faceId': 'Face ID',
    'auth.biometric.retinal': 'Retinal Scan',
    'auth.mfa.title': 'Two-Factor Verification',
    'auth.mfa.enter': 'Enter 6-digit code',
    'payment.subscribe': 'Subscribe',
    'payment.upgrade': 'Upgrade Plan',
    'payment.cancel': 'Cancel Subscription',
    'payment.billing': 'Billing History',
    'payment.method': 'Payment Method',
    'payment.crypto': 'Pay with Crypto',
    'payment.giftcard': 'Redeem Gift Card',
    'dashboard.security': 'Security Dashboard',
    'dashboard.analytics': 'Analytics Dashboard',
    'dashboard.projects': 'Project Tracker',
    'dashboard.admin': 'Admin Dashboard',
    'dashboard.developer': 'Developer Dashboard',
    'dashboard.moderator': 'Moderator Dashboard',
    'scan.running': 'Scanning…',
    'scan.complete': 'Scan Complete',
    'scan.runScan': 'Run Scan',
    'status.healthy': 'All Clear',
    'status.warning': 'Attention Required',
    'status.critical': 'Critical Issues',
    'project.newProject': 'New Project',
    'project.gameDev': 'Game Development',
    'project.arvr': 'AR / VR / 3D',
    'project.coding': 'Coding',
    'project.mobile': 'Mobile App',
    'connector.connected': 'Connected',
    'connector.disconnected': 'Disconnected',
    'connector.configure': 'Configure',
    'error.required': 'This field is required',
    'error.invalidEmail': 'Enter a valid email address',
    'error.passwordWeak': 'Password does not meet requirements',
    'error.passwordMismatch': 'Passwords do not match',
    'error.generic': 'Something went wrong. Please try again.',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.export': 'Export',
    'action.import': 'Import',
    'action.refresh': 'Refresh',
    'action.search': 'Search',
    'time.24h': 'Last 24 hours',
    'time.7d': 'Last 7 days',
    'time.30d': 'Last 30 days',
    'time.90d': 'Last 90 days'
  }
};

class I18nManager {
  #locale = 'en';
  #translations = new Map();
  #translateApiUrl = null;
  #listeners = new Set();

  constructor() {
    this.#translateApiUrl = typeof import.meta !== 'undefined'
      ? import.meta.env?.VITE_TRANSLATE_API_URL
      : process.env.TRANSLATE_API_URL;

    this.#translations.set('en', BASE_STRINGS.en);
    this.#locale = this.#detectLocale();
  }

  #detectLocale() {
    try {
      const stored = localStorage.getItem('nexus:locale');
      if (stored && SUPPORTED_LOCALES.find(l => l.code === stored)) return stored;
    } catch {}

    const browserLang = navigator?.language || navigator?.userLanguage || 'en';
    const code = browserLang.split('-')[0];
    return SUPPORTED_LOCALES.find(l => l.code === code || l.code === browserLang)?.code || 'en';
  }

  get locale() { return this.#locale; }
  get localeInfo() { return SUPPORTED_LOCALES.find(l => l.code === this.#locale) || SUPPORTED_LOCALES[0]; }
  get supportedLocales() { return SUPPORTED_LOCALES; }

  async setLocale(code) {
    if (!SUPPORTED_LOCALES.find(l => l.code === code)) return;
    this.#locale = code;

    try { localStorage.setItem('nexus:locale', code); } catch {}

    if (!this.#translations.has(code)) {
      await this.#loadTranslations(code);
    }

    const info = this.localeInfo;
    document.documentElement.lang = code;
    document.documentElement.dir = info.dir;
    this.#notify();
  }

  async #loadTranslations(code) {
    if (code === 'en') return;

    // Try translation API first
    if (this.#translateApiUrl) {
      try {
        const res = await fetch(`${this.#translateApiUrl}/locale/${code}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          this.#translations.set(code, data);
          return;
        }
      } catch {}
    }

    // Auto-translate via server proxy (no API key exposed to client)
    try {
      const keys = Object.keys(BASE_STRINGS.en);
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLang: code, strings: BASE_STRINGS.en })
      });
      if (res.ok) {
        const data = await res.json();
        this.#translations.set(code, data.translations || {});
        return;
      }
    } catch {}

    // Fallback: use English
    this.#translations.set(code, BASE_STRINGS.en);
  }

  t(key, vars = {}) {
    const dict = this.#translations.get(this.#locale) || BASE_STRINGS.en;
    let str = dict[key] || BASE_STRINGS.en[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
    return str;
  }

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #notify() {
    this.#listeners.forEach(fn => fn(this.#locale));
  }
}

export const i18n = new I18nManager();
export { SUPPORTED_LOCALES };

// React hook
export function useTranslation() {
  const [locale, setLocale] = React.useState(i18n.locale);
  React.useEffect(() => i18n.subscribe(setLocale), []);
  return {
    t: (key, vars) => i18n.t(key, vars),
    locale,
    setLocale: code => i18n.setLocale(code),
    localeInfo: i18n.localeInfo,
    supportedLocales: i18n.supportedLocales
  };
}

// Must import React for the hook - guard for non-React environments
import * as React from 'react';
