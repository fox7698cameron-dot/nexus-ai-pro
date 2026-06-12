// src/i18n/i18n-config.js
// 2026-06-12 | Nexus AI Pro — i18n / Internationalization
// i18next backend config + auto-translate proxy (Google Translate API)

import i18next from 'i18next';
import middleware from 'i18next-http-middleware';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    dir: 'ltr', region: 'US' },
  { code: 'es', name: 'Español',    dir: 'ltr', region: 'ES' },
  { code: 'fr', name: 'Français',   dir: 'ltr', region: 'FR' },
  { code: 'de', name: 'Deutsch',    dir: 'ltr', region: 'DE' },
  { code: 'pt', name: 'Português',  dir: 'ltr', region: 'BR' },
  { code: 'ja', name: '日本語',       dir: 'ltr', region: 'JP' },
  { code: 'zh', name: '中文',         dir: 'ltr', region: 'CN' },
  { code: 'ko', name: '한국어',        dir: 'ltr', region: 'KR' },
  { code: 'ar', name: 'العربية',     dir: 'rtl', region: 'SA' },
  { code: 'hi', name: 'हिन्दी',        dir: 'ltr', region: 'IN' },
  { code: 'ru', name: 'Русский',    dir: 'ltr', region: 'RU' },
  { code: 'it', name: 'Italiano',   dir: 'ltr', region: 'IT' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr', region: 'NL' },
  { code: 'tr', name: 'Türkçe',     dir: 'ltr', region: 'TR' },
  { code: 'pl', name: 'Polski',     dir: 'ltr', region: 'PL' }
];

// Minimal resource bundles — extend as needed
const resources = {
  en: { translation: {
    nav_dashboard: 'Dashboard', nav_analytics: 'Analytics', nav_projects: 'Projects',
    nav_security: 'Security', nav_settings: 'Settings', nav_billing: 'Billing',
    auth_login: 'Sign In', auth_register: 'Create Account', auth_logout: 'Sign Out',
    auth_2fa: 'Two-Factor Authentication', auth_biometric: 'Biometric Login',
    project_new: 'New Project', project_type_code: 'Code', project_type_game: 'Game',
    project_type_arvr: 'AR/VR', project_milestone: 'Milestone',
    analytics_overview: 'Overview', analytics_reach: 'Reach', analytics_retention: 'Retention',
    payment_subscribe: 'Subscribe', payment_free: 'Free', payment_pro: 'Pro',
    payment_enterprise: 'Enterprise', payment_crypto: 'Pay with Crypto',
    security_scan: 'Run Scan', security_status: 'Security Status',
    common_save: 'Save', common_cancel: 'Cancel', common_delete: 'Delete',
    common_loading: 'Loading…', common_error: 'An error occurred.'
  }},
  es: { translation: {
    nav_dashboard: 'Panel', nav_analytics: 'Análisis', nav_projects: 'Proyectos',
    nav_security: 'Seguridad', nav_settings: 'Ajustes', nav_billing: 'Facturación',
    auth_login: 'Iniciar sesión', auth_register: 'Crear cuenta', auth_logout: 'Cerrar sesión',
    auth_2fa: 'Autenticación en dos pasos', auth_biometric: 'Inicio biométrico',
    project_new: 'Nuevo proyecto', analytics_overview: 'Resumen',
    payment_subscribe: 'Suscribirse', security_scan: 'Ejecutar análisis',
    common_save: 'Guardar', common_cancel: 'Cancelar', common_loading: 'Cargando…', common_error: 'Se ha producido un error.'
  }},
  fr: { translation: {
    nav_dashboard: 'Tableau de bord', nav_analytics: 'Analytique', nav_projects: 'Projets',
    nav_security: 'Sécurité', nav_settings: 'Paramètres', nav_billing: 'Facturation',
    auth_login: 'Se connecter', auth_register: 'Créer un compte', auth_logout: 'Se déconnecter',
    common_save: 'Enregistrer', common_cancel: 'Annuler', common_loading: 'Chargement…', common_error: 'Une erreur est survenue.'
  }},
  de: { translation: {
    nav_dashboard: 'Dashboard', nav_analytics: 'Analytik', nav_projects: 'Projekte',
    auth_login: 'Anmelden', auth_register: 'Konto erstellen', auth_logout: 'Abmelden',
    common_save: 'Speichern', common_cancel: 'Abbrechen', common_loading: 'Laden…', common_error: 'Ein Fehler ist aufgetreten.'
  }},
  zh: { translation: {
    nav_dashboard: '仪表板', nav_analytics: '分析', nav_projects: '项目',
    nav_security: '安全', nav_settings: '设置', nav_billing: '账单',
    auth_login: '登录', auth_register: '创建账户', auth_logout: '退出',
    common_save: '保存', common_cancel: '取消', common_loading: '加载中…', common_error: '发生错误。'
  }},
  ja: { translation: {
    nav_dashboard: 'ダッシュボード', nav_analytics: '分析', nav_projects: 'プロジェクト',
    auth_login: 'ログイン', auth_register: 'アカウント作成', auth_logout: 'ログアウト',
    common_save: '保存', common_cancel: 'キャンセル', common_loading: '読み込み中…'
  }}
};

let initialized = false;

export async function initI18n() {
  if (initialized) return i18next;
  await i18next
    .use(middleware.LanguageDetector)
    .init({
      preload: Object.keys(resources),
      resources,
      fallbackLng: 'en',
      detection: {
        order: ['querystring', 'header'],
        lookupQuerystring: 'lang',
        lookupHeader: 'accept-language',
        caches: false
      },
      interpolation: { escapeValue: false }
    });
  initialized = true;
  return i18next;
}

export { middleware as i18nMiddleware, SUPPORTED_LANGUAGES };

// ---- Auto-translate via Google Translate API -----------------------

export async function autoTranslate(text, targetLang, sourceLang = 'auto') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { translated: text, lang: targetLang, provider: 'none', message: 'Set GOOGLE_TRANSLATE_API_KEY for auto-translate.' };
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: sourceLang === 'auto' ? undefined : sourceLang, target: targetLang, format: 'text' })
  });
  const data = await resp.json();
  const translation = data?.data?.translations?.[0];
  return {
    translated: translation?.translatedText || text,
    detectedLang: translation?.detectedSourceLanguage,
    lang: targetLang,
    provider: 'google'
  };
}
