// Created: 2026-07-28

const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English',    nativeName: 'English',     rtl: false },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',     rtl: false },
  { code: 'fr', name: 'French',     nativeName: 'Français',    rtl: false },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',     rtl: false },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',       rtl: false },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',       rtl: false },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',         rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',   rtl: false },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',     rtl: true  },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',     rtl: false },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',      rtl: false },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano',    rtl: false },
  { code: 'nl', name: 'Dutch',      nativeName: 'Nederlands',  rtl: false },
  { code: 'pl', name: 'Polish',     nativeName: 'Polski',      rtl: false },
  { code: 'sv', name: 'Swedish',    nativeName: 'Svenska',     rtl: false },
  { code: 'tr', name: 'Turkish',    nativeName: 'Türkçe',      rtl: false },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
  { code: 'th', name: 'Thai',       nativeName: 'ภาษาไทย',     rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'ms', name: 'Malay',      nativeName: 'Bahasa Melayu',    rtl: false },
  { code: 'uk', name: 'Ukrainian',  nativeName: 'Українська',  rtl: false },
  { code: 'cs', name: 'Czech',      nativeName: 'Čeština',     rtl: false },
  { code: 'ro', name: 'Romanian',   nativeName: 'Română',      rtl: false },
  { code: 'hu', name: 'Hungarian',  nativeName: 'Magyar',      rtl: false },
  { code: 'fi', name: 'Finnish',    nativeName: 'Suomi',       rtl: false },
  { code: 'da', name: 'Danish',     nativeName: 'Dansk',       rtl: false },
  { code: 'no', name: 'Norwegian',  nativeName: 'Norsk',       rtl: false },
  { code: 'el', name: 'Greek',      nativeName: 'Ελληνικά',    rtl: false },
  { code: 'he', name: 'Hebrew',     nativeName: 'עברית',       rtl: true  },
  { code: 'fa', name: 'Persian',    nativeName: 'فارسی',       rtl: true  },
  { code: 'ur', name: 'Urdu',       nativeName: 'اردو',        rtl: true  },
  { code: 'bn', name: 'Bengali',    nativeName: 'বাংলা',       rtl: false },
  { code: 'sw', name: 'Swahili',    nativeName: 'Kiswahili',   rtl: false },
  { code: 'am', name: 'Amharic',    nativeName: 'አማርኛ',        rtl: false },
];

const RTL_LOCALES = ['ar', 'fa', 'ur', 'he'];

const LOCALE_CODES = new Set(SUPPORTED_LOCALES.map(l => l.code));

const EN_TRANSLATIONS = {
  'app.title':                  'Nexus AI Pro',
  'app.tagline':                'AI-powered productivity platform',
  'app.version':                'Version',
  'app.copyright':              'All rights reserved',
  'app.loading':                'Loading application...',

  'auth.login':                 'Log In',
  'auth.register':              'Register',
  'auth.logout':                'Log Out',
  'auth.password':              'Password',
  'auth.username':              'Username',
  'auth.email':                 'Email Address',
  'auth.mfa':                   'Multi-Factor Authentication',
  'auth.biometric':             'Biometric Login',
  'auth.forgotPassword':        'Forgot password?',
  'auth.resetPassword':         'Reset Password',
  'auth.confirmPassword':       'Confirm Password',
  'auth.rememberMe':            'Remember me',
  'auth.sessionExpired':        'Your session has expired. Please log in again.',
  'auth.invalidCredentials':    'Invalid username or password.',
  'auth.accountLocked':         'Account locked due to too many failed attempts.',
  'auth.verifyEmail':           'Please verify your email address.',
  'auth.mfaPrompt':             'Enter your authentication code.',
  'auth.biometricPrompt':       'Authenticate using your biometric device.',

  'dashboard.analytics':        'Analytics',
  'dashboard.security':         'Security',
  'dashboard.projects':         'Projects',
  'dashboard.settings':         'Settings',
  'dashboard.overview':         'Overview',
  'dashboard.activity':         'Recent Activity',
  'dashboard.notifications':    'Notifications',
  'dashboard.welcome':          'Welcome back, {{name}}!',

  'nav.home':                   'Home',
  'nav.analytics':              'Analytics',
  'nav.security':               'Security',
  'nav.projects':               'Projects',
  'nav.settings':               'Settings',
  'nav.admin':                  'Admin',
  'nav.profile':                'Profile',
  'nav.help':                   'Help',
  'nav.feedback':               'Feedback',

  'common.save':                'Save',
  'common.cancel':              'Cancel',
  'common.delete':              'Delete',
  'common.edit':                'Edit',
  'common.search':              'Search',
  'common.loading':             'Loading...',
  'common.error':               'An error occurred.',
  'common.success':             'Success!',
  'common.confirm':             'Confirm',
  'common.close':               'Close',
  'common.back':                'Back',
  'common.next':                'Next',
  'common.submit':              'Submit',
  'common.reset':               'Reset',
  'common.refresh':             'Refresh',
  'common.export':              'Export',
  'common.import':              'Import',
  'common.filter':              'Filter',
  'common.sort':                'Sort',
  'common.noResults':           'No results found.',
  'common.required':            'This field is required.',

  'subscription.free':          'Free',
  'subscription.pro':           'Pro',
  'subscription.enterprise':    'Enterprise',
  'subscription.upgrade':       'Upgrade Plan',
  'subscription.billing':       'Billing',
  'subscription.expires':       'Expires {{date}}',
  'subscription.renew':         'Renew Subscription',

  'password.tooShort':          'Password must be at least {{min}} characters.',
  'password.noUppercase':       'Password must contain at least one uppercase letter.',
  'password.noLowercase':       'Password must contain at least one lowercase letter.',
  'password.noNumber':          'Password must contain at least one number.',
  'password.noSpecial':         'Password must contain at least one special character.',
  'password.mismatch':          'Passwords do not match.',
  'password.strength':          'Password strength: {{level}}',

  'projects.coding':            'Coding',
  'projects.gamedev':           'Game Development',
  'projects.arvr':              'AR/VR',
  'projects.create':            'Create Project',
  'projects.archive':           'Archive Project',
  'projects.members':           'Members',
  'projects.deadline':          'Deadline',

  'analytics.reach':            'Reach',
  'analytics.engagement':       'Engagement',
  'analytics.followers':        'Followers',
  'analytics.impressions':      'Impressions',
  'analytics.conversion':       'Conversion Rate',
  'analytics.revenue':          'Revenue',
  'analytics.period':           'Period: {{period}}',

  'security.scan':              'Security Scan',
  'security.threats':           'Threats Detected',
  'security.encryption':        'Encryption Status',
  'security.vulnerability':     'Vulnerability Report',
  'security.firewall':          'Firewall',
  'security.audit':             'Audit Log',
  'security.clearance':         'All clear. No threats detected.',
  'security.alert':             '{{count}} threat(s) require your attention.',

  'error.notFound':             'Page not found.',
  'error.unauthorized':         'You are not authorized to view this page.',
  'error.forbidden':            'Access denied.',
  'error.serverError':          'Server error. Please try again later.',
  'error.network':              'Network error. Check your connection.',
  'error.timeout':              'Request timed out.',
  'error.rateLimit':            'Too many requests. Please slow down.',
  'error.validation':           'Please correct the errors below.',

  'success.saved':              'Changes saved successfully.',
  'success.deleted':            '{{item}} deleted successfully.',
  'success.invited':            'Invitation sent to {{email}}.',
  'success.exported':           'Export complete.',
  'success.updated':            'Updated successfully.',
};

function interpolate(str, params) {
  if (!params || !Object.keys(params).length) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in params ? params[key] : `{{${key}}}`));
}

export default class I18nService {
  #currentLocale = 'en';
  #translations = { en: EN_TRANSLATIONS };

  t(key, locale = this.#currentLocale, params = {}) {
    const lang = LOCALE_CODES.has(locale) ? locale : 'en';
    const store = this.#translations[lang];
    if (store && key in store) return interpolate(store[key], params);
    if (lang !== 'en' && key in EN_TRANSLATIONS) {
      // Stub for non-en: prefix shows translation is needed; real impl would call Translate API.
      return interpolate(`[${lang}] ${EN_TRANSLATIONS[key]}`, params);
    }
    return key;
  }

  setLocale(locale) {
    if (!LOCALE_CODES.has(locale)) throw new Error(`Unsupported locale: ${locale}`);
    this.#currentLocale = locale;
  }

  getLocale() {
    return this.#currentLocale;
  }

  isRTL(locale = this.#currentLocale) {
    return RTL_LOCALES.includes(locale);
  }

  getSupportedLocales() {
    return SUPPORTED_LOCALES.map(l => ({ ...l }));
  }

  autoDetectLocale(acceptLanguageHeader = '') {
    if (!acceptLanguageHeader) return 'en';

    // Parse "en-US;q=0.9,fr;q=0.8" into sorted [(lang, q)] pairs.
    const candidates = acceptLanguageHeader
      .split(',')
      .map(entry => {
        const [tag, qPart] = entry.trim().split(';q=');
        const q = qPart ? parseFloat(qPart) : 1.0;
        const code = tag.trim().split('-')[0].toLowerCase();
        return { code, q };
      })
      .filter(({ code }) => LOCALE_CODES.has(code))
      .sort((a, b) => b.q - a.q);

    return candidates.length ? candidates[0].code : 'en';
  }

  getTranslations(locale = this.#currentLocale) {
    if (!LOCALE_CODES.has(locale)) throw new Error(`Unsupported locale: ${locale}`);
    if (locale === 'en') return { ...EN_TRANSLATIONS };

    // Build a stub bundle; production replaces stubs via Translate API.
    const bundle = {};
    for (const key of Object.keys(EN_TRANSLATIONS)) {
      bundle[key] = this.#translations[locale]?.[key] ?? `[${locale}] ${EN_TRANSLATIONS[key]}`;
    }
    return bundle;
  }

  formatNumber(value, locale = this.#currentLocale, options = {}) {
    const safeLocale = LOCALE_CODES.has(locale) ? locale : 'en';
    return new Intl.NumberFormat(safeLocale, options).format(value);
  }

  formatDate(date, locale = this.#currentLocale, options = {}) {
    const safeLocale = LOCALE_CODES.has(locale) ? locale : 'en';
    return new Intl.DateTimeFormat(safeLocale, options).format(date instanceof Date ? date : new Date(date));
  }

  formatCurrency(amount, currency = 'USD', locale = this.#currentLocale) {
    const safeLocale = LOCALE_CODES.has(locale) ? locale : 'en';
    return new Intl.NumberFormat(safeLocale, { style: 'currency', currency }).format(amount);
  }
}
