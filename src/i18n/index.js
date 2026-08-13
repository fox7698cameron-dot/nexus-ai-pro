// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/i18n/index.js
// Created: 2026-08-13
// Multi-language & Regional Support with Auto-translate capability

// ============================================================
// SUPPORTED LOCALES
// ============================================================
export const SUPPORTED_LOCALES = {
  'en': { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  'es': { name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  'fr': { name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  'de': { name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  'it': { name: 'Italian', nativeName: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  'pt': { name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷' },
  'ja': { name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵' },
  'ko': { name: 'Korean', nativeName: '한국어', dir: 'ltr', flag: '🇰🇷' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '中文(简体)', dir: 'ltr', flag: '🇨🇳' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '中文(繁體)', dir: 'ltr', flag: '🇹🇼' },
  'ar': { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  'ru': { name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  'pl': { name: 'Polish', nativeName: 'Polski', dir: 'ltr', flag: '🇵🇱' },
  'sv': { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr', flag: '🇸🇪' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr', flag: '🇺🇦' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', flag: '🇻🇳' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩' },
  'th': { name: 'Thai', nativeName: 'ภาษาไทย', dir: 'ltr', flag: '🇹🇭' },
};

// ============================================================
// TRANSLATIONS - Core strings for all dashboards
// ============================================================
const translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.refresh': 'Refresh',
    'common.settings': 'Settings',
    'common.logout': 'Logout',
    'common.login': 'Login',
    'common.register': 'Register',
    'common.dashboard': 'Dashboard',
    'common.analytics': 'Analytics',
    'common.security': 'Security',
    'common.projects': 'Projects',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.name': 'Name',
    'common.date': 'Date',
    'common.type': 'Type',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.connected': 'Connected',
    'common.disconnected': 'Disconnected',
    'common.realtime': 'Real-time',
    'common.allPlatforms': 'All Platforms',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.critical': 'Critical',
    'common.info': 'Info',

    // Analytics
    'analytics.title': 'Analytics Dashboard',
    'analytics.totalReach': 'Total Reach',
    'analytics.totalLikes': 'Total Likes',
    'analytics.avgRetention': 'Avg. Retention',
    'analytics.engagement': 'Engagement Rate',
    'analytics.followers': 'Followers',
    'analytics.views': 'Views',
    'analytics.selectPlatform': 'Select Platform',
    'analytics.dateRange': 'Date Range',
    'analytics.last7days': 'Last 7 Days',
    'analytics.last30days': 'Last 30 Days',
    'analytics.last90days': 'Last 90 Days',
    'analytics.custom': 'Custom Range',
    'analytics.liveMetrics': 'Live Metrics',
    'analytics.connectPlatform': 'Connect Platform',
    'analytics.disconnectPlatform': 'Disconnect Platform',
    'analytics.platformStatus': 'Platform Status',
    'analytics.noData': 'No data available for this period',
    'analytics.exportCsv': 'Export CSV',

    // Security
    'security.title': 'Security Dashboard',
    'security.score': 'Security Score',
    'security.runScan': 'Run Scan',
    'security.scanning': 'Scanning...',
    'security.lastScan': 'Last Scan',
    'security.vulnerabilities': 'Vulnerabilities',
    'security.threats': 'Threats',
    'security.networkMonitor': 'Network Monitor',
    'security.deviceHealth': 'Device Health',
    'security.encryption': 'Encryption',
    'security.auditLog': 'Audit Log',
    'security.keyRotation': 'Key Rotation',
    'security.firewall': 'Firewall',
    'security.incidents': 'Security Incidents',
    'security.blocked': 'Blocked',
    'security.allowed': 'Allowed',
    'security.patchAvailable': 'Patch Available',
    'security.patched': 'Patched',
    'security.severity.critical': 'Critical',
    'security.severity.high': 'High',
    'security.severity.medium': 'Medium',
    'security.severity.low': 'Low',

    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.rememberMe': 'Remember Me',
    'auth.biometric': 'Use Biometrics',
    'auth.fingerprint': 'Fingerprint',
    'auth.faceId': 'Face ID',
    'auth.retinalScan': 'Retinal Scan',
    'auth.twoFactor': 'Two-Factor Auth',
    'auth.mfa': 'Multi-Factor Auth',
    'auth.enterCode': 'Enter Code',
    'auth.passwordStrength': 'Password Strength',
    'auth.passwordRequirements': 'Min 13 characters, special chars required',
    'auth.role.user': 'User',
    'auth.role.admin': 'Administrator',
    'auth.role.developer': 'Developer',
    'auth.role.moderator': 'Moderator',

    // Game Dev
    'gamedev.title': 'Game Dev Tracker',
    'gamedev.projects': 'Projects',
    'gamedev.achievements': 'Achievements',
    'gamedev.platforms': 'Platforms',
    'gamedev.builds': 'Builds',
    'gamedev.deployments': 'Deployments',
    'gamedev.engine.unreal': 'Unreal Engine',
    'gamedev.engine.unity': 'Unity',
    'gamedev.platform.epic': 'Epic Games',
    'gamedev.platform.sony': 'PlayStation',
    'gamedev.platform.microsoft': 'Xbox / Microsoft',
    'gamedev.platform.ubisoft': 'Ubisoft Connect',
    'gamedev.platform.steam': 'Steam',
    'gamedev.newProject': 'New Project',
    'gamedev.status.inDev': 'In Development',
    'gamedev.status.testing': 'Testing',
    'gamedev.status.released': 'Released',
    'gamedev.status.archived': 'Archived',

    // Subscription
    'subscription.title': 'Subscription',
    'subscription.free': 'Free',
    'subscription.pro': 'Pro',
    'subscription.enterprise': 'Enterprise',
    'subscription.upgrade': 'Upgrade',
    'subscription.cancel': 'Cancel Plan',
    'subscription.paymentMethod': 'Payment Method',
    'subscription.cardDetails': 'Card Details',
    'subscription.crypto': 'Pay with Crypto',
    'subscription.giftCard': 'Redeem Gift Card',
    'subscription.billingHistory': 'Billing History',
    'subscription.nextBilling': 'Next Billing Date',
  },

  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.dashboard': 'Panel de Control',
    'common.analytics': 'Analíticas',
    'common.security': 'Seguridad',
    'common.projects': 'Proyectos',
    'common.settings': 'Configuración',
    'common.logout': 'Cerrar Sesión',
    'common.login': 'Iniciar Sesión',
    'common.register': 'Registrarse',
    'analytics.title': 'Panel de Analíticas',
    'security.title': 'Panel de Seguridad',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'gamedev.title': 'Rastreador de Desarrollo',
    'subscription.title': 'Suscripción',
  },

  fr: {
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.dashboard': 'Tableau de Bord',
    'common.analytics': 'Analytiques',
    'common.security': 'Sécurité',
    'common.projects': 'Projets',
    'common.settings': 'Paramètres',
    'common.logout': 'Déconnexion',
    'common.login': 'Connexion',
    'common.register': 'S\'inscrire',
    'analytics.title': 'Tableau de Bord Analytiques',
    'security.title': 'Tableau de Bord Sécurité',
    'auth.login': 'Se Connecter',
    'auth.register': 'Créer un Compte',
    'auth.email': 'Email',
    'auth.password': 'Mot de Passe',
    'auth.username': 'Nom d\'Utilisateur',
    'gamedev.title': 'Suivi de Développement',
    'subscription.title': 'Abonnement',
  },

  de: {
    'common.loading': 'Wird geladen...',
    'common.error': 'Fehler',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.dashboard': 'Dashboard',
    'common.analytics': 'Analytik',
    'common.security': 'Sicherheit',
    'common.projects': 'Projekte',
    'common.settings': 'Einstellungen',
    'common.logout': 'Abmelden',
    'analytics.title': 'Analytik-Dashboard',
    'security.title': 'Sicherheits-Dashboard',
    'auth.login': 'Anmelden',
    'auth.register': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'gamedev.title': 'Spielentwicklung Tracker',
    'subscription.title': 'Abonnement',
  },

  ja: {
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.dashboard': 'ダッシュボード',
    'common.analytics': '分析',
    'common.security': 'セキュリティ',
    'common.projects': 'プロジェクト',
    'common.settings': '設定',
    'common.logout': 'ログアウト',
    'analytics.title': '分析ダッシュボード',
    'security.title': 'セキュリティダッシュボード',
    'auth.login': 'ログイン',
    'auth.register': 'アカウント作成',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.username': 'ユーザー名',
    'gamedev.title': 'ゲーム開発トラッカー',
    'subscription.title': 'サブスクリプション',
  },

  ko: {
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.dashboard': '대시보드',
    'common.analytics': '분석',
    'common.security': '보안',
    'common.settings': '설정',
    'common.logout': '로그아웃',
    'analytics.title': '분석 대시보드',
    'security.title': '보안 대시보드',
    'auth.login': '로그인',
    'auth.register': '회원가입',
    'auth.email': '이메일',
    'auth.password': '비밀번호',
    'auth.username': '사용자 이름',
    'subscription.title': '구독',
  },

  'zh-CN': {
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.dashboard': '仪表板',
    'common.analytics': '分析',
    'common.security': '安全',
    'common.settings': '设置',
    'common.logout': '退出登录',
    'analytics.title': '分析仪表板',
    'security.title': '安全仪表板',
    'auth.login': '登录',
    'auth.register': '注册',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.username': '用户名',
    'subscription.title': '订阅',
  },

  ar: {
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.dashboard': 'لوحة التحكم',
    'common.analytics': 'التحليلات',
    'common.security': 'الأمان',
    'common.settings': 'الإعدادات',
    'common.logout': 'تسجيل الخروج',
    'analytics.title': 'لوحة تحكم التحليلات',
    'security.title': 'لوحة تحكم الأمان',
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.username': 'اسم المستخدم',
    'subscription.title': 'الاشتراك',
  },

  ru: {
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.dashboard': 'Панель управления',
    'common.analytics': 'Аналитика',
    'common.security': 'Безопасность',
    'common.settings': 'Настройки',
    'common.logout': 'Выход',
    'analytics.title': 'Панель аналитики',
    'security.title': 'Панель безопасности',
    'auth.login': 'Войти',
    'auth.register': 'Регистрация',
    'auth.email': 'Электронная почта',
    'auth.password': 'Пароль',
    'auth.username': 'Имя пользователя',
    'subscription.title': 'Подписка',
  },

  pt: {
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.dashboard': 'Painel',
    'common.analytics': 'Análises',
    'common.security': 'Segurança',
    'common.settings': 'Configurações',
    'common.logout': 'Sair',
    'analytics.title': 'Painel de Análises',
    'security.title': 'Painel de Segurança',
    'auth.login': 'Entrar',
    'auth.register': 'Criar Conta',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.username': 'Nome de Usuário',
    'subscription.title': 'Assinatura',
  },
};

// ============================================================
// I18N CLASS
// ============================================================
class I18n {
  constructor() {
    this.locale = this.detectLocale();
    this.fallback = 'en';
    this.translations = translations;
    this.autoTranslateCache = new Map();
    this.listeners = new Set();
  }

  detectLocale() {
    // Check stored preference (guard against SSR / Node.js environments)
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus:locale') : null;
    if (stored && translations[stored]) return stored;

    // Detect from browser (guard against Node.js)
    const browserLocale = typeof navigator !== 'undefined' ? navigator.language : 'en';
    const lang = (browserLocale || 'en').split('-')[0];
    const fullLocale = browserLocale || 'en';

    // Check full locale first (zh-CN, zh-TW)
    if (translations[fullLocale]) return fullLocale;
    // Then base language
    if (translations[lang]) return lang;

    return 'en';
  }

  setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) {
      console.warn(`[i18n] Unsupported locale: ${locale}`);
      return;
    }
    this.locale = locale;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', locale);

    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
      document.documentElement.dir = SUPPORTED_LOCALES[locale].dir || 'ltr';
      document.documentElement.lang = locale;
    }

    // Notify listeners
    this.listeners.forEach(fn => fn(locale));
  }

  t(key, params = {}) {
    const currentTranslations = this.translations[this.locale] || {};
    const fallbackTranslations = this.translations[this.fallback] || {};

    let value = currentTranslations[key] || fallbackTranslations[key] || key;

    // Parameter interpolation: {paramName}
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });

    return value;
  }

  // Auto-translate using server endpoint (for dynamic content)
  async autoTranslate(text, targetLocale = this.locale) {
    if (targetLocale === 'en') return text;

    const cacheKey = `${targetLocale}:${text.slice(0, 50)}`;
    if (this.autoTranslateCache.has(cacheKey)) {
      return this.autoTranslateCache.get(cacheKey);
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale, sourceLocale: 'en' }),
      });

      if (!response.ok) return text;

      const { translated } = await response.json();
      this.autoTranslateCache.set(cacheKey, translated);
      return translated;
    } catch {
      return text; // Fallback to original
    }
  }

  // Subscribe to locale changes
  onLocaleChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Get locale info
  getLocaleInfo(locale = this.locale) {
    return SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES['en'];
  }

  // Format number for locale
  formatNumber(num, options = {}) {
    try {
      return new Intl.NumberFormat(this.locale, options).format(num);
    } catch {
      return String(num);
    }
  }

  // Format currency for locale
  formatCurrency(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat(this.locale, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  // Format date for locale
  formatDate(date, options = {}) {
    try {
      return new Intl.DateTimeFormat(this.locale, {
        dateStyle: 'medium',
        ...options,
      }).format(new Date(date));
    } catch {
      return String(date);
    }
  }

  // Format relative time
  formatRelativeTime(date) {
    const diff = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    try {
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
      if (days > 0) return rtf.format(-days, 'day');
      if (hours > 0) return rtf.format(-hours, 'hour');
      if (minutes > 0) return rtf.format(-minutes, 'minute');
      return rtf.format(-seconds, 'second');
    } catch {
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return `${seconds}s ago`;
    }
  }
}

// Singleton
export const i18n = new I18n();

// Convenience shorthand
export const t = (key, params) => i18n.t(key, params);

// React hook for locale-aware components
export function useI18n() {
  // This is designed to work with React's useState/useEffect when imported in components
  return { t: i18n.t.bind(i18n), i18n, locale: i18n.locale };
}

export default i18n;
