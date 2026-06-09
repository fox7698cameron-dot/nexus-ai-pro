// src/i18n/index.js
// Nexus AI Pro — Internationalization & Auto-Translation Service
// Supports 40+ languages with RTL support and regional formatting
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

// ── Supported locales ─────────────────────────────────────────────────────────

export const LOCALES = Object.freeze({
  'en':    { name: 'English',            nativeName: 'English',            rtl: false, region: 'US' },
  'en-GB': { name: 'English (UK)',        nativeName: 'English (UK)',        rtl: false, region: 'GB' },
  'es':    { name: 'Spanish',             nativeName: 'Español',             rtl: false, region: 'ES' },
  'es-MX': { name: 'Spanish (Mexico)',    nativeName: 'Español (México)',    rtl: false, region: 'MX' },
  'fr':    { name: 'French',              nativeName: 'Français',            rtl: false, region: 'FR' },
  'de':    { name: 'German',              nativeName: 'Deutsch',             rtl: false, region: 'DE' },
  'pt':    { name: 'Portuguese',          nativeName: 'Português',           rtl: false, region: 'BR' },
  'pt-BR': { name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)',  rtl: false, region: 'BR' },
  'it':    { name: 'Italian',             nativeName: 'Italiano',            rtl: false, region: 'IT' },
  'nl':    { name: 'Dutch',               nativeName: 'Nederlands',          rtl: false, region: 'NL' },
  'pl':    { name: 'Polish',              nativeName: 'Polski',              rtl: false, region: 'PL' },
  'ru':    { name: 'Russian',             nativeName: 'Русский',             rtl: false, region: 'RU' },
  'uk':    { name: 'Ukrainian',           nativeName: 'Українська',         rtl: false, region: 'UA' },
  'zh':    { name: 'Chinese (Simplified)',nativeName: '中文（简体）',         rtl: false, region: 'CN' },
  'zh-TW': { name: 'Chinese (Traditional)',nativeName:'中文（繁體）',         rtl: false, region: 'TW' },
  'ja':    { name: 'Japanese',            nativeName: '日本語',               rtl: false, region: 'JP' },
  'ko':    { name: 'Korean',              nativeName: '한국어',               rtl: false, region: 'KR' },
  'ar':    { name: 'Arabic',              nativeName: 'العربية',              rtl: true,  region: 'SA' },
  'he':    { name: 'Hebrew',              nativeName: 'עברית',                rtl: true,  region: 'IL' },
  'fa':    { name: 'Persian',             nativeName: 'فارسی',                rtl: true,  region: 'IR' },
  'hi':    { name: 'Hindi',               nativeName: 'हिन्दी',               rtl: false, region: 'IN' },
  'bn':    { name: 'Bengali',             nativeName: 'বাংলা',               rtl: false, region: 'BD' },
  'tr':    { name: 'Turkish',             nativeName: 'Türkçe',              rtl: false, region: 'TR' },
  'vi':    { name: 'Vietnamese',          nativeName: 'Tiếng Việt',          rtl: false, region: 'VN' },
  'th':    { name: 'Thai',                nativeName: 'ภาษาไทย',             rtl: false, region: 'TH' },
  'id':    { name: 'Indonesian',          nativeName: 'Bahasa Indonesia',    rtl: false, region: 'ID' },
  'ms':    { name: 'Malay',               nativeName: 'Bahasa Melayu',       rtl: false, region: 'MY' },
  'sv':    { name: 'Swedish',             nativeName: 'Svenska',             rtl: false, region: 'SE' },
  'da':    { name: 'Danish',              nativeName: 'Dansk',               rtl: false, region: 'DK' },
  'fi':    { name: 'Finnish',             nativeName: 'Suomi',               rtl: false, region: 'FI' },
  'nb':    { name: 'Norwegian',           nativeName: 'Norsk',               rtl: false, region: 'NO' },
  'cs':    { name: 'Czech',               nativeName: 'Čeština',             rtl: false, region: 'CZ' },
  'sk':    { name: 'Slovak',              nativeName: 'Slovenčina',          rtl: false, region: 'SK' },
  'ro':    { name: 'Romanian',            nativeName: 'Română',              rtl: false, region: 'RO' },
  'hu':    { name: 'Hungarian',           nativeName: 'Magyar',              rtl: false, region: 'HU' },
  'el':    { name: 'Greek',               nativeName: 'Ελληνικά',            rtl: false, region: 'GR' },
  'uk-UA': { name: 'Ukrainian',           nativeName: 'Українська',         rtl: false, region: 'UA' },
  'sw':    { name: 'Swahili',             nativeName: 'Kiswahili',           rtl: false, region: 'KE' },
  'tl':    { name: 'Filipino',            nativeName: 'Filipino',            rtl: false, region: 'PH' },
});

// ── Core UI translation strings (English base) ────────────────────────────────

const BASE_TRANSLATIONS = {
  'nav.dashboard':      'Dashboard',
  'nav.analytics':      'Analytics',
  'nav.security':       'Security',
  'nav.projects':       'Projects',
  'nav.games':          'Games',
  'nav.settings':       'Settings',
  'nav.profile':        'Profile',
  'nav.logout':         'Sign out',
  'auth.login':         'Sign in',
  'auth.register':      'Create account',
  'auth.email':         'Email address',
  'auth.password':      'Password',
  'auth.username':      'Username',
  'auth.confirmPass':   'Confirm password',
  'auth.2fa':           'Authenticator code',
  'auth.mfaCode':       'MFA code',
  'auth.biometric':     'Use biometrics',
  'auth.forgotPass':    'Forgot password?',
  'auth.noAccount':     "Don't have an account?",
  'auth.haveAccount':   'Already have an account?',
  'common.save':        'Save',
  'common.cancel':      'Cancel',
  'common.delete':      'Delete',
  'common.edit':        'Edit',
  'common.loading':     'Loading…',
  'common.error':       'An error occurred',
  'common.success':     'Success',
  'common.required':    'Required',
  'common.optional':    'Optional',
  'common.search':      'Search',
  'common.filter':      'Filter',
  'common.export':      'Export',
  'common.connect':     'Connect',
  'common.disconnect':  'Disconnect',
  'common.realtime':    'Real-time',
  'subscription.free':     'Free',
  'subscription.pro':      'Pro',
  'subscription.enterprise':'Enterprise',
  'subscription.upgrade':  'Upgrade',
  'subscription.cancel':   'Cancel subscription',
  'security.score':     'Security Score',
  'security.scan':      'Run Scan',
  'security.threats':   'Threats',
  'security.alerts':    'Alerts',
  'analytics.followers':'Followers',
  'analytics.views':    'Views',
  'analytics.likes':    'Likes',
  'analytics.reach':    'Reach',
  'analytics.retention':'Retention',
  'analytics.engagement':'Engagement Rate',
  'project.create':     'New Project',
  'project.status':     'Status',
  'project.progress':   'Progress',
  'project.milestone':  'Milestone',
  'game.achievements':  'Achievements',
  'game.progress':      'Game Progress',
  'game.connect':       'Connect Platform',
};

// ── Simple in-memory translation cache ────────────────────────────────────────

const translationCache = new Map(); // locale:key → translated string

// ── Translation function ──────────────────────────────────────────────────────

/**
 * Get translation for a key in the given locale.
 * Falls back to English base string, then the raw key.
 */
export function t(key, locale = 'en', params = {}) {
  const cacheKey = `${locale}:${key}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return interpolate(cached, params);

  // Use base English as fallback (loaded translations would come from DB/files)
  const base = BASE_TRANSLATIONS[key] || key;
  return interpolate(base, params);
}

function interpolate(str, params) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`);
}

/** Returns true if the locale is RTL */
export function isRTL(locale) {
  return LOCALES[locale]?.rtl ?? false;
}

/** Detect best locale from Accept-Language header */
export function detectLocale(acceptLanguage = '') {
  const preferred = acceptLanguage
    .split(',')
    .map(l => l.split(';')[0].trim().toLowerCase())
    .find(l => {
      const exact = Object.keys(LOCALES).find(k => k.toLowerCase() === l);
      const lang  = Object.keys(LOCALES).find(k => k.toLowerCase() === l.split('-')[0]);
      return exact || lang;
    });

  return preferred || 'en';
}

/** Returns locale metadata */
export function getLocaleInfo(locale) {
  return LOCALES[locale] || LOCALES['en'];
}

/** Returns all supported locales list */
export function getSupportedLocales() {
  return Object.entries(LOCALES).map(([code, info]) => ({ code, ...info }));
}

// ── Auto-translate via Google Cloud Translation API ───────────────────────────

/**
 * Translate a string using Google Cloud Translation.
 * Requires GOOGLE_TRANSLATE_API_KEY in environment.
 * Returns the original text if API is not configured.
 */
export async function autoTranslate(text, targetLocale, sourceLocale = 'en') {
  if (!text) return text;
  if (targetLocale === sourceLocale || targetLocale.startsWith(sourceLocale)) return text;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return text; // Graceful degradation

  const cacheKey = `translate:${sourceLocale}:${targetLocale}:${text.slice(0, 50)}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const target = targetLocale.split('-')[0]; // e.g. 'zh-TW' → 'zh' (or use zh-TW directly)
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: sourceLocale.split('-')[0], target, format: 'text' }),
    });

    if (!resp.ok) return text;
    const data = await resp.json();
    const translated = data?.data?.translations?.[0]?.translatedText || text;

    translationCache.set(cacheKey, translated);
    return translated;
  } catch (_) {
    return text;
  }
}

/** Express middleware: attaches locale helpers to req */
export function i18nMiddleware(req, _res, next) {
  const locale = req.headers['accept-language']
    ? detectLocale(req.headers['accept-language'])
    : (req.user?.locale || 'en');

  req.locale  = locale;
  req.t       = (key, params) => t(key, locale, params);
  req.isRTL   = isRTL(locale);
  next();
}

export default { t, isRTL, detectLocale, getLocaleInfo, getSupportedLocales, autoTranslate, i18nMiddleware, LOCALES };
