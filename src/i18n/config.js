// Nexus AI Pro - i18n Configuration | Date: 2026-10-22
// Multi-language support with auto-translate capability

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'es', label: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', dir: 'ltr', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', dir: 'ltr', flag: '🇰🇷' },
  { code: 'zh', label: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'pt', label: 'Português', dir: 'ltr', flag: '🇧🇷' },
  { code: 'ar', label: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'it', label: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  { code: 'pl', label: 'Polski', dir: 'ltr', flag: '🇵🇱' },
  { code: 'tr', label: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'sv', label: 'Svenska', dir: 'ltr', flag: '🇸🇪' },
  { code: 'th', label: 'ไทย', dir: 'ltr', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', dir: 'ltr', flag: '🇻🇳' },
];

// Base English strings — override in locale-specific files
export const BASE_STRINGS = {
  // Auth
  login: 'Sign In',
  register: 'Create Account',
  logout: 'Sign Out',
  email: 'Email',
  password: 'Password',
  username: 'Username',
  forgotPassword: 'Forgot Password?',
  mfaCode: 'Verification Code',
  biometricLogin: 'Use Biometrics',

  // Nav
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  security: 'Security',
  projects: 'Projects',
  settings: 'Settings',
  billing: 'Billing',

  // Actions
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  export: 'Export',
  import: 'Import',
  connect: 'Connect',
  disconnect: 'Disconnect',
  refresh: 'Refresh',
  search: 'Search',

  // Status
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Info',
  connected: 'Connected',
  disconnected: 'Disconnected',
  scanning: 'Scanning...',
  processing: 'Processing...',
};

const translationCache = new Map();

/**
 * Detect the user's preferred locale from browser or stored preference.
 */
export function detectLocale() {
  const stored = (() => {
    try {
      return localStorage.getItem('nexus_locale');
    } catch {
      return null;
    }
  })();
  if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) return stored;

  const browser = navigator?.language?.split('-')[0]?.toLowerCase() || 'en';
  if (SUPPORTED_LOCALES.some(l => l.code === browser)) return browser;
  return 'en';
}

/**
 * Fetch locale strings from the server (with in-memory cache).
 * Falls back to English BASE_STRINGS on failure.
 */
export async function loadStrings(locale) {
  if (translationCache.has(locale)) return translationCache.get(locale);

  try {
    const res = await fetch(`/api/i18n/${locale}`);
    if (res.ok) {
      const data = await res.json();
      const merged = { ...BASE_STRINGS, ...data.strings };
      translationCache.set(locale, merged);
      return merged;
    }
  } catch {
    // fall through
  }

  translationCache.set(locale, BASE_STRINGS);
  return BASE_STRINGS;
}

/**
 * Apply RTL / LTR direction and font to the document root.
 */
export function applyLocaleToDOM(localeCode) {
  const info = SUPPORTED_LOCALES.find(l => l.code === localeCode);
  if (!info) return;
  document.documentElement.lang = localeCode;
  document.documentElement.dir = info.dir;
  try {
    localStorage.setItem('nexus_locale', localeCode);
  } catch {
    // storage blocked
  }
}

/**
 * Auto-translate a text string via the server's translation endpoint.
 * Returns the original text on failure.
 */
export async function autoTranslate(text, targetLocale, sourceLocale = 'en') {
  if (targetLocale === sourceLocale) return text;
  try {
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: sourceLocale, to: targetLocale }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.translated || text;
    }
  } catch {
    // fall through
  }
  return text;
}
