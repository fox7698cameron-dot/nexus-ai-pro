// src/i18n/index.js
// Nexus AI Pro - Internationalization & Auto-Translate
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import i18next from 'i18next';
import i18nextHttpMiddleware from 'i18next-http-middleware';

// Supported locales
export const SUPPORTED_LOCALES = [
  'en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko',
  'ar', 'hi', 'ru', 'it', 'nl', 'pl', 'sv', 'tr',
];

// Base translations (English master)
const enTranslations = {
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    search: 'Search',
    settings: 'Settings',
    logout: 'Sign Out',
    login: 'Sign In',
    register: 'Create Account',
  },
  auth: {
    welcome: 'Welcome to Nexus AI Pro',
    emailLabel: 'Email Address',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    passwordHint: 'Min 13 characters: uppercase, lowercase, number, and special character',
    mfaTitle: 'Two-Factor Authentication',
    mfaPrompt: 'Enter the 6-digit code from your authenticator app',
    biometricPrompt: 'Use biometric authentication',
    loginSuccess: 'Signed in successfully',
    registerSuccess: 'Account created successfully',
    invalidCredentials: 'Invalid email or password',
    accountLocked: 'Account temporarily locked. Try again later.',
    roleAdmin: 'Administrator',
    roleDev: 'Developer',
    roleModerator: 'Moderator',
    roleUser: 'User',
  },
  dashboard: {
    analytics: 'Analytics',
    security: 'Security',
    projects: 'Projects',
    payments: 'Payments & Subscriptions',
    admin: 'Admin Panel',
    dev: 'Developer Hub',
    moderator: 'Moderation',
  },
  analytics: {
    title: 'Social Analytics Dashboard',
    reach: 'Reach',
    likes: 'Likes',
    views: 'Views',
    retention: 'Retention',
    followers: 'Followers',
    engagement: 'Engagement Rate',
    platforms: 'Connected Platforms',
    realtime: 'Real-Time Metrics',
  },
  security: {
    title: 'Security Dashboard',
    status: 'Security Status',
    scan: 'Run Scan',
    scanning: 'Scanning...',
    threats: 'Threats Detected',
    encrypted: 'Encrypted',
    network: 'Network Status',
    device: 'Device Health',
    score: 'Security Score',
  },
  projects: {
    title: 'Project Tracker',
    newProject: 'New Project',
    progress: 'Progress',
    commits: 'Commits',
    builds: 'Builds',
    issues: 'Issues',
    achievements: 'Achievements',
    gameEngine: 'Game Engine',
    platform: 'Platform',
  },
  payments: {
    title: 'Subscription & Billing',
    subscribe: 'Subscribe',
    currentPlan: 'Current Plan',
    upgrade: 'Upgrade Plan',
    paymentMethod: 'Payment Method',
    addCard: 'Add Card',
    crypto: 'Pay with Crypto',
    giftCard: 'Redeem Gift Card',
    billingHistory: 'Billing History',
  },
};

export async function initI18n() {
  await i18next
    .use(i18nextHttpMiddleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LOCALES,
      resources: {
        en: { translation: enTranslations },
      },
      detection: {
        order: ['header', 'querystring', 'cookie'],
        lookupHeader: 'accept-language',
        lookupQuerystring: 'lang',
        lookupCookie: 'nexus_lang',
        caches: ['cookie'],
      },
      interpolation: { escapeValue: false },
    });

  return i18next;
}

export function i18nMiddleware() {
  return i18nextHttpMiddleware.handle(i18next);
}

// Server-side auto-translate via Google Translate (key from env, never hardcoded)
export async function autoTranslate(text, targetLang, sourceLang = 'en') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || targetLang === sourceLang) return text;

  const url = new URL('https://translation.googleapis.com/language/translate/v2');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
  });

  if (!response.ok) return text;
  const data = await response.json();
  return data?.data?.translations?.[0]?.translatedText ?? text;
}

export { i18next };
