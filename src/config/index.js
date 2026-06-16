// File: index.js | Date: 2026-06-16
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  ENCRYPTION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),

  REDIS_URL: z.string().optional(),
  REDIS_TTL: z.string().default('3600'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3', 'azure']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),

  FEATURE_BIOMETRICS: z.string().default('true'),
  FEATURE_MFA: z.string().default('true'),
  FEATURE_I18N: z.string().default('true'),
  FEATURE_REALTIME: z.string().default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config] Environment validation errors:', parsed.error.format());
}

const env = parsed.success ? parsed.data : envSchema.parse({});

const config = {
  server: {
    port: parseInt(env.PORT, 10),
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    corsOrigin: env.CORS_ORIGIN,
  },
  security: {
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.REFRESH_EXPIRES_IN,
    saltRounds: 12,
    passwordMinLength: 13,
  },
  redis: {
    url: process.env.REDIS_URL,
    ttl: parseInt(env.REDIS_TTL, 10),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  storage: {
    provider: env.STORAGE_PROVIDER,
    localPath: env.STORAGE_LOCAL_PATH,
  },
  features: {
    biometrics: env.FEATURE_BIOMETRICS === 'true',
    mfa: env.FEATURE_MFA === 'true',
    i18n: env.FEATURE_I18N === 'true',
    realtime: env.FEATURE_REALTIME === 'true',
  },
  roles: ['user', 'moderator', 'developer', 'admin', 'super_admin'],
};

export default config;
