// ================================================
// File:        src/routes/platform-routes.js
// Purpose:     Express router that exposes the new platform services —
//              analytics, project tracking, game/cloud connectors, billing,
//              auth, i18n, reasoning tiers, real-time security — as REST +
//              Socket.IO endpoints.  All new endpoints live under /api/v2/*
//              so nothing existing on /api/* is disturbed.
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// ================================================

import express from 'express';
import { SocialAnalyticsService, ANALYTICS_PLATFORMS } from '../services/analytics-service.js';
import { ProjectTracker, PROJECT_TRACKER_KINDS } from '../services/project-tracker.js';
import { RealtimeSecurityService } from '../services/realtime-security.js';
import { PaymentService, SUBSCRIPTION_TIERS, SUPPORTED_CARD_BRANDS, SUPPORTED_CRYPTO } from '../billing/payment-service.js';
import { AuditLogger } from '../services/audit-logger.js';
import { I18nService, SUPPORTED_LOCALES } from '../i18n/i18n-service.js';
import { listCloudConnectors, getCloudConnector } from '../connectors/cloud-connectors.js';
import { connectorDashboard as gameConnectorDashboard, getGameConnector, listGameConnectors } from '../connectors/game-platforms.js';
import { listReasoningTiers, resolveReasoningTier } from '../services/reasoning-tiers.js';
import {
  ROLES, ROLE_DASHBOARDS, PASSWORD_MIN_LENGTH,
  validatePassword, validateUsername,
  hashPassword, verifyPassword,
  signSession, verifySession,
  TOTP, BIOMETRIC_MODALITIES, ingestBiometricAttestation, requireRole
} from '../auth/auth-service.js';

/**
 * Build the router.  Callers pass in the shared Socket.IO server so the
 * services can broadcast realtime events on the right rooms.
 */
export function buildPlatformRouter({ io = null, logger = console } = {}) {
  const router = express.Router();

  const analytics = new SocialAnalyticsService({ logger });
  const tracker = new ProjectTracker({ logger });
  const security = new RealtimeSecurityService({ logger });
  const payments = new PaymentService();
  const audit = new AuditLogger();
  const i18n = new I18nService();

  security.start();
  if (io) {
    analytics.wireSocket(io);
    tracker.wireSocket(io);
    security.wireSocket(io);
  }

  // ---------- meta ----------
  router.get('/meta', (_req, res) => {
    res.json({
      version: 'v2',
      generatedAt: Date.now(),
      analyticsPlatforms: ANALYTICS_PLATFORMS,
      projectKinds: PROJECT_TRACKER_KINDS,
      subscriptionTiers: SUBSCRIPTION_TIERS,
      cardBrands: SUPPORTED_CARD_BRANDS,
      crypto: SUPPORTED_CRYPTO,
      locales: SUPPORTED_LOCALES,
      reasoning: listReasoningTiers(),
      roles: ROLES,
      passwordMinLength: PASSWORD_MIN_LENGTH,
      biometrics: BIOMETRIC_MODALITIES,
      roleDashboards: ROLE_DASHBOARDS
    });
  });

  // ---------- analytics ----------
  router.get('/analytics/snapshot', (req, res) => {
    const platforms = String(req.query.platforms || '').split(',').filter(Boolean);
    res.json(analytics.snapshot({ platforms: platforms.length ? platforms : undefined }));
  });
  router.post('/analytics/track', (req, res) => {
    const { platform, accountId } = req.body || {};
    if (!platform || !accountId) return res.status(400).json({ error: 'platform and accountId required' });
    try {
      analytics.track(platform, accountId);
      audit.record({ actor: req.headers['x-actor'] || 'anonymous', action: 'analytics.track', resource: `${platform}:${accountId}` });
      res.json({ ok: true, platform, accountId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ---------- project tracker ----------
  router.get('/projects/snapshot', (req, res) => {
    res.json(tracker.snapshot({ kind: req.query.kind, ownerId: req.query.ownerId }));
  });
  router.post('/projects', (req, res) => {
    try {
      const project = tracker.createProject(req.body || {});
      res.status(201).json(project);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.post('/projects/:id/milestones', (req, res) => {
    try { res.status(201).json(tracker.addMilestone(req.params.id, req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/projects/:id/milestones/:mid/complete', (req, res) => {
    try { res.json(tracker.completeMilestone(req.params.id, req.params.mid)); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/projects/:id/achievements', (req, res) => {
    try { res.status(201).json(tracker.unlockAchievement(req.params.id, req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/projects/:id/build', (req, res) => {
    try { res.json(tracker.reportBuild(req.params.id, req.body?.state, req.body?.meta)); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/projects/:id/telemetry', (req, res) => {
    try { res.json(tracker.reportTelemetry(req.params.id, req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.get('/projects/:id/timeline', (req, res) => {
    res.json({ items: tracker.timeline(req.params.id, Number(req.query.limit) || 100) });
  });

  // ---------- game connectors ----------
  router.get('/game-connectors', (_req, res) => res.json({ connectors: gameConnectorDashboard() }));
  router.post('/game-connectors/:id/sync', async (req, res) => {
    const c = getGameConnector(req.params.id);
    if (!c) return res.status(404).json({ error: 'unknown connector' });
    try {
      const report = await c.syncNow(req.body?.userExternalId || 'anonymous');
      audit.record({ actor: 'game', action: 'game.sync', resource: req.params.id });
      res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  router.get('/game-connectors/:id/achievements', async (req, res) => {
    const c = getGameConnector(req.params.id);
    if (!c) return res.status(404).json({ error: 'unknown connector' });
    res.json({ items: await c.fetchAchievements(req.query.user || 'anonymous') });
  });
  router.get('/game-connectors/:id/progress', async (req, res) => {
    const c = getGameConnector(req.params.id);
    if (!c) return res.status(404).json({ error: 'unknown connector' });
    res.json({ items: await c.fetchProgress(req.query.user || 'anonymous', req.query.game) });
  });
  router.get('/game-connectors-list', (_req, res) => res.json({ ids: listGameConnectors() }));

  // ---------- cloud connectors ----------
  router.get('/cloud-connectors', (_req, res) => res.json({ connectors: listCloudConnectors() }));
  router.get('/cloud-connectors/:id', (req, res) => {
    const c = getCloudConnector(req.params.id);
    if (!c) return res.status(404).json({ error: 'unknown connector' });
    res.json(c);
  });

  // ---------- realtime security ----------
  router.get('/security/live', (_req, res) => res.json(security.snapshot()));
  router.post('/security/scan-now', async (_req, res) => {
    await security._tickDeps();
    await security._tickNetwork();
    security._tickDevice();
    res.json(security.snapshot());
  });

  // ---------- billing ----------
  router.get('/billing/support', (_req, res) => res.json(payments.listSupport()));
  router.get('/billing/tiers', (_req, res) => res.json({ tiers: payments.listTiers() }));
  router.post('/billing/subscribe', async (req, res) => {
    try { res.json(await payments.subscribe(req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/billing/charge', async (req, res) => {
    try { res.json(await payments.chargeOnce(req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/billing/crypto', async (req, res) => {
    try { res.json(await payments.cryptoInvoice(req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });
  router.post('/billing/gift', async (req, res) => {
    try { res.json(await payments.redeemGift(req.body || {})); }
    catch (err) { res.status(400).json({ error: err.message }); }
  });

  // ---------- auth ----------
  router.get('/auth/policy', (_req, res) => res.json({
    passwordMinLength: PASSWORD_MIN_LENGTH,
    roles: ROLES,
    biometrics: BIOMETRIC_MODALITIES,
    roleDashboards: ROLE_DASHBOARDS
  }));
  router.post('/auth/validate-password', (req, res) => res.json(validatePassword(req.body?.password)));
  router.post('/auth/validate-username', (req, res) => res.json(validateUsername(req.body?.username)));
  router.post('/auth/register', async (req, res) => {
    try {
      const usernameCheck = validateUsername(req.body?.username);
      if (!usernameCheck.ok) return res.status(400).json({ error: 'invalid_username', detail: usernameCheck });
      const hash = await hashPassword(req.body?.password);
      const role = ROLES.includes(req.body?.role) ? req.body.role : 'user';
      audit.record({ actor: usernameCheck.normalized, action: 'auth.register', resource: role });
      res.status(201).json({
        id: hash.slice(0, 16),
        username: usernameCheck.normalized,
        role,
        dashboard: ROLE_DASHBOARDS[role],
        passwordHash: hash
      });
    } catch (err) {
      res.status(400).json({ error: err.message, reasons: err.reasons || undefined });
    }
  });
  router.post('/auth/login', async (req, res) => {
    const { username, password, passwordHash } = req.body || {};
    if (!username || !password || !passwordHash) return res.status(400).json({ error: 'missing_fields' });
    const ok = await verifyPassword(password, passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const role = ROLES.includes(req.body?.role) ? req.body.role : 'user';
    const token = signSession({ id: username, role });
    audit.record({ actor: username, action: 'auth.login', resource: role });
    res.json({ token, role, dashboard: ROLE_DASHBOARDS[role] });
  });
  router.post('/auth/session', (req, res) => {
    const session = verifySession(req.body?.token);
    if (!session) return res.status(401).json({ error: 'invalid_token' });
    res.json(session);
  });
  router.post('/auth/mfa/enroll', (req, res) => {
    const secret = TOTP.generateSecret();
    const uri = TOTP.otpauth({ secret, label: req.body?.label || 'nexus-user' });
    res.json({ secret, uri });
  });
  router.post('/auth/mfa/verify', (req, res) => {
    const ok = TOTP.verify(req.body?.secret, req.body?.code);
    audit.record({ actor: req.body?.label || 'unknown', action: 'auth.mfa.verify', outcome: ok ? 'ok' : 'fail' });
    res.json({ ok });
  });
  router.post('/auth/biometric', (req, res) => {
    try {
      const result = ingestBiometricAttestation(req.body || {});
      audit.record({ actor: req.headers['x-actor'] || 'anonymous', action: 'auth.biometric', resource: result.modality });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  router.get('/auth/require/:role', (req, res) => {
    try {
      const session = verifySession(req.headers.authorization?.replace(/^bearer\s+/i, ''));
      requireRole(session, req.params.role);
      res.json({ ok: true, session });
    } catch (err) {
      res.status(err.code || 500).json({ error: err.message });
    }
  });

  // ---------- i18n ----------
  router.get('/i18n/locales', (_req, res) => res.json({ locales: SUPPORTED_LOCALES }));
  router.post('/i18n/translate', async (req, res) => {
    const { key, locale, params } = req.body || {};
    const value = await i18n.t(key, locale, params);
    res.json({ key, locale: i18n.normalizeLocale(locale), value });
  });

  // ---------- reasoning tiers ----------
  router.get('/reasoning/tiers', (_req, res) => res.json({ tiers: listReasoningTiers() }));
  router.post('/reasoning/resolve', (req, res) => res.json({ tier: resolveReasoningTier(req.body?.tier) }));

  // ---------- audit ----------
  router.get('/audit/tail', (req, res) => res.json({ entries: audit.tail(Number(req.query.limit) || 100) }));

  return {
    router,
    services: { analytics, tracker, security, payments, audit, i18n }
  };
}
