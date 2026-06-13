// ================================================
// NEXUS AI PRO - Internationalization API
// Updated: 2026-06-13
// ------------------------------------------------
// Languages: en, es, fr, de, pt, ja, ko, zh, ar, hi
// Auto-translate: via Google Translate API / LibreTranslate
// RTL support: ar, he, fa, ur
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Supported locales
// Supported locales (named export)
export const LOCALES = {
  en: { name: 'English',    direction: 'ltr', region: 'US' },
  es: { name: 'Spanish',    direction: 'ltr', region: 'ES' },
  fr: { name: 'French',     direction: 'ltr', region: 'FR' },
  de: { name: 'German',     direction: 'ltr', region: 'DE' },
  pt: { name: 'Portuguese', direction: 'ltr', region: 'BR' },
  ja: { name: 'Japanese',   direction: 'ltr', region: 'JP' },
  ko: { name: 'Korean',     direction: 'ltr', region: 'KR' },
  zh: { name: 'Chinese',    direction: 'ltr', region: 'CN' },
  ar: { name: 'Arabic',     direction: 'rtl', region: 'SA' },
  hi: { name: 'Hindi',      direction: 'ltr', region: 'IN' },
  ru: { name: 'Russian',    direction: 'ltr', region: 'RU' },
  it: { name: 'Italian',    direction: 'ltr', region: 'IT' },
  nl: { name: 'Dutch',      direction: 'ltr', region: 'NL' },
  tr: { name: 'Turkish',    direction: 'ltr', region: 'TR' },
  pl: { name: 'Polish',     direction: 'ltr', region: 'PL' },
};

// Built-in English baseline translations
const BASELINE_EN = {
  common: {
    'app.name':          'Nexus AI Pro',
    'nav.home':          'Home',
    'nav.analytics':     'Analytics',
    'nav.security':      'Security',
    'nav.projects':      'Projects',
    'nav.settings':      'Settings',
    'nav.logout':        'Log Out',
    'auth.login':        'Sign In',
    'auth.register':     'Create Account',
    'auth.logout':       'Sign Out',
    'auth.email':        'Email Address',
    'auth.password':     'Password',
    'auth.username':     'Username',
    'auth.2fa.title':    '2-Factor Authentication',
    'auth.2fa.code':     'Enter your 6-digit code',
    'auth.biometric':    'Sign in with biometrics',
    'password.min':      'Minimum 13 characters',
    'password.upper':    'Include uppercase letters',
    'password.lower':    'Include lowercase letters',
    'password.digit':    'Include a number',
    'password.special':  'Include a special character',
    'subscription.free': 'Free',
    'subscription.pro':  'Pro',
    'subscription.ent':  'Enterprise',
    'btn.save':          'Save',
    'btn.cancel':        'Cancel',
    'btn.delete':        'Delete',
    'btn.edit':          'Edit',
    'btn.add':           'Add',
    'btn.connect':       'Connect',
    'btn.disconnect':    'Disconnect',
    'btn.scan':          'Run Scan',
    'btn.export':        'Export',
    'loading':           'Loading...',
    'error.generic':     'Something went wrong. Please try again.',
    'error.unauthorized':'Please sign in to continue.',
    'success':           'Success!',
  },
  analytics: {
    'analytics.title':       'Analytics Dashboard',
    'analytics.views':       'Views',
    'analytics.likes':       'Likes',
    'analytics.reach':       'Reach',
    'analytics.followers':   'Followers',
    'analytics.retention':   'Retention Rate',
    'analytics.engagement':  'Engagement Rate',
    'analytics.trending':    'Trending Content',
    'analytics.realtime':    'Real-Time Metrics',
    'analytics.connect':     'Connect Social Account',
  },
  security: {
    'security.title':       'Security Dashboard',
    'security.score':       'Security Score',
    'security.scan':        'Run Security Scan',
    'security.threats':     'Threats Detected',
    'security.patches':     'Patches Applied',
    'security.encryption':  'Encryption Status',
    'security.2fa':         '2FA Status',
    'security.network':     'Network Issues',
    'security.device':      'Device Issues',
    'security.realtime':    'Real-Time Monitoring',
  },
  projects: {
    'projects.title':       'Projects',
    'projects.new':         'New Project',
    'projects.type.coding': 'Coding',
    'projects.type.game':   'Game Development',
    'projects.type.ar_vr':  'AR / VR',
    'projects.type.3d':     '3D Project',
    'projects.progress':    'Progress',
    'projects.milestone':   'Milestone',
    'projects.commits':     'Commits',
  },
};

// Translation store: locale -> ns -> key -> value
const translationStore = new Map();

// Seed English
translationStore.set('en', BASELINE_EN);

// ── Detect locale from request ────────────────────
export function detectLocale(req) {
  // 1. Explicit query param
  if (req.query.lang && LOCALES[req.query.lang]) return req.query.lang;
  // 2. Accept-Language header
  const acceptLang = req.headers['accept-language'];
  if (acceptLang) {
    const langs = acceptLang.split(',').map(l => l.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const l of langs) {
      if (LOCALES[l]) return l;
    }
  }
  // 3. Fallback
  return 'en';
}

// ── Auto-translate via Google Translate ───────────
async function googleTranslate(text, targetLang, sourceLang = 'en') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return null;

  const url = new URL('https://translation.googleapis.com/language/translate/v2');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target: targetLang, source: sourceLang, format: 'text' }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText || null;
}

// ── Routes ────────────────────────────────────────

// GET /api/i18n/locales
router.get('/locales', (req, res) => {
  const locales = Object.entries(LOCALES).map(([code, info]) => ({ code, ...info }));
  res.json({ locales });
});

// GET /api/i18n/translations/:locale
router.get('/translations/:locale', (req, res) => {
  const { locale } = req.params;
  const { ns } = req.query;

  if (!LOCALES[locale]) {
    return res.status(400).json({ error: 'Unsupported locale', supported: Object.keys(LOCALES) });
  }

  const stored  = translationStore.get(locale) || {};
  const english = translationStore.get('en') || BASELINE_EN;

  // Merge english fallback for missing keys
  const result = {};
  const namespaces = ns ? [ns] : Object.keys(english);

  for (const namespace of namespaces) {
    result[namespace] = {
      ...english[namespace],
      ...(stored[namespace] || {}),
    };
  }

  res.json({
    locale,
    direction: LOCALES[locale].direction,
    translations: ns ? result[ns] : result,
  });
});

// POST /api/i18n/translations/:locale  — upsert translations (admin/dev only)
router.post('/translations/:locale', async (req, res) => {
  const { locale } = req.params;
  const { ns = 'common', translations } = req.body;

  if (!LOCALES[locale]) return res.status(400).json({ error: 'Unsupported locale' });
  if (!translations || typeof translations !== 'object') {
    return res.status(400).json({ error: 'translations object required' });
  }

  const stored = translationStore.get(locale) || {};
  stored[ns] = { ...(stored[ns] || {}), ...translations };
  translationStore.set(locale, stored);

  res.json({ locale, ns, updated: Object.keys(translations).length });
});

// POST /api/i18n/translate  — translate arbitrary text
router.post('/translate', async (req, res) => {
  const { text, targetLang, sourceLang = 'en', context } = req.body;

  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });
  if (!targetLang || !LOCALES[targetLang]) {
    return res.status(400).json({ error: 'Valid targetLang required', supported: Object.keys(LOCALES) });
  }
  if (targetLang === sourceLang) return res.json({ translation: text, cached: false });

  // Try Google Translate
  const translated = await googleTranslate(text, targetLang, sourceLang);
  if (translated) return res.json({ translation: translated, provider: 'google', cached: false });

  // Fallback: return source text
  res.json({ translation: text, provider: 'fallback', note: 'Translation service unavailable' });
});

// POST /api/i18n/translate/bulk  — bulk translate
router.post('/translate/bulk', async (req, res) => {
  const { texts, targetLang, sourceLang = 'en' } = req.body;
  if (!Array.isArray(texts) || texts.length === 0) return res.status(400).json({ error: 'texts array required' });
  if (texts.length > 100) return res.status(400).json({ error: 'Maximum 100 texts per bulk request' });
  if (!targetLang || !LOCALES[targetLang]) return res.status(400).json({ error: 'Valid targetLang required' });

  const results = await Promise.all(texts.map(async text => {
    const t = await googleTranslate(text, targetLang, sourceLang);
    return { source: text, translation: t || text };
  }));

  res.json({ translations: results, targetLang });
});

// GET /api/i18n/detect  — detect language of input text
router.get('/detect', async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'text query param required' });

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return res.json({ detected: 'en', confidence: 0, note: 'Detection service not configured' });
  }

  try {
    const url = new URL('https://translation.googleapis.com/language/translate/v2/detect');
    url.searchParams.set('key', apiKey);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });
    const data = await response.json();
    const detection = data.data?.detections?.[0]?.[0];
    res.json({ detected: detection?.language, confidence: detection?.confidence });
  } catch {
    res.json({ detected: 'en', confidence: 0, note: 'Detection failed' });
  }
});

// GET /api/i18n/regions  — region-specific config
router.get('/regions', (req, res) => {
  const regions = {
    US: { currency: 'USD', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', measurementSystem: 'imperial' },
    GB: { currency: 'GBP', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric' },
    EU: { currency: 'EUR', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric' },
    JP: { currency: 'JPY', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', measurementSystem: 'metric' },
    CN: { currency: 'CNY', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', measurementSystem: 'metric' },
    IN: { currency: 'INR', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric' },
    BR: { currency: 'BRL', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric' },
    SA: { currency: 'SAR', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric' },
  };
  res.json({ regions });
});

export default router;
