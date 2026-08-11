/**
 * src/i18n/index.js
 * Nexus AI Pro — Internationalization & Auto-Translation
 * Supports 20+ languages with regional locale formatting.
 * Secrets: TRANSLATION_API_KEY from env only — never hard-coded.
 * Date: 2026-08-11
 */

// ─── Supported Locales ────────────────────────────────────────────────────────
export const SUPPORTED_LOCALES = {
  'en-US': { name: 'English (US)',     dir: 'ltr', flag: '🇺🇸' },
  'en-GB': { name: 'English (UK)',     dir: 'ltr', flag: '🇬🇧' },
  'es-ES': { name: 'Español',          dir: 'ltr', flag: '🇪🇸' },
  'es-MX': { name: 'Español (México)', dir: 'ltr', flag: '🇲🇽' },
  'fr-FR': { name: 'Français',         dir: 'ltr', flag: '🇫🇷' },
  'de-DE': { name: 'Deutsch',          dir: 'ltr', flag: '🇩🇪' },
  'pt-BR': { name: 'Português (BR)',   dir: 'ltr', flag: '🇧🇷' },
  'pt-PT': { name: 'Português',        dir: 'ltr', flag: '🇵🇹' },
  'it-IT': { name: 'Italiano',         dir: 'ltr', flag: '🇮🇹' },
  'nl-NL': { name: 'Nederlands',       dir: 'ltr', flag: '🇳🇱' },
  'pl-PL': { name: 'Polski',           dir: 'ltr', flag: '🇵🇱' },
  'ru-RU': { name: 'Русский',          dir: 'ltr', flag: '🇷🇺' },
  'zh-CN': { name: '简体中文',          dir: 'ltr', flag: '🇨🇳' },
  'zh-TW': { name: '繁體中文',          dir: 'ltr', flag: '🇹🇼' },
  'ja-JP': { name: '日本語',            dir: 'ltr', flag: '🇯🇵' },
  'ko-KR': { name: '한국어',            dir: 'ltr', flag: '🇰🇷' },
  'ar-SA': { name: 'العربية',           dir: 'rtl', flag: '🇸🇦' },
  'he-IL': { name: 'עברית',             dir: 'rtl', flag: '🇮🇱' },
  'hi-IN': { name: 'हिन्दी',            dir: 'ltr', flag: '🇮🇳' },
  'tr-TR': { name: 'Türkçe',           dir: 'ltr', flag: '🇹🇷' },
  'vi-VN': { name: 'Tiếng Việt',       dir: 'ltr', flag: '🇻🇳' },
  'id-ID': { name: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩' },
  'th-TH': { name: 'ภาษาไทย',           dir: 'ltr', flag: '🇹🇭' },
  'sv-SE': { name: 'Svenska',          dir: 'ltr', flag: '🇸🇪' },
  'da-DK': { name: 'Dansk',            dir: 'ltr', flag: '🇩🇰' },
  'fi-FI': { name: 'Suomi',            dir: 'ltr', flag: '🇫🇮' },
  'no-NO': { name: 'Norsk',            dir: 'ltr', flag: '🇳🇴' },
  'uk-UA': { name: 'Українська',       dir: 'ltr', flag: '🇺🇦' },
};

// ─── Base English Translations ────────────────────────────────────────────────
const EN_US = {
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    create: 'Create', update: 'Update', search: 'Search', loading: 'Loading…',
    error: 'Error', success: 'Success', warning: 'Warning', info: 'Info',
    confirm: 'Confirm', back: 'Back', next: 'Next', close: 'Close',
    yes: 'Yes', no: 'No', ok: 'OK', submit: 'Submit', reset: 'Reset',
    upload: 'Upload', download: 'Download', share: 'Share', copy: 'Copy',
    settings: 'Settings', dashboard: 'Dashboard', logout: 'Sign Out',
    login: 'Sign In', register: 'Create Account', profile: 'Profile',
    notifications: 'Notifications', help: 'Help', privacy: 'Privacy',
    terms: 'Terms of Service', contact: 'Contact', about: 'About',
  },
  auth: {
    welcomeBack: 'Welcome back',
    createAccount: 'Create your account',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    username: 'Username',
    displayName: 'Display name',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    biometricLogin: 'Sign in with biometrics',
    mfaCode: 'Authentication code',
    mfaPrompt: 'Enter the 6-digit code from your authenticator app',
    passwordMinLength: 'Password must be at least 13 characters',
    passwordStrengthWeak: 'Weak', passwordStrengthFair: 'Fair',
    passwordStrengthGood: 'Good', passwordStrengthStrong: 'Strong',
    passwordStrengthVeryStrong: 'Very Strong',
    invalidCredentials: 'Invalid email or password',
    accountLocked: 'Account temporarily locked. Try again later.',
    roles: {
      admin: 'Administrator', dev: 'Developer',
      moderator: 'Moderator', user: 'User',
    },
  },
  dashboard: {
    analytics: 'Analytics', security: 'Security', projects: 'Projects',
    overview: 'Overview', metrics: 'Metrics', realTime: 'Real-time',
    totalViews: 'Total Views', totalLikes: 'Total Likes',
    totalReach: 'Total Reach', engagementRate: 'Engagement Rate',
    retention: 'Retention', followers: 'Followers', growth: 'Growth',
  },
  security: {
    status: 'Security Status', scan: 'Run Scan', scanning: 'Scanning…',
    threats: 'Threats', vulnerabilities: 'Vulnerabilities',
    network: 'Network', encryption: 'Encryption', audit: 'Audit Log',
    secure: 'Secure', warning: 'Warning', critical: 'Critical',
    lastScan: 'Last scan', patchNow: 'Patch Now', resolving: 'Resolving…',
  },
  payments: {
    subscribe: 'Subscribe', upgrade: 'Upgrade', downgrade: 'Downgrade',
    currentPlan: 'Current Plan', billing: 'Billing', invoice: 'Invoice',
    paymentMethod: 'Payment Method', addCard: 'Add Card',
    crypto: 'Pay with Crypto', giftCard: 'Redeem Gift Card',
    cardNumber: 'Card number', expiry: 'Expiry date', cvv: 'CVV',
    billingAddress: 'Billing address', checkout: 'Checkout',
    paymentSuccess: 'Payment successful!', paymentFailed: 'Payment failed.',
  },
  projects: {
    newProject: 'New Project', projectName: 'Project Name',
    description: 'Description', status: 'Status', progress: 'Progress',
    deadline: 'Deadline', team: 'Team', tasks: 'Tasks',
    milestones: 'Milestones', gamedev: 'Game Development',
    arvr: 'AR/VR & 3D', coding: 'Software Projects',
    achievements: 'Achievements', gameProgress: 'Game Progress',
  },
};

// ─── I18n Store (singleton) ───────────────────────────────────────────────────
class I18nStore {
  constructor() {
    this.locale       = this._detectLocale();
    this.translations = { 'en-US': EN_US };
    this.cache        = new Map();
    this.listeners    = new Set();
  }

  _detectLocale() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('nexus:locale');
      if (saved && SUPPORTED_LOCALES[saved]) return saved;
    }
    if (typeof navigator !== 'undefined') {
      const nav = navigator.language || navigator.languages?.[0] || 'en-US';
      if (SUPPORTED_LOCALES[nav]) return nav;
      // Fuzzy match: 'es' → 'es-ES'
      const lang = nav.split('-')[0];
      const match = Object.keys(SUPPORTED_LOCALES).find(k => k.startsWith(lang));
      if (match) return match;
    }
    return 'en-US';
  }

  /** Get a translation string, dot-notation key, with optional interpolation */
  t(key, params = {}) {
    const bundle = this.translations[this.locale] || this.translations['en-US'] || {};
    const parts   = key.split('.');
    let val = bundle;
    for (const p of parts) {
      val = val?.[p];
      if (val === undefined) break;
    }
    // Fallback to English
    if (val === undefined) {
      val = EN_US;
      for (const p of parts) { val = val?.[p]; }
    }
    if (typeof val !== 'string') return key;
    // Interpolate {{param}}
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`);
  }

  /** Load translations from server (lazy) */
  async loadLocale(locale) {
    if (this.translations[locale]) return;
    try {
      const res = await fetch(`/api/i18n/${locale}`);
      if (res.ok) {
        this.translations[locale] = await res.json();
        this.cache.clear();
        this._notify();
      }
    } catch {
      // Silently fallback to English
    }
  }

  /** Auto-translate text via configured API */
  async translate(text, targetLocale = this.locale) {
    if (targetLocale === 'en-US') return text;
    const cacheKey = `${targetLocale}:${text}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    try {
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale }),
      });
      if (res.ok) {
        const { translated } = await res.json();
        this.cache.set(cacheKey, translated);
        return translated;
      }
    } catch { /* fallback below */ }
    return text;
  }

  async setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) return;
    await this.loadLocale(locale);
    this.locale = locale;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale.split('-')[0];
      document.documentElement.dir  = SUPPORTED_LOCALES[locale].dir;
    }
    this._notify();
  }

  getLocaleInfo() { return SUPPORTED_LOCALES[this.locale]; }

  subscribe(fn)   { this.listeners.add(fn);    return () => this.listeners.delete(fn); }
  _notify()       { this.listeners.forEach(fn => fn(this.locale)); }

  /** Format number in locale */
  formatNumber(n, opts = {}) {
    return new Intl.NumberFormat(this.locale, opts).format(n);
  }

  /** Format date in locale */
  formatDate(d, opts = { dateStyle: 'medium' }) {
    return new Intl.DateTimeFormat(this.locale, opts).format(new Date(d));
  }

  /** Format currency in locale */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(amount);
  }
}

export const i18n = new I18nStore();
export const t    = (key, params) => i18n.t(key, params);
export default i18n;
