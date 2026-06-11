// src/config/env.js
// Environment validation — no secrets ever hardcoded; all read from process.env
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('*'),

  // Encryption — must be set in production
  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 chars'),
  ENCRYPTION_SALT: z.string().min(32, 'ENCRYPTION_SALT must be at least 32 chars'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Database
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Storage
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),

  // AI providers
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),

  // Payments
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Social platforms
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),

  // Gaming platforms
  EPIC_GAMES_CLIENT_ID: z.string().optional(),
  EPIC_GAMES_CLIENT_SECRET: z.string().optional(),
  STEAM_API_KEY: z.string().optional(),
  XBOX_CLIENT_ID: z.string().optional(),
  XBOX_CLIENT_SECRET: z.string().optional(),
  PSN_CLIENT_ID: z.string().optional(),
  PSN_CLIENT_SECRET: z.string().optional(),
  UBISOFT_APP_ID: z.string().optional(),
  UBISOFT_APP_SECRET: z.string().optional(),

  // Dev integrations
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  BITBUCKET_CLIENT_ID: z.string().optional(),
  BITBUCKET_CLIENT_SECRET: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  ZOOM_CLIENT_ID: z.string().optional(),
  ZOOM_CLIENT_SECRET: z.string().optional(),
  ZOOM_SECRET_TOKEN: z.string().optional(),

  // Cloud providers
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  GCP_SERVICE_ACCOUNT_KEY: z.string().optional(),
  ADOBE_CLIENT_ID: z.string().optional(),
  ADOBE_CLIENT_SECRET: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Biometrics / MFA
  MFA_ISSUER: z.string().default('NexusAIPro'),
  MFA_TOKEN_WINDOW: z.coerce.number().default(1),

  // Crypto payments
  COINBASE_COMMERCE_API_KEY: z.string().optional(),
  COINBASE_COMMERCE_WEBHOOK_SECRET: z.string().optional(),

  // Monitoring
  GRAFANA_PASSWORD: z.string().optional(),
  // URL fields — validated only if present and non-empty
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  DATABASE_URL: z.string().optional().or(z.literal('')).transform(v => v || undefined),
});

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success && process.env.NODE_ENV === 'production') {
  const missing = _parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Environment validation failed:\n${missing}`);
}

const DEV_DEFAULTS = {
  ENCRYPTION_SECRET: 'dev-secret-change-before-production-00000000',
  ENCRYPTION_SALT: 'dev-salt-change-before-production-0000000000',
  JWT_SECRET: 'dev-jwt-change-before-production-0000000000000000000000000000000000',
  JWT_REFRESH_SECRET: 'dev-refresh-change-before-production-000000000000000000000000000000000',
};

export const env = _parsed.success
  ? _parsed.data
  : (() => {
    // In non-production, supply safe dev defaults for missing/short required secrets
    const patched = { ...process.env };
    for (const [k, v] of Object.entries(DEV_DEFAULTS)) {
      if (!patched[k] || patched[k].length < 32) patched[k] = v;
    }
    patched.SLACK_WEBHOOK_URL = undefined;
    patched.DATABASE_URL = undefined;
    return EnvSchema.parse(patched);
  })();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
