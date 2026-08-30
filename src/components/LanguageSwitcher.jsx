/**
 * src/components/LanguageSwitcher.jsx
 * Language/locale selector component with RTL support
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useState } from 'react';
import { useTranslation, SUPPORTED_LOCALES } from '../i18n/i18n.js';

/**
 * @param {{ compact?: boolean, style?: React.CSSProperties }} props
 */
function LanguageSwitcher({ compact = false, style = {} }) {
  const { locale, setLocale, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LOCALES.find(l => l.code === locale) ?? SUPPORTED_LOCALES[0];

  const flagMap = {
    en:    '🇺🇸', es:    '🇪🇸', fr:    '🇫🇷', de:    '🇩🇪',
    ja:    '🇯🇵', ko:    '🇰🇷', 'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼',
    pt:    '🇧🇷', ar:    '🇸🇦', hi:    '🇮🇳', ru:    '🇷🇺',
  };

  const btnStyle = {
    display:        'flex',
    alignItems:     'center',
    gap:            6,
    padding:        compact ? '4px 8px' : '6px 12px',
    background:     '#1f2937',
    border:         '1px solid #374151',
    borderRadius:   8,
    color:          '#e5e7eb',
    cursor:         'pointer',
    fontSize:       13,
    position:       'relative',
    userSelect:     'none',
    ...style,
  };

  const dropdownStyle = {
    position:       'absolute',
    top:            '100%',
    right:          0,
    marginTop:      4,
    background:     '#111827',
    border:         '1px solid #374151',
    borderRadius:   8,
    minWidth:       200,
    maxHeight:      320,
    overflowY:      'auto',
    zIndex:         1000,
    boxShadow:      '0 8px 24px rgba(0,0,0,0.4)',
  };

  const itemStyle = (isActive) => ({
    display:        'flex',
    alignItems:     'center',
    gap:            8,
    padding:        '8px 12px',
    cursor:         'pointer',
    fontSize:       13,
    color:          isActive ? '#6366f1' : '#d1d5db',
    background:     isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
    transition:     'background 0.15s',
  });

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={btnStyle}
        onClick={() => setOpen(o => !o)}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span aria-hidden="true">{flagMap[locale] ?? '🌐'}</span>
        {!compact && <span>{current.native}</span>}
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />
          <div style={dropdownStyle} role="listbox" aria-label="Language options">
            {SUPPORTED_LOCALES.map(lang => (
              <div
                key={lang.code}
                style={itemStyle(lang.code === locale)}
                role="option"
                aria-selected={lang.code === locale}
                onClick={() => {
                  setLocale(lang.code);
                  setOpen(false);
                }}
                onMouseEnter={e => {
                  if (lang.code !== locale) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={e => {
                  if (lang.code !== locale) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span aria-hidden="true">{flagMap[lang.code] ?? '🌐'}</span>
                <span style={{ flex: 1 }}>{lang.native}</span>
                {lang.rtl && (
                  <span style={{ fontSize: 10, color: '#6b7280' }}>RTL</span>
                )}
                {lang.code === locale && <span style={{ fontSize: 12 }}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSwitcher;
