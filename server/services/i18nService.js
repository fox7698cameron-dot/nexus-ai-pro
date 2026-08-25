/**
 * server/services/i18nService.js
 * Nexus AI Pro — Internationalisation & Auto-Translation Service
 * Labeled: 2026-08-25
 *
 * Supports 20+ languages with locale-aware formatting.
 * Auto-translation uses Google Cloud Translation API (env-configured).
 * Falls back gracefully to English if translation unavailable.
 */

// ── Supported locales ─────────────────────────────────────────────────────────
export const SUPPORTED_LOCALES = Object.freeze({
  'en':    { name: 'English',            nativeName: 'English',           rtl: false },
  'es':    { name: 'Spanish',            nativeName: 'Español',           rtl: false },
  'fr':    { name: 'French',             nativeName: 'Français',          rtl: false },
  'de':    { name: 'German',             nativeName: 'Deutsch',           rtl: false },
  'pt':    { name: 'Portuguese',         nativeName: 'Português',         rtl: false },
  'it':    { name: 'Italian',            nativeName: 'Italiano',          rtl: false },
  'nl':    { name: 'Dutch',              nativeName: 'Nederlands',        rtl: false },
  'ru':    { name: 'Russian',            nativeName: 'Русский',           rtl: false },
  'zh':    { name: 'Chinese (Simplified)', nativeName: '中文',            rtl: false },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文',       rtl: false },
  'ja':    { name: 'Japanese',           nativeName: '日本語',            rtl: false },
  'ko':    { name: 'Korean',             nativeName: '한국어',            rtl: false },
  'ar':    { name: 'Arabic',             nativeName: 'العربية',           rtl: true  },
  'he':    { name: 'Hebrew',             nativeName: 'עברית',             rtl: true  },
  'hi':    { name: 'Hindi',              nativeName: 'हिन्दी',            rtl: false },
  'tr':    { name: 'Turkish',            nativeName: 'Türkçe',            rtl: false },
  'pl':    { name: 'Polish',             nativeName: 'Polski',            rtl: false },
  'sv':    { name: 'Swedish',            nativeName: 'Svenska',           rtl: false },
  'da':    { name: 'Danish',             nativeName: 'Dansk',             rtl: false },
  'fi':    { name: 'Finnish',            nativeName: 'Suomi',             rtl: false },
  'nb':    { name: 'Norwegian',          nativeName: 'Norsk',             rtl: false },
  'vi':    { name: 'Vietnamese',         nativeName: 'Tiếng Việt',        rtl: false },
  'th':    { name: 'Thai',               nativeName: 'ภาษาไทย',          rtl: false },
  'id':    { name: 'Indonesian',         nativeName: 'Bahasa Indonesia',  rtl: false },
  'ms':    { name: 'Malay',              nativeName: 'Bahasa Melayu',     rtl: false },
  'uk':    { name: 'Ukrainian',          nativeName: 'Українська',        rtl: false }
});

// ── Translation cache ─────────────────────────────────────────────────────────
const translationCache = new Map(); // `${locale}:${text_hash}` → translatedText
const CACHE_TTL        = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(locale, text) {
  const hash = require('crypto').createHash('md5').update(text).digest('hex').slice(0, 16);
  return `${locale}:${hash}`;
}

// ── Auto-translate ────────────────────────────────────────────────────────────

/**
 * Translate text to target locale.
 * Uses Google Cloud Translation API if GOOGLE_TRANSLATE_API_KEY is set.
 * Returns original text as fallback.
 */
export async function translate(text, targetLocale, sourceLocale = 'en') {
  if (!text || typeof text !== 'string') return text;
  if (targetLocale === sourceLocale || targetLocale === 'en') return text;

  if (!SUPPORTED_LOCALES[targetLocale]) {
    console.warn(`[i18n] Unsupported locale: ${targetLocale}`);
    return text;
  }

  const key = cacheKey(targetLocale, text);
  const cached = translationCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.text;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    // No translation API — return original with note
    return text;
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q:      text,
          source: sourceLocale,
          target: targetLocale,
          format: 'text'
        })
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data       = await response.json();
    const translated = data.data?.translations?.[0]?.translatedText || text;

    translationCache.set(key, { text: translated, expiresAt: Date.now() + CACHE_TTL });
    return translated;
  } catch (err) {
    console.warn(`[i18n] Translation failed for locale ${targetLocale}:`, err.message);
    return text; // graceful fallback
  }
}

/**
 * Translate multiple strings at once.
 */
export async function translateBatch(texts, targetLocale, sourceLocale = 'en') {
  if (!texts || !Array.isArray(texts)) return texts;
  if (targetLocale === sourceLocale || !process.env.GOOGLE_TRANSLATE_API_KEY) return texts;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return texts;

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q:      texts,
          source: sourceLocale,
          target: targetLocale,
          format: 'text'
        })
      }
    );

    if (!response.ok) return texts;
    const data = await response.json();
    return data.data?.translations?.map(t => t.translatedText) || texts;
  } catch {
    return texts;
  }
}

// ── Locale detection from request ─────────────────────────────────────────────

/**
 * Detect best locale from Accept-Language header or user profile.
 */
export function detectLocale(acceptLanguageHeader, userLocale) {
  if (userLocale && SUPPORTED_LOCALES[userLocale]) return userLocale;

  if (!acceptLanguageHeader) return 'en';

  // Parse Accept-Language: en-US,en;q=0.9,es;q=0.8
  const preferences = acceptLanguageHeader
    .split(',')
    .map(lang => {
      const [code, q] = lang.trim().split(';q=');
      return { code: code.trim(), q: parseFloat(q || '1') };
    })
    .sort((a, b) => b.q - a.q);

  for (const pref of preferences) {
    if (SUPPORTED_LOCALES[pref.code]) return pref.code;
    // Try language without region: en-US → en
    const lang = pref.code.split('-')[0];
    if (SUPPORTED_LOCALES[lang]) return lang;
  }

  return 'en';
}

// ── Number / date / currency formatting ───────────────────────────────────────

export function formatNumber(value, locale = 'en', options = {}) {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

export function formatCurrency(amount, locale = 'en', currency = 'USD') {
  try {
    return new Intl.NumberFormat(locale, {
      style:    'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatDate(date, locale = 'en', options = {}) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(new Date(date));
  } catch {
    return new Date(date).toISOString();
  }
}

// ── Locale metadata ───────────────────────────────────────────────────────────

export function getLocaleInfo(locale) {
  return SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES['en'];
}

export function listLocales() {
  return Object.entries(SUPPORTED_LOCALES).map(([code, info]) => ({
    code,
    ...info
  }));
}

export function isRTL(locale) {
  return SUPPORTED_LOCALES[locale]?.rtl || false;
}
