// src/security/index.ts — Browser-side security services
// 2026-07-06

// ============ Types ============
interface TokenData {
  userId: string;
  scope: string[];
  issuedAt: number;
  expiresAt: number;
  refreshToken?: string;
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  isoDate: string;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
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

  static async encryptData(data: string, password: string, saltHex?: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const salt = saltHex
      ? Uint8Array.from(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
      : crypto.getRandomValues(new Uint8Array(16));
    const passwordKey = await this.deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, passwordKey, dataBuffer);
    const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encryptedData).length);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  static async decryptData(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    const passwordKey = await this.deriveKey(password, salt);
    const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, passwordKey, encrypted);
    return new TextDecoder().decode(decryptedData);
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const importedKey = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-512', salt, iterations: 100000 },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async generateHMAC(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
    const expected = await this.generateHMAC(data, secret);
    return expected === signature;
  }
}

// ============ Authentication ============
export class AuthService {
  private static tokens = new Map<string, TokenData>();

  static generateToken(userId: string, scope: string[] = [], expiresIn = 3600): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: userId, scope,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn
    }));
    const tokenId = `token_${CryptoService.generateNonce(8)}`;
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
    this.revokeToken(token);
    return this.generateToken(tokenData.userId, tokenData.scope);
  }

  static revokeToken(token: string): void {
    const parts = token.split('.');
    if (parts.length === 3) this.tokens.delete(parts[2]);
  }
}

// ============ Authorization ============
export class AuthorizationService {
  private static permissions = new Map<string, string[]>();

  static grantPermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId) || [];
    this.permissions.set(userId, [...new Set([...current, ...permissions])]);
  }

  static hasPermission(userId: string, permission: string): boolean {
    const userPermissions = this.permissions.get(userId) || [];
    return userPermissions.includes(permission) || userPermissions.includes('admin');
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

// ============ Input Validation & Sanitization ============
export class ValidationService {
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
    try { new URL(url); return true; } catch { return false; }
  }

  static isValidJSON(json: string): boolean {
    try { JSON.parse(json); return true; } catch { return false; }
  }

  static isStrongPassword(password: string): { valid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;
    const len = [...password].length;
    if (len >= 13) score += 2; else feedback.push('Password must be at least 13 characters');
    if (len >= 16) score += 1;
    if (/[a-z]/.test(password)) score += 1; else feedback.push('Add lowercase letters');
    if (/[A-Z]/.test(password)) score += 1; else feedback.push('Add uppercase letters');
    if (/[0-9]/.test(password)) score += 1; else feedback.push('Add numbers');
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; else feedback.push('Add special characters');
    return { valid: score >= 6 && len >= 13, score, feedback };
  }
}

// ============ Security Audit & Logging ============
export class SecurityAudit {
  private static auditLog: AuditEntry[] = [];

  static logEvent(
    userId: string,
    action: string,
    resource: string,
    result: 'success' | 'failure',
    details: Record<string, unknown> = {}
  ): void {
    const now = new Date();
    this.auditLog.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      isoDate: now.toISOString(),
      userId, action, resource, result, details
    });
    if (this.auditLog.length > 1000) this.auditLog = this.auditLog.slice(-1000);
  }

  static getAuditLog(userId?: string): AuditEntry[] {
    return userId ? this.auditLog.filter(e => e.userId === userId) : [...this.auditLog];
  }

  static detectSuspiciousActivity(userId: string, threshold = 5): AuditEntry[] {
    const cutoff = Date.now() - 300000;
    const recent = this.auditLog.filter(
      e => e.userId === userId && e.result === 'failure' && e.timestamp.getTime() > cutoff
    );
    return recent.length >= threshold ? recent : [];
  }
}

// ============ Rate Limiting ============
export class RateLimiter {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  static isAllowed(identifier: string, limit = 100, windowMs = 60000): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(identifier);
    if (!record || now > record.resetTime) {
      this.requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    record.count++;
    return record.count <= limit;
  }

  static resetLimit(identifier: string): void {
    this.requestCounts.delete(identifier);
  }

  static getRemainingRequests(identifier: string, limit = 100): number {
    const record = this.requestCounts.get(identifier);
    if (!record || Date.now() > record.resetTime) return limit;
    return Math.max(0, limit - record.count);
  }
}

export default { CryptoService, AuthService, AuthorizationService, ValidationService, SecurityAudit, RateLimiter };
