/**
 * src/i18n.js
 * Multi-language & regional support with auto-translate fallback
 * Created: 2026-10-28
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    dir: 'ltr', region: 'US' },
  { code: 'es', name: 'Español',    dir: 'ltr', region: 'ES' },
  { code: 'fr', name: 'Français',   dir: 'ltr', region: 'FR' },
  { code: 'de', name: 'Deutsch',    dir: 'ltr', region: 'DE' },
  { code: 'ja', name: '日本語',      dir: 'ltr', region: 'JP' },
  { code: 'zh', name: '中文',        dir: 'ltr', region: 'CN' },
  { code: 'ar', name: 'العربية',    dir: 'rtl', region: 'SA' },
  { code: 'pt', name: 'Português',  dir: 'ltr', region: 'BR' },
  { code: 'ko', name: '한국어',      dir: 'ltr', region: 'KR' },
  { code: 'ru', name: 'Русский',    dir: 'ltr', region: 'RU' },
  { code: 'hi', name: 'हिन्दी',     dir: 'ltr', region: 'IN' },
  { code: 'it', name: 'Italiano',   dir: 'ltr', region: 'IT' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', region: 'NL' },
  { code: 'tr', name: 'Türkçe',     dir: 'ltr', region: 'TR' },
  { code: 'pl', name: 'Polski',     dir: 'ltr', region: 'PL' },
  { code: 'sv', name: 'Svenska',    dir: 'ltr', region: 'SE' },
];

// ─── Base translations (English) ──────────────────────────────────────────────
const BASE = {
  // Auth
  'auth.signin':           'Sign In',
  'auth.register':         'Create Account',
  'auth.password':         'Password',
  'auth.username':         'Username',
  'auth.email':            'Email',
  'auth.mfa':              'Two-Factor Authentication',
  'auth.biometric':        'Sign in with Biometrics',
  'auth.signout':          'Sign Out',
  // Dashboard
  'dashboard.analytics':   'Analytics Dashboard',
  'dashboard.security':    'Security Dashboard',
  'dashboard.gamedev':     'Game Dev Tracker',
  'dashboard.payments':    'Subscription & Billing',
  // Common
  'common.loading':        'Loading…',
  'common.refresh':        'Refresh',
  'common.save':           'Save',
  'common.cancel':         'Cancel',
  'common.delete':         'Delete',
  'common.edit':           'Edit',
  'common.new':            'New',
  'common.search':         'Search',
  'common.settings':       'Settings',
  'common.back':           'Back',
  'common.connect':        'Connect',
  'common.disconnect':     'Disconnect',
  'common.error':          'An error occurred',
  'common.success':        'Success',
  // Security
  'security.scan':         'Run Full Scan',
  'security.scanning':     'Scanning…',
  'security.patch':        'Auto-patch',
  'security.score':        'Security Score',
  'security.critical':     'Critical',
  'security.high':         'High',
  'security.medium':       'Medium',
  'security.low':          'Low',
  // Payments
  'payment.subscribe':     'Subscribe',
  'payment.plan.starter':  'Starter',
  'payment.plan.pro':      'Pro',
  'payment.plan.enterprise': 'Enterprise',
  'payment.success':       'Payment Successful!',
};

// ─── Partial translations ─────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: BASE,
  es: {
    'auth.signin':       'Iniciar Sesión',
    'auth.register':     'Crear Cuenta',
    'auth.password':     'Contraseña',
    'auth.username':     'Nombre de usuario',
    'auth.email':        'Correo electrónico',
    'common.loading':    'Cargando…',
    'common.save':       'Guardar',
    'common.cancel':     'Cancelar',
    'common.settings':   'Configuración',
    'security.scan':     'Ejecutar análisis completo',
    'payment.success':   '¡Pago exitoso!',
  },
  fr: {
    'auth.signin':       'Se connecter',
    'auth.register':     'Créer un compte',
    'auth.password':     'Mot de passe',
    'common.loading':    'Chargement…',
    'common.save':       'Enregistrer',
    'common.cancel':     'Annuler',
    'security.scan':     'Lancer une analyse complète',
    'payment.success':   'Paiement réussi !',
  },
  de: {
    'auth.signin':       'Anmelden',
    'auth.register':     'Konto erstellen',
    'auth.password':     'Passwort',
    'common.loading':    'Laden…',
    'common.save':       'Speichern',
    'common.cancel':     'Abbrechen',
    'payment.success':   'Zahlung erfolgreich!',
  },
  ja: {
    'auth.signin':       'ログイン',
    'auth.register':     'アカウント作成',
    'auth.password':     'パスワード',
    'common.loading':    '読み込み中…',
    'payment.success':   '支払いが完了しました！',
  },
  zh: {
    'auth.signin':       '登录',
    'auth.register':     '创建账户',
    'auth.password':     '密码',
    'common.loading':    '加载中…',
    'payment.success':   '支付成功！',
  },
  ar: {
    'auth.signin':       'تسجيل الدخول',
    'auth.register':     'إنشاء حساب',
    'auth.password':     'كلمة المرور',
    'common.loading':    'جارٍ التحميل…',
    'payment.success':   'تمت عملية الدفع بنجاح!',
  },
  pt: {
    'auth.signin':       'Entrar',
    'auth.register':     'Criar conta',
    'auth.password':     'Senha',
    'common.loading':    'Carregando…',
    'payment.success':   'Pagamento bem-sucedido!',
  },
  ko: {
    'auth.signin':       '로그인',
    'auth.register':     '계정 만들기',
    'auth.password':     '비밀번호',
    'common.loading':    '로딩 중…',
    'payment.success':   '결제가 완료되었습니다!',
  },
  ru: {
    'auth.signin':       'Войти',
    'auth.register':     'Создать аккаунт',
    'auth.password':     'Пароль',
    'common.loading':    'Загрузка…',
    'payment.success':   'Оплата прошла успешно!',
  },
};

// ─── Auto-translate via server endpoint ───────────────────────────────────────
const translationCache = new Map();

async function autoTranslate(text, targetLang) {
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  try {
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target: targetLang, source: 'en' }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const { translated } = await res.json();
      translationCache.set(cacheKey, translated);
      return translated;
    }
  } catch { /* ignore, fall back to English */ }
  return text;
}

// ─── i18n class ──────────────────────────────────────────────────────────────
class I18n {
  constructor() {
    this.lang = this._detectLanguage();
    this.dict = TRANSLATIONS[this.lang] || {};
    this.base = BASE;
  }

  _detectLanguage() {
    // 1. User preference stored in localStorage
    try {
      const stored = localStorage.getItem('nexus:lang');
      if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) return stored;
    } catch { /* ignore */ }
    // 2. Browser language
    const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) return browserLang;
    return 'en';
  }

  setLanguage(code) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!lang) return;
    this.lang = code;
    this.dict = TRANSLATIONS[code] || {};
    try { localStorage.setItem('nexus:lang', code); } catch { /* ignore */ }
    // Apply RTL/LTR to document
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = code;
    return lang;
  }

  t(key, fallback) {
    return this.dict[key] || this.base[key] || fallback || key;
  }

  async tAsync(key, fallback) {
    const base = this.t(key, fallback);
    if (this.lang === 'en' || this.dict[key]) return base;
    // Auto-translate missing keys
    return autoTranslate(base, this.lang);
  }

  get currentLang() {
    return SUPPORTED_LANGUAGES.find(l => l.code === this.lang) || SUPPORTED_LANGUAGES[0];
  }

  get isRTL() {
    return this.currentLang.dir === 'rtl';
  }
}

export const i18n = new I18n();
export default i18n;

// ─── React hook ───────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

export function useI18n() {
  const [lang, setLangState] = useState(i18n.lang);

  const setLang = useCallback((code) => {
    i18n.setLanguage(code);
    setLangState(code);
  }, []);

  const t = useCallback((key, fallback) => i18n.t(key, fallback), [lang]);

  return { t, lang, setLang, isRTL: i18n.isRTL, currentLang: i18n.currentLang, languages: SUPPORTED_LANGUAGES };
}
