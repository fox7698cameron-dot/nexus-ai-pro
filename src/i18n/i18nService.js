// src/i18n/i18nService.js
// Date: 2026-05-07
// Multi-language and regional support with auto-translate

const SUPPORTED_LOCALES = Object.freeze({
  'en-US': { name: 'English (US)', dir: 'ltr', dateFormat: 'MM/DD/YYYY', currency: 'USD', flag: '🇺🇸' },
  'en-GB': { name: 'English (UK)', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'GBP', flag: '🇬🇧' },
  'es-ES': { name: 'Español (Spain)', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR', flag: '🇪🇸' },
  'es-MX': { name: 'Español (México)', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'MXN', flag: '🇲🇽' },
  'fr-FR': { name: 'Français', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR', flag: '🇫🇷' },
  'de-DE': { name: 'Deutsch', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'EUR', flag: '🇩🇪' },
  'it-IT': { name: 'Italiano', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR', flag: '🇮🇹' },
  'pt-BR': { name: 'Português (Brasil)', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'BRL', flag: '🇧🇷' },
  'pt-PT': { name: 'Português (Portugal)', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR', flag: '🇵🇹' },
  'ja-JP': { name: '日本語', dir: 'ltr', dateFormat: 'YYYY/MM/DD', currency: 'JPY', flag: '🇯🇵' },
  'ko-KR': { name: '한국어', dir: 'ltr', dateFormat: 'YYYY.MM.DD', currency: 'KRW', flag: '🇰🇷' },
  'zh-CN': { name: '中文 (简体)', dir: 'ltr', dateFormat: 'YYYY/MM/DD', currency: 'CNY', flag: '🇨🇳' },
  'zh-TW': { name: '中文 (繁體)', dir: 'ltr', dateFormat: 'YYYY/MM/DD', currency: 'TWD', flag: '🇹🇼' },
  'ar-SA': { name: 'العربية', dir: 'rtl', dateFormat: 'DD/MM/YYYY', currency: 'SAR', flag: '🇸🇦' },
  'he-IL': { name: 'עברית', dir: 'rtl', dateFormat: 'DD/MM/YYYY', currency: 'ILS', flag: '🇮🇱' },
  'ru-RU': { name: 'Русский', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'RUB', flag: '🇷🇺' },
  'hi-IN': { name: 'हिन्दी', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'INR', flag: '🇮🇳' },
  'tr-TR': { name: 'Türkçe', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'TRY', flag: '🇹🇷' },
  'nl-NL': { name: 'Nederlands', dir: 'ltr', dateFormat: 'DD-MM-YYYY', currency: 'EUR', flag: '🇳🇱' },
  'pl-PL': { name: 'Polski', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'PLN', flag: '🇵🇱' },
  'sv-SE': { name: 'Svenska', dir: 'ltr', dateFormat: 'YYYY-MM-DD', currency: 'SEK', flag: '🇸🇪' },
  'nb-NO': { name: 'Norsk', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'NOK', flag: '🇳🇴' },
  'da-DK': { name: 'Dansk', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'DKK', flag: '🇩🇰' },
  'fi-FI': { name: 'Suomi', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'EUR', flag: '🇫🇮' },
  'uk-UA': { name: 'Українська', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'UAH', flag: '🇺🇦' },
  'id-ID': { name: 'Bahasa Indonesia', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'IDR', flag: '🇮🇩' },
  'th-TH': { name: 'ภาษาไทย', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'THB', flag: '🇹🇭' },
  'vi-VN': { name: 'Tiếng Việt', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'VND', flag: '🇻🇳' },
});

const BASE_TRANSLATIONS = {
  'en-US': {
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.gaming': 'Gaming',
    'nav.settings': 'Settings',
    'nav.billing': 'Billing',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.mfa_code': 'Authenticator code',
    'auth.biometric': 'Use biometric login',
    'auth.forgot_password': 'Forgot password?',
    'auth.strength.weak': 'Weak',
    'auth.strength.fair': 'Fair',
    'auth.strength.good': 'Good',
    'auth.strength.strong': 'Strong',
    'auth.strength.excellent': 'Excellent',
    'billing.free': 'Free',
    'billing.pro': 'Pro',
    'billing.enterprise': 'Enterprise',
    'billing.subscribe': 'Subscribe',
    'billing.cancel': 'Cancel plan',
    'billing.gift_code': 'Redeem gift card',
    'billing.crypto': 'Pay with crypto',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.refresh': 'Refresh',
    'security.scan': 'Run security scan',
    'security.score': 'Security score',
    'security.threats': 'Active threats',
    'gaming.create_project': 'New project',
    'gaming.achievements': 'Achievements',
    'gaming.connect_platform': 'Connect platform',
    'analytics.total_reach': 'Total reach',
    'analytics.engagement': 'Engagement',
    'analytics.retention': 'Retention',
    'analytics.followers': 'Followers',
  },
};

class I18nService {
  constructor() {
    this._locale = 'en-US';
    this._translations = new Map();
    this._translationCache = new Map();
    this._translateFn = null;
    this._listeners = new Set();

    this._translations.set('en-US', BASE_TRANSLATIONS['en-US']);
  }

  setTranslateFunction(fn) {
    this._translateFn = fn;
  }

  getLocale() {
    return this._locale;
  }

  getSupportedLocales() {
    return { ...SUPPORTED_LOCALES };
  }

  getLocaleInfo(locale = this._locale) {
    return SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES['en-US'];
  }

  isRTL(locale = this._locale) {
    return this.getLocaleInfo(locale).dir === 'rtl';
  }

  async setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) throw new Error(`Unsupported locale: ${locale}`);
    const previous = this._locale;
    this._locale = locale;

    if (!this._translations.has(locale)) {
      await this._loadTranslations(locale);
    }

    if (previous !== locale) {
      this._notify({ locale, previous });
    }
  }

  async _loadTranslations(locale) {
    const [lang] = locale.split('-');
    if (this._translateFn && this._translations.has('en-US')) {
      const enKeys = this._translations.get('en-US');
      const translated = {};
      const batchSize = 20;
      const entries = Object.entries(enKeys);
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        for (const [key, value] of batch) {
          const cacheKey = `${locale}:${key}`;
          if (this._translationCache.has(cacheKey)) {
            translated[key] = this._translationCache.get(cacheKey);
          } else {
            try {
              const result = await this._translateFn(value, lang, 'en');
              translated[key] = result;
              this._translationCache.set(cacheKey, result);
            } catch {
              translated[key] = value;
            }
          }
        }
      }
      this._translations.set(locale, translated);
    } else {
      this._translations.set(locale, this._translations.get('en-US'));
    }
  }

  t(key, params = {}) {
    const map = this._translations.get(this._locale) || this._translations.get('en-US') || {};
    let value = map[key] ?? key;
    for (const [param, replacement] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(replacement));
    }
    return value;
  }

  formatDate(date, locale = this._locale) {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(date instanceof Date ? date : new Date(date));
  }

  formatNumber(n, locale = this._locale, options = {}) {
    return new Intl.NumberFormat(locale, options).format(n);
  }

  formatCurrency(amount, locale = this._locale) {
    const { currency } = this.getLocaleInfo(locale);
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  }

  formatRelativeTime(date, locale = this._locale) {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffSec = Math.round(diffMs / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, 'hour');
    return rtf.format(-Math.round(diffHr / 24), 'day');
  }

  addTranslations(locale, keys) {
    const existing = this._translations.get(locale) || {};
    this._translations.set(locale, { ...existing, ...keys });
  }

  onLocaleChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(event) {
    for (const fn of this._listeners) fn(event);
  }
}

export const i18n = new I18nService();
export { SUPPORTED_LOCALES };
export default I18nService;
