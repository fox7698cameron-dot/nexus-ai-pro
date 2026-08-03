/**
 * Internationalisation — lightweight i18n with auto-translate fallback
 * @date 2026-08-03
 */

const SUPPORTED = {
  en: { name: 'English',   nativeName: 'English',    rtl: false },
  es: { name: 'Spanish',   nativeName: 'Español',    rtl: false },
  fr: { name: 'French',    nativeName: 'Français',   rtl: false },
  de: { name: 'German',    nativeName: 'Deutsch',    rtl: false },
  pt: { name: 'Portuguese',nativeName: 'Português',  rtl: false },
  ja: { name: 'Japanese',  nativeName: '日本語',       rtl: false },
  zh: { name: 'Chinese',   nativeName: '中文(简体)',   rtl: false },
  ko: { name: 'Korean',    nativeName: '한국어',       rtl: false },
  ar: { name: 'Arabic',    nativeName: 'العربية',    rtl: true  },
  hi: { name: 'Hindi',     nativeName: 'हिन्दी',       rtl: false },
  ru: { name: 'Russian',   nativeName: 'Русский',    rtl: false },
  it: { name: 'Italian',   nativeName: 'Italiano',   rtl: false }
};

const listeners = new Set();
let _lang = detectBrowserLanguage();
let _translations = {};

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language?.split('-')[0] || 'en';
  return SUPPORTED[browserLang] ? browserLang : 'en';
}

async function loadTranslations(lang) {
  try {
    const res = await fetch(`/api/i18n/translations/${lang}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.translations || {};
  } catch {
    return {};
  }
}

const i18n = {
  get currentLanguage() { return _lang; },
  get supportedLanguages() { return SUPPORTED; },
  get isRTL() { return SUPPORTED[_lang]?.rtl ?? false; },

  async setLanguage(lang) {
    if (!SUPPORTED[lang]) throw new Error(`Unsupported language: ${lang}`);
    _lang = lang;
    _translations = await loadTranslations(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = SUPPORTED[lang].rtl ? 'rtl' : 'ltr';
    localStorage.setItem('nexus_lang', lang);
    listeners.forEach(fn => fn(lang));
  },

  t(key, vars = {}) {
    let str = _translations[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replaceAll(`{{${k}}}`, String(v));
    });
    return str;
  },

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async init() {
    const saved = localStorage.getItem('nexus_lang');
    const lang = saved && SUPPORTED[saved] ? saved : _lang;
    await this.setLanguage(lang);
  }
};

export default i18n;
export { SUPPORTED as SUPPORTED_LANGUAGES };
