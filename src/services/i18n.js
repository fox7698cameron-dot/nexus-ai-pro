// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/services/i18n.js — 2026-07-13
// Multi-language and regional support with auto-translate capability

export const SUPPORTED_LANGUAGES = Object.freeze({
  en: { name: 'English', nativeName: 'English', rtl: false, region: 'US' },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false, region: 'ES' },
  fr: { name: 'French', nativeName: 'Français', rtl: false, region: 'FR' },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false, region: 'DE' },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false, region: 'JP' },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false, region: 'KR' },
  zh: { name: 'Chinese (Simplified)', nativeName: '中文', rtl: false, region: 'CN' },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, region: 'SA' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false, region: 'IN' },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false, region: 'BR' },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false, region: 'RU' },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false, region: 'IT' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', rtl: false, region: 'NL' },
  sv: { name: 'Swedish', nativeName: 'Svenska', rtl: false, region: 'SE' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', rtl: false, region: 'TR' },
  pl: { name: 'Polish', nativeName: 'Polski', rtl: false, region: 'PL' },
});

export const SUPPORTED_REGIONS = Object.freeze({
  US: { name: 'United States', currency: 'USD', dateFormat: 'MM/DD/YYYY', timezone: 'America/New_York' },
  GB: { name: 'United Kingdom', currency: 'GBP', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/London' },
  EU: { name: 'European Union', currency: 'EUR', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Berlin' },
  JP: { name: 'Japan', currency: 'JPY', dateFormat: 'YYYY/MM/DD', timezone: 'Asia/Tokyo' },
  CN: { name: 'China', currency: 'CNY', dateFormat: 'YYYY-MM-DD', timezone: 'Asia/Shanghai' },
  IN: { name: 'India', currency: 'INR', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Kolkata' },
  BR: { name: 'Brazil', currency: 'BRL', dateFormat: 'DD/MM/YYYY', timezone: 'America/Sao_Paulo' },
  AU: { name: 'Australia', currency: 'AUD', dateFormat: 'DD/MM/YYYY', timezone: 'Australia/Sydney' },
  CA: { name: 'Canada', currency: 'CAD', dateFormat: 'YYYY-MM-DD', timezone: 'America/Toronto' },
  KR: { name: 'South Korea', currency: 'KRW', dateFormat: 'YYYY.MM.DD', timezone: 'Asia/Seoul' },
});

// Auto-translate using Google Translate API (requires GOOGLE_API_KEY)
export async function translateText(text, targetLang, sourceLang = 'auto') {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Fallback: return original text with a note
    return { translatedText: text, detectedLang: sourceLang, fallback: true };
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target: targetLang, source: sourceLang === 'auto' ? undefined : sourceLang, format: 'text' }),
    });
    const data = await response.json();
    const translation = data?.data?.translations?.[0];
    return {
      translatedText: translation?.translatedText ?? text,
      detectedLang: translation?.detectedSourceLanguage ?? sourceLang,
    };
  } catch {
    return { translatedText: text, detectedLang: sourceLang, error: 'Translation service unavailable' };
  }
}

export function detectLanguage(text) {
  // Basic Unicode script detection — real implementation would use Google Language Detection API
  if (/[　-鿿]/.test(text)) return 'zh';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[؀-ۿ]/.test(text)) return 'ar';
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru';
  return 'en';
}

export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(timestamp, region = 'US', locale) {
  const regionConfig = SUPPORTED_REGIONS[region];
  const resolvedLocale = locale || (regionConfig ? `en-${region}` : 'en-US');
  try {
    return new Intl.DateTimeFormat(resolvedLocale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

export default { SUPPORTED_LANGUAGES, SUPPORTED_REGIONS, translateText, detectLanguage, formatCurrency, formatDate };
