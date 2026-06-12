// src/i18n/config.js
// 2026-06-12 | i18n setup with auto-detect and lazy-load
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' }
];

function detectLanguage() {
  const stored = localStorage.getItem('nexus:language');
  if (stored) return stored;
  const browser = navigator.language?.split('-')[0] || 'en';
  return SUPPORTED_LANGUAGES.some(l => l.code === browser) ? browser : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: { en, es, fr, de, ja, zh, pt, ar, ko, ru },
    lng: typeof window !== 'undefined' ? detectLanguage() : 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  });

export function changeLanguage(code) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexus:language', code);
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (lang) document.documentElement.setAttribute('dir', lang.dir);
  }
  return i18n.changeLanguage(code);
}

export default i18n;
