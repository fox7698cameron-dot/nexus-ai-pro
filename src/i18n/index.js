/**
 * NEXUS AI PRO - Internationalization (i18n) Module
 * File: src/i18n/index.js
 * Date: 2026-08-26
 *
 * Multi-language support with auto-translate capability.
 * Supports: en, es, fr, de, ja, ko, zh, ar, pt, ru, hi, it, nl, tr, pl, sv.
 * Auto-translation via configured provider (Google Translate, DeepL, or Azure Translator).
 */

import express from 'express';
import { sanitizeInput } from '../utils/helpers.js';

const router = express.Router();

// ─── Supported locales ─────────────────────────────────────────────────────────
export const LOCALES = Object.freeze({
  en: { name: 'English', direction: 'ltr', region: 'US' },
  es: { name: 'Español', direction: 'ltr', region: 'ES' },
  fr: { name: 'Français', direction: 'ltr', region: 'FR' },
  de: { name: 'Deutsch', direction: 'ltr', region: 'DE' },
  ja: { name: '日本語', direction: 'ltr', region: 'JP' },
  ko: { name: '한국어', direction: 'ltr', region: 'KR' },
  zh: { name: '中文', direction: 'ltr', region: 'CN' },
  ar: { name: 'العربية', direction: 'rtl', region: 'SA' },
  pt: { name: 'Português', direction: 'ltr', region: 'BR' },
  ru: { name: 'Русский', direction: 'ltr', region: 'RU' },
  hi: { name: 'हिन्दी', direction: 'ltr', region: 'IN' },
  it: { name: 'Italiano', direction: 'ltr', region: 'IT' },
  nl: { name: 'Nederlands', direction: 'ltr', region: 'NL' },
  tr: { name: 'Türkçe', direction: 'ltr', region: 'TR' },
  pl: { name: 'Polski', direction: 'ltr', region: 'PL' },
  sv: { name: 'Svenska', direction: 'ltr', region: 'SE' },
});

// ─── Translation cache ─────────────────────────────────────────────────────────
const translationCache = new Map(); // `${lang}:${hash}` → translated text

// ─── Auto-translate function ────────────────────────────────────────────────────
export async function autoTranslate(text, targetLang, sourceLang = 'auto') {
  if (!text || targetLang === sourceLang || (sourceLang === 'auto' && targetLang === 'en')) {
    return text;
  }

  if (!LOCALES[targetLang]) throw new Error(`Unsupported target language: ${targetLang}`);

  const cacheKey = `${targetLang}:${Buffer.from(text).toString('base64url').slice(0, 32)}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  // Try providers in priority order
  let translated = null;
  translated = await _translateViaDeepL(text, targetLang, sourceLang)
    .catch(() => null)
    ?? await _translateViaGoogle(text, targetLang, sourceLang)
      .catch(() => null)
    ?? await _translateViaAzure(text, targetLang, sourceLang)
      .catch(() => null);

  if (!translated) return text; // Fall back to original

  translationCache.set(cacheKey, translated);
  return translated;
}

async function _translateViaDeepL(text, targetLang, sourceLang) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;

  const langMap = { zh: 'ZH', ar: null }; // DeepL doesn't support Arabic
  const tl = langMap[targetLang] !== undefined ? langMap[targetLang] : targetLang.toUpperCase();
  if (!tl) return null;

  const resp = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Authorization': `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [text], target_lang: tl, source_lang: sourceLang !== 'auto' ? sourceLang.toUpperCase() : undefined }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.translations?.[0]?.text || null;
}

async function _translateViaGoogle(text, targetLang, sourceLang) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({ q: text, target: targetLang, format: 'text', key });
  if (sourceLang !== 'auto') params.set('source', sourceLang);

  const resp = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.data?.translations?.[0]?.translatedText || null;
}

async function _translateViaAzure(text, targetLang, sourceLang) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION || 'eastus';
  if (!key) return null;

  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}${sourceLang !== 'auto' ? `&from=${sourceLang}` : ''}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Ocp-Apim-Subscription-Region': region, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ Text: text }]),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data[0]?.translations?.[0]?.text || null;
}

// ─── Language detection ────────────────────────────────────────────────────────
export function detectLanguageFromRequest(req) {
  // 1. Explicit header
  const explicitLang = req.headers['x-language'] || req.query.lang;
  if (explicitLang && LOCALES[explicitLang]) return explicitLang;

  // 2. Accept-Language header
  const acceptLang = req.headers['accept-language'] || '';
  const preferred = acceptLang.split(',').map(l => l.split(';')[0].trim().slice(0, 2).toLowerCase()).find(l => LOCALES[l]);
  if (preferred) return preferred;

  return 'en';
}

// ─── Routes ────────────────────────────────────────────────────────────────────

router.get('/locales', (_req, res) => {
  res.json({ locales: LOCALES, supported: Object.keys(LOCALES) });
});

router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang, sourceLang = 'auto' } = req.body;
    if (!text || !targetLang) return res.status(400).json({ error: 'text and targetLang are required' });

    const safeText = sanitizeInput(text, { allowEmoji: true, allowSpecial: true, maxLength: 5000 });
    const translated = await autoTranslate(safeText, targetLang, sourceLang);
    res.json({ original: safeText, translated, targetLang, sourceLang, cached: translationCache.has(`${targetLang}:${Buffer.from(safeText).toString('base64url').slice(0, 32)}`) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/translate/batch', async (req, res) => {
  try {
    const { texts, targetLang, sourceLang = 'auto' } = req.body;
    if (!Array.isArray(texts) || !targetLang) return res.status(400).json({ error: 'texts (array) and targetLang are required' });

    const results = await Promise.all(
      texts.slice(0, 100).map(text =>
        autoTranslate(sanitizeInput(String(text), { allowEmoji: true, maxLength: 2000 }), targetLang, sourceLang).then(translated => ({ original: text, translated }))
      )
    );
    res.json({ results, targetLang });
  } catch (err) {
    res.status(500).json({ error: 'Batch translation failed' });
  }
});

// ─── i18n middleware ────────────────────────────────────────────────────────────
export function i18nMiddleware(req, res, next) {
  req.lang = detectLanguageFromRequest(req);
  req.locale = LOCALES[req.lang];
  res.setHeader('Content-Language', req.lang);
  next();
}

export { router as i18nRouter };
