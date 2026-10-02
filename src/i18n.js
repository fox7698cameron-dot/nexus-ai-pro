/**
 * i18n.js
 * Lightweight multi-language support with auto-detection.
 * Supports: en, es, fr, de, ja, ko, zh, pt, ar, hi
 * All user-facing strings managed here.
 * Created: 2026-10-02
 */

/** @type {Record<string, Record<string, string>>} */
const TRANSLATIONS = {
  en: {
    appName: 'Nexus AI Pro',
    chat: 'Chat',
    security: 'Security',
    analytics: 'Analytics',
    projects: 'Projects',
    settings: 'Settings',
    signIn: 'Sign In',
    register: 'Register',
    send: 'Send',
    newChat: 'New Chat',
    deleteChat: 'Delete Chat',
    memory: 'Memory',
    model: 'Model',
    theme: 'Theme',
    language: 'Language',
    encryption: 'Encryption',
    logout: 'Sign Out',
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
    upgrade: 'Upgrade',
    typeMessage: 'Type a message…',
  },
  es: {
    appName: 'Nexus AI Pro',
    chat: 'Chat',
    security: 'Seguridad',
    analytics: 'Analítica',
    projects: 'Proyectos',
    settings: 'Configuración',
    signIn: 'Iniciar sesión',
    register: 'Registrarse',
    send: 'Enviar',
    newChat: 'Nuevo chat',
    deleteChat: 'Eliminar chat',
    memory: 'Memoria',
    model: 'Modelo',
    theme: 'Tema',
    language: 'Idioma',
    encryption: 'Encriptación',
    logout: 'Cerrar sesión',
    free: 'Gratis',
    pro: 'Pro',
    enterprise: 'Empresarial',
    upgrade: 'Mejorar',
    typeMessage: 'Escribe un mensaje…',
  },
  fr: {
    appName: 'Nexus AI Pro',
    chat: 'Chat',
    security: 'Sécurité',
    analytics: 'Analytique',
    projects: 'Projets',
    settings: 'Paramètres',
    signIn: 'Se connecter',
    register: "S'inscrire",
    send: 'Envoyer',
    newChat: 'Nouveau chat',
    deleteChat: 'Supprimer le chat',
    memory: 'Mémoire',
    model: 'Modèle',
    theme: 'Thème',
    language: 'Langue',
    encryption: 'Chiffrement',
    logout: 'Se déconnecter',
    free: 'Gratuit',
    pro: 'Pro',
    enterprise: 'Entreprise',
    upgrade: 'Améliorer',
    typeMessage: 'Tapez un message…',
  },
  de: {
    appName: 'Nexus AI Pro',
    chat: 'Chat',
    security: 'Sicherheit',
    analytics: 'Analytik',
    projects: 'Projekte',
    settings: 'Einstellungen',
    signIn: 'Anmelden',
    register: 'Registrieren',
    send: 'Senden',
    newChat: 'Neuer Chat',
    deleteChat: 'Chat löschen',
    memory: 'Gedächtnis',
    model: 'Modell',
    theme: 'Design',
    language: 'Sprache',
    encryption: 'Verschlüsselung',
    logout: 'Abmelden',
    free: 'Kostenlos',
    pro: 'Pro',
    enterprise: 'Unternehmen',
    upgrade: 'Upgraden',
    typeMessage: 'Nachricht eingeben…',
  },
  ja: {
    appName: 'Nexus AI Pro',
    chat: 'チャット',
    security: 'セキュリティ',
    analytics: 'アナリティクス',
    projects: 'プロジェクト',
    settings: '設定',
    signIn: 'サインイン',
    register: '登録',
    send: '送信',
    newChat: '新しいチャット',
    deleteChat: 'チャット削除',
    memory: 'メモリ',
    model: 'モデル',
    theme: 'テーマ',
    language: '言語',
    encryption: '暗号化',
    logout: 'サインアウト',
    free: '無料',
    pro: 'Pro',
    enterprise: 'エンタープライズ',
    upgrade: 'アップグレード',
    typeMessage: 'メッセージを入力…',
  },
  ko: {
    appName: 'Nexus AI Pro',
    chat: '채팅',
    security: '보안',
    analytics: '분석',
    projects: '프로젝트',
    settings: '설정',
    signIn: '로그인',
    register: '회원가입',
    send: '전송',
    newChat: '새 채팅',
    deleteChat: '채팅 삭제',
    memory: '메모리',
    model: '모델',
    theme: '테마',
    language: '언어',
    encryption: '암호화',
    logout: '로그아웃',
    free: '무료',
    pro: 'Pro',
    enterprise: '엔터프라이즈',
    upgrade: '업그레이드',
    typeMessage: '메시지를 입력하세요…',
  },
  zh: {
    appName: 'Nexus AI Pro',
    chat: '聊天',
    security: '安全',
    analytics: '分析',
    projects: '项目',
    settings: '设置',
    signIn: '登录',
    register: '注册',
    send: '发送',
    newChat: '新聊天',
    deleteChat: '删除聊天',
    memory: '记忆',
    model: '模型',
    theme: '主题',
    language: '语言',
    encryption: '加密',
    logout: '退出登录',
    free: '免费',
    pro: '专业版',
    enterprise: '企业版',
    upgrade: '升级',
    typeMessage: '输入消息…',
  },
  pt: {
    appName: 'Nexus AI Pro',
    chat: 'Chat',
    security: 'Segurança',
    analytics: 'Analytics',
    projects: 'Projetos',
    settings: 'Configurações',
    signIn: 'Entrar',
    register: 'Cadastrar',
    send: 'Enviar',
    newChat: 'Novo chat',
    deleteChat: 'Excluir chat',
    memory: 'Memória',
    model: 'Modelo',
    theme: 'Tema',
    language: 'Idioma',
    encryption: 'Criptografia',
    logout: 'Sair',
    free: 'Gratuito',
    pro: 'Pro',
    enterprise: 'Empresarial',
    upgrade: 'Atualizar',
    typeMessage: 'Digite uma mensagem…',
  },
  ar: {
    appName: 'نيكسوس AI برو',
    chat: 'دردشة',
    security: 'الأمان',
    analytics: 'التحليلات',
    projects: 'المشاريع',
    settings: 'الإعدادات',
    signIn: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    send: 'إرسال',
    newChat: 'محادثة جديدة',
    deleteChat: 'حذف المحادثة',
    memory: 'الذاكرة',
    model: 'النموذج',
    theme: 'المظهر',
    language: 'اللغة',
    encryption: 'التشفير',
    logout: 'تسجيل الخروج',
    free: 'مجاني',
    pro: 'برو',
    enterprise: 'مؤسسات',
    upgrade: 'ترقية',
    typeMessage: 'اكتب رسالة…',
  },
  hi: {
    appName: 'Nexus AI Pro',
    chat: 'चैट',
    security: 'सुरक्षा',
    analytics: 'विश्लेषण',
    projects: 'परियोजनाएं',
    settings: 'सेटिंग्स',
    signIn: 'साइन इन',
    register: 'रजिस्टर',
    send: 'भेजें',
    newChat: 'नया चैट',
    deleteChat: 'चैट हटाएं',
    memory: 'मेमोरी',
    model: 'मॉडल',
    theme: 'थीम',
    language: 'भाषा',
    encryption: 'एन्क्रिप्शन',
    logout: 'साइन आउट',
    free: 'मुफ्त',
    pro: 'प्रो',
    enterprise: 'एंटरप्राइज',
    upgrade: 'अपग्रेड',
    typeMessage: 'संदेश लिखें…',
  },
};

/** Supported locale codes */
export const SUPPORTED_LOCALES = Object.keys(TRANSLATIONS);

/** ISO locale → display name */
export const LOCALE_NAMES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  pt: 'Português',
  ar: 'العربية',
  hi: 'हिन्दी',
};

/** RTL locales */
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);
export function isRTL(locale) {
  return RTL_LOCALES.has(locale);
}

/**
 * Detect best locale from navigator.language.
 * @returns {string}
 */
export function detectLocale() {
  if (typeof navigator === 'undefined') return 'en';
  const nav = navigator.language ?? navigator.userLanguage ?? 'en';
  const code = nav.split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(code) ? code : 'en';
}

/**
 * Translate a key. Falls back to English, then the key itself.
 * @param {string} key
 * @param {string} locale
 * @param {Record<string,string>} [vars] - Template variables {name: 'value'}
 * @returns {string}
 */
export function t(key, locale, vars) {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.en;
  let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return str;
}

/**
 * Build a translator bound to a locale.
 * @param {string} locale
 * @returns {(key: string, vars?: Record<string,string>) => string}
 */
export function makeT(locale) {
  return (key, vars) => t(key, locale, vars);
}

export default TRANSLATIONS;
