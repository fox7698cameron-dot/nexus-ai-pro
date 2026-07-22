// src/i18n/index.js
// 2026-07-22 | Multi-language support — locale store, translation middleware, auto-translate stub

import express from 'express';

// ─── Supported locales ────────────────────────────────────────────────────────

export const LOCALES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  uk: 'Українська',
};

// ─── Translations (base strings — extend per locale) ──────────────────────────

const translations = {
  en: {
    welcome: 'Welcome to Nexus AI Pro',
    login: 'Log in',
    register: 'Register',
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    security: 'Security',
    settings: 'Settings',
    logout: 'Log out',
    error_generic: 'Something went wrong. Please try again.',
    password_too_short: 'Password must be at least 13 characters',
    mfa_required: 'Multi-factor authentication required',
  },
  es: {
    welcome: 'Bienvenido a Nexus AI Pro',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    dashboard: 'Panel de control',
    analytics: 'Analítica',
    security: 'Seguridad',
    settings: 'Configuración',
    logout: 'Cerrar sesión',
    error_generic: 'Algo salió mal. Por favor inténtelo de nuevo.',
    password_too_short: 'La contraseña debe tener al menos 13 caracteres',
    mfa_required: 'Se requiere autenticación multifactor',
  },
  fr: {
    welcome: 'Bienvenue sur Nexus AI Pro',
    login: 'Se connecter',
    register: "S'inscrire",
    dashboard: 'Tableau de bord',
    analytics: 'Analytique',
    security: 'Sécurité',
    settings: 'Paramètres',
    logout: 'Se déconnecter',
    error_generic: "Quelque chose s'est mal passé. Veuillez réessayer.",
    password_too_short: 'Le mot de passe doit contenir au moins 13 caractères',
    mfa_required: "Authentification multifacteur requise",
  },
  de: {
    welcome: 'Willkommen bei Nexus AI Pro',
    login: 'Anmelden',
    register: 'Registrieren',
    dashboard: 'Dashboard',
    analytics: 'Analytik',
    security: 'Sicherheit',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    error_generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    password_too_short: 'Das Passwort muss mindestens 13 Zeichen lang sein',
    mfa_required: 'Multi-Faktor-Authentifizierung erforderlich',
  },
};

// ─── Locale detection middleware ──────────────────────────────────────────────

export function detectLocale(req, res, next) {
  const header = req.headers['accept-language'] || '';
  const query = req.query.lang;
  const locale = (query || header.split(',')[0]?.split('-')[0] || 'en').toLowerCase();
  req.locale = translations[locale] ? locale : 'en';
  next();
}

// ─── Translation helper ───────────────────────────────────────────────────────

export function t(locale, key) {
  return (translations[locale] || translations.en)[key] || key;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const router = express.Router();

router.get('/locales', (req, res) => {
  return res.json({ locales: LOCALES, supported: Object.keys(LOCALES) });
});

router.get('/strings/:locale', (req, res) => {
  const { locale } = req.params;
  if (!translations[locale]) return res.status(404).json({ error: 'Locale not found' });
  return res.json({ locale, strings: translations[locale] });
});

router.get('/strings', (req, res) => {
  return res.json(translations);
});

// Auto-translate via AI (production: call Claude/Google Translate API)
router.post('/translate', async (req, res) => {
  const { text, targetLocale, sourceLocale = 'en' } = req.body;
  if (!text || !targetLocale) return res.status(400).json({ error: 'text and targetLocale required' });
  if (!LOCALES[targetLocale]) return res.status(400).json({ error: 'Unsupported target locale' });

  // Stub: in production call Claude API or Google Translate
  // Example: POST to Anthropic with prompt "Translate to {locale}: {text}"
  return res.json({
    original: text,
    translated: text,
    sourceLocale,
    targetLocale,
    provider: 'stub',
    note: 'Wire ANTHROPIC_API_KEY or GOOGLE_TRANSLATE_KEY for live translation',
  });
});

export default router;
