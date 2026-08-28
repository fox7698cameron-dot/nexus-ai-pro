/**
 * src/i18n/index.js
 * Nexus AI Pro — Internationalization & Multi-Language Support
 * Auto-translate via DeepL / Google Translate API
 * Date: 2026-08-28
 */

// ── Supported locales ──────────────────────────────────────────────────────
export const LOCALES = Object.freeze({
  'en-US': { name: 'English (US)',         dir: 'ltr', flag: '🇺🇸' },
  'en-GB': { name: 'English (UK)',          dir: 'ltr', flag: '🇬🇧' },
  'es-ES': { name: 'Español (España)',      dir: 'ltr', flag: '🇪🇸' },
  'es-MX': { name: 'Español (México)',      dir: 'ltr', flag: '🇲🇽' },
  'fr-FR': { name: 'Français',             dir: 'ltr', flag: '🇫🇷' },
  'de-DE': { name: 'Deutsch',              dir: 'ltr', flag: '🇩🇪' },
  'pt-BR': { name: 'Português (Brasil)',    dir: 'ltr', flag: '🇧🇷' },
  'it-IT': { name: 'Italiano',             dir: 'ltr', flag: '🇮🇹' },
  'ja-JP': { name: '日本語',               dir: 'ltr', flag: '🇯🇵' },
  'zh-CN': { name: '中文 (简体)',           dir: 'ltr', flag: '🇨🇳' },
  'zh-TW': { name: '中文 (繁體)',           dir: 'ltr', flag: '🇹🇼' },
  'ko-KR': { name: '한국어',               dir: 'ltr', flag: '🇰🇷' },
  'ru-RU': { name: 'Русский',             dir: 'ltr', flag: '🇷🇺' },
  'ar-SA': { name: 'العربية',             dir: 'rtl', flag: '🇸🇦' },
  'hi-IN': { name: 'हिन्दी',              dir: 'ltr', flag: '🇮🇳' },
  'tr-TR': { name: 'Türkçe',              dir: 'ltr', flag: '🇹🇷' },
  'pl-PL': { name: 'Polski',              dir: 'ltr', flag: '🇵🇱' },
  'nl-NL': { name: 'Nederlands',          dir: 'ltr', flag: '🇳🇱' },
  'sv-SE': { name: 'Svenska',             dir: 'ltr', flag: '🇸🇪' },
  'da-DK': { name: 'Dansk',               dir: 'ltr', flag: '🇩🇰' },
  'fi-FI': { name: 'Suomi',               dir: 'ltr', flag: '🇫🇮' },
  'nb-NO': { name: 'Norsk Bokmål',         dir: 'ltr', flag: '🇳🇴' },
  'id-ID': { name: 'Bahasa Indonesia',     dir: 'ltr', flag: '🇮🇩' },
  'vi-VN': { name: 'Tiếng Việt',          dir: 'ltr', flag: '🇻🇳' },
  'th-TH': { name: 'ภาษาไทย',            dir: 'ltr', flag: '🇹🇭' },
  'uk-UA': { name: 'Українська',          dir: 'ltr', flag: '🇺🇦' },
  'he-IL': { name: 'עברית',               dir: 'rtl', flag: '🇮🇱' },
});

// ── Currency & number formats ──────────────────────────────────────────────
export const CURRENCY_LOCALES = Object.freeze({
  'en-US': { currency: 'USD', symbol: '$'  },
  'en-GB': { currency: 'GBP', symbol: '£'  },
  'es-ES': { currency: 'EUR', symbol: '€'  },
  'fr-FR': { currency: 'EUR', symbol: '€'  },
  'de-DE': { currency: 'EUR', symbol: '€'  },
  'ja-JP': { currency: 'JPY', symbol: '¥'  },
  'zh-CN': { currency: 'CNY', symbol: '¥'  },
  'ko-KR': { currency: 'KRW', symbol: '₩'  },
  'ru-RU': { currency: 'RUB', symbol: '₽'  },
  'br-BR': { currency: 'BRL', symbol: 'R$' },
});

// ── Translation cache (in-memory; production: Redis) ──────────────────────
const translationCache = new Map();

function cacheKey(text, from, to) {
  return `${from}:${to}:${text.slice(0, 40)}`;
}

// ── Auto-translate via DeepL (preferred) or Google Translate ──────────────
export async function translate(text, targetLocale, sourceLocale = 'en-US') {
  if (targetLocale === sourceLocale) return text;

  const key = cacheKey(text, sourceLocale, targetLocale);
  if (translationCache.has(key)) return translationCache.get(key);

  const deepLKey  = process.env.DEEPL_API_KEY;
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  let translated = text; // fallback: return original

  if (deepLKey) {
    try {
      const targetLang = targetLocale.split('-')[0].toUpperCase();
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method:  'POST',
        headers: {
          Authorization:  `DeepL-Auth-Key ${deepLKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: [text], target_lang: targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        translated = data.translations?.[0]?.text || text;
      }
    } catch {
      // fall through to Google
    }
  }

  if (translated === text && googleKey) {
    try {
      const targetLang = targetLocale.split('-')[0];
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ q: text, target: targetLang }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        translated = data.data?.translations?.[0]?.translatedText || text;
      }
    } catch {
      // return original on all errors
    }
  }

  translationCache.set(key, translated);
  return translated;
}

// ── Detect language ────────────────────────────────────────────────────────
export async function detectLanguage(text) {
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!googleKey) return 'en-US';

  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${googleKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ q: text }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const lang = data.data?.detections?.[0]?.[0]?.language;
      // Map short code to locale
      return Object.keys(LOCALES).find(l => l.startsWith(lang)) || 'en-US';
    }
  } catch {
    // ignore
  }
  return 'en-US';
}

// ── Locale formatting helpers ──────────────────────────────────────────────
export function formatNumber(value, locale) {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

export function formatCurrency(amount, locale) {
  const lc = CURRENCY_LOCALES[locale] || { currency: 'USD', symbol: '$' };
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: lc.currency }).format(amount / 100);
  } catch {
    return `${lc.symbol}${(amount / 100).toFixed(2)}`;
  }
}

export function formatDate(date, locale, options = { dateStyle: 'medium' }) {
  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
}

export function getDirection(locale) {
  return LOCALES[locale]?.dir || 'ltr';
}

export function resolveLocale(acceptLanguage) {
  if (!acceptLanguage) return 'en-US';
  const preferred = acceptLanguage.split(',').map(l => l.split(';')[0].trim());
  for (const lang of preferred) {
    if (LOCALES[lang]) return lang;
    const base = lang.split('-')[0];
    const match = Object.keys(LOCALES).find(l => l.startsWith(base));
    if (match) return match;
  }
  return 'en-US';
}

export default {
  LOCALES,
  CURRENCY_LOCALES,
  translate,
  detectLanguage,
  formatNumber,
  formatCurrency,
  formatDate,
  getDirection,
  resolveLocale,
};
