/**
 * src/lib/i18n.js
 * Nexus AI Pro - Internationalization & auto-translation
 * Created: 2026-07-26
 */

export const SUPPORTED_LOCALES = {
  'en': { name: 'English', dir: 'ltr', flag: '🇺🇸' },
  'es': { name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  'fr': { name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  'de': { name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  'pt': { name: 'Português', dir: 'ltr', flag: '🇧🇷' },
  'ja': { name: '日本語', dir: 'ltr', flag: '🇯🇵' },
  'ko': { name: '한국어', dir: 'ltr', flag: '🇰🇷' },
  'zh': { name: '中文', dir: 'ltr', flag: '🇨🇳' },
  'ar': { name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  'hi': { name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  'ru': { name: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  'it': { name: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  'nl': { name: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  'pl': { name: 'Polski', dir: 'ltr', flag: '🇵🇱' },
  'tr': { name: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  'sv': { name: 'Svenska', dir: 'ltr', flag: '🇸🇪' },
  'uk': { name: 'Українська', dir: 'ltr', flag: '🇺🇦' },
  'th': { name: 'ไทย', dir: 'ltr', flag: '🇹🇭' },
  'vi': { name: 'Tiếng Việt', dir: 'ltr', flag: '🇻🇳' },
  'id': { name: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩' },
};

const STORAGE_KEY = 'nexus:locale';
const CACHE_KEY = 'nexus:i18n_cache';

let _locale = 'en';
let _cache = {};

export function detectLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES[stored]) return stored;
  const browser = navigator.language?.split('-')[0];
  if (browser && SUPPORTED_LOCALES[browser]) return browser;
  return 'en';
}

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES[locale]) return;
  _locale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  const info = SUPPORTED_LOCALES[locale];
  document.documentElement.setAttribute('lang', locale);
  document.documentElement.setAttribute('dir', info.dir);
}

export function getLocale() { return _locale; }

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch {
    _cache = {};
  }
}

export function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(_cache)); } catch {}
}

/**
 * Translate text via the server's translation endpoint.
 * Falls back to the original text if translation fails.
 */
export async function translate(text, targetLocale = _locale) {
  if (!text || targetLocale === 'en') return text;
  const cacheKey = `${targetLocale}::${text}`;
  if (_cache[cacheKey]) return _cache[cacheKey];

  try {
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target: targetLocale, source: 'en' }),
    });
    if (!res.ok) return text;
    const { translated } = await res.json();
    _cache[cacheKey] = translated;
    saveCache();
    return translated;
  } catch {
    return text;
  }
}

export function getTextDirection(locale = _locale) {
  return SUPPORTED_LOCALES[locale]?.dir || 'ltr';
}

export function formatNumber(n, locale = _locale) {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(d, locale = _locale, opts = {}) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...opts }).format(new Date(d));
}

export function formatCurrency(amount, currency = 'USD', locale = _locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

loadCache();
