// src/config/constants.js
// Application-wide constants — no secrets here
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const ROLE_HIERARCHY = Object.freeze({
  admin: 4,
  dev: 3,
  moderator: 2,
  user: 1,
});

export const PERMISSIONS = Object.freeze({
  // User management
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_BAN: 'user:ban',
  // Content
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  CONTENT_MODERATE: 'content:moderate',
  CONTENT_DELETE: 'content:delete',
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  // Security
  SECURITY_VIEW: 'security:view',
  SECURITY_SCAN: 'security:scan',
  SECURITY_MANAGE: 'security:manage',
  // Projects
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',
  PROJECT_DELETE: 'project:delete',
  PROJECT_ADMIN: 'project:admin',
  // Subscriptions
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_MANAGE: 'subscription:manage',
  // Integrations
  INTEGRATION_READ: 'integration:read',
  INTEGRATION_WRITE: 'integration:write',
  // Admin
  ADMIN_PANEL: 'admin:panel',
  SYSTEM_CONFIG: 'system:config',
  AUDIT_VIEW: 'audit:view',
});

export const ROLE_PERMISSIONS = Object.freeze({
  admin: Object.values(PERMISSIONS),
  dev: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_WRITE,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.SECURITY_VIEW, PERMISSIONS.SECURITY_SCAN,
    PERMISSIONS.PROJECT_READ, PERMISSIONS.PROJECT_WRITE, PERMISSIONS.PROJECT_DELETE, PERMISSIONS.PROJECT_ADMIN,
    PERMISSIONS.SUBSCRIPTION_READ,
    PERMISSIONS.INTEGRATION_READ, PERMISSIONS.INTEGRATION_WRITE,
    PERMISSIONS.AUDIT_VIEW,
  ],
  moderator: [
    PERMISSIONS.USER_READ, PERMISSIONS.USER_BAN,
    PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_MODERATE, PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.SUBSCRIPTION_READ,
  ],
  user: [
    PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_WRITE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.PROJECT_READ, PERMISSIONS.PROJECT_WRITE,
    PERMISSIONS.SUBSCRIPTION_READ,
    PERMISSIONS.INTEGRATION_READ,
  ],
});

export const SUBSCRIPTION_PLANS = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
});

export const SUBSCRIPTION_LIMITS = Object.freeze({
  free: { chats: 5, uploads: 5, uploadSizeMb: 10, apiCalls: 100 },
  pro: { chats: Infinity, uploads: Infinity, uploadSizeMb: 100, apiCalls: 10000 },
  enterprise: { chats: Infinity, uploads: Infinity, uploadSizeMb: 1000, apiCalls: Infinity },
});

export const PASSWORD_MIN_LENGTH = 13;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{13,}$/;

export const MFA_METHODS = Object.freeze({
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BACKUP_CODE: 'backup_code',
});

export const BIOMETRIC_METHODS = Object.freeze({
  FINGERPRINT: 'fingerprint',
  TOUCH_ID: 'touch_id',
  FACE_ID: 'face_id',
  RETINAL: 'retinal',
  WINDOWS_HELLO: 'windows_hello',
  WEBAUTHN: 'webauthn',
});

export const SOCIAL_PLATFORMS = Object.freeze([
  'tiktok', 'instagram', 'facebook', 'twitch', 'discord',
  'lemon8', 'reddit', 'redgifs', 'youtube', 'twitter',
]);

export const GAME_PLATFORMS = Object.freeze([
  'epic_games', 'sony_psn', 'microsoft_xbox', 'ubisoft', 'steam',
]);

export const PROJECT_TYPES = Object.freeze({
  CODING: 'coding',
  GAME_DEV: 'game_dev',
  AR_VR: 'ar_vr',
  THREE_D: '3d',
  APP_DEV: 'app_dev',
  WEB_DEV: 'web_dev',
});

export const CRYPTO_PAYMENT_NETWORKS = Object.freeze(['bitcoin', 'ethereum', 'usdc', 'usdt', 'solana']);

export const SUPPORTED_LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'de', name: 'Deutsch', rtl: false },
  { code: 'ja', name: '日本語', rtl: false },
  { code: 'zh', name: '中文', rtl: false },
  { code: 'ko', name: '한국어', rtl: false },
  { code: 'pt', name: 'Português', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'hi', name: 'हिंदी', rtl: false },
]);

export const AUDIT_EVENTS = Object.freeze({
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  USER_MFA_ENABLE: 'user.mfa.enable',
  USER_MFA_VERIFY: 'user.mfa.verify',
  USER_PASSWORD_CHANGE: 'user.password.change',
  USER_ROLE_CHANGE: 'user.role.change',
  SECURITY_SCAN: 'security.scan',
  SECURITY_ALERT: 'security.alert',
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',
});
