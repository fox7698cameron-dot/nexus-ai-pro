// src/projects/projects-service.js
// 2026-06-12 | Nexus AI Pro Project Tracking Service
// Coding + Game Dev + AR/VR/3D projects — milestones, connectors, achievements

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ---- project type catalogue ------------------------------------------

export const PROJECT_TYPES = Object.freeze({
  code:    { label: 'Software / Web / API',    icon: 'Code',          subtypes: ['web', 'api', 'cli', 'library', 'saas'] },
  game:    { label: 'Game Development',        icon: 'Gamepad2',      subtypes: ['2d', '3d', 'vr', 'ar', 'mobile', 'multiplayer'] },
  ar_vr:   { label: 'AR / VR / XR',            icon: 'Glasses',       subtypes: ['ar', 'vr', 'mr', 'spatial', 'metaverse'] },
  '3d':    { label: '3D / Animation / VFX',    icon: 'Box',           subtypes: ['modeling', 'animation', 'vfx', 'simulation'] },
  plugin:  { label: 'Plugin / Extension',      icon: 'Puzzle',        subtypes: ['vscode', 'unity', 'unreal', 'blender', 'browser'] }
});

// ---- game-engine connector definitions --------------------------------

export const GAME_CONNECTORS = Object.freeze({
  unreal:    { name: 'Unreal Engine',     envKey: 'UNREAL_API_KEY',     apiBase: 'https://api.unrealengine.com' },
  epic:      { name: 'Epic Games Store',  envKey: 'EPIC_API_KEY',       apiBase: 'https://api.epicgames.dev' },
  sony:      { name: 'PlayStation',       envKey: 'SONY_PSN_TOKEN',     apiBase: 'https://m.np.playstation.com/api' },
  microsoft: { name: 'Xbox / MSFT',       envKey: 'XBOX_TOKEN',         apiBase: 'https://xblazure.management.core.windows.net' },
  ubisoft:   { name: 'Ubisoft Connect',   envKey: 'UBISOFT_TOKEN',      apiBase: 'https://public-ubiservices.ubi.com/v3' }
});

// ---- in-memory store (swap for pg in production) ---------------------

const projects = new Map();
const achievements = new Map();

// ---- milestone helpers -----------------------------------------------

function createMilestone({ title, dueDate, weight = 1 }) {
  return { id: uuidv4(), title, dueDate, weight, completed: false, completedAt: null };
}

function calcProgress(milestones = []) {
  if (!milestones.length) return 0;
  const done = milestones.filter(m => m.completed).reduce((s, m) => s + m.weight, 0);
  const total = milestones.reduce((s, m) => s + m.weight, 0);
  return total ? Math.round(done / total * 100) : 0;
}

// ---- project CRUD ----------------------------------------------------

export const ProjectsService = {
  createProject({ userId, name, type, subtype, engine, description, milestones = [], tags = [] }) {
    if (!PROJECT_TYPES[type]) throw new Error(`Unknown project type: ${type}`);
    const id = uuidv4();
    const project = {
      id, userId, name, type, subtype, engine,
      description,
      tags,
      milestones: milestones.map(m => createMilestone(m)),
      status: 'active',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      connectorData: {}
    };
    projects.set(id, project);
    return project;
  },

  getProject(id) { return projects.get(id) || null; },

  listProjects(userId, { type, status } = {}) {
    return Array.from(projects.values()).filter(p => {
      if (p.userId !== userId) return false;
      if (type && p.type !== type) return false;
      if (status && p.status !== status) return false;
      return true;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  updateProject(id, updates) {
    const p = projects.get(id);
    if (!p) return null;
    Object.assign(p, updates, { updatedAt: Date.now() });
    p.progress = calcProgress(p.milestones);
    return p;
  },

  completeMilestone(projectId, milestoneId) {
    const p = projects.get(projectId);
    if (!p) return null;
    const ms = p.milestones.find(m => m.id === milestoneId);
    if (!ms) return null;
    ms.completed = true;
    ms.completedAt = Date.now();
    p.progress = calcProgress(p.milestones);
    p.updatedAt = Date.now();
    if (p.progress === 100) p.status = 'completed';
    return p;
  },

  deleteProject(id) {
    return projects.delete(id);
  },

  // ---- game-engine connector sync ------------------------------------

  async syncGameConnector(projectId, connectorKey) {
    const p = projects.get(projectId);
    if (!p) return { error: 'Project not found.' };
    const connector = GAME_CONNECTORS[connectorKey];
    if (!connector) return { error: `Unknown connector: ${connectorKey}` };

    const token = process.env[connector.envKey];
    if (!token) {
      // Return placeholder until credentials are configured
      return {
        connected: false,
        message: `Set ${connector.envKey} in .env to connect to ${connector.name}.`,
        connector: connectorKey
      };
    }

    try {
      const resp = await fetch(`${connector.apiBase}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      p.connectorData[connectorKey] = { data, syncedAt: Date.now() };
      return { connected: true, connector: connectorKey, data };
    } catch (err) {
      return { error: err.message, connector: connectorKey };
    }
  },

  // ---- achievements ---------------------------------------------------

  grantAchievement({ userId, projectId, title, description, xp = 10, icon = 'Trophy' }) {
    const id = uuidv4();
    const ach = { id, userId, projectId, title, description, xp, icon, grantedAt: Date.now() };
    if (!achievements.has(userId)) achievements.set(userId, []);
    achievements.get(userId).push(ach);
    return ach;
  },

  getAchievements(userId) { return achievements.get(userId) || []; },

  getTotalXP(userId) {
    return (achievements.get(userId) || []).reduce((s, a) => s + a.xp, 0);
  },

  getProjectStats(userId) {
    const all = Array.from(projects.values()).filter(p => p.userId === userId);
    return {
      total: all.length,
      active: all.filter(p => p.status === 'active').length,
      completed: all.filter(p => p.status === 'completed').length,
      byType: Object.keys(PROJECT_TYPES).reduce((acc, t) => {
        acc[t] = all.filter(p => p.type === t).length;
        return acc;
      }, {}),
      avgProgress: all.length
        ? Math.round(all.reduce((s, p) => s + p.progress, 0) / all.length)
        : 0
    };
  }
};
