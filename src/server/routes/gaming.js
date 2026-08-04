/**
 * @file gaming.js
 * @description Express router for game development project tracking and
 *   external game-platform connector management. Handles project CRUD,
 *   achievements, player progress, leaderboards, and connector stubs for
 *   UnrealEngine, EpicGames, SonyPSN, MicrosoftXbox, UbisoftConnect, and
 *   SteamAPI.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 *
 * SECURITY NOTE:
 *   Connector API keys are sourced exclusively from process.env using the
 *   prefix CONNECTOR_<NAME> (e.g. CONNECTOR_STEAM, CONNECTOR_EPICGAMES).
 *   Keys are NEVER hardcoded, logged, or returned in API responses.
 *
 * STORAGE NOTE:
 *   All Maps in this module serve as an in-memory store. In production,
 *   swap each Map for a Redis hash or a DB model (Postgres, MongoDB, etc.)
 *   to gain persistence and horizontal scaling.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Connector registry definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ConnectorDef
 * @property {string}   name
 * @property {string}   label          - Human-readable display name
 * @property {string}   envKey         - process.env key for the API key
 * @property {string}   status         - 'connected'|'disconnected'|'error'
 * @property {string|null} lastSync
 * @property {string[]} features
 */

/** @type {ConnectorDef[]} */
const CONNECTOR_DEFINITIONS = [
  {
    name: 'unrealengine',
    label: 'Unreal Engine',
    envKey: 'CONNECTOR_UNREALENGINE',
    status: 'disconnected',
    lastSync: null,
    features: ['asset_import', 'build_pipeline', 'crash_reporting', 'analytics'],
  },
  {
    name: 'epicgames',
    label: 'Epic Games Store',
    envKey: 'CONNECTOR_EPICGAMES',
    status: 'disconnected',
    lastSync: null,
    features: ['store_listing', 'achievements', 'leaderboards', 'drm', 'multiplayer'],
  },
  {
    name: 'sonypsn',
    label: 'Sony PlayStation Network',
    envKey: 'CONNECTOR_SONYPSN',
    status: 'disconnected',
    lastSync: null,
    features: ['trophies', 'online_play', 'share_play', 'remote_play', 'ps_store'],
  },
  {
    name: 'microsoftxbox',
    label: 'Microsoft Xbox',
    envKey: 'CONNECTOR_MICROSOFTXBOX',
    status: 'disconnected',
    lastSync: null,
    features: ['achievements', 'game_pass', 'xbox_live', 'playfab', 'game_dvr'],
  },
  {
    name: 'ubisoftconnect',
    label: 'Ubisoft Connect',
    envKey: 'CONNECTOR_UBISOFTCONNECT',
    status: 'disconnected',
    lastSync: null,
    features: ['units_rewards', 'challenges', 'overlay', 'cloud_saves'],
  },
  {
    name: 'steamapi',
    label: 'Steam API',
    envKey: 'CONNECTOR_STEAMAPI',
    status: 'disconnected',
    lastSync: null,
    features: ['achievements', 'leaderboards', 'workshop', 'stats', 'inventory', 'matchmaking'],
  },
];

/** @type {Map<string, ConnectorDef>} name -> mutable connector state */
const connectorRegistry = new Map(
  CONNECTOR_DEFINITIONS.map((c) => [c.name, { ...c }])
);

// ---------------------------------------------------------------------------
// In-memory stores (swap for Redis/DB in production)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GameProject
 * @property {string}   id
 * @property {string}   name
 * @property {string}   type           - 'game'|'ar'|'vr'|'3d'
 * @property {string}   status         - 'planning'|'active'|'paused'|'shipped'|'cancelled'
 * @property {string[]} techStack
 * @property {string[]} milestones
 * @property {string}   currentMilestone
 * @property {string}   description
 * @property {number}   createdAt
 * @property {number}   updatedAt
 */

/**
 * @typedef {Object} Achievement
 * @property {string}  id
 * @property {string}  name
 * @property {string}  description
 * @property {string}  category       - 'combat'|'exploration'|'story'|'social'|'misc'
 * @property {number}  points
 * @property {string}  icon
 * @property {boolean} hidden
 * @property {number}  createdAt
 */

/**
 * @typedef {Object} UserAchievement
 * @property {string} achievementId
 * @property {string} userId
 * @property {number} unlockedAt
 */

/**
 * @typedef {Object} PlayerProgress
 * @property {string} userId
 * @property {number} level
 * @property {number} xp
 * @property {number} xpToNextLevel
 * @property {Object} stats
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} userId
 * @property {string} username
 * @property {number} score
 * @property {number} rank
 * @property {number} submittedAt
 */

/** @type {Map<string, GameProject>}      id -> project */
const projects = new Map();

/** @type {Map<string, Achievement>}      id -> achievement definition */
const achievements = new Map();

/** @type {Map<string, UserAchievement[]>} userId -> unlocked achievements */
const userAchievements = new Map();

/** @type {Map<string, PlayerProgress>}   userId -> progress */
const playerProgress = new Map();

/** @type {LeaderboardEntry[]} sorted by score desc */
const leaderboard = [];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const PROJECT_TYPES = Object.freeze(['game', 'ar', 'vr', '3d']);
const PROJECT_STATUSES = Object.freeze(['planning', 'active', 'paused', 'shipped', 'cancelled']);
const ACHIEVEMENT_CATEGORIES = Object.freeze(['combat', 'exploration', 'story', 'social', 'misc']);

/**
 * Returns an error response if required fields are missing from body.
 * @param {object} body
 * @param {string[]} fields
 * @returns {string|null} Error message or null if valid.
 */
function validateRequired(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      return `Field "${f}" is required.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Socket.io emitter helper
// ---------------------------------------------------------------------------

/**
 * Emits a socket.io event if the io instance has been attached to the router.
 * @param {Router} router
 * @param {string} event
 * @param {object} payload
 */
function emitSocketEvent(router, event, payload) {
  if (router.io) {
    router.io.emit(event, payload);
  }
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns the gaming Express router.
 * @returns {Router}
 */
export function createGamingRouter() {
  const router = Router();

  // ==========================================================================
  // PROJECTS
  // ==========================================================================

  // GET /projects - list all game dev projects
  router.get('/projects', (_req, res) => {
    res.json({ ok: true, data: [...projects.values()] });
  });

  // POST /projects - create new game dev project
  router.post('/projects', (req, res) => {
    const body = req.body ?? {};
    const missing = validateRequired(body, ['name', 'type']);
    if (missing) return res.status(400).json({ ok: false, error: missing });

    const { name, type, description = '', techStack = [], status = 'planning' } = body;

    if (!PROJECT_TYPES.includes(type)) {
      return res.status(400).json({
        ok: false,
        error: `type must be one of: ${PROJECT_TYPES.join(', ')}`,
      });
    }
    if (!PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `status must be one of: ${PROJECT_STATUSES.join(', ')}`,
      });
    }

    /** @type {GameProject} */
    const project = {
      id: uuidv4(),
      name,
      type,
      status,
      techStack: Array.isArray(techStack) ? techStack : [],
      milestones: [],
      currentMilestone: '',
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    projects.set(project.id, project);

    emitSocketEvent(router, 'project:milestone', {
      event: 'project_created',
      projectId: project.id,
      name: project.name,
    });

    res.status(201).json({ ok: true, data: project });
  });

  // GET /projects/:id - get project details
  router.get('/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });
    res.json({ ok: true, data: project });
  });

  // PUT /projects/:id - update project (milestone, status, tech stack)
  router.put('/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });

    const { name, type, status, techStack, description, currentMilestone } = req.body ?? {};

    if (type !== undefined && !PROJECT_TYPES.includes(type)) {
      return res.status(400).json({ ok: false, error: `type must be one of: ${PROJECT_TYPES.join(', ')}` });
    }
    if (status !== undefined && !PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: `status must be one of: ${PROJECT_STATUSES.join(', ')}` });
    }

    if (name !== undefined) project.name = name;
    if (type !== undefined) project.type = type;
    if (status !== undefined) project.status = status;
    if (Array.isArray(techStack)) project.techStack = techStack;
    if (description !== undefined) project.description = description;
    if (currentMilestone !== undefined) {
      project.currentMilestone = currentMilestone;
      if (!project.milestones.includes(currentMilestone)) {
        project.milestones.push(currentMilestone);
      }
      emitSocketEvent(router, 'project:milestone', {
        event: 'milestone_set',
        projectId: project.id,
        milestone: currentMilestone,
      });
    }

    project.updatedAt = Date.now();
    projects.set(project.id, project);

    res.json({ ok: true, data: project });
  });

  // DELETE /projects/:id - remove project
  router.delete('/projects/:id', (req, res) => {
    if (!projects.has(req.params.id)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' });
    }
    projects.delete(req.params.id);
    res.json({ ok: true, data: { deleted: req.params.id } });
  });

  // ==========================================================================
  // ACHIEVEMENTS
  // ==========================================================================

  // GET /achievements - list all achievement definitions
  router.get('/achievements', (_req, res) => {
    res.json({ ok: true, data: [...achievements.values()] });
  });

  // POST /achievements - create achievement definition
  router.post('/achievements', (req, res) => {
    const body = req.body ?? {};
    const missing = validateRequired(body, ['name', 'description', 'category', 'points']);
    if (missing) return res.status(400).json({ ok: false, error: missing });

    const { name, description, category, points, icon = '🏆', hidden = false } = body;

    if (!ACHIEVEMENT_CATEGORIES.includes(category)) {
      return res.status(400).json({
        ok: false,
        error: `category must be one of: ${ACHIEVEMENT_CATEGORIES.join(', ')}`,
      });
    }
    if (typeof points !== 'number' || points < 0) {
      return res.status(400).json({ ok: false, error: 'points must be a non-negative number.' });
    }

    /** @type {Achievement} */
    const achievement = {
      id: uuidv4(),
      name,
      description,
      category,
      points,
      icon,
      hidden: Boolean(hidden),
      createdAt: Date.now(),
    };

    achievements.set(achievement.id, achievement);
    res.status(201).json({ ok: true, data: achievement });
  });

  // POST /achievements/:id/unlock - unlock achievement for a user
  router.post('/achievements/:id/unlock', (req, res) => {
    const achievement = achievements.get(req.params.id);
    if (!achievement) return res.status(404).json({ ok: false, error: 'Achievement not found.' });

    const { userId } = req.body ?? {};
    if (!userId) return res.status(400).json({ ok: false, error: 'userId is required.' });

    const userAch = userAchievements.get(userId) ?? [];
    const alreadyUnlocked = userAch.some((a) => a.achievementId === achievement.id);
    if (alreadyUnlocked) {
      return res.status(409).json({ ok: false, error: 'Achievement already unlocked.' });
    }

    /** @type {UserAchievement} */
    const record = {
      achievementId: achievement.id,
      userId,
      unlockedAt: Date.now(),
    };

    userAch.push(record);
    userAchievements.set(userId, userAch);

    emitSocketEvent(router, 'achievement:unlocked', {
      userId,
      achievement: { id: achievement.id, name: achievement.name, points: achievement.points },
      unlockedAt: record.unlockedAt,
    });

    res.status(201).json({ ok: true, data: { ...record, achievement } });
  });

  // ==========================================================================
  // PLAYER PROGRESS
  // ==========================================================================

  // GET /progress/:userId - get game progress for user
  router.get('/progress/:userId', (req, res) => {
    const progress = playerProgress.get(req.params.userId);
    if (!progress) {
      return res.status(404).json({ ok: false, error: 'No progress record found for this user.' });
    }
    const unlockedAchievements = userAchievements.get(req.params.userId) ?? [];
    res.json({ ok: true, data: { ...progress, achievements: unlockedAchievements } });
  });

  // POST /progress/:userId/update - update game progress
  router.post('/progress/:userId/update', (req, res) => {
    const { userId } = req.params;
    const { xpGain = 0, stats = {} } = req.body ?? {};

    const existing = playerProgress.get(userId) ?? {
      userId,
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      stats: {},
      updatedAt: Date.now(),
    };

    existing.xp += Math.max(0, Number(xpGain));

    // Simple level-up formula: each level requires level * 1000 XP
    while (existing.xp >= existing.xpToNextLevel) {
      existing.xp -= existing.xpToNextLevel;
      existing.level += 1;
      existing.xpToNextLevel = existing.level * 1000;
    }

    // Merge stats (numeric fields are summed; others are overwritten)
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number' && typeof existing.stats[key] === 'number') {
        existing.stats[key] += value;
      } else {
        existing.stats[key] = value;
      }
    }

    existing.updatedAt = Date.now();
    playerProgress.set(userId, existing);

    emitSocketEvent(router, 'progress:updated', {
      userId,
      level: existing.level,
      xp: existing.xp,
      xpToNextLevel: existing.xpToNextLevel,
    });

    res.json({ ok: true, data: existing });
  });

  // ==========================================================================
  // CONNECTORS
  // ==========================================================================

  // GET /connectors - list available connectors
  router.get('/connectors', (_req, res) => {
    // Return connector state without exposing API key values
    const data = [...connectorRegistry.values()].map(({ envKey: _envKey, ...c }) => ({
      ...c,
      configured: Boolean(process.env[_envKey]),
    }));
    res.json({ ok: true, data });
  });

  // POST /connectors/:name/connect - register connector with API key
  router.post('/connectors/:name/connect', (req, res) => {
    const name = req.params.name.toLowerCase();
    const connector = connectorRegistry.get(name);
    if (!connector) {
      return res.status(404).json({ ok: false, error: `Unknown connector: ${name}` });
    }

    // API keys must come from process.env — NEVER accept raw keys in request body
    // and store them inline. Instead, instruct operators to set process.env[connector.envKey].
    const apiKey = process.env[connector.envKey];
    if (!apiKey) {
      return res.status(503).json({
        ok: false,
        error: `Connector "${name}" is not configured. Set ${connector.envKey} in process.env.`,
      });
    }

    connector.status = 'connected';
    connector.lastSync = new Date().toISOString();

    emitSocketEvent(router, 'project:milestone', {
      event: 'connector_connected',
      connector: name,
      lastSync: connector.lastSync,
    });

    res.json({
      ok: true,
      data: {
        name: connector.name,
        label: connector.label,
        status: connector.status,
        lastSync: connector.lastSync,
        features: connector.features,
      },
    });
  });

  // GET /connectors/:name/status - get connector health
  router.get('/connectors/:name/status', (req, res) => {
    const connector = connectorRegistry.get(req.params.name.toLowerCase());
    if (!connector) {
      return res.status(404).json({ ok: false, error: `Unknown connector: ${req.params.name}` });
    }

    res.json({
      ok: true,
      data: {
        name: connector.name,
        label: connector.label,
        status: connector.status,
        lastSync: connector.lastSync,
        features: connector.features,
        configured: Boolean(process.env[connector.envKey]),
      },
    });
  });

  // POST /connectors/:name/sync - trigger a sync
  router.post('/connectors/:name/sync', (req, res) => {
    const connector = connectorRegistry.get(req.params.name.toLowerCase());
    if (!connector) {
      return res.status(404).json({ ok: false, error: `Unknown connector: ${req.params.name}` });
    }
    if (connector.status !== 'connected') {
      return res.status(409).json({ ok: false, error: `Connector "${connector.name}" is not connected.` });
    }

    connector.lastSync = new Date().toISOString();

    // In production, dispatch an async sync job to a queue here.
    emitSocketEvent(router, 'project:milestone', {
      event: 'connector_synced',
      connector: connector.name,
      lastSync: connector.lastSync,
    });

    res.json({
      ok: true,
      data: {
        name: connector.name,
        status: connector.status,
        lastSync: connector.lastSync,
        message: 'Sync triggered successfully.',
      },
    });
  });

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================

  // GET /leaderboard - get top players
  router.get('/leaderboard', (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const sorted = [...leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    res.json({ ok: true, data: sorted });
  });

  // POST /leaderboard/submit - submit score
  router.post('/leaderboard/submit', (req, res) => {
    const body = req.body ?? {};
    const missing = validateRequired(body, ['userId', 'username', 'score']);
    if (missing) return res.status(400).json({ ok: false, error: missing });

    const { userId, username, score } = body;
    if (typeof score !== 'number') {
      return res.status(400).json({ ok: false, error: 'score must be a number.' });
    }

    const existing = leaderboard.findIndex((e) => e.userId === userId);

    /** @type {LeaderboardEntry} */
    const entry = {
      userId,
      username,
      score,
      rank: 0, // computed on GET
      submittedAt: Date.now(),
    };

    if (existing >= 0) {
      if (leaderboard[existing].score < score) {
        leaderboard[existing] = entry;
      }
    } else {
      leaderboard.push(entry);
    }

    res.status(201).json({ ok: true, data: entry });
  });

  return router;
}

export default createGamingRouter();
