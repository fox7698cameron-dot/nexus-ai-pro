// src/i18n/i18n.js
// Nexus AI Pro — Internationalization (i18next) with auto-translate
// Updated: 2026-05-03

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

export const SUPPORTED_LANGUAGES = [
  { code: 'en',    label: 'English',            region: 'US', flag: '🇺🇸' },
  { code: 'es',    label: 'Español',             region: 'ES', flag: '🇪🇸' },
  { code: 'fr',    label: 'Français',            region: 'FR', flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',             region: 'DE', flag: '🇩🇪' },
  { code: 'ja',    label: '日本語',               region: 'JP', flag: '🇯🇵' },
  { code: 'ko',    label: '한국어',               region: 'KR', flag: '🇰🇷' },
  { code: 'zh-CN', label: '中文 (简体)',           region: 'CN', flag: '🇨🇳' },
  { code: 'zh-TW', label: '中文 (繁體)',           region: 'TW', flag: '🇹🇼' },
  { code: 'pt',    label: 'Português',           region: 'BR', flag: '🇧🇷' },
  { code: 'ru',    label: 'Русский',             region: 'RU', flag: '🇷🇺' },
  { code: 'ar',    label: 'العربية',             region: 'SA', flag: '🇸🇦', rtl: true },
  { code: 'hi',    label: 'हिन्दी',               region: 'IN', flag: '🇮🇳' },
  { code: 'it',    label: 'Italiano',            region: 'IT', flag: '🇮🇹' },
  { code: 'nl',    label: 'Nederlands',          region: 'NL', flag: '🇳🇱' },
  { code: 'pl',    label: 'Polski',              region: 'PL', flag: '🇵🇱' },
  { code: 'sv',    label: 'Svenska',             region: 'SE', flag: '🇸🇪' },
  { code: 'tr',    label: 'Türkçe',              region: 'TR', flag: '🇹🇷' },
  { code: 'vi',    label: 'Tiếng Việt',          region: 'VN', flag: '🇻🇳' },
  { code: 'th',    label: 'ภาษาไทย',              region: 'TH', flag: '🇹🇭' },
  { code: 'id',    label: 'Bahasa Indonesia',    region: 'ID', flag: '🇮🇩' },
];

// English base translations
const en = {
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    close: 'Close', confirm: 'Confirm', loading: 'Loading…', error: 'Error',
    success: 'Success', refresh: 'Refresh', export: 'Export', search: 'Search',
    settings: 'Settings', logout: 'Sign Out', back: 'Back', next: 'Next',
    submit: 'Submit', create: 'Create', update: 'Update', view: 'View',
    active: 'Active', inactive: 'Inactive', enabled: 'Enabled', disabled: 'Disabled',
    all: 'All', none: 'None', yes: 'Yes', no: 'No',
  },
  auth: {
    signIn: 'Sign In', register: 'Register', signOut: 'Sign Out',
    username: 'Username', email: 'Email', password: 'Password',
    confirmPassword: 'Confirm Password', forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password', createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?', noAccount: "Don't have an account?",
    mfa: 'Two-Factor Authentication', biometric: 'Biometric Sign-In',
    passwordStrength: 'Password Strength',
  },
  dashboard: {
    analytics: 'Analytics', security: 'Security', projects: 'Projects',
    gaming: 'Gaming', payments: 'Payments', settings: 'Settings',
    overview: 'Overview', realTime: 'Real-Time', metrics: 'Metrics',
  },
  analytics: {
    title: 'Analytics Dashboard', platforms: 'Platforms',
    totalReach: 'Total Reach', totalFollowers: 'Total Followers',
    totalEngagement: 'Total Engagement', live: 'Live',
  },
  security: {
    title: 'Security Dashboard', scanNow: 'Scan Now', scanning: 'Scanning…',
    networkSecurity: 'Network Security', deviceHealth: 'Device Health',
    appSecurity: 'Application Security', securityScore: 'Security Score',
    allSecure: 'All Systems Secure', issuesDetected: 'Issues Detected',
    autoScan: 'Auto Scan',
  },
  payments: {
    subscribe: 'Subscribe', checkout: 'Checkout', plan: 'Plan',
    monthly: 'Monthly', annual: 'Annual', billing: 'Billing',
    paySecurely: 'Pay Securely', cardNumber: 'Card Number',
    expiry: 'Expiry', cvv: 'CVV', cardholderName: 'Cardholder Name',
    giftCard: 'Gift Card', crypto: 'Crypto', redeemCode: 'Redeem Code',
    paymentSuccessful: 'Payment Successful!',
  },
};

// Minimal Spanish translations (real app would use a translation service or human translators)
const es = {
  common: {
    save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
    close: 'Cerrar', confirm: 'Confirmar', loading: 'Cargando…', error: 'Error',
    success: 'Éxito', refresh: 'Actualizar', export: 'Exportar', search: 'Buscar',
    settings: 'Configuración', logout: 'Cerrar sesión', back: 'Atrás', next: 'Siguiente',
    active: 'Activo', all: 'Todos', none: 'Ninguno', yes: 'Sí', no: 'No',
  },
  auth: {
    signIn: 'Iniciar sesión', register: 'Registrarse', signOut: 'Cerrar sesión',
    username: 'Nombre de usuario', email: 'Correo', password: 'Contraseña',
  },
  dashboard: {
    analytics: 'Analíticas', security: 'Seguridad', projects: 'Proyectos',
    gaming: 'Juegos', payments: 'Pagos', settings: 'Configuración',
  },
};

const fr = {
  common: {
    save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
    close: 'Fermer', confirm: 'Confirmer', loading: 'Chargement…', error: 'Erreur',
    success: 'Succès', refresh: 'Actualiser', settings: 'Paramètres',
    logout: 'Déconnexion', back: 'Retour', all: 'Tout', yes: 'Oui', no: 'Non',
  },
  auth: {
    signIn: 'Connexion', register: "S'inscrire", signOut: 'Déconnexion',
    username: "Nom d'utilisateur", email: 'E-mail', password: 'Mot de passe',
  },
};

const de = {
  common: {
    save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten',
    close: 'Schließen', loading: 'Laden…', error: 'Fehler', success: 'Erfolg',
    settings: 'Einstellungen', logout: 'Abmelden', back: 'Zurück', all: 'Alle',
  },
  auth: {
    signIn: 'Anmelden', register: 'Registrieren',
    username: 'Benutzername', email: 'E-Mail', password: 'Passwort',
  },
};

const ja = {
  common: {
    save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集',
    close: '閉じる', loading: '読み込み中…', error: 'エラー', success: '成功',
    settings: '設定', logout: 'ログアウト', back: '戻る', all: 'すべて',
  },
  auth: {
    signIn: 'ログイン', register: '登録', username: 'ユーザー名',
    email: 'メール', password: 'パスワード',
  },
};

export const resources = { en, es, fr, de, ja };

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      Object.entries(resources).map(([lang, namespaces]) => [
        lang,
        Object.fromEntries(Object.entries(namespaces).map(([ns, vals]) => [ns, vals]))
      ])
    ),
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'analytics', 'security', 'payments'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nexus:language',
    },
  });

export function getLanguageDir(code) {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.rtl ? 'rtl' : 'ltr';
}

export async function autoTranslate(text, targetLang, sourceLang = 'en') {
  if (targetLang === sourceLang) return text;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translated || text;
  } catch {
    return text;
  }
}

export default i18n;
