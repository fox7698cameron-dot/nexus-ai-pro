// src/services/i18n.js | Nexus AI Pro | Date: 2026-06-07

// ---------------------------------------------------------------------------
// Supported locale metadata
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = [
  { code: 'en-US', name: 'English (US)',           nativeName: 'English',          rtl: false },
  { code: 'es-ES', name: 'Spanish (Spain)',         nativeName: 'Español',          rtl: false },
  { code: 'fr-FR', name: 'French (France)',         nativeName: 'Français',         rtl: false },
  { code: 'de-DE', name: 'German (Germany)',        nativeName: 'Deutsch',          rtl: false },
  { code: 'pt-BR', name: 'Portuguese (Brazil)',     nativeName: 'Português (BR)',   rtl: false },
  { code: 'ja-JP', name: 'Japanese',                nativeName: '日本語',            rtl: false },
  { code: 'ko-KR', name: 'Korean',                  nativeName: '한국어',             rtl: false },
  { code: 'zh-CN', name: 'Chinese (Simplified)',    nativeName: '简体中文',           rtl: false },
  { code: 'zh-TW', name: 'Chinese (Traditional)',   nativeName: '繁體中文',           rtl: false },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)',   nativeName: 'العربية',           rtl: true  },
  { code: 'hi-IN', name: 'Hindi (India)',            nativeName: 'हिन्दी',             rtl: false },
  { code: 'it-IT', name: 'Italian (Italy)',          nativeName: 'Italiano',         rtl: false },
  { code: 'ru-RU', name: 'Russian (Russia)',         nativeName: 'Русский',          rtl: false },
  { code: 'nl-NL', name: 'Dutch (Netherlands)',      nativeName: 'Nederlands',       rtl: false },
  { code: 'pl-PL', name: 'Polish (Poland)',          nativeName: 'Polski',           rtl: false },
  { code: 'tr-TR', name: 'Turkish (Turkey)',         nativeName: 'Türkçe',           rtl: false },
  { code: 'sv-SE', name: 'Swedish (Sweden)',         nativeName: 'Svenska',          rtl: false },
  { code: 'da-DK', name: 'Danish (Denmark)',         nativeName: 'Dansk',            rtl: false },
];

const RTL_LOCALES = new Set(
  SUPPORTED_LOCALES.filter((l) => l.rtl).map((l) => l.code),
);

const SUPPORTED_CODES = new Set(SUPPORTED_LOCALES.map((l) => l.code));
const DEFAULT_LOCALE  = 'en-US';
const STORAGE_KEY     = 'nexus_locale';

// ---------------------------------------------------------------------------
// Translation strings
// ---------------------------------------------------------------------------

/** @type {Record<string, Record<string, string>>} */
const TRANSLATIONS = {

  // -------------------------------------------------------------------------
  // English — full baseline
  // -------------------------------------------------------------------------
  'en-US': {
    // auth
    'auth.login':           'Login',
    'auth.register':        'Register',
    'auth.email':           'Email',
    'auth.password':        'Password',
    'auth.username':        'Username',
    'auth.forgotPassword':  'Forgot password?',
    'auth.twoFactor':       'Two-Factor Authentication',
    'auth.biometric':       'Biometric Login',
    'auth.signIn':          'Sign In',
    'auth.signUp':          'Sign Up',
    'auth.signOut':         'Sign Out',
    // nav
    'nav.dashboard':        'Dashboard',
    'nav.analytics':        'Analytics',
    'nav.security':         'Security',
    'nav.gaming':           'Gaming',
    'nav.settings':         'Settings',
    'nav.admin':            'Admin',
    // dashboard
    'dashboard.welcome':    'Welcome back, {name}!',
    'dashboard.overview':   'Overview',
    // errors
    'errors.required':          'This field is required.',
    'errors.invalidEmail':       'Please enter a valid email address.',
    'errors.passwordTooShort':   'Password must be at least {min} characters.',
    'errors.passwordWeak':       'Password is too weak. Add uppercase letters, numbers, and special characters.',
    'errors.usernameInvalid':    'Username must be between 2 and 50 characters.',
    'errors.networkError':       'A network error occurred. Please try again.',
    'errors.unauthorized':       'You are not authorized to perform this action.',
    // common
    'common.save':              'Save',
    'common.cancel':            'Cancel',
    'common.delete':            'Delete',
    'common.edit':              'Edit',
    'common.search':            'Search',
    'common.loading':           'Loading…',
    'common.realtime':          'Real-time',
    'common.connected':         'Connected',
    'common.disconnected':      'Disconnected',
    'common.error':             'Error',
    'common.success':           'Success',
  },

  // -------------------------------------------------------------------------
  // Spanish (Spain) — partial sample
  // -------------------------------------------------------------------------
  'es-ES': {
    'auth.login':           'Iniciar sesión',
    'auth.register':        'Registrarse',
    'auth.email':           'Correo electrónico',
    'auth.password':        'Contraseña',
    'auth.username':        'Nombre de usuario',
    'auth.forgotPassword':  '¿Olvidaste tu contraseña?',
    'auth.twoFactor':       'Autenticación de dos factores',
    'auth.biometric':       'Inicio de sesión biométrico',
    'auth.signIn':          'Entrar',
    'auth.signUp':          'Crear cuenta',
    'auth.signOut':         'Cerrar sesión',
    'nav.dashboard':        'Panel',
    'nav.analytics':        'Analítica',
    'nav.security':         'Seguridad',
    'nav.gaming':           'Juegos',
    'nav.settings':         'Configuración',
    'nav.admin':            'Administración',
    'dashboard.welcome':    '¡Bienvenido de nuevo, {name}!',
    'dashboard.overview':   'Resumen',
    'errors.required':          'Este campo es obligatorio.',
    'errors.invalidEmail':       'Por favor ingresa un correo electrónico válido.',
    'errors.passwordTooShort':   'La contraseña debe tener al menos {min} caracteres.',
    'errors.passwordWeak':       'La contraseña es demasiado débil.',
    'errors.usernameInvalid':    'El nombre de usuario debe tener entre 2 y 50 caracteres.',
    'errors.networkError':       'Ocurrió un error de red. Por favor inténtalo de nuevo.',
    'errors.unauthorized':       'No tienes autorización para realizar esta acción.',
    'common.save':              'Guardar',
    'common.cancel':            'Cancelar',
    'common.delete':            'Eliminar',
    'common.edit':              'Editar',
    'common.search':            'Buscar',
    'common.loading':           'Cargando…',
    'common.realtime':          'Tiempo real',
    'common.connected':         'Conectado',
    'common.disconnected':      'Desconectado',
    'common.error':             'Error',
    'common.success':           'Éxito',
  },

  // -------------------------------------------------------------------------
  // French (France) — partial sample
  // -------------------------------------------------------------------------
  'fr-FR': {
    'auth.login':           'Connexion',
    'auth.register':        'S\'inscrire',
    'auth.email':           'E-mail',
    'auth.password':        'Mot de passe',
    'auth.username':        'Nom d\'utilisateur',
    'auth.forgotPassword':  'Mot de passe oublié ?',
    'auth.twoFactor':       'Authentification à deux facteurs',
    'auth.biometric':       'Connexion biométrique',
    'auth.signIn':          'Se connecter',
    'auth.signUp':          'Créer un compte',
    'auth.signOut':         'Se déconnecter',
    'nav.dashboard':        'Tableau de bord',
    'nav.analytics':        'Analytique',
    'nav.security':         'Sécurité',
    'nav.gaming':           'Jeux',
    'nav.settings':         'Paramètres',
    'nav.admin':            'Administration',
    'dashboard.welcome':    'Bienvenue, {name} !',
    'dashboard.overview':   'Vue d\'ensemble',
    'errors.required':          'Ce champ est obligatoire.',
    'errors.invalidEmail':       'Veuillez entrer une adresse e-mail valide.',
    'errors.passwordTooShort':   'Le mot de passe doit comporter au moins {min} caractères.',
    'errors.passwordWeak':       'Le mot de passe est trop faible.',
    'errors.usernameInvalid':    'Le nom d\'utilisateur doit comporter entre 2 et 50 caractères.',
    'errors.networkError':       'Une erreur réseau s\'est produite. Veuillez réessayer.',
    'errors.unauthorized':       'Vous n\'êtes pas autorisé à effectuer cette action.',
    'common.save':              'Enregistrer',
    'common.cancel':            'Annuler',
    'common.delete':            'Supprimer',
    'common.edit':              'Modifier',
    'common.search':            'Rechercher',
    'common.loading':           'Chargement…',
    'common.realtime':          'Temps réel',
    'common.connected':         'Connecté',
    'common.disconnected':      'Déconnecté',
    'common.error':             'Erreur',
    'common.success':           'Succès',
  },

  // -------------------------------------------------------------------------
  // Arabic (Saudi Arabia) — partial sample (RTL)
  // -------------------------------------------------------------------------
  'ar-SA': {
    'auth.login':           'تسجيل الدخول',
    'auth.register':        'إنشاء حساب',
    'auth.email':           'البريد الإلكتروني',
    'auth.password':        'كلمة المرور',
    'auth.username':        'اسم المستخدم',
    'auth.forgotPassword':  'نسيت كلمة المرور؟',
    'auth.twoFactor':       'المصادقة الثنائية',
    'auth.biometric':       'تسجيل الدخول البيومتري',
    'auth.signIn':          'دخول',
    'auth.signUp':          'إنشاء حساب',
    'auth.signOut':         'تسجيل الخروج',
    'nav.dashboard':        'لوحة التحكم',
    'nav.analytics':        'التحليلات',
    'nav.security':         'الأمان',
    'nav.gaming':           'الألعاب',
    'nav.settings':         'الإعدادات',
    'nav.admin':            'الإدارة',
    'dashboard.welcome':    'مرحباً بعودتك، {name}!',
    'dashboard.overview':   'نظرة عامة',
    'errors.required':          'هذا الحقل مطلوب.',
    'errors.invalidEmail':       'يرجى إدخال عنوان بريد إلكتروني صحيح.',
    'errors.passwordTooShort':   'يجب أن تكون كلمة المرور {min} أحرف على الأقل.',
    'errors.passwordWeak':       'كلمة المرور ضعيفة جداً.',
    'errors.usernameInvalid':    'يجب أن يكون اسم المستخدم بين 2 و 50 حرفاً.',
    'errors.networkError':       'حدث خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
    'errors.unauthorized':       'غير مخول لك تنفيذ هذا الإجراء.',
    'common.save':              'حفظ',
    'common.cancel':            'إلغاء',
    'common.delete':            'حذف',
    'common.edit':              'تعديل',
    'common.search':            'بحث',
    'common.loading':           'جاري التحميل…',
    'common.realtime':          'الوقت الفعلي',
    'common.connected':         'متصل',
    'common.disconnected':      'غير متصل',
    'common.error':             'خطأ',
    'common.success':           'نجاح',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Interpolate {variable} placeholders in a string.
 * @param {string} str
 * @param {Record<string, string|number>|undefined} params
 * @returns {string}
 */
function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`,
  );
}

/**
 * Resolve the best matching locale from a BCP-47 tag.
 * Falls back: exact → language-only match → DEFAULT_LOCALE.
 * @param {string} tag
 * @returns {string}
 */
function resolveLocale(tag) {
  if (!tag) return DEFAULT_LOCALE;
  if (SUPPORTED_CODES.has(tag)) return tag;
  // Try matching the language prefix (e.g. 'es' → 'es-ES')
  const lang = tag.split('-')[0].toLowerCase();
  const match = SUPPORTED_LOCALES.find(
    (l) => l.code.toLowerCase().startsWith(lang),
  );
  return match ? match.code : DEFAULT_LOCALE;
}

// ---------------------------------------------------------------------------
// I18nService class
// ---------------------------------------------------------------------------

class I18nService {
  constructor() {
    /** @type {string} */
    this._locale = DEFAULT_LOCALE;

    /** @type {Record<string, Record<string, string>>} */
    this._translations = TRANSLATIONS;

    this._init();
  }

  // -------------------------------------------------------------------------
  // Private: initialise locale from storage / navigator
  // -------------------------------------------------------------------------
  _init() {
    let stored = null;
    try {
      stored = typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    } catch (_) {
      // SSR / test environment — localStorage not available
    }

    if (stored && SUPPORTED_CODES.has(stored)) {
      this._locale = stored;
    } else if (typeof navigator !== 'undefined') {
      const navLang = navigator.language || navigator.languages?.[0] || DEFAULT_LOCALE;
      this._locale = resolveLocale(navLang);
    }

    this._applyDirAttribute();
  }

  // -------------------------------------------------------------------------
  // Private: apply dir="rtl"|"ltr" to <html> element
  // -------------------------------------------------------------------------
  _applyDirAttribute() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(
      'dir',
      RTL_LOCALES.has(this._locale) ? 'rtl' : 'ltr',
    );
    document.documentElement.setAttribute('lang', this._locale);
  }

  // -------------------------------------------------------------------------
  // Private: persist locale choice
  // -------------------------------------------------------------------------
  _persist(locale) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, locale);
      }
    } catch (_) {
      // Ignore write errors (private browsing, quota exceeded, SSR)
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Switch the active locale.
   * @param {string} locale  BCP-47 locale code (e.g. 'fr-FR')
   * @returns {string}  The resolved locale that was actually set.
   */
  setLocale(locale) {
    const resolved = resolveLocale(locale);
    this._locale = resolved;
    this._persist(resolved);
    this._applyDirAttribute();
    return resolved;
  }

  /**
   * Translate a dot-separated key with optional parameter interpolation.
   * Falls back: current locale → en-US → key itself.
   * @param {string} key
   * @param {Record<string, string|number>} [params]
   * @returns {string}
   */
  t(key, params) {
    const bundle = this._translations[this._locale] || {};
    const fallback = this._translations[DEFAULT_LOCALE] || {};
    const raw = bundle[key] ?? fallback[key] ?? key;
    return interpolate(raw, params);
  }

  /**
   * Attempt AI-powered translation by calling the Nexus /api/i18n/translate
   * endpoint.  Returns the translated string on success; returns the original
   * text on network / API failure so callers always get a usable value.
   *
   * @param {string} text
   * @param {string} [targetLocale]  Defaults to the current locale.
   * @param {string} [sourceLocale]  Optional hint (e.g. 'en-US').
   * @returns {Promise<string>}
   */
  async autoTranslate(text, targetLocale, sourceLocale) {
    const target = targetLocale ? resolveLocale(targetLocale) : this._locale;
    const body = JSON.stringify({
      text,
      targetLocale: target,
      ...(sourceLocale ? { sourceLocale } : {}),
    });

    try {
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        console.warn(`[i18n] autoTranslate HTTP ${res.status} for locale "${target}"`);
        return text;
      }

      const data = await res.json();
      return data?.translatedText ?? text;
    } catch (err) {
      console.warn('[i18n] autoTranslate network error:', err?.message ?? err);
      return text;
    }
  }

  /**
   * Return the currently active locale code.
   * @returns {string}
   */
  getLocale() {
    return this._locale;
  }

  /**
   * Return metadata for every supported locale.
   * @returns {Array<{code:string, name:string, nativeName:string, rtl:boolean}>}
   */
  getSupportedLocales() {
    return SUPPORTED_LOCALES.slice();
  }

  /**
   * Locale-aware date formatting.
   * @param {Date|number|string} date
   * @param {Intl.DateTimeFormatOptions} [options]
   * @returns {string}
   */
  formatDate(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    const defaults = { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      return new Intl.DateTimeFormat(this._locale, { ...defaults, ...options }).format(d);
    } catch (_) {
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, { ...defaults, ...options }).format(d);
    }
  }

  /**
   * Locale-aware number formatting.
   * @param {number} number
   * @param {Intl.NumberFormatOptions} [options]
   * @returns {string}
   */
  formatNumber(number, options = {}) {
    try {
      return new Intl.NumberFormat(this._locale, options).format(number);
    } catch (_) {
      return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(number);
    }
  }

  /**
   * Locale-aware currency formatting.
   * @param {number} amount
   * @param {string} [currency]  ISO 4217 currency code; defaults to 'USD'.
   * @returns {string}
   */
  formatCurrency(amount, currency = 'USD') {
    return this.formatNumber(amount, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Whether the current locale is right-to-left.
   * @returns {boolean}
   */
  isRTL() {
    return RTL_LOCALES.has(this._locale);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const i18n = new I18nService();
export default i18n;
