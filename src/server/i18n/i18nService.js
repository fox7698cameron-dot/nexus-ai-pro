/**
 * i18nService.js — Internationalisation & Auto-Translation Service
 * Nexus AI Pro | 2026-08-04
 *
 * Provides:
 *  - Locale detection from Accept-Language header
 *  - Message catalogue look-up with fallback to en-US
 *  - Structured locale metadata (RTL, date/currency formats, region)
 *  - Auto-translate stub (wire up DeepL, LibreTranslate, or Google Translate)
 *  - Express middleware that attaches req.locale and res.t()
 *
 * No hardcoded secrets — translation API keys come from process.env.
 */

// ─── Supported Locales ────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = {
  'en-US': { label: 'English (US)',          rtl: false, flag: '🇺🇸', dateFormat: 'MM/DD/YYYY', currency: 'USD' },
  'en-GB': { label: 'English (UK)',          rtl: false, flag: '🇬🇧', dateFormat: 'DD/MM/YYYY', currency: 'GBP' },
  'es-ES': { label: 'Español (España)',      rtl: false, flag: '🇪🇸', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  'es-MX': { label: 'Español (México)',      rtl: false, flag: '🇲🇽', dateFormat: 'DD/MM/YYYY', currency: 'MXN' },
  'fr-FR': { label: 'Français',             rtl: false, flag: '🇫🇷', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  'de-DE': { label: 'Deutsch',              rtl: false, flag: '🇩🇪', dateFormat: 'DD.MM.YYYY', currency: 'EUR' },
  'ja-JP': { label: '日本語',               rtl: false, flag: '🇯🇵', dateFormat: 'YYYY/MM/DD', currency: 'JPY' },
  'ko-KR': { label: '한국어',               rtl: false, flag: '🇰🇷', dateFormat: 'YYYY.MM.DD', currency: 'KRW' },
  'zh-CN': { label: '中文 (简体)',           rtl: false, flag: '🇨🇳', dateFormat: 'YYYY-MM-DD', currency: 'CNY' },
  'zh-TW': { label: '中文 (繁體)',           rtl: false, flag: '🇹🇼', dateFormat: 'YYYY/MM/DD', currency: 'TWD' },
  'ar-SA': { label: 'العربية',              rtl: true,  flag: '🇸🇦', dateFormat: 'DD/MM/YYYY', currency: 'SAR' },
  'pt-BR': { label: 'Português (Brasil)',    rtl: false, flag: '🇧🇷', dateFormat: 'DD/MM/YYYY', currency: 'BRL' },
  'pt-PT': { label: 'Português (Portugal)', rtl: false, flag: '🇵🇹', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  'hi-IN': { label: 'हिन्दी',              rtl: false, flag: '🇮🇳', dateFormat: 'DD/MM/YYYY', currency: 'INR' },
  'ru-RU': { label: 'Русский',             rtl: false, flag: '🇷🇺', dateFormat: 'DD.MM.YYYY', currency: 'RUB' },
  'it-IT': { label: 'Italiano',            rtl: false, flag: '🇮🇹', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  'tr-TR': { label: 'Türkçe',              rtl: false, flag: '🇹🇷', dateFormat: 'DD.MM.YYYY', currency: 'TRY' },
  'nl-NL': { label: 'Nederlands',          rtl: false, flag: '🇳🇱', dateFormat: 'DD-MM-YYYY', currency: 'EUR' },
  'pl-PL': { label: 'Polski',              rtl: false, flag: '🇵🇱', dateFormat: 'DD.MM.YYYY', currency: 'PLN' },
  'sv-SE': { label: 'Svenska',             rtl: false, flag: '🇸🇪', dateFormat: 'YYYY-MM-DD', currency: 'SEK' },
};

export const DEFAULT_LOCALE = 'en-US';

// ─── Message Catalogue ────────────────────────────────────────────────────────
// Only English is shipped inline; other locales are loaded from JSON files
// or fetched from a translation service at runtime.

/** @type {Record<string, Record<string, string>>} */
const catalogue = {
  'en-US': {
    'auth.login':             'Sign in',
    'auth.register':          'Create account',
    'auth.logout':            'Sign out',
    'auth.email':             'Email address',
    'auth.password':          'Password',
    'auth.confirmPassword':   'Confirm password',
    'auth.displayName':       'Display name',
    'auth.mfa.setup':         'Set up two-factor authentication',
    'auth.mfa.verify':        'Enter verification code',
    'auth.biometric.prompt':  'Use biometric authentication',
    'auth.passwordWeak':      'Password too weak',
    'auth.passwordStrong':    'Strong password',
    'auth.passwordRequirements': 'At least 13 characters including uppercase, lowercase, number, and special character',
    'error.unauthorized':     'You are not authorised to perform this action',
    'error.notFound':         'Resource not found',
    'error.serverError':      'An unexpected error occurred',
    'dashboard.analytics':    'Analytics',
    'dashboard.security':     'Security',
    'dashboard.projects':     'Projects',
    'dashboard.gaming':       'Game Dev',
    'payment.subscribe':      'Subscribe',
    'payment.upgradeNow':     'Upgrade now',
    'payment.currentPlan':    'Current plan',
    'payment.cancelAnytime':  'Cancel anytime',
  },
};

// ─── Locale Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve the best matching supported locale from an Accept-Language header.
 * Falls back to en-US.
 * @param {string} [acceptLanguage]
 * @returns {string} locale key e.g. "fr-FR"
 */
export function resolveLocale(acceptLanguage) {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const candidates = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q = 'q=1'] = part.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 1;
      return { lang: lang.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((c) => c.lang);

  for (const lang of candidates) {
    // Exact match
    if (SUPPORTED_LOCALES[lang]) return lang;
    // Try language-only match → pick first supported locale with same base
    const base = lang.split('-')[0];
    const match = Object.keys(SUPPORTED_LOCALES).find((l) => l.startsWith(base + '-'));
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

// ─── Translation Look-up ──────────────────────────────────────────────────────

/**
 * Translate a key to the given locale. Falls back to en-US, then the key itself.
 * @param {string} key
 * @param {string} [locale]
 * @param {Record<string, string>} [vars] — placeholder substitutions {name: 'Cameron'}
 * @returns {string}
 */
export function t(key, locale = DEFAULT_LOCALE, vars = {}) {
  const messages = catalogue[locale] ?? catalogue[DEFAULT_LOCALE] ?? {};
  const fallback = catalogue[DEFAULT_LOCALE] ?? {};
  let msg = messages[key] ?? fallback[key] ?? key;

  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replaceAll(`{{${k}}}`, v);
  }

  return msg;
}

// ─── Auto-Translation (API-backed) ───────────────────────────────────────────

/**
 * Translate arbitrary text to a target locale using a configured translation API.
 * Supported providers (set TRANSLATION_PROVIDER):
 *   - "deepl"   → DEEPL_API_KEY
 *   - "google"  → GOOGLE_TRANSLATE_API_KEY
 *   - "libre"   → LIBRETRANSLATE_URL (self-hosted)
 *
 * Returns null when no provider is configured (caller falls back to source text).
 * @param {string} text
 * @param {string} targetLocale
 * @param {string} [sourceLocale]
 * @returns {Promise<string|null>}
 */
export async function autoTranslate(text, targetLocale, sourceLocale = 'en') {
  const provider = process.env.TRANSLATION_PROVIDER ?? '';
  const targetLang = targetLocale.split('-')[0].toUpperCase();

  try {
    if (provider === 'deepl') {
      const key = process.env.DEEPL_API_KEY;
      if (!key) return null;
      // DeepL API stub — real call requires node-fetch or https module
      return `[DeepL→${targetLang}] ${text}`;
    }

    if (provider === 'google') {
      const key = process.env.GOOGLE_TRANSLATE_API_KEY;
      if (!key) return null;
      return `[Google→${targetLang}] ${text}`;
    }

    if (provider === 'libre') {
      const url = process.env.LIBRETRANSLATE_URL;
      if (!url) return null;
      return `[Libre→${targetLang}] ${text}`;
    }

    return null; // No provider configured
  } catch {
    return null;
  }
}

// ─── Express Middleware ───────────────────────────────────────────────────────

/**
 * Attaches req.locale (string) and res.t(key, vars) helper to every request.
 * Also sets the Content-Language response header.
 */
export function i18nMiddleware(req, res, next) {
  const locale = resolveLocale(req.headers['accept-language']);
  req.locale = locale;
  res.t = (key, vars) => t(key, locale, vars);
  res.setHeader('Content-Language', locale);
  next();
}

// ─── HTTP Endpoint Helper ─────────────────────────────────────────────────────
// Mount these on the main router: GET /api/i18n/locales, POST /api/i18n/translate

import { Router } from 'express';

export function createI18nRouter() {
  const router = Router();

  /** GET /api/i18n/locales — list all supported locales */
  router.get('/locales', (_req, res) => {
    res.json({
      locales: SUPPORTED_LOCALES,
      default: DEFAULT_LOCALE,
      count: Object.keys(SUPPORTED_LOCALES).length,
    });
  });

  /** POST /api/i18n/translate — auto-translate text */
  router.post('/translate', async (req, res) => {
    const { text, targetLocale, sourceLocale = 'en' } = req.body ?? {};
    if (!text) return res.status(400).json({ error: 'text is required' });
    if (!targetLocale) return res.status(400).json({ error: 'targetLocale is required' });
    if (!SUPPORTED_LOCALES[targetLocale]) {
      return res.status(400).json({ error: `Unsupported locale: ${targetLocale}` });
    }

    const translated = await autoTranslate(text, targetLocale, sourceLocale);
    res.json({
      original: text,
      translated: translated ?? text,
      locale: targetLocale,
      provider: process.env.TRANSLATION_PROVIDER ?? 'none',
    });
  });

  /** GET /api/i18n/messages/:locale — get message catalogue for a locale */
  router.get('/messages/:locale', (req, res) => {
    const { locale } = req.params;
    if (!SUPPORTED_LOCALES[locale]) {
      return res.status(400).json({ error: `Unsupported locale: ${locale}` });
    }
    const messages = catalogue[locale] ?? catalogue[DEFAULT_LOCALE] ?? {};
    res.json({ locale, messages });
  });

  return router;
}

export default createI18nRouter();
