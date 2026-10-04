/**
 * src/i18n/index.js
 * Multi-language & regional support with auto-translate via Google Cloud Translation.
 * Supports: en, es, fr, de, pt, zh, ja, ko, ar, hi, ru + any locale via API.
 * Updated: 2026-10-04
 */

export const SUPPORTED_LOCALES = {
  en:    { name: 'English',    nativeName: 'English',    dir: 'ltr', flag: '🇺🇸' },
  es:    { name: 'Spanish',    nativeName: 'Español',    dir: 'ltr', flag: '🇪🇸' },
  fr:    { name: 'French',     nativeName: 'Français',   dir: 'ltr', flag: '🇫🇷' },
  de:    { name: 'German',     nativeName: 'Deutsch',    dir: 'ltr', flag: '🇩🇪' },
  pt:    { name: 'Portuguese', nativeName: 'Português',  dir: 'ltr', flag: '🇧🇷' },
  zh:    { name: 'Chinese',    nativeName: '中文',        dir: 'ltr', flag: '🇨🇳' },
  ja:    { name: 'Japanese',   nativeName: '日本語',      dir: 'ltr', flag: '🇯🇵' },
  ko:    { name: 'Korean',     nativeName: '한국어',      dir: 'ltr', flag: '🇰🇷' },
  ar:    { name: 'Arabic',     nativeName: 'العربية',     dir: 'rtl', flag: '🇸🇦' },
  hi:    { name: 'Hindi',      nativeName: 'हिन्दी',      dir: 'ltr', flag: '🇮🇳' },
  ru:    { name: 'Russian',    nativeName: 'Русский',    dir: 'ltr', flag: '🇷🇺' },
  it:    { name: 'Italian',    nativeName: 'Italiano',   dir: 'ltr', flag: '🇮🇹' },
  nl:    { name: 'Dutch',      nativeName: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  pl:    { name: 'Polish',     nativeName: 'Polski',     dir: 'ltr', flag: '🇵🇱' },
  tr:    { name: 'Turkish',    nativeName: 'Türkçe',     dir: 'ltr', flag: '🇹🇷' },
  sv:    { name: 'Swedish',    nativeName: 'Svenska',    dir: 'ltr', flag: '🇸🇪' },
};

// Built-in translations for core UI strings
const TRANSLATIONS = {
  en: {
    'app.name':           'Nexus AI Pro',
    'nav.analytics':      'Analytics',
    'nav.security':       'Security',
    'nav.projects':       'Projects',
    'nav.settings':       'Settings',
    'auth.signIn':        'Sign In',
    'auth.register':      'Create Account',
    'auth.password':      'Password',
    'auth.email':         'Email',
    'auth.username':      'Username',
    'auth.forgotPassword':'Forgot password?',
    'auth.mfa':           'Two-Factor Authentication',
    'payment.subscribe':  'Subscribe',
    'payment.monthly':    '/month',
    'payment.free':       'Free',
    'security.scan':      'Run Scan',
    'security.secure':    'Secure',
    'common.loading':     'Loading…',
    'common.error':       'An error occurred',
    'common.save':        'Save',
    'common.cancel':      'Cancel',
    'common.confirm':     'Confirm',
  },
  es: {
    'app.name':           'Nexus AI Pro',
    'nav.analytics':      'Analíticas',
    'nav.security':       'Seguridad',
    'nav.projects':       'Proyectos',
    'nav.settings':       'Configuración',
    'auth.signIn':        'Iniciar sesión',
    'auth.register':      'Crear cuenta',
    'auth.password':      'Contraseña',
    'auth.email':         'Correo electrónico',
    'auth.username':      'Nombre de usuario',
    'auth.forgotPassword':'¿Olvidaste tu contraseña?',
    'auth.mfa':           'Autenticación de dos factores',
    'payment.subscribe':  'Suscribirse',
    'payment.monthly':    '/mes',
    'payment.free':       'Gratis',
    'security.scan':      'Escanear',
    'security.secure':    'Seguro',
    'common.loading':     'Cargando…',
    'common.error':       'Ocurrió un error',
    'common.save':        'Guardar',
    'common.cancel':      'Cancelar',
    'common.confirm':     'Confirmar',
  },
  fr: {
    'app.name':           'Nexus AI Pro',
    'nav.analytics':      'Analytiques',
    'nav.security':       'Sécurité',
    'nav.projects':       'Projets',
    'nav.settings':       'Paramètres',
    'auth.signIn':        'Se connecter',
    'auth.register':      'Créer un compte',
    'auth.password':      'Mot de passe',
    'auth.email':         'Adresse e-mail',
    'auth.username':      "Nom d'utilisateur",
    'auth.forgotPassword':'Mot de passe oublié ?',
    'auth.mfa':           'Authentification à deux facteurs',
    'payment.subscribe':  "S'abonner",
    'payment.monthly':    '/mois',
    'payment.free':       'Gratuit',
    'security.scan':      'Analyser',
    'security.secure':    'Sécurisé',
    'common.loading':     'Chargement…',
    'common.error':       'Une erreur est survenue',
    'common.save':        'Enregistrer',
    'common.cancel':      'Annuler',
    'common.confirm':     'Confirmer',
  },
  de: {
    'app.name':           'Nexus AI Pro',
    'nav.analytics':      'Analytik',
    'nav.security':       'Sicherheit',
    'nav.projects':       'Projekte',
    'nav.settings':       'Einstellungen',
    'auth.signIn':        'Anmelden',
    'auth.register':      'Konto erstellen',
    'auth.password':      'Passwort',
    'auth.email':         'E-Mail',
    'auth.username':      'Benutzername',
    'auth.forgotPassword':'Passwort vergessen?',
    'auth.mfa':           'Zwei-Faktor-Authentifizierung',
    'payment.subscribe':  'Abonnieren',
    'payment.monthly':    '/Monat',
    'payment.free':       'Kostenlos',
    'security.scan':      'Scannen',
    'security.secure':    'Sicher',
    'common.loading':     'Laden…',
    'common.error':       'Ein Fehler ist aufgetreten',
    'common.save':        'Speichern',
    'common.cancel':      'Abbrechen',
    'common.confirm':     'Bestätigen',
  },
  zh: {
    'app.name':           'Nexus AI Pro',
    'nav.analytics':      '分析',
    'nav.security':       '安全',
    'nav.projects':       '项目',
    'nav.settings':       '设置',
    'auth.signIn':        '登录',
    'auth.register':      '创建账户',
    'auth.password':      '密码',
    'auth.email':         '电子邮件',
    'auth.username':      '用户名',
    'auth.forgotPassword':'忘记密码？',
    'auth.mfa':           '双因素认证',
    'payment.subscribe':  '订阅',
    'payment.monthly':    '/月',
    'payment.free':       '免费',
    'security.scan':      '扫描',
    'security.secure':    '安全',
    'common.loading':     '加载中…',
    'common.error':       '发生错误',
    'common.save':        '保存',
    'common.cancel':      '取消',
    'common.confirm':     '确认',
  },
};

let currentLocale = 'en';
const autoTranslateCache = new Map();

export function setLocale(locale) {
  if (SUPPORTED_LOCALES[locale]) {
    currentLocale = locale;
    // Apply RTL direction
    document.documentElement.dir = SUPPORTED_LOCALES[locale].dir;
    document.documentElement.lang = locale;
  }
}

export function getLocale() {
  return currentLocale;
}

export function detectLocale() {
  const browser = navigator.language || navigator.userLanguage || 'en';
  const code = browser.split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES[code] ? code : 'en';
}

export function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLocale] ?? TRANSLATIONS.en;
  let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  Object.entries(params).forEach(([k, v]) => {
    str = str.replace(new RegExp(`{{${k}}}`, 'g'), v);
  });
  return str;
}

// Auto-translate any string via server proxy (avoids exposing API key client-side)
export async function autoTranslate(text, targetLocale = currentLocale, sourceLocale = 'en') {
  if (targetLocale === sourceLocale) return text;
  const cacheKey = `${sourceLocale}:${targetLocale}:${text}`;
  if (autoTranslateCache.has(cacheKey)) return autoTranslateCache.get(cacheKey);

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: sourceLocale, target: targetLocale }),
    });
    if (!res.ok) throw new Error('Translation API error');
    const { translatedText } = await res.json();
    autoTranslateCache.set(cacheKey, translatedText);
    return translatedText;
  } catch {
    return text; // fallback: return original
  }
}

// Format numbers, dates, and currencies per locale
export function formatNumber(n, options = {}) {
  return new Intl.NumberFormat(currentLocale, options).format(n);
}

export function formatDate(date, options = { dateStyle: 'medium' }) {
  return new Intl.DateTimeFormat(currentLocale, options).format(date instanceof Date ? date : new Date(date));
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat(currentLocale, { style: 'currency', currency }).format(amount);
}

// React hook
import { useState, useEffect } from 'react';
export function useLocale() {
  const [locale, setLocaleState] = useState(currentLocale);
  const changeLocale = locale => {
    setLocale(locale);
    setLocaleState(locale);
  };
  return { locale, setLocale: changeLocale, t, locales: SUPPORTED_LOCALES };
}
