/**
 * src/i18n/i18n.js
 * Internationalization system for Nexus AI Pro
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Supports: en, es, fr, de, ja, ko, zh-CN, zh-TW, pt, ar, hi, ru
 * RTL: Arabic (ar)
 * Auto-detect browser language with fallback chain.
 * Auto-translate via /api/translate (no hardcoded keys).
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Supported locales ────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = [
  { code: 'en',    name: 'English',               native: 'English',              rtl: false, dateFormat: 'MM/DD/YYYY', timeFormat: '12h' },
  { code: 'es',    name: 'Spanish',               native: 'Español',              rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: '24h' },
  { code: 'fr',    name: 'French',                native: 'Français',             rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: '24h' },
  { code: 'de',    name: 'German',                native: 'Deutsch',              rtl: false, dateFormat: 'DD.MM.YYYY', timeFormat: '24h' },
  { code: 'ja',    name: 'Japanese',              native: '日本語',               rtl: false, dateFormat: 'YYYY/MM/DD', timeFormat: '24h' },
  { code: 'ko',    name: 'Korean',                native: '한국어',               rtl: false, dateFormat: 'YYYY.MM.DD', timeFormat: '24h' },
  { code: 'zh-CN', name: 'Chinese (Simplified)',  native: '简体中文',             rtl: false, dateFormat: 'YYYY/MM/DD', timeFormat: '24h' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文',             rtl: false, dateFormat: 'YYYY/MM/DD', timeFormat: '24h' },
  { code: 'pt',    name: 'Portuguese',            native: 'Português',            rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: '24h' },
  { code: 'ar',    name: 'Arabic',                native: 'العربية',              rtl: true,  dateFormat: 'DD/MM/YYYY', timeFormat: '12h' },
  { code: 'hi',    name: 'Hindi',                 native: 'हिन्दी',               rtl: false, dateFormat: 'DD/MM/YYYY', timeFormat: '12h' },
  { code: 'ru',    name: 'Russian',               native: 'Русский',              rtl: false, dateFormat: 'DD.MM.YYYY', timeFormat: '24h' },
];

export const RTL_LOCALES = new Set(SUPPORTED_LOCALES.filter(l => l.rtl).map(l => l.code));

// ─── Storage key ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'nexus:locale';

// ─── Translation cache ────────────────────────────────────────────────────────
const translationCache = new Map(); // locale → translations object

// ─── Detect locale ────────────────────────────────────────────────────────────

function detectLocale() {
  // Priority: stored preference → browser language → en
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) return stored;
  } catch { /* private browsing */ }

  const browserLangs = navigator.languages ?? [navigator.language ?? 'en'];
  for (const lang of browserLangs) {
    const exact = SUPPORTED_LOCALES.find(l => l.code === lang);
    if (exact) return exact.code;
    const partial = SUPPORTED_LOCALES.find(l => l.code.startsWith(lang.split('-')[0]));
    if (partial) return partial.code;
  }
  return 'en';
}

// ─── Load translations ────────────────────────────────────────────────────────

async function loadTranslations(locale) {
  if (translationCache.has(locale)) return translationCache.get(locale);

  try {
    // Dynamic import – each locale file is a flat key → string map.
    const module = await import(`./translations/${locale}.js`);
    const translations = module.default ?? module;
    translationCache.set(locale, translations);
    return translations;
  } catch {
    // Fallback to English
    if (locale !== 'en') {
      const base = await loadTranslations('en');
      translationCache.set(locale, base);
      return base;
    }
    translationCache.set('en', {});
    return {};
  }
}

// ─── Auto-translate via API ───────────────────────────────────────────────────

/**
 * Translate a string via the configured /api/translate endpoint.
 * No API key is embedded here – the server injects credentials.
 * @param {string} text
 * @param {string} targetLocale
 * @returns {Promise<string>}
 */
export async function autoTranslate(text, targetLocale) {
  if (targetLocale === 'en') return text;
  try {
    const res = await fetch('/api/translate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, target: targetLocale }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translated ?? text;
  } catch {
    return text;
  }
}

// ─── Interpolation ────────────────────────────────────────────────────────────

/**
 * Interpolate {{key}} placeholders in a translated string.
 * @param {string} str
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : `{{${key}}}`
  );
}

// ─── Pluralization ────────────────────────────────────────────────────────────

/**
 * Select singular / plural form.
 * Keys: key_one, key_other (extend for language-specific rules).
 * @param {Record<string,string>} translations
 * @param {string} key
 * @param {number} count
 * @param {Record<string,string|number>} [params]
 * @returns {string}
 */
function pluralize(translations, key, count, params) {
  const one   = translations[`${key}_one`]   ?? translations[key] ?? key;
  const other = translations[`${key}_other`] ?? translations[key] ?? key;
  const selected = count === 1 ? one : other;
  return interpolate(selected, { count, ...params });
}

// ─── i18n class ───────────────────────────────────────────────────────────────

class I18n {
  constructor() {
    this.locale       = 'en';
    this.translations = {};
    this._listeners   = new Set();
    this._ready       = false;
  }

  async init() {
    this.locale       = detectLocale();
    this.translations = await loadTranslations(this.locale);
    this._ready       = true;
    this._applyRTL();
    return this;
  }

  /** @param {string} locale */
  async setLocale(locale) {
    if (!SUPPORTED_LOCALES.some(l => l.code === locale)) {
      console.warn(`[i18n] unsupported locale: ${locale}`);
      return;
    }
    this.locale       = locale;
    this.translations = await loadTranslations(locale);
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    this._applyRTL();
    this._notify();
  }

  _applyRTL() {
    if (typeof document === 'undefined') return;
    const isRTL = RTL_LOCALES.has(this.locale);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', this.locale);
  }

  /**
   * Translate a key with optional interpolation params.
   * @param {string} key
   * @param {Record<string,string|number>|undefined} [params]
   * @param {number|undefined} [count] - enables pluralization
   * @returns {string}
   */
  t(key, params, count) {
    if (count !== undefined) return pluralize(this.translations, key, count, params);
    const val = this.translations[key] ?? key;
    return interpolate(val, params);
  }

  /** Format a date according to current locale. */
  formatDate(date, options = {}) {
    return new Intl.DateTimeFormat(this.locale, options).format(
      date instanceof Date ? date : new Date(date)
    );
  }

  /** Format a number according to current locale. */
  formatNumber(num, options = {}) {
    return new Intl.NumberFormat(this.locale, options).format(num);
  }

  /** Format currency. */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency,
    }).format(amount / 100);   // amount in cents
  }

  /** Format a relative time (e.g. "2 hours ago"). */
  formatRelativeTime(date) {
    const diff  = Date.now() - new Date(date).getTime();
    const secs  = Math.floor(diff / 1000);
    const rtf   = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });

    if (secs < 60)    return rtf.format(-secs, 'second');
    if (secs < 3600)  return rtf.format(-Math.floor(secs / 60), 'minute');
    if (secs < 86400) return rtf.format(-Math.floor(secs / 3600), 'hour');
    return rtf.format(-Math.floor(secs / 86400), 'day');
  }

  getLocaleInfo() {
    return SUPPORTED_LOCALES.find(l => l.code === this.locale) ?? SUPPORTED_LOCALES[0];
  }

  isRTL() {
    return RTL_LOCALES.has(this.locale);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach(fn => fn(this.locale));
  }
}

export const i18n = new I18n();

// ─── React hook ───────────────────────────────────────────────────────────────

/**
 * React hook for translations.
 * @returns {{ t: I18n['t'], locale: string, setLocale: I18n['setLocale'], i18n: I18n }}
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState(i18n.locale);

  useEffect(() => {
    // Init on first use
    if (!i18n._ready) {
      i18n.init().then(() => setLocaleState(i18n.locale));
    }
    const unsub = i18n.subscribe(l => setLocaleState(l));
    return unsub;
  }, []);

  const setLocale = useCallback((l) => i18n.setLocale(l), []);
  const t         = useCallback((...args) => i18n.t(...args), [locale]); // eslint-disable-line

  return { t, locale, setLocale, i18n, isRTL: i18n.isRTL() };
}

// Initialise eagerly (non-blocking) for SSR compatibility
if (typeof window !== 'undefined') {
  i18n.init().catch(console.error);
}

export default i18n;
