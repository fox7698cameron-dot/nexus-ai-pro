// src/i18n/i18nService.js
// 2026-07-23 | Nexus AI Pro - Internationalization & Auto-Translation
// Supports 20+ languages, regional formatting, RTL detection

export const SUPPORTED_LOCALES = Object.freeze({
  'en': { name: 'English', nativeName: 'English', rtl: false, region: 'US' },
  'es': { name: 'Spanish', nativeName: 'Español', rtl: false, region: 'ES' },
  'fr': { name: 'French', nativeName: 'Français', rtl: false, region: 'FR' },
  'de': { name: 'German', nativeName: 'Deutsch', rtl: false, region: 'DE' },
  'it': { name: 'Italian', nativeName: 'Italiano', rtl: false, region: 'IT' },
  'pt': { name: 'Portuguese', nativeName: 'Português', rtl: false, region: 'BR' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands', rtl: false, region: 'NL' },
  'pl': { name: 'Polish', nativeName: 'Polski', rtl: false, region: 'PL' },
  'ru': { name: 'Russian', nativeName: 'Русский', rtl: false, region: 'RU' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '中文(简体)', rtl: false, region: 'CN' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '中文(繁體)', rtl: false, region: 'TW' },
  'ja': { name: 'Japanese', nativeName: '日本語', rtl: false, region: 'JP' },
  'ko': { name: 'Korean', nativeName: '한국어', rtl: false, region: 'KR' },
  'ar': { name: 'Arabic', nativeName: 'العربية', rtl: true, region: 'SA' },
  'he': { name: 'Hebrew', nativeName: 'עברית', rtl: true, region: 'IL' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', rtl: false, region: 'IN' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', rtl: false, region: 'TR' },
  'sv': { name: 'Swedish', nativeName: 'Svenska', rtl: false, region: 'SE' },
  'no': { name: 'Norwegian', nativeName: 'Norsk', rtl: false, region: 'NO' },
  'da': { name: 'Danish', nativeName: 'Dansk', rtl: false, region: 'DK' },
  'fi': { name: 'Finnish', nativeName: 'Suomi', rtl: false, region: 'FI' },
  'th': { name: 'Thai', nativeName: 'ไทย', rtl: false, region: 'TH' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, region: 'VN' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, region: 'ID' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська', rtl: false, region: 'UA' },
});

// Core UI string keys with English defaults
const BASE_STRINGS = {
  'app.title': 'Nexus AI Pro',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.logout': 'Sign Out',
  'auth.password': 'Password',
  'auth.email': 'Email',
  'auth.username': 'Username',
  'auth.mfa': 'Two-Factor Authentication',
  'auth.biometric': 'Biometric Login',
  'auth.forgot_password': 'Forgot Password?',
  'auth.reset_password': 'Reset Password',
  'dashboard.analytics': 'Analytics Dashboard',
  'dashboard.security': 'Security Dashboard',
  'dashboard.projects': 'Project Tracker',
  'dashboard.admin': 'Admin Dashboard',
  'dashboard.dev': 'Developer Console',
  'dashboard.moderator': 'Moderator Dashboard',
  'dashboard.user': 'My Dashboard',
  'project.create': 'Create Project',
  'project.status.planning': 'Planning',
  'project.status.in_progress': 'In Progress',
  'project.status.completed': 'Completed',
  'project.status.on_hold': 'On Hold',
  'payment.subscribe': 'Subscribe',
  'payment.free': 'Free Plan',
  'payment.pro': 'Pro Plan',
  'payment.enterprise': 'Enterprise Plan',
  'payment.gift_card': 'Gift Card',
  'payment.crypto': 'Cryptocurrency',
  'security.scan': 'Run Security Scan',
  'security.threats': 'Threats Detected',
  'security.secure': 'System Secure',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.success': 'Success',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.export': 'Export',
};

// Simple translations for key strings (production should use a full i18n file set or translation API)
const TRANSLATIONS = {
  'es': {
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.logout': 'Cerrar Sesión',
    'dashboard.analytics': 'Panel de Analíticas',
    'dashboard.security': 'Panel de Seguridad',
    'dashboard.projects': 'Rastreador de Proyectos',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.success': 'Éxito',
  },
  'fr': {
    'auth.login': 'Se Connecter',
    'auth.register': 'Créer un Compte',
    'auth.logout': 'Se Déconnecter',
    'dashboard.analytics': 'Tableau de Bord Analytics',
    'dashboard.security': 'Tableau de Bord Sécurité',
    'dashboard.projects': 'Suivi de Projets',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.success': 'Succès',
  },
  'de': {
    'auth.login': 'Anmelden',
    'auth.register': 'Konto Erstellen',
    'auth.logout': 'Abmelden',
    'dashboard.analytics': 'Analytics Dashboard',
    'dashboard.security': 'Sicherheits-Dashboard',
    'dashboard.projects': 'Projekt-Tracker',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.loading': 'Laden...',
    'common.error': 'Ein Fehler ist aufgetreten',
    'common.success': 'Erfolg',
  },
  'zh-CN': {
    'auth.login': '登录',
    'auth.register': '创建账户',
    'auth.logout': '退出',
    'dashboard.analytics': '数据分析仪表板',
    'dashboard.security': '安全仪表板',
    'dashboard.projects': '项目追踪',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.success': '成功',
  },
  'ja': {
    'auth.login': 'サインイン',
    'auth.register': 'アカウント作成',
    'auth.logout': 'サインアウト',
    'dashboard.analytics': 'アナリティクスダッシュボード',
    'dashboard.security': 'セキュリティダッシュボード',
    'dashboard.projects': 'プロジェクトトラッカー',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.success': '成功',
  },
  'ar': {
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.logout': 'تسجيل الخروج',
    'dashboard.analytics': 'لوحة التحليلات',
    'dashboard.security': 'لوحة الأمان',
    'dashboard.projects': 'متتبع المشاريع',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.loading': 'جار التحميل...',
    'common.error': 'حدث خطأ',
    'common.success': 'نجاح',
  },
  'ko': {
    'auth.login': '로그인',
    'auth.register': '계정 만들기',
    'auth.logout': '로그아웃',
    'dashboard.analytics': '분석 대시보드',
    'dashboard.security': '보안 대시보드',
    'dashboard.projects': '프로젝트 추적기',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.success': '성공',
  },
};

export class I18nService {
  constructor() {
    this.translations = new Map(Object.entries(TRANSLATIONS));
    this.baseStrings = BASE_STRINGS;
    this._translateCache = new Map();
    this._translateProvider = null;
  }

  setTranslateProvider(fn) {
    this._translateProvider = fn;
  }

  isSupported(locale) {
    return locale in SUPPORTED_LOCALES;
  }

  isRTL(locale) {
    return SUPPORTED_LOCALES[locale]?.rtl || false;
  }

  normalizeLocale(raw) {
    if (!raw) return 'en';
    const lower = raw.toLowerCase();
    for (const key of Object.keys(SUPPORTED_LOCALES)) {
      if (key.toLowerCase() === lower) return key;
    }
    const lang = lower.split('-')[0];
    for (const key of Object.keys(SUPPORTED_LOCALES)) {
      if (key.split('-')[0].toLowerCase() === lang) return key;
    }
    return 'en';
  }

  t(key, locale = 'en', vars = {}) {
    const normalizedLocale = this.normalizeLocale(locale);
    const localeStrings = this.translations.get(normalizedLocale) || {};
    const text = localeStrings[key] || this.baseStrings[key] || key;
    return this._interpolate(text, vars);
  }

  _interpolate(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`);
  }

  async autoTranslate(text, targetLocale, sourceLocale = 'en') {
    const normalized = this.normalizeLocale(targetLocale);
    if (normalized === sourceLocale) return text;

    const cacheKey = `${sourceLocale}:${normalized}:${text.slice(0, 100)}`;
    if (this._translateCache.has(cacheKey)) return this._translateCache.get(cacheKey);

    if (this._translateProvider) {
      const translated = await this._translateProvider(text, normalized, sourceLocale);
      this._translateCache.set(cacheKey, translated);
      return translated;
    }

    // Google Translate via environment-configured key
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) return text;

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: normalized, source: sourceLocale, format: 'text' }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      const translated = data?.data?.translations?.[0]?.translatedText || text;
      this._translateCache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    }
  }

  addTranslations(locale, strings) {
    const existing = this.translations.get(locale) || {};
    this.translations.set(locale, { ...existing, ...strings });
  }

  getLocaleInfo(locale) {
    return SUPPORTED_LOCALES[this.normalizeLocale(locale)] || SUPPORTED_LOCALES['en'];
  }

  getAllLocales() {
    return Object.entries(SUPPORTED_LOCALES).map(([code, info]) => ({ code, ...info }));
  }

  formatDate(timestamp, locale = 'en', options = {}) {
    const localeInfo = this.getLocaleInfo(locale);
    const regionLocale = `${locale}-${localeInfo.region}`;
    try {
      return new Intl.DateTimeFormat(regionLocale, {
        year: 'numeric', month: 'short', day: 'numeric',
        ...options,
      }).format(new Date(timestamp));
    } catch {
      return new Date(timestamp).toLocaleDateString();
    }
  }

  formatNumber(num, locale = 'en', options = {}) {
    const localeInfo = this.getLocaleInfo(locale);
    const regionLocale = `${locale}-${localeInfo.region}`;
    try {
      return new Intl.NumberFormat(regionLocale, options).format(num);
    } catch {
      return String(num);
    }
  }

  formatCurrency(amount, currency = 'USD', locale = 'en') {
    return this.formatNumber(amount, locale, { style: 'currency', currency });
  }
}

export const i18n = new I18nService();
