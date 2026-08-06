// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06
//
// API Extensions — additional routes for analytics, auth, subscriptions,
// game dev, social connectors, translation stub, and network status.
// Mount with: registerExtensions(app, io, security)
//
// SECURITY: No API keys, tokens, or secrets are ever hardcoded here.
// All sensitive values are read from process.env at runtime.

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Password policy: min 13 chars, upper, lower, digit, special
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{13,}$/;

// Allowed connector platforms (allowlist prevents arbitrary values)
const ALLOWED_PLATFORMS = new Set([
  'azure', 'aws', 'gcp', 'adobe', 'github', 'bitbucket',
  'redis', 'blob', 'slack', 'zoom', 'unreal', 'epic',
  'playstation', 'xbox', 'ubisoft',
]);

// Simple in-memory user store (replace with a real DB in production)
const usersStore = new Map();

// Seeded mock metrics generator (changes slowly over time for realism)
function generateMetrics() {
  const seed = Math.floor(Date.now() / 5000); // changes every 5s
  const rnd = (min, max, s) => Math.floor((((seed * s * 9301 + 49297) % 233280) / 233280) * (max - min)) + min;
  const platforms = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];
  return Object.fromEntries(platforms.map((p, i) => [p, {
    views:          rnd(10000, 5000000, i + 1),
    likes:          rnd(500, 500000, i + 2),
    reach:          rnd(20000, 8000000, i + 3),
    retention:      rnd(20, 85, i + 4),
    followers:      rnd(1000, 2000000, i + 5),
    engagementRate: parseFloat((rnd(5, 1200, i + 6) / 100).toFixed(2)),
    comments:       rnd(50, 100000, i + 7),
    shares:         rnd(10, 50000, i + 8),
    trend:          Array.from({ length: 7 }, (_, j) => rnd(5000, 500000, i + j + 10)),
  }]));
}

/**
 * Register all API extension routes on the Express app.
 * @param {import('express').Application} app
 * @param {import('socket.io').Server} io
 * @param {{ logAudit: Function }} security
 */
export default function registerExtensions(app, io, security) {

  // ── Analytics ─────────────────────────────────────────────────
  app.get('/api/analytics/metrics', (_req, res) => {
    res.json(generateMetrics());
  });

  // ── Security: Network Status ───────────────────────────────────
  app.get('/api/security/network-status', (_req, res) => {
    res.json({
      latency:        Math.floor(Math.random() * 30) + 5,
      packetLoss:     parseFloat((Math.random() * 0.5).toFixed(2)),
      openPorts:      [80, 443, 3001],
      tlsStatus:      'valid',
      firewallActive: true,
      timestamp:      Date.now(),
    });
  });

  // ── Projects ──────────────────────────────────────────────────
  app.get('/api/projects', (_req, res) => {
    res.json([
      { id: 1, title: 'StarForge RPG',      type: 'game', engine: 'Unreal 5', progress: 72, buildStatus: 'passing', platform: 'PC/Console', team: 4 },
      { id: 2, title: 'Pixel Dash Runner',  type: 'game', engine: 'Unity',    progress: 45, buildStatus: 'building',platform: 'Mobile',     team: 2 },
      { id: 3, title: 'VR Escape Room',     type: 'vr',   engine: 'Unreal 5', progress: 88, buildStatus: 'passing', platform: 'Meta Quest', team: 3 },
      { id: 4, title: 'AR City Builder',    type: 'ar',   engine: 'ARKit',    progress: 31, buildStatus: 'failing', platform: 'iOS',        team: 2 },
      { id: 5, title: 'Nexus Tactical',     type: 'game', engine: 'Godot 4',  progress: 60, buildStatus: 'passing', platform: 'PC/Linux',   team: 5 },
      { id: 6, title: '3D Portfolio Scene', type: '3d',   engine: 'Blender',  progress: 95, buildStatus: 'passing', platform: 'Web/WebGL',  team: 1 },
    ]);
  });

  // ── Achievements ──────────────────────────────────────────────
  app.get('/api/achievements', (_req, res) => {
    res.json([
      { id: 1, name: 'First Commit',        desc: 'Made your first code commit',        xp: 50,   unlocked: true  },
      { id: 2, name: 'Alpha Released',      desc: 'Released an alpha build',            xp: 200,  unlocked: true  },
      { id: 3, name: '1K Downloads',        desc: 'Reached 1,000 downloads',           xp: 500,  unlocked: true  },
      { id: 4, name: 'Multiplayer Ready',   desc: 'Implemented multiplayer networking', xp: 300,  unlocked: false },
      { id: 5, name: 'Cross-Platform Ship', desc: 'Released on 3+ platforms',          xp: 750,  unlocked: false },
      { id: 6, name: 'Console Certified',   desc: 'Passed console certification',       xp: 1000, unlocked: false },
      { id: 7, name: 'Speedrunner',         desc: 'Completed a sprint in < 24h',       xp: 100,  unlocked: true  },
      { id: 8, name: 'Bug Squasher',        desc: 'Closed 100 bug reports',            xp: 150,  unlocked: true  },
    ]);
  });

  // ── Auth: Register ────────────────────────────────────────────
  app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role } = req.body || {};

    // Input validation
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3–30 characters' });
    }
    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (typeof password !== 'string' || !PWD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 13 characters with uppercase, lowercase, digit, and special character'
      });
    }

    // Check duplicate email
    for (const u of usersStore.values()) {
      if (u.email === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const safeRole = ['user', 'admin', 'dev', 'mod'].includes(role) ? role : 'user';

    usersStore.set(userId, {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: safeRole,
      createdAt: Date.now(),
    });

    // Never include passwordHash in response
    security.logAudit('USER_REGISTER', { userId, role: safeRole });
    return res.status(201).json({ userId, message: 'Account created successfully' });
  });

  // ── Auth: Login ───────────────────────────────────────────────
  app.post('/api/auth/login', async (req, res) => {
    const { email, username, password, role } = req.body || {};

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password required' });
    }

    let user = null;
    for (const u of usersStore.values()) {
      if (
        (email   && u.email    === email.toLowerCase()) ||
        (username && u.username === username)
      ) {
        user = u;
        break;
      }
    }

    if (!user) {
      security.logAudit('LOGIN_FAIL', { email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      security.logAudit('LOGIN_FAIL', { userId: user.id, reason: 'wrong_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      security.logAudit('LOGIN_ERROR', { reason: 'missing_jwt_secret' });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, username: user.username },
      secret,
      { expiresIn: '1h', issuer: 'nexus-ai-pro' }
    );

    security.logAudit('LOGIN_SUCCESS', { userId: user.id, role: user.role });

    // In production: set httpOnly cookie instead of returning token in body
    return res.json({ token, role: user.role, userId: user.id, requiresMFA: false });
  });

  // ── Subscriptions: Plans ──────────────────────────────────────
  app.get('/api/subscriptions/plans', (_req, res) => {
    res.json([
      { id: 'free',       name: 'Free',       price: 0,     period: 'month', features: ['5 chats/day', 'Basic models', '1MB uploads'] },
      { id: 'pro',        name: 'Pro',        price: 9.99,  period: 'month', features: ['Unlimited chats', 'All models', '100MB uploads', 'Analytics'] },
      { id: 'enterprise', name: 'Enterprise', price: 49.99, period: 'month', features: ['Everything in Pro', 'Game dev tracking', 'API access', 'SLA'] },
      { id: 'ultimate',   name: 'Ultimate',   price: 99.99, period: 'month', features: ['Everything in Enterprise', 'White-glove onboarding', 'Custom connectors'] },
    ]);
  });

  // ── Subscriptions: Checkout (stub — Stripe integration required) ─
  app.post('/api/subscriptions/checkout', (req, res) => {
    const { tier, paymentMethod, paymentData } = req.body || {};

    const validTiers = ['free', 'pro', 'enterprise', 'ultimate'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    const validMethods = ['card', 'crypto', 'gift'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    security.logAudit('SUBSCRIPTION_CHECKOUT', { tier, paymentMethod });

    // Stripe tokenization must be handled client-side via Stripe.js
    // Raw card numbers must never reach this server
    return res.json({
      orderId:  uuidv4(),
      status:   tier === 'free' ? 'activated' : 'pending',
      message:  tier === 'free'
        ? 'Free plan activated'
        : 'Payment integration required — configure STRIPE_SECRET_KEY in .env',
      tier,
    });
  });

  // ── Translation (stub — configure TRANSLATION_API_KEY in .env) ─
  app.post('/api/translate', (req, res) => {
    const { text, targetLang } = req.body || {};
    if (typeof text !== 'string' || typeof targetLang !== 'string') {
      return res.status(400).json({ error: 'text and targetLang are required' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }
    // Real translation: configure TRANSLATION_API_KEY and call external service
    // Never hardcode the key — always read from process.env.TRANSLATION_API_KEY
    return res.json({ translated: text, note: 'Configure TRANSLATION_API_KEY for live translation' });
  });

  // ── Platform Connectors ───────────────────────────────────────
  app.post('/api/connectors/connect', (req, res) => {
    const { platform, config } = req.body || {};

    if (typeof platform !== 'string' || !ALLOWED_PLATFORMS.has(platform)) {
      return res.status(400).json({ error: 'Unknown or unsupported platform' });
    }

    // Config is optional metadata — never store secrets server-side
    // OAuth tokens should be stored securely in environment variables or a secrets manager
    security.logAudit('CONNECTOR_CONNECT', { platform });

    return res.json({
      connected:   true,
      platform,
      connectedAt: new Date().toISOString(),
      message:     `${platform} connector registered. Configure OAuth credentials in .env for full access.`,
    });
  });

  app.post('/api/connectors/disconnect', (req, res) => {
    const { platform } = req.body || {};
    if (typeof platform !== 'string' || !ALLOWED_PLATFORMS.has(platform)) {
      return res.status(400).json({ error: 'Unknown platform' });
    }
    security.logAudit('CONNECTOR_DISCONNECT', { platform });
    return res.json({ disconnected: true, platform });
  });

  // ── Socket.io: Real-time analytics broadcast ──────────────────
  if (io) {
    setInterval(() => {
      io.emit('analytics:update', generateMetrics());
    }, 5000);
  }
}
