// src/i18n/index.js
// Created: 2026-10-18
// i18n framework with locale detection, auto-translation stub, and RTL support

const SUPPORTED_LOCALES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'nl', 'pl', 'tr', 'sv', 'da', 'fi', 'nb', 'cs',
];

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

// Base English strings
const strings = {
  en: {
    'app.title': 'Nexus AI Pro',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.mfa': 'Two-Factor Code',
    'auth.biometric': 'Use Biometrics',
    'auth.forgot': 'Forgot password?',
    'dashboard.overview': 'Overview',
    'dashboard.analytics': 'Analytics',
    'dashboard.security': 'Security',
    'dashboard.projects': 'Projects',
    'dashboard.settings': 'Settings',
    'analytics.followers': 'Followers',
    'analytics.views': 'Views',
    'analytics.likes': 'Likes',
    'analytics.reach': 'Reach',
    'analytics.retention': 'Retention',
    'security.status': 'Security Status',
    'security.scan': 'Run Scan',
    'security.threats': 'Threats Blocked',
    'subscription.free': 'Free',
    'subscription.pro': 'Pro',
    'subscription.team': 'Team',
    'subscription.enterprise': 'Enterprise',
    'subscription.upgrade': 'Upgrade Plan',
    'error.generic': 'Something went wrong. Please try again.',
    'error.unauthorized': 'You are not authorized to perform this action.',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.loading': 'Loading…',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.refresh': 'Refresh',
  },
};

// Lazy-load locale bundles (production: fetch from CDN or i18n service)
const loaded = new Set(['en']);
const pending = new Map();

async function loadLocale(locale) {
  if (loaded.has(locale)) return;
  if (pending.has(locale)) return pending.get(locale);

  const promise = (async () => {
    try {
      // In production: fetch(`/locales/${locale}.json`)
      // For now: auto-translate via Google Translate API using process.env.GOOGLE_TRANSLATE_API_KEY
      if (process.env.GOOGLE_TRANSLATE_API_KEY && typeof fetch !== 'undefined') {
        const entries = Object.entries(strings.en);
        const texts = entries.map(([, v]) => v);
        const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: texts, target: locale, format: 'text' }),
        });
        if (response.ok) {
          const data = await response.json();
          const translated = data.data.translations.map(t => t.translatedText);
          strings[locale] = Object.fromEntries(entries.map(([k], i) => [k, translated[i]]));
          loaded.add(locale);
          return;
        }
      }
      // Fallback: use English
      strings[locale] = { ...strings.en };
      loaded.add(locale);
    } catch {
      strings[locale] = { ...strings.en };
      loaded.add(locale);
    }
  })();

  pending.set(locale, promise);
  await promise;
  pending.delete(locale);
}

function t(key, locale = 'en', vars = {}) {
  const dict = strings[locale] || strings.en;
  let str = dict[key] || strings.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{{${k}}}`, v);
  }
  return str;
}

function isRTL(locale) {
  return RTL_LOCALES.has(locale);
}

function detectLocale(req) {
  const acceptLang = req?.headers?.['accept-language'] || '';
  const primary = acceptLang.split(',')[0]?.split(';')[0]?.split('-')[0]?.toLowerCase();
  return SUPPORTED_LOCALES.includes(primary) ? primary : 'en';
}

export { t, loadLocale, detectLocale, isRTL, SUPPORTED_LOCALES };
