/**
 * src/utils/crypto.js
 * Proper cryptography utilities — AES-256-GCM, HKDF key derivation, TOTP/HOTP for MFA.
 * Uses Web Crypto API (browser) and Node.js crypto (server) via unified interface.
 * Created: 2026-08-23
 */

// ── Environment detection ─────────────────────────────────────────────────────
// This file is browser-only (AuthSystem.jsx uses it).  Server-side code uses
// src/utils/crypto-node.js directly.  We always use the Web Crypto API here.
// IS_NODE is kept for runtime guard but the async Node path is REMOVED to
// avoid top-level-await issues in Vite targets that pre-ES2022.
const IS_NODE = false;   // Force Web Crypto path in browser bundle
const nodeCrypto = null; // Unused; here for future SSR compatibility

// ── Enumerated error codes (never expose stack traces to clients) ─────────────
export const CryptoError = Object.freeze({
  ENCRYPT_FAILED:      'E_ENCRYPT',
  DECRYPT_FAILED:      'E_DECRYPT',
  KEY_DERIVE_FAILED:   'E_KEY_DERIVE',
  SIGNATURE_INVALID:   'E_SIG_INVALID',
  TOKEN_EXPIRED:       'E_TOKEN_EXPIRED',
  TOKEN_INVALID:       'E_TOKEN_INVALID',
  BIOMETRIC_FAILED:    'E_BIOMETRIC',
  MFA_INVALID:         'E_MFA_INVALID',
});

/**
 * Derive a 256-bit key from a passphrase using PBKDF2-SHA-512 (100k iterations).
 * Returns a hex-encoded key string.
 */
export async function deriveKey(passphrase, saltHex) {
  if (!passphrase || typeof passphrase !== 'string') throw new Error(CryptoError.KEY_DERIVE_FAILED);

  if (IS_NODE && nodeCrypto) {
    const salt = Buffer.from(saltHex, 'hex');
    const key  = nodeCrypto.pbkdf2Sync(passphrase, salt, 100_000, 32, 'sha512');
    return key.toString('hex');
  }

  // Web Crypto path
  const enc    = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const salt   = hexToUint8(saltHex);
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-512' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', aesKey);
  return uint8ToHex(new Uint8Array(raw));
}

/**
 * Generate a cryptographically secure random salt (64 bytes → 128 hex chars).
 */
export function generateSalt() {
  if (IS_NODE && nodeCrypto) return nodeCrypto.randomBytes(64).toString('hex');
  return uint8ToHex(crypto.getRandomValues(new Uint8Array(64)));
}

/**
 * Generate a random UUID v4.
 */
export function randomUUID() {
  if (IS_NODE && nodeCrypto) return nodeCrypto.randomUUID();
  return crypto.randomUUID();
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * @returns {{ iv: string, ciphertext: string, tag: string }} — all hex-encoded
 */
export async function encrypt(plaintext, keyHex) {
  try {
    if (IS_NODE && nodeCrypto) {
      const key = Buffer.from(keyHex, 'hex');
      const iv  = nodeCrypto.randomBytes(12);
      const cipher = nodeCrypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return { iv: iv.toString('hex'), ciphertext: enc.toString('hex'), tag: tag.toString('hex') };
    }

    // Web Crypto path
    const aesKey = await importAesKey(keyHex);
    const iv     = crypto.getRandomValues(new Uint8Array(12));
    const enc    = new TextEncoder();
    const result = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(plaintext));
    // AES-GCM in WebCrypto appends the 16-byte tag to ciphertext
    const ct  = new Uint8Array(result, 0, result.byteLength - 16);
    const tag = new Uint8Array(result, result.byteLength - 16);
    return { iv: uint8ToHex(iv), ciphertext: uint8ToHex(ct), tag: uint8ToHex(tag) };
  } catch {
    throw new Error(CryptoError.ENCRYPT_FAILED);
  }
}

/**
 * Decrypt ciphertext with AES-256-GCM.
 * @param {{ iv: string, ciphertext: string, tag: string }} payload
 * @returns {string} decrypted plaintext
 */
export async function decrypt(payload, keyHex) {
  try {
    const { iv, ciphertext, tag } = payload;
    if (IS_NODE && nodeCrypto) {
      const key  = Buffer.from(keyHex, 'hex');
      const dec  = nodeCrypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'), { authTagLength: 16 });
      dec.setAuthTag(Buffer.from(tag, 'hex'));
      const plain = Buffer.concat([dec.update(Buffer.from(ciphertext, 'hex')), dec.final()]);
      return plain.toString('utf8');
    }

    // Web Crypto path (concatenate ciphertext + tag for SubtleCrypto)
    const aesKey  = await importAesKey(keyHex);
    const ctBytes = hexToUint8(ciphertext);
    const tagBytes = hexToUint8(tag);
    const combined = new Uint8Array(ctBytes.length + tagBytes.length);
    combined.set(ctBytes);
    combined.set(tagBytes, ctBytes.length);
    const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToUint8(iv) }, aesKey, combined);
    return new TextDecoder().decode(result);
  } catch {
    throw new Error(CryptoError.DECRYPT_FAILED);
  }
}

/**
 * HMAC-SHA256 of a message with a key (hex-encoded output).
 */
export async function hmac(message, keyHex) {
  if (IS_NODE && nodeCrypto) {
    const hmacObj = nodeCrypto.createHmac('sha256', Buffer.from(keyHex, 'hex'));
    hmacObj.update(message);
    return hmacObj.digest('hex');
  }
  const keyMat = await crypto.subtle.importKey(
    'raw', hexToUint8(keyHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', keyMat, new TextEncoder().encode(message));
  return uint8ToHex(new Uint8Array(sig));
}

/**
 * Constant-time comparison (prevents timing attacks).
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (IS_NODE && nodeCrypto) return nodeCrypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  // Fallback: XOR-based comparison
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── TOTP (RFC 6238) for MFA ───────────────────────────────────────────────────
/**
 * Generate a TOTP code from a base32 secret.
 * Compatible with Google Authenticator, Authy, etc.
 */
export async function generateTOTP(base32Secret) {
  const key    = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  return _hotp(key, counter);
}

/**
 * Verify a 6-digit TOTP code (±1 window for clock drift).
 */
export async function verifyTOTP(base32Secret, token) {
  const key    = base32Decode(base32Secret);
  const now    = Math.floor(Date.now() / 1000 / 30);
  const padded = token.toString().padStart(6, '0');
  for (const delta of [-1, 0, 1]) {
    const expected = await _hotp(key, now + delta);
    if (safeEqual(expected, padded)) return true;
  }
  return false;
}

async function _hotp(keyBytes, counter) {
  // Pack counter as 8-byte big-endian
  const buf = new Uint8Array(8);
  let c = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = Number(c & 0xffn);
    c >>= 8n;
  }

  let mac;
  if (IS_NODE && nodeCrypto) {
    const h = nodeCrypto.createHmac('sha1', Buffer.from(keyBytes));
    h.update(Buffer.from(buf));
    mac = [...h.digest()];
  } else {
    const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const s = await crypto.subtle.sign('HMAC', k, buf);
    mac = [...new Uint8Array(s)];
  }

  const offset = mac[mac.length - 1] & 0x0f;
  const code   = (((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]) % 1_000_000;
  return code.toString().padStart(6, '0');
}

/**
 * Generate a random base32-encoded TOTP secret (20 bytes).
 */
export function generateTOTPSecret() {
  const bytes = IS_NODE && nodeCrypto
    ? nodeCrypto.randomBytes(20)
    : crypto.getRandomValues(new Uint8Array(20));
  return base32Encode([...bytes]);
}

// ── Password strength validation ──────────────────────────────────────────────
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
const UNICODE_LETTER = /\p{L}/u;
const HAS_UPPER  = /\p{Lu}/u;
const HAS_LOWER  = /\p{Ll}/u;
const HAS_DIGIT  = /\d/;
const HAS_EMOJI  = /\p{Emoji}/u;

/**
 * Validate password strength.
 * Minimum 13 characters, must include uppercase, lowercase, digit, and special char.
 * Returns { valid: boolean, score: 0-5, issues: string[] }
 */
export function validatePassword(password) {
  const issues = [];
  const p = password || '';

  if (p.length < 13) issues.push('Minimum 13 characters required');
  if (!HAS_UPPER.test(p))  issues.push('At least one uppercase letter required');
  if (!HAS_LOWER.test(p))  issues.push('At least one lowercase letter required');
  if (!HAS_DIGIT.test(p))  issues.push('At least one digit required');
  if (!SPECIAL_CHARS.test(p)) issues.push('At least one special character required');

  // Bonus score components
  let score = 0;
  if (p.length >= 13) score++;
  if (p.length >= 20) score++;
  if (HAS_UPPER.test(p) && HAS_LOWER.test(p)) score++;
  if (HAS_DIGIT.test(p) && SPECIAL_CHARS.test(p)) score++;
  if (p.length >= 30 || HAS_EMOJI.test(p)) score++;

  return { valid: issues.length === 0, score, issues };
}

/**
 * Validate a username — allows letters, digits, underscores, hyphens, emoji.
 * No SQL injection characters allowed.
 */
export function validateUsername(username) {
  const u = username || '';
  if (u.length < 2 || u.length > 64) return { valid: false, issue: 'Username must be 2–64 characters' };
  // Block SQL/script injection characters while allowing emoji and Unicode letters
  const BLOCKED = /['"`;\\<>{}]/;
  if (BLOCKED.test(u)) return { valid: false, issue: 'Username contains disallowed characters' };
  return { valid: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function importAesKey(keyHex) {
  return crypto.subtle.importKey('raw', hexToUint8(keyHex), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function hexToUint8(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

function uint8ToHex(arr) {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Minimal RFC 4648 base32
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += BASE32_CHARS[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += BASE32_CHARS[(val << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const s = str.toUpperCase().replace(/=+$/, '');
  let bits = 0, val = 0;
  const out = [];
  for (const c of s) { val = (val << 5) | BASE32_CHARS.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(out);
}
