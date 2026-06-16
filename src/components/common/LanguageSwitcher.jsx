// File: LanguageSwitcher.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
];

const STORAGE_KEY = 'nexus-ai-pro-lang';

// Stub i18n: just returns the key for now
function t(key, lang) {
  return key;
}

export function useI18n() {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (code) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
    setLangState(code);
    // Set document direction for RTL support
    const langDef = LANGUAGES.find((l) => l.code === code);
    if (langDef) {
      document.documentElement.setAttribute('lang', code);
      document.documentElement.setAttribute('dir', langDef.dir);
    }
  };

  const translate = (key) => t(key, lang);

  return { lang, setLang, t: translate };
}

export default function LanguageSwitcher({ compact = false, align = 'right' }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
    setLangState(code);
    const langDef = LANGUAGES.find((l) => l.code === code);
    if (langDef) {
      document.documentElement.setAttribute('lang', code);
      document.documentElement.setAttribute('dir', langDef.dir);
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4 text-gray-400" />
        <span>{currentLang.flag}</span>
        {!compact && (
          <span className="hidden sm:inline font-medium">{currentLang.nativeLabel}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="listbox"
          aria-label="Language options"
        >
          <div className="px-2 py-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={l.code === lang}
                onClick={() => handleSelect(l.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left ${
                  l.code === lang
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.nativeLabel}</p>
                  <p className="text-xs text-gray-400 truncate">{l.label}</p>
                </div>
                {l.code === lang && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
