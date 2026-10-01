// src/i18n/config.js | 2026-10-01
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Supported locales
const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru', 'ko', 'hi'];

// RTL languages
export const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

// Lazy-load locale JSON files
async function loadLocale(lng) {
  try {
    const mod = await import(`./locales/${lng}.json`);
    return mod.default ?? mod;
  } catch {
    // Fallback to English if locale file doesn't exist yet
    const mod = await import('./locales/en.json');
    return mod.default ?? mod;
  }
}

// Custom backend that loads JSON files on demand
const LazyBackend = {
  type: 'backend',
  read(language, _namespace, callback) {
    loadLocale(language)
      .then(res => callback(null, res))
      .catch(err => callback(err, null));
  },
};

i18n
  .use(LazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'nexus:language',
    },
    react: { useSuspense: false },
  });

export default i18n;

// Helper: set document direction for RTL languages
export function applyTextDirection(lng) {
  document.documentElement.setAttribute('dir', RTL_LANGS.includes(lng) ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lng);
}

// Language options for UI picker
export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English',    native: 'English'      },
  { code: 'es', label: 'Spanish',    native: 'Español'      },
  { code: 'fr', label: 'French',     native: 'Français'     },
  { code: 'de', label: 'German',     native: 'Deutsch'      },
  { code: 'ja', label: 'Japanese',   native: '日本語'         },
  { code: 'zh', label: 'Chinese',    native: '中文'           },
  { code: 'ar', label: 'Arabic',     native: 'العربية',  rtl: true },
  { code: 'pt', label: 'Portuguese', native: 'Português'    },
  { code: 'ru', label: 'Russian',    native: 'Русский'      },
  { code: 'ko', label: 'Korean',     native: '한국어'          },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी'          },
];
