// i18n-service.js | 2026-10-08

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'ar', 'pt', 'ru', 'hi', 'it'];

const TRANSLATIONS = {
  en: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.logout': 'Log Out',
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.confirmPassword': 'Confirm Password',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading…',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'analytics.title': 'Analytics',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reach',
    'analytics.followers': 'Followers',
    'analytics.engagement': 'Engagement Rate',
    'analytics.retention': 'Retention',
    'security.title': 'Security',
    'security.score': 'Security Score',
    'security.scan': 'Run Scan',
    'payment.subscribe': 'Subscribe',
    'payment.cancel': 'Cancel Subscription',
    'payment.upgrade': 'Upgrade Plan',
  },
  es: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Inicio',
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.profile': 'Perfil',
    'nav.logout': 'Cerrar sesión',
    'auth.signin': 'Iniciar sesión',
    'auth.signup': 'Registrarse',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de usuario',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.confirmPassword': 'Confirmar contraseña',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.loading': 'Cargando…',
    'common.error': 'Ocurrió un error',
    'common.success': 'Éxito',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.close': 'Cerrar',
    'common.confirm': 'Confirmar',
    'analytics.title': 'Analíticas',
    'analytics.views': 'Vistas',
    'analytics.likes': 'Me gusta',
    'analytics.reach': 'Alcance',
    'analytics.followers': 'Seguidores',
    'analytics.engagement': 'Tasa de interacción',
    'analytics.retention': 'Retención',
    'security.title': 'Seguridad',
    'security.score': 'Puntuación de seguridad',
    'security.scan': 'Ejecutar análisis',
    'payment.subscribe': 'Suscribirse',
    'payment.cancel': 'Cancelar suscripción',
    'payment.upgrade': 'Mejorar plan',
  },
  fr: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Accueil',
    'nav.dashboard': 'Tableau de bord',
    'nav.settings': 'Paramètres',
    'nav.profile': 'Profil',
    'nav.logout': 'Déconnexion',
    'auth.signin': 'Se connecter',
    'auth.signup': "S'inscrire",
    'auth.email': 'E-mail',
    'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur",
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.loading': 'Chargement…',
    'common.error': 'Une erreur est survenue',
    'common.success': 'Succès',
  },
  de: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Startseite',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Einstellungen',
    'nav.profile': 'Profil',
    'nav.logout': 'Abmelden',
    'auth.signin': 'Anmelden',
    'auth.signup': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.loading': 'Laden…',
    'common.error': 'Ein Fehler ist aufgetreten',
  },
  ja: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'ホーム',
    'nav.dashboard': 'ダッシュボード',
    'nav.settings': '設定',
    'nav.profile': 'プロフィール',
    'nav.logout': 'ログアウト',
    'auth.signin': 'サインイン',
    'auth.signup': '登録',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.loading': '読み込み中…',
  },
  ko: {
    'app.name': 'Nexus AI Pro',
    'nav.home': '홈',
    'nav.dashboard': '대시보드',
    'nav.settings': '설정',
    'auth.signin': '로그인',
    'auth.signup': '회원가입',
    'common.save': '저장',
    'common.loading': '로딩 중…',
  },
  zh: {
    'app.name': 'Nexus AI Pro',
    'nav.home': '首页',
    'nav.dashboard': '仪表盘',
    'nav.settings': '设置',
    'auth.signin': '登录',
    'auth.signup': '注册',
    'common.save': '保存',
    'common.loading': '加载中…',
  },
  ar: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'الرئيسية',
    'nav.dashboard': 'لوحة التحكم',
    'nav.settings': 'الإعدادات',
    'auth.signin': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'common.save': 'حفظ',
    'common.loading': 'جارٍ التحميل…',
  },
  pt: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Início',
    'nav.dashboard': 'Painel',
    'nav.settings': 'Configurações',
    'auth.signin': 'Entrar',
    'auth.signup': 'Cadastrar',
    'common.save': 'Salvar',
    'common.loading': 'Carregando…',
  },
  ru: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Главная',
    'nav.dashboard': 'Панель',
    'nav.settings': 'Настройки',
    'auth.signin': 'Войти',
    'auth.signup': 'Зарегистрироваться',
    'common.save': 'Сохранить',
    'common.loading': 'Загрузка…',
  },
  hi: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'होम',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.settings': 'सेटिंग्स',
    'auth.signin': 'साइन इन',
    'auth.signup': 'साइन अप',
    'common.save': 'सहेजें',
    'common.loading': 'लोड हो रहा है…',
  },
  it: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Impostazioni',
    'auth.signin': 'Accedi',
    'auth.signup': 'Registrati',
    'common.save': 'Salva',
    'common.loading': 'Caricamento…',
  },
};

class I18nService {
  constructor() {
    this._lang = this._detectLanguage();
    this._cache = {};
  }

  _detectLanguage() {
    if (typeof navigator !== 'undefined') {
      const browserLangs = navigator.languages || [navigator.language || 'en'];
      for (const lang of browserLangs) {
        const code = lang.split('-')[0].toLowerCase();
        if (SUPPORTED_LANGUAGES.includes(code)) return code;
      }
    }
    return 'en';
  }

  /**
   * Translate a key, interpolating {{param}} placeholders.
   * Falls back to English, then to key. Triggers async fallback to /api/translate for missing keys.
   * @param {string} key
   * @param {Object} [params]
   * @returns {string}
   */
  t(key, params = {}) {
    const langMap = TRANSLATIONS[this._lang] || {};
    const enMap = TRANSLATIONS['en'] || {};
    let text = langMap[key] || enMap[key];

    if (!text) {
      // Trigger async fallback translation (fire and forget; result cached)
      this._autoTranslate(key);
      text = key;
    }

    // Interpolate {{param}} placeholders
    return text.replace(/\{\{(\w+)\}\}/g, (_, k) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`
    );
  }

  async _autoTranslate(key) {
    const cacheKey = `${this._lang}:${key}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: key, targetLang: this._lang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!TRANSLATIONS[this._lang]) TRANSLATIONS[this._lang] = {};
        TRANSLATIONS[this._lang][key] = data.translated;
        this._cache[cacheKey] = data.translated;
      }
    } catch {
      // Silently fail; key will be shown as-is
    }
  }

  /**
   * Change the active language.
   * @param {string} code
   */
  setLanguage(code) {
    if (!SUPPORTED_LANGUAGES.includes(code)) throw new Error(`Unsupported language: ${code}`);
    this._lang = code;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code;
    }
  }

  /** @returns {string} */
  getLanguage() {
    return this._lang;
  }

  /** @returns {string[]} */
  getSupportedLanguages() {
    return [...SUPPORTED_LANGUAGES];
  }

  /**
   * Format a number for the current locale.
   * @param {number} value
   * @param {Object} [opts] - Intl.NumberFormat options
   * @returns {string}
   */
  formatNumber(value, opts = {}) {
    return new Intl.NumberFormat(this._lang, opts).format(value);
  }

  /**
   * Format a date for the current locale.
   * @param {Date|string|number} value
   * @param {Object} [opts] - Intl.DateTimeFormat options
   * @returns {string}
   */
  formatDate(value, opts = {}) {
    return new Intl.DateTimeFormat(this._lang, opts).format(new Date(value));
  }

  /**
   * Format a currency value.
   * @param {number} amount
   * @param {string} [currency='USD']
   * @returns {string}
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this._lang, { style: 'currency', currency }).format(amount);
  }
}

const i18n = new I18nService();
export default i18n;
export { I18nService, SUPPORTED_LANGUAGES };
