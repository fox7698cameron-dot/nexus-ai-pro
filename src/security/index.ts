/**
 * Security Module - Barrel export for all security utilities and services
 * Provides centralized access to encryption, hashing, authentication, and authorization
 */

// ============ Cryptography & Hashing ============
export class CryptoService {
  /**
   * Generate secure hash using SHA-256
   */
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate cryptographic nonce
   */
  static generateNonce(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt data using AES-GCM
   */
  static async encryptData(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const passwordKey = await this.deriveKey(password);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      passwordKey,
      dataBuffer
    );

    const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data using AES-GCM
   */
  static async decryptData(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const passwordKey = await this.deriveKey(password);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      passwordKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Derive encryption key from password
   */
  private static async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('nexus-ai-salt'),
        iterations: 100000
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate HMAC signature
   */
  static async generateHMAC(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );

    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify HMAC signature
   */
  static async verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
    const expectedSignature = await this.generateHMAC(data, secret);
    return expectedSignature === signature;
  }
}

// ── Token data shape ──────────────────────────────
interface TokenData {
  userId: string;
  scope: string[];
  issuedAt: number;
  expiresAt: number;
  refreshToken?: string;
}

// ── Audit entry shape ─────────────────────────────
interface AuditEntry {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
}

// ============ Authentication ============
export class AuthService {
  private static tokens = new Map<string, TokenData>();

  /**
   * Generate JWT token
   */
  static generateToken(userId: string, scope: string[] = [], expiresIn: number = 3600): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: userId,
      scope,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn
    }));

    const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tokens.set(tokenId, {
      userId,
      scope,
      issuedAt: Date.now(),
      expiresAt: Date.now() + expiresIn * 1000
    });

    return `${header}.${payload}.${tokenId}`;
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): TokenData | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const tokenId = parts[2];
    const tokenData = this.tokens.get(tokenId);

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return null;
    }

    return tokenData;
  }

  /**
   * Refresh token
   */
  static refreshToken(token: string): string | null {
    const tokenData = this.verifyToken(token);
    if (!tokenData) return null;

    return this.generateToken(tokenData.userId, tokenData.scope);
  }

  /**
   * Revoke token
   */
  static revokeToken(token: string): void {
    const parts = token.split('.');
    if (parts.length === 3) {
      this.tokens.delete(parts[2]);
    }
  }
}

// ============ Authorization ============
export class AuthorizationService {
  private static permissions = new Map<string, string[]>();

  /**
   * Grant permissions to user
   */
  static grantPermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId) || [];
    this.permissions.set(userId, [...new Set([...current, ...permissions])]);
  }

  /**
   * Check if user has permission
   */
  static hasPermission(userId: string, permission: string): boolean {
    const userPermissions = this.permissions.get(userId) || [];
    return userPermissions.includes(permission) || userPermissions.includes('admin');
  }

  /**
   * Check multiple permissions (AND logic)
   */
  static hasAllPermissions(userId: string, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(userId, p));
  }

  /**
   * Check multiple permissions (OR logic)
   */
  static hasAnyPermission(userId: string, permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(userId, p));
  }

  /**
   * Revoke permissions
   */
  static revokePermissions(userId: string, permissions: string[]): void {
    const current = this.permissions.get(userId) || [];
    this.permissions.set(
      userId,
      current.filter(p => !permissions.includes(p))
    );
  }
}

// ============ Input Validation & Sanitization ============
export class ValidationService {
  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON structure
   */
  static isValidJSON(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static isStrongPassword(password: string): { valid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 13) score += 1;
    else feedback.push('Password must be at least 13 characters');

    if (password.length >= 20) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    return {
      valid: score >= 4,
      score,
      feedback
    };
  }
}

// ============ Security Audit & Logging ============
export class SecurityAudit {
  private static auditLog: AuditEntry[] = [];

  /**
   * Log security event
   */
  static logEvent(userId: string, action: string, resource: string, result: 'success' | 'failure', details: Record<string, unknown> = {}): void {
    this.auditLog.push({
      timestamp: new Date(),
      userId,
      action,
      resource,
      result,
      details
    });
  }

  /**
   * Get audit log
   */
  static getAuditLog(userId?: string): AuditEntry[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (userId) {
      return this.auditLog.filter(entry => entry.userId === userId);
    }
    return this.auditLog;
  }

  /**
   * Detect suspicious activity
   */
  static detectSuspiciousActivity(userId: string, threshold: number = 5): AuditEntry[] {
    const recentEntries = this.auditLog.filter(
      entry => entry.userId === userId &&
               entry.result === 'failure' &&
               Date.now() - entry.timestamp.getTime() < 300000 // Last 5 minutes
    );
    
    if (recentEntries.length >= threshold) {
      console.warn(`Suspicious activity detected for user: ${userId}`);
      return recentEntries;
    }
    
    return [];
  }
}

// ============ Rate Limiting ============
export class RateLimiter {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request is allowed
   */
  static isAllowed(userId: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(userId);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    record.count++;
    if (record.count > limit) {
      return false;
    }

    return true;
  }

  /**
   * Reset rate limit for user
   */
  static resetLimit(userId: string): void {
    this.requestCounts.delete(userId);
  }
}

// ============ Export All Security Services ============
export default {
  CryptoService,
  AuthService,
  AuthorizationService,
  ValidationService,
  SecurityAudit,
  RateLimiter
};
