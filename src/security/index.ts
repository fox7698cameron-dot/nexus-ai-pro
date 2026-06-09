// src/security/index.ts
// Nexus AI Pro — Client-Side Security Utilities
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

// ── Type definitions ───────────────────────────────────────────────────────────

interface TokenData {
  userId:       string;
  scope:        string[];
  issuedAt:     number;
  expiresAt:    number;
  refreshToken?: string;
}

interface AuditEntry {
  timestamp: Date;
  userId:    string;
  action:    string;
  resource:  string;
  result:    'success' | 'failure';
  details:   Record<string, unknown>;
}

const PASSWORD_MIN_LENGTH = 13;

// ── Cryptography & Hashing ────────────────────────────────────────────────────

export class CryptoService {
  static async hashData(data: string): Promise<string> {
    const encoder    = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static generateNonce(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async encryptData(data: string, password: string): Promise<string> {
    const encoder    = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const passwordKey = await this.deriveKey(password);

    const iv            = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, passwordKey, dataBuffer);

    const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decryptData(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv        = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const passwordKey   = await this.deriveKey(password);
    const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, passwordKey, encrypted);

    return new TextDecoder().decode(decryptedData);
  }

  private static async deriveKey(password: string): Promise<CryptoKey> {
    const encoder   = new TextEncoder();
    const importedKey = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);

    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode('nexus-ai-salt-v2'), iterations: 150000 },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async generateHMAC(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key     = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig     = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
    return (await this.generateHMAC(data, secret)) === signature;
  }
}

// ── Authentication ─────────────────────────────────────────────────────────────

export class AuthService {
  private static tokens = new Map<string, TokenData>();

  static generateToken(userId: string, scope: string[] = [], expiresIn: number = 3600): string {
    const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: userId, scope, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresIn }));

    const tokenId = `token_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.tokens.set(tokenId, { userId, scope, issuedAt: Date.now(), expiresAt: Date.now() + expiresIn * 1000 });

    return `${header}.${payload}.${tokenId}`;
  }

  static verifyToken(token: string): TokenData | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const tokenData = this.tokens.get(parts[2]);
    if (!tokenData || tokenData.expiresAt < Date.now()) return null;

    return tokenData;
  }

  static refreshToken(token: string): string | null {
    const tokenData = this.verifyToken(token);
    if (!tokenData) return null;
    return this.generateToken(tokenData.userId, tokenData.scope);
  }

  static revokeToken(token: string): void {
    const parts = token.split('.');
    if (parts.length === 3) this.tokens.delete(parts[2]);
  }
}

// ── Authorization ──────────────────────────────────────────────────────────────

export class AuthorizationService {
  private static permissions = new Map<string, string[]>();

  static grantPermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId) || [];
    this.permissions.set(userId, [...new Set([...current, ...permissions])]);
  }

  static hasPermission(userId: string, permission: string): boolean {
    const p = this.permissions.get(userId) || [];
    return p.includes(permission) || p.includes('admin') || p.includes('super_admin');
  }

  static hasAllPermissions(userId: string, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(userId, p));
  }

  static hasAnyPermission(userId: string, permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(userId, p));
  }

  static revokePermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId) || [];
    this.permissions.set(userId, current.filter(p => !permissions.includes(p)));
  }
}

// ── Input Validation & Sanitization ───────────────────────────────────────────

export class ValidationService {
  /** HTML-encodes dangerous chars while preserving Unicode / emoji. */
  static sanitizeInput(input: string): string {
    return input
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  static isValidUrl(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
  }

  static isValidJSON(json: string): boolean {
    try { JSON.parse(json); return true; } catch { return false; }
  }

  /**
   * Password must be 13+ chars with upper, lower, digit, special char.
   * Returns score 0-6 (6 = all criteria met).
   */
  static isStrongPassword(password: string): { valid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= PASSWORD_MIN_LENGTH) score++;
    else feedback.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);

    if (password.length >= 16) score++;

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Add special characters (!@#$%…)');

    return { valid: score >= 5, score, feedback };
  }

  /** Validates username: 2-64 chars, allows Unicode/emoji, rejects control chars. */
  static isValidUsername(username: string): { valid: boolean; reason?: string } {
    const trimmed = username.trim();
    if ([...trimmed].length < 2)   return { valid: false, reason: 'Username must be at least 2 characters' };
    if ([...trimmed].length > 64)  return { valid: false, reason: 'Username must be 64 characters or fewer' };
    if (/[\x00-\x1F\x7F]/.test(trimmed)) return { valid: false, reason: 'Username contains invalid characters' };
    return { valid: true };
  }
}

// ── Security Audit & Logging ───────────────────────────────────────────────────

export class SecurityAudit {
  private static auditLog: AuditEntry[] = [];
  private static readonly MAX_ENTRIES = 5000;

  static logEvent(
    userId:   string,
    action:   string,
    resource: string,
    result:   'success' | 'failure',
    details:  Record<string, unknown> = {}
  ): void {
    this.auditLog.push({ timestamp: new Date(), userId, action, resource, result, details });
    if (this.auditLog.length > this.MAX_ENTRIES) {
      this.auditLog = this.auditLog.slice(-this.MAX_ENTRIES);
    }
  }

  static getAuditLog(userId?: string): AuditEntry[] {
    if (userId) return this.auditLog.filter(e => e.userId === userId);
    return this.auditLog;
  }

  static detectSuspiciousActivity(userId: string, threshold = 5): AuditEntry[] {
    const recent = this.auditLog.filter(
      e => e.userId === userId && e.result === 'failure' && Date.now() - e.timestamp.getTime() < 300000
    );
    if (recent.length >= threshold) console.warn(`Suspicious activity detected for user: ${userId}`);
    return recent.length >= threshold ? recent : [];
  }
}

// ── Rate Limiter ───────────────────────────────────────────────────────────────

export class RateLimiter {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  static isAllowed(userId: string, limit = 100, windowMs = 60000): boolean {
    const now    = Date.now();
    const record = this.requestCounts.get(userId);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    record.count++;
    return record.count <= limit;
  }

  static resetLimit(userId: string): void {
    this.requestCounts.delete(userId);
  }
}

export default { CryptoService, AuthService, AuthorizationService, ValidationService, SecurityAudit, RateLimiter };
