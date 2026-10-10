/**
 * i18n.js
 * Minimal, dependency-free internationalization layer.
 * Supports runtime locale switching, auto-translation via server endpoint,
 * pluralization, date/number regional formatting.
 * Updated: 2026-10-10
 */

// ── Core locale catalog (extend as needed) ───────────────────────────────────
const CATALOGS = {
  'en':    { dir: 'ltr', name: 'English',           translations: {} },
  'es':    { dir: 'ltr', name: 'Español',            translations: {} },
  'fr':    { dir: 'ltr', name: 'Français',           translations: {} },
  'de':    { dir: 'ltr', name: 'Deutsch',            translations: {} },
  'pt-BR': { dir: 'ltr', name: 'Português (BR)',     translations: {} },
  'zh':    { dir: 'ltr', name: '中文 (简体)',          translations: {} },
  'ja':    { dir: 'ltr', name: '日本語',              translations: {} },
  'ko':    { dir: 'ltr', name: '한국어',              translations: {} },
  'ar':    { dir: 'rtl', name: 'العربية',            translations: {} },
  'he':    { dir: 'rtl', name: 'עברית',              translations: {} },
  'hi':    { dir: 'ltr', name: 'हिन्दी',             translations: {} },
  'ru':    { dir: 'ltr', name: 'Русский',            translations: {} },
  'tr':    { dir: 'ltr', name: 'Türkçe',             translations: {} },
  'pl':    { dir: 'ltr', name: 'Polski',             translations: {} },
  'it':    { dir: 'ltr', name: 'Italiano',           translations: {} },
  'nl':    { dir: 'ltr', name: 'Nederlands',         translations: {} },
  'sv':    { dir: 'ltr', name: 'Svenska',            translations: {} },
  'da':    { dir: 'ltr', name: 'Dansk',              translations: {} },
  'fi':    { dir: 'ltr', name: 'Suomi',              translations: {} },
  'nb':    { dir: 'ltr', name: 'Norsk',              translations: {} },
  'id':    { dir: 'ltr', name: 'Bahasa Indonesia',   translations: {} },
  'ms':    { dir: 'ltr', name: 'Bahasa Melayu',      translations: {} },
  'th':    { dir: 'ltr', name: 'ภาษาไทย',            translations: {} },
  'vi':    { dir: 'ltr', name: 'Tiếng Việt',         translations: {} },
  'uk':    { dir: 'ltr', name: 'Українська',         translations: {} },
  'cs':    { dir: 'ltr', name: 'Čeština',            translations: {} },
  'sk':    { dir: 'ltr', name: 'Slovenčina',         translations: {} },
  'ro':    { dir: 'ltr', name: 'Română',             translations: {} },
  'hu':    { dir: 'ltr', name: 'Magyar',             translations: {} },
  'el':    { dir: 'ltr', name: 'Ελληνικά',           translations: {} },
};

export const SUPPORTED_LOCALES = Object.entries(CATALOGS).map(([code, cfg]) => ({
  code,
  name:   cfg.name,
  dir:    cfg.dir,
}));

// ── In-memory cache (locale → key → translated string) ───────────────────────
const _cache = {};
function cacheKey(locale) {
  return (_cache[locale] = _cache[locale] || {});
}

// ── Detect browser locale ─────────────────────────────────────────────────────
export function detectLocale() {
  const stored = (() => { try { return localStorage.getItem('nexus:locale'); } catch { return null; } })();
  if (stored && CATALOGS[stored]) return stored;
  const nav = (navigator.languages?.[0] ?? navigator.language ?? 'en').replace(/_/g, '-');
  if (CATALOGS[nav])                           return nav;
  const region = nav.split('-')[0];
  const match  = Object.keys(CATALOGS).find(k => k.startsWith(region));
  return match || 'en';
}

// ── Persist locale choice ─────────────────────────────────────────────────────
export function setLocale(code) {
  try { localStorage.setItem('nexus:locale', code); } catch {}
  const dir = CATALOGS[code]?.dir ?? 'ltr';
  document.documentElement.setAttribute('lang', code);
  document.documentElement.setAttribute('dir', dir);
}

// ── Variable interpolation  ───────────────────────────────────────────────────
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? vars[k] : `{{${k}}}`));
}

// ── Simple plural selector (English two-form; extend per locale as needed) ───
function plural(n, forms) {
  // forms: [one, other] or { one: '…', other: '…' }
  const arr = Array.isArray(forms) ? forms : [forms.one, forms.other];
  return n === 1 ? arr[0] : arr[1];
}

// ── Main translate function ───────────────────────────────────────────────────
export function t(key, vars = null, locale = detectLocale()) {
  const cache = cacheKey(locale);
  const str   = cache[key] ?? CATALOGS[locale]?.translations[key] ?? CATALOGS['en']?.translations[key] ?? key;
  return interpolate(str, vars);
}

// ── Auto-translate via server (Google Translate API proxy) ───────────────────
const _pending = new Map();

export async function autoTranslate(texts, targetLocale) {
  if (!targetLocale || targetLocale === 'en') return Object.fromEntries(texts.map(t => [t, t]));
  const pending = texts.filter(text => !cacheKey(targetLocale)[text]);
  if (!pending.length) {
    return Object.fromEntries(texts.map(text => [text, cacheKey(targetLocale)[text] || text]));
  }

  // Deduplicate in-flight requests
  const dedupKey = `${targetLocale}::${pending.slice().sort().join('|')}`;
  if (_pending.has(dedupKey)) {
    await _pending.get(dedupKey);
    return Object.fromEntries(texts.map(text => [text, cacheKey(targetLocale)[text] || text]));
  }

  const p = fetch('/api/i18n/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(() => { try { return localStorage.getItem('nexus:token'); } catch { return ''; } })() ?? ''}`,
    },
    body: JSON.stringify({ texts: pending, targetLocale }),
  })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.translations) {
        const cache = cacheKey(targetLocale);
        Object.assign(cache, data.translations);
      }
      _pending.delete(dedupKey);
    })
    .catch(() => _pending.delete(dedupKey));

  _pending.set(dedupKey, p);
  await p;
  return Object.fromEntries(texts.map(text => [text, cacheKey(targetLocale)[text] || text]));
}

// ── Preload a locale from the server translation bundle ───────────────────────
export async function loadLocale(locale) {
  if (locale === 'en' || Object.keys(cacheKey(locale)).length > 0) return;
  try {
    const resp = await fetch(`/api/i18n/locale/${locale}`, {
      headers: { 'Authorization': `Bearer ${(() => { try { return localStorage.getItem('nexus:token'); } catch { return ''; } })() ?? ''}` },
    });
    if (!resp.ok) return;
    const data = await resp.json();
    Object.assign(cacheKey(locale), data.translations ?? {});
  } catch {}
}

// ── Regional formatters ───────────────────────────────────────────────────────
export function fmtNumber(n, locale = detectLocale(), opts = {}) {
  try { return new Intl.NumberFormat(locale, opts).format(n); } catch { return String(n); }
}

export function fmtCurrency(amount, currency = 'USD', locale = detectLocale()) {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount); } catch { return `${currency} ${amount}`; }
}

export function fmtDate(date, locale = detectLocale(), opts = { dateStyle: 'medium' }) {
  try { return new Intl.DateTimeFormat(locale, opts).format(date instanceof Date ? date : new Date(date)); } catch { return String(date); }
}

export function fmtRelTime(ms, locale = detectLocale()) {
  const sec = Math.round(ms / 1000);
  const min = Math.round(sec / 60);
  const hr  = Math.round(min / 60);
  const day = Math.round(hr / 24);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(sec)  <  60) return rtf.format(-sec, 'second');
    if (Math.abs(min)  <  60) return rtf.format(-min, 'minute');
    if (Math.abs(hr)   <  24) return rtf.format(-hr,  'hour');
    return rtf.format(-day, 'day');
  } catch { return `${Math.abs(day)}d ago`; }
}

// ── React hook ────────────────────────────────────────────────────────────────
import { useState as _useState, useEffect as _useEffect, useCallback as _useCallback } from 'react';

export function useI18n() {
  const [locale, setLocaleState] = _useState(detectLocale);

  _useEffect(() => {
    setLocale(locale);
    loadLocale(locale);
  }, [locale]);

  const changeLocale = _useCallback((code) => {
    if (!CATALOGS[code]) return;
    setLocale(code);
    setLocaleState(code);
  }, []);

  const translate = _useCallback(
    (key, vars) => t(key, vars, locale),
    [locale],
  );

  return { locale, changeLocale, t: translate, fmtNumber, fmtCurrency, fmtDate, fmtRelTime };
}

// LocaleSelector is exported from ./LocaleSelector.jsx
