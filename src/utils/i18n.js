// Nexus AI Pro - Internationalization Utility | 2026-10-12

const LOCALES = {
  en: { name: 'English', dir: 'ltr', region: 'US' },
  es: { name: 'Español', dir: 'ltr', region: 'ES' },
  fr: { name: 'Français', dir: 'ltr', region: 'FR' },
  de: { name: 'Deutsch', dir: 'ltr', region: 'DE' },
  ja: { name: '日本語', dir: 'ltr', region: 'JP' },
  ko: { name: '한국어', dir: 'ltr', region: 'KR' },
  zh: { name: '中文', dir: 'ltr', region: 'CN' },
  pt: { name: 'Português', dir: 'ltr', region: 'BR' },
  ar: { name: 'العربية', dir: 'rtl', region: 'SA' },
  hi: { name: 'हिन्दी', dir: 'ltr', region: 'IN' },
  ru: { name: 'Русский', dir: 'ltr', region: 'RU' },
  it: { name: 'Italiano', dir: 'ltr', region: 'IT' },
  nl: { name: 'Nederlands', dir: 'ltr', region: 'NL' },
  pl: { name: 'Polski', dir: 'ltr', region: 'PL' },
  tr: { name: 'Türkçe', dir: 'ltr', region: 'TR' },
};

const translations = {
  en: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.projects': 'Projects',
    'nav.gamedev': 'Game Dev',
    'nav.settings': 'Settings',
    'nav.logout': 'Log Out',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.biometric': 'Use Biometrics',
    'auth.mfa': 'Two-Factor Authentication',
    'auth.mfaCode': 'Enter 6-digit code',
    'auth.role.user': 'User',
    'auth.role.moderator': 'Moderator',
    'auth.role.developer': 'Developer',
    'auth.role.admin': 'Administrator',
    'auth.passwordStrength': 'Password Strength',
    'auth.passwordStrength.weak': 'Weak',
    'auth.passwordStrength.fair': 'Fair',
    'auth.passwordStrength.good': 'Good',
    'auth.passwordStrength.strong': 'Strong',
    'analytics.title': 'Analytics Dashboard',
    'analytics.platforms': 'Connected Platforms',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.followers': 'Followers',
    'analytics.reach': 'Reach',
    'analytics.retention': 'Retention Rate',
    'analytics.shares': 'Shares',
    'analytics.export': 'Export Data',
    'analytics.connect': 'Connect Platform',
    'security.title': 'Security Dashboard',
    'security.scan': 'Run Scan',
    'security.scanning': 'Scanning...',
    'security.threats': 'Threats Detected',
    'security.network': 'Network Status',
    'security.firewall': 'Firewall',
    'security.ssl': 'SSL Certificate',
    'security.score': 'Security Score',
    'security.lastScan': 'Last Scan',
    'projects.title': 'Project Tracker',
    'projects.new': 'New Project',
    'projects.type.coding': 'Coding',
    'projects.type.game': 'Game Dev',
    'projects.type.arvr': 'AR/VR',
    'projects.type.3d': '3D',
    'projects.build': 'Build',
    'projects.progress': 'Progress',
    'projects.milestone': 'Milestone',
    'payment.plans': 'Subscription Plans',
    'payment.monthly': 'Monthly',
    'payment.annual': 'Annual',
    'payment.basic': 'Basic',
    'payment.pro': 'Pro',
    'payment.enterprise': 'Enterprise',
    'payment.subscribe': 'Subscribe',
    'payment.giftCard': 'Redeem Gift Card',
    'payment.crypto': 'Pay with Crypto',
    'payment.cancel': 'Cancel Subscription',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.refresh': 'Refresh',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
  },
  es: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'Panel',
    'nav.analytics': 'Análisis',
    'nav.security': 'Seguridad',
    'nav.projects': 'Proyectos',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar Sesión',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'analytics.title': 'Panel de Análisis',
    'security.title': 'Panel de Seguridad',
    'projects.title': 'Seguimiento de Proyectos',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
  },
  fr: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'Tableau de bord',
    'nav.analytics': 'Analytique',
    'nav.security': 'Sécurité',
    'nav.projects': 'Projets',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    'auth.login': 'Se connecter',
    'auth.register': 'Créer un compte',
    'analytics.title': 'Tableau de bord Analytique',
    'security.title': 'Tableau de bord Sécurité',
    'projects.title': 'Suivi de projets',
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
  },
  de: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytik',
    'nav.security': 'Sicherheit',
    'nav.projects': 'Projekte',
    'nav.settings': 'Einstellungen',
    'nav.logout': 'Abmelden',
    'auth.login': 'Anmelden',
    'auth.register': 'Konto erstellen',
    'analytics.title': 'Analytik-Dashboard',
    'security.title': 'Sicherheits-Dashboard',
    'projects.title': 'Projektverfolgung',
    'common.loading': 'Laden...',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
  },
  ja: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'ダッシュボード',
    'nav.analytics': 'アナリティクス',
    'nav.security': 'セキュリティ',
    'nav.projects': 'プロジェクト',
    'nav.settings': '設定',
    'nav.logout': 'ログアウト',
    'auth.login': 'サインイン',
    'auth.register': 'アカウント作成',
    'analytics.title': 'アナリティクスダッシュボード',
    'security.title': 'セキュリティダッシュボード',
    'common.loading': '読み込み中...',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
  },
  ko: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': '대시보드',
    'nav.analytics': '분석',
    'nav.security': '보안',
    'nav.projects': '프로젝트',
    'common.loading': '로딩 중...',
    'common.save': '저장',
    'auth.login': '로그인',
    'auth.register': '회원가입',
  },
  zh: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': '仪表板',
    'nav.analytics': '分析',
    'nav.security': '安全',
    'nav.projects': '项目',
    'common.loading': '加载中...',
    'common.save': '保存',
    'auth.login': '登录',
    'auth.register': '注册',
  },
  ar: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'لوحة التحكم',
    'nav.analytics': 'التحليلات',
    'nav.security': 'الأمان',
    'nav.projects': 'المشاريع',
    'common.loading': 'جارٍ التحميل...',
    'common.save': 'حفظ',
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
  },
  hi: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.analytics': 'विश्लेषण',
    'nav.security': 'सुरक्षा',
    'nav.projects': 'प्रोजेक्ट',
    'common.loading': 'लोड हो रहा है...',
    'common.save': 'सहेजें',
    'auth.login': 'साइन इन',
    'auth.register': 'खाता बनाएं',
  },
  pt: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'Painel',
    'nav.analytics': 'Análises',
    'nav.security': 'Segurança',
    'nav.projects': 'Projetos',
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'auth.login': 'Entrar',
    'auth.register': 'Criar Conta',
  },
  ru: {
    'app.name': 'Nexus AI Pro',
    'nav.dashboard': 'Панель',
    'nav.analytics': 'Аналитика',
    'nav.security': 'Безопасность',
    'nav.projects': 'Проекты',
    'common.loading': 'Загрузка...',
    'common.save': 'Сохранить',
    'auth.login': 'Войти',
    'auth.register': 'Создать аккаунт',
  },
};

function detectLocale() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || navigator.languages?.[0] || 'en';
  const base = lang.split('-')[0].toLowerCase();
  return base in LOCALES ? base : 'en';
}

function t(key, locale) {
  const lang = locale || detectLocale();
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

function formatCurrency(amount, locale, currency = 'USD') {
  const lang = locale || detectLocale();
  const region = LOCALES[lang]?.region || 'US';
  try {
    return new Intl.NumberFormat(`${lang}-${region}`, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(date, locale, options = {}) {
  const lang = locale || detectLocale();
  const region = LOCALES[lang]?.region || 'US';
  try {
    return new Intl.DateTimeFormat(`${lang}-${region}`, options).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString();
  }
}

function formatNumber(number, locale) {
  const lang = locale || detectLocale();
  const region = LOCALES[lang]?.region || 'US';
  try {
    return new Intl.NumberFormat(`${lang}-${region}`).format(number);
  } catch {
    return String(number);
  }
}

function getSupportedLocales() {
  return Object.entries(LOCALES).map(([code, info]) => ({ code, ...info }));
}

function isRTL(locale) {
  const lang = locale || detectLocale();
  return LOCALES[lang]?.dir === 'rtl';
}

function getLocaleInfo(locale) {
  return LOCALES[locale] || LOCALES.en;
}

export { t, formatCurrency, formatDate, formatNumber, getSupportedLocales, isRTL, getLocaleInfo, detectLocale };
