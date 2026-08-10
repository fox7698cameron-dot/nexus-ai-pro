// ================================================
// NEXUS AI PRO - i18n Module
// Multi-language & Regional Support
// Auto-translate via Google Translate API
// 2026-08-10 | Version 2.1.0
// ================================================

/**
 * Supported languages with locale codes and RTL flags.
 * Add more by extending this map and the TRANSLATIONS object.
 */
export const LANGUAGES = {
  en: { label: 'English',    native: 'English',    locale: 'en-US', rtl: false, flag: '🇺🇸' },
  es: { label: 'Spanish',    native: 'Español',    locale: 'es-ES', rtl: false, flag: '🇪🇸' },
  fr: { label: 'French',     native: 'Français',   locale: 'fr-FR', rtl: false, flag: '🇫🇷' },
  de: { label: 'German',     native: 'Deutsch',    locale: 'de-DE', rtl: false, flag: '🇩🇪' },
  it: { label: 'Italian',    native: 'Italiano',   locale: 'it-IT', rtl: false, flag: '🇮🇹' },
  pt: { label: 'Portuguese', native: 'Português',  locale: 'pt-BR', rtl: false, flag: '🇧🇷' },
  ja: { label: 'Japanese',   native: '日本語',      locale: 'ja-JP', rtl: false, flag: '🇯🇵' },
  ko: { label: 'Korean',     native: '한국어',      locale: 'ko-KR', rtl: false, flag: '🇰🇷' },
  zh: { label: 'Chinese',    native: '中文',        locale: 'zh-CN', rtl: false, flag: '🇨🇳' },
  ar: { label: 'Arabic',     native: 'العربية',     locale: 'ar-SA', rtl: true,  flag: '🇸🇦' },
  ru: { label: 'Russian',    native: 'Русский',    locale: 'ru-RU', rtl: false, flag: '🇷🇺' },
  hi: { label: 'Hindi',      native: 'हिन्दी',      locale: 'hi-IN', rtl: false, flag: '🇮🇳' },
  tr: { label: 'Turkish',    native: 'Türkçe',     locale: 'tr-TR', rtl: false, flag: '🇹🇷' },
  nl: { label: 'Dutch',      native: 'Nederlands', locale: 'nl-NL', rtl: false, flag: '🇳🇱' },
  pl: { label: 'Polish',     native: 'Polski',     locale: 'pl-PL', rtl: false, flag: '🇵🇱' },
  sv: { label: 'Swedish',    native: 'Svenska',    locale: 'sv-SE', rtl: false, flag: '🇸🇪' },
  da: { label: 'Danish',     native: 'Dansk',      locale: 'da-DK', rtl: false, flag: '🇩🇰' },
  fi: { label: 'Finnish',    native: 'Suomi',      locale: 'fi-FI', rtl: false, flag: '🇫🇮' },
  vi: { label: 'Vietnamese', native: 'Tiếng Việt', locale: 'vi-VN', rtl: false, flag: '🇻🇳' },
  id: { label: 'Indonesian', native: 'Bahasa',     locale: 'id-ID', rtl: false, flag: '🇮🇩' }
};

/**
 * Base translations (English) — other languages fall back to EN
 * if a key is missing. For full translations, use autoTranslate().
 */
export const TRANSLATIONS = {
  en: {
    // Navigation
    nav: {
      home: 'Home', chat: 'Chat', analytics: 'Analytics', security: 'Security',
      projects: 'Projects', games: 'Games', billing: 'Billing', settings: 'Settings',
      admin: 'Admin', logout: 'Sign Out'
    },
    // Common UI
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add',
      loading: 'Loading…', error: 'An error occurred', success: 'Success!',
      confirm: 'Confirm', close: 'Close', search: 'Search', filter: 'Filter',
      refresh: 'Refresh', create: 'Create', update: 'Update', submit: 'Submit',
      back: 'Back', next: 'Next', previous: 'Previous', copy: 'Copy', share: 'Share'
    },
    // Auth
    auth: {
      login: 'Sign In', register: 'Create Account', logout: 'Sign Out',
      email: 'Email address', password: 'Password', username: 'Username',
      displayName: 'Display Name', mfaCode: 'Authenticator code',
      forgotPassword: 'Forgot password?', resetPassword: 'Reset Password',
      confirmPassword: 'Confirm Password', passwordStrength: 'Password strength',
      passwordWeak: 'Weak', passwordFair: 'Fair', passwordStrong: 'Strong',
      passwordVeryStrong: 'Very Strong',
      passwordReq: 'Must be ≥13 characters with uppercase, lowercase, digit, and special character',
      mfaSetup: 'Set up Two-Factor Authentication',
      biometric: 'Biometric Login', touchId: 'Touch ID', faceId: 'Face ID',
      retinalScan: 'Retinal Scan', enableMfa: 'Enable 2FA', disableMfa: 'Disable 2FA'
    },
    // Dashboard
    dashboard: {
      overview: 'Overview', welcome: 'Welcome back', role: 'Role',
      totalUsers: 'Total Users', activeProjects: 'Active Projects',
      securityScore: 'Security Score', lastLogin: 'Last Login',
      sessionActive: 'Session Active'
    },
    // Analytics
    analytics: {
      title: 'Analytics Dashboard', totalReach: 'Total Reach', totalViews: 'Total Views',
      totalLikes: 'Total Likes', platforms: 'Platforms', followers: 'Followers',
      views: 'Views', likes: 'Likes', comments: 'Comments', shares: 'Shares',
      reach: 'Reach', retention: 'Retention', liveData: 'Live', awaitingData: 'Awaiting data',
      refresh: 'Refresh'
    },
    // Security
    security: {
      title: 'Security Dashboard', score: 'Security Score', status: 'Status',
      secure: 'Secure', vulnerable: 'Vulnerable', scanning: 'Scanning…',
      runScan: 'Run Scan', networkScan: 'Network Scan', patchVuln: 'Patch',
      encryptionActive: 'Encryption Active', threatsBlocked: 'Threats Blocked',
      auditLog: 'Audit Log', lastScan: 'Last Scan', vulnerabilities: 'Vulnerabilities',
      onDeviceChecks: 'On-Device Checks', encryptionHealth: 'Encryption Health'
    },
    // Projects
    projects: {
      title: 'Project Tracker', newProject: 'New Project', noProjects: 'No projects yet',
      progress: 'Progress', status: 'Status', milestones: 'Milestones',
      type: { coding: 'Coding', game: 'Game Dev', arvr: 'AR/VR', '3d': '3D / CAD' },
      statuses: { active: 'Active', paused: 'Paused', complete: 'Complete', archived: 'Archived' }
    },
    // Payments
    payment: {
      title: 'Subscription & Payments', subscribe: 'Subscribe', monthly: 'Monthly',
      annual: 'Annual', perMonth: '/month', cancelAnytime: 'Cancel anytime',
      giftCard: 'Gift Card', applyGiftCard: 'Apply Gift Card', cryptoAccepted: 'Crypto accepted',
      plans: { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' },
      securePayment: 'Secure payment powered by Stripe'
    },
    // Games
    games: {
      title: 'Game Connectors', connect: 'Connect', connected: 'Connected',
      achievements: 'Achievements', progress: 'Progress', games: 'Games',
      logAchievement: 'Log Achievement', updateProgress: 'Update Progress'
    },
    // Errors
    errors: {
      networkError: 'Network error — check your connection',
      authRequired: 'Authentication required',
      permissionDenied: 'Permission denied',
      notFound: 'Not found',
      serverError: 'Server error — try again later',
      invalidInput: 'Invalid input'
    }
  }
};

/**
 * Auto-translate any string via the server-side Google Translate proxy.
 * Falls back to the original string if the API is unavailable.
 *
 * @param {string} text  - Text to translate
 * @param {string} targetLang - BCP-47 language code (e.g. 'es', 'fr')
 * @param {string} [sourceLang='en'] - Source language
 * @param {string} [authToken] - Optional JWT for authenticated endpoint
 * @returns {Promise<string>}
 */
export async function autoTranslate(text, targetLang, sourceLang = 'en', authToken = null) {
  if (!text || targetLang === sourceLang) return text;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, targetLang, sourceLang })
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translated || text;
  } catch {
    return text;
  }
}

/**
 * Get the browser's preferred language, falling back to 'en'.
 * Maps browser locale (e.g. 'en-US') to our 2-letter code.
 */
export function detectBrowserLanguage() {
  const pref = navigator?.language || 'en';
  const code = pref.split('-')[0].toLowerCase();
  return LANGUAGES[code] ? code : 'en';
}

/**
 * Format a number using the locale's number formatting.
 *
 * @param {number} n
 * @param {string} lang - 2-letter language code
 * @param {Intl.NumberFormatOptions} [opts]
 */
export function formatNumber(n, lang = 'en', opts = {}) {
  const locale = LANGUAGES[lang]?.locale || 'en-US';
  return new Intl.NumberFormat(locale, opts).format(n);
}

/**
 * Format a date using the locale's date formatting.
 *
 * @param {Date|number|string} date
 * @param {string} lang
 * @param {Intl.DateTimeFormatOptions} [opts]
 */
export function formatDate(date, lang = 'en', opts = { dateStyle: 'medium' }) {
  const locale = LANGUAGES[lang]?.locale || 'en-US';
  return new Intl.DateTimeFormat(locale, opts).format(new Date(date));
}

/**
 * Simple flat-key translator.  Falls back to English, then returns the key itself.
 *
 * @param {string} key - dot-separated translation key, e.g. 'auth.login'
 * @param {string} lang
 * @param {Record<string,string>} [vars] - variables to interpolate, e.g. {name:'Alice'}
 * @returns {string}
 */
export function t(key, lang = 'en', vars = {}) {
  const langData = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const keys = key.split('.');
  let val = langData;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) val = val[k];
    else {
      // fallback to English
      let fallback = TRANSLATIONS.en;
      for (const k2 of keys) {
        if (fallback && typeof fallback === 'object' && k2 in fallback) fallback = fallback[k2];
        else return key;
      }
      val = fallback;
      break;
    }
  }
  if (typeof val !== 'string') return key;
  return val.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
}

/**
 * React hook for i18n.
 *
 * @param {string} [initialLang]
 * @returns {{ lang, setLang, t, formatNumber, formatDate, isRTL, languages }}
 */
export function useI18n(initialLang) {
  // Lazy-import React to allow non-React usage of the module
  const { useState, useCallback, useEffect } = require('react');

  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('nexus_lang') || initialLang || detectBrowserLanguage();
    } catch { return initialLang || 'en'; }
  });

  useEffect(() => {
    try { localStorage.setItem('nexus_lang', lang); } catch { /* ignore */ }
    // Update html dir attribute for RTL support
    document.documentElement.setAttribute('lang', LANGUAGES[lang]?.locale || lang);
    document.documentElement.setAttribute('dir', LANGUAGES[lang]?.rtl ? 'rtl' : 'ltr');
  }, [lang]);

  const translate = useCallback((key, vars) => t(key, lang, vars), [lang]);
  const fmtNum = useCallback((n, opts) => formatNumber(n, lang, opts), [lang]);
  const fmtDate = useCallback((d, opts) => formatDate(d, lang, opts), [lang]);

  return {
    lang,
    setLang,
    t: translate,
    formatNumber: fmtNum,
    formatDate: fmtDate,
    isRTL: LANGUAGES[lang]?.rtl || false,
    languages: LANGUAGES
  };
}
