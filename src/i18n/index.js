/**
 * i18n/index.js
 * Multi-language and regional support with auto-translate capability
 * Supports 16+ locales, RTL, regional date/number/currency formats
 * Updated: 2026-07-21
 */

export const SUPPORTED_LOCALES = {
  en: { name: 'English', native: 'English', dir: 'ltr', emoji: '🇺🇸' },
  es: { name: 'Spanish', native: 'Español', dir: 'ltr', emoji: '🇪🇸' },
  fr: { name: 'French', native: 'Français', dir: 'ltr', emoji: '🇫🇷' },
  de: { name: 'German', native: 'Deutsch', dir: 'ltr', emoji: '🇩🇪' },
  ja: { name: 'Japanese', native: '日本語', dir: 'ltr', emoji: '🇯🇵' },
  zh: { name: 'Chinese', native: '中文', dir: 'ltr', emoji: '🇨🇳' },
  ko: { name: 'Korean', native: '한국어', dir: 'ltr', emoji: '🇰🇷' },
  pt: { name: 'Portuguese', native: 'Português', dir: 'ltr', emoji: '🇧🇷' },
  ar: { name: 'Arabic', native: 'العربية', dir: 'rtl', emoji: '🇸🇦' },
  hi: { name: 'Hindi', native: 'हिन्दी', dir: 'ltr', emoji: '🇮🇳' },
  ru: { name: 'Russian', native: 'Русский', dir: 'ltr', emoji: '🇷🇺' },
  it: { name: 'Italian', native: 'Italiano', dir: 'ltr', emoji: '🇮🇹' },
  nl: { name: 'Dutch', native: 'Nederlands', dir: 'ltr', emoji: '🇳🇱' },
  tr: { name: 'Turkish', native: 'Türkçe', dir: 'ltr', emoji: '🇹🇷' },
  pl: { name: 'Polish', native: 'Polski', dir: 'ltr', emoji: '🇵🇱' },
  sv: { name: 'Swedish', native: 'Svenska', dir: 'ltr', emoji: '🇸🇪' },
};

const BASE_STRINGS = {
  // Common UI
  'app.name': 'Nexus AI Pro',
  'nav.chat': 'Chat',
  'nav.code': 'Code',
  'nav.security': 'Security',
  'nav.analytics': 'Analytics',
  'nav.projects': 'Projects',
  'nav.settings': 'Settings',
  'nav.payments': 'Plans & Billing',

  // Auth
  'auth.signin': 'Sign In',
  'auth.register': 'Create Account',
  'auth.email': 'Email',
  'auth.username': 'Username',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.mfaCode': 'MFA Code',
  'auth.biometric.fingerprint': 'Fingerprint / Touch ID',
  'auth.biometric.face': 'Face ID',
  'auth.biometric.retinal': 'Retinal Scan',
  'auth.password.hint': 'Minimum 13 characters with uppercase, lowercase, number and special character',
  'auth.2fa.setup': 'Set Up Two-Factor Authentication',
  'auth.2fa.required': '2FA Required',

  // Dashboard
  'dashboard.security': 'Security Dashboard',
  'dashboard.analytics': 'Analytics Dashboard',
  'dashboard.projects': 'Project Tracker',
  'dashboard.score': 'Security Score',
  'dashboard.scan': 'Run Scan',
  'dashboard.scanning': 'Scanning...',

  // Analytics
  'analytics.views': 'Views',
  'analytics.likes': 'Likes',
  'analytics.reach': 'Reach',
  'analytics.retention': 'Retention',
  'analytics.followers': 'Followers',
  'analytics.engagement': 'Engagement',

  // Payments
  'payment.choosePlan': 'Choose Your Plan',
  'payment.card': 'Card',
  'payment.crypto': 'Crypto',
  'payment.giftcard': 'Gift Card',
  'payment.pay': 'Pay Securely',
  'payment.success': 'Payment Received!',

  // Projects
  'project.new': 'New Project',
  'project.name': 'Project Name',
  'project.type': 'Type',
  'project.engine': 'Engine',
  'project.progress': 'Progress',
  'project.status': 'Status',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.submit': 'Submit',
  'common.refresh': 'Refresh',
  'common.create': 'Create',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.search': 'Search',
};

const TRANSLATIONS = {
  en: { ...BASE_STRINGS },
  es: {
    'app.name': 'Nexus AI Pro',
    'nav.chat': 'Chat', 'nav.code': 'Código', 'nav.security': 'Seguridad',
    'nav.analytics': 'Analíticas', 'nav.projects': 'Proyectos', 'nav.settings': 'Configuración',
    'auth.signin': 'Iniciar Sesión', 'auth.register': 'Crear Cuenta',
    'auth.email': 'Correo electrónico', 'auth.username': 'Usuario', 'auth.password': 'Contraseña',
    'dashboard.scan': 'Ejecutar Escaneo', 'dashboard.scanning': 'Escaneando...',
    'analytics.views': 'Vistas', 'analytics.likes': 'Me gusta', 'analytics.reach': 'Alcance',
    'common.loading': 'Cargando...', 'common.error': 'Ocurrió un error',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.close': 'Cerrar',
    'payment.choosePlan': 'Elige tu Plan', 'payment.pay': 'Pagar de Forma Segura',
  },
  fr: {
    'nav.chat': 'Chat', 'nav.code': 'Code', 'nav.security': 'Sécurité',
    'nav.analytics': 'Analytique', 'nav.projects': 'Projets', 'nav.settings': 'Paramètres',
    'auth.signin': 'Se connecter', 'auth.register': 'Créer un compte',
    'auth.email': 'E-mail', 'auth.username': "Nom d'utilisateur", 'auth.password': 'Mot de passe',
    'dashboard.scan': 'Lancer le scan', 'dashboard.scanning': 'Analyse en cours...',
    'common.loading': 'Chargement...', 'common.error': 'Une erreur est survenue',
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler',
    'payment.choosePlan': 'Choisissez votre forfait', 'payment.pay': 'Payer en toute sécurité',
  },
  de: {
    'nav.chat': 'Chat', 'nav.code': 'Code', 'nav.security': 'Sicherheit',
    'auth.signin': 'Anmelden', 'auth.register': 'Konto erstellen',
    'auth.email': 'E-Mail', 'auth.username': 'Benutzername', 'auth.password': 'Passwort',
    'common.loading': 'Laden...', 'common.save': 'Speichern', 'common.cancel': 'Abbrechen',
    'payment.choosePlan': 'Wähle deinen Plan',
  },
  ja: {
    'nav.chat': 'チャット', 'nav.code': 'コード', 'nav.security': 'セキュリティ',
    'auth.signin': 'ログイン', 'auth.register': 'アカウント作成',
    'auth.email': 'メール', 'auth.password': 'パスワード',
    'common.loading': '読み込み中...', 'common.save': '保存', 'common.cancel': 'キャンセル',
  },
  zh: {
    'nav.chat': '聊天', 'nav.code': '代码', 'nav.security': '安全',
    'auth.signin': '登录', 'auth.register': '创建账户',
    'auth.email': '邮箱', 'auth.password': '密码',
    'common.loading': '加载中...', 'common.save': '保存', 'common.cancel': '取消',
  },
  ar: {
    'nav.chat': 'دردشة', 'nav.code': 'كود', 'nav.security': 'أمان',
    'auth.signin': 'تسجيل الدخول', 'auth.register': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور',
    'common.loading': 'جار التحميل...', 'common.save': 'حفظ', 'common.cancel': 'إلغاء',
  },
  ko: {
    'nav.chat': '채팅', 'nav.code': '코드', 'nav.security': '보안',
    'auth.signin': '로그인', 'auth.register': '계정 만들기',
    'auth.email': '이메일', 'auth.password': '비밀번호',
    'common.loading': '로딩 중...', 'common.save': '저장', 'common.cancel': '취소',
  },
  pt: {
    'nav.chat': 'Chat', 'nav.code': 'Código', 'nav.security': 'Segurança',
    'auth.signin': 'Entrar', 'auth.register': 'Criar conta',
    'auth.email': 'E-mail', 'auth.password': 'Senha',
    'common.loading': 'Carregando...', 'common.save': 'Salvar', 'common.cancel': 'Cancelar',
  },
  hi: {
    'nav.chat': 'चैट', 'nav.code': 'कोड', 'nav.security': 'सुरक्षा',
    'auth.signin': 'साइन इन', 'auth.register': 'खाता बनाएं',
    'auth.email': 'ईमेल', 'auth.password': 'पासवर्ड',
    'common.loading': 'लोड हो रहा है...', 'common.save': 'सहेजें', 'common.cancel': 'रद्द करें',
  },
  ru: {
    'nav.chat': 'Чат', 'nav.code': 'Код', 'nav.security': 'Безопасность',
    'auth.signin': 'Войти', 'auth.register': 'Создать аккаунт',
    'auth.email': 'Эл. почта', 'auth.password': 'Пароль',
    'common.loading': 'Загрузка...', 'common.save': 'Сохранить', 'common.cancel': 'Отмена',
  },
};

class I18nManager {
  constructor() {
    this.locale = this.detectLocale();
    this.listeners = new Set();
    this.translationCache = new Map();
  }

  detectLocale() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus:locale') : null;
    if (stored && SUPPORTED_LOCALES[stored]) return stored;
    const browser = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : 'en';
    return SUPPORTED_LOCALES[browser] ? browser : 'en';
  }

  setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) throw new Error(`Unsupported locale: ${locale}`);
    this.locale = locale;
    if (typeof localStorage !== 'undefined') localStorage.setItem('nexus:locale', locale);
    const dir = SUPPORTED_LOCALES[locale].dir;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
      document.documentElement.setAttribute('dir', dir);
    }
    this.listeners.forEach(fn => fn(locale));
  }

  t(key, params = {}) {
    const strings = TRANSLATIONS[this.locale] || TRANSLATIONS.en;
    const base = strings[key] || TRANSLATIONS.en[key] || key;
    return base.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }

  formatNumber(n, options = {}) {
    try {
      return new Intl.NumberFormat(this.locale, options).format(n);
    } catch {
      return String(n);
    }
  }

  formatDate(date, options = { dateStyle: 'medium' }) {
    try {
      return new Intl.DateTimeFormat(this.locale, options).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  }

  formatCurrency(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat(this.locale, { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  formatRelativeTime(ms) {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    try {
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
      if (seconds < 60) return rtf.format(-seconds, 'second');
      if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), 'minute');
      if (seconds < 86400) return rtf.format(-Math.floor(seconds / 3600), 'hour');
      return rtf.format(-Math.floor(seconds / 86400), 'day');
    } catch {
      return `${Math.floor(seconds / 60)}m ago`;
    }
  }

  isRTL() {
    return SUPPORTED_LOCALES[this.locale]?.dir === 'rtl';
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async autoTranslate(text, targetLocale = this.locale) {
    if (targetLocale === 'en') return text;
    const cacheKey = `${text}:${targetLocale}`;
    if (this.translationCache.has(cacheKey)) return this.translationCache.get(cacheKey);
    try {
      const res = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: targetLocale })
      });
      if (!res.ok) return text;
      const { translated } = await res.json();
      this.translationCache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    }
  }
}

export const i18n = new I18nManager();

export function useI18n() {
  const [locale, setLocaleState] = React.useState ? React.useState(i18n.locale)[0] : i18n.locale;

  if (typeof React !== 'undefined' && React.useEffect) {
    React.useEffect(() => {
      return i18n.subscribe((l) => setLocaleState(l));
    }, []);
  }

  return {
    t: i18n.t.bind(i18n),
    locale,
    setLocale: i18n.setLocale.bind(i18n),
    formatNumber: i18n.formatNumber.bind(i18n),
    formatDate: i18n.formatDate.bind(i18n),
    formatCurrency: i18n.formatCurrency.bind(i18n),
    formatRelativeTime: i18n.formatRelativeTime.bind(i18n),
    isRTL: i18n.isRTL.bind(i18n),
    autoTranslate: i18n.autoTranslate.bind(i18n),
    supportedLocales: SUPPORTED_LOCALES,
  };
}

export default i18n;
