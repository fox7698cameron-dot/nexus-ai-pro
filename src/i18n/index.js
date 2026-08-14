/**
 * i18n/index.js
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Multi-language and Regional Support Module
 * Supports: English, Spanish, French, German, Japanese, Korean, Chinese,
 *           Arabic (RTL), Portuguese, Russian, Hindi, Italian
 * Auto-translate via server API or fallback to English
 * Updated: 2026-08-14
 */

// ─── Supported Languages ──────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English',    nativeName: 'English',     rtl: false, region: 'US', flag: '🇺🇸' },
  es: { name: 'Spanish',    nativeName: 'Español',     rtl: false, region: 'ES', flag: '🇪🇸' },
  fr: { name: 'French',     nativeName: 'Français',    rtl: false, region: 'FR', flag: '🇫🇷' },
  de: { name: 'German',     nativeName: 'Deutsch',     rtl: false, region: 'DE', flag: '🇩🇪' },
  ja: { name: 'Japanese',   nativeName: '日本語',       rtl: false, region: 'JP', flag: '🇯🇵' },
  ko: { name: 'Korean',     nativeName: '한국어',       rtl: false, region: 'KR', flag: '🇰🇷' },
  zh: { name: 'Chinese',    nativeName: '中文',         rtl: false, region: 'CN', flag: '🇨🇳' },
  ar: { name: 'Arabic',     nativeName: 'العربية',     rtl: true,  region: 'SA', flag: '🇸🇦' },
  pt: { name: 'Portuguese', nativeName: 'Português',   rtl: false, region: 'BR', flag: '🇧🇷' },
  ru: { name: 'Russian',    nativeName: 'Русский',     rtl: false, region: 'RU', flag: '🇷🇺' },
  hi: { name: 'Hindi',      nativeName: 'हिन्दी',      rtl: false, region: 'IN', flag: '🇮🇳' },
  it: { name: 'Italian',    nativeName: 'Italiano',    rtl: false, region: 'IT', flag: '🇮🇹' },
};

// ─── Translation Strings (English base) ───────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.projects': 'Projects',
    'nav.settings': 'Settings',
    'nav.logout': 'Sign Out',

    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot password?',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.noAccount': "Don't have an account?",
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.passwordStrength': 'Password Strength',
    'auth.mfa': 'Two-Factor Authentication',
    'auth.biometrics': 'Biometric Sign In',

    // Common
    'common.loading': 'Loading…',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.confirm': 'Confirm',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.refresh': 'Refresh',
    'common.connected': 'Connected',
    'common.disconnected': 'Disconnected',

    // Dashboard
    'dashboard.overview': 'Overview',
    'dashboard.analytics': 'Analytics',
    'dashboard.realtime': 'Real-time',
    'dashboard.lastUpdated': 'Last updated',
    'dashboard.noData': 'No data available',

    // Security
    'security.score': 'Security Score',
    'security.scan': 'Run Scan',
    'security.scanning': 'Scanning…',
    'security.secure': 'Secure',
    'security.vulnerable': 'Vulnerable',
    'security.patch': 'Apply Patch',
    'security.encryption': 'Encryption',
    'security.threats': 'Threats Blocked',

    // Analytics
    'analytics.followers': 'Followers',
    'analytics.views': 'Views',
    'analytics.reach': 'Reach',
    'analytics.engagement': 'Engagement',
    'analytics.retention': 'Retention',
    'analytics.likes': 'Likes',
    'analytics.comments': 'Comments',
    'analytics.shares': 'Shares',

    // Projects
    'projects.new': 'New Project',
    'projects.progress': 'Progress',
    'projects.commits': 'Commits',
    'projects.builds': 'Builds',
    'projects.coverage': 'Coverage',
    'projects.milestones': 'Milestones',

    // Payments
    'payment.subscribe': 'Subscribe',
    'payment.plan': 'Plan',
    'payment.billing': 'Billing',
    'payment.monthly': 'Monthly',
    'payment.yearly': 'Yearly',
    'payment.free': 'Free',
    'payment.upgrade': 'Upgrade',
    'payment.cancel': 'Cancel Subscription',
  },

  es: {
    'nav.home': 'Inicio',
    'nav.dashboard': 'Panel',
    'nav.analytics': 'Analíticas',
    'nav.security': 'Seguridad',
    'nav.projects': 'Proyectos',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar Sesión',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'common.loading': 'Cargando…',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'security.score': 'Puntuación de Seguridad',
    'security.scan': 'Ejecutar Escaneo',
    'payment.subscribe': 'Suscribirse',
    'payment.monthly': 'Mensual',
    'payment.yearly': 'Anual',
  },

  fr: {
    'nav.home': 'Accueil',
    'nav.dashboard': 'Tableau de bord',
    'nav.analytics': 'Analytiques',
    'nav.security': 'Sécurité',
    'auth.login': 'Se Connecter',
    'auth.register': 'Créer un Compte',
    'common.loading': 'Chargement…',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.error': 'Erreur',
    'security.scan': 'Lancer l\'Analyse',
  },

  de: {
    'nav.home': 'Startseite',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytik',
    'auth.login': 'Anmelden',
    'auth.register': 'Konto erstellen',
    'common.loading': 'Laden…',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
  },

  ja: {
    'nav.home': 'ホーム',
    'nav.dashboard': 'ダッシュボード',
    'nav.analytics': '分析',
    'auth.login': 'ログイン',
    'auth.register': 'アカウント作成',
    'common.loading': '読み込み中…',
    'common.save': '保存',
  },

  ko: {
    'nav.home': '홈',
    'nav.dashboard': '대시보드',
    'auth.login': '로그인',
    'auth.register': '계정 만들기',
    'common.loading': '로딩 중…',
  },

  zh: {
    'nav.home': '首页',
    'nav.dashboard': '仪表板',
    'auth.login': '登录',
    'auth.register': '创建账户',
    'common.loading': '加载中…',
  },

  ar: {
    'nav.home': 'الرئيسية',
    'nav.dashboard': 'لوحة التحكم',
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'common.loading': 'جارٍ التحميل…',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
  },

  pt: {
    'nav.home': 'Início',
    'nav.dashboard': 'Painel',
    'auth.login': 'Entrar',
    'auth.register': 'Criar Conta',
    'common.loading': 'Carregando…',
  },

  ru: {
    'nav.home': 'Главная',
    'nav.dashboard': 'Панель',
    'auth.login': 'Войти',
    'auth.register': 'Создать Аккаунт',
    'common.loading': 'Загрузка…',
  },

  hi: {
    'nav.home': 'होम',
    'nav.dashboard': 'डैशबोर्ड',
    'auth.login': 'साइन इन',
    'auth.register': 'खाता बनाएं',
    'common.loading': 'लोड हो रहा है…',
  },

  it: {
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'auth.login': 'Accedi',
    'auth.register': 'Crea Account',
    'common.loading': 'Caricamento…',
  },
};

// ─── i18n Class ───────────────────────────────────────────────────────────────
class I18n {
  constructor() {
    this.locale = 'en';
    this.region = 'US';
    this.listeners = new Set();
    this._detectLocale();
  }

  /** Auto-detect locale from browser */
  _detectLocale() {
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || navigator.userLanguage || 'en';
      const code = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_LANGUAGES[code]) this.locale = code;
      const region = lang.split('-')[1]?.toUpperCase();
      if (region) this.region = region;
    }
    // Restore from localStorage
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus:locale') : null;
    if (saved && SUPPORTED_LANGUAGES[saved]) this.locale = saved;
  }

  /** Get current locale info */
  get currentLanguage() { return SUPPORTED_LANGUAGES[this.locale] || SUPPORTED_LANGUAGES.en; }

  /** Is current language RTL? */
  get isRTL() { return this.currentLanguage.rtl || false; }

  /** Set locale */
  setLocale(code) {
    if (!SUPPORTED_LANGUAGES[code]) return;
    this.locale = code;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', code);
    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
      document.documentElement.dir = this.isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = code;
    }
    this.listeners.forEach(fn => fn(code));
  }

  /** Subscribe to locale changes */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Translate a key.
   * Falls back to English, then to the key itself.
   * Supports template interpolation: t('hello', { name: 'World' }) → "Hello World"
   */
  t(key, vars = {}) {
    const strings = TRANSLATIONS[this.locale] || {};
    const enStrings = TRANSLATIONS.en || {};
    let text = strings[key] || enStrings[key] || key;
    // Interpolate {{var}} patterns
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
    return text;
  }

  /**
   * Translate via server API (async, uses Claude AI for translation)
   */
  async translateAsync(text, targetLang = this.locale) {
    if (targetLang === 'en') return text;
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_token') : '';
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text, targetLanguage: targetLang })
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data.translated || text;
    } catch {
      return text;
    }
  }

  /**
   * Format a number according to locale
   */
  formatNumber(n, options = {}) {
    try {
      return new Intl.NumberFormat(this.locale + '-' + this.region, options).format(n);
    } catch {
      return String(n);
    }
  }

  /**
   * Format a date according to locale
   */
  formatDate(date, options = { dateStyle: 'medium' }) {
    try {
      return new Intl.DateTimeFormat(this.locale + '-' + this.region, options).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat(this.locale + '-' + this.region, { style: 'currency', currency }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Get all available language options for a selector
   */
  getLanguageOptions() {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => ({
      value: code, label: `${lang.flag} ${lang.nativeName}`, rtl: lang.rtl
    }));
  }
}

// Singleton
export const i18n = new I18n();
export const t = (key, vars) => i18n.t(key, vars);

// React hook for i18n
export function useI18n() {
  // Avoids React import here; consumers can integrate with useState
  return { t: i18n.t.bind(i18n), i18n, locale: i18n.locale, isRTL: i18n.isRTL };
}

export default i18n;
