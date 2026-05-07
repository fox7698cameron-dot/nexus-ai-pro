// src/i18n/LocalePicker.jsx
// Date: 2026-05-07

import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { i18n, SUPPORTED_LOCALES } from './i18nService.js';

export default function LocalePicker({ darkMode = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(i18n.getLocale());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const unsub = i18n.onLocaleChange(({ locale }) => setCurrentLocale(locale));
    return unsub;
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = Object.entries(SUPPORTED_LOCALES).filter(([code, meta]) => {
    const q = search.toLowerCase();
    return code.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q);
  });

  async function handleSelect(locale) {
    if (locale === currentLocale) { setOpen(false); return; }
    setLoading(true);
    try {
      await i18n.setLocale(locale);
    } finally {
      setLoading(false);
      setOpen(false);
      setSearch('');
    }
  }

  const info = SUPPORTED_LOCALES[currentLocale];
  const bg = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const dropBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const hoverItem = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const inputBg = darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-500 border-gray-300';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bg} ${compact ? 'px-2 py-1.5' : ''}`}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 flex-shrink-0" />
        {!compact && <span>{info?.flag}</span>}
        {!compact && <span className="max-w-[100px] truncate">{info?.name ?? currentLocale}</span>}
        {compact && <span>{info?.flag}</span>}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1 w-64 rounded-xl shadow-xl border z-50 overflow-hidden ${dropBg}`}>
          <div className="p-2 border-b border-inherit">
            <input
              type="search"
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full px-3 py-1.5 text-sm rounded-lg border outline-none ${inputBg}`}
              autoFocus
            />
          </div>
          <ul
            role="listbox"
            aria-label="Language options"
            className="max-h-64 overflow-y-auto"
          >
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">No results</li>
            )}
            {filtered.map(([code, meta]) => (
              <li key={code}>
                <button
                  role="option"
                  aria-selected={code === currentLocale}
                  onClick={() => handleSelect(code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${hoverItem}`}
                >
                  <span className="text-lg leading-none">{meta.flag}</span>
                  <span className="flex-1 truncate">{meta.name}</span>
                  <span className="text-xs opacity-50">{code}</span>
                  {code === currentLocale && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          <div className={`px-4 py-2 text-xs opacity-50 border-t border-inherit ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {Object.keys(SUPPORTED_LOCALES).length} languages supported
          </div>
        </div>
      )}
    </div>
  );
}
