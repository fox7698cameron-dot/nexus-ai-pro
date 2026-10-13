// src/services/AuthService.js
// Authentication Service: Registration, Login, Biometrics, 2FA/MFA
// Updated: 2026-10-13

const PASSWORD_MIN_LENGTH = 13;

const PASSWORD_STRENGTH_LEVELS = {
  WEAK: { score: 0, label: 'Weak', color: '#ef4444' },
  FAIR: { score: 1, label: 'Fair', color: '#f97316' },
  GOOD: { score: 2, label: 'Good', color: '#eab308' },
  STRONG: { score: 3, label: 'Strong', color: '#22c55e' },
  VERY_STRONG: { score: 4, label: 'Very Strong', color: '#10b981' }
};

const SUPPORTED_ROLES = ['user', 'moderator', 'developer', 'admin'];

export class PasswordValidator {
  static validate(password) {
    const issues = [];
    if (password.length < PASSWORD_MIN_LENGTH) {
      issues.push(`Minimum ${PASSWORD_MIN_LENGTH} characters required`);
    }
    if (!/[A-Z]/.test(password)) issues.push('At least one uppercase letter');
    if (!/[a-z]/.test(password)) issues.push('At least one lowercase letter');
    if (!/[0-9]/.test(password)) issues.push('At least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      issues.push('At least one special character');
    }
    return { valid: issues.length === 0, issues };
  }

  static getStrength(password) {
    let score = 0;
    if (password.length >= PASSWORD_MIN_LENGTH) score++;
    if (password.length >= 20) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) score++;
    if (password.length >= 30) score++;

    const normalized = Math.min(Math.floor(score / 6 * 4), 4);
    const levels = Object.values(PASSWORD_STRENGTH_LEVELS);
    return levels[normalized] || levels[0];
  }
}

export class UsernameValidator {
  // Supports Unicode, emoji, and special characters
  static validate(username) {
    const issues = [];
    if (!username || username.length < 2) issues.push('Username must be at least 2 characters');
    if (username.length > 50) issues.push('Username must be 50 characters or less');
    // Disallow only null bytes and specific control chars
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(username)) {
      issues.push('Username contains invalid control characters');
    }
    return { valid: issues.length === 0, issues };
  }

  static sanitize(username) {
    // Normalize unicode, trim whitespace, but preserve emoji and special chars
    return username.normalize('NFC').trim();
  }
}

export class BiometricAuth {
  static isAvailable() {
    if (typeof window === 'undefined') return { available: false, methods: [] };
    const methods = [];

    // Web Authentication API (WebAuthn) — supports fingerprint, Face ID, Windows Hello
    if (window.PublicKeyCredential) {
      methods.push('webauthn');
      methods.push('fingerprint');
      methods.push('face_id');
    }

    // Check platform authenticator availability
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      return { available: true, methods, platformCheck: true };
    }

    return { available: methods.length > 0, methods };
  }

  static async registerCredential(userId, username) {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const options = {
      challenge,
      rp: { name: 'Nexus AI Pro', id: window.location.hostname },
      user: {
        id: userIdBytes,
        name: username,
        displayName: username
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }   // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = await navigator.credentials.create({ publicKey: options });
    return {
      credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      publicKey: credential.response.getPublicKey
        ? btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey())))
        : null
    };
  }

  static async verify(credentialId) {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

    const options = {
      challenge,
      allowCredentials: [{ type: 'public-key', id: credIdBytes }],
      userVerification: 'required',
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({ publicKey: options });
    return { verified: !!assertion, assertionId: assertion.id };
  }
}

export class TwoFactorAuth {
  // TOTP generation (client-side only for display; server validates)
  static generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(5));
      const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`);
    }
    return codes;
  }

  static getMethods() {
    return [
      { id: 'totp', name: 'Authenticator App', icon: '📱', description: 'Google Authenticator, Authy, etc.' },
      { id: 'sms', name: 'SMS', icon: '💬', description: 'Text message to your phone' },
      { id: 'email', name: 'Email', icon: '📧', description: 'One-time code via email' },
      { id: 'biometric', name: 'Biometric', icon: '🔐', description: 'Fingerprint or Face ID' },
      { id: 'hardware', name: 'Hardware Key', icon: '🔑', description: 'YubiKey or similar FIDO2 device' }
    ];
  }
}

export class SessionManager {
  static createToken(userId, role, expiresIn = '24h') {
    // Token creation happens server-side; this creates a client-side session marker
    const sessionId = crypto.randomUUID();
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    return { sessionId, userId, role, expiry };
  }

  static isExpired(session) {
    return !session || Date.now() > session.expiry;
  }

  static getRolePermissions(role) {
    const permissions = {
      user: ['read:own', 'write:own', 'analytics:view'],
      moderator: ['read:own', 'write:own', 'read:users', 'analytics:view', 'moderate:content'],
      developer: ['read:own', 'write:own', 'read:users', 'analytics:all', 'api:access', 'deploy:staging'],
      admin: ['*']
    };
    return permissions[role] || permissions.user;
  }

  static hasPermission(session, permission) {
    const perms = this.getRolePermissions(session?.role || 'user');
    return perms.includes('*') || perms.includes(permission);
  }
}

export class LanguageService {
  static SUPPORTED_LOCALES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  static detect() {
    if (typeof navigator === 'undefined') return 'en';
    return navigator.language?.split('-')[0] || 'en';
  }

  static isRTL(code) {
    return ['ar', 'he', 'fa', 'ur'].includes(code);
  }

  static async translate(text, targetLang) {
    // Placeholder — real implementation calls server /api/translate
    return { translated: text, from: 'en', to: targetLang };
  }
}

export default {
  PasswordValidator,
  UsernameValidator,
  BiometricAuth,
  TwoFactorAuth,
  SessionManager,
  LanguageService,
  SUPPORTED_ROLES,
  PASSWORD_MIN_LENGTH
};
