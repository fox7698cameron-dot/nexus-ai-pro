// src/i18n/index.js
// Nexus AI Pro — Multi-Language & Regional Support with Auto-Translate
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const SUPPORTED_LANGUAGES = [
  { code: 'en',    name: 'English',    flag: '🇺🇸', dir: 'ltr', region: 'en-US' },
  { code: 'es',    name: 'Español',    flag: '🇪🇸', dir: 'ltr', region: 'es-ES' },
  { code: 'fr',    name: 'Français',   flag: '🇫🇷', dir: 'ltr', region: 'fr-FR' },
  { code: 'de',    name: 'Deutsch',    flag: '🇩🇪', dir: 'ltr', region: 'de-DE' },
  { code: 'ja',    name: '日本語',       flag: '🇯🇵', dir: 'ltr', region: 'ja-JP' },
  { code: 'zh',    name: '中文',         flag: '🇨🇳', dir: 'ltr', region: 'zh-CN' },
  { code: 'ko',    name: '한국어',       flag: '🇰🇷', dir: 'ltr', region: 'ko-KR' },
  { code: 'pt',    name: 'Português',  flag: '🇧🇷', dir: 'ltr', region: 'pt-BR' },
  { code: 'ar',    name: 'العربية',     flag: '🇸🇦', dir: 'rtl', region: 'ar-SA' },
  { code: 'ru',    name: 'Русский',    flag: '🇷🇺', dir: 'ltr', region: 'ru-RU' },
  { code: 'hi',    name: 'हिन्दी',       flag: '🇮🇳', dir: 'ltr', region: 'hi-IN' },
  { code: 'tr',    name: 'Türkçe',     flag: '🇹🇷', dir: 'ltr', region: 'tr-TR' },
  { code: 'nl',    name: 'Nederlands', flag: '🇳🇱', dir: 'ltr', region: 'nl-NL' },
  { code: 'pl',    name: 'Polski',     flag: '🇵🇱', dir: 'ltr', region: 'pl-PL' },
  { code: 'it',    name: 'Italiano',   flag: '🇮🇹', dir: 'ltr', region: 'it-IT' },
  { code: 'sv',    name: 'Svenska',    flag: '🇸🇪', dir: 'ltr', region: 'sv-SE' },
];

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.dashboard':  'Dashboard',
      'nav.analytics':  'Analytics',
      'nav.security':   'Security',
      'nav.projects':   'Projects',
      'nav.settings':   'Settings',
      'nav.logout':     'Sign Out',
      // Auth
      'auth.login':     'Sign In',
      'auth.register':  'Create Account',
      'auth.email':     'Email',
      'auth.password':  'Password',
      'auth.username':  'Username',
      'auth.mfa':       'Two-Factor Auth',
      'auth.biometric': 'Biometric Login',
      // Dashboards
      'dash.welcome':   'Welcome back, {{name}}',
      'dash.score':     'Security Score',
      'dash.threats':   'Active Threats',
      'dash.blocked':   'Threats Blocked',
      'dash.projects':  'Active Projects',
      // Analytics
      'analytics.views':     'Views',
      'analytics.likes':     'Likes',
      'analytics.reach':     'Reach',
      'analytics.retention': 'Retention',
      'analytics.followers': 'Followers',
      // Common
      'common.loading':  'Loading…',
      'common.save':     'Save',
      'common.cancel':   'Cancel',
      'common.confirm':  'Confirm',
      'common.delete':   'Delete',
      'common.edit':     'Edit',
      'common.search':   'Search',
      'common.refresh':  'Refresh',
      'common.export':   'Export',
      'common.connect':  'Connect',
      'common.disconnect': 'Disconnect',
      // Payments
      'pay.upgrade':   'Upgrade Plan',
      'pay.card':      'Credit / Debit Card',
      'pay.crypto':    'Cryptocurrency',
      'pay.giftcard':  'Gift Card',
      'pay.success':   'Payment Successful!',
      // Errors
      'err.required':     'This field is required',
      'err.invalid_email': 'Invalid email address',
      'err.weak_password': 'Password is too weak',
      'err.network':      'Network error. Please try again.',
    },
  },
  es: {
    translation: {
      'nav.dashboard':  'Panel',
      'nav.analytics':  'Analíticas',
      'nav.security':   'Seguridad',
      'nav.projects':   'Proyectos',
      'nav.settings':   'Configuración',
      'nav.logout':     'Cerrar sesión',
      'auth.login':     'Iniciar sesión',
      'auth.register':  'Crear cuenta',
      'auth.email':     'Correo electrónico',
      'auth.password':  'Contraseña',
      'auth.username':  'Nombre de usuario',
      'auth.mfa':       'Autenticación de dos factores',
      'auth.biometric': 'Inicio biométrico',
      'dash.welcome':   'Bienvenido, {{name}}',
      'dash.score':     'Puntuación de seguridad',
      'dash.threats':   'Amenazas activas',
      'common.loading': 'Cargando…',
      'common.save':    'Guardar',
      'common.cancel':  'Cancelar',
      'pay.upgrade':    'Actualizar plan',
      'pay.success':    '¡Pago exitoso!',
    },
  },
  fr: {
    translation: {
      'nav.dashboard':  'Tableau de bord',
      'nav.analytics':  'Analytique',
      'nav.security':   'Sécurité',
      'nav.projects':   'Projets',
      'nav.settings':   'Paramètres',
      'nav.logout':     'Déconnexion',
      'auth.login':     'Connexion',
      'auth.register':  'Créer un compte',
      'dash.welcome':   'Bon retour, {{name}}',
      'common.loading': 'Chargement…',
      'common.save':    'Enregistrer',
      'common.cancel':  'Annuler',
      'pay.success':    'Paiement réussi !',
    },
  },
  de: {
    translation: {
      'nav.dashboard':  'Dashboard',
      'nav.analytics':  'Analytik',
      'nav.security':   'Sicherheit',
      'nav.projects':   'Projekte',
      'nav.settings':   'Einstellungen',
      'nav.logout':     'Abmelden',
      'auth.login':     'Anmelden',
      'auth.register':  'Konto erstellen',
      'dash.welcome':   'Willkommen, {{name}}',
      'common.loading': 'Laden…',
      'common.save':    'Speichern',
      'common.cancel':  'Abbrechen',
      'pay.success':    'Zahlung erfolgreich!',
    },
  },
  ja: {
    translation: {
      'nav.dashboard':  'ダッシュボード',
      'nav.analytics':  'アナリティクス',
      'nav.security':   'セキュリティ',
      'nav.projects':   'プロジェクト',
      'nav.settings':   '設定',
      'nav.logout':     'ログアウト',
      'auth.login':     'ログイン',
      'auth.register':  'アカウント作成',
      'dash.welcome':   'おかえり、{{name}}',
      'common.loading': '読み込み中…',
      'common.save':    '保存',
      'common.cancel':  'キャンセル',
      'pay.success':    'お支払い成功！',
    },
  },
  zh: {
    translation: {
      'nav.dashboard':  '仪表板',
      'nav.analytics':  '分析',
      'nav.security':   '安全',
      'nav.projects':   '项目',
      'nav.settings':   '设置',
      'nav.logout':     '退出登录',
      'auth.login':     '登录',
      'auth.register':  '创建账户',
      'dash.welcome':   '欢迎回来，{{name}}',
      'common.loading': '加载中…',
      'common.save':    '保存',
      'common.cancel':  '取消',
      'pay.success':    '支付成功！',
    },
  },
  ar: {
    translation: {
      'nav.dashboard':  'لوحة التحكم',
      'nav.analytics':  'التحليلات',
      'nav.security':   'الأمان',
      'nav.projects':   'المشاريع',
      'nav.settings':   'الإعدادات',
      'nav.logout':     'تسجيل الخروج',
      'auth.login':     'تسجيل الدخول',
      'auth.register':  'إنشاء حساب',
      'dash.welcome':   'مرحباً بعودتك، {{name}}',
      'common.loading': 'جار التحميل…',
      'common.save':    'حفظ',
      'common.cancel':  'إلغاء',
      'pay.success':    'تمت عملية الدفع بنجاح!',
    },
  },
  pt: {
    translation: {
      'nav.dashboard':  'Painel',
      'nav.analytics':  'Análise',
      'nav.security':   'Segurança',
      'nav.projects':   'Projetos',
      'nav.settings':   'Configurações',
      'nav.logout':     'Sair',
      'auth.login':     'Entrar',
      'auth.register':  'Criar conta',
      'dash.welcome':   'Bem-vindo, {{name}}',
      'common.loading': 'Carregando…',
      'common.save':    'Salvar',
      'common.cancel':  'Cancelar',
      'pay.success':    'Pagamento realizado com sucesso!',
    },
  },
  ko: {
    translation: {
      'nav.dashboard':  '대시보드',
      'nav.analytics':  '분석',
      'nav.security':   '보안',
      'nav.projects':   '프로젝트',
      'nav.settings':   '설정',
      'nav.logout':     '로그아웃',
      'auth.login':     '로그인',
      'auth.register':  '계정 만들기',
      'dash.welcome':   '환영합니다, {{name}}',
      'common.loading': '로딩 중…',
      'common.save':    '저장',
      'common.cancel':  '취소',
      'pay.success':    '결제 성공!',
    },
  },
  ru: {
    translation: {
      'nav.dashboard':  'Панель',
      'nav.analytics':  'Аналитика',
      'nav.security':   'Безопасность',
      'nav.projects':   'Проекты',
      'nav.settings':   'Настройки',
      'nav.logout':     'Выйти',
      'auth.login':     'Войти',
      'auth.register':  'Создать аккаунт',
      'dash.welcome':   'С возвращением, {{name}}',
      'common.loading': 'Загрузка…',
      'common.save':    'Сохранить',
      'common.cancel':  'Отмена',
      'pay.success':    'Платёж успешен!',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

// Apply RTL direction on language change
i18n.on('languageChanged', (lng) => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === lng);
  if (lang) {
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lang.region || lng;
  }
});

// Auto-translate via server-side Google Translate (for keys not in resources)
export async function autoTranslate(text, targetLang = i18n.language) {
  if (targetLang === 'en' || !text) return text;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target: targetLang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translated || text;
  } catch {
    return text;
  }
}

export { SUPPORTED_LANGUAGES };
export default i18n;
