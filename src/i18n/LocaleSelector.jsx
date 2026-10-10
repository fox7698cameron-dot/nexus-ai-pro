/**
 * LocaleSelector.jsx
 * Dropdown component for runtime locale switching.
 * Updated: 2026-10-10
 */
import React from 'react';
import { SUPPORTED_LOCALES } from './i18n.js';

export function LocaleSelector({ locale, onChange }) {
  return (
    <select
      value={locale}
      onChange={e => onChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
      aria-label="Select language"
    >
      {SUPPORTED_LOCALES.map(l => (
        <option key={l.code} value={l.code}>{l.name}</option>
      ))}
    </select>
  );
}
