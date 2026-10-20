// File: src/i18n/index.js
// Updated: 2026-10-20
// Lightweight i18n: 10 languages, auto-detect, RTL support, pluralization

import { useState, useEffect, useCallback } from 'react';

export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false, locale: 'en-US' },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false, locale: 'es-ES' },
  fr: { name: 'French', nativeName: 'Français', rtl: false, locale: 'fr-FR' },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false, locale: 'de-DE' },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false, locale: 'ja-JP' },
  zh: { name: 'Chinese', nativeName: '中文', rtl: false, locale: 'zh-CN' },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false, locale: 'pt-BR' },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, locale: 'ar-SA' },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false, locale: 'ko-KR' },
  hi: { name: 'Hindi', nativeName: 'हिंदी', rtl: false, locale: 'hi-IN' },
};

const TRANSLATIONS = {
  en: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Home',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.gamedev': 'Game Dev',
    'nav.settings': 'Settings',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signOut': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.biometric': 'Use Biometrics',
    'auth.mfa': 'Two-Factor Authentication',
    'auth.passwordStrength': 'Password Strength',
    'auth.passwordMinLength': 'At least 13 characters',
    'auth.role.user': 'User',
    'auth.role.admin': 'Administrator',
    'auth.role.dev': 'Developer',
    'auth.role.mod': 'Moderator',
    'analytics.overview': 'Overview',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reach',
    'analytics.retention': 'Retention',
    'analytics.followers': 'Followers',
    'analytics.engagement': 'Engagement Rate',
    'analytics.export': 'Export Data',
    'analytics.connect': 'Connect Platform',
    'analytics.topContent': 'Top Content',
    'security.dashboard': 'Security Dashboard',
    'security.scan': 'Run Scan',
    'security.status': 'Status',
    'security.threats': 'Threats',
    'security.vulnerabilities': 'Vulnerabilities',
    'security.score': 'Security Score',
    'security.encryption': 'Encryption',
    'gamedev.projects': 'Projects',
    'gamedev.newProject': 'New Project',
    'gamedev.milestones': 'Milestones',
    'gamedev.builds': 'Builds',
    'gamedev.achievements': 'Achievements',
    'gamedev.progress': 'Progress',
    'payment.subscribe': 'Subscribe',
    'payment.free': 'Free',
    'payment.pro': 'Pro',
    'payment.enterprise': 'Enterprise',
    'payment.monthly': 'Monthly',
    'payment.annual': 'Annual',
    'payment.giftCard': 'Gift Card',
    'payment.crypto': 'Crypto',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.noData': 'No data available',
    'common.realTime': 'Real-time',
    'common.refresh': 'Refresh',
  },
  es: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Inicio',
    'nav.analytics': 'Análisis',
    'nav.security': 'Seguridad',
    'nav.gamedev': 'Desarrollo de Juegos',
    'nav.settings': 'Configuración',
    'auth.signIn': 'Iniciar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.signOut': 'Cerrar Sesión',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de Usuario',
    'auth.confirmPassword': 'Confirmar Contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.biometric': 'Usar Biométricos',
    'auth.mfa': 'Autenticación de Dos Factores',
    'analytics.views': 'Vistas',
    'analytics.likes': 'Me gusta',
    'analytics.reach': 'Alcance',
    'security.scan': 'Ejecutar Escaneo',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.success': 'Éxito',
  },
  fr: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Accueil',
    'nav.analytics': 'Analytiques',
    'nav.security': 'Sécurité',
    'auth.signIn': 'Se Connecter',
    'auth.signUp': "S'inscrire",
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur",
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
  },
  de: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Startseite',
    'nav.analytics': 'Analytik',
    'nav.security': 'Sicherheit',
    'auth.signIn': 'Anmelden',
    'auth.signUp': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.loading': 'Laden...',
  },
  ja: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'ホーム',
    'nav.analytics': '分析',
    'nav.security': 'セキュリティ',
    'auth.signIn': 'ログイン',
    'auth.signUp': '新規登録',
    'auth.email': 'メール',
    'auth.password': 'パスワード',
    'auth.username': 'ユーザー名',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.loading': '読み込み中...',
  },
  zh: {
    'app.name': 'Nexus AI Pro',
    'nav.home': '首页',
    'nav.analytics': '分析',
    'nav.security': '安全',
    'auth.signIn': '登录',
    'auth.signUp': '注册',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.loading': '加载中...',
  },
  pt: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'Início',
    'nav.analytics': 'Análises',
    'auth.signIn': 'Entrar',
    'auth.signUp': 'Cadastrar',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Carregando...',
  },
  ar: {
    'app.name': 'نيكسوس AI برو',
    'nav.home': 'الرئيسية',
    'nav.analytics': 'التحليلات',
    'nav.security': 'الأمان',
    'auth.signIn': 'تسجيل الدخول',
    'auth.signUp': 'إنشاء حساب',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.loading': 'جار التحميل...',
  },
  ko: {
    'app.name': 'Nexus AI Pro',
    'nav.home': '홈',
    'nav.analytics': '분석',
    'nav.security': '보안',
    'auth.signIn': '로그인',
    'auth.signUp': '회원가입',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.loading': '로딩 중...',
  },
  hi: {
    'app.name': 'Nexus AI Pro',
    'nav.home': 'होम',
    'nav.analytics': 'विश्लेषण',
    'nav.security': 'सुरक्षा',
    'auth.signIn': 'साइन इन',
    'auth.signUp': 'साइन अप',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.loading': 'लोड हो रहा है...',
  },
};

function detectLanguage() {
  try {
    const stored = localStorage.getItem('nexus:language');
    if (stored && LANGUAGES[stored]) return stored;
    const browserLang = navigator.language?.split('-')[0];
    return LANGUAGES[browserLang] ? browserLang : 'en';
  } catch {
    return 'en';
  }
}

function formatNumber(value, locale, options = {}) {
  try {
    return new Intl.NumberFormat(LANGUAGES[locale]?.locale || locale, options).format(value);
  } catch {
    return String(value);
  }
}

function formatDate(value, locale, options = {}) {
  try {
    return new Intl.DateTimeFormat(LANGUAGES[locale]?.locale || locale, options).format(new Date(value));
  } catch {
    return String(value);
  }
}

function createTranslator(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const fallback = TRANSLATIONS.en;

  return function t(key, vars = {}, count = null) {
    let str = dict[key] || fallback[key] || key;

    // Pluralization: append _one or _other
    if (count !== null) {
      const pluralKey = count === 1 ? `${key}_one` : `${key}_other`;
      const pluralStr = dict[pluralKey] || fallback[pluralKey];
      if (pluralStr) str = pluralStr;
      vars.count = count;
    }

    // Variable interpolation: {{varName}}
    return str.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
  };
}

// React hook
export function useTranslation() {
  const [lang, setLang] = useState(() => detectLanguage());

  const setLanguage = useCallback((newLang) => {
    if (!LANGUAGES[newLang]) return;
    setLang(newLang);
    try { localStorage.setItem('nexus:language', newLang); } catch {}
    const dir = LANGUAGES[newLang].rtl ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', newLang);
  }, []);

  useEffect(() => {
    const dir = LANGUAGES[lang]?.rtl ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = useCallback(createTranslator(lang), [lang]);
  const fmt = useCallback({
    number: (v, opts) => formatNumber(v, lang, opts),
    date: (v, opts) => formatDate(v, lang, opts),
    currency: (v, currency = 'USD') => formatNumber(v, lang, { style: 'currency', currency }),
  }, [lang]);

  return { t, lang, setLanguage, languages: LANGUAGES, isRTL: LANGUAGES[lang]?.rtl || false, fmt };
}

// Standalone t() function for non-hook usage
export function t(key, lang = 'en', vars = {}) {
  return createTranslator(lang)(key, vars);
}

export default { useTranslation, t, LANGUAGES, TRANSLATIONS };
