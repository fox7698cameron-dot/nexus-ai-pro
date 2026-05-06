// src/i18n/index.js
// Nexus AI Pro — Multi-Language & Regional Support
// Auto-translate via Google Translate API (env-key backed)
// Supported: en, es, fr, de, ja, ko, zh-CN, zh-TW, ar, pt, hi, ru, it, nl
// Updated: 2026-05-06

// ── Locale definitions ────────────────────────────────────────────────────────
export const LOCALES = {
  en:    { label: 'English',             dir: 'ltr', region: 'US', flag: '🇺🇸' },
  es:    { label: 'Español',             dir: 'ltr', region: 'ES', flag: '🇪🇸' },
  fr:    { label: 'Français',            dir: 'ltr', region: 'FR', flag: '🇫🇷' },
  de:    { label: 'Deutsch',             dir: 'ltr', region: 'DE', flag: '🇩🇪' },
  ja:    { label: '日本語',               dir: 'ltr', region: 'JP', flag: '🇯🇵' },
  ko:    { label: '한국어',               dir: 'ltr', region: 'KR', flag: '🇰🇷' },
  'zh-CN': { label: '简体中文',           dir: 'ltr', region: 'CN', flag: '🇨🇳' },
  'zh-TW': { label: '繁體中文',           dir: 'ltr', region: 'TW', flag: '🇹🇼' },
  ar:    { label: 'العربية',             dir: 'rtl', region: 'SA', flag: '🇸🇦' },
  pt:    { label: 'Português',           dir: 'ltr', region: 'BR', flag: '🇧🇷' },
  hi:    { label: 'हिन्दी',              dir: 'ltr', region: 'IN', flag: '🇮🇳' },
  ru:    { label: 'Русский',             dir: 'ltr', region: 'RU', flag: '🇷🇺' },
  it:    { label: 'Italiano',            dir: 'ltr', region: 'IT', flag: '🇮🇹' },
  nl:    { label: 'Nederlands',          dir: 'ltr', region: 'NL', flag: '🇳🇱' },
  tr:    { label: 'Türkçe',             dir: 'ltr', region: 'TR', flag: '🇹🇷' },
  pl:    { label: 'Polski',             dir: 'ltr', region: 'PL', flag: '🇵🇱' },
  sv:    { label: 'Svenska',            dir: 'ltr', region: 'SE', flag: '🇸🇪' },
  vi:    { label: 'Tiếng Việt',         dir: 'ltr', region: 'VN', flag: '🇻🇳' },
  th:    { label: 'ภาษาไทย',             dir: 'ltr', region: 'TH', flag: '🇹🇭' },
  id:    { label: 'Bahasa Indonesia',   dir: 'ltr', region: 'ID', flag: '🇮🇩' },
};

// ── Base English strings ──────────────────────────────────────────────────────
const EN_STRINGS = {
  // Navigation
  'nav.home':          'Home',
  'nav.analytics':     'Analytics',
  'nav.security':      'Security',
  'nav.projects':      'Projects',
  'nav.subscriptions': 'Subscriptions',
  'nav.settings':      'Settings',
  'nav.logout':        'Log Out',

  // Auth
  'auth.signin':       'Sign In',
  'auth.register':     'Register',
  'auth.email':        'Email',
  'auth.password':     'Password',
  'auth.username':     'Username',
  'auth.forgot':       'Forgot Password?',
  'auth.2fa':          'Two-Factor Authentication',
  'auth.biometric':    'Use Biometrics',
  'auth.welcome':      'Welcome back',

  // Dashboard
  'dash.title':        'Dashboard',
  'dash.overview':     'Overview',
  'dash.realtime':     'Real-time',
  'dash.paused':       'Paused',
  'dash.live':         'Live',
  'dash.refresh':      'Refresh',
  'dash.scan':         'Run Scan',
  'dash.scanning':     'Scanning…',

  // Analytics
  'analytics.views':       'Views',
  'analytics.reach':       'Reach',
  'analytics.likes':       'Likes',
  'analytics.followers':   'Followers',
  'analytics.engagement':  'Engagement Rate',
  'analytics.retention':   'Retention',
  'analytics.watchTime':   'Watch Time',
  'analytics.totalViews':  'Total Views',
  'analytics.totalReach':  'Total Reach',

  // Security
  'security.score':       'Security Score',
  'security.threats':     'Threats Blocked',
  'security.encryption':  'Encryption Active',
  'security.findings':    'Findings',
  'security.patching':    'Patch',
  'security.resolved':    'Resolved',
  'security.network':     'Network Status',

  // Projects
  'projects.progress': 'Progress',
  'projects.commits':  'Commits',
  'projects.hours':    'Hours Logged',
  'projects.lines':    'Lines of Code',
  'projects.status':   'Status',
  'projects.active':   'Active',
  'projects.paused':   'Paused',
  'projects.done':     'Completed',

  // Subscriptions
  'sub.plan':          'Your Plan',
  'sub.upgrade':       'Upgrade',
  'sub.payment':       'Payment',
  'sub.card':          'Card',
  'sub.crypto':        'Crypto',
  'sub.giftcard':      'Gift Card',
  'sub.subscribe':     'Subscribe',
  'sub.cancel':        'Cancel',

  // Errors
  'err.generic':       'Something went wrong.',
  'err.network':       'Network error — check your connection.',
  'err.unauthorized':  'Unauthorized. Please sign in again.',
  'err.notfound':      'Not found.',
};

// ── In-memory translation cache ───────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 3_600_000; // 1 hour

function cacheKey(text, targetLang) { return `${targetLang}::${text}`; }

// ── Auto-translate via Google Translate REST API ──────────────────────────────
// Requires VITE_GOOGLE_TRANSLATE_KEY env var (client-safe key restricted to Translate API)
async function translateText(text, targetLang) {
  if (targetLang === 'en') return text;
  const key = cacheKey(text, targetLang);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;

  const apiKey = import.meta.env?.VITE_GOOGLE_TRANSLATE_KEY;
  if (!apiKey) return text; // Fall back to English when no key

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target: targetLang, format: 'text' }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data?.data?.translations?.[0]?.translatedText ?? text;
    cache.set(key, { value: translated, ts: Date.now() });
    return translated;
  } catch {
    return text;
  }
}

// ── I18n class ────────────────────────────────────────────────────────────────
class I18n {
  constructor() {
    this._locale   = this._detect();
    this._strings  = { ...EN_STRINGS };
    this._loaded   = new Set(['en']);
    this._listeners = [];
  }

  _detect() {
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem('nexus:locale');
    if (stored && LOCALES[stored]) return stored;
    const browser = typeof navigator !== 'undefined' ? (navigator.language || navigator.languages?.[0] || 'en').split('-')[0] : 'en';
    const full = typeof navigator !== 'undefined' ? navigator.language : 'en';
    return LOCALES[full] ? full : (LOCALES[browser] ? browser : 'en');
  }

  get locale() { return this._locale; }
  get dir()    { return LOCALES[this._locale]?.dir || 'ltr'; }

  async setLocale(lang) {
    if (!LOCALES[lang]) throw new Error(`Unsupported locale: ${lang}`);
    this._locale = lang;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir  = this.dir;
    }
    this._notify();
  }

  // Translate a key (returns English string if locale is 'en' or translation missing)
  t(key, vars = {}) {
    const base = this._strings[key] ?? key;
    if (typeof vars === 'object') {
      return base.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    }
    return base;
  }

  // Auto-translate arbitrary text using Google Translate
  async translate(text, targetLang = this._locale) {
    return translateText(text, targetLang);
  }

  // Batch translate all UI strings for a locale
  async preloadLocale(lang) {
    if (lang === 'en' || this._loaded.has(lang)) return;
    const keys   = Object.keys(EN_STRINGS);
    const values = Object.values(EN_STRINGS);
    const translated = await Promise.all(values.map((v) => translateText(v, lang)));
    if (lang === this._locale) {
      keys.forEach((k, i) => { this._strings[k] = translated[i]; });
    }
    this._loaded.add(lang);
  }

  // Number formatting
  formatNumber(n, opts = {}) {
    return new Intl.NumberFormat(this._locale, opts).format(n);
  }

  // Date formatting
  formatDate(ts, opts = {}) {
    return new Intl.DateTimeFormat(this._locale, { dateStyle: 'medium', ...opts }).format(new Date(ts));
  }

  // Currency formatting
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this._locale, { style: 'currency', currency }).format(amount);
  }

  // Relative time (e.g. "3 days ago")
  formatRelative(ts) {
    const rtf = new Intl.RelativeTimeFormat(this._locale, { numeric: 'auto' });
    const diff = (ts - Date.now()) / 1000;
    if (Math.abs(diff) < 60)   return rtf.format(Math.round(diff), 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400)return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  }

  subscribe(fn)   { this._listeners.push(fn); }
  unsubscribe(fn) { this._listeners = this._listeners.filter((l) => l !== fn); }
  _notify()       { this._listeners.forEach((fn) => fn(this._locale)); }
}

export const i18n = new I18n();
export default i18n;
