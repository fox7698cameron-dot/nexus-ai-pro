// File: i18nConfig.js | Created: 2026-08-31 | Nexus AI Pro

// ---------------------------------------------------------------------------
// Supported languages and RTL metadata
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ko', 'it', 'ru', 'hi'];
export const RTL_LANGUAGES = ['ar'];

// ---------------------------------------------------------------------------
// Translation map
// Each language has three namespaces: common, auth, dashboard
// ---------------------------------------------------------------------------

export const translations = {
  en: {
    common: {
      save: 'Save', cancel: 'Cancel', login: 'Log In', logout: 'Log Out',
      settings: 'Settings', dashboard: 'Dashboard', analytics: 'Analytics',
      security: 'Security', projects: 'Projects', payments: 'Payments',
    },
    auth: {
      login: 'Log In', register: 'Register', password: 'Password',
      username: 'Username', email: 'Email', biometric: 'Biometric Login',
      twoFactor: 'Two-Factor Authentication',
    },
    dashboard: {
      overview: 'Overview', users: 'Users', revenue: 'Revenue', activity: 'Activity',
    },
  },

  es: {
    common: {
      save: 'Guardar', cancel: 'Cancelar', login: 'Iniciar sesión', logout: 'Cerrar sesión',
      settings: 'Configuración', dashboard: 'Panel', analytics: 'Analíticas',
      security: 'Seguridad', projects: 'Proyectos', payments: 'Pagos',
    },
    auth: {
      login: 'Iniciar sesión', register: 'Registrarse', password: 'Contraseña',
      username: 'Usuario', email: 'Correo electrónico', biometric: 'Inicio biométrico',
      twoFactor: 'Autenticación de dos factores',
    },
    dashboard: {
      overview: 'Resumen', users: 'Usuarios', revenue: 'Ingresos', activity: 'Actividad',
    },
  },

  fr: {
    common: {
      save: 'Enregistrer', cancel: 'Annuler', login: 'Se connecter', logout: 'Se déconnecter',
      settings: 'Paramètres', dashboard: 'Tableau de bord', analytics: 'Analytique',
      security: 'Sécurité', projects: 'Projets', payments: 'Paiements',
    },
    auth: {
      login: 'Se connecter', register: "S'inscrire", password: 'Mot de passe',
      username: "Nom d'utilisateur", email: 'E-mail', biometric: 'Connexion biométrique',
      twoFactor: 'Authentification à deux facteurs',
    },
    dashboard: {
      overview: 'Aperçu', users: 'Utilisateurs', revenue: 'Revenus', activity: 'Activité',
    },
  },

  de: {
    common: {
      save: 'Speichern', cancel: 'Abbrechen', login: 'Anmelden', logout: 'Abmelden',
      settings: 'Einstellungen', dashboard: 'Dashboard', analytics: 'Analytik',
      security: 'Sicherheit', projects: 'Projekte', payments: 'Zahlungen',
    },
    auth: {
      login: 'Anmelden', register: 'Registrieren', password: 'Passwort',
      username: 'Benutzername', email: 'E-Mail', biometric: 'Biometrische Anmeldung',
      twoFactor: 'Zwei-Faktor-Authentifizierung',
    },
    dashboard: {
      overview: 'Überblick', users: 'Benutzer', revenue: 'Einnahmen', activity: 'Aktivität',
    },
  },

  ja: {
    common: {
      save: '保存', cancel: 'キャンセル', login: 'ログイン', logout: 'ログアウト',
      settings: '設定', dashboard: 'ダッシュボード', analytics: '分析',
      security: 'セキュリティ', projects: 'プロジェクト', payments: '支払い',
    },
    auth: {
      login: 'ログイン', register: '登録', password: 'パスワード',
      username: 'ユーザー名', email: 'メール', biometric: '生体認証ログイン',
      twoFactor: '二要素認証',
    },
    dashboard: {
      overview: '概要', users: 'ユーザー', revenue: '収益', activity: 'アクティビティ',
    },
  },

  zh: {
    common: {
      save: '保存', cancel: '取消', login: '登录', logout: '退出',
      settings: '设置', dashboard: '仪表盘', analytics: '分析',
      security: '安全', projects: '项目', payments: '支付',
    },
    auth: {
      login: '登录', register: '注册', password: '密码',
      username: '用户名', email: '电子邮件', biometric: '生物识别登录',
      twoFactor: '双因素认证',
    },
    dashboard: {
      overview: '概览', users: '用户', revenue: '收入', activity: '活动',
    },
  },

  ar: {
    common: {
      save: 'حفظ', cancel: 'إلغاء', login: 'تسجيل الدخول', logout: 'تسجيل الخروج',
      settings: 'الإعدادات', dashboard: 'لوحة التحكم', analytics: 'التحليلات',
      security: 'الأمان', projects: 'المشاريع', payments: 'المدفوعات',
    },
    auth: {
      login: 'تسجيل الدخول', register: 'تسجيل', password: 'كلمة المرور',
      username: 'اسم المستخدم', email: 'البريد الإلكتروني',
      biometric: 'تسجيل الدخول البيومتري', twoFactor: 'المصادقة الثنائية',
    },
    dashboard: {
      overview: 'نظرة عامة', users: 'المستخدمون', revenue: 'الإيرادات', activity: 'النشاط',
    },
  },

  pt: {
    common: {
      save: 'Salvar', cancel: 'Cancelar', login: 'Entrar', logout: 'Sair',
      settings: 'Configurações', dashboard: 'Painel', analytics: 'Análises',
      security: 'Segurança', projects: 'Projetos', payments: 'Pagamentos',
    },
    auth: {
      login: 'Entrar', register: 'Registrar', password: 'Senha',
      username: 'Nome de usuário', email: 'E-mail', biometric: 'Login biométrico',
      twoFactor: 'Autenticação de dois fatores',
    },
    dashboard: {
      overview: 'Visão geral', users: 'Usuários', revenue: 'Receita', activity: 'Atividade',
    },
  },

  ko: {
    common: {
      save: '저장', cancel: '취소', login: '로그인', logout: '로그아웃',
      settings: '설정', dashboard: '대시보드', analytics: '분석',
      security: '보안', projects: '프로젝트', payments: '결제',
    },
    auth: {
      login: '로그인', register: '등록', password: '비밀번호',
      username: '사용자 이름', email: '이메일', biometric: '생체 인식 로그인',
      twoFactor: '이중 인증',
    },
    dashboard: {
      overview: '개요', users: '사용자', revenue: '수익', activity: '활동',
    },
  },

  it: {
    common: {
      save: 'Salva', cancel: 'Annulla', login: 'Accedi', logout: 'Esci',
      settings: 'Impostazioni', dashboard: 'Dashboard', analytics: 'Analitiche',
      security: 'Sicurezza', projects: 'Progetti', payments: 'Pagamenti',
    },
    auth: {
      login: 'Accedi', register: 'Registrati', password: 'Password',
      username: 'Nome utente', email: 'E-mail', biometric: 'Accesso biometrico',
      twoFactor: 'Autenticazione a due fattori',
    },
    dashboard: {
      overview: 'Panoramica', users: 'Utenti', revenue: 'Ricavi', activity: 'Attività',
    },
  },

  ru: {
    common: {
      save: 'Сохранить', cancel: 'Отмена', login: 'Войти', logout: 'Выйти',
      settings: 'Настройки', dashboard: 'Панель', analytics: 'Аналитика',
      security: 'Безопасность', projects: 'Проекты', payments: 'Платежи',
    },
    auth: {
      login: 'Войти', register: 'Зарегистрироваться', password: 'Пароль',
      username: 'Имя пользователя', email: 'Эл. почта',
      biometric: 'Биометрический вход', twoFactor: 'Двухфакторная аутентификация',
    },
    dashboard: {
      overview: 'Обзор', users: 'Пользователи', revenue: 'Доход', activity: 'Активность',
    },
  },

  hi: {
    common: {
      save: 'सहेजें', cancel: 'रद्द करें', login: 'लॉग इन', logout: 'लॉग आउट',
      settings: 'सेटिंग्स', dashboard: 'डैशबोर्ड', analytics: 'विश्लेषण',
      security: 'सुरक्षा', projects: 'परियोजनाएं', payments: 'भुगतान',
    },
    auth: {
      login: 'लॉग इन', register: 'पंजीकरण', password: 'पासवर्ड',
      username: 'उपयोगकर्ता नाम', email: 'ईमेल',
      biometric: 'बायोमेट्रिक लॉगिन', twoFactor: 'दो-कारक प्रमाणीकरण',
    },
    dashboard: {
      overview: 'अवलोकन', users: 'उपयोगकर्ता', revenue: 'राजस्व', activity: 'गतिविधि',
    },
  },
};

// ---------------------------------------------------------------------------
// detectLanguage
// Resolves preference from: explicit arg → navigator.language → Accept-Language
// header string → fallback 'en'.
// ---------------------------------------------------------------------------

export function detectLanguage(headerOrNavigator = null) {
  const candidates = [];

  if (headerOrNavigator && typeof headerOrNavigator === 'string') {
    // Parse Accept-Language header: "fr-FR,fr;q=0.9,en;q=0.8"
    headerOrNavigator.split(',').forEach((part) => {
      const tag = part.trim().split(';')[0].trim().toLowerCase().slice(0, 2);
      if (tag) candidates.push(tag);
    });
  } else if (typeof navigator !== 'undefined' && navigator.language) {
    candidates.push(navigator.language.slice(0, 2).toLowerCase());
    (navigator.languages || []).forEach((l) => candidates.push(l.slice(0, 2).toLowerCase()));
  }

  for (const lang of candidates) {
    if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
  }
  return 'en';
}

// ---------------------------------------------------------------------------
// translate
// Resolves a dot-separated key like "common.save" against the given language,
// falling back to English, then to the raw key.
// ---------------------------------------------------------------------------

export function translate(key, lang = 'en') {
  const resolvedLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
  const [namespace, subkey] = key.split('.');

  const value =
    translations[resolvedLang]?.[namespace]?.[subkey] ??
    translations['en']?.[namespace]?.[subkey] ??
    key;

  return value;
}

// ---------------------------------------------------------------------------
// autoTranslate (async)
// Calls the internal /api/translate endpoint; never sends data to third-party
// services directly. Returns translated text or the original on failure.
// ---------------------------------------------------------------------------

export async function autoTranslate(text, targetLang = 'en') {
  if (!text || typeof text !== 'string') return text;
  if (!SUPPORTED_LANGUAGES.includes(targetLang)) targetLang = 'en';

  const endpoint = (typeof process !== 'undefined' && process.env?.TRANSLATE_API_URL)
    ? process.env.TRANSLATE_API_URL
    : '/api/translate';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });

    if (!res.ok) throw new Error(`Translate API responded ${res.status}`);
    const data = await res.json();
    return data?.translated ?? text;
  } catch {
    // Graceful degradation: return original text
    return text;
  }
}

// ---------------------------------------------------------------------------
// RTL helper — used by the UI to set dir="rtl" on the document root
// ---------------------------------------------------------------------------

export function isRTL(lang) {
  return RTL_LANGUAGES.includes(lang);
}

export default { translations, detectLanguage, translate, autoTranslate, SUPPORTED_LANGUAGES, RTL_LANGUAGES, isRTL };
