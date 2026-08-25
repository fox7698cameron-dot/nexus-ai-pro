/**
 * src/lib/i18n.js
 * Nexus AI Pro — Client-side Internationalisation Hook
 * Labeled: 2026-08-25
 *
 * Provides:
 *   - useI18n() React hook for locale-aware rendering
 *   - Auto-detect locale from browser + user preference
 *   - Lazy-load locale strings
 *   - RTL support
 *   - Number/date/currency formatting helpers
 *   - Auto-translate via server proxy (Google Translate)
 */

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';

// ── Locale context ─────────────────────────────────────────────────────────────
const I18nContext = createContext({
  locale:        'en',
  dir:           'ltr',
  setLocale:     () => {},
  t:             (key) => key,
  fmt:           { number: v => v, currency: v => v, date: v => v }
});

export function useI18n() {
  return useContext(I18nContext);
}

// ── Built-in minimal string tables ────────────────────────────────────────────
// Only common UI labels — full translations fetched from server.
const BUILT_IN_STRINGS = {
  en: {
    'nav.analytics':    'Analytics',
    'nav.gamedev':      'Game Dev',
    'nav.security':     'Security',
    'nav.payments':     'Billing',
    'nav.admin':        'Admin',
    'nav.settings':     'Settings',
    'auth.login':       'Sign In',
    'auth.register':    'Create Account',
    'auth.logout':      'Sign Out',
    'auth.mfa':         'Two-Factor Auth',
    'status.loading':   'Loading…',
    'status.error':     'Error',
    'status.success':   'Success',
    'btn.save':         'Save',
    'btn.cancel':       'Cancel',
    'btn.delete':       'Delete',
    'btn.edit':         'Edit',
    'btn.create':       'Create',
    'btn.connect':      'Connect',
    'btn.refresh':      'Refresh'
  },
  es: {
    'nav.analytics':    'Analíticas',
    'nav.gamedev':      'Desarrollo',
    'nav.security':     'Seguridad',
    'nav.payments':     'Facturación',
    'nav.admin':        'Administrador',
    'nav.settings':     'Configuración',
    'auth.login':       'Iniciar Sesión',
    'auth.register':    'Crear Cuenta',
    'auth.logout':      'Cerrar Sesión',
    'auth.mfa':         'Doble Factor',
    'status.loading':   'Cargando…',
    'status.error':     'Error',
    'status.success':   'Éxito',
    'btn.save':         'Guardar',
    'btn.cancel':       'Cancelar',
    'btn.delete':       'Eliminar',
    'btn.edit':         'Editar',
    'btn.create':       'Crear',
    'btn.connect':      'Conectar',
    'btn.refresh':      'Actualizar'
  },
  fr: {
    'nav.analytics':    'Analytiques',
    'nav.gamedev':      'Développement',
    'nav.security':     'Sécurité',
    'nav.payments':     'Facturation',
    'nav.admin':        'Administration',
    'nav.settings':     'Paramètres',
    'auth.login':       'Connexion',
    'auth.register':    'Créer un compte',
    'auth.logout':      'Déconnexion',
    'auth.mfa':         'Double authentification',
    'status.loading':   'Chargement…',
    'status.error':     'Erreur',
    'status.success':   'Succès',
    'btn.save':         'Enregistrer',
    'btn.cancel':       'Annuler',
    'btn.delete':       'Supprimer',
    'btn.edit':         'Modifier',
    'btn.create':       'Créer',
    'btn.connect':      'Connecter',
    'btn.refresh':      'Actualiser'
  }
};

// RTL locales
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

// ── Detect locale ─────────────────────────────────────────────────────────────
function detectBrowserLocale() {
  // Check saved preference first
  const saved = (() => { try { return localStorage.getItem('nexus:locale'); } catch { return null; } })();
  if (saved) return saved;

  // navigator.languages is the most accurate
  const langs = navigator.languages || [navigator.language || 'en'];
  for (const lang of langs) {
    const code = lang.split('-')[0].toLowerCase();
    if (BUILT_IN_STRINGS[code]) return code;
  }
  return 'en';
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detectBrowserLocale);
  const [strings, setStrings]    = useState(BUILT_IN_STRINGS[locale] || BUILT_IN_STRINGS.en);

  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  const setLocale = useCallback((newLocale) => {
    try { localStorage.setItem('nexus:locale', newLocale); } catch {}
    setLocaleState(newLocale);
    // Optionally persist to server
    const token = sessionStorage.getItem('nexus:accessToken');
    if (token) {
      fetch('/api/auth/me/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: newLocale })
      }).catch(() => {});
    }
  }, []);

  // Load locale strings
  useEffect(() => {
    if (BUILT_IN_STRINGS[locale]) {
      setStrings(BUILT_IN_STRINGS[locale]);
    } else {
      // Fall back to English for unsupported built-in locales
      setStrings(BUILT_IN_STRINGS.en);
    }
    // Set document direction
    document.documentElement.lang = locale;
    document.documentElement.dir  = dir;
  }, [locale, dir]);

  const t = useCallback((key, vars = {}) => {
    let str = strings[key] || BUILT_IN_STRINGS.en[key] || key;
    // Simple variable interpolation: {name}
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }, [strings]);

  const fmt = useMemo(() => ({
    number: (value, opts = {}) => {
      try { return new Intl.NumberFormat(locale, opts).format(value); }
      catch { return String(value); }
    },
    currency: (amount, currency = 'USD') => {
      try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount); }
      catch { return `${currency} ${amount}`; }
    },
    date: (date, opts = {}) => {
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...opts }).format(new Date(date));
      } catch {
        return new Date(date).toLocaleDateString();
      }
    }
  }), [locale]);

  const value = useMemo(() => ({ locale, dir, setLocale, t, fmt }), [locale, dir, setLocale, t, fmt]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

// ── Language selector component ────────────────────────────────────────────────
export function LanguageSelector({ style }) {
  const { locale, setLocale } = useI18n();
  const [locales, setLocales]  = useState([]);

  useEffect(() => {
    fetch('/api/i18n/locales')
      .then(r => r.json())
      .then(d => setLocales(d.locales || []))
      .catch(() => {});
  }, []);

  if (locales.length === 0) return null;

  return React.createElement('select', {
    value:    locale,
    onChange: e => setLocale(e.target.value),
    style: {
      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
      background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13,
      cursor: 'pointer', ...style
    },
    'aria-label': 'Select language'
  }, locales.map(l => React.createElement('option', { key: l.code, value: l.code }, `${l.nativeName} (${l.code})`)));
}

// ── useAutoTranslate hook ─────────────────────────────────────────────────────
/**
 * Translate dynamic text content to the current locale.
 * Returns { translated, loading }.
 * Call when you have AI-generated or user content to translate.
 */
export function useAutoTranslate(text, sourceLocale = 'en') {
  const { locale }               = useI18n();
  const [translated, setTranslated] = useState(text);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!text || locale === sourceLocale) {
      setTranslated(text);
      return;
    }
    setLoading(true);
    const token = sessionStorage.getItem('nexus:accessToken');
    fetch('/api/i18n/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ text, targetLocale: locale, sourceLocale })
    })
      .then(r => r.json())
      .then(d => setTranslated(d.translated || text))
      .catch(() => setTranslated(text))
      .finally(() => setLoading(false));
  }, [text, locale, sourceLocale]);

  return { translated, loading };
}
