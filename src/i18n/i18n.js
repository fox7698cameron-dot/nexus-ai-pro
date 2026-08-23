/**
 * src/i18n/i18n.js
 * Multi-language & Regional Support — Auto-translate fallback for scalability
 * Created: 2026-08-23
 */

// Supported locales with regional variants
export const SUPPORTED_LOCALES = {
  'en':    { name: 'English',    dir: 'ltr', currency: 'USD', dateFormat: 'MM/DD/YYYY' },
  'en-GB': { name: 'English (UK)', dir: 'ltr', currency: 'GBP', dateFormat: 'DD/MM/YYYY' },
  'es':    { name: 'Español',    dir: 'ltr', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  'fr':    { name: 'Français',   dir: 'ltr', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  'de':    { name: 'Deutsch',    dir: 'ltr', currency: 'EUR', dateFormat: 'DD.MM.YYYY' },
  'ja':    { name: '日本語',      dir: 'ltr', currency: 'JPY', dateFormat: 'YYYY/MM/DD' },
  'ko':    { name: '한국어',      dir: 'ltr', currency: 'KRW', dateFormat: 'YYYY.MM.DD' },
  'zh-CN': { name: '中文(简体)', dir: 'ltr', currency: 'CNY', dateFormat: 'YYYY-MM-DD' },
  'zh-TW': { name: '中文(繁體)', dir: 'ltr', currency: 'TWD', dateFormat: 'YYYY/MM/DD' },
  'ar':    { name: 'العربية',    dir: 'rtl', currency: 'SAR', dateFormat: 'DD/MM/YYYY' },
  'he':    { name: 'עברית',      dir: 'rtl', currency: 'ILS', dateFormat: 'DD/MM/YYYY' },
  'pt-BR': { name: 'Português (BR)', dir: 'ltr', currency: 'BRL', dateFormat: 'DD/MM/YYYY' },
  'ru':    { name: 'Русский',    dir: 'ltr', currency: 'RUB', dateFormat: 'DD.MM.YYYY' },
  'hi':    { name: 'हिन्दी',     dir: 'ltr', currency: 'INR', dateFormat: 'DD/MM/YYYY' },
  'tr':    { name: 'Türkçe',    dir: 'ltr', currency: 'TRY', dateFormat: 'DD.MM.YYYY' },
  'it':    { name: 'Italiano',   dir: 'ltr', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  'pl':    { name: 'Polski',     dir: 'ltr', currency: 'PLN', dateFormat: 'DD.MM.YYYY' },
  'nl':    { name: 'Nederlands', dir: 'ltr', currency: 'EUR', dateFormat: 'DD-MM-YYYY' },
  'sv':    { name: 'Svenska',    dir: 'ltr', currency: 'SEK', dateFormat: 'YYYY-MM-DD' },
  'th':    { name: 'ภาษาไทย',   dir: 'ltr', currency: 'THB', dateFormat: 'DD/MM/YYYY' },
};

// Core translation strings (en baseline)
const BASE_STRINGS = {
  'nav.dashboard':    'Dashboard',
  'nav.analytics':    'Analytics',
  'nav.security':     'Security',
  'nav.projects':     'Projects',
  'nav.settings':     'Settings',
  'nav.admin':        'Admin',
  'auth.signin':      'Sign In',
  'auth.signup':      'Sign Up',
  'auth.signout':     'Sign Out',
  'auth.password':    'Password',
  'auth.username':    'Username',
  'auth.email':       'Email',
  'auth.biometric':   'Use Biometrics',
  'auth.2fa':         '2-Factor Authentication',
  'auth.mfa':         'Multi-Factor Authentication',
  'auth.face_id':     'Face ID',
  'auth.touch_id':    'Touch ID',
  'auth.fingerprint': 'Fingerprint',
  'auth.retina':      'Retinal Scan',
  'dashboard.realtime': 'Real-Time Metrics',
  'dashboard.refresh':  'Refresh',
  'security.scan':      'Run Scan',
  'security.scanning':  'Scanning…',
  'security.threats':   'Threats Detected',
  'security.network':   'Network Status',
  'analytics.views':    'Views',
  'analytics.reach':    'Reach',
  'analytics.likes':    'Likes',
  'analytics.retention':'Retention',
  'payment.subscribe':  'Subscribe',
  'payment.checkout':   'Checkout',
  'payment.crypto':     'Pay with Crypto',
  'payment.giftcard':   'Gift Card',
};

// In-memory cache for translated strings
const _cache = new Map();

/**
 * Detect the browser/OS locale, fallback to 'en'
 */
export function detectLocale() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || navigator.userLanguage || 'en';
  const base = lang.split('-')[0];
  if (SUPPORTED_LOCALES[lang]) return lang;
  if (SUPPORTED_LOCALES[base]) return base;
  return 'en';
}

/**
 * Translate a key into the target locale.
 * Falls back to auto-translate via LibreTranslate-compatible API if available,
 * then to the English baseline.
 *
 * @param {string} key       - dot-notation translation key
 * @param {string} [locale]  - target locale (defaults to detected)
 * @returns {string}
 */
export async function t(key, locale) {
  const loc = locale || detectLocale();
  if (loc === 'en') return BASE_STRINGS[key] || key;

  const cacheKey = `${loc}:${key}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const base = BASE_STRINGS[key] || key;

  // Attempt auto-translate (graceful degradation)
  try {
    const endpoint = import.meta.env?.VITE_TRANSLATE_ENDPOINT;
    if (endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: base, source: 'en', target: loc.split('-')[0] }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.translatedText || base;
        _cache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch {
    // Auto-translate unavailable — use baseline
  }

  _cache.set(cacheKey, base);
  return base;
}

/**
 * Synchronous translation with pre-loaded strings (no async).
 * Use when you cannot await.
 */
export function tSync(key, locale) {
  const loc = locale || detectLocale();
  const cacheKey = `${loc}:${key}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);
  return BASE_STRINGS[key] || key;
}

/**
 * Format a number in locale-aware style.
 */
export function formatNumber(num, locale) {
  return new Intl.NumberFormat(locale || detectLocale()).format(num);
}

/**
 * Format a date in locale-aware style.
 */
export function formatDate(date, locale, opts) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale || detectLocale(), opts).format(d);
}

/**
 * Format a currency value.
 */
export function formatCurrency(amount, currencyCode, locale) {
  return new Intl.NumberFormat(locale || detectLocale(), {
    style: 'currency',
    currency: currencyCode || 'USD',
  }).format(amount);
}

/**
 * Apply locale direction to document root.
 */
export function applyLocaleToDOM(locale) {
  if (typeof document === 'undefined') return;
  const info = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES['en'];
  document.documentElement.setAttribute('lang', locale);
  document.documentElement.setAttribute('dir', info.dir);
}
