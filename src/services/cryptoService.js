// File: cryptoService.js | Date: 2026-06-16
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

let speakeasy = null;
try {
  speakeasy = (await import('speakeasy')).default;
} catch {
  console.warn('[CryptoService] speakeasy not installed — TOTP methods will use stubs');
}

export class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 12;
    this.tagLength = 16;
    this.saltLength = 64;
    this.iterations = 310000;
    this.digest = 'sha512';
    this.saltRounds = 12;
  }

  /**
   * Derive a 256-bit master key from secret + salt using PBKDF2.
   * @param {string} secret
   * @param {Buffer} salt
   * @returns {Buffer}
   */
  deriveMasterKey(secret, salt) {
    if (!secret) throw new Error('Encryption secret is required');
    return crypto.pbkdf2Sync(secret, salt, this.iterations, 32, this.digest);
  }

  /**
   * Hash a password using bcryptjs.
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashPassword(password) {
    return bcryptjs.hash(password, this.saltRounds);
  }

  /**
   * Verify a password against a bcrypt hash.
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password, hash) {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Encrypt plaintext using AES-256-GCM with a derived key.
   * @param {string} plaintext
   * @param {string} [aad='']
   * @returns {{iv: string, ciphertext: string, tag: string, version: string}}
   */
  encrypt(plaintext, aad = '') {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) throw new Error('ENCRYPTION_SECRET environment variable is required');

    const salt = crypto.randomBytes(this.saltLength);
    const key = this.deriveMasterKey(secret, salt);
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      ciphertext: Buffer.concat([salt, encrypted]).toString('hex'),
      tag: tag.toString('hex'),
      version: 'v1',
    };
  }

  /**
   * Decrypt a payload produced by encrypt().
   * @param {{iv: string, ciphertext: string, tag: string, version: string}} payload
   * @param {string} [aad='']
   * @returns {string}
   */
  decrypt(payload, aad = '') {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) throw new Error('ENCRYPTION_SECRET environment variable is required');

    if (payload.version !== 'v1') throw new Error(`Unsupported encryption version: ${payload.version}`);

    const raw = Buffer.from(payload.ciphertext, 'hex');
    const salt = raw.slice(0, this.saltLength);
    const ciphertext = raw.slice(this.saltLength);

    const key = this.deriveMasterKey(secret, salt);
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /**
   * Generate a cryptographically random hex token.
   * @param {number} [length=32]
   * @returns {string}
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * SHA-512 hash of data.
   * @param {string} data
   * @returns {string}
   */
  hash(data) {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * HMAC-SHA256 of data with key.
   * @param {string} data
   * @param {string} key
   * @returns {string}
   */
  hmac(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Generate a TOTP secret.
   * @returns {object}
   */
  generateTOTPSecret() {
    if (!speakeasy) {
      const stub = crypto.randomBytes(20).toString('base32');
      return { base32: stub, otpauth_url: `otpauth://totp/NexusAIPro?secret=${stub}` };
    }
    return speakeasy.generateSecret({ length: 20, name: 'Nexus AI Pro' });
  }

  /**
   * Verify a TOTP token against a secret.
   * @param {string} token
   * @param {string} secret
   * @returns {boolean}
   */
  verifyTOTP(token, secret) {
    if (!speakeasy) {
      console.warn('[CryptoService] speakeasy not installed — TOTP verification always returns false');
      return false;
    }
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  /**
   * Generate an array of one-time backup codes.
   * @param {number} [count=8]
   * @returns {string[]}
   */
  generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
}

export default new CryptoService();
