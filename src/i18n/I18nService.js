// src/i18n/I18nService.js
// Nexus AI Pro — Internationalization & Auto-Translation Service
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Supports: 30+ languages, regional formatting (currency, date, number),
//           auto-translation via Google Translate / DeepL,
//           Accept-Language header parsing, RTL support.

import acceptLanguage from 'accept-language-parser';

// ---------------------------------------------------------------------------
// SUPPORTED LOCALES
// ---------------------------------------------------------------------------
export const SUPPORTED_LOCALES = {
  'en':    { name: 'English',    nativeName: 'English',      rtl: false, region: 'US' },
  'es':    { name: 'Spanish',    nativeName: 'Español',      rtl: false, region: 'ES' },
  'fr':    { name: 'French',     nativeName: 'Français',     rtl: false, region: 'FR' },
  'de':    { name: 'German',     nativeName: 'Deutsch',      rtl: false, region: 'DE' },
  'pt':    { name: 'Portuguese', nativeName: 'Português',    rtl: false, region: 'BR' },
  'it':    { name: 'Italian',    nativeName: 'Italiano',     rtl: false, region: 'IT' },
  'ja':    { name: 'Japanese',   nativeName: '日本語',       rtl: false, region: 'JP' },
  'ko':    { name: 'Korean',     nativeName: '한국어',       rtl: false, region: 'KR' },
  'zh':    { name: 'Chinese (Simplified)',  nativeName: '中文',    rtl: false, region: 'CN' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', rtl: false, region: 'TW' },
  'ar':    { name: 'Arabic',     nativeName: 'العربية',      rtl: true,  region: 'SA' },
  'he':    { name: 'Hebrew',     nativeName: 'עברית',        rtl: true,  region: 'IL' },
  'fa':    { name: 'Persian',    nativeName: 'فارسی',        rtl: true,  region: 'IR' },
  'ru':    { name: 'Russian',    nativeName: 'Русский',      rtl: false, region: 'RU' },
  'pl':    { name: 'Polish',     nativeName: 'Polski',       rtl: false, region: 'PL' },
  'nl':    { name: 'Dutch',      nativeName: 'Nederlands',   rtl: false, region: 'NL' },
  'sv':    { name: 'Swedish',    nativeName: 'Svenska',      rtl: false, region: 'SE' },
  'tr':    { name: 'Turkish',    nativeName: 'Türkçe',       rtl: false, region: 'TR' },
  'hi':    { name: 'Hindi',      nativeName: 'हिन्दी',     rtl: false, region: 'IN' },
  'bn':    { name: 'Bengali',    nativeName: 'বাংলা',       rtl: false, region: 'BD' },
  'vi':    { name: 'Vietnamese', nativeName: 'Tiếng Việt',  rtl: false, region: 'VN' },
  'th':    { name: 'Thai',       nativeName: 'ภาษาไทย',     rtl: false, region: 'TH' },
  'id':    { name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, region: 'ID' },
  'ms':    { name: 'Malay',      nativeName: 'Bahasa Melayu',   rtl: false, region: 'MY' },
  'uk':    { name: 'Ukrainian',  nativeName: 'Українська',   rtl: false, region: 'UA' },
  'cs':    { name: 'Czech',      nativeName: 'Čeština',      rtl: false, region: 'CZ' },
  'hu':    { name: 'Hungarian',  nativeName: 'Magyar',       rtl: false, region: 'HU' },
  'ro':    { name: 'Romanian',   nativeName: 'Română',       rtl: false, region: 'RO' },
  'fi':    { name: 'Finnish',    nativeName: 'Suomi',        rtl: false, region: 'FI' },
  'el':    { name: 'Greek',      nativeName: 'Ελληνικά',    rtl: false, region: 'GR' },
};

export const DEFAULT_LOCALE = 'en';

// ---------------------------------------------------------------------------
// I18N SERVICE
// ---------------------------------------------------------------------------
export class I18nService {
  constructor(redisClient = null) {
    this.redis = redisClient;
    this._cache = new Map();
    this._CACHE_TTL = 3600; // 1 hour
    // In-memory translation strings per locale (key → translation)
    this._strings = new Map();
    this._loadBuiltinStrings();
  }

  // -------------------------------------------------------------------------
  // LOCALE DETECTION
  // -------------------------------------------------------------------------

  /** Detect best locale from Accept-Language header */
  detectLocale(acceptLanguageHeader) {
    if (!acceptLanguageHeader) return DEFAULT_LOCALE;
    const parsed   = acceptLanguage.parse(acceptLanguageHeader);
    for (const { code, region } of parsed) {
      const full = region ? `${code}-${region}` : code;
      if (SUPPORTED_LOCALES[full])  return full;
      if (SUPPORTED_LOCALES[code])  return code;
    }
    return DEFAULT_LOCALE;
  }

  getLocaleInfo(locale) {
    return SUPPORTED_LOCALES[locale] ?? SUPPORTED_LOCALES[DEFAULT_LOCALE];
  }

  isRTL(locale) {
    return this.getLocaleInfo(locale).rtl ?? false;
  }

  listLocales() {
    return Object.entries(SUPPORTED_LOCALES).map(([code, info]) => ({ code, ...info }));
  }

  // -------------------------------------------------------------------------
  // TRANSLATION
  // -------------------------------------------------------------------------

  /** Translate text using Google Translate or DeepL — no hardcoded keys */
  async translate(text, targetLocale, sourceLocale = 'en') {
    if (!text?.trim())          return text;
    if (targetLocale === sourceLocale) return text;
    if (!SUPPORTED_LOCALES[targetLocale]) throw new Error(`Unsupported locale: ${targetLocale}`);

    const cacheKey = `t:${sourceLocale}:${targetLocale}:${this._hashText(text)}`;
    const cached   = await this._getCache(cacheKey);
    if (cached) return cached;

    let translated;
    if (process.env.DEEPL_API_KEY) {
      translated = await this._translateDeepL(text, targetLocale, sourceLocale);
    } else if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      translated = await this._translateGoogle(text, targetLocale, sourceLocale);
    } else {
      // Fallback: return original with locale tag (signal for frontend to use browser translate)
      return text;
    }

    await this._setCache(cacheKey, translated, this._CACHE_TTL);
    return translated;
  }

  /** Translate multiple strings in one batch */
  async translateBatch(texts, targetLocale, sourceLocale = 'en') {
    return Promise.all(texts.map(t => this.translate(t, targetLocale, sourceLocale)));
  }

  // -------------------------------------------------------------------------
  // FORMATTING
  // -------------------------------------------------------------------------

  formatNumber(value, locale, options = {}) {
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch {
      return String(value);
    }
  }

  formatCurrency(amount, locale, currency = 'USD') {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  formatDate(date, locale, options = {}) {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', ...options }).format(new Date(date));
    } catch {
      return String(date);
    }
  }

  formatRelativeTime(date, locale) {
    try {
      const rtf   = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const diff  = (new Date(date) - Date.now()) / 1000;
      const units = [
        { unit: 'year',   sec: 31536000 },
        { unit: 'month',  sec: 2592000  },
        { unit: 'week',   sec: 604800   },
        { unit: 'day',    sec: 86400    },
        { unit: 'hour',   sec: 3600     },
        { unit: 'minute', sec: 60       },
        { unit: 'second', sec: 1        },
      ];
      for (const { unit, sec } of units) {
        if (Math.abs(diff) >= sec) {
          return rtf.format(Math.round(diff / sec), unit);
        }
      }
      return rtf.format(0, 'second');
    } catch {
      return new Date(date).toLocaleString();
    }
  }

  // -------------------------------------------------------------------------
  // STRING CATALOG
  // -------------------------------------------------------------------------

  getString(key, locale = DEFAULT_LOCALE, vars = {}) {
    const catalog = this._strings.get(locale) ?? this._strings.get(DEFAULT_LOCALE) ?? {};
    let str = catalog[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return str;
  }

  loadStrings(locale, strings) {
    const existing = this._strings.get(locale) ?? {};
    this._strings.set(locale, { ...existing, ...strings });
  }

  // -------------------------------------------------------------------------
  // EXPRESS MIDDLEWARE
  // -------------------------------------------------------------------------
  middleware() {
    return (req, res, next) => {
      const locale = this.detectLocale(req.headers['accept-language']);
      req.locale   = locale;
      req.i18n     = {
        t:         (key, vars) => this.getString(key, locale, vars),
        locale,
        isRTL:     this.isRTL(locale),
        localeInfo: this.getLocaleInfo(locale),
      };
      res.setHeader('Content-Language', locale);
      next();
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE — Translation backends
  // -------------------------------------------------------------------------

  async _translateGoogle(text, target, source) {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const url    = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const body   = { q: text, source, target, format: 'text' };
    const res    = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google Translate error ${res.status}`);
    const data = await res.json();
    return data?.data?.translations?.[0]?.translatedText ?? text;
  }

  async _translateDeepL(text, target, source) {
    const apiKey   = process.env.DEEPL_API_KEY;
    const baseUrl  = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const params = new URLSearchParams({
      auth_key:    apiKey,
      text,
      source_lang: source.split('-')[0].toUpperCase(),
      target_lang: target.replace('-', '_').toUpperCase(),
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`DeepL error ${res.status}`);
    const data = await res.json();
    return data?.translations?.[0]?.text ?? text;
  }

  _hashText(text) {
    // Simple djb2-style hash for cache keys (not cryptographic — just dedup)
    let h = 5381;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) + h) ^ text.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  // Cache helpers
  async _getCache(key) {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ?? null;
    }
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.exp) { this._cache.delete(key); return null; }
    return entry.value;
  }

  async _setCache(key, value, ttlSec) {
    if (this.redis) {
      await this.redis.setex(key, ttlSec, value);
    } else {
      this._cache.set(key, { value, exp: Date.now() + ttlSec * 1000 });
    }
  }

  // -------------------------------------------------------------------------
  // BUILT-IN STRING CATALOG
  // -------------------------------------------------------------------------
  _loadBuiltinStrings() {
    this.loadStrings('en', {
      'auth.login':             'Sign In',
      'auth.register':          'Create Account',
      'auth.logout':            'Sign Out',
      'auth.mfa_required':      'Enter your authentication code',
      'auth.password_too_weak': 'Password must be at least {min} characters and include uppercase, lowercase, digit, and special character.',
      'auth.invalid_credentials':'Invalid email or password.',
      'auth.account_locked':    'Account locked. Try again in {minutes} minutes.',
      'dashboard.welcome':      'Welcome back, {name}!',
      'dashboard.analytics':    'Analytics',
      'dashboard.security':     'Security',
      'dashboard.projects':     'Projects',
      'payment.subscribe':      'Subscribe',
      'payment.cancel':         'Cancel Subscription',
      'payment.gift_card':      'Redeem Gift Card',
      'error.generic':          'Something went wrong. Please try again.',
      'error.network':          'Network error. Check your connection.',
    });

    this.loadStrings('es', {
      'auth.login':             'Iniciar sesión',
      'auth.register':          'Crear cuenta',
      'auth.logout':            'Cerrar sesión',
      'auth.mfa_required':      'Ingresa tu código de autenticación',
      'auth.invalid_credentials':'Email o contraseña incorrectos.',
      'dashboard.welcome':      '¡Bienvenido de vuelta, {name}!',
      'dashboard.analytics':    'Análisis',
      'dashboard.security':     'Seguridad',
      'dashboard.projects':     'Proyectos',
      'payment.subscribe':      'Suscribirse',
      'error.generic':          'Algo salió mal. Por favor, inténtalo de nuevo.',
    });

    this.loadStrings('fr', {
      'auth.login':             'Se connecter',
      'auth.register':          'Créer un compte',
      'auth.logout':            'Se déconnecter',
      'dashboard.welcome':      'Bienvenue, {name}!',
      'dashboard.analytics':    'Analytique',
      'dashboard.security':     'Sécurité',
      'dashboard.projects':     'Projets',
      'error.generic':          'Une erreur est survenue. Veuillez réessayer.',
    });

    this.loadStrings('de', {
      'auth.login':             'Anmelden',
      'auth.register':          'Konto erstellen',
      'auth.logout':            'Abmelden',
      'dashboard.welcome':      'Willkommen zurück, {name}!',
      'dashboard.analytics':    'Analytik',
      'dashboard.security':     'Sicherheit',
      'dashboard.projects':     'Projekte',
      'error.generic':          'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    });

    this.loadStrings('ja', {
      'auth.login':             'サインイン',
      'auth.register':          'アカウント作成',
      'auth.logout':            'サインアウト',
      'dashboard.welcome':      'おかえりなさい、{name}さん！',
      'dashboard.analytics':    '分析',
      'dashboard.security':     'セキュリティ',
      'dashboard.projects':     'プロジェクト',
      'error.generic':          'エラーが発生しました。もう一度お試しください。',
    });

    // Additional languages load the same pattern — full catalogs should be
    // loaded from locale JSON files at startup in production.
  }
}
