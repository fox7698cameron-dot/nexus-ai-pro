// src/i18n.js
// Multi-language and regional support with auto-translate
// Supported: en, es, fr, de, pt, ja, ko, zh, ar, hi, ru, it, nl, sv, pl
// Updated: 2026-10-21

const LANGUAGES = {
  en: { name: 'English', native: 'English', dir: 'ltr', region: 'US', flag: '🇺🇸' },
  es: { name: 'Spanish', native: 'Español', dir: 'ltr', region: 'ES', flag: '🇪🇸' },
  fr: { name: 'French', native: 'Français', dir: 'ltr', region: 'FR', flag: '🇫🇷' },
  de: { name: 'German', native: 'Deutsch', dir: 'ltr', region: 'DE', flag: '🇩🇪' },
  pt: { name: 'Portuguese', native: 'Português', dir: 'ltr', region: 'BR', flag: '🇧🇷' },
  ja: { name: 'Japanese', native: '日本語', dir: 'ltr', region: 'JP', flag: '🇯🇵' },
  ko: { name: 'Korean', native: '한국어', dir: 'ltr', region: 'KR', flag: '🇰🇷' },
  zh: { name: 'Chinese', native: '中文', dir: 'ltr', region: 'CN', flag: '🇨🇳' },
  ar: { name: 'Arabic', native: 'العربية', dir: 'rtl', region: 'SA', flag: '🇸🇦' },
  hi: { name: 'Hindi', native: 'हिन्दी', dir: 'ltr', region: 'IN', flag: '🇮🇳' },
  ru: { name: 'Russian', native: 'Русский', dir: 'ltr', region: 'RU', flag: '🇷🇺' },
  it: { name: 'Italian', native: 'Italiano', dir: 'ltr', region: 'IT', flag: '🇮🇹' },
  nl: { name: 'Dutch', native: 'Nederlands', dir: 'ltr', region: 'NL', flag: '🇳🇱' },
  sv: { name: 'Swedish', native: 'Svenska', dir: 'ltr', region: 'SE', flag: '🇸🇪' },
  pl: { name: 'Polish', native: 'Polski', dir: 'ltr', region: 'PL', flag: '🇵🇱' },
};

// Base English strings
const BASE_STRINGS = {
  'app.name': 'Nexus AI Pro',
  'nav.chat': 'Chat',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.gamedev': 'Game Dev',
  'nav.settings': 'Settings',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.mfa': 'Multi-Factor Auth',
  'auth.biometric': 'Biometric Auth',
  'chat.send': 'Send',
  'chat.placeholder': 'Type a message...',
  'chat.new': 'New Chat',
  'security.scan': 'Run Security Scan',
  'security.score': 'Security Score',
  'subscription.upgrade': 'Upgrade Plan',
  'subscription.current': 'Current Plan',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.search': 'Search',
};

// Simple translation cache
const translationCache = new Map();
translationCache.set('en', { ...BASE_STRINGS });

// Detect browser/system language
function detectLanguage() {
  const stored = (() => { try { return localStorage.getItem('nexus:language'); } catch { return null; } })();
  if (stored && LANGUAGES[stored]) return stored;
  const browser = navigator.language?.split('-')[0]?.toLowerCase();
  return LANGUAGES[browser] ? browser : 'en';
}

// Auto-translate using the server's translation endpoint
// The server proxies to a translation service; no API key is exposed client-side
async function autoTranslate(strings, targetLang) {
  if (targetLang === 'en') return { ...BASE_STRINGS };
  if (translationCache.has(targetLang)) return translationCache.get(targetLang);

  try {
    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strings, targetLang }),
    });
    if (resp.ok) {
      const data = await resp.json();
      translationCache.set(targetLang, data.translated || { ...BASE_STRINGS });
      return translationCache.get(targetLang);
    }
  } catch {
    // Fall back to English if translation unavailable
  }
  return { ...BASE_STRINGS };
}

class I18n {
  constructor() {
    this.currentLang = detectLanguage();
    this.strings = { ...BASE_STRINGS };
    this.listeners = new Set();
    this._load(this.currentLang);
  }

  async _load(lang) {
    this.strings = await autoTranslate(BASE_STRINGS, lang);
    this.listeners.forEach(fn => fn(lang));
  }

  async setLanguage(lang) {
    if (!LANGUAGES[lang]) return;
    this.currentLang = lang;
    try { localStorage.setItem('nexus:language', lang); } catch {}
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES[lang].dir;
    await this._load(lang);
  }

  t(key, replacements = {}) {
    let str = this.strings[key] || BASE_STRINGS[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
    return str;
  }

  getLanguages() {
    return LANGUAGES;
  }

  getCurrentLanguage() {
    return { key: this.currentLang, ...LANGUAGES[this.currentLang] };
  }

  onLanguageChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  formatDate(date, options = {}) {
    const lang = this.currentLang;
    const region = LANGUAGES[lang]?.region || 'US';
    return new Intl.DateTimeFormat(`${lang}-${region}`, { ...options }).format(date instanceof Date ? date : new Date(date));
  }

  formatNumber(n, options = {}) {
    const lang = this.currentLang;
    const region = LANGUAGES[lang]?.region || 'US';
    return new Intl.NumberFormat(`${lang}-${region}`, { ...options }).format(n);
  }

  formatCurrency(amount, currency = 'USD') {
    const lang = this.currentLang;
    const region = LANGUAGES[lang]?.region || 'US';
    return new Intl.NumberFormat(`${lang}-${region}`, { style: 'currency', currency }).format(amount);
  }
}

export const i18n = new I18n();
export { LANGUAGES };
export default i18n;
