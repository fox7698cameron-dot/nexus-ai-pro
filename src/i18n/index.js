/**
 * src/i18n/index.js
 * Internationalization Configuration
 * Updated: 2026-08-24
 *
 * Multi-language support with auto-translate for scalability.
 * Supports: EN, ES, FR, DE, JA, KO, ZH, PT, AR, HI, RU, IT
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
        dashboard: 'Dashboard',
        analytics: 'Analytics',
        security: 'Security',
        notifications: 'Notifications',
        help: 'Help',
        close: 'Close',
      },
      auth: {
        login: 'Login',
        register: 'Register',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        username: 'Username',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        mfaCode: 'MFA Code',
        biometricLogin: 'Use Biometric Login',
        twoFactorAuth: '2-Factor Authentication',
        passwordRequirements: 'Password must be 13+ characters with special characters',
        usernameHint: 'Supports emojis and special characters',
        invalidCredentials: 'Invalid email or password',
        accountLocked: 'Account locked. Contact support.',
        sessionExpired: 'Session expired. Please log in again.',
        welcomeBack: 'Welcome back',
        createAccount: 'Create your account',
      },
      dashboard: {
        overview: 'Overview',
        recentActivity: 'Recent Activity',
        quickStats: 'Quick Stats',
        alerts: 'Alerts',
        users: 'Users',
        revenue: 'Revenue',
        growth: 'Growth',
        performance: 'Performance',
      },
      analytics: {
        title: 'Social Analytics',
        totalReach: 'Total Reach',
        engagement: 'Engagement Rate',
        followers: 'Followers',
        impressions: 'Impressions',
        views: 'Views',
        likes: 'Likes',
        comments: 'Comments',
        shares: 'Shares',
        retention: 'Retention Rate',
        watchTime: 'Watch Time',
        clickThrough: 'Click-Through Rate',
        platforms: 'Platforms',
        period: 'Time Period',
        realTime: 'Real-Time',
        trending: 'Trending',
        topContent: 'Top Content',
      },
      security: {
        title: 'Security Dashboard',
        threatLevel: 'Threat Level',
        vulnerabilities: 'Vulnerabilities',
        activeScans: 'Active Scans',
        lastScan: 'Last Scan',
        networkStatus: 'Network Status',
        deviceHealth: 'Device Health',
        scanNow: 'Scan Now',
        fix: 'Fix',
        ignore: 'Ignore',
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        secure: 'Secure',
        compromised: 'Compromised',
        monitoring: 'Monitoring',
      },
      gamedev: {
        title: 'Game Development',
        projects: 'Projects',
        achievements: 'Achievements',
        progress: 'Progress',
        builds: 'Builds',
        platforms: 'Platforms',
        connectors: 'Connectors',
        unreal: 'Unreal Engine',
        unity: 'Unity',
        arVr: 'AR/VR Projects',
        studio: 'Studio',
      },
      subscriptions: {
        title: 'Subscriptions',
        plan: 'Plan',
        billing: 'Billing',
        payment: 'Payment',
        upgrade: 'Upgrade',
        cancel: 'Cancel Subscription',
        currentPlan: 'Current Plan',
        choosePlan: 'Choose a Plan',
        paymentMethods: 'Payment Methods',
        creditCard: 'Credit/Debit Card',
        crypto: 'Cryptocurrency',
        giftCard: 'Gift Card',
        addCard: 'Add Card',
        secure: 'Secured by Stripe',
      },
      roles: {
        admin: 'Administrator',
        developer: 'Developer',
        moderator: 'Moderator',
        user: 'User',
      },
    },
  },
  es: {
    translation: {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        settings: 'Configuración',
        dashboard: 'Panel',
        security: 'Seguridad',
        logout: 'Cerrar sesión',
      },
      auth: {
        login: 'Iniciar sesión',
        register: 'Registrarse',
        email: 'Correo electrónico',
        password: 'Contraseña',
        username: 'Nombre de usuario',
        signIn: 'Entrar',
        signUp: 'Registrarse',
        welcomeBack: 'Bienvenido de vuelta',
      },
    },
  },
  fr: {
    translation: {
      common: {
        save: 'Sauvegarder',
        cancel: 'Annuler',
        delete: 'Supprimer',
        loading: 'Chargement...',
        settings: 'Paramètres',
        dashboard: 'Tableau de bord',
        security: 'Sécurité',
        logout: 'Déconnexion',
      },
      auth: {
        login: 'Connexion',
        register: 'S\'inscrire',
        email: 'Courriel',
        password: 'Mot de passe',
        username: 'Nom d\'utilisateur',
        signIn: 'Se connecter',
        welcomeBack: 'Bon retour',
      },
    },
  },
  de: {
    translation: {
      common: {
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        loading: 'Laden...',
        settings: 'Einstellungen',
        dashboard: 'Dashboard',
        security: 'Sicherheit',
        logout: 'Abmelden',
      },
      auth: {
        login: 'Anmelden',
        register: 'Registrieren',
        email: 'E-Mail',
        password: 'Passwort',
        username: 'Benutzername',
        signIn: 'Einloggen',
        welcomeBack: 'Willkommen zurück',
      },
    },
  },
  ja: {
    translation: {
      common: {
        save: '保存',
        cancel: 'キャンセル',
        delete: '削除',
        loading: '読み込み中...',
        settings: '設定',
        dashboard: 'ダッシュボード',
        security: 'セキュリティ',
        logout: 'ログアウト',
      },
      auth: {
        login: 'ログイン',
        register: '登録',
        email: 'メール',
        password: 'パスワード',
        username: 'ユーザー名',
        signIn: 'サインイン',
        welcomeBack: 'お帰りなさい',
      },
    },
  },
  ko: {
    translation: {
      common: {
        save: '저장',
        cancel: '취소',
        delete: '삭제',
        loading: '로딩 중...',
        settings: '설정',
        dashboard: '대시보드',
        security: '보안',
        logout: '로그아웃',
      },
      auth: {
        login: '로그인',
        register: '회원가입',
        email: '이메일',
        password: '비밀번호',
        username: '사용자명',
        signIn: '로그인',
        welcomeBack: '돌아오신 것을 환영합니다',
      },
    },
  },
  zh: {
    translation: {
      common: {
        save: '保存',
        cancel: '取消',
        delete: '删除',
        loading: '加载中...',
        settings: '设置',
        dashboard: '仪表板',
        security: '安全',
        logout: '退出登录',
      },
      auth: {
        login: '登录',
        register: '注册',
        email: '电子邮件',
        password: '密码',
        username: '用户名',
        signIn: '登录',
        welcomeBack: '欢迎回来',
      },
    },
  },
  pt: {
    translation: {
      common: {
        save: 'Salvar',
        cancel: 'Cancelar',
        delete: 'Excluir',
        loading: 'Carregando...',
        settings: 'Configurações',
        dashboard: 'Painel',
        security: 'Segurança',
        logout: 'Sair',
      },
      auth: {
        login: 'Entrar',
        register: 'Registrar',
        email: 'Email',
        password: 'Senha',
        username: 'Nome de usuário',
        signIn: 'Entrar',
        welcomeBack: 'Bem-vindo de volta',
      },
    },
  },
  ar: {
    translation: {
      common: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        loading: 'جارٍ التحميل...',
        settings: 'الإعدادات',
        dashboard: 'لوحة التحكم',
        security: 'الأمان',
        logout: 'تسجيل الخروج',
      },
      auth: {
        login: 'تسجيل الدخول',
        register: 'إنشاء حساب',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        username: 'اسم المستخدم',
        signIn: 'دخول',
        welcomeBack: 'مرحباً بعودتك',
      },
    },
  },
};

// Auto-translate function (requires external API in production)
export const autoTranslate = async (text, targetLang, sourceLang = 'en') => {
  if (targetLang === sourceLang) return text;
  try {
    const res = await fetch(`/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translated || text;
  } catch {
    return text;
  }
};

// Language metadata
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr', flag: '🇰🇷' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr', flag: '🇨🇳' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
};

// Detect user's preferred language
const detectLanguage = () => {
  const stored = localStorage.getItem('nexus:language');
  if (stored && LANGUAGES[stored]) return stored;
  const browser = navigator.language?.split('-')[0] || 'en';
  return LANGUAGES[browser] ? browser : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    returnEmptyString: false,
    returnNull: false,
  });

export default i18n;
