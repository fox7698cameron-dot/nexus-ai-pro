// src/routes/admin.js | Nexus AI Pro | Date: 2026-06-07

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================

const VALID_ROLES    = ['user', 'moderator', 'admin', 'superadmin'];
const VALID_STATUSES = ['active', 'suspended', 'pending', 'banned'];

const SETTINGS_DEFAULTS = {
  features: {
    registration:       true,
    twoFactorAuth:      true,
    apiAccess:          true,
    fileUploads:        true,
    workflowEngine:     true,
    connectors:         true,
    analyticsExport:    true,
    aiModels:           ['claude', 'gpt4', 'gemini'],
    maxUploadMB:        50,
    sessionTimeoutMins: 60,
    rateLimitPerMin:    100,
    maintenanceMode:    false,
    allowedOrigins:     ['*'],
  },
  branding: {
    platformName: 'Nexus AI Pro',
    supportEmail: 'support@nexusai.pro',
  },
  security: {
    passwordMinLength:       12,
    maxLoginAttempts:        5,
    lockoutDurationMins:     15,
    requireStrongPassword:   true,
    auditRetentionDays:      90,
  },
};

// ============================================================
// IN-MEMORY DATA STORES
// ============================================================

/**
 * usersStore: Map<userId, UserRecord>
 * UserRecord shape:
 * {
 *   id: string,
 *   email: string,
 *   username: string,
 *   role: 'user'|'moderator'|'admin'|'superadmin',
 *   status: 'active'|'suspended'|'pending'|'banned',
 *   createdAt: number,
 *   lastLoginAt: number | null,
 *   loginCount: number,
 *   mfaEnabled: boolean,
 *   metadata: object
 * }
 *
 * Exported for use by other route modules (e.g., auth.js).
 */
export const usersStore = new Map();

/**
 * auditStore: Array<AuditEntry>
 * AuditEntry shape:
 * {
 *   id: string,
 *   event: string,
 *   userId: string | null,
 *   targetId: string | null,
 *   ip: string,
 *   userAgent: string,
 *   payload: object,
 *   timestamp: number
 * }
 */
export const auditStore = [];

/**
 * sessionsStore: Map<sessionId, SessionRecord>
 * SessionRecord shape:
 * {
 *   id: string,
 *   userId: string,
 *   ip: string,
 *   userAgent: string,
 *   createdAt: number,
 *   lastActivityAt: number,
 *   expiresAt: number
 * }
 */
export const sessionsStore = new Map();

/**
 * platformSettings: mutable platform-wide settings object.
 * Exported so other modules can read feature flags at runtime.
 */
export const platformSettings = structuredClone(SETTINGS_DEFAULTS);

// ============================================================
// SEED DATA — synthetic users for development
// ============================================================

const seedUsers = [
  {
    id: 'usr_superadmin_001',
    email: 'contact@nexusai.pro',
    username: 'cameronfox',
    role: 'superadmin',
    status: 'active',
    createdAt: Date.now() - 31_536_000_000, // ~1 year ago
    lastLoginAt: Date.now() - 3600_000,
    loginCount: 842,
    mfaEnabled: true,
    metadata: { plan: 'enterprise', emailVerified: true },
  },
  {
    id: 'usr_admin_002',
    email: 'admin@nexusai.pro',
    username: 'nexus_admin',
    role: 'admin',
    status: 'active',
    createdAt: Date.now() - 15_768_000_000,
    lastLoginAt: Date.now() - 7200_000,
    loginCount: 321,
    mfaEnabled: true,
    metadata: { plan: 'enterprise', emailVerified: true },
  },
  {
    id: 'usr_mod_003',
    email: 'mod@nexusai.pro',
    username: 'nexus_mod',
    role: 'moderator',
    status: 'active',
    createdAt: Date.now() - 7_884_000_000,
    lastLoginAt: Date.now() - 86400_000,
    loginCount: 112,
    mfaEnabled: false,
    metadata: { plan: 'pro', emailVerified: true },
  },
  {
    id: 'usr_004',
    email: 'alice@example.com',
    username: 'alice_dev',
    role: 'user',
    status: 'active',
    createdAt: Date.now() - 2_592_000_000,
    lastLoginAt: Date.now() - 43200_000,
    loginCount: 47,
    mfaEnabled: false,
    metadata: { plan: 'pro', emailVerified: true },
  },
  {
    id: 'usr_005',
    email: 'bob@example.com',
    username: 'bob_tester',
    role: 'user',
    status: 'suspended',
    createdAt: Date.now() - 1_296_000_000,
    lastLoginAt: Date.now() - 2_592_000_000,
    loginCount: 9,
    mfaEnabled: false,
    metadata: { plan: 'free', emailVerified: false, suspendedReason: 'Policy violation' },
  },
];

for (const u of seedUsers) {
  usersStore.set(u.id, u);
}

// Seed a few audit log entries
const seedAuditEvents = [
  { event: 'user.login',           userId: 'usr_superadmin_001', targetId: null,          payload: { ip: '127.0.0.1' } },
  { event: 'admin.role_changed',   userId: 'usr_superadmin_001', targetId: 'usr_mod_003', payload: { from: 'user', to: 'moderator' } },
  { event: 'user.login',           userId: 'usr_admin_002',      targetId: null,          payload: { ip: '10.0.0.2' } },
  { event: 'admin.user_suspended', userId: 'usr_admin_002',      targetId: 'usr_005',     payload: { reason: 'Policy violation' } },
  { event: 'settings.updated',     userId: 'usr_superadmin_001', targetId: null,          payload: { changed: ['features.rateLimitPerMin'] } },
];

for (const e of seedAuditEvents) {
  auditStore.push({
    id: uuidv4(),
    event: e.event,
    userId: e.userId,
    targetId: e.targetId,
    ip: e.payload.ip || '127.0.0.1',
    userAgent: 'Nexus-AI-Pro/2.0',
    payload: e.payload,
    timestamp: Date.now() - Math.floor(Math.random() * 86400_000),
  });
}

// Seed an active session
sessionsStore.set('sess_seed_001', {
  id: 'sess_seed_001',
  userId: 'usr_superadmin_001',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  createdAt: Date.now() - 3600_000,
  lastActivityAt: Date.now() - 120_000,
  expiresAt: Date.now() + 3600_000,
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Append an entry to the in-process audit log.
 * Caps at 50,000 entries to prevent unbounded memory growth.
 */
function writeAudit(event, { userId = null, targetId = null, ip = 'unknown', userAgent = '', payload = {} } = {}) {
  auditStore.push({
    id: uuidv4(),
    event,
    userId,
    targetId,
    ip,
    userAgent,
    payload,
    timestamp: Date.now(),
  });
  if (auditStore.length > 50_000) {
    auditStore.splice(0, auditStore.length - 50_000);
  }
}

/**
 * Strip sensitive fields before returning a user record to an API caller.
 */
function safeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, tempPassword, ...safe } = user;
  return safe;
}

/**
 * Paginate an array given limit/offset query params (strings from req.query).
 */
function paginate(array, rawLimit, rawOffset) {
  const limit  = Math.min(200, Math.max(1, parseInt(rawLimit, 10)  || 20));
  const offset = Math.max(0, parseInt(rawOffset, 10) || 0);
  return {
    items: array.slice(offset, offset + limit),
    limit,
    offset,
    total: array.length,
    hasMore: offset + limit < array.length,
  };
}

/**
 * Extract caller context from request headers for audit log.
 */
function callerCtx(req) {
  return {
    ip:        req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || '',
    userId:    req.headers['x-user-id']  || req.user?.id || null,
  };
}

// ============================================================
// ADMIN ROLE MIDDLEWARE
// ============================================================

/**
 * requireAdmin — must be mounted before any admin route handler.
 *
 * In a full auth system this validates the JWT and checks the
 * decoded role claim. Here we accept an x-admin-token header
 * (checked against ADMIN_SECRET env var) OR an x-user-role
 * header equal to 'admin'|'superadmin' as set by the auth layer.
 *
 * Replace this with real JWT verification (e.g., passport-jwt)
 * when the full auth module is wired in.
 */
function requireAdmin(req, res, next) {
  const adminSecret = process.env.ADMIN_SECRET;
  const headerToken = req.headers['x-admin-token'];
  const roleHeader  = req.headers['x-user-role'];

  // Path 1: explicit admin token (for M2M / server-to-server use)
  if (adminSecret && headerToken && headerToken === adminSecret) {
    req.adminAuthenticated = true;
    return next();
  }

  // Path 2: role claim from JWT (decoded by upstream auth middleware)
  if (roleHeader && ['admin', 'superadmin'].includes(roleHeader)) {
    req.adminAuthenticated = true;
    return next();
  }

  // Path 3: user ID is a known admin in the store (development fallback)
  const userId = req.headers['x-user-id'];
  if (userId) {
    const user = usersStore.get(userId);
    if (user && ['admin', 'superadmin'].includes(user.role) && user.status === 'active') {
      req.adminAuthenticated = true;
      req.adminUser = user;
      return next();
    }
  }

  writeAudit('admin.unauthorized_access', {
    ...callerCtx(req),
    payload: { path: req.path, method: req.method },
  });

  return res.status(403).json({
    error: 'Admin privileges required.',
    hint: 'Provide x-admin-token header or ensure your JWT contains an admin role claim.',
  });
}

// Apply admin middleware to ALL routes in this router
router.use(requireAdmin);

// ============================================================
// ROUTE: GET /api/admin/users
// List all users with pagination
// ============================================================

router.get('/users', (req, res) => {
  const { limit, offset, role, status, search } = req.query;

  let users = Array.from(usersStore.values()).map(safeUser);

  if (role)   users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);
  if (search) {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }

  // Sort by createdAt descending (newest first)
  users.sort((a, b) => b.createdAt - a.createdAt);

  const page = paginate(users, limit, offset);

  writeAudit('admin.users_listed', {
    ...callerCtx(req),
    payload: { filters: { role, status, search }, total: page.total },
  });

  res.json({ users: page.items, pagination: { limit: page.limit, offset: page.offset, total: page.total, hasMore: page.hasMore } });
});

// ============================================================
// ROUTE: GET /api/admin/users/:id
// Get a single user by ID
// ============================================================

router.get('/users/:id', (req, res) => {
  const user = usersStore.get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: `User "${req.params.id}" not found.` });
  }

  writeAudit('admin.user_viewed', {
    ...callerCtx(req),
    targetId: user.id,
    payload: {},
  });

  res.json({ user: safeUser(user) });
});

// ============================================================
// ROUTE: PUT /api/admin/users/:id/role
// Change a user's role
// ============================================================

router.put('/users/:id/role', (req, res) => {
  const user = usersStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: `User "${req.params.id}" not found.` });

  const { role } = req.body;
  if (!role) return res.status(400).json({ error: '"role" is required.' });
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}.` });
  }

  // Prevent demoting the last superadmin
  if (user.role === 'superadmin' && role !== 'superadmin') {
    const superadmins = Array.from(usersStore.values()).filter((u) => u.role === 'superadmin');
    if (superadmins.length <= 1) {
      return res.status(409).json({ error: 'Cannot demote the last superadmin.' });
    }
  }

  const previousRole = user.role;
  const updated = { ...user, role, updatedAt: Date.now() };
  usersStore.set(user.id, updated);

  writeAudit('admin.role_changed', {
    ...callerCtx(req),
    targetId: user.id,
    payload: { from: previousRole, to: role },
  });

  res.json({ message: `Role updated to "${role}".`, user: safeUser(updated) });
});

// ============================================================
// ROUTE: PUT /api/admin/users/:id/status
// Suspend or activate a user
// ============================================================

router.put('/users/:id/status', (req, res) => {
  const user = usersStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: `User "${req.params.id}" not found.` });

  const { status, reason } = req.body;
  if (!status) return res.status(400).json({ error: '"status" is required.' });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}.` });
  }

  // Protect superadmins from suspension by non-superadmins
  if (user.role === 'superadmin' && status === 'suspended') {
    return res.status(403).json({ error: 'Superadmin accounts cannot be suspended.' });
  }

  const previousStatus = user.status;
  const metadata = { ...user.metadata };
  if (status === 'suspended' && reason) metadata.suspendedReason = reason;
  if (status === 'active') delete metadata.suspendedReason;

  const updated = { ...user, status, metadata, updatedAt: Date.now() };
  usersStore.set(user.id, updated);

  // Invalidate all sessions for this user if suspending or banning
  if (['suspended', 'banned'].includes(status)) {
    for (const [sessId, sess] of sessionsStore.entries()) {
      if (sess.userId === user.id) {
        sessionsStore.delete(sessId);
      }
    }
  }

  const eventName = status === 'suspended' ? 'admin.user_suspended'
    : status === 'banned'                  ? 'admin.user_banned'
    : 'admin.user_activated';

  writeAudit(eventName, {
    ...callerCtx(req),
    targetId: user.id,
    payload: { from: previousStatus, to: status, reason: reason || null },
  });

  res.json({ message: `User status updated to "${status}".`, user: safeUser(updated) });
});

// ============================================================
// ROUTE: POST /api/admin/users/:id/reset-password
// Generate a temporary password and return it to the admin
// ============================================================

router.post('/users/:id/reset-password', (req, res) => {
  const user = usersStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: `User "${req.params.id}" not found.` });

  // Generate a cryptographically secure temporary password
  // Format: 4 segments of 4 hex chars separated by dashes (easy to communicate)
  const tempPassword = [
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
  ].join('-');

  const tempPasswordExpiresAt = Date.now() + 3600_000; // 1 hour

  // In production, hash tempPassword with argon2/bcrypt before storing
  const updated = {
    ...user,
    // Store only a flag and expiry — actual hashed password would go here
    tempPasswordSet: true,
    tempPasswordExpiresAt,
    updatedAt: Date.now(),
    // Force password change on next login
    requirePasswordChange: true,
  };
  usersStore.set(user.id, updated);

  writeAudit('admin.password_reset', {
    ...callerCtx(req),
    targetId: user.id,
    payload: { tempPasswordExpiresAt, requirePasswordChange: true },
  });

  // Return the plaintext temp password ONCE — admin must relay it securely
  res.json({
    message: 'Temporary password generated. Share it securely with the user.',
    userId: user.id,
    email: user.email,
    tempPassword,
    expiresAt: tempPasswordExpiresAt,
    expiresIn: '1 hour',
    warning: 'This password is shown only once. The user must change it on next login.',
  });
});

// ============================================================
// ROUTE: DELETE /api/admin/users/:id
// Delete a user account
// ============================================================

router.delete('/users/:id', (req, res) => {
  const user = usersStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: `User "${req.params.id}" not found.` });

  if (user.role === 'superadmin') {
    return res.status(403).json({ error: 'Superadmin accounts cannot be deleted via API.' });
  }

  // Invalidate all sessions for this user
  for (const [sessId, sess] of sessionsStore.entries()) {
    if (sess.userId === user.id) sessionsStore.delete(sessId);
  }

  usersStore.delete(user.id);

  writeAudit('admin.user_deleted', {
    ...callerCtx(req),
    targetId: user.id,
    payload: { email: user.email, role: user.role },
  });

  res.json({
    message: `User "${user.username}" (${user.email}) has been permanently deleted.`,
    deletedId: user.id,
    deletedAt: Date.now(),
  });
});

// ============================================================
// ROUTE: GET /api/admin/audit
// List audit log entries with filtering and pagination
// ============================================================

router.get('/audit', (req, res) => {
  const { limit, offset, event, userId, from, to } = req.query;

  let entries = [...auditStore].reverse(); // newest first

  if (event)  entries = entries.filter((e) => e.event.includes(event));
  if (userId) entries = entries.filter((e) => e.userId === userId || e.targetId === userId);
  if (from) {
    const fromTs = parseInt(from, 10) || new Date(from).getTime();
    entries = entries.filter((e) => e.timestamp >= fromTs);
  }
  if (to) {
    const toTs = parseInt(to, 10) || new Date(to).getTime();
    entries = entries.filter((e) => e.timestamp <= toTs);
  }

  const page = paginate(entries, limit, offset);

  res.json({
    entries: page.items,
    pagination: { limit: page.limit, offset: page.offset, total: page.total, hasMore: page.hasMore },
  });
});

// ============================================================
// ROUTE: GET /api/admin/metrics
// System metrics overview
// ============================================================

router.get('/metrics', (req, res) => {
  const allUsers    = Array.from(usersStore.values());
  const allSessions = Array.from(sessionsStore.values());
  const now         = Date.now();

  const roleBreakdown = VALID_ROLES.reduce((acc, r) => {
    acc[r] = allUsers.filter((u) => u.role === r).length;
    return acc;
  }, {});

  const statusBreakdown = VALID_STATUSES.reduce((acc, s) => {
    acc[s] = allUsers.filter((u) => u.status === s).length;
    return acc;
  }, {});

  const last24h    = now - 86400_000;
  const last7d     = now - 604800_000;
  const recentAuditEvents = auditStore.filter((e) => e.timestamp >= last24h).length;
  const newUsers7d = allUsers.filter((u) => u.createdAt >= last7d).length;
  const activeSessionCount = allSessions.filter((s) => s.expiresAt > now).length;

  const loginEvents = auditStore.filter((e) => e.event === 'user.login' && e.timestamp >= last24h);

  writeAudit('admin.metrics_viewed', { ...callerCtx(req), payload: {} });

  res.json({
    timestamp: now,
    users: {
      total:    allUsers.length,
      byRole:   roleBreakdown,
      byStatus: statusBreakdown,
      newLast7Days: newUsers7d,
      withMfa:  allUsers.filter((u) => u.mfaEnabled).length,
    },
    sessions: {
      active: activeSessionCount,
      total:  allSessions.length,
    },
    audit: {
      totalEntries:      auditStore.length,
      last24hEvents:     recentAuditEvents,
      last24hLogins:     loginEvents.length,
    },
    platform: {
      version:       '2.0.0',
      uptimeMs:      process.uptime() * 1000,
      memoryMB:      Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion:   process.version,
      environment:   process.env.NODE_ENV || 'development',
    },
    settings: {
      maintenanceMode: platformSettings.features.maintenanceMode,
      registrationOpen: platformSettings.features.registration,
      activeModels:    platformSettings.features.aiModels,
    },
  });
});

// ============================================================
// ROUTE: GET /api/admin/sessions
// List active sessions
// ============================================================

router.get('/sessions', (req, res) => {
  const { limit, offset, userId } = req.query;
  const now = Date.now();

  let sessions = Array.from(sessionsStore.values())
    .filter((s) => s.expiresAt > now) // only active
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  if (userId) sessions = sessions.filter((s) => s.userId === userId);

  const page = paginate(sessions, limit, offset);

  // Enrich with username
  const enriched = page.items.map((s) => {
    const user = usersStore.get(s.userId);
    return { ...s, username: user?.username || 'unknown', email: user?.email || 'unknown' };
  });

  res.json({
    sessions: enriched,
    pagination: { limit: page.limit, offset: page.offset, total: page.total, hasMore: page.hasMore },
  });
});

// ============================================================
// ROUTE: DELETE /api/admin/sessions
// Clear all sessions (force logout all users)
// ============================================================

router.delete('/sessions', (req, res) => {
  const { userId } = req.query;
  let cleared = 0;

  if (userId) {
    // Clear sessions for a specific user only
    for (const [id, sess] of sessionsStore.entries()) {
      if (sess.userId === userId) {
        sessionsStore.delete(id);
        cleared++;
      }
    }
    writeAudit('admin.sessions_cleared_user', {
      ...callerCtx(req),
      targetId: userId,
      payload: { clearedCount: cleared },
    });
  } else {
    // Clear ALL sessions (global force logout)
    cleared = sessionsStore.size;
    sessionsStore.clear();
    writeAudit('admin.sessions_cleared_all', {
      ...callerCtx(req),
      payload: { clearedCount: cleared },
    });
  }

  res.json({
    message: userId
      ? `Cleared ${cleared} session(s) for user "${userId}".`
      : `Cleared all ${cleared} session(s). All users will need to log in again.`,
    clearedAt: Date.now(),
    count: cleared,
  });
});

// ============================================================
// ROUTE: GET /api/admin/settings
// Read platform settings
// ============================================================

router.get('/settings', (req, res) => {
  res.json({ settings: platformSettings, timestamp: Date.now() });
});

// ============================================================
// ROUTE: PUT /api/admin/settings
// Update platform settings
// ============================================================

router.put('/settings', (req, res) => {
  const { features, branding, security: securitySettings } = req.body;
  const changes = [];

  if (features && typeof features === 'object') {
    for (const [key, value] of Object.entries(features)) {
      if (key in platformSettings.features) {
        const old = platformSettings.features[key];
        platformSettings.features[key] = value;
        changes.push({ section: 'features', key, from: old, to: value });
      }
    }
  }

  if (branding && typeof branding === 'object') {
    for (const [key, value] of Object.entries(branding)) {
      if (key in platformSettings.branding) {
        const old = platformSettings.branding[key];
        platformSettings.branding[key] = value;
        changes.push({ section: 'branding', key, from: old, to: value });
      }
    }
  }

  if (securitySettings && typeof securitySettings === 'object') {
    for (const [key, value] of Object.entries(securitySettings)) {
      if (key in platformSettings.security) {
        const old = platformSettings.security[key];
        platformSettings.security[key] = value;
        changes.push({ section: 'security', key, from: old, to: value });
      }
    }
  }

  if (changes.length === 0) {
    return res.status(400).json({
      error: 'No recognized settings fields were provided or changed.',
      hint: 'Valid top-level keys: features, branding, security.',
    });
  }

  writeAudit('admin.settings_updated', {
    ...callerCtx(req),
    payload: { changes },
  });

  res.json({
    message: `${changes.length} setting(s) updated successfully.`,
    changes,
    settings: platformSettings,
    updatedAt: Date.now(),
  });
});

export default router;
