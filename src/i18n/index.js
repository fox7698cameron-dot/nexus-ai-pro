// src/i18n/index.js
// 2026-07-27 | Nexus AI Pro — Internationalisation & Auto-translate
// Supports en, es, fr, de, ja, ko, zh, pt, ar, ru, hi, it, nl
// Auto-translate uses configured translation service (DeepL or Google Translate)

const SUPPORTED_LANGUAGES = {
  en: { name: 'English', dir: 'ltr', region: 'US' },
  es: { name: 'Español', dir: 'ltr', region: 'ES' },
  fr: { name: 'Français', dir: 'ltr', region: 'FR' },
  de: { name: 'Deutsch', dir: 'ltr', region: 'DE' },
  ja: { name: '日本語', dir: 'ltr', region: 'JP' },
  ko: { name: '한국어', dir: 'ltr', region: 'KR' },
  zh: { name: '中文', dir: 'ltr', region: 'CN' },
  pt: { name: 'Português', dir: 'ltr', region: 'BR' },
  ar: { name: 'العربية', dir: 'rtl', region: 'SA' },
  ru: { name: 'Русский', dir: 'ltr', region: 'RU' },
  hi: { name: 'हिन्दी', dir: 'ltr', region: 'IN' },
  it: { name: 'Italiano', dir: 'ltr', region: 'IT' },
  nl: { name: 'Nederlands', dir: 'ltr', region: 'NL' },
};

// Base English strings
const BASE_STRINGS = {
  'nav.dashboard': 'Dashboard',
  'nav.analytics': 'Analytics',
  'nav.security': 'Security',
  'nav.gaming': 'Game Dev',
  'nav.projects': 'Projects',
  'nav.settings': 'Settings',
  'nav.logout': 'Logout',
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.password': 'Password',
  'auth.username': 'Username',
  'auth.email': 'Email',
  'auth.mfa': 'Two-Factor Code',
  'auth.biometric': 'Use Biometric',
  'auth.role.user': 'User',
  'auth.role.moderator': 'Moderator',
  'auth.role.developer': 'Developer',
  'auth.role.admin': 'Admin',
  'dashboard.welcome': 'Welcome back',
  'dashboard.metrics': 'Live Metrics',
  'security.scan': 'Run Security Scan',
  'security.score': 'Security Score',
  'security.threats': 'Active Threats',
  'analytics.reach': 'Total Reach',
  'analytics.views': 'Total Views',
  'analytics.engagement': 'Engagement Rate',
  'analytics.followers': 'Followers',
  'gaming.projects': 'Projects',
  'gaming.achievements': 'Achievements',
  'gaming.builds': 'Builds',
  'subscription.upgrade': 'Upgrade Plan',
  'subscription.current': 'Current Plan',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.success': 'Success',
};

const translationCache = new Map();

async function autoTranslate(text, targetLang, sourceLang = 'en') {
  if (targetLang === sourceLang) return text;
  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  // Try DeepL
  const deeplKey = process.env.DEEPL_API_KEY;
  if (deeplKey) {
    try {
      const r = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${deeplKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text], target_lang: targetLang.toUpperCase(), source_lang: sourceLang.toUpperCase() }),
      });
      if (r.ok) {
        const data = await r.json();
        const translated = data.translations?.[0]?.text || text;
        translationCache.set(cacheKey, translated);
        return translated;
      }
    } catch { /* fall through */ }
  }

  // Try Google Translate
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (googleKey) {
    try {
      const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: targetLang, source: sourceLang, format: 'text' }),
      });
      if (r.ok) {
        const data = await r.json();
        const translated = data.data?.translations?.[0]?.translatedText || text;
        translationCache.set(cacheKey, translated);
        return translated;
      }
    } catch { /* fall through */ }
  }

  // Fallback: return original
  return text;
}

function getStrings(lang = 'en') {
  if (!SUPPORTED_LANGUAGES[lang]) lang = 'en';
  return { ...BASE_STRINGS };
}

export { SUPPORTED_LANGUAGES, BASE_STRINGS, autoTranslate, getStrings };
