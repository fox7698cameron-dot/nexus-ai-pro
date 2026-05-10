// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
];

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.string().min(2).max(10),
  sourceLang: z.string().min(2).max(10).optional(),
});

router.post('/', async (req, res) => {
  const parsed = translateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const { text, targetLang, sourceLang } = parsed.data;
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    return res.json({ translated: text, fallback: true, message: 'No translation API key configured' });
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: text,
    target: targetLang,
    format: 'text',
    ...(sourceLang ? { source: sourceLang } : {}),
  });

  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message ?? 'Translation service error';
    return res.status(502).json({ error: msg, fallback: true, translated: text });
  }

  const data = await response.json();
  const translated = data?.data?.translations?.[0]?.translatedText ?? text;
  const detectedSourceLanguage = data?.data?.translations?.[0]?.detectedSourceLanguage;

  return res.json({ translated, targetLang, ...(detectedSourceLanguage ? { detectedSourceLanguage } : {}) });
});

router.get('/languages', (_req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

export default router;
