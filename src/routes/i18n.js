/**
 * nexus-ai-pro/src/routes/i18n.js
 * Internationalization routes — translation, locale detection, auto-translate
 * Date: 2026-08-16
 */

import express from 'express';
import { LOCALES, translations } from '../i18n/translations.js';

const router = express.Router();

// Simple in-memory cache for auto-translations (production: use Redis)
const translateCache = new Map();

// ─────────────────────────────────────────────
// GET /api/i18n/locales
// ─────────────────────────────────────────────
router.get('/locales', (req, res) => {
  res.json({ locales: LOCALES, supported: Object.keys(LOCALES) });
});

// ─────────────────────────────────────────────
// GET /api/i18n/translations/:locale
// ─────────────────────────────────────────────
router.get('/translations/:locale', (req, res) => {
  const { locale } = req.params;
  if (!LOCALES[locale]) {
    return res.status(404).json({ error: `Locale not supported: ${locale}`, supported: Object.keys(LOCALES) });
  }
  const data = translations[locale] || translations['en-US'];
  res.json({ locale, translations: data, fallback: locale !== 'en-US' ? 'en-US' : null });
});

// ─────────────────────────────────────────────
// POST /api/i18n/translate
// Auto-translate a string via AI (Claude/GPT-4)
// Falls back to original if model API unavailable
// ─────────────────────────────────────────────
router.post('/translate', async (req, res) => {
  const { text, targetLocale, sourceLocale = 'en-US' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!LOCALES[targetLocale]) return res.status(400).json({ error: 'Invalid targetLocale', supported: Object.keys(LOCALES) });
  if (targetLocale === sourceLocale) return res.json({ translated: text, locale: targetLocale });

  const cacheKey = `${sourceLocale}:${targetLocale}:${text.slice(0, 100)}`;
  if (translateCache.has(cacheKey)) {
    return res.json({ translated: translateCache.get(cacheKey), locale: targetLocale, cached: true });
  }

  // Attempt translation via Anthropic (Claude)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({ translated: text, locale: targetLocale, note: 'Translation API not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `You are a professional translator. Translate the given text from ${LOCALES[sourceLocale]?.name || sourceLocale} to ${LOCALES[targetLocale]?.name || targetLocale}. Return ONLY the translated text with no explanation, quotes, or additional content.`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const translated = data.content?.[0]?.text?.trim() || text;

    translateCache.set(cacheKey, translated);
    if (translateCache.size > 10000) {
      const firstKey = translateCache.keys().next().value;
      translateCache.delete(firstKey);
    }

    res.json({ translated, locale: targetLocale, sourceLocale });
  } catch (err) {
    console.error('[i18n/translate]', err.message);
    res.json({ translated: text, locale: targetLocale, error: 'Translation failed, returning original' });
  }
});

// ─────────────────────────────────────────────
// GET /api/i18n/detect
// Detect locale from Accept-Language header
// ─────────────────────────────────────────────
router.get('/detect', (req, res) => {
  const acceptLanguage = req.headers['accept-language'] || 'en-US';
  const preferred = acceptLanguage.split(',')
    .map(lang => {
      const [code, q] = lang.trim().split(';q=');
      return { code: code.trim(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  let detected = 'en-US';
  for (const { code } of preferred) {
    if (LOCALES[code]) { detected = code; break; }
    // Try base language match
    const base = code.split('-')[0];
    const match = Object.keys(LOCALES).find(l => l.startsWith(base));
    if (match) { detected = match; break; }
  }

  res.json({ detected, locale: LOCALES[detected], supported: Object.keys(LOCALES) });
});

export default router;
