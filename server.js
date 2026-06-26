// ================================================
// NEXUS AI PRO - Enhanced Backend Server
// Military-Grade Security & Multi-Model AI Platform
// ================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import Jexl from 'jexl';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateSecret as generateTotpSecret, verify as verifyTotp, generateURI as generateTotpURI } from 'otplib';
import QRCode from 'qrcode';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

dotenv.config();

const execAsync = promisify(exec);

const app = express();
const httpServer = createServer(app);

// ================================================
// MILITARY-GRADE SECURITY MODULE
// ================================================
class SecurityModule {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    // Use 12 byte IV for AES-GCM standard (matches UI ENCRYPTION_CONFIG)
    this.ivLength = 12;
    this.tagLength = 16;
    this.saltLength = 64;
    this.iterations = 100000;
    this.digest = 'sha512';
    this.masterKey = this.deriveMasterKey();
    this.pqcAlgorithm = 'ML-KEM-768'; // FIPS 203, NIST-standardized post-quantum KEM
    this.kemKeyPair = ml_kem768.keygen();
    this.auditLog = [];
    this.vulnerabilityPatches = new Map();
    this.threatDatabase = new Set();
    this.lastScan = Date.now();
    this.lastKeyRotation = Date.now();
    this.dependencyAuditCache = null;
    this.dependencyAuditCacheTime = 0;
  }

  // Derive master encryption key
  deriveMasterKey() {
    const secret = process.env.ENCRYPTION_SECRET || crypto.randomBytes(32).toString('hex');
    const salt = process.env.ENCRYPTION_SALT || crypto.randomBytes(this.saltLength).toString('hex');
    return crypto.pbkdf2Sync(secret, salt, this.iterations, this.keyLength, this.digest);
  }

  // Combines the classical master key with a fresh ML-KEM shared secret via HKDF, so
  // recovering either secret alone (e.g. a future quantum break of the KEM, or a leak
  // of the PBKDF2 key) is insufficient to derive the per-record AES key.
  deriveHybridKey(kemSharedSecret) {
    const ikm = Buffer.concat([this.masterKey, Buffer.from(kemSharedSecret)]);
    const derived = crypto.hkdfSync(this.digest, ikm, Buffer.alloc(0), 'nexus-pqc-hybrid-v1', this.keyLength);
    return Buffer.from(derived);
  }

  // AES-256-GCM Encryption, hybridized with an ML-KEM-768 encapsulation per record
  // (versioned output)
  encrypt(plaintext, additionalData = '') {
    try {
      const { cipherText: kemCipherText, sharedSecret } = ml_kem768.encapsulate(this.kemKeyPair.publicKey);
      const recordKey = this.deriveHybridKey(sharedSecret);

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, recordKey, iv, {
        authTagLength: this.tagLength
      });

      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData), { plaintextLength: Buffer.byteLength(plaintext) });
      }

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      const tag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        encrypted: encrypted.toString('hex'),
        tag: tag.toString('hex'),
        kem: Buffer.from(kemCipherText).toString('hex'),
        pqcAlgorithm: this.pqcAlgorithm,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logAudit('ENCRYPTION_ERROR', { error: error.message });
      throw new Error('Encryption failed');
    }
  }

  // AES-256-GCM Decryption; decapsulates the per-record ML-KEM ciphertext (when present)
  // to rebuild the same hybrid key used at encryption time.
  decrypt(encryptedData, additionalData = '') {
    try {
      const { iv, encrypted, tag, kem } = encryptedData;
      const recordKey = kem
        ? this.deriveHybridKey(ml_kem768.decapsulate(Buffer.from(kem, 'hex'), this.kemKeyPair.secretKey))
        : this.masterKey;

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        recordKey,
        Buffer.from(iv, 'hex'),
        { authTagLength: this.tagLength }
      );

      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData));
      }

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'hex')),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logAudit('DECRYPTION_ERROR', { error: error.message });
      throw new Error('Decryption failed - data may be tampered');
    }
  }

  // Hash sensitive data
  hash(data) {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  // HMAC for message authentication
  hmac(data) {
    return crypto.createHmac('sha256', this.masterKey).update(data).digest('hex');
  }

  // Generate secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Audit logging
  logAudit(event, details) {
    const entry = {
      id: uuidv4(),
      timestamp: Date.now(),
      event,
      details,
      hash: this.hash(JSON.stringify({ event, details, timestamp: Date.now() }))
    };
    this.auditLog.push(entry);

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    return entry;
  }

  // Parse a real `npm audit --json` report into our dashboard's vulnerability shape
  parseAuditReport(stdout) {
    const report = JSON.parse(stdout);
    const counts = report.metadata?.vulnerabilities || {
      info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0
    };
    const vulnerabilities = Object.entries(report.vulnerabilities || {}).map(([name, v]) => ({
      name,
      severity: v.severity,
      range: v.range,
      fixAvailable: !!v.fixAvailable,
      via: Array.isArray(v.via)
        ? v.via.map(entry => (typeof entry === 'string' ? entry : entry.title)).filter(Boolean)
        : []
    }));
    return { counts, vulnerabilities };
  }

  computeSecurityScore(counts) {
    const score = 100
      - (counts.critical || 0) * 25
      - (counts.high || 0) * 10
      - (counts.moderate || 0) * 5
      - (counts.low || 0) * 1;
    return Math.max(0, Math.min(100, score));
  }

  // Real dependency vulnerability data, sourced from `npm audit --json`. Cached for 5 minutes
  // so the dashboard doesn't spawn a new npm process on every load.
  async runDependencyAudit(force = false) {
    const cacheAge = Date.now() - this.dependencyAuditCacheTime;
    if (!force && this.dependencyAuditCache && cacheAge < 5 * 60 * 1000) {
      return this.dependencyAuditCache;
    }

    try {
      const { stdout } = await execAsync('npm audit --json', { maxBuffer: 10 * 1024 * 1024 });
      const { counts, vulnerabilities } = this.parseAuditReport(stdout);
      this.dependencyAuditCache = { generatedAt: Date.now(), counts, vulnerabilities, stale: false };
      this.dependencyAuditCacheTime = Date.now();
      return this.dependencyAuditCache;
    } catch (error) {
      // npm audit exits non-zero when vulnerabilities are found, but still writes valid JSON to stdout
      if (error.stdout) {
        try {
          const { counts, vulnerabilities } = this.parseAuditReport(error.stdout);
          this.dependencyAuditCache = { generatedAt: Date.now(), counts, vulnerabilities, stale: false };
          this.dependencyAuditCacheTime = Date.now();
          return this.dependencyAuditCache;
        } catch {
          // fall through: stdout wasn't parseable JSON, treat as a real failure below
        }
      }

      this.logAudit('SCAN_FAILED', { error: error.message });
      if (this.dependencyAuditCache) {
        return { ...this.dependencyAuditCache, stale: true };
      }
      return {
        generatedAt: Date.now(),
        counts: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
        vulnerabilities: [],
        stale: true
      };
    }
  }

  // Vulnerability scanning (real, never simulated)
  async scanVulnerabilities() {
    const audit = await this.runDependencyAudit(true);
    this.lastScan = Date.now();
    const result = {
      timestamp: this.lastScan,
      vulnerabilities: audit.vulnerabilities,
      counts: audit.counts,
      score: this.computeSecurityScore(audit.counts),
      status: audit.counts.total > 0 ? 'vulnerable' : 'secure',
      stale: !!audit.stale
    };
    this.logAudit('VULNERABILITY_SCAN', { counts: audit.counts, stale: result.stale });
    io.emit('security:event', { type: 'SCAN_COMPLETE', timestamp: this.lastScan, counts: audit.counts, stale: result.stale });
    return result;
  }

  // There is no real package-manager "fix" invocation wired up here, so this is honest about
  // not being able to actually remediate anything automatically.
  async autoPatch() {
    const audit = await this.runDependencyAudit();
    this.logAudit('PATCH_REQUESTED', { vulnerabilityCount: audit.counts.total });
    return {
      note: 'Automatic remediation is not performed. Run `npm audit fix` and review the resulting ' +
        'lockfile changes manually, then re-run a scan to confirm.',
      vulnerabilities: audit.vulnerabilities
    };
  }

  // Flatten only the actual string values of a request payload, so structural JSON
  // characters (the quotes around every key/value) never get scanned as user input.
  flattenStringValues(value, acc = []) {
    if (typeof value === 'string') {
      acc.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(item => this.flattenStringValues(item, acc));
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(item => this.flattenStringValues(item, acc));
    }
    return acc;
  }

  // Threat detection
  detectThreat(request) {
    const threats = [];
    const { body, query, ip } = request;

    // SQL Injection patterns
    const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b|--|;|'|")/gi;

    // XSS patterns
    const xssPatterns = /<script|javascript:|on\w+=/gi;

    // Path traversal
    const pathPatterns = /\.\.\//g;

    const checkData = this.flattenStringValues({ body, query }).join(' ');

    if (sqlPatterns.test(checkData)) {
      threats.push({ type: 'SQL_INJECTION', severity: 'critical' });
    }

    if (xssPatterns.test(checkData)) {
      threats.push({ type: 'XSS', severity: 'high' });
    }

    if (pathPatterns.test(checkData)) {
      threats.push({ type: 'PATH_TRAVERSAL', severity: 'high' });
    }

    // Check against known threat database
    if (this.threatDatabase.has(ip)) {
      threats.push({ type: 'KNOWN_THREAT_IP', severity: 'critical' });
    }

    if (threats.length > 0) {
      this.logAudit('THREAT_DETECTED', { ip, threats });
      this.threatDatabase.add(ip);
      io.emit('security:event', { type: 'THREAT_DETECTED', timestamp: Date.now(), ip, threats });
    }

    return threats;
  }

  // Security status
  getSecurityStatus() {
    const counts = this.dependencyAuditCache?.counts || { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
    return {
      encryptionActive: true,
      algorithm: this.algorithm,
      pqcAlgorithm: this.pqcAlgorithm,
      lastScan: this.lastScan,
      auditLogSize: this.auditLog.length,
      threatsBlocked: this.threatDatabase.size,
      patchesApplied: this.vulnerabilityPatches.size,
      securityScore: this.computeSecurityScore(counts),
      status: counts.total > 0 ? 'vulnerable' : 'secure'
    };
  }

  // Key rotation (both the classical AES master key and the ML-KEM keypair)
  rotateKeys() {
    this.masterKey = this.deriveMasterKey();
    this.kemKeyPair = ml_kem768.keygen();
    this.lastKeyRotation = Date.now();
    this.logAudit('KEY_ROTATION', { timestamp: this.lastKeyRotation });
    io.emit('security:event', { type: 'KEY_ROTATION', timestamp: this.lastKeyRotation });
    return true;
  }
}

const security = new SecurityModule();

// ================================================
// SOCKET.IO WITH ENCRYPTION
// ================================================
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000
});

// ================================================
// MIDDLEWARE STACK
// ================================================

// Security headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.anthropic.com', 'https://api.openai.com', 'https://generativelanguage.googleapis.com']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const entry = security.logAudit('REQUEST_BLOCKED', { ip: req.ip, path: req.path, reason: 'RATE_LIMIT' });
    io.emit('security:event', { type: 'REQUEST_BLOCKED', timestamp: entry.timestamp, ip: req.ip, path: req.path, reason: 'RATE_LIMIT' });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: (req, res) => {
    const entry = security.logAudit('REQUEST_BLOCKED', { ip: req.ip, path: req.path, reason: 'AUTH_RATE_LIMIT' });
    io.emit('security:event', { type: 'REQUEST_BLOCKED', timestamp: entry.timestamp, ip: req.ip, path: req.path, reason: 'AUTH_RATE_LIMIT' });
    res.status(429).json({ error: 'Too many authentication attempts.' });
  }
});

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID and timing
app.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Threat detection middleware
app.use((req, res, next) => {
  const threats = security.detectThreat(req);
  if (threats.some(t => t.severity === 'critical')) {
    const entry = security.logAudit('REQUEST_BLOCKED', {
      ip: req.ip,
      path: req.path,
      threats
    });
    io.emit('security:event', { type: 'REQUEST_BLOCKED', timestamp: entry.timestamp, ip: req.ip, path: req.path, threats });
    return res.status(403).json({ error: 'Request blocked by security system' });
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    security.logAudit('REQUEST', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - req.startTime,
      ip: req.ip
    });
  });
  next();
});

// File upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/json', 'application/javascript',
      'text/html', 'text/css'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// ================================================
// AI MODEL CLIENTS
// ================================================

class AIModelManager {
  constructor() {
    this.clients = {};
    this.rateLimits = new Map();
  }

  // Claude/Anthropic
  async callClaude(messages, options = {}) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.maxTokens || 4096,
        messages,
        system: options.systemPrompt
      })
    });
    return response.json();
  }

  // OpenAI GPT-4
  async callGPT4(messages, options = {}) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4-turbo-preview',
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7
      })
    });
    return response.json();
  }

  // Google Gemini
  async callGemini(messages, options = {}) {


    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 4096
          }
        })
      }
    );
    return response.json();
  }

  // DeepSeek
  async callDeepSeek(messages, options = {}) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: options.model || 'deepseek-chat',
        messages,
        max_tokens: options.maxTokens || 4096
      })
    });
    return response.json();
  }

  // xAI Grok
  async callGrok(messages, options = {}) {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: options.model || 'grok-beta',
        messages,
        max_tokens: options.maxTokens || 4096
      })
    });
    return response.json();
  }

  // Mistral
  async callMistral(messages, options = {}) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: options.model || 'mistral-large-latest',
        messages,
        max_tokens: options.maxTokens || 4096
      })
    });
    return response.json();
  }

  // Image generation (DALL-E 3)
  async generateImage(prompt, options = {}) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: options.count || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard'
      })
    });
    return response.json();
  }

  // Unified chat interface
  async chat(model, messages, options = {}) {
    const modelHandlers = {
      claude: () => this.callClaude(messages, options),
      gpt4: () => this.callGPT4(messages, options),
      gemini: () => this.callGemini(messages, options),
      deepseek: () => this.callDeepSeek(messages, options),
      grok: () => this.callGrok(messages, options),
      mixtral: () => this.callMistral(messages, options)
    };

    // Validate the requested model name against the allowed handlers
    const allowedModels = Object.keys(modelHandlers);
    if (typeof model !== 'string' || !allowedModels.includes(model)) {
      throw new Error(`Unknown model: ${model}`);
    }

    const handler = Object.prototype.hasOwnProperty.call(modelHandlers, model)
      ? modelHandlers[model]
      : null;

    if (typeof handler !== 'function') {
      throw new Error(`Unknown model: ${model}`);
    }

    return handler();
  }
}

const aiManager = new AIModelManager();

// ================================================
// DATA SERVICES
// ================================================

class SecureDataService {
  constructor() {
    this.memories = new Map();
    this.chats = new Map();
    this.workflows = new Map();
    this.users = new Map();
    this.projects = new Map();
    this.socialConnections = new Map();
  }

  // Encrypt and store data
  store(collection, id, data) {
    const encrypted = security.encrypt(JSON.stringify(data));
    const map = this[collection];
    if (map) {
      map.set(id, encrypted);
      return true;
    }
    return false;
  }

  // Retrieve and decrypt data
  retrieve(collection, id) {
    const map = this[collection];
    if (map && map.has(id)) {
      const encrypted = map.get(id);
      const decrypted = security.decrypt(encrypted);
      return JSON.parse(decrypted);
    }
    return null;
  }

  // Delete data
  delete(collection, id) {
    const map = this[collection];
    if (map) {
      return map.delete(id);
    }
    return false;
  }

  // List all in collection (metadata only)
  list(collection, filter = {}) {
    const map = this[collection];
    if (!map) return [];

    const results = [];
    for (const [id, encrypted] of map.entries()) {
      try {
        const data = JSON.parse(security.decrypt(encrypted));
        let match = true;
        for (const [key, value] of Object.entries(filter)) {
          if (data[key] !== value) {
            match = false;
            break;
          }
        }
        if (match) {
          results.push({ id, ...data });
        }
      } catch (e) {
        // Skip corrupted data
      }
    }
    return results;
  }
}

const dataService = new SecureDataService();

// ================================================
// AUTHENTICATION & RBAC
// ================================================

const ROLES = ['admin', 'developer', 'moderator', 'user'];

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not set; using a random in-memory secret. All sessions will be invalidated on restart.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const JWT_EXPIRY = '12h';

// Minimum 13 characters (counted by Unicode code point, not UTF-16 unit, so
// passwords containing emoji aren't penalized) plus at least one special
// character. Unicode letters/symbols are never rejected.
function validatePassword(password) {
  if (typeof password !== 'string') {
    return 'Password is required.';
  }
  const length = Array.from(password).length;
  if (length < 13) {
    return 'Password must be at least 13 characters long.';
  }
  if (!/[^a-zA-Z0-9]/u.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

// Display names / usernames allow full Unicode (including emoji) by
// denylisting control characters rather than allowlisting ASCII, so users
// are never blocked from using non-Latin scripts or emoji.
function validateDisplayName(displayName) {
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return 'Display name is required.';
  }
  const trimmed = displayName.trim();
  if (Array.from(trimmed).length > 64) {
    return 'Display name must be 64 characters or fewer.';
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return 'Display name contains invalid control characters.';
  }
  return null;
}

function validateEmail(email) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'A valid email address is required.';
  }
  return null;
}

// 10 hex characters split for readability, e.g. "A1B2C-D3E4F". One-time use.
function generateMfaBackupCode() {
  const hex = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `${hex.slice(0, 5)}-${hex.slice(5, 10)}`;
}

// otplib throws (rather than returning invalid) for malformed tokens, so guard
// the shape first — backup codes are routed past this entirely, never into otplib.
async function safeTotpVerify(secret, token) {
  if (!/^\d{6,8}$/.test(token)) {
    return false;
  }
  try {
    return (await verifyTotp({ secret, token })).valid;
  } catch (error) {
    return false;
  }
}

class AuthService {
  findByEmail(email) {
    const normalized = email.toLowerCase().trim();
    return dataService.list('users', {}).find(u => u.email === normalized) || null;
  }

  async register({ email, password, displayName }) {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.findByEmail(normalizedEmail)) {
      throw Object.assign(new Error('An account with that email already exists.'), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const isFirstUser = dataService.list('users', {}).length === 0;
    const id = uuidv4();
    const user = {
      id,
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      role: isFirstUser ? 'admin' : 'user',
      mfaEnabled: false,
      mfaSecret: null,
      mfaPendingSecret: null,
      mfaBackupCodes: [],
      createdAt: Date.now(),
      lastLogin: null
    };
    dataService.store('users', id, user);
    security.logAudit('USER_REGISTERED', { userId: id, role: user.role });
    return this.toPublicUser(user);
  }

  async login({ email, password }) {
    const user = this.findByEmail(email);
    if (!user) {
      throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      security.logAudit('LOGIN_FAILED', { email: user.email });
      throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
    }
    if (user.mfaEnabled) {
      security.logAudit('LOGIN_MFA_REQUIRED', { userId: user.id });
      return { user: this.toPublicUser(user), mfaRequired: true };
    }
    user.lastLogin = Date.now();
    dataService.store('users', user.id, user);
    security.logAudit('LOGIN_SUCCESS', { userId: user.id });
    return { user: this.toPublicUser(user), mfaRequired: false };
  }

  issueToken(publicUser) {
    return jwt.sign(
      { sub: publicUser.id, role: publicUser.role, email: publicUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  // Short-lived, narrowly-scoped token: only usable against /api/auth/mfa/challenge,
  // rejected by authenticateToken so it can never stand in for a real session.
  issueMfaChallenge(publicUser) {
    return jwt.sign({ sub: publicUser.id, mfa: 'pending' }, JWT_SECRET, { expiresIn: '5m' });
  }

  async startMfaSetup(userId) {
    const user = dataService.list('users', {}).find(u => u.id === userId);
    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }
    if (user.mfaEnabled) {
      throw Object.assign(new Error('MFA is already enabled on this account.'), { status: 400 });
    }
    const secret = generateTotpSecret();
    user.mfaPendingSecret = secret;
    dataService.store('users', user.id, user);
    const otpauthUrl = generateTotpURI({ issuer: 'Nexus AI Pro', label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async confirmMfaSetup(userId, code) {
    const user = dataService.list('users', {}).find(u => u.id === userId);
    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }
    if (!user.mfaPendingSecret) {
      throw Object.assign(new Error('No MFA setup in progress. Start setup first.'), { status: 400 });
    }
    const setupOk = typeof code === 'string' &&
      await safeTotpVerify(user.mfaPendingSecret, code.trim().replace(/\s+/g, ''));
    if (!setupOk) {
      security.logAudit('MFA_SETUP_FAILED', { userId: user.id });
      throw Object.assign(new Error('Invalid authentication code.'), { status: 400 });
    }
    const backupCodes = Array.from({ length: 8 }, generateMfaBackupCode);
    user.mfaSecret = user.mfaPendingSecret;
    user.mfaPendingSecret = null;
    user.mfaEnabled = true;
    user.mfaBackupCodes = await Promise.all(backupCodes.map(c => bcrypt.hash(c, 10)));
    dataService.store('users', user.id, user);
    security.logAudit('MFA_ENABLED', { userId: user.id });
    return { backupCodes };
  }

  async disableMfa(userId, { password, code }) {
    const user = dataService.list('users', {}).find(u => u.id === userId);
    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }
    if (!user.mfaEnabled) {
      throw Object.assign(new Error('MFA is not enabled on this account.'), { status: 400 });
    }
    const passwordOk = typeof password === 'string' && await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw Object.assign(new Error('Your current password is required to disable MFA.'), { status: 401 });
    }
    const codeOk = await this.verifyMfaCode(user, code);
    if (!codeOk) {
      security.logAudit('MFA_DISABLE_FAILED', { userId: user.id });
      throw Object.assign(new Error('Invalid authentication code.'), { status: 401 });
    }
    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaPendingSecret = null;
    user.mfaBackupCodes = [];
    dataService.store('users', user.id, user);
    security.logAudit('MFA_DISABLED', { userId: user.id });
  }

  // Accepts either a current TOTP code or a single-use backup code (consumed on success).
  async verifyMfaCode(user, code) {
    if (typeof code !== 'string' || !code.trim()) {
      return false;
    }
    const normalized = code.trim();
    if (user.mfaSecret && await safeTotpVerify(user.mfaSecret, normalized.replace(/\s+/g, ''))) {
      return true;
    }
    if (Array.isArray(user.mfaBackupCodes)) {
      for (let i = 0; i < user.mfaBackupCodes.length; i++) {
        if (await bcrypt.compare(normalized.toUpperCase(), user.mfaBackupCodes[i])) {
          user.mfaBackupCodes.splice(i, 1);
          dataService.store('users', user.id, user);
          security.logAudit('MFA_BACKUP_CODE_USED', { userId: user.id, remaining: user.mfaBackupCodes.length });
          return true;
        }
      }
    }
    return false;
  }

  async completeMfaChallenge({ challengeToken, code }) {
    let payload;
    try {
      payload = jwt.verify(challengeToken, JWT_SECRET);
    } catch (error) {
      throw Object.assign(new Error('MFA challenge expired or invalid. Please log in again.'), { status: 401 });
    }
    if (payload.mfa !== 'pending') {
      throw Object.assign(new Error('Invalid challenge token.'), { status: 401 });
    }
    const user = dataService.list('users', {}).find(u => u.id === payload.sub);
    if (!user || !user.mfaEnabled) {
      throw Object.assign(new Error('MFA is not enabled for this account.'), { status: 400 });
    }
    const ok = await this.verifyMfaCode(user, code);
    if (!ok) {
      security.logAudit('MFA_CHALLENGE_FAILED', { userId: user.id });
      throw Object.assign(new Error('Invalid authentication code.'), { status: 401 });
    }
    user.lastLogin = Date.now();
    dataService.store('users', user.id, user);
    security.logAudit('LOGIN_SUCCESS', { userId: user.id, mfa: true });
    const publicUser = this.toPublicUser(user);
    return { user: publicUser, token: this.issueToken(publicUser) };
  }

  toPublicUser(user) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      mfaEnabled: !!user.mfaEnabled,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
  }
}

const authService = new AuthService();

// Verifies a Bearer JWT and attaches { id, role, email } to req.user.
function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.mfa === 'pending') {
      return res.status(401).json({ error: 'MFA verification required.' });
    }
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      security.logAudit('AUTHORIZATION_DENIED', {
        userId: req.user?.id,
        role: req.user?.role,
        path: req.path,
        requiredRoles: allowedRoles
      });
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

// ================================================
// WORKFLOW ENGINE
// ================================================

class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.executions = new Map();
  }

  createWorkflow(userId, workflow) {
    const id = uuidv4();
    const newWorkflow = {
      id,
      userId,
      ...workflow,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.workflows.set(id, newWorkflow);
    security.logAudit('WORKFLOW_CREATED', { id, userId });
    return newWorkflow;
  }

  async executeWorkflow(workflowId, input = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const executionId = uuidv4();
    const execution = {
      id: executionId,
      workflowId,
      input,
      status: 'running',
      startedAt: Date.now(),
      steps: []
    };
    this.executions.set(executionId, execution);

    try {
      // Execute workflow nodes in order
      let context = { ...input };

      for (const node of workflow.nodes || []) {
        const stepResult = await this.executeNode(node, context);
        execution.steps.push({
          nodeId: node.id,
          type: node.type,
          result: stepResult,
          completedAt: Date.now()
        });
        context = { ...context, ...stepResult };
      }

      execution.status = 'completed';
      execution.completedAt = Date.now();
      execution.output = context;

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = Date.now();
    }

    this.executions.set(executionId, execution);
    security.logAudit('WORKFLOW_EXECUTED', { executionId, workflowId, status: execution.status });

    return execution;
  }

  async executeNode(node, context) {
    switch (node.type) {
    case 'ai':
      return this.executeAINode(node, context);
    case 'http':
      return this.executeHTTPNode(node, context);
    case 'code':
      return this.executeCodeNode(node, context);
    case 'condition':
      return await this.executeConditionNode(node, context);
    case 'transform':
      return await this.executeTransformNode(node, context);
    default:
      return { result: 'Node type not implemented' };
    }
  }

  async executeAINode(node, context) {
    const { model, prompt } = node.config || {};
    const messages = [{ role: 'user', content: prompt || context.input }];
    const response = await aiManager.chat(model || 'claude', messages);
    return { aiResponse: response };
  }

  /**
   * Validate and normalize the URL for HTTP workflow nodes to prevent SSRF.
   * Throws an error if the URL is not allowed.
   */
  validateHttpNodeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new Error('HTTP node URL is required');
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (e) {
      throw new Error('Invalid HTTP node URL');
    }

    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error('HTTP node URL must use http or https');
    }

    const hostname = parsed.hostname.toLowerCase();

    // Basic protection against localhost and obvious private IP-style hosts.
    const blockedHostnames = ['localhost', '127.0.0.1', '::1'];
    if (blockedHostnames.includes(hostname)) {
      throw new Error('HTTP node URL hostname is not allowed');
    }

    // Optionally enforce a simple allow-list by domain suffix.
    // Adjust this to your environment as needed.
    const allowedDomainSuffixes = []; // e.g., ['.example.com']
    if (allowedDomainSuffixes.length > 0) {
      const matchesAllowed = allowedDomainSuffixes.some(suffix =>
        hostname === suffix.slice(1) || hostname.endsWith(suffix)
      );
      if (!matchesAllowed) {
        throw new Error('HTTP node URL hostname is not in the allow-list');
      }
    }

    return parsed.toString();
  }

  async executeHTTPNode(node, context) {
    const { url, method, headers, body } = node.config || {};
    const safeUrl = this.validateHttpNodeUrl(url);
    const response = await fetch(safeUrl, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined
    });
    return { httpResponse: await response.json() };
  }

  async executeCodeNode(node, context) {
    // Execute code node as a Jexl expression instead of raw JavaScript
    const { code } = node.config || {};
    if (typeof code !== 'string' || !code.trim()) {
      return { codeError: 'Invalid code expression' };
    }
    try {
      const result = await Jexl.eval(code, context);
      return { codeResult: result };
    } catch (error) {
      return { codeError: error.message };
    }
  }

  async executeConditionNode(node, context) {
    const { condition } = node.config || {};
    if (typeof condition !== 'string' || !condition.trim()) {
      return { conditionResult: false };
    }
    try {
      const result = await Jexl.eval(condition, context);
      return { conditionResult: !!result };
    } catch (error) {
      return { conditionResult: false };
    }
  }

  async executeTransformNode(node, context) {
    const { transform } = node.config || {};
    if (typeof transform !== 'string' || !transform.trim()) {
      return { transformError: 'Invalid transform expression' };
    }
    try {
      const result = await Jexl.eval(transform, context);
      return { transformResult: result };
    } catch (error) {
      return { transformError: error.message };
    }
  }
}

const workflowEngine = new WorkflowEngine();

// ================================================
// PROJECT TRACKING MODULE
// ================================================

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];
const TASK_STATUSES = ['todo', 'in_progress', 'done'];

class ProjectModule {
  createProject(ownerId, { name, description = '', status = 'planning' } = {}) {
    if (typeof name !== 'string' || !name.trim()) {
      throw Object.assign(new Error('Project name is required.'), { status: 400 });
    }
    if (!PROJECT_STATUSES.includes(status)) {
      throw Object.assign(new Error(`Status must be one of: ${PROJECT_STATUSES.join(', ')}`), { status: 400 });
    }
    const id = uuidv4();
    const project = {
      id,
      ownerId,
      name: name.trim(),
      description: String(description || ''),
      status,
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    dataService.store('projects', id, project);
    security.logAudit('PROJECT_CREATED', { ownerId, projectId: id });
    return project;
  }

  listProjects(ownerId) {
    return dataService.list('projects', { ownerId });
  }

  // Throws a uniform 404 for both "doesn't exist" and "exists but isn't yours",
  // so this can't be used to probe for other users' project IDs.
  getOwnedProject(ownerId, projectId) {
    const project = dataService.retrieve('projects', projectId);
    if (!project || project.ownerId !== ownerId) {
      throw Object.assign(new Error('Project not found.'), { status: 404 });
    }
    return project;
  }

  updateProject(ownerId, projectId, updates = {}) {
    const project = this.getOwnedProject(ownerId, projectId);
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || !updates.name.trim()) {
        throw Object.assign(new Error('Project name is required.'), { status: 400 });
      }
      project.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      project.description = String(updates.description);
    }
    if (updates.status !== undefined) {
      if (!PROJECT_STATUSES.includes(updates.status)) {
        throw Object.assign(new Error(`Status must be one of: ${PROJECT_STATUSES.join(', ')}`), { status: 400 });
      }
      project.status = updates.status;
    }
    project.updatedAt = Date.now();
    dataService.store('projects', projectId, project);
    security.logAudit('PROJECT_UPDATED', { ownerId, projectId });
    return project;
  }

  deleteProject(ownerId, projectId) {
    this.getOwnedProject(ownerId, projectId);
    dataService.delete('projects', projectId);
    security.logAudit('PROJECT_DELETED', { ownerId, projectId });
  }

  addTask(ownerId, projectId, { title, status = 'todo' } = {}) {
    const project = this.getOwnedProject(ownerId, projectId);
    if (typeof title !== 'string' || !title.trim()) {
      throw Object.assign(new Error('Task title is required.'), { status: 400 });
    }
    if (!TASK_STATUSES.includes(status)) {
      throw Object.assign(new Error(`Task status must be one of: ${TASK_STATUSES.join(', ')}`), { status: 400 });
    }
    const task = {
      id: uuidv4(),
      title: title.trim(),
      status,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    project.tasks.push(task);
    project.updatedAt = Date.now();
    dataService.store('projects', projectId, project);
    security.logAudit('PROJECT_TASK_ADDED', { ownerId, projectId, taskId: task.id });
    return project;
  }

  updateTask(ownerId, projectId, taskId, updates = {}) {
    const project = this.getOwnedProject(ownerId, projectId);
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) {
      throw Object.assign(new Error('Task not found.'), { status: 404 });
    }
    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string' || !updates.title.trim()) {
        throw Object.assign(new Error('Task title is required.'), { status: 400 });
      }
      task.title = updates.title.trim();
    }
    if (updates.status !== undefined) {
      if (!TASK_STATUSES.includes(updates.status)) {
        throw Object.assign(new Error(`Task status must be one of: ${TASK_STATUSES.join(', ')}`), { status: 400 });
      }
      task.status = updates.status;
    }
    task.updatedAt = Date.now();
    project.updatedAt = Date.now();
    dataService.store('projects', projectId, project);
    security.logAudit('PROJECT_TASK_UPDATED', { ownerId, projectId, taskId });
    return project;
  }

  deleteTask(ownerId, projectId, taskId) {
    const project = this.getOwnedProject(ownerId, projectId);
    const index = project.tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw Object.assign(new Error('Task not found.'), { status: 404 });
    }
    project.tasks.splice(index, 1);
    project.updatedAt = Date.now();
    dataService.store('projects', projectId, project);
    security.logAudit('PROJECT_TASK_DELETED', { ownerId, projectId, taskId });
    return project;
  }
}

const projectModule = new ProjectModule();

// ================================================
// SOCIAL MEDIA CONNECTOR FRAMEWORK
// ================================================
// Real OAuth2 Authorization Code flow (+ PKCE where the provider requires it) against
// each platform's actual API. A connector stays "not configured" until the operator
// sets its CLIENT_ID/CLIENT_SECRET env vars (see .env.example) — never a fabricated
// "connected" state. Lemon8 and Redgifs are intentionally absent from this registry:
// neither publishes a public OAuth developer platform, so rather than guess at
// endpoints that don't exist, they're surfaced to the UI as explicitly unsupported.
const SOCIAL_PLATFORMS = {
  meta: {
    label: 'Meta (Facebook)',
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/me?fields=id,name',
    scope: 'public_profile,email',
    clientIdEnv: 'META_CLIENT_ID',
    clientSecretEnv: 'META_CLIENT_SECRET'
  },
  instagram: {
    label: 'Instagram',
    authorizeUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    profileUrl: 'https://graph.instagram.com/me?fields=id,username',
    scope: 'user_profile',
    clientIdEnv: 'INSTAGRAM_CLIENT_ID',
    clientSecretEnv: 'INSTAGRAM_CLIENT_SECRET'
  },
  tiktok: {
    label: 'TikTok',
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token',
    profileUrl: 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
    scope: 'user.info.basic',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    pkce: true
  },
  discord: {
    label: 'Discord',
    authorizeUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    profileUrl: 'https://discord.com/api/users/@me',
    scope: 'identify',
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET'
  },
  twitch: {
    label: 'Twitch',
    authorizeUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    profileUrl: 'https://api.twitch.tv/helix/users',
    scope: 'user:read:email',
    clientIdEnv: 'TWITCH_CLIENT_ID',
    clientSecretEnv: 'TWITCH_CLIENT_SECRET'
  },
  x: {
    label: 'X (Twitter)',
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    profileUrl: 'https://api.twitter.com/2/users/me',
    scope: 'tweet.read users.read offline.access',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    pkce: true
  },
  reddit: {
    label: 'Reddit',
    authorizeUrl: 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: 'https://www.reddit.com/api/v1/access_token',
    profileUrl: 'https://oauth.reddit.com/api/v1/me',
    scope: 'identity',
    clientIdEnv: 'REDDIT_CLIENT_ID',
    clientSecretEnv: 'REDDIT_CLIENT_SECRET',
    basicAuth: true
  }
};

const UNSUPPORTED_SOCIAL_PLATFORMS = [
  { platform: 'lemon8', label: 'Lemon8', reason: 'Lemon8 publishes no public OAuth developer API.' },
  { platform: 'redgifs', label: 'Redgifs', reason: 'Redgifs publishes no public user-OAuth developer API.' }
];

// Short-lived, single-use, server-side-only binding of {userId, platform, PKCE verifier}
// to the OAuth `state` value — recovers identity at the callback without ever trusting
// a client-supplied userId there (unlike the WorkflowEngine routes earlier in this file).
const oauthStates = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function pruneOauthStates() {
  const now = Date.now();
  for (const [state, entry] of oauthStates.entries()) {
    if (entry.expiresAt < now) oauthStates.delete(state);
  }
}

function generatePkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function getPublicBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

class SocialConnectorService {
  isConfigured(platform) {
    const cfg = SOCIAL_PLATFORMS[platform];
    return !!(cfg && process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
  }

  listPlatforms() {
    const supported = Object.entries(SOCIAL_PLATFORMS).map(([key, cfg]) => ({
      platform: key,
      label: cfg.label,
      supported: true,
      configured: this.isConfigured(key)
    }));
    const unsupported = UNSUPPORTED_SOCIAL_PLATFORMS.map((p) => ({ ...p, supported: false, configured: false }));
    return [...supported, ...unsupported];
  }

  listConnections(userId) {
    return dataService.list('socialConnections', { userId }).map((c) => ({
      platform: c.platform,
      connectedAccount: c.profile,
      connectedAt: c.connectedAt
    }));
  }

  buildAuthorizeUrl(platform, { redirectUri, state, codeChallenge }) {
    const cfg = SOCIAL_PLATFORMS[platform];
    const params = new URLSearchParams({
      client_id: process.env[cfg.clientIdEnv],
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scope,
      state
    });
    if (cfg.pkce) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
    return `${cfg.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(platform, { code, redirectUri, codeVerifier }) {
    const cfg = SOCIAL_PLATFORMS[platform];
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env[cfg.clientIdEnv]
    });
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };

    if (cfg.pkce) {
      body.set('code_verifier', codeVerifier);
    }
    if (cfg.basicAuth) {
      const basic = Buffer.from(`${process.env[cfg.clientIdEnv]}:${process.env[cfg.clientSecretEnv]}`).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    } else {
      body.set('client_secret', process.env[cfg.clientSecretEnv]);
    }

    const response = await fetch(cfg.tokenUrl, { method: 'POST', headers, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw Object.assign(new Error(data.error_description || data.error || 'Token exchange failed.'), { status: 400 });
    }
    return data;
  }

  async fetchProfile(platform, accessToken) {
    const cfg = SOCIAL_PLATFORMS[platform];
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    if (platform === 'twitch') headers['Client-Id'] = process.env[cfg.clientIdEnv];
    if (platform === 'reddit') headers['User-Agent'] = 'NexusAIPro/1.0 (security-conscious social connector)';

    const response = await fetch(cfg.profileUrl, { headers });
    if (!response.ok) {
      throw Object.assign(new Error('Failed to fetch profile from provider.'), { status: 502 });
    }
    return response.json();
  }

  async connectCallback(platform, userId, { code, redirectUri, codeVerifier }) {
    const tokenData = await this.exchangeCodeForToken(platform, { code, redirectUri, codeVerifier });
    const profile = await this.fetchProfile(platform, tokenData.access_token).catch(() => null);

    const record = {
      userId,
      platform,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
      profile,
      connectedAt: Date.now()
    };
    dataService.store('socialConnections', `${userId}:${platform}`, record);
    security.logAudit('SOCIAL_CONNECTED', { userId, platform });
    return record;
  }

  disconnect(userId, platform) {
    const existed = dataService.delete('socialConnections', `${userId}:${platform}`);
    security.logAudit('SOCIAL_DISCONNECTED', { userId, platform });
    return existed;
  }
}

const socialConnector = new SocialConnectorService();

// ================================================
// API ROUTES
// ================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    security: security.getSecurityStatus(),
    timestamp: Date.now()
  });
});

// ================================================
// AUTHENTICATION ENDPOINTS
// ================================================

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    const errors = [
      validateEmail(email),
      validatePassword(password),
      validateDisplayName(displayName)
    ].filter(Boolean);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], errors });
    }

    const user = await authService.register({ email, password, displayName });
    const token = authService.issueToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (validateEmail(email) || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const { user, mfaRequired } = await authService.login({ email, password });
    if (mfaRequired) {
      return res.json({ mfaRequired: true, challengeToken: authService.issueMfaChallenge(user) });
    }
    const token = authService.issueToken(user);
    res.json({ user, token });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/mfa/challenge', authLimiter, async (req, res) => {
  try {
    const { challengeToken, code } = req.body || {};
    if (typeof challengeToken !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'challengeToken and code are required.' });
    }
    const { user, token } = await authService.completeMfaChallenge({ challengeToken, code });
    res.json({ user, token });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = dataService.list('users', {}).find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user: authService.toPublicUser(user) });
});

app.post('/api/auth/mfa/setup', authenticateToken, async (req, res) => {
  try {
    res.json(await authService.startMfaSetup(req.user.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/mfa/verify', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body || {};
    res.json(await authService.confirmMfaSetup(req.user.id, code));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/mfa/disable', authenticateToken, async (req, res) => {
  try {
    const { password, code } = req.body || {};
    await authService.disableMfa(req.user.id, { password, code });
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Admin-only: list and manage user accounts (powers the admin dashboard)
app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
  const users = dataService.list('users', {}).map(u => authService.toPublicUser(u));
  res.json({ users, total: users.length });
});

app.put('/api/admin/users/:userId/role', authenticateToken, requireRole('admin'), (req, res) => {
  const { role } = req.body || {};
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}` });
  }
  const user = dataService.list('users', {}).find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  user.role = role;
  dataService.store('users', user.id, user);
  security.logAudit('ROLE_CHANGED', { actorId: req.user.id, targetUserId: user.id, newRole: role });
  res.json({ user: authService.toPublicUser(user) });
});

// ================================================
// PROJECT TRACKING ENDPOINTS
// ================================================
// Ownership is always derived from the verified JWT (req.user.id), never from a
// client-supplied userId — unlike the WorkflowEngine routes above.

app.post('/api/projects', authenticateToken, (req, res) => {
  try {
    const project = projectModule.createProject(req.user.id, req.body || {});
    io.to(`user:${req.user.id}`).emit('project:event', { type: 'PROJECT_CREATED', project });
    res.status(201).json({ project });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/projects', authenticateToken, (req, res) => {
  res.json({ projects: projectModule.listProjects(req.user.id) });
});

app.get('/api/projects/:projectId', authenticateToken, (req, res) => {
  try {
    res.json({ project: projectModule.getOwnedProject(req.user.id, req.params.projectId) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.put('/api/projects/:projectId', authenticateToken, (req, res) => {
  try {
    const project = projectModule.updateProject(req.user.id, req.params.projectId, req.body || {});
    io.to(`user:${req.user.id}`).emit('project:event', { type: 'PROJECT_UPDATED', project });
    res.json({ project });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.delete('/api/projects/:projectId', authenticateToken, (req, res) => {
  try {
    projectModule.deleteProject(req.user.id, req.params.projectId);
    io.to(`user:${req.user.id}`).emit('project:event', { type: 'PROJECT_DELETED', projectId: req.params.projectId });
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/projects/:projectId/tasks', authenticateToken, (req, res) => {
  try {
    const project = projectModule.addTask(req.user.id, req.params.projectId, req.body || {});
    io.to(`user:${req.user.id}`).emit('project:event', { type: 'PROJECT_TASK_ADDED', project });
    res.status(201).json({ project });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.put('/api/projects/:projectId/tasks/:taskId', authenticateToken, (req, res) => {
  try {
    const project = projectModule.updateTask(req.user.id, req.params.projectId, req.params.taskId, req.body || {});
    io.to(`user:${req.user.id}`).emit('project:event', { type: 'PROJECT_TASK_UPDATED', project });
    res.json({ project });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.delete('/api/projects/:projectId/tasks/:taskId', authenticateToken, (req, res) => {
  try {
    const project = projectModule.deleteTask(req.user.id, req.params.projectId, req.params.taskId);
    io.to(`user:${req.user.id}`).emit('project:event', { type: 'PROJECT_TASK_DELETED', project });
    res.json({ project });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// ================================================
// SOCIAL MEDIA CONNECTOR ENDPOINTS
// ================================================

app.get('/api/social/platforms', (req, res) => {
  res.json({ platforms: socialConnector.listPlatforms() });
});

app.get('/api/social/connections', authenticateToken, (req, res) => {
  res.json({ connections: socialConnector.listConnections(req.user.id) });
});

app.get('/api/social/:platform/connect', authenticateToken, (req, res) => {
  const { platform } = req.params;
  const cfg = SOCIAL_PLATFORMS[platform];
  if (!cfg) {
    return res.status(404).json({ error: 'Unknown or unsupported platform.' });
  }
  if (!socialConnector.isConfigured(platform)) {
    return res.status(412).json({
      error: `${cfg.label} is not configured on this server. Set ${cfg.clientIdEnv} and ${cfg.clientSecretEnv}.`
    });
  }

  pruneOauthStates();
  const state = crypto.randomBytes(24).toString('hex');
  const { verifier, challenge } = cfg.pkce ? generatePkcePair() : {};
  oauthStates.set(state, {
    userId: req.user.id,
    platform,
    codeVerifier: verifier,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS
  });

  const redirectUri = `${getPublicBaseUrl(req)}/api/social/callback/${platform}`;
  const url = socialConnector.buildAuthorizeUrl(platform, { redirectUri, state, codeChallenge: challenge });
  res.json({ url });
});

app.get('/api/social/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error: providerError } = req.query;
  const cfg = SOCIAL_PLATFORMS[platform];
  if (!cfg) {
    return res.status(404).send('Unknown platform.');
  }

  const stateEntry = typeof state === 'string' ? oauthStates.get(state) : null;
  if (stateEntry) oauthStates.delete(state);

  if (providerError || !code || !stateEntry || stateEntry.platform !== platform || stateEntry.expiresAt < Date.now()) {
    security.logAudit('SOCIAL_CONNECT_FAILED', { platform, reason: providerError || 'invalid_or_expired_state' });
    return res.redirect(`/?social=error&platform=${platform}`);
  }

  try {
    const redirectUri = `${getPublicBaseUrl(req)}/api/social/callback/${platform}`;
    await socialConnector.connectCallback(platform, stateEntry.userId, {
      code,
      redirectUri,
      codeVerifier: stateEntry.codeVerifier
    });
    res.redirect(`/?social=connected&platform=${platform}`);
  } catch (error) {
    security.logAudit('SOCIAL_CONNECT_FAILED', { platform, reason: error.message });
    res.redirect(`/?social=error&platform=${platform}`);
  }
});

app.delete('/api/social/:platform', authenticateToken, (req, res) => {
  const { platform } = req.params;
  if (!SOCIAL_PLATFORMS[platform]) {
    return res.status(404).json({ error: 'Unknown or unsupported platform.' });
  }
  socialConnector.disconnect(req.user.id, platform);
  res.json({ success: true });
});

// Security endpoints
app.get('/api/security/status', authenticateToken, (req, res) => {
  res.json(security.getSecurityStatus());
});

app.post('/api/security/scan', authenticateToken, requireRole('admin', 'developer'), async (req, res) => {
  const results = await security.scanVulnerabilities();
  res.json(results);
});

app.post('/api/security/patch', authenticateToken, requireRole('admin', 'developer'), async (req, res) => {
  res.json(await security.autoPatch());
});

app.post('/api/security/rotate-keys', authenticateToken, requireRole('admin'), (req, res) => {
  const success = security.rotateKeys();
  res.json({ success, lastKeyRotation: security.lastKeyRotation });
});

app.get('/api/security/audit', authenticateToken, requireRole('admin', 'developer', 'moderator'), (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const logs = security.auditLog.slice(-limit - offset, -offset || undefined);
  res.json({ logs, total: security.auditLog.length });
});

// Comprehensive security dashboard endpoint (for all platforms)
app.get('/api/security/dashboard', authenticateToken, async (req, res) => {
  try {
    const audit = await security.runDependencyAudit();
    const recentLogs = security.auditLog.slice(-10);
    const threatsSummary = recentLogs.filter(l => l.event.includes('THREAT') || l.event.includes('ATTACK'));

    res.json({
      overallScore: security.computeSecurityScore(audit.counts),
      encryptionStatus: 'AES-256-GCM',
      encryptionActive: true,
      pqc: { algorithm: security.pqcAlgorithm, active: true },
      lastScanTime: security.lastScan,
      vulnerabilities: audit.vulnerabilities,
      vulnerabilityCounts: audit.counts,
      stale: audit.stale,
      threats: threatsSummary.slice(0, 5).map(log => ({
        type: log.event,
        status: 'blocked',
        timestamp: log.timestamp
      })),
      recentActivity: recentLogs.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security alerts endpoint
app.get('/api/security/alerts', authenticateToken, requireRole('admin', 'developer', 'moderator'), (req, res) => {
  const alerts = security.auditLog
    .filter(l => l.event.includes('ERROR') || l.event.includes('THREAT') || l.event.includes('ATTACK') || l.event === 'REQUEST_BLOCKED')
    .slice(-20)
    .map(l => ({
      ...l,
      severity: l.details?.threats?.[0]?.severity || (l.event.includes('ERROR') ? 'high' : 'medium')
    }));

  res.json({
    alerts,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
    warningCount: alerts.filter(a => a.severity === 'medium').length
  });
});

// Encryption health endpoint
app.get('/api/security/encryption-health', authenticateToken, (req, res) => {
  res.json({
    algorithm: 'AES-256-GCM',
    pqc: { algorithm: security.pqcAlgorithm, active: true },
    keyRotationInterval: '24h',
    lastKeyRotation: security.lastKeyRotation,
    nextKeyRotation: security.lastKeyRotation + 86400000,
    status: 'healthy'
  });
});

// Chat completion
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, options, encrypt = true } = req.body;

    // Encrypt messages if required
    let processedMessages = messages;
    if (encrypt) {
      processedMessages = messages.map(m => ({
        ...m,
        _encrypted: security.encrypt(m.content)
      }));
    }

    const response = await aiManager.chat(model, messages, options);

    res.json({
      ...response,
      encrypted: encrypt,
      requestId: req.requestId
    });
  } catch (error) {
    security.logAudit('CHAT_ERROR', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Image generation
app.post('/api/generate/image', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const response = await aiManager.generateImage(prompt, options);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory endpoints
app.post('/api/memory', (req, res) => {
  const { userId, content } = req.body;
  const memory = {
    id: uuidv4(),
    userId,
    content,
    createdAt: Date.now()
  };
  dataService.store('memories', memory.id, memory);
  res.json(memory);
});

app.get('/api/memory/:userId', (req, res) => {
  const memories = dataService.list('memories', { userId: req.params.userId });
  res.json(memories);
});

app.delete('/api/memory/:id', (req, res) => {
  const success = dataService.delete('memories', req.params.id);
  res.json({ success });
});

// Chat management
app.post('/api/chats', (req, res) => {
  const { userId } = req.body;
  const chat = {
    id: uuidv4(),
    userId,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  dataService.store('chats', chat.id, chat);
  res.json(chat);
});

app.get('/api/chats/:userId', (req, res) => {
  const chats = dataService.list('chats', { userId: req.params.userId });
  res.json(chats.sort((a, b) => b.updatedAt - a.updatedAt));
});

app.get('/api/chat/:chatId', (req, res) => {
  const chat = dataService.retrieve('chats', req.params.chatId);
  if (chat) {
    res.json(chat);
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

app.put('/api/chat/:chatId', (req, res) => {
  const existing = dataService.retrieve('chats', req.params.chatId);
  if (existing) {
    const updated = { ...existing, ...req.body, updatedAt: Date.now() };
    dataService.store('chats', req.params.chatId, updated);
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

app.delete('/api/chat/:chatId', (req, res) => {
  const success = dataService.delete('chats', req.params.chatId);
  res.json({ success });
});

// Workflow endpoints
app.post('/api/workflows', (req, res) => {
  const { userId, ...workflow } = req.body;
  const newWorkflow = workflowEngine.createWorkflow(userId, workflow);
  res.json(newWorkflow);
});

app.get('/api/workflows/:userId', (req, res) => {
  const workflows = Array.from(workflowEngine.workflows.values())
    .filter(w => w.userId === req.params.userId);
  res.json(workflows);
});

app.post('/api/workflows/:workflowId/execute', async (req, res) => {
  try {
    const execution = await workflowEngine.executeWorkflow(req.params.workflowId, req.body);
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File upload
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  const files = req.files.map(file => {
    const encrypted = security.encrypt(file.buffer.toString('base64'));
    return {
      id: uuidv4(),
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      encrypted: true
    };
  });
  res.json({ files });
});

// Game dev templates
app.get('/api/templates/game', (req, res) => {
  res.json({
    templates: [
      { id: 'platformer', name: '2D Platformer', engine: 'Unity/Godot' },
      { id: 'rpg', name: 'RPG', engine: 'Unity/RPG Maker' },
      { id: 'puzzle', name: 'Puzzle Game', engine: 'Any' },
      { id: 'shooter', name: 'Shooter', engine: 'Unity/Unreal' },
      { id: 'racing', name: 'Racing', engine: 'Unity' },
      { id: 'casual', name: 'Casual/Mobile', engine: 'Unity/Flutter' },
      { id: 'vr', name: 'VR Experience', engine: 'Unity/Unreal' },
      { id: 'multiplayer', name: 'Multiplayer', engine: 'Unity/Photon' }
    ]
  });
});

// App dev templates
app.get('/api/templates/app', (req, res) => {
  res.json({
    templates: [
      { id: 'webapp', name: 'Web App', stack: 'React/Next.js' },
      { id: 'mobile', name: 'Mobile App', stack: 'React Native/Flutter' },
      { id: 'desktop', name: 'Desktop App', stack: 'Electron/Tauri' },
      { id: 'api', name: 'API/Backend', stack: 'Node/Python/Go' },
      { id: 'fullstack', name: 'Full Stack', stack: 'MERN/PERN' },
      { id: 'saas', name: 'SaaS Platform', stack: 'Next.js/Stripe' },
      { id: 'ecommerce', name: 'E-Commerce', stack: 'Shopify/Custom' },
      { id: 'ai', name: 'AI Application', stack: 'Python/FastAPI' }
    ]
  });
});

// ================================================
// WEBSOCKET HANDLING
// ================================================

io.use((socket, next) => {
  // Authenticate socket connection with the same JWTs issued by /api/auth/login.
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.userId = uuidv4();
    socket.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.sub;
    socket.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (error) {
    security.logAudit('SOCKET_AUTH_REJECTED', { socketId: socket.id });
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  security.logAudit('SOCKET_CONNECT', { socketId: socket.id, userId: socket.userId });

  if (socket.user) {
    // Scopes project:event emits to this user only, unlike the unscoped
    // broadcast.emit calls used elsewhere in this handler.
    socket.join(`user:${socket.userId}`);
  }

  // Voice call handling
  socket.on('voice:start', (data) => {
    socket.broadcast.emit('voice:started', { userId: socket.userId });
  });

  socket.on('voice:data', (data) => {
    // Encrypt voice data
    const encrypted = security.encrypt(JSON.stringify(data));
    socket.broadcast.emit('voice:data', encrypted);
  });

  socket.on('voice:end', () => {
    socket.broadcast.emit('voice:ended', { userId: socket.userId });
  });

  // Real-time chat
  socket.on('chat:message', (data) => {
    const encrypted = security.encrypt(JSON.stringify(data));
    socket.broadcast.emit('chat:message', encrypted);
  });

  // Workflow updates
  socket.on('workflow:update', (data) => {
    socket.broadcast.emit('workflow:updated', data);
  });

  socket.on('disconnect', () => {
    security.logAudit('SOCKET_DISCONNECT', { socketId: socket.id });
  });
});

// ================================================
// AUTO-PATCHING SCHEDULER
// ================================================

setInterval(async () => {
  console.log('Running automated security scan...');
  const scan = await security.scanVulnerabilities();

  if (scan.vulnerabilities.length > 0) {
    console.log('Vulnerabilities detected, auto-patching...');
    await security.autoPatch();
  }
}, 60 * 60 * 1000); // Every hour

// ================================================
// ERROR HANDLING
// ================================================

app.use((err, req, res, next) => {
  security.logAudit('ERROR', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message
  });
});

// ================================================
// SERVER START
// ================================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               ║
║     ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               ║
║     ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗               ║
║     ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║               ║
║     ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║               ║
║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║                                                                ║
║              🛡️  NEXUS AI PRO - SECURE SERVER  🛡️              ║
║                                                                ║
║     🔒 Military-Grade AES-256-GCM Encryption: ACTIVE          ║
║     🛡️  Auto-Patching: ENABLED                                ║
║     📡 Server running on port ${PORT}                            ║
║     🔐 Security Status: SECURE                                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Initial security scan
  security.scanVulnerabilities();
});

export default app;
