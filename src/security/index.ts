/**
 * Security Module — Barrel export for all security utilities and services
 * @date 2026-08-03
 */

// ============ Type Definitions ============

export interface TokenData {
  userId: string;
  role: UserRole;
  scope: string[];
  issuedAt: number;
  expiresAt: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
}

export type UserRole = 'admin' | 'dev' | 'moderator' | 'user';

export interface PasswordStrengthResult {
  valid: boolean;
  score: number;
  feedback: string[];
}

// ============ Cryptography & Hashing ============
export class CryptoService {
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static generateNonce(length = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async encryptData(data: string, password: string, salt?: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const derivedSalt = salt ?? this.generateNonce(16);
    const passwordKey = await this.deriveKey(password, derivedSalt);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      passwordKey,
      dataBuffer
    );

    const saltBytes = encoder.encode(derivedSalt);
    const combined = new Uint8Array(
      2 + saltBytes.length + iv.length + new Uint8Array(encryptedData).length
    );
    combined[0] = saltBytes.length >> 8;
    combined[1] = saltBytes.length & 0xff;
    combined.set(saltBytes, 2);
    combined.set(iv, 2 + saltBytes.length);
    combined.set(new Uint8Array(encryptedData), 2 + saltBytes.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decryptData(encryptedStr: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedStr), c => c.charCodeAt(0));
    const saltLen = (combined[0] << 8) | combined[1];
    const saltBytes = combined.slice(2, 2 + saltLen);
    const salt = new TextDecoder().decode(saltBytes);
    const iv = combined.slice(2 + saltLen, 2 + saltLen + 12);
    const encrypted = combined.slice(2 + saltLen + 12);

    const passwordKey = await this.deriveKey(password, salt);
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      passwordKey,
      encrypted
    );

    return new TextDecoder().decode(decryptedData);
  }

  private static async deriveKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const importedKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: encoder.encode(salt),
        iterations: 210000
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async generateHMAC(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
    const expected = await this.generateHMAC(data, secret);
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }
}

// ============ Authentication ============
export class AuthService {
  private static tokens = new Map<string, TokenData>();

  static generateToken(
    userId: string,
    role: UserRole = 'user',
    scope: string[] = [],
    expiresIn = 3600
  ): string {
    const tokenId = CryptoService.generateNonce(32);
    const now = Date.now();
    const data: TokenData = {
      userId,
      role,
      scope,
      issuedAt: now,
      expiresAt: now + expiresIn * 1000
    };
    this.tokens.set(tokenId, data);
    // Format: tokenId.base64(payload) — tokenId is the opaque handle, never decodeable without map
    const payload = btoa(JSON.stringify({ sub: userId, role, scope, exp: data.expiresAt }));
    return `${tokenId}.${payload}`;
  }

  static verifyToken(token: string): TokenData | null {
    if (!token || typeof token !== 'string') return null;
    const tokenId = token.split('.')[0];
    const data = this.tokens.get(tokenId);
    if (!data || data.expiresAt < Date.now()) {
      this.tokens.delete(tokenId);
      return null;
    }
    return data;
  }

  static refreshToken(token: string): string | null {
    const data = this.verifyToken(token);
    if (!data) return null;
    this.revokeToken(token);
    return this.generateToken(data.userId, data.role, data.scope);
  }

  static revokeToken(token: string): void {
    const tokenId = token.split('.')[0];
    this.tokens.delete(tokenId);
  }
}

// ============ Authorization ============
export class AuthorizationService {
  private static permissions = new Map<string, Set<string>>();

  private static ROLE_DEFAULTS: Record<UserRole, string[]> = {
    admin:     ['*'],
    dev:       ['read:all', 'write:projects', 'write:code', 'read:analytics', 'read:security'],
    moderator: ['read:all', 'write:content', 'delete:content'],
    user:      ['read:own', 'write:own']
  };

  static initRole(userId: string, role: UserRole): void {
    const perms = new Set(this.ROLE_DEFAULTS[role] ?? this.ROLE_DEFAULTS.user);
    this.permissions.set(userId, perms);
  }

  static grantPermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId) ?? new Set<string>();
    permissions.forEach(p => current.add(p));
    this.permissions.set(userId, current);
  }

  static hasPermission(userId: string, permission: string): boolean {
    const perms = this.permissions.get(userId) ?? new Set<string>();
    return perms.has('*') || perms.has(permission);
  }

  static hasAllPermissions(userId: string, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(userId, p));
  }

  static hasAnyPermission(userId: string, permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(userId, p));
  }

  static revokePermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId);
    if (current) permissions.forEach(p => current.delete(p));
  }
}

// ============ Input Validation & Sanitization ============
export class ValidationService {
  private static readonly EMOJI_RE = /\p{Emoji}/u;

  static sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidJSON(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates username allowing Unicode letters, numbers, underscores, hyphens, dots, and emoji.
   * Min 3 chars, max 64 chars.
   */
  static isValidUsername(username: string): { valid: boolean; feedback: string[] } {
    const feedback: string[] = [];
    if (!username || username.length < 3) feedback.push('Username must be at least 3 characters');
    if (username.length > 64) feedback.push('Username must be 64 characters or fewer');
    // Allow Unicode letters, digits, underscores, hyphens, dots, and emoji
    if (!/^[\p{L}\p{N}_\-.\p{Emoji}]+$/u.test(username)) {
      feedback.push('Username contains invalid characters');
    }
    return { valid: feedback.length === 0, feedback };
  }

  /** Minimum 13 characters, uppercase, lowercase, digit, special character required. */
  static isStrongPassword(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 13) score += 2;
    else feedback.push('Password must be at least 13 characters');

    if (password.length >= 20) score += 1;

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 2;
    else feedback.push('Add special characters (e.g. !@#$%^&*)');

    // Penalise common patterns
    if (/(.)\1{3,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeated characters');
    }

    const valid = password.length >= 13 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^a-zA-Z0-9]/.test(password);

    return { valid, score: Math.max(0, score), feedback };
  }
}

// ============ Security Audit & Logging ============
export class SecurityAudit {
  private static auditLog: AuditEntry[] = [];
  private static readonly MAX_LOG_SIZE = 5000;

  static logEvent(
    userId: string,
    action: string,
    resource: string,
    result: 'success' | 'failure',
    details: Record<string, unknown> = {}
  ): void {
    this.auditLog.push({
      id: CryptoService.generateNonce(8),
      timestamp: new Date(),
      userId,
      action,
      resource,
      result,
      details
    });
    if (this.auditLog.length > this.MAX_LOG_SIZE) {
      this.auditLog = this.auditLog.slice(-this.MAX_LOG_SIZE);
    }
  }

  static getAuditLog(userId?: string): AuditEntry[] {
    return userId
      ? this.auditLog.filter(e => e.userId === userId)
      : [...this.auditLog];
  }

  static detectSuspiciousActivity(userId: string, threshold = 5): AuditEntry[] {
    const windowStart = Date.now() - 300_000;
    const recent = this.auditLog.filter(
      e =>
        e.userId === userId &&
        e.result === 'failure' &&
        e.timestamp.getTime() >= windowStart
    );
    if (recent.length >= threshold) {
      this.logEvent(userId, 'SUSPICIOUS_ACTIVITY_DETECTED', 'auth', 'failure', {
        failureCount: recent.length
      });
    }
    return recent.length >= threshold ? recent : [];
  }
}

// ============ Rate Limiting (sliding window) ============
export class RateLimiter {
  private static windows = new Map<string, number[]>();

  static isAllowed(key: string, limit = 100, windowMs = 60_000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.windows.get(key) ?? []).filter(t => t > windowStart);
    timestamps.push(now);
    this.windows.set(key, timestamps);
    return timestamps.length <= limit;
  }

  static resetLimit(key: string): void {
    this.windows.delete(key);
  }

  static getRemainingRequests(key: string, limit = 100, windowMs = 60_000): number {
    const now = Date.now();
    const timestamps = (this.windows.get(key) ?? []).filter(t => t > now - windowMs);
    return Math.max(0, limit - timestamps.length);
  }
}

// ============ Export ============
export default {
  CryptoService,
  AuthService,
  AuthorizationService,
  ValidationService,
  SecurityAudit,
  RateLimiter
};
