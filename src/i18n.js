// i18n.js | Nexus AI Pro | Created: 2026-10-15 | Internationalization

// ============================================
// SUPPORTED LANGUAGES
// ============================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'pt', name: 'Português', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' }
];

// ============================================
// TRANSLATION KEYS (~30 common UI keys)
// ============================================

/** @type {Record<string, Record<string, string>>} */
const translations = {
  // ---- Authentication ----
  login: {
    en: 'Login', es: 'Iniciar sesión', fr: 'Connexion', de: 'Anmelden',
    ja: 'ログイン', zh: '登录', ar: 'تسجيل الدخول', pt: 'Entrar',
    hi: 'लॉगिन', ko: '로그인'
  },
  logout: {
    en: 'Logout', es: 'Cerrar sesión', fr: 'Déconnexion', de: 'Abmelden',
    ja: 'ログアウト', zh: '退出', ar: 'تسجيل الخروج', pt: 'Sair',
    hi: 'लॉगआउट', ko: '로그아웃'
  },
  register: {
    en: 'Register', es: 'Registrarse', fr: "S'inscrire", de: 'Registrieren',
    ja: '登録', zh: '注册', ar: 'التسجيل', pt: 'Cadastrar',
    hi: 'पंजीकरण', ko: '회원가입'
  },
  email: {
    en: 'Email', es: 'Correo electrónico', fr: 'E-mail', de: 'E-Mail',
    ja: 'メール', zh: '邮箱', ar: 'البريد الإلكتروني', pt: 'E-mail',
    hi: 'ईमेल', ko: '이메일'
  },
  password: {
    en: 'Password', es: 'Contraseña', fr: 'Mot de passe', de: 'Passwort',
    ja: 'パスワード', zh: '密码', ar: 'كلمة المرور', pt: 'Senha',
    hi: 'पासवर्ड', ko: '비밀번호'
  },

  // ---- Navigation ----
  settings: {
    en: 'Settings', es: 'Configuración', fr: 'Paramètres', de: 'Einstellungen',
    ja: '設定', zh: '设置', ar: 'الإعدادات', pt: 'Configurações',
    hi: 'सेटिंग', ko: '설정'
  },
  dashboard: {
    en: 'Dashboard', es: 'Panel', fr: 'Tableau de bord', de: 'Dashboard',
    ja: 'ダッシュボード', zh: '仪表板', ar: 'لوحة التحكم', pt: 'Painel',
    hi: 'डैशबोर्ड', ko: '대시보드'
  },
  home: {
    en: 'Home', es: 'Inicio', fr: 'Accueil', de: 'Startseite',
    ja: 'ホーム', zh: '首页', ar: 'الرئيسية', pt: 'Início',
    hi: 'होम', ko: '홈'
  },
  profile: {
    en: 'Profile', es: 'Perfil', fr: 'Profil', de: 'Profil',
    ja: 'プロフィール', zh: '个人资料', ar: 'الملف الشخصي', pt: 'Perfil',
    hi: 'प्रोफ़ाइल', ko: '프로필'
  },

  // ---- Features ----
  analytics: {
    en: 'Analytics', es: 'Analíticas', fr: 'Analytique', de: 'Analytik',
    ja: 'アナリティクス', zh: '分析', ar: 'التحليلات', pt: 'Análise',
    hi: 'विश्लेषण', ko: '분석'
  },
  security: {
    en: 'Security', es: 'Seguridad', fr: 'Sécurité', de: 'Sicherheit',
    ja: 'セキュリティ', zh: '安全', ar: 'الأمان', pt: 'Segurança',
    hi: 'सुरक्षा', ko: '보안'
  },
  payments: {
    en: 'Payments', es: 'Pagos', fr: 'Paiements', de: 'Zahlungen',
    ja: 'お支払い', zh: '支付', ar: 'المدفوعات', pt: 'Pagamentos',
    hi: 'भुगतान', ko: '결제'
  },
  projects: {
    en: 'Projects', es: 'Proyectos', fr: 'Projets', de: 'Projekte',
    ja: 'プロジェクト', zh: '项目', ar: 'المشاريع', pt: 'Projetos',
    hi: 'प्रोजेक्ट', ko: '프로젝트'
  },
  admin: {
    en: 'Admin', es: 'Administrador', fr: 'Admin', de: 'Administrator',
    ja: '管理者', zh: '管理员', ar: 'المشرف', pt: 'Admin',
    hi: 'एडमिन', ko: '관리자'
  },

  // ---- Actions ----
  save: {
    en: 'Save', es: 'Guardar', fr: 'Enregistrer', de: 'Speichern',
    ja: '保存', zh: '保存', ar: 'حفظ', pt: 'Salvar',
    hi: 'सहेजें', ko: '저장'
  },
  cancel: {
    en: 'Cancel', es: 'Cancelar', fr: 'Annuler', de: 'Abbrechen',
    ja: 'キャンセル', zh: '取消', ar: 'إلغاء', pt: 'Cancelar',
    hi: 'रद्द करें', ko: '취소'
  },
  delete: {
    en: 'Delete', es: 'Eliminar', fr: 'Supprimer', de: 'Löschen',
    ja: '削除', zh: '删除', ar: 'حذف', pt: 'Excluir',
    hi: 'हटाएं', ko: '삭제'
  },
  export: {
    en: 'Export', es: 'Exportar', fr: 'Exporter', de: 'Exportieren',
    ja: 'エクスポート', zh: '导出', ar: 'تصدير', pt: 'Exportar',
    hi: 'निर्यात', ko: '내보내기'
  },
  search: {
    en: 'Search', es: 'Buscar', fr: 'Rechercher', de: 'Suchen',
    ja: '検索', zh: '搜索', ar: 'بحث', pt: 'Pesquisar',
    hi: 'खोजें', ko: '검색'
  },
  upload: {
    en: 'Upload', es: 'Cargar', fr: 'Télécharger', de: 'Hochladen',
    ja: 'アップロード', zh: '上传', ar: 'رفع', pt: 'Enviar',
    hi: 'अपलोड', ko: '업로드'
  },

  // ---- Status / Feedback ----
  loading: {
    en: 'Loading…', es: 'Cargando…', fr: 'Chargement…', de: 'Laden…',
    ja: '読み込み中…', zh: '加载中…', ar: '…جارٍ التحميل', pt: 'Carregando…',
    hi: 'लोड हो रहा है…', ko: '로딩 중…'
  },
  error: {
    en: 'Error', es: 'Error', fr: 'Erreur', de: 'Fehler',
    ja: 'エラー', zh: '错误', ar: 'خطأ', pt: 'Erro',
    hi: 'त्रुटि', ko: '오류'
  },
  success: {
    en: 'Success', es: 'Éxito', fr: 'Succès', de: 'Erfolg',
    ja: '成功', zh: '成功', ar: 'نجاح', pt: 'Sucesso',
    hi: 'सफलता', ko: '성공'
  },
  warning: {
    en: 'Warning', es: 'Advertencia', fr: 'Avertissement', de: 'Warnung',
    ja: '警告', zh: '警告', ar: 'تحذير', pt: 'Aviso',
    hi: 'चेतावनी', ko: '경고'
  },

  // ---- Subscription ----
  subscribe: {
    en: 'Subscribe', es: 'Suscribirse', fr: "S'abonner", de: 'Abonnieren',
    ja: 'サブスクライブ', zh: '订阅', ar: 'اشترك', pt: 'Assinar',
    hi: 'सब्सक्राइब', ko: '구독'
  },
  upgrade: {
    en: 'Upgrade', es: 'Actualizar', fr: 'Mettre à niveau', de: 'Upgrade',
    ja: 'アップグレード', zh: '升级', ar: 'ترقية', pt: 'Atualizar',
    hi: 'अपग्रेड', ko: '업그레이드'
  },
  free_plan: {
    en: 'Free Plan', es: 'Plan Gratuito', fr: 'Plan Gratuit', de: 'Kostenloser Plan',
    ja: '無料プラン', zh: '免费方案', ar: 'الخطة المجانية', pt: 'Plano Gratuito',
    hi: 'मुफ्त प्लान', ko: '무료 플랜'
  },
  pro_plan: {
    en: 'Pro Plan', es: 'Plan Pro', fr: 'Plan Pro', de: 'Pro-Plan',
    ja: 'プロプラン', zh: '专业版', ar: 'الخطة الاحترافية', pt: 'Plano Pro',
    hi: 'प्रो प्लान', ko: '프로 플랜'
  },

  // ---- Misc ----
  language: {
    en: 'Language', es: 'Idioma', fr: 'Langue', de: 'Sprache',
    ja: '言語', zh: '语言', ar: 'اللغة', pt: 'Idioma',
    hi: 'भाषा', ko: '언어'
  },
  theme: {
    en: 'Theme', es: 'Tema', fr: 'Thème', de: 'Thema',
    ja: 'テーマ', zh: '主题', ar: 'السمة', pt: 'Tema',
    hi: 'थीम', ko: '테마'
  },
  darkMode: {
    en: 'Dark Mode', es: 'Modo oscuro', fr: 'Mode sombre', de: 'Dunkelmodus',
    ja: 'ダークモード', zh: '深色模式', ar: 'الوضع المظلم', pt: 'Modo Escuro',
    hi: 'डार्क मोड', ko: '다크 모드'
  }
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Translate a key into the given language, falling back to English.
 * @param {string} key - Translation key (e.g. 'login', 'settings')
 * @param {string} [lang='en'] - BCP 47 language code (e.g. 'es', 'ja')
 * @returns {string}
 */
export function t(key, lang = 'en') {
  const entry = translations[key];
  if (!entry) return key;
  const normalizedLang = lang.split('-')[0].toLowerCase();
  return entry[normalizedLang] || entry['en'] || key;
}

/**
 * Detect the user's preferred language from navigator.language.
 * Returns a supported language code, or 'en' as fallback.
 * @returns {string}
 */
export function detectLanguage() {
  try {
    if (typeof navigator === 'undefined') return 'en';
    const browserLang = (navigator.language || navigator.userLanguage || 'en')
      .split('-')[0]
      .toLowerCase();
    const supported = SUPPORTED_LANGUAGES.map(l => l.code);
    return supported.includes(browserLang) ? browserLang : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Auto-translate arbitrary text to a target language via the server API.
 * This is a stub that calls /api/translate; handle the response in your component.
 * @param {string} text - Source text to translate
 * @param {string} targetLang - Target language code (e.g. 'es')
 * @param {string} [sourceLang='en'] - Source language code
 * @returns {Promise<string>} Translated text, or original on failure
 */
export async function autoTranslate(text, targetLang, sourceLang = 'en') {
  if (!text || targetLang === sourceLang) return text;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang })
    });

    if (!response.ok) {
      throw new Error(`Translation API responded with ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (err) {
    // Gracefully fall back to original text on network / API errors
    console.warn('[i18n] autoTranslate failed:', err.message);
    return text;
  }
}

/**
 * Returns all translation keys available in the dictionary.
 * @returns {string[]}
 */
export function getTranslationKeys() {
  return Object.keys(translations);
}

/**
 * Returns the language metadata for a given code.
 * @param {string} code
 * @returns {{ code: string, name: string, dir: string } | undefined}
 */
export function getLanguageInfo(code) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}
