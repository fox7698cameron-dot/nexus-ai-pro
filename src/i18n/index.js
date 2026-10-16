/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * src/i18n/index.js
 * Updated: 2026-10-16
 * Multi-language & regional support with auto-translate fallback
 */

// ── Supported locales ─────────────────────────────────────────────────────────
export const SUPPORTED_LOCALES = {
  en:    { label: 'English',    dir: 'ltr', region: 'US' },
  es:    { label: 'Español',    dir: 'ltr', region: 'ES' },
  fr:    { label: 'Français',   dir: 'ltr', region: 'FR' },
  de:    { label: 'Deutsch',    dir: 'ltr', region: 'DE' },
  pt:    { label: 'Português',  dir: 'ltr', region: 'PT' },
  it:    { label: 'Italiano',   dir: 'ltr', region: 'IT' },
  ru:    { label: 'Русский',    dir: 'ltr', region: 'RU' },
  zh:    { label: '中文(简)',    dir: 'ltr', region: 'CN' },
  'zh-tw':{ label: '中文(繁)',  dir: 'ltr', region: 'TW' },
  ja:    { label: '日本語',     dir: 'ltr', region: 'JP' },
  ko:    { label: '한국어',     dir: 'ltr', region: 'KR' },
  ar:    { label: 'العربية',    dir: 'rtl', region: 'SA' },
  he:    { label: 'עברית',      dir: 'rtl', region: 'IL' },
  hi:    { label: 'हिन्दी',    dir: 'ltr', region: 'IN' },
  tr:    { label: 'Türkçe',     dir: 'ltr', region: 'TR' },
  pl:    { label: 'Polski',     dir: 'ltr', region: 'PL' },
  nl:    { label: 'Nederlands', dir: 'ltr', region: 'NL' },
  sv:    { label: 'Svenska',    dir: 'ltr', region: 'SE' },
  da:    { label: 'Dansk',      dir: 'ltr', region: 'DK' },
  fi:    { label: 'Suomi',      dir: 'ltr', region: 'FI' },
};

// ── Base translations (English) ───────────────────────────────────────────────
const EN = {
  // Auth
  'auth.login':           'Sign In',
  'auth.register':        'Create Account',
  'auth.logout':          'Sign Out',
  'auth.email':           'Email',
  'auth.password':        'Password',
  'auth.username':        'Username',
  'auth.confirm_password':'Confirm Password',
  'auth.biometric':       'Biometric Login',
  'auth.mfa_code':        'Authentication Code',
  'auth.forgot_password': 'Forgot password?',

  // Validation
  'val.required':         'This field is required',
  'val.email_invalid':    'Please enter a valid email address',
  'val.password_min':     'Password must be at least 13 characters',
  'val.password_upper':   'Include at least one uppercase letter',
  'val.password_lower':   'Include at least one lowercase letter',
  'val.password_number':  'Include at least one number',
  'val.password_special': 'Include at least one special character',
  'val.passwords_match':  'Passwords do not match',

  // Navigation
  'nav.dashboard':        'Dashboard',
  'nav.analytics':        'Analytics',
  'nav.security':         'Security',
  'nav.projects':         'Projects',
  'nav.settings':         'Settings',
  'nav.billing':          'Billing',

  // Actions
  'action.save':          'Save',
  'action.cancel':        'Cancel',
  'action.delete':        'Delete',
  'action.edit':          'Edit',
  'action.refresh':       'Refresh',
  'action.connect':       'Connect',
  'action.disconnect':    'Disconnect',
  'action.confirm':       'Confirm',

  // Status
  'status.active':        'Active',
  'status.paused':        'Paused',
  'status.shipped':       'Shipped',
  'status.in_review':     'In Review',
  'status.loading':       'Loading...',
  'status.error':         'Something went wrong',
  'status.success':       'Success',

  // Payment
  'pay.checkout':         'Checkout',
  'pay.plan':             'Plan',
  'pay.card':             'Credit / Debit Card',
  'pay.crypto':           'Cryptocurrency',
  'pay.gift':             'Gift Card',
  'pay.secure':           'Secured by Stripe · PCI DSS Level 1',
  'pay.success':          'Payment Successful!',

  // Security
  'sec.scan':             'Run Scan',
  'sec.threat_detected':  'Threat Detected',
  'sec.score':            'Security Score',
  'sec.encryption':       'Encryption Status',
  'sec.audit_log':        'Audit Log',
  'sec.network':          'Network Monitor',

  // Analytics
  'analytics.followers':  'Followers',
  'analytics.views':      'Views',
  'analytics.reach':      'Reach',
  'analytics.engagement': 'Engagement',
  'analytics.retention':  'Retention',

  // Common
  'common.back':          '← Back',
  'common.next':          'Continue →',
  'common.close':         'Close',
  'common.search':        'Search',
  'common.filter':        'Filter',
  'common.all':           'All',
  'common.none':          'None',
  'common.yes':           'Yes',
  'common.no':            'No',
};

// ── Partial overrides for other locales ───────────────────────────────────────
const OVERRIDES = {
  es: {
    'auth.login':        'Iniciar sesión',
    'auth.register':     'Crear cuenta',
    'auth.logout':       'Cerrar sesión',
    'action.save':       'Guardar',
    'action.cancel':     'Cancelar',
    'nav.dashboard':     'Panel',
    'nav.settings':      'Configuración',
    'status.loading':    'Cargando...',
    'pay.checkout':      'Pago',
    'pay.success':       '¡Pago exitoso!',
    'common.close':      'Cerrar',
    'common.search':     'Buscar',
    'common.all':        'Todo',
  },
  fr: {
    'auth.login':        'Se connecter',
    'auth.register':     'Créer un compte',
    'auth.logout':       'Se déconnecter',
    'action.save':       'Enregistrer',
    'action.cancel':     'Annuler',
    'nav.dashboard':     'Tableau de bord',
    'nav.settings':      'Paramètres',
    'status.loading':    'Chargement...',
    'pay.checkout':      'Paiement',
    'pay.success':       'Paiement réussi !',
    'common.close':      'Fermer',
    'common.search':     'Rechercher',
    'common.all':        'Tout',
  },
  de: {
    'auth.login':        'Anmelden',
    'auth.register':     'Konto erstellen',
    'auth.logout':       'Abmelden',
    'action.save':       'Speichern',
    'action.cancel':     'Abbrechen',
    'nav.dashboard':     'Dashboard',
    'nav.settings':      'Einstellungen',
    'status.loading':    'Lädt...',
    'pay.checkout':      'Kasse',
    'pay.success':       'Zahlung erfolgreich!',
  },
  zh: {
    'auth.login':        '登录',
    'auth.register':     '注册',
    'auth.logout':       '退出',
    'action.save':       '保存',
    'action.cancel':     '取消',
    'nav.dashboard':     '仪表板',
    'nav.settings':      '设置',
    'status.loading':    '加载中...',
    'pay.checkout':      '结账',
    'pay.success':       '支付成功！',
    'common.close':      '关闭',
    'common.search':     '搜索',
  },
  ja: {
    'auth.login':        'サインイン',
    'auth.register':     'アカウント作成',
    'auth.logout':       'サインアウト',
    'action.save':       '保存',
    'action.cancel':     'キャンセル',
    'nav.dashboard':     'ダッシュボード',
    'nav.settings':      '設定',
    'status.loading':    '読み込み中...',
    'pay.checkout':      'チェックアウト',
    'pay.success':       '支払い成功！',
  },
  ko: {
    'auth.login':        '로그인',
    'auth.register':     '계정 만들기',
    'auth.logout':       '로그아웃',
    'action.save':       '저장',
    'action.cancel':     '취소',
    'nav.dashboard':     '대시보드',
    'nav.settings':      '설정',
    'status.loading':    '로딩 중...',
    'pay.checkout':      '결제',
    'pay.success':       '결제 성공!',
  },
  ar: {
    'auth.login':        'تسجيل الدخول',
    'auth.register':     'إنشاء حساب',
    'auth.logout':       'تسجيل الخروج',
    'action.save':       'حفظ',
    'action.cancel':     'إلغاء',
    'nav.dashboard':     'لوحة التحكم',
    'nav.settings':      'الإعدادات',
    'status.loading':    'جار التحميل...',
    'pay.checkout':      'الدفع',
    'pay.success':       'نجح الدفع!',
    'common.close':      'إغلاق',
    'common.search':     'بحث',
  },
  pt: {
    'auth.login':        'Entrar',
    'auth.register':     'Criar conta',
    'auth.logout':       'Sair',
    'action.save':       'Salvar',
    'action.cancel':     'Cancelar',
    'nav.dashboard':     'Painel',
    'nav.settings':      'Configurações',
    'status.loading':    'Carregando...',
    'pay.checkout':      'Pagamento',
    'pay.success':       'Pagamento concluído!',
  },
  ru: {
    'auth.login':        'Войти',
    'auth.register':     'Создать аккаунт',
    'auth.logout':       'Выйти',
    'action.save':       'Сохранить',
    'action.cancel':     'Отмена',
    'nav.dashboard':     'Панель',
    'nav.settings':      'Настройки',
    'status.loading':    'Загрузка...',
    'pay.checkout':      'Оплата',
    'pay.success':       'Оплата прошла!',
  },
};

// ── Build merged translation maps ─────────────────────────────────────────────
const TRANSLATIONS = { en: EN };
Object.entries(OVERRIDES).forEach(([locale, overrides]) => {
  TRANSLATIONS[locale] = { ...EN, ...overrides };
});

// ── Current locale state ──────────────────────────────────────────────────────
let currentLocale = 'en';
const listeners = new Set();

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES[locale]) return;
  currentLocale = locale;
  // Set HTML dir attribute for RTL languages
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', SUPPORTED_LOCALES[locale].dir);
  }
  listeners.forEach(fn => fn(locale));
}

export function getLocale() {
  return currentLocale;
}

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Detect locale from browser or stored preference
export function detectLocale() {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('nexus:locale');
  if (stored && SUPPORTED_LOCALES[stored]) return stored;
  const browser = navigator.language?.split('-')[0] || 'en';
  return SUPPORTED_LOCALES[browser] ? browser : 'en';
}

// ── Translation function ──────────────────────────────────────────────────────
export function t(key, vars = {}) {
  const map = TRANSLATIONS[currentLocale] || EN;
  let str = map[key] || EN[key] || key;
  // Replace {{var}} placeholders
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  });
  return str;
}

// ── Auto-translate via server (for missing keys) ──────────────────────────────
const autoCache = new Map();

export async function autoTranslate(text, targetLocale = currentLocale) {
  if (targetLocale === 'en') return text;
  const cacheKey = `${targetLocale}:${text}`;
  if (autoCache.has(cacheKey)) return autoCache.get(cacheKey);
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLocale }),
    });
    if (!res.ok) throw new Error('Translation failed');
    const { translated } = await res.json();
    autoCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

// ── React hook ────────────────────────────────────────────────────────────────
export function useI18n() {
  const [locale, setLocaleState] = React.useState(currentLocale);
  React.useEffect(() => {
    return onLocaleChange(l => setLocaleState(l));
  }, []);
  return {
    locale,
    t,
    setLocale: (l) => { setLocale(l); localStorage.setItem('nexus:locale', l); },
    dir: SUPPORTED_LOCALES[locale]?.dir || 'ltr',
    locales: SUPPORTED_LOCALES,
    autoTranslate,
  };
}

// ── Format numbers/dates per locale ──────────────────────────────────────────
export function fmtNumber(n, opts = {}) {
  try { return new Intl.NumberFormat(currentLocale, opts).format(n); }
  catch { return String(n); }
}

export function fmtDate(date, opts = { dateStyle: 'medium' }) {
  try { return new Intl.DateTimeFormat(currentLocale, opts).format(date instanceof Date ? date : new Date(date)); }
  catch { return String(date); }
}

export function fmtCurrency(amount, currency = 'USD') {
  try { return new Intl.NumberFormat(currentLocale, { style: 'currency', currency }).format(amount); }
  catch { return `${currency} ${amount}`; }
}

// Initialise on import
if (typeof window !== 'undefined') {
  setLocale(detectLocale());
}
