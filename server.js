// server.js
// Nexus AI Pro — Express/Socket.IO backend
// Created: 2026-06-11 | Nexus AI Pro v3.0.0
// No secrets hardcoded; all config via environment variables

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

import { env, isProd } from './src/config/env.js';
import { logAuditEvent } from './src/services/audit.service.js';
import { securityScanner, scanEvents } from './src/services/security-scanner.service.js';
import { analyticsEvents } from './src/services/analytics.service.js';
import { projectEvents } from './src/services/project-tracker.service.js';
import { verifyAccessToken } from './src/auth/auth.service.js';

// Route modules
import authRoutes from './src/routes/auth.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';
import securityRoutes from './src/routes/security.routes.js';
import projectsRoutes from './src/routes/projects.routes.js';
import subscriptionsRoutes from './src/routes/subscriptions.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Express App ──────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ─── Security Headers ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],    // tighten in prod with nonces
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGIN === '*'
  ? true
  : env.CORS_ORIGIN.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ─── Body Parsers ─────────────────────────────────────────────────────────
// Raw body needed for Stripe/Coinbase webhook signature verification
app.use('/api/subscriptions/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/subscriptions/crypto/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Request ID ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// ─── Rate Limiting ────────────────────────────────────────────────────────
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later' },
  keyGenerator: req => req.ip,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts' },
  skipSuccessfulRequests: true,
});

app.use('/api/', defaultLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── File Upload ──────────────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 100 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    // Block executable MIME types
    const blocked = /\.(exe|sh|bat|cmd|ps1|vbs|dll|so|dmg)$/i;
    if (blocked.test(file.originalname)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: env.NODE_ENV,
  });
});

// ─── Static Files ─────────────────────────────────────────────────────────
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist'), { maxAge: '1d' }));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = isProd && status === 500 ? 'Internal server error' : err.message;
  if (status >= 500) console.error(`[${req.id}] ${err.message}`, err.stack);
  res.status(status).json({ error: message, requestId: req.id });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Authenticate Socket.IO connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { sub: userId, role } = socket.user;
  socket.join(`user:${userId}`);
  if (role === 'admin' || role === 'dev') socket.join('admin');

  socket.on('disconnect', () => {
    socket.leave(`user:${userId}`);
  });

  // Rooms for real-time dashboard subscriptions
  socket.on('subscribe:security', () => { if (role === 'admin' || role === 'dev') socket.join('security'); });
  socket.on('subscribe:analytics', () => socket.join(`analytics:${userId}`));
  socket.on('subscribe:projects', () => socket.join(`projects:${userId}`));
});

// ─── Event Bridge → Socket.IO ─────────────────────────────────────────────
// Relay service events to connected clients — no polling needed
scanEvents.on('security:alert', (alert) => {
  io.to('admin').emit('security:alert', alert);
});
scanEvents.on('scan:completed', (scan) => {
  io.to('admin').emit('scan:completed', scan);
});

analyticsEvents.on('metrics:updated', ({ userId, platform, snapshot }) => {
  io.to(`user:${userId}`).emit('metrics:updated', { platform, snapshot });
});

projectEvents.on('project:created', ({ userId, project }) => {
  io.to(`user:${userId}`).emit('project:created', project);
});
projectEvents.on('project:metrics', (data) => {
  // Broadcast to all — in production scope by userId
  io.emit('project:metrics', data);
});
projectEvents.on('engine:event', (data) => {
  io.emit('engine:event', data);
});

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = env.PORT;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.info(`Nexus AI Pro v3.0.0 running on port ${PORT} (${env.NODE_ENV})`);
  // Run a quick security scan on startup
  securityScanner.runScan('quick').then(scan => {
    console.info(`Startup security scan: score ${scan.score}/100, ${scan.findings?.length ?? 0} findings`);
  }).catch(() => {});
});

export { app, httpServer, io };
