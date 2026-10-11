/* src/i18n/index.js
   Created: 2026-10-11
   Internationalization Module - Multi-language and Regional Support
   Supports: 15+ languages with auto-translation capability
*/

import { translations } from './translations.js';

// ---------------------------------------------------------------------------
// Language registry
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: 'en',    name: 'English',              nativeName: 'English',              rtl: false },
  { code: 'es',    name: 'Spanish',              nativeName: 'Español',              rtl: false },
  { code: 'fr',    name: 'French',               nativeName: 'Français',             rtl: false },
  { code: 'de',    name: 'German',               nativeName: 'Deutsch',              rtl: false },
  { code: 'it',    name: 'Italian',              nativeName: 'Italiano',             rtl: false },
  { code: 'pt',    name: 'Portuguese',           nativeName: 'Português',            rtl: false },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文（简体）',           rtl: false },
  { code: 'zh-TW', name: 'Chinese (Traditional)',nativeName: '中文（繁體）',           rtl: false },
  { code: 'ja',    name: 'Japanese',             nativeName: '日本語',               rtl: false },
  { code: 'ko',    name: 'Korean',               nativeName: '한국어',               rtl: false },
  { code: 'ar',    name: 'Arabic',               nativeName: 'العربية',              rtl: true  },
  { code: 'hi',    name: 'Hindi',                nativeName: 'हिन्दी',               rtl: false },
  { code: 'ru',    name: 'Russian',              nativeName: 'Русский',              rtl: false },
  { code: 'nl',    name: 'Dutch',                nativeName: 'Nederlands',           rtl: false },
  { code: 'pl',    name: 'Polish',               nativeName: 'Polski',               rtl: false },
];

// Regional formatting settings keyed by language code.
// BCP-47 locale tags are used for Intl APIs.
const LOCALE_CONFIG = {
  'en':    { locale: 'en-US',  currency: 'USD', dateStyle: 'medium', timeStyle: 'short' },
  'es':    { locale: 'es-ES',  currency: 'EUR', dateStyle: 'medium', timeStyle: 'short' },
  'fr':    { locale: 'fr-FR',  currency: 'EUR', dateStyle: 'medium', timeStyle: 'short' },
  'de':    { locale: 'de-DE',  currency: 'EUR', dateStyle: 'medium', timeStyle: 'short' },
  'it':    { locale: 'it-IT',  currency: 'EUR', dateStyle: 'medium', timeStyle: 'short' },
  'pt':    { locale: 'pt-BR',  currency: 'BRL', dateStyle: 'medium', timeStyle: 'short' },
  'zh-CN': { locale: 'zh-CN',  currency: 'CNY', dateStyle: 'medium', timeStyle: 'short' },
  'zh-TW': { locale: 'zh-TW',  currency: 'TWD', dateStyle: 'medium', timeStyle: 'short' },
  'ja':    { locale: 'ja-JP',  currency: 'JPY', dateStyle: 'medium', timeStyle: 'short' },
  'ko':    { locale: 'ko-KR',  currency: 'KRW', dateStyle: 'medium', timeStyle: 'short' },
  'ar':    { locale: 'ar-SA',  currency: 'SAR', dateStyle: 'medium', timeStyle: 'short' },
  'hi':    { locale: 'hi-IN',  currency: 'INR', dateStyle: 'medium', timeStyle: 'short' },
  'ru':    { locale: 'ru-RU',  currency: 'RUB', dateStyle: 'medium', timeStyle: 'short' },
  'nl':    { locale: 'nl-NL',  currency: 'EUR', dateStyle: 'medium', timeStyle: 'short' },
  'pl':    { locale: 'pl-PL',  currency: 'PLN', dateStyle: 'medium', timeStyle: 'short' },
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _currentLanguage = 'en';

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Detect the user's preferred language from the browser environment.
 * Falls back to 'en' when no match is found.
 * @returns {string} Language code
 */
function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';

  const candidates = navigator.languages
    ? [...navigator.languages]
    : [navigator.language || navigator.userLanguage || 'en'];

  for (const raw of candidates) {
    const tag = raw.trim();

    // Exact match (e.g. "zh-CN")
    if (LANGUAGES.some(l => l.code === tag)) return tag;

    // Primary subtag match (e.g. "en-GB" → "en")
    const primary = tag.split('-')[0];
    const match = LANGUAGES.find(l => l.code === primary);
    if (match) return match.code;
  }

  return 'en';
}

/**
 * Resolve a dot-separated key path within an object.
 * @param {Object} obj
 * @param {string} keyPath  e.g. "auth.login"
 * @returns {string|undefined}
 */
function resolve(obj, keyPath) {
  return keyPath.split('.').reduce((node, part) => {
    return node != null && typeof node === 'object' ? node[part] : undefined;
  }, obj);
}

/**
 * Interpolate `{param}` placeholders in a string.
 * @param {string} template
 * @param {Object} [params]
 * @returns {string}
 */
function interpolate(template, params) {
  if (!params || typeof params !== 'object') return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : `{${key}}`;
  });
}

/**
 * Retrieve the locale configuration for a given language code.
 * @param {string} lang
 * @returns {Object}
 */
function getLocaleConfig(lang) {
  return LOCALE_CONFIG[lang] || LOCALE_CONFIG['en'];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate a key, with optional parameter interpolation.
 *
 * @param {string} key     Dot-separated translation key, e.g. "auth.login"
 * @param {Object} [params] Named parameters for placeholder substitution
 * @returns {string}
 */
function t(key, params) {
  const langData  = translations[_currentLanguage];
  const fallback  = translations['en'];

  // Try the active language first, then fall back to English.
  let template = resolve(langData, key) || resolve(fallback, key);

  if (template == null) {
    // Return the raw key as a last resort so missing keys are visible.
    console.warn(`[i18n] Missing translation key: "${key}" (lang: ${_currentLanguage})`);
    return key;
  }

  return interpolate(template, params);
}

/**
 * Switch the active language.
 *
 * @param {string} lang  Language code (e.g. "fr", "zh-CN")
 * @throws {Error} When the requested language is not supported
 */
function setLanguage(lang) {
  if (!LANGUAGES.some(l => l.code === lang)) {
    throw new Error(`[i18n] Unsupported language: "${lang}". ` +
      `Supported: ${LANGUAGES.map(l => l.code).join(', ')}`);
  }
  _currentLanguage = lang;

  // Update <html dir> and <html lang> when running in a browser.
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }
}

/**
 * Return the currently active language code.
 * @returns {string}
 */
function getCurrentLanguage() {
  return _currentLanguage;
}

/**
 * Return metadata for every supported language.
 * @returns {Array<{code: string, name: string, nativeName: string, rtl: boolean}>}
 */
function getAvailableLanguages() {
  return LANGUAGES.slice(); // shallow copy to prevent mutation
}

/**
 * Whether the given (or current) language is written right-to-left.
 * @param {string} [lang]
 * @returns {boolean}
 */
function isRTL(lang) {
  const code = lang || _currentLanguage;
  const entry = LANGUAGES.find(l => l.code === code);
  return entry ? entry.rtl : false;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a numeric amount as currency using regional conventions.
 *
 * @param {number} amount
 * @param {string} [overrideCurrency]  ISO 4217 code; defaults to the region's currency
 * @param {string} [lang]              Language code; defaults to current language
 * @returns {string}
 */
function formatCurrency(amount, overrideCurrency, lang) {
  const { locale, currency } = getLocaleConfig(lang || _currentLanguage);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: overrideCurrency || currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // If Intl.NumberFormat is unavailable (e.g. older environments), degrade gracefully.
    return `${overrideCurrency || currency} ${amount}`;
  }
}

/**
 * Format a Date object or timestamp using regional conventions.
 *
 * @param {Date|number|string} date
 * @param {'date'|'time'|'datetime'} [mode='datetime']
 * @param {string} [lang]  Language code; defaults to current language
 * @returns {string}
 */
function formatDate(date, mode, lang) {
  const { locale, dateStyle, timeStyle } = getLocaleConfig(lang || _currentLanguage);
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    console.warn('[i18n] formatDate received an invalid date:', date);
    return String(date);
  }

  const resolvedMode = mode || 'datetime';

  try {
    const opts = {};
    if (resolvedMode === 'date' || resolvedMode === 'datetime') opts.dateStyle = dateStyle;
    if (resolvedMode === 'time' || resolvedMode === 'datetime') opts.timeStyle = timeStyle;
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch (e) {
    return d.toLocaleString();
  }
}

/**
 * Format a number using regional conventions (decimal separators, grouping, etc.).
 *
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]  Additional Intl options
 * @param {string} [lang]  Language code; defaults to current language
 * @returns {string}
 */
function formatNumber(value, options, lang) {
  const { locale } = getLocaleConfig(lang || _currentLanguage);
  try {
    return new Intl.NumberFormat(locale, options || {}).format(value);
  } catch (e) {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Auto-initialise: detect browser language on first load
// ---------------------------------------------------------------------------

(function autoInit() {
  const detected = detectBrowserLanguage();
  // setLanguage validates the code internally; this call is always safe.
  setLanguage(detected);
})();

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  t,
  setLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  formatCurrency,
  formatDate,
  formatNumber,
  isRTL,
};
