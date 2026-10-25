// src/i18n/i18n.js
// Updated: 2026-10-25
// Multi-language, regional support, auto-translate via Google Cloud Translation

export const SUPPORTED_LOCALES = {
  'en': { name: 'English', dir: 'ltr', region: 'US' },
  'es': { name: 'Español', dir: 'ltr', region: 'ES' },
  'fr': { name: 'Français', dir: 'ltr', region: 'FR' },
  'de': { name: 'Deutsch', dir: 'ltr', region: 'DE' },
  'ja': { name: '日本語', dir: 'ltr', region: 'JP' },
  'zh-CN': { name: '中文（简体）', dir: 'ltr', region: 'CN' },
  'zh-TW': { name: '中文（繁體）', dir: 'ltr', region: 'TW' },
  'ko': { name: '한국어', dir: 'ltr', region: 'KR' },
  'pt': { name: 'Português', dir: 'ltr', region: 'BR' },
  'ar': { name: 'العربية', dir: 'rtl', region: 'SA' },
  'hi': { name: 'हिन्दी', dir: 'ltr', region: 'IN' },
  'ru': { name: 'Русский', dir: 'ltr', region: 'RU' },
  'it': { name: 'Italiano', dir: 'ltr', region: 'IT' },
  'nl': { name: 'Nederlands', dir: 'ltr', region: 'NL' },
  'tr': { name: 'Türkçe', dir: 'ltr', region: 'TR' },
  'pl': { name: 'Polski', dir: 'ltr', region: 'PL' },
  'vi': { name: 'Tiếng Việt', dir: 'ltr', region: 'VN' },
  'th': { name: 'ภาษาไทย', dir: 'ltr', region: 'TH' },
  'id': { name: 'Bahasa Indonesia', dir: 'ltr', region: 'ID' },
  'uk': { name: 'Українська', dir: 'ltr', region: 'UA' }
};

// Baseline English strings
const EN_STRINGS = {
  'nav.home': 'Home',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.projects': 'Projects',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.password_placeholder': 'Password (13+ characters)',
  'auth.mfa_prompt': 'Enter your 6-digit authentication code',
  'auth.biometric': 'Use Biometrics',
  'auth.forgot_password': 'Forgot password?',
  'dashboard.welcome': 'Welcome back, {name}',
  'dashboard.realtime': 'Real-time',
  'dashboard.loading': 'Loading...',
  'analytics.title': 'Analytics Dashboard',
  'analytics.social_media': 'Social Media',
  'analytics.reach': 'Reach',
  'analytics.engagement': 'Engagement',
  'analytics.retention': 'Retention',
  'analytics.likes': 'Likes',
  'security.title': 'Security Dashboard',
  'security.scan': 'Run Scan',
  'security.scanning': 'Scanning...',
  'security.threats': 'Threats Detected',
  'security.network': 'Network Status',
  'projects.title': 'Project Tracker',
  'projects.game_dev': 'Game Development',
  'projects.ar_vr': 'AR / VR / 3D',
  'projects.coding': 'Coding',
  'error.generic': 'Something went wrong. Please try again.',
  'error.auth': 'Authentication failed',
  'error.network': 'Network error'
};

export class I18nService {
  constructor() {
    this._translations = new Map([['en', EN_STRINGS]]);
    this._translateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    this._cache = new Map();
    this._currentLocale = 'en';
  }

  setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) return false;
    this._currentLocale = locale;
    return true;
  }

  t(key, vars = {}) {
    const locale = this._currentLocale;
    const dict = this._translations.get(locale) || this._translations.get('en') || {};
    const fallback = this._translations.get('en') || {};
    let str = dict[key] ?? fallback[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }

  // ─── Auto-translate a string via Google Cloud Translation ──────────────
  async translateText(text, targetLocale, sourceLocale = 'en') {
    if (targetLocale === sourceLocale) return text;
    if (!this._translateApiKey) return text;

    const cacheKey = `${sourceLocale}:${targetLocale}:${text}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    const url = `https://translation.googleapis.com/language/translate/v2?key=${this._translateApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: sourceLocale, target: targetLocale, format: 'text' })
    });

    if (!response.ok) return text;
    const data = await response.json();
    const translated = data?.data?.translations?.[0]?.translatedText ?? text;
    this._cache.set(cacheKey, translated);
    return translated;
  }

  // ─── Batch auto-translate all EN strings to a target locale ────────────
  async loadLocale(targetLocale) {
    if (targetLocale === 'en' || this._translations.has(targetLocale)) return;
    if (!this._translateApiKey) {
      this._translations.set(targetLocale, {}); // fall back to English
      return;
    }

    const entries = Object.entries(EN_STRINGS);
    const texts = entries.map(([, v]) => v);

    const url = `https://translation.googleapis.com/language/translate/v2?key=${this._translateApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'en', target: targetLocale, format: 'text' })
    });

    if (!response.ok) { this._translations.set(targetLocale, {}); return; }

    const data = await response.json();
    const translated = data?.data?.translations || [];
    const dict = {};
    entries.forEach(([key], i) => {
      dict[key] = translated[i]?.translatedText ?? EN_STRINGS[key];
    });
    this._translations.set(targetLocale, dict);
  }

  getDirection(locale) {
    return SUPPORTED_LOCALES[locale]?.dir || 'ltr';
  }

  getSupportedLocales() {
    return Object.entries(SUPPORTED_LOCALES).map(([code, info]) => ({ code, ...info }));
  }
}

export const i18n = new I18nService();
export default i18n;
