/**
 * src/i18n/index.js
 * Internationalization (i18n) — Multi-language & Regional Support with Auto-translate
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Supports: en, es, fr, de, ja, zh, pt, ar, ko, hi, ru, it, nl, pl, tr, sv
 * RTL languages: ar, he, fa, ur
 * Auto-translate via configured provider (no hard-coded API keys)
 */

// ─── Built-in Locales ─────────────────────────────────────────────────────────

import en from './locales/en.json' assert { type: 'json' };
import es from './locales/es.json' assert { type: 'json' };
import fr from './locales/fr.json' assert { type: 'json' };

const builtinLocales = { en, es, fr };
const loadedLocales  = new Map(Object.entries(builtinLocales));

// ─── Supported Languages ──────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    native: 'English',    rtl: false },
  { code: 'es', name: 'Spanish',    native: 'Español',    rtl: false },
  { code: 'fr', name: 'French',     native: 'Français',   rtl: false },
  { code: 'de', name: 'German',     native: 'Deutsch',    rtl: false },
  { code: 'ja', name: 'Japanese',   native: '日本語',     rtl: false },
  { code: 'zh', name: 'Chinese',    native: '中文',       rtl: false },
  { code: 'pt', name: 'Portuguese', native: 'Português',  rtl: false },
  { code: 'ar', name: 'Arabic',     native: 'العربية',    rtl: true  },
  { code: 'ko', name: 'Korean',     native: '한국어',     rtl: false },
  { code: 'hi', name: 'Hindi',      native: 'हिन्दी',    rtl: false },
  { code: 'ru', name: 'Russian',    native: 'Русский',    rtl: false },
  { code: 'it', name: 'Italian',    native: 'Italiano',   rtl: false },
  { code: 'nl', name: 'Dutch',      native: 'Nederlands', rtl: false },
  { code: 'pl', name: 'Polish',     native: 'Polski',     rtl: false },
  { code: 'tr', name: 'Turkish',    native: 'Türkçe',     rtl: false },
  { code: 'sv', name: 'Swedish',    native: 'Svenska',    rtl: false },
];

const RTL_CODES = new Set(SUPPORTED_LANGUAGES.filter(l => l.rtl).map(l => l.code));

// ─── Core i18n Class ──────────────────────────────────────────────────────────

class I18n {
  constructor() {
    this.currentLocale = this.detectLocale();
    this.fallback      = 'en';
    this.cache         = new Map(); // translated strings cache
  }

  /** Detect locale from browser / system */
  detectLocale() {
    if (typeof window !== 'undefined' && window.navigator) {
      const browserLang = navigator.language?.split('-')[0] || 'en';
      const supported   = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
      return supported ? browserLang : 'en';
    }
    return 'en';
  }

  /** Set the current locale */
  setLocale(code) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!lang) throw new Error(`Unsupported locale: ${code}`);
    this.currentLocale = code;

    // Update <html> dir and lang attributes for RTL support
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code;
      document.documentElement.dir  = RTL_CODES.has(code) ? 'rtl' : 'ltr';
    }
  }

  /** Get current locale metadata */
  getLocaleInfo() {
    return SUPPORTED_LANGUAGES.find(l => l.code === this.currentLocale);
  }

  /** Check if current locale is RTL */
  isRTL() {
    return RTL_CODES.has(this.currentLocale);
  }

  /**
   * Translate a key.
   * @param {string} key  Dot-separated path, e.g. 'auth.login.title'
   * @param {object} [vars] Interpolation variables: { name: 'Alice' } → replaces {{name}}
   * @returns {string}
   */
  t(key, vars = {}) {
    const value = this.resolve(key, this.currentLocale)
      ?? this.resolve(key, this.fallback)
      ?? key; // Last resort: return the key itself

    if (typeof value !== 'string') return key;

    // Interpolate {{variable}} placeholders
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`
    );
  }

  /** Resolve a dot-path key from a locale's translations */
  resolve(key, locale) {
    const bundle = loadedLocales.get(locale);
    if (!bundle) return undefined;

    return key.split('.').reduce((obj, part) =>
      obj && typeof obj === 'object' ? obj[part] : undefined,
      bundle
    );
  }

  /** Format a number per locale conventions */
  formatNumber(value, options = {}) {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }

  /** Format a date per locale conventions */
  formatDate(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(this.currentLocale, {
      dateStyle: 'medium',
      ...options,
    }).format(date);
  }

  /** Format a relative time (e.g. "2 hours ago") */
  formatRelativeTime(value) {
    const rtf  = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
    const diff = (value instanceof Date ? value : new Date(value)) - new Date();
    const secs = Math.round(diff / 1000);
    const mins = Math.round(secs / 60);
    const hrs  = Math.round(mins / 60);
    const days = Math.round(hrs / 24);

    if (Math.abs(secs)  < 60)  return rtf.format(secs, 'second');
    if (Math.abs(mins)  < 60)  return rtf.format(mins, 'minute');
    if (Math.abs(hrs)   < 24)  return rtf.format(hrs,  'hour');
    return rtf.format(days, 'day');
  }

  /** Format currency */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this.currentLocale, {
      style:    'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  }

  /**
   * Auto-translate a string via the configured translation provider.
   * Provider is set by VITE_TRANSLATE_ENDPOINT env var (no keys hard-coded).
   *
   * @param {string} text - Text to translate
   * @param {string} [targetLang] - Target language code (defaults to currentLocale)
   * @returns {Promise<string>}
   */
  async autoTranslate(text, targetLang) {
    const lang = targetLang || this.currentLocale;
    if (lang === 'en') return text; // Source is English

    const cacheKey = `${lang}:${text}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const endpoint = typeof window !== 'undefined'
      ? (window.__NEXUS_ENV?.TRANSLATE_ENDPOINT || import.meta.env?.VITE_TRANSLATE_ENDPOINT)
      : process.env.TRANSLATE_ENDPOINT;

    if (!endpoint) {
      console.warn('[i18n] VITE_TRANSLATE_ENDPOINT not configured — auto-translate unavailable');
      return text;
    }

    try {
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, target: lang, source: 'en' }),
      });
      if (!res.ok) throw new Error(`Translate API ${res.status}`);
      const data   = await res.json();
      const result = data.translatedText || data.translation || text;
      this.cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[i18n] Auto-translate error:', err.message);
      return text;
    }
  }
}

export const i18n = new I18n();

/** React hook for translations (use with React context) */
export function useTranslation() {
  return {
    t:               i18n.t.bind(i18n),
    locale:          i18n.currentLocale,
    setLocale:       i18n.setLocale.bind(i18n),
    isRTL:           i18n.isRTL(),
    localeInfo:      i18n.getLocaleInfo(),
    formatNumber:    i18n.formatNumber.bind(i18n),
    formatDate:      i18n.formatDate.bind(i18n),
    formatCurrency:  i18n.formatCurrency.bind(i18n),
    formatRelative:  i18n.formatRelativeTime.bind(i18n),
    autoTranslate:   i18n.autoTranslate.bind(i18n),
    languages:       SUPPORTED_LANGUAGES,
  };
}

export default i18n;
