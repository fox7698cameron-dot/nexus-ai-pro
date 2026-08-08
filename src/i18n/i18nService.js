/**
 * src/i18n/i18nService.js
 * Nexus AI Pro — Internationalization & auto-translation service
 * Supports: 30+ locales, RTL languages, emoji in strings, regional formatting
 * Auto-translate: uses Google Cloud Translation or DeepL (env-configured)
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

// ── Supported locales ─────────────────────────────────────────────────────

export const LOCALES = Object.freeze({
  'en-US': { name: 'English (US)', rtl: false, dateFormat: 'MM/DD/YYYY' },
  'en-GB': { name: 'English (UK)', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'es-ES': { name: 'Español', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'es-MX': { name: 'Español (México)', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'fr-FR': { name: 'Français', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'de-DE': { name: 'Deutsch', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'it-IT': { name: 'Italiano', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'pt-BR': { name: 'Português (Brasil)', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'pt-PT': { name: 'Português', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'nl-NL': { name: 'Nederlands', rtl: false, dateFormat: 'DD-MM-YYYY' },
  'pl-PL': { name: 'Polski', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'ru-RU': { name: 'Русский', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'uk-UA': { name: 'Українська', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'zh-CN': { name: '简体中文', rtl: false, dateFormat: 'YYYY/MM/DD' },
  'zh-TW': { name: '繁體中文', rtl: false, dateFormat: 'YYYY/MM/DD' },
  'ja-JP': { name: '日本語', rtl: false, dateFormat: 'YYYY/MM/DD' },
  'ko-KR': { name: '한국어', rtl: false, dateFormat: 'YYYY.MM.DD' },
  'ar-SA': { name: 'العربية', rtl: true, dateFormat: 'DD/MM/YYYY' },
  'he-IL': { name: 'עברית', rtl: true, dateFormat: 'DD/MM/YYYY' },
  'fa-IR': { name: 'فارسی', rtl: true, dateFormat: 'DD/MM/YYYY' },
  'hi-IN': { name: 'हिन्दी', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'bn-BD': { name: 'বাংলা', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'tr-TR': { name: 'Türkçe', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'th-TH': { name: 'ไทย', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'vi-VN': { name: 'Tiếng Việt', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'id-ID': { name: 'Bahasa Indonesia', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'ms-MY': { name: 'Bahasa Melayu', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'sv-SE': { name: 'Svenska', rtl: false, dateFormat: 'YYYY-MM-DD' },
  'da-DK': { name: 'Dansk', rtl: false, dateFormat: 'DD-MM-YYYY' },
  'fi-FI': { name: 'Suomi', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'nb-NO': { name: 'Norsk', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'cs-CZ': { name: 'Čeština', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'hu-HU': { name: 'Magyar', rtl: false, dateFormat: 'YYYY.MM.DD' },
  'ro-RO': { name: 'Română', rtl: false, dateFormat: 'DD.MM.YYYY' },
  'el-GR': { name: 'Ελληνικά', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'sw-KE': { name: 'Kiswahili', rtl: false, dateFormat: 'DD/MM/YYYY' },
  'am-ET': { name: 'አማርኛ', rtl: false, dateFormat: 'DD/MM/YYYY' },
});

// ── Base English strings ───────────────────────────────────────────────────

const BASE_STRINGS = {
  'app.name': 'Nexus AI Pro',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.mfa.prompt': 'Enter your 2FA code',
  'auth.password.weak': 'Password is too weak',
  'auth.password.strong': 'Password strength: strong ✅',
  'auth.biometric.prompt': 'Authenticate with biometrics',
  'nav.home': 'Home',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.projects': 'Projects',
  'nav.gaming': 'Gaming',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin Panel',
  'dashboard.greeting': 'Welcome back, {{name}} 👋',
  'dashboard.today': "Today's overview",
  'project.create': 'New Project',
  'project.status.active': 'Active',
  'project.status.completed': 'Completed',
  'task.create': 'Add Task',
  'task.done': 'Mark Done',
  'analytics.title': 'Social Analytics',
  'analytics.total_followers': 'Total Followers',
  'analytics.total_views': 'Total Views',
  'analytics.total_reach': 'Total Reach',
  'security.status.secure': '🛡️ Secure',
  'security.status.warning': '⚠️ Warning',
  'security.status.critical': '🚨 Critical',
  'payment.subscribe': 'Subscribe',
  'payment.upgrade': 'Upgrade Plan',
  'error.generic': 'Something went wrong. Please try again.',
  'error.network': 'Network error. Check your connection.',
  'success.saved': 'Saved successfully ✅',
  'success.deleted': 'Deleted successfully',
};

// ── Translation cache ─────────────────────────────────────────────────────

const _translationCache = new Map(); // `${locale}:${key}` → translated string

// ── Auto-translation via Google Cloud Translate ───────────────────────────

async function googleTranslate(texts, targetLocale) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY not set');

  const langCode = targetLocale.split('-')[0]; // 'zh-CN' → 'zh'
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        target: langCode,
        format: 'text',
        source: 'en',
      }),
    }
  );
  if (!res.ok) throw new Error(`Google Translate error: ${res.status}`);
  const json = await res.json();
  return json.data.translations.map((t) => t.translatedText);
}

/** DeepL fallback */
async function deeplTranslate(texts, targetLocale) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) throw new Error('DEEPL_API_KEY not set');

  const deeplLang = targetLocale.replace('-', '_').toUpperCase();
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: texts.map((t) => `text=${encodeURIComponent(t)}`).join('&') + `&target_lang=${deeplLang}`,
  });
  if (!res.ok) throw new Error(`DeepL error: ${res.status}`);
  const json = await res.json();
  return json.translations.map((t) => t.text);
}

// ── i18nService ───────────────────────────────────────────────────────────

export class I18nService {
  constructor() {
    /** locale → { key → string } */
    this._catalogs = new Map([['en-US', { ...BASE_STRINGS }]]);
    /** Override store: add custom strings per locale */
    this._overrides = new Map();
  }

  // ── Locale management ─────────────────────────────────────────────────

  isSupported(locale) {
    return Object.prototype.hasOwnProperty.call(LOCALES, locale);
  }

  detect(acceptLanguageHeader) {
    if (!acceptLanguageHeader) return 'en-US';
    const parts = acceptLanguageHeader.split(',').map((p) => {
      const [lang, q = 'q=1'] = p.trim().split(';');
      return { lang: lang.trim(), q: parseFloat(q.split('=')[1]) || 1 };
    });
    parts.sort((a, b) => b.q - a.q);
    for (const { lang } of parts) {
      if (this.isSupported(lang)) return lang;
      // Try root locale (es-MX → es-ES)
      const root = `${lang.split('-')[0]}-`;
      const match = Object.keys(LOCALES).find((l) => l.startsWith(root));
      if (match) return match;
    }
    return 'en-US';
  }

  // ── Translation ────────────────────────────────────────────────────────

  t(locale, key, vars = {}) {
    const catalog = this._catalogs.get(locale) || {};
    const overrides = this._overrides.get(locale) || {};
    const enCatalog = this._catalogs.get('en-US') || {};
    let str = overrides[key] ?? catalog[key] ?? enCatalog[key] ?? key;

    // Variable interpolation: {{name}} → actual value
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
    return str;
  }

  /** Auto-translate all base strings to a locale and cache them */
  async populateLocale(locale, provider = 'google') {
    if (locale === 'en-US') return;
    if (!this.isSupported(locale)) throw new Error(`Unsupported locale: ${locale}`);

    const keys = Object.keys(BASE_STRINGS);
    const texts = keys.map((k) => BASE_STRINGS[k]);

    let translations;
    if (provider === 'deepl') {
      translations = await deeplTranslate(texts, locale);
    } else {
      translations = await googleTranslate(texts, locale);
    }

    const catalog = {};
    for (let i = 0; i < keys.length; i++) catalog[keys[i]] = translations[i];
    this._catalogs.set(locale, catalog);
    return catalog;
  }

  /** Add custom override strings (e.g. from CMS) */
  addOverrides(locale, strings) {
    const existing = this._overrides.get(locale) || {};
    this._overrides.set(locale, { ...existing, ...strings });
  }

  // ── Formatting ────────────────────────────────────────────────────────

  formatDate(locale, date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, options).format(d);
  }

  formatNumber(locale, n, options = {}) {
    return new Intl.NumberFormat(locale, options).format(n);
  }

  formatCurrency(locale, amount, currency = 'USD') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  }

  isRTL(locale) {
    return LOCALES[locale]?.rtl ?? false;
  }

  getTextDirection(locale) {
    return this.isRTL(locale) ? 'rtl' : 'ltr';
  }

  /** Return locale metadata for the client */
  getLocaleInfo(locale) {
    return LOCALES[locale] || LOCALES['en-US'];
  }

  listSupportedLocales() {
    return Object.entries(LOCALES).map(([code, info]) => ({ code, ...info }));
  }
}

export default I18nService;
