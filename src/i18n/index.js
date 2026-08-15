/**
 * src/i18n/index.js
 * Multi-language and regional support with auto-translate routing.
 * Uses i18next. Expand translations in each language object as needed.
 * Date: 2026-08-15
 */

import i18next from 'i18next';

// ─── Supported locales ────────────────────────────────────────────────────
export const LOCALES = [
  { code: 'en',    name: 'English',    dir: 'ltr', region: 'US' },
  { code: 'es',    name: 'Español',    dir: 'ltr', region: 'ES' },
  { code: 'fr',    name: 'Français',   dir: 'ltr', region: 'FR' },
  { code: 'de',    name: 'Deutsch',    dir: 'ltr', region: 'DE' },
  { code: 'ja',    name: '日本語',       dir: 'ltr', region: 'JP' },
  { code: 'zh',    name: '中文',        dir: 'ltr', region: 'CN' },
  { code: 'ko',    name: '한국어',       dir: 'ltr', region: 'KR' },
  { code: 'pt',    name: 'Português',  dir: 'ltr', region: 'BR' },
  { code: 'ar',    name: 'العربية',     dir: 'rtl', region: 'SA' },
  { code: 'hi',    name: 'हिन्दी',        dir: 'ltr', region: 'IN' },
  { code: 'ru',    name: 'Русский',    dir: 'ltr', region: 'RU' },
  { code: 'it',    name: 'Italiano',   dir: 'ltr', region: 'IT' },
  { code: 'nl',    name: 'Nederlands', dir: 'ltr', region: 'NL' },
  { code: 'pl',    name: 'Polski',     dir: 'ltr', region: 'PL' },
  { code: 'sv',    name: 'Svenska',    dir: 'ltr', region: 'SE' },
  { code: 'tr',    name: 'Türkçe',     dir: 'ltr', region: 'TR' },
];

// ─── Translation resources ────────────────────────────────────────────────
const resources = {
  en: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Military-grade AI platform' },
      nav: {
        chat: 'Chat',
        analytics: 'Analytics',
        security: 'Security',
        projects: 'Projects',
        payments: 'Payments',
        settings: 'Settings',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        admin: 'Admin',
        dashboard: 'Dashboard',
      },
      auth: {
        login: 'Sign In',
        register: 'Create Account',
        email: 'Email address',
        password: 'Password',
        username: 'Username',
        forgotPassword: 'Forgot password?',
        mfa: 'Two-factor authentication',
        mfaCode: 'Enter 6-digit code',
        biometric: 'Sign in with biometrics',
        passwordStrength: {
          veryWeak: 'Very Weak',
          weak: 'Weak',
          fair: 'Fair',
          strong: 'Strong',
          veryStrong: 'Very Strong',
        },
      },
      analytics: {
        title: 'Social Media Analytics',
        followers: 'Followers',
        views: 'Views',
        likes: 'Likes',
        reach: 'Reach',
        retention: 'Retention',
        engagements: 'Engagements',
        live: 'Live',
        paused: 'Paused',
        refresh: 'Refresh',
        noData: 'No data available',
      },
      security: {
        title: 'Security Dashboard',
        score: 'Security Score',
        scan: 'Run Scan',
        scanning: 'Scanning…',
        autoScan: 'Auto-Scan',
        vulnerabilities: 'Vulnerabilities',
        threats: 'Threats',
        network: 'Network',
        audit: 'Audit Log',
        patch: 'Patch',
        patched: 'Patched',
        open: 'Open',
        blocked: 'Blocked',
      },
      projects: {
        title: 'Project Dashboard',
        newProject: 'New Project',
        name: 'Project Name',
        type: 'Project Type',
        language: 'Primary Language',
        status: { active: 'Active', paused: 'Paused', completed: 'Done', archived: 'Archived' },
        achievements: 'Achievements',
        connectors: 'Platform Connectors',
        liveMetrics: 'Live Metrics',
      },
      payments: {
        title: 'Subscription & Payments',
        currentPlan: 'Current plan',
        subscribe: 'Subscribe',
        payWith: 'Pay with',
        card: 'Credit / Debit Card',
        crypto: 'Cryptocurrency',
        giftCard: 'Gift Card',
        redeemGiftCard: 'Redeem Gift Card',
        success: 'Payment Successful!',
        cancel: 'Cancel',
      },
      common: {
        loading: 'Loading…',
        error: 'An error occurred',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        done: 'Done',
        yes: 'Yes',
        no: 'No',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        all: 'All',
        none: 'None',
      },
    },
  },

  es: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Plataforma de IA de grado militar' },
      nav: { chat: 'Chat', analytics: 'Analítica', security: 'Seguridad',
             projects: 'Proyectos', payments: 'Pagos', settings: 'Ajustes',
             signIn: 'Iniciar sesión', signOut: 'Cerrar sesión', admin: 'Admin', dashboard: 'Panel' },
      auth: {
        login: 'Iniciar sesión', register: 'Crear cuenta', email: 'Correo electrónico',
        password: 'Contraseña', username: 'Nombre de usuario', forgotPassword: '¿Olvidaste la contraseña?',
        mfa: 'Autenticación de dos factores', mfaCode: 'Introduce el código de 6 dígitos',
        biometric: 'Iniciar sesión con biometría',
        passwordStrength: { veryWeak: 'Muy débil', weak: 'Débil', fair: 'Regular',
                            strong: 'Fuerte', veryStrong: 'Muy fuerte' },
      },
      common: { loading: 'Cargando…', error: 'Ocurrió un error', save: 'Guardar', cancel: 'Cancelar',
                confirm: 'Confirmar', delete: 'Eliminar', edit: 'Editar', close: 'Cerrar',
                back: 'Atrás', next: 'Siguiente', done: 'Hecho', search: 'Buscar' },
    },
  },

  fr: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Plateforme IA de grade militaire' },
      nav: { chat: 'Conversation', analytics: 'Analytique', security: 'Sécurité',
             projects: 'Projets', payments: 'Paiements', settings: 'Paramètres',
             signIn: 'Se connecter', signOut: 'Se déconnecter', admin: 'Admin', dashboard: 'Tableau de bord' },
      common: { loading: 'Chargement…', error: 'Une erreur est survenue', save: 'Enregistrer',
                cancel: 'Annuler', confirm: 'Confirmer', delete: 'Supprimer', edit: 'Modifier',
                close: 'Fermer', back: 'Retour', next: 'Suivant', done: 'Terminé', search: 'Rechercher' },
    },
  },

  de: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'Militärische KI-Plattform' },
      nav: { chat: 'Chat', analytics: 'Analytik', security: 'Sicherheit',
             projects: 'Projekte', payments: 'Zahlungen', settings: 'Einstellungen',
             signIn: 'Anmelden', signOut: 'Abmelden', admin: 'Admin', dashboard: 'Dashboard' },
      common: { loading: 'Laden…', error: 'Ein Fehler ist aufgetreten', save: 'Speichern',
                cancel: 'Abbrechen', confirm: 'Bestätigen', delete: 'Löschen', edit: 'Bearbeiten',
                close: 'Schließen', back: 'Zurück', next: 'Weiter', done: 'Fertig', search: 'Suchen' },
    },
  },

  ja: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '軍事グレードAIプラットフォーム' },
      nav: { chat: 'チャット', analytics: 'アナリティクス', security: 'セキュリティ',
             projects: 'プロジェクト', payments: '支払い', settings: '設定',
             signIn: 'ログイン', signOut: 'ログアウト', admin: '管理者', dashboard: 'ダッシュボード' },
      common: { loading: '読み込み中…', error: 'エラーが発生しました', save: '保存',
                cancel: 'キャンセル', confirm: '確認', delete: '削除', edit: '編集',
                close: '閉じる', back: '戻る', next: '次へ', done: '完了', search: '検索' },
    },
  },

  zh: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: '军事级AI平台' },
      nav: { chat: '聊天', analytics: '数据分析', security: '安全',
             projects: '项目', payments: '支付', settings: '设置',
             signIn: '登录', signOut: '退出', admin: '管理员', dashboard: '仪表盘' },
      common: { loading: '加载中…', error: '发生错误', save: '保存',
                cancel: '取消', confirm: '确认', delete: '删除', edit: '编辑',
                close: '关闭', back: '返回', next: '下一步', done: '完成', search: '搜索' },
    },
  },

  ar: {
    translation: {
      app: { name: 'Nexus AI Pro', tagline: 'منصة ذكاء اصطناعي عسكري' },
      nav: { chat: 'دردشة', analytics: 'تحليلات', security: 'أمان',
             projects: 'مشاريع', payments: 'مدفوعات', settings: 'إعدادات',
             signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', admin: 'مسؤول', dashboard: 'لوحة التحكم' },
      common: { loading: 'جارٍ التحميل…', error: 'حدث خطأ', save: 'حفظ',
                cancel: 'إلغاء', confirm: 'تأكيد', delete: 'حذف', edit: 'تعديل',
                close: 'إغلاق', back: 'رجوع', next: 'التالي', done: 'تم', search: 'بحث' },
    },
  },
};

// ─── Initialise i18next ────────────────────────────────────────────────────
let initialized = false;

export function initI18n(lang = 'en') {
  if (initialized) {
    i18next.changeLanguage(lang);
    return;
  }
  i18next.init({
    lng: lang,
    fallbackLng: 'en',
    resources,
    interpolation: { escapeValue: false },
  });
  initialized = true;
}

export const t = (key, opts) => i18next.t(key, opts);
export const changeLanguage = (lang) => i18next.changeLanguage(lang);
export const getCurrentLanguage = () => i18next.language;

// ─── Auto-detect language from browser ────────────────────────────────────
export function detectLanguage() {
  const stored = localStorage.getItem('nexus:language');
  if (stored) return stored;
  const nav = navigator.language || navigator.languages?.[0] || 'en';
  const code = nav.split('-')[0];
  return LOCALES.some((l) => l.code === code) ? code : 'en';
}

// ─── Apply RTL/LTR direction ──────────────────────────────────────────────
export function applyLocaleDirection(lang) {
  const locale = LOCALES.find((l) => l.code === lang);
  document.documentElement.dir = locale?.dir ?? 'ltr';
  document.documentElement.lang = lang;
}

// ─── Server-side auto-translate helper (wraps AI endpoint) ───────────────
/**
 * Auto-translate content using the AI backend.
 * Returns translated text or falls back to original on error.
 * No API keys needed client-side — handled server-side.
 */
export async function autoTranslate(text, targetLang) {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) return text;
    const d = await res.json();
    return d.translated ?? text;
  } catch {
    return text;
  }
}

export default i18next;
