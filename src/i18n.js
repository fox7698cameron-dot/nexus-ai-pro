/**
 * i18n.js
 * Nexus AI Pro — Internationalization Module
 * Auto-detect language, RTL support, param interpolation, 11 languages
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

// ── Language metadata ─────────────────────────────────────────────────────────
export const supportedLanguages = [
  { code: 'en', name: 'English',    nativeName: 'English',    rtl: false },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',    rtl: false },
  { code: 'fr', name: 'French',     nativeName: 'Français',   rtl: false },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',    rtl: false },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',      rtl: false },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',        rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',  rtl: false },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',    rtl: true  },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',    rtl: false },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',      rtl: false },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',    rtl: false },
];

// ── Translation store ─────────────────────────────────────────────────────────
/** @type {Record<string, Record<string, string>>} */
const translations = {
  en: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'Military-grade AI Platform',
    'nav.home':            'Home',
    'nav.chat':            'Chat',
    'nav.analytics':       'Analytics',
    'nav.security':        'Security',
    'nav.settings':        'Settings',
    'nav.gamedev':         'Game Dev',
    'auth.login':          'Sign In',
    'auth.register':       'Create Account',
    'auth.logout':         'Sign Out',
    'auth.email':          'Email',
    'auth.password':       'Password',
    'auth.username':       'Username',
    'auth.forgot':         'Forgot password?',
    'auth.biometric':      'Use Biometric Login',
    'auth.mfa':            'Two-Factor Authentication',
    'common.save':         'Save',
    'common.cancel':       'Cancel',
    'common.delete':       'Delete',
    'common.edit':         'Edit',
    'common.search':       'Search',
    'common.loading':      'Loading…',
    'common.error':        'An error occurred',
    'common.success':      'Success',
    'common.confirm':      'Confirm',
    'common.back':         'Back',
    'common.export':       'Export',
    'common.refresh':      'Refresh',
    'payment.subscribe':   'Subscribe',
    'payment.plan':        'Plan',
    'payment.upgrade':     'Upgrade',
  },
  es: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'Plataforma de IA de grado militar',
    'nav.home':            'Inicio',
    'nav.chat':            'Chat',
    'nav.analytics':       'Analítica',
    'nav.security':        'Seguridad',
    'nav.settings':        'Configuración',
    'nav.gamedev':         'Dev de Juegos',
    'auth.login':          'Iniciar sesión',
    'auth.register':       'Crear cuenta',
    'auth.logout':         'Cerrar sesión',
    'auth.email':          'Correo electrónico',
    'auth.password':       'Contraseña',
    'auth.username':       'Nombre de usuario',
    'auth.forgot':         '¿Olvidó su contraseña?',
    'auth.biometric':      'Usar inicio biométrico',
    'auth.mfa':            'Autenticación de dos factores',
    'common.save':         'Guardar',
    'common.cancel':       'Cancelar',
    'common.delete':       'Eliminar',
    'common.edit':         'Editar',
    'common.search':       'Buscar',
    'common.loading':      'Cargando…',
    'common.error':        'Ocurrió un error',
    'common.success':      'Éxito',
    'common.confirm':      'Confirmar',
    'common.back':         'Atrás',
    'common.export':       'Exportar',
    'common.refresh':      'Actualizar',
    'payment.subscribe':   'Suscribirse',
    'payment.plan':        'Plan',
    'payment.upgrade':     'Mejorar',
  },
  fr: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'Plateforme IA de grade militaire',
    'nav.home':            'Accueil',
    'nav.chat':            'Chat',
    'nav.analytics':       'Analytique',
    'nav.security':        'Sécurité',
    'nav.settings':        'Paramètres',
    'nav.gamedev':         'Dév. Jeux',
    'auth.login':          'Connexion',
    'auth.register':       'Créer un compte',
    'auth.logout':         'Déconnexion',
    'auth.email':          'E-mail',
    'auth.password':       'Mot de passe',
    'auth.username':       "Nom d'utilisateur",
    'auth.forgot':         'Mot de passe oublié ?',
    'auth.biometric':      'Connexion biométrique',
    'auth.mfa':            'Authentification à deux facteurs',
    'common.save':         'Enregistrer',
    'common.cancel':       'Annuler',
    'common.delete':       'Supprimer',
    'common.edit':         'Modifier',
    'common.search':       'Rechercher',
    'common.loading':      'Chargement…',
    'common.error':        'Une erreur est survenue',
    'common.success':      'Succès',
    'common.confirm':      'Confirmer',
    'common.back':         'Retour',
    'common.export':       'Exporter',
    'common.refresh':      'Actualiser',
    'payment.subscribe':   "S'abonner",
    'payment.plan':        'Plan',
    'payment.upgrade':     'Mettre à niveau',
  },
  de: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'KI-Plattform in Militärqualität',
    'nav.home':            'Startseite',
    'nav.chat':            'Chat',
    'nav.analytics':       'Analytik',
    'nav.security':        'Sicherheit',
    'nav.settings':        'Einstellungen',
    'nav.gamedev':         'Spieleentwicklung',
    'auth.login':          'Anmelden',
    'auth.register':       'Konto erstellen',
    'auth.logout':         'Abmelden',
    'auth.email':          'E-Mail',
    'auth.password':       'Passwort',
    'auth.username':       'Benutzername',
    'auth.forgot':         'Passwort vergessen?',
    'auth.biometric':      'Biometrische Anmeldung',
    'auth.mfa':            'Zwei-Faktor-Authentifizierung',
    'common.save':         'Speichern',
    'common.cancel':       'Abbrechen',
    'common.delete':       'Löschen',
    'common.edit':         'Bearbeiten',
    'common.search':       'Suchen',
    'common.loading':      'Wird geladen…',
    'common.error':        'Ein Fehler ist aufgetreten',
    'common.success':      'Erfolg',
    'common.confirm':      'Bestätigen',
    'common.back':         'Zurück',
    'common.export':       'Exportieren',
    'common.refresh':      'Aktualisieren',
    'payment.subscribe':   'Abonnieren',
    'payment.plan':        'Plan',
    'payment.upgrade':     'Upgraden',
  },
  ja: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         '軍事グレードのAIプラットフォーム',
    'nav.home':            'ホーム',
    'nav.chat':            'チャット',
    'nav.analytics':       '分析',
    'nav.security':        'セキュリティ',
    'nav.settings':        '設定',
    'nav.gamedev':         'ゲーム開発',
    'auth.login':          'サインイン',
    'auth.register':       'アカウント作成',
    'auth.logout':         'サインアウト',
    'auth.email':          'メール',
    'auth.password':       'パスワード',
    'auth.username':       'ユーザー名',
    'auth.forgot':         'パスワードをお忘れですか？',
    'auth.biometric':      '生体認証でログイン',
    'auth.mfa':            '二要素認証',
    'common.save':         '保存',
    'common.cancel':       'キャンセル',
    'common.delete':       '削除',
    'common.edit':         '編集',
    'common.search':       '検索',
    'common.loading':      '読み込み中…',
    'common.error':        'エラーが発生しました',
    'common.success':      '成功',
    'common.confirm':      '確認',
    'common.back':         '戻る',
    'common.export':       'エクスポート',
    'common.refresh':      '更新',
    'payment.subscribe':   '登録する',
    'payment.plan':        'プラン',
    'payment.upgrade':     'アップグレード',
  },
  zh: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         '军事级AI平台',
    'nav.home':            '首页',
    'nav.chat':            '聊天',
    'nav.analytics':       '分析',
    'nav.security':        '安全',
    'nav.settings':        '设置',
    'nav.gamedev':         '游戏开发',
    'auth.login':          '登录',
    'auth.register':       '创建账户',
    'auth.logout':         '退出登录',
    'auth.email':          '邮箱',
    'auth.password':       '密码',
    'auth.username':       '用户名',
    'auth.forgot':         '忘记密码？',
    'auth.biometric':      '使用生物识别登录',
    'auth.mfa':            '双因素认证',
    'common.save':         '保存',
    'common.cancel':       '取消',
    'common.delete':       '删除',
    'common.edit':         '编辑',
    'common.search':       '搜索',
    'common.loading':      '加载中…',
    'common.error':        '发生错误',
    'common.success':      '成功',
    'common.confirm':      '确认',
    'common.back':         '返回',
    'common.export':       '导出',
    'common.refresh':      '刷新',
    'payment.subscribe':   '订阅',
    'payment.plan':        '方案',
    'payment.upgrade':     '升级',
  },
  pt: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'Plataforma de IA de grau militar',
    'nav.home':            'Início',
    'auth.login':          'Entrar',
    'auth.register':       'Criar conta',
    'auth.logout':         'Sair',
    'auth.email':          'E-mail',
    'auth.password':       'Senha',
    'common.save':         'Salvar',
    'common.cancel':       'Cancelar',
    'common.loading':      'Carregando…',
    'common.error':        'Ocorreu um erro',
  },
  ar: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'منصة ذكاء اصطناعي بدرجة عسكرية',
    'nav.home':            'الرئيسية',
    'auth.login':          'تسجيل الدخول',
    'auth.register':       'إنشاء حساب',
    'auth.logout':         'تسجيل الخروج',
    'auth.email':          'البريد الإلكتروني',
    'auth.password':       'كلمة المرور',
    'common.save':         'حفظ',
    'common.cancel':       'إلغاء',
    'common.loading':      'جارٍ التحميل…',
    'common.error':        'حدث خطأ',
  },
  hi: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'सैन्य-ग्रेड AI प्लेटफ़ॉर्म',
    'nav.home':            'होम',
    'auth.login':          'साइन इन करें',
    'auth.register':       'खाता बनाएं',
    'auth.email':          'ईमेल',
    'auth.password':       'पासवर्ड',
    'common.save':         'सहेजें',
    'common.cancel':       'रद्द करें',
    'common.loading':      'लोड हो रहा है…',
    'common.error':        'एक त्रुटि हुई',
  },
  ko: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         '군사 등급 AI 플랫폼',
    'nav.home':            '홈',
    'auth.login':          '로그인',
    'auth.register':       '계정 만들기',
    'auth.email':          '이메일',
    'auth.password':       '비밀번호',
    'common.save':         '저장',
    'common.cancel':       '취소',
    'common.loading':      '로딩 중…',
    'common.error':        '오류가 발생했습니다',
  },
  ru: {
    'app.name':            'Nexus AI Pro',
    'app.tagline':         'AI платформа военного уровня',
    'nav.home':            'Главная',
    'auth.login':          'Войти',
    'auth.register':       'Создать аккаунт',
    'auth.email':          'Эл. почта',
    'auth.password':       'Пароль',
    'common.save':         'Сохранить',
    'common.cancel':       'Отмена',
    'common.loading':      'Загрузка…',
    'common.error':        'Произошла ошибка',
  },
};

// ── State ─────────────────────────────────────────────────────────────────────
let _currentLanguage = 'en';

/** @returns {string} ISO 639-1 code */
function detectBrowserLanguage() {
  try {
    const lang = navigator.language || navigator.languages?.[0] || 'en';
    const code = lang.split('-')[0].toLowerCase();
    return supportedLanguages.find(l => l.code === code) ? code : 'en';
  } catch { return 'en'; }
}

// Auto-detect on load
if (typeof navigator !== 'undefined') {
  _currentLanguage = detectBrowserLanguage();
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Translate a key with optional parameter interpolation.
 * Usage: t('common.loading') → 'Loading…'
 *        t('greeting', { name: 'Cameron' }) → string with {{name}} replaced
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  const langMap = translations[_currentLanguage] ?? {};
  const fallback = translations.en ?? {};
  let str = langMap[key] ?? fallback[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }
  return str;
}

/**
 * @param {string} code ISO 639-1 language code
 */
export function setLanguage(code) {
  if (!supportedLanguages.find(l => l.code === code)) {
    console.warn(`[i18n] Unknown language: ${code}, falling back to 'en'`);
    _currentLanguage = 'en';
    return;
  }
  _currentLanguage = code;
  // Apply RTL to document if in browser
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
  }
}

/** @returns {string} */
export function currentLanguage() { return _currentLanguage; }

/** @returns {boolean} */
export function isRTL() {
  return supportedLanguages.find(l => l.code === _currentLanguage)?.rtl ?? false;
}

/** Auto-translate placeholder — in production swap for DeepL/Google Translate API */
export async function autoTranslate(text, targetLang) {
  // TODO: call /api/translate?text=...&target=targetLang (backed by Google/DeepL)
  // Never call translation APIs with a hardcoded key; use process.env.TRANSLATE_API_KEY server-side
  return text;
}
