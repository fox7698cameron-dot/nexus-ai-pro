// ================================================
// File: src/i18n/index.js
// Date: 2026-10-05
// Description: Multi-language internationalization module supporting 10 languages
// with auto-detection, interpolation, and fallback to English
// ================================================

const translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.refresh': 'Refresh',
    'common.settings': 'Settings',
    'common.logout': 'Logout',
    'common.login': 'Login',
    'common.register': 'Register',
    'common.dashboard': 'Dashboard',
    'common.profile': 'Profile',
    'common.notifications': 'Notifications',

    // Auth
    'auth.title': 'Welcome to Nexus AI Pro',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email Address',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    'auth.forgot_password': 'Forgot Password?',
    'auth.remember_me': 'Remember this device',
    'auth.two_factor': 'Two-Factor Authentication',
    'auth.biometric': 'Use Biometric',
    'auth.role': 'Role',
    'auth.admin': 'Administrator',
    'auth.developer': 'Developer',
    'auth.moderator': 'Moderator',
    'auth.user': 'User',

    // Analytics
    'analytics.title': 'Analytics Dashboard',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reach',
    'analytics.retention': 'Retention',
    'analytics.followers': 'Followers',
    'analytics.engagement': 'Engagement Rate',
    'analytics.realtime': 'Real-Time',
    'analytics.date_range': 'Date Range',
    'analytics.platform': 'Platform',
    'analytics.overview': 'Overview',

    // Game Dev
    'gamedev.title': 'Game Dev Dashboard',
    'gamedev.projects': 'Projects',
    'gamedev.achievements': 'Achievements',
    'gamedev.build_status': 'Build Status',
    'gamedev.assets': 'Assets',
    'gamedev.team': 'Team',
    'gamedev.platforms': 'Platforms',

    // Subscription
    'subscription.title': 'Subscription',
    'subscription.free': 'Free',
    'subscription.pro': 'Pro',
    'subscription.enterprise': 'Enterprise',
    'subscription.upgrade': 'Upgrade Plan',
    'subscription.billing': 'Billing History',
    'subscription.payment': 'Payment Method',
    'subscription.cancel': 'Cancel Subscription',
  },

  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.view': 'Ver',
    'common.close': 'Cerrar',
    'common.submit': 'Enviar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.refresh': 'Actualizar',
    'common.settings': 'Configuración',
    'common.logout': 'Cerrar sesión',
    'common.login': 'Iniciar sesión',
    'common.register': 'Registrarse',
    'common.dashboard': 'Panel',
    'common.profile': 'Perfil',
    'common.notifications': 'Notificaciones',
    'auth.title': 'Bienvenido a Nexus AI Pro',
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'analytics.title': 'Panel de análisis',
    'gamedev.title': 'Panel de desarrollo de juegos',
    'subscription.title': 'Suscripción',
  },

  fr: {
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur s\'est produite',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.view': 'Voir',
    'common.close': 'Fermer',
    'common.submit': 'Soumettre',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.export': 'Exporter',
    'common.import': 'Importer',
    'common.refresh': 'Actualiser',
    'common.settings': 'Paramètres',
    'common.logout': 'Déconnexion',
    'common.login': 'Connexion',
    'common.register': 'S\'inscrire',
    'common.dashboard': 'Tableau de bord',
    'common.profile': 'Profil',
    'common.notifications': 'Notifications',
    'auth.title': 'Bienvenue sur Nexus AI Pro',
    'auth.login': 'Se connecter',
    'auth.register': 'Créer un compte',
    'analytics.title': 'Tableau de bord analytique',
    'gamedev.title': 'Tableau de bord de développement de jeux',
    'subscription.title': 'Abonnement',
  },

  de: {
    'common.loading': 'Laden...',
    'common.error': 'Ein Fehler ist aufgetreten',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.confirm': 'Bestätigen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.view': 'Ansehen',
    'common.close': 'Schließen',
    'common.submit': 'Absenden',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    'common.export': 'Exportieren',
    'common.import': 'Importieren',
    'common.refresh': 'Aktualisieren',
    'common.settings': 'Einstellungen',
    'common.logout': 'Abmelden',
    'common.login': 'Anmelden',
    'common.register': 'Registrieren',
    'common.dashboard': 'Dashboard',
    'common.profile': 'Profil',
    'common.notifications': 'Benachrichtigungen',
    'auth.title': 'Willkommen bei Nexus AI Pro',
    'auth.login': 'Anmelden',
    'auth.register': 'Konto erstellen',
    'analytics.title': 'Analyse-Dashboard',
    'gamedev.title': 'Spielentwicklungs-Dashboard',
    'subscription.title': 'Abonnement',
  },

  ja: {
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.confirm': '確認',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.view': '表示',
    'common.close': '閉じる',
    'common.submit': '送信',
    'common.back': '戻る',
    'common.next': '次へ',
    'common.search': '検索',
    'common.filter': 'フィルター',
    'common.export': 'エクスポート',
    'common.import': 'インポート',
    'common.refresh': '更新',
    'common.settings': '設定',
    'common.logout': 'ログアウト',
    'common.login': 'ログイン',
    'common.register': '登録',
    'common.dashboard': 'ダッシュボード',
    'common.profile': 'プロフィール',
    'common.notifications': '通知',
    'auth.title': 'Nexus AI Proへようこそ',
    'auth.login': 'サインイン',
    'auth.register': 'アカウント作成',
    'analytics.title': 'アナリティクスダッシュボード',
    'gamedev.title': 'ゲーム開発ダッシュボード',
    'subscription.title': 'サブスクリプション',
  },

  zh: {
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.view': '查看',
    'common.close': '关闭',
    'common.submit': '提交',
    'common.back': '返回',
    'common.next': '下一步',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.import': '导入',
    'common.refresh': '刷新',
    'common.settings': '设置',
    'common.logout': '退出登录',
    'common.login': '登录',
    'common.register': '注册',
    'common.dashboard': '仪表板',
    'common.profile': '个人资料',
    'common.notifications': '通知',
    'auth.title': '欢迎使用 Nexus AI Pro',
    'auth.login': '登录',
    'auth.register': '创建账户',
    'analytics.title': '数据分析仪表板',
    'gamedev.title': '游戏开发仪表板',
    'subscription.title': '订阅',
  },

  ar: {
    'common.loading': 'جاري التحميل...',
    'common.error': 'حدث خطأ',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.view': 'عرض',
    'common.close': 'إغلاق',
    'common.submit': 'إرسال',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.refresh': 'تحديث',
    'common.settings': 'إعدادات',
    'common.logout': 'تسجيل الخروج',
    'common.login': 'تسجيل الدخول',
    'common.register': 'إنشاء حساب',
    'common.dashboard': 'لوحة التحكم',
    'common.profile': 'الملف الشخصي',
    'common.notifications': 'الإشعارات',
    'auth.title': 'مرحباً بك في Nexus AI Pro',
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'analytics.title': 'لوحة تحكم التحليلات',
    'gamedev.title': 'لوحة تطوير الألعاب',
    'subscription.title': 'الاشتراك',
  },

  pt: {
    'common.loading': 'Carregando...',
    'common.error': 'Ocorreu um erro',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.view': 'Ver',
    'common.close': 'Fechar',
    'common.submit': 'Enviar',
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.search': 'Pesquisar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.refresh': 'Atualizar',
    'common.settings': 'Configurações',
    'common.logout': 'Sair',
    'common.login': 'Entrar',
    'common.register': 'Registrar',
    'common.dashboard': 'Painel',
    'common.profile': 'Perfil',
    'common.notifications': 'Notificações',
    'auth.title': 'Bem-vindo ao Nexus AI Pro',
    'auth.login': 'Entrar',
    'auth.register': 'Criar conta',
    'analytics.title': 'Painel de análise',
    'gamedev.title': 'Painel de desenvolvimento de jogos',
    'subscription.title': 'Assinatura',
  },

  ko: {
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.confirm': '확인',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.view': '보기',
    'common.close': '닫기',
    'common.submit': '제출',
    'common.back': '뒤로',
    'common.next': '다음',
    'common.search': '검색',
    'common.filter': '필터',
    'common.export': '내보내기',
    'common.import': '가져오기',
    'common.refresh': '새로고침',
    'common.settings': '설정',
    'common.logout': '로그아웃',
    'common.login': '로그인',
    'common.register': '회원가입',
    'common.dashboard': '대시보드',
    'common.profile': '프로필',
    'common.notifications': '알림',
    'auth.title': 'Nexus AI Pro에 오신 것을 환영합니다',
    'auth.login': '로그인',
    'auth.register': '계정 만들기',
    'analytics.title': '분석 대시보드',
    'gamedev.title': '게임 개발 대시보드',
    'subscription.title': '구독',
  },

  hi: {
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'एक त्रुटि हुई',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.confirm': 'पुष्टि करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.view': 'देखें',
    'common.close': 'बंद करें',
    'common.submit': 'जमा करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.export': 'निर्यात करें',
    'common.import': 'आयात करें',
    'common.refresh': 'ताज़ा करें',
    'common.settings': 'सेटिंग्स',
    'common.logout': 'लॉग आउट',
    'common.login': 'लॉग इन',
    'common.register': 'पंजीकरण करें',
    'common.dashboard': 'डैशबोर्ड',
    'common.profile': 'प्रोफ़ाइल',
    'common.notifications': 'सूचनाएं',
    'auth.title': 'Nexus AI Pro में आपका स्वागत है',
    'auth.login': 'साइन इन करें',
    'auth.register': 'खाता बनाएं',
    'analytics.title': 'एनालिटिक्स डैशबोर्ड',
    'gamedev.title': 'गेम डेव डैशबोर्ड',
    'subscription.title': 'सदस्यता',
  },
};

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);
const SUPPORTED_LOCALES = Object.keys(translations);

/**
 * Detect the user's locale from browser or system settings.
 * Falls back to 'en' if the locale is unsupported.
 * @returns {string} locale code (e.g. 'en', 'es')
 */
export function detectLocale() {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const candidates = nav
      ? [...(nav.languages || []), nav.language, nav.userLanguage]
      : [];

    for (const lang of candidates) {
      if (!lang) continue;
      const base = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_LOCALES.includes(base)) return base;
    }
  } catch {
    // Non-browser environment or permission issue
  }
  return 'en';
}

/**
 * Get the text direction for a locale.
 * @param {string} locale
 * @returns {'ltr'|'rtl'}
 */
export function getTextDirection(locale) {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

/**
 * Translate a key into the target locale, with optional variable interpolation.
 * Falls back to English, then returns the raw key if no translation found.
 *
 * @param {string} key - Dot-separated translation key (e.g. 'common.save')
 * @param {string} [locale] - Locale code; uses detected locale if omitted
 * @param {Record<string,string|number>} [vars] - Variables to interpolate ({{varName}})
 * @returns {string}
 */
export function t(key, locale, vars) {
  const resolvedLocale = locale || detectLocale();
  const localeData = translations[resolvedLocale] || {};
  const fallbackData = translations['en'] || {};

  let text = localeData[key] ?? fallbackData[key] ?? key;

  if (vars && typeof vars === 'object') {
    text = text.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`
    );
  }

  return text;
}

/**
 * Get all translation keys for a namespace prefix.
 * @param {string} namespace - e.g. 'common', 'auth'
 * @param {string} [locale]
 * @returns {Record<string, string>}
 */
export function getNamespace(namespace, locale) {
  const resolvedLocale = locale || detectLocale();
  const localeData = translations[resolvedLocale] || translations['en'] || {};
  const prefix = namespace + '.';
  const result = {};

  for (const [key, value] of Object.entries(localeData)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = value;
    }
  }

  return result;
}

/**
 * List all supported locale codes.
 * @returns {string[]}
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Check if a locale code is supported.
 * @param {string} locale
 * @returns {boolean}
 */
export function isLocaleSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

// Default export: convenience object
const i18n = { t, detectLocale, getTextDirection, getNamespace, getSupportedLocales, isLocaleSupported };
export default i18n;
