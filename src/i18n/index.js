/**
 * src/i18n/index.js
 * Nexus AI Pro — Internationalization & Auto-Translate
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Supported locales: en, es, fr, de, zh, ja, pt, ar, ko, ru, hi, it
 * RTL locales: ar, he, fa, ur
 * Auto-translate: Google Translate API fallback
 */

// ─── Locale registry ──────────────────────────────────────────────────────────

export const LOCALES = [
  { code: 'en',    name: 'English',            nativeName: 'English',            rtl: false, flag: '🇺🇸' },
  { code: 'es',    name: 'Spanish',            nativeName: 'Español',            rtl: false, flag: '🇪🇸' },
  { code: 'fr',    name: 'French',             nativeName: 'Français',           rtl: false, flag: '🇫🇷' },
  { code: 'de',    name: 'German',             nativeName: 'Deutsch',            rtl: false, flag: '🇩🇪' },
  { code: 'zh',    name: 'Chinese (Simplified)', nativeName: '中文',             rtl: false, flag: '🇨🇳' },
  { code: 'ja',    name: 'Japanese',           nativeName: '日本語',             rtl: false, flag: '🇯🇵' },
  { code: 'pt',    name: 'Portuguese',         nativeName: 'Português',          rtl: false, flag: '🇧🇷' },
  { code: 'ar',    name: 'Arabic',             nativeName: 'العربية',            rtl: true,  flag: '🇸🇦' },
  { code: 'ko',    name: 'Korean',             nativeName: '한국어',             rtl: false, flag: '🇰🇷' },
  { code: 'ru',    name: 'Russian',            nativeName: 'Русский',            rtl: false, flag: '🇷🇺' },
  { code: 'hi',    name: 'Hindi',              nativeName: 'हिन्दी',           rtl: false, flag: '🇮🇳' },
  { code: 'it',    name: 'Italian',            nativeName: 'Italiano',           rtl: false, flag: '🇮🇹' },
];

export const RTL_LOCALES = new Set(LOCALES.filter(l => l.rtl).map(l => l.code));

// ─── Base English strings ─────────────────────────────────────────────────────

const en = {
  // Nav
  'nav.dashboard':    'Dashboard',
  'nav.analytics':    'Analytics',
  'nav.security':     'Security',
  'nav.projects':     'Projects',
  'nav.gaming':       'Gaming',
  'nav.payments':     'Payments',
  'nav.settings':     'Settings',
  'nav.logout':       'Logout',

  // Auth
  'auth.login':       'Sign In',
  'auth.register':    'Create Account',
  'auth.email':       'Email address',
  'auth.password':    'Password',
  'auth.username':    'Username',
  'auth.mfa':         'Two-Factor Code',
  'auth.biometric':   'Use Biometric',
  'auth.forgotPw':    'Forgot password?',
  'auth.noAccount':   "Don't have an account?",
  'auth.hasAccount':  'Already have an account?',
  'auth.passwordHint': 'Minimum 13 characters, must include uppercase, lowercase, digit and special character',

  // Dashboard
  'dash.welcome':     'Welcome back',
  'dash.overview':    'Overview',
  'dash.recentActivity': 'Recent Activity',

  // Analytics
  'analytics.title':    'Analytics',
  'analytics.views':    'Views',
  'analytics.likes':    'Likes',
  'analytics.reach':    'Reach',
  'analytics.retention': 'Retention',
  'analytics.followers': 'Followers',
  'analytics.live':     'Live',
  'analytics.paused':   'Paused',

  // Security
  'security.title':    'Security',
  'security.score':    'Security Score',
  'security.scan':     'Run Scan',
  'security.threats':  'Threats Blocked',
  'security.encryption': 'Encryption',

  // Projects
  'projects.new':     'New Project',
  'projects.coding':  'Coding',
  'projects.game':    'Game Dev',
  'projects.arvr':    'AR/VR',
  'projects.threed':  '3D Projects',

  // Payments
  'payments.subscribe': 'Subscribe',
  'payments.free':      'Free',
  'payments.pro':       'Pro',
  'payments.enterprise': 'Enterprise',
  'payments.crypto':    'Pay with Crypto',
  'payments.giftcard':  'Redeem Gift Card',

  // Common
  'common.save':      'Save',
  'common.cancel':    'Cancel',
  'common.delete':    'Delete',
  'common.edit':      'Edit',
  'common.loading':   'Loading…',
  'common.error':     'An error occurred',
  'common.success':   'Success',
  'common.search':    'Search',
  'common.filter':    'Filter',
  'common.refresh':   'Refresh',
};

// Partial translations (production would load these from JSON files or a TMS)
const TRANSLATIONS = {
  en,
  es: {
    'nav.dashboard':    'Panel',
    'nav.analytics':    'Analítica',
    'nav.security':     'Seguridad',
    'nav.projects':     'Proyectos',
    'nav.settings':     'Configuración',
    'nav.logout':       'Cerrar sesión',
    'auth.login':       'Iniciar sesión',
    'auth.register':    'Crear cuenta',
    'common.save':      'Guardar',
    'common.cancel':    'Cancelar',
    'common.loading':   'Cargando…',
    'common.error':     'Ha ocurrido un error',
  },
  fr: {
    'nav.dashboard':    'Tableau de bord',
    'nav.analytics':    'Analytique',
    'nav.security':     'Sécurité',
    'nav.projects':     'Projets',
    'nav.settings':     'Paramètres',
    'nav.logout':       'Se déconnecter',
    'auth.login':       'Se connecter',
    'auth.register':    'Créer un compte',
    'common.save':      'Enregistrer',
    'common.cancel':    'Annuler',
    'common.loading':   'Chargement…',
  },
  de: {
    'nav.dashboard':    'Dashboard',
    'nav.analytics':    'Analytik',
    'nav.security':     'Sicherheit',
    'nav.projects':     'Projekte',
    'nav.settings':     'Einstellungen',
    'auth.login':       'Anmelden',
    'auth.register':    'Konto erstellen',
    'common.save':      'Speichern',
    'common.cancel':    'Abbrechen',
  },
  zh: {
    'nav.dashboard':    '仪表板',
    'nav.analytics':    '分析',
    'nav.security':     '安全',
    'nav.projects':     '项目',
    'nav.settings':     '设置',
    'auth.login':       '登录',
    'auth.register':    '注册账户',
    'common.save':      '保存',
    'common.cancel':    '取消',
  },
  ja: {
    'nav.dashboard':    'ダッシュボード',
    'nav.analytics':    'アナリティクス',
    'nav.security':     'セキュリティ',
    'nav.projects':     'プロジェクト',
    'auth.login':       'ログイン',
    'auth.register':    'アカウント作成',
    'common.save':      '保存',
    'common.cancel':    'キャンセル',
  },
  ar: {
    'nav.dashboard':    'لوحة التحكم',
    'nav.analytics':    'التحليلات',
    'nav.security':     'الأمان',
    'nav.projects':     'المشاريع',
    'auth.login':       'تسجيل الدخول',
    'auth.register':    'إنشاء حساب',
    'common.save':      'حفظ',
    'common.cancel':    'إلغاء',
  },
  ko: {
    'nav.dashboard':    '대시보드',
    'nav.analytics':    '분석',
    'nav.security':     '보안',
    'nav.projects':     '프로젝트',
    'auth.login':       '로그인',
    'auth.register':    '계정 만들기',
  },
  ru: {
    'nav.dashboard':    'Панель управления',
    'nav.analytics':    'Аналитика',
    'nav.security':     'Безопасность',
    'nav.projects':     'Проекты',
    'auth.login':       'Войти',
    'auth.register':    'Создать аккаунт',
    'common.save':      'Сохранить',
    'common.cancel':    'Отмена',
  },
};

// ─── Translation engine ───────────────────────────────────────────────────────

const autoTranslateCache = new Map();

export function t(key, locale = 'en', vars = {}) {
  const map = TRANSLATIONS[locale] || {};
  let str   = map[key] ?? TRANSLATIONS.en[key] ?? key;

  // Variable interpolation: {{varName}}
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{{${k}}}`, String(v));
  }

  return str;
}

export function isRtl(locale) {
  return RTL_LOCALES.has(locale);
}

export async function autoTranslate(text, targetLocale, sourceLocale = 'en') {
  if (targetLocale === sourceLocale) return text;

  const cacheKey = `${sourceLocale}:${targetLocale}:${text}`;
  if (autoTranslateCache.has(cacheKey)) return autoTranslateCache.get(cacheKey);

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return text; // No API key — return original

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLocale, target: targetLocale, format: 'text' }),
      }
    );

    if (!response.ok) return text;
    const data = await response.json();
    const translated = data?.data?.translations?.[0]?.translatedText || text;

    autoTranslateCache.set(cacheKey, translated);
    if (autoTranslateCache.size > 10000) {
      const firstKey = autoTranslateCache.keys().next().value;
      autoTranslateCache.delete(firstKey);
    }

    return translated;
  } catch {
    return text;
  }
}

// ─── Express route handler ────────────────────────────────────────────────────

export function i18nRouter(Router) {
  const router = Router();

  router.get('/locales', (req, res) => {
    res.json({ locales: LOCALES });
  });

  router.get('/translations/:locale', (req, res) => {
    const { locale } = req.params;
    if (!LOCALES.some(l => l.code === locale)) {
      return res.status(404).json({ error: 'Locale not found' });
    }
    const map = { ...(TRANSLATIONS.en || {}), ...(TRANSLATIONS[locale] || {}) };
    res.json({ locale, translations: map, rtl: isRtl(locale) });
  });

  router.post('/translate', async (req, res) => {
    try {
      const { text, targetLocale, sourceLocale = 'en' } = req.body;
      if (!text || !targetLocale) return res.status(400).json({ error: 'text and targetLocale required' });
      const translated = await autoTranslate(text, targetLocale, sourceLocale);
      res.json({ translated, targetLocale, sourceLocale });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
