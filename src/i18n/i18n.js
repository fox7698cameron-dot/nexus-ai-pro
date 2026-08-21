/**
 * i18n.js
 * Nexus AI Pro — Internationalization & Auto-Translate Service
 * Features: Multi-language support, regional settings, auto-translate via backend
 * Supported languages: 50+ (see SUPPORTED_LANGUAGES)
 * RTL support: Arabic, Hebrew, Farsi, Urdu
 * Updated: 2026-08-21
 */

'use strict';

// ─── Supported languages ──────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (PT)', rtl: false, flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false, flag: '🇷🇺' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文(简体)', rtl: false, flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文(繁體)', rtl: false, flag: '🇹🇼' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false, flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false, flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true, flag: '🇮🇱' },
  { code: 'fa', name: 'Persian/Farsi', nativeName: 'فارسی', rtl: true, flag: '🇮🇷' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true, flag: '🇵🇰' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false, flag: '🇧🇩' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false, flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false, flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', rtl: false, flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false, flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', rtl: false, flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', rtl: false, flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', rtl: false, flag: '🇫🇮' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', rtl: false, flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', rtl: false, flag: '🇸🇰' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', rtl: false, flag: '🇷🇴' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', rtl: false, flag: '🇭🇺' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', rtl: false, flag: '🇬🇷' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', rtl: false, flag: '🇺🇦' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, flag: '🇻🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', rtl: false, flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false, flag: '🇲🇾' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', rtl: false, flag: '🇵🇭' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false, flag: '🇰🇪' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', rtl: false, flag: '🇪🇹' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', rtl: false, flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', rtl: false, flag: '🇿🇦' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', rtl: false, flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', rtl: false, flag: '🇭🇷' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', rtl: false, flag: '🇧🇬' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', rtl: false, flag: '🇱🇹' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', rtl: false, flag: '🇱🇻' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', rtl: false, flag: '🇪🇪' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', rtl: false, flag: '🇸🇮' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', rtl: false, flag: '🇷🇸' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', rtl: false, flag: '🇲🇰' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', rtl: false, flag: '🇦🇱' },
];

// ─── Regional settings ────────────────────────────────────────────────────────
export const REGIONS = {
  US: { name: 'United States', currency: 'USD', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', timezone: 'America/New_York' },
  GB: { name: 'United Kingdom', currency: 'GBP', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', timezone: 'Europe/London' },
  EU: { name: 'European Union', currency: 'EUR', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', timezone: 'Europe/Paris' },
  CA: { name: 'Canada', currency: 'CAD', dateFormat: 'YYYY-MM-DD', timeFormat: '12h', timezone: 'America/Toronto' },
  AU: { name: 'Australia', currency: 'AUD', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', timezone: 'Australia/Sydney' },
  JP: { name: 'Japan', currency: 'JPY', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', timezone: 'Asia/Tokyo' },
  CN: { name: 'China', currency: 'CNY', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', timezone: 'Asia/Shanghai' },
  IN: { name: 'India', currency: 'INR', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', timezone: 'Asia/Kolkata' },
  BR: { name: 'Brazil', currency: 'BRL', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', timezone: 'America/Sao_Paulo' },
  SA: { name: 'Saudi Arabia', currency: 'SAR', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', timezone: 'Asia/Riyadh' },
};

// ─── Base English translations ────────────────────────────────────────────────
const EN_STRINGS = {
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.error': 'An error occurred.',
  'common.success': 'Success!',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.submit': 'Submit',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.refresh': 'Refresh',
  'common.logout': 'Sign Out',
  'common.settings': 'Settings',
  'common.help': 'Help',
  // Auth
  'auth.signin': 'Sign In',
  'auth.signup': 'Create Account',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.forgotPassword': 'Forgot password?',
  'auth.rememberMe': 'Remember me',
  'auth.twoFA': 'Two-Factor Authentication',
  'auth.biometric': 'Biometric Authentication',
  'auth.mfa': 'Multi-Factor Authentication',
  // Dashboard
  'dashboard.analytics': 'Analytics',
  'dashboard.security': 'Security',
  'dashboard.game': 'Game Development',
  'dashboard.payments': 'Payments',
  'dashboard.profile': 'Profile',
  // Payments
  'payments.subscribe': 'Subscribe',
  'payments.upgrade': 'Upgrade Plan',
  'payments.cancel': 'Cancel Subscription',
  'payments.giftCard': 'Gift Card',
  'payments.crypto': 'Crypto Payment',
  // Security
  'security.scan': 'Run Security Scan',
  'security.threats': 'Threats Detected',
  'security.secure': 'System Secure',
};

// ─── Translation cache ────────────────────────────────────────────────────────
const _cache = new Map([['en', EN_STRINGS]]);
let _currentLang = 'en';
let _currentRegion = 'US';
const _listeners = new Set();

// ─── Detect user language ─────────────────────────────────────────────────────
export function detectLanguage() {
  const stored = (() => { try { return localStorage.getItem('nexus:lang'); } catch { return null; } })();
  if (stored) return stored;
  const nav = navigator.language || navigator.userLanguage || 'en';
  const base = nav.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find((l) => l.code === nav || l.code === base);
  return supported?.code || 'en';
}

// ─── Get direction for language ───────────────────────────────────────────────
export function isRTL(langCode) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === langCode)?.rtl || false;
}

// ─── Translate via backend ────────────────────────────────────────────────────
async function fetchTranslations(langCode) {
  if (_cache.has(langCode)) return _cache.get(langCode);

  try {
    const res = await fetch(`/api/i18n/${encodeURIComponent(langCode)}`);
    if (!res.ok) throw new Error('Not found');
    const strings = await res.json();
    _cache.set(langCode, strings);
    return strings;
  } catch {
    // Fall back to English
    return EN_STRINGS;
  }
}

// ─── Translate a dynamic string ───────────────────────────────────────────────
export async function autoTranslate(text, targetLang, sourceLang = 'en') {
  if (!text || targetLang === sourceLang) return text;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: sourceLang, to: targetLang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translatedText || text;
  } catch {
    return text;
  }
}

// ─── I18n class ──────────────────────────────────────────────────────────────
export class I18n {
  get language() { return _currentLang; }
  get region() { return _currentRegion; }
  get isRTL() { return isRTL(_currentLang); }
  get direction() { return isRTL(_currentLang) ? 'rtl' : 'ltr'; }
  get languageInfo() { return SUPPORTED_LANGUAGES.find((l) => l.code === _currentLang) || SUPPORTED_LANGUAGES[0]; }
  get regionInfo() { return REGIONS[_currentRegion] || REGIONS.US; }

  /** Initialize — detects language and loads strings */
  async init() {
    const lang = detectLanguage();
    await this.setLanguage(lang);
  }

  /** Change language */
  async setLanguage(langCode) {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    if (!lang) return;
    _currentLang = langCode;
    try { localStorage.setItem('nexus:lang', langCode); } catch { /* no-op */ }

    // Apply RTL to document
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = langCode;
    }

    await fetchTranslations(langCode);
    _listeners.forEach((fn) => fn(langCode));
  }

  /** Set region */
  setRegion(regionCode) {
    if (!REGIONS[regionCode]) return;
    _currentRegion = regionCode;
    try { localStorage.setItem('nexus:region', regionCode); } catch { /* no-op */ }
  }

  /** Translate a key with optional interpolation */
  t(key, vars = {}) {
    const strings = _cache.get(_currentLang) || EN_STRINGS;
    let str = strings[key] || EN_STRINGS[key] || key;
    // Replace {{var}} placeholders
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
    return str;
  }

  /** Auto-translate a raw string */
  async translate(text, targetLang) {
    return autoTranslate(text, targetLang || _currentLang);
  }

  /** Format a date according to the current region */
  formatDate(date, options = {}) {
    return new Intl.DateTimeFormat(_currentLang, {
      timeZone: this.regionInfo.timezone,
      ...options,
    }).format(date instanceof Date ? date : new Date(date));
  }

  /** Format a number according to the current language */
  formatNumber(n, options = {}) {
    return new Intl.NumberFormat(_currentLang, options).format(n);
  }

  /** Format currency according to region */
  formatCurrency(amount, currency) {
    const cur = currency || this.regionInfo.currency;
    return new Intl.NumberFormat(_currentLang, { style: 'currency', currency: cur }).format(amount);
  }

  /** Subscribe to language changes */
  onLanguageChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const i18n = new I18n();
