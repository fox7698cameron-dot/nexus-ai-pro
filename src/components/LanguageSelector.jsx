// src/components/LanguageSelector.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English',              flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', label: 'Español',              flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', label: 'Français',             flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch',              flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', label: 'Português',            flag: '🇧🇷', dir: 'ltr' },
  { code: 'it', label: 'Italiano',             flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', label: 'Nederlands',           flag: '🇳🇱', dir: 'ltr' },
  { code: 'pl', label: 'Polski',               flag: '🇵🇱', dir: 'ltr' },
  { code: 'sv', label: 'Svenska',              flag: '🇸🇪', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe',               flag: '🇹🇷', dir: 'ltr' },
  { code: 'ru', label: 'Русский',              flag: '🇷🇺', dir: 'ltr' },
  { code: 'zh', label: '中文 (简体)',           flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', label: '日本語',               flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: '한국어',               flag: '🇰🇷', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी',              flag: '🇮🇳', dir: 'ltr' },
  { code: 'ar', label: 'العربية',              flag: '🇸🇦', dir: 'rtl' }
];

const STORAGE_KEY = 'nexus_language';

export default function LanguageSelector({ theme = 'dark', onLanguageChange }) {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return LANGUAGES.find(l => l.code === saved) || LANGUAGES[0];
  });
  const ref = useRef(null);

  const isDark = theme === 'dark';
  const bg     = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const hov    = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const txt    = isDark ? 'text-white' : 'text-gray-900';
  const sub    = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(lang) {
    setCurrent(lang);
    setOpen(false);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang.code);
    document.documentElement.setAttribute('lang', lang.code);
    document.documentElement.setAttribute('dir', lang.dir);

    // Change i18next language if available
    if (window.i18n?.changeLanguage) window.i18n.changeLanguage(lang.code);

    onLanguageChange?.(lang);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bg} ${txt} ${hov}`}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe size={14} className={sub} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className={`text-xs ${sub}`}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className={`absolute right-0 mt-1 w-52 max-h-80 overflow-y-auto rounded-xl border shadow-2xl z-50 ${bg}`}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              role="option"
              aria-selected={lang.code === current.code}
              onClick={() => select(lang)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${hov} ${txt} ${lang.code === current.code ? 'font-semibold' : ''}`}
            >
              <span className="text-base w-6">{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.dir === 'rtl' && <span className={`ml-auto text-xs ${sub}`}>RTL</span>}
              {lang.code === current.code && <span className="ml-auto text-blue-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
