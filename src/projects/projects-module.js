// src/projects/projects-module.js
// Nexus AI Pro - Project Tracking Module
// Covers: coding projects, game development, AR/VR/3D, achievements, game progress
// Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft
// Date: 2026-08-01

import { v4 as uuidv4 } from 'uuid';

// ── Project Types ──────────────────────────────────────────────────────────────
export const PROJECT_TYPES = {
  CODING:    'coding',
  GAME_DEV:  'game_dev',
  AR_VR_3D:  'ar_vr_3d',
  APP_DEV:   'app_dev',
  WEB:       'web'
};

export const GAME_ENGINES = {
  UNREAL:    { name: 'Unreal Engine', vendor: 'Epic Games', icon: '⚡' },
  UNITY:     { name: 'Unity',         vendor: 'Unity Technologies', icon: '🔮' },
  GODOT:     { name: 'Godot',         vendor: 'Godot Foundation', icon: '🤖' },
  CRYENGINE: { name: 'CryEngine',     vendor: 'Crytek', icon: '❄️' },
  SOURCE:    { name: 'Source 2',      vendor: 'Valve', icon: '🔧' },
  CUSTOM:    { name: 'Custom Engine', vendor: 'In-house', icon: '⚙️' }
};

export const PLATFORM_TARGETS = {
  PC:          { name: 'PC (Windows/Linux/Mac)', icon: '💻' },
  PS5:         { name: 'PlayStation 5',          icon: '🎮', vendor: 'Sony' },
  XBOX:        { name: 'Xbox Series X/S',        icon: '🟢', vendor: 'Microsoft' },
  SWITCH:      { name: 'Nintendo Switch',        icon: '🕹️', vendor: 'Nintendo' },
  MOBILE_IOS:  { name: 'iOS',                    icon: '📱', vendor: 'Apple' },
  MOBILE_AND:  { name: 'Android',                icon: '🤖', vendor: 'Google' },
  VR_QUEST:    { name: 'Meta Quest',             icon: '🥽', vendor: 'Meta' },
  VR_STEAM:    { name: 'SteamVR',                icon: '🎭', vendor: 'Valve' },
  WEB:         { name: 'WebGL/Web',              icon: '🌐', vendor: null }
};

// ── In-memory store ────────────────────────────────────────────────────────────
const projects = new Map();
const achievements = new Map();
const gameProgress = new Map();

// ── Project CRUD ───────────────────────────────────────────────────────────────
export function createProject(userId, projectData) {
  const id = uuidv4();
  const now = Date.now();
  const project = {
    id,
    userId,
    name: projectData.name || 'Untitled Project',
    description: projectData.description || '',
    type: PROJECT_TYPES[projectData.type] || PROJECT_TYPES.CODING,
    engine: projectData.engine || null,
    platforms: Array.isArray(projectData.platforms) ? projectData.platforms : [],
    tags: Array.isArray(projectData.tags) ? projectData.tags : [],
    status: 'active',   // active | paused | completed | archived
    progress: 0,        // 0–100
    milestones: [],
    tasks: [],
    metrics: {
      linesOfCode: 0,
      commits: 0,
      buildTime: 0,
      testCoverage: 0,
      bugs: { open: 0, closed: 0 },
      performance: { fps: 0, loadTime: 0 }
    },
    connectors: {},
    createdAt: now,
    updatedAt: now
  };
  projects.set(id, project);
  return project;
}

export function getProject(projectId, userId) {
  const p = projects.get(projectId);
  if (!p || p.userId !== userId) throw new Error('Project not found');
  return p;
}

export function listProjects(userId, type = null) {
  const result = [];
  for (const [, p] of projects) {
    if (p.userId !== userId) continue;
    if (type && p.type !== type) continue;
    result.push(p);
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updateProject(projectId, userId, updates) {
  const p = getProject(projectId, userId);
  const allowed = ['name','description','status','progress','tags','platforms','engine','metrics'];
  for (const key of allowed) {
    if (key in updates) {
      if (key === 'metrics' && typeof updates.metrics === 'object') {
        p.metrics = { ...p.metrics, ...updates.metrics };
      } else {
        p[key] = updates[key];
      }
    }
  }
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return p;
}

export function deleteProject(projectId, userId) {
  const p = getProject(projectId, userId);
  projects.delete(projectId);
  return { deleted: true, id: projectId };
}

// ── Milestones & Tasks ─────────────────────────────────────────────────────────
export function addMilestone(projectId, userId, milestone) {
  const p = getProject(projectId, userId);
  const m = { id: uuidv4(), ...milestone, status: 'pending', createdAt: Date.now() };
  p.milestones.push(m);
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return m;
}

export function addTask(projectId, userId, task) {
  const p = getProject(projectId, userId);
  const t = {
    id: uuidv4(),
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    status: 'todo',   // todo | in_progress | done
    assignee: task.assignee || null,
    dueDate: task.dueDate || null,
    createdAt: Date.now()
  };
  p.tasks.push(t);
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return t;
}

export function updateTask(projectId, userId, taskId, updates) {
  const p = getProject(projectId, userId);
  const idx = p.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Task not found');
  p.tasks[idx] = { ...p.tasks[idx], ...updates, updatedAt: Date.now() };
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return p.tasks[idx];
}

// ── Game Engine Connectors ─────────────────────────────────────────────────────
export function connectGameEngine(projectId, userId, engineKey, config = {}) {
  const p = getProject(projectId, userId);
  if (!GAME_ENGINES[engineKey]) throw new Error(`Unknown engine: ${engineKey}`);
  p.connectors[engineKey] = {
    connected: true,
    engineName: GAME_ENGINES[engineKey].name,
    config: {
      projectPath: config.projectPath || null,
      buildTarget: config.buildTarget || 'Development',
      apiEndpoint: config.apiEndpoint || null
    },
    connectedAt: Date.now(),
    lastSync: null,
    buildStatus: 'idle'
  };
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return p.connectors[engineKey];
}

// ── Platform Store Connectors (Sony, Microsoft, Ubisoft) ───────────────────────
const STORE_CONNECTORS = {
  epic: {
    name: 'Epic Games Store',
    vendor: 'Epic Games',
    authUrl: 'https://www.epicgames.com/id/authorize',
    features: ['achievements', 'leaderboards', 'overlay', 'eac']
  },
  sony: {
    name: 'PlayStation Network',
    vendor: 'Sony Interactive Entertainment',
    authUrl: 'https://auth.api.sonyentertainmentnetwork.com',
    features: ['trophies', 'online_id', 'game_sharing', 'cross_play']
  },
  microsoft: {
    name: 'Xbox Network / Microsoft Store',
    vendor: 'Microsoft',
    authUrl: 'https://login.live.com/oauth20_authorize.srf',
    features: ['achievements', 'gamertag', 'xuid', 'game_pass', 'cross_play']
  },
  ubisoft: {
    name: 'Ubisoft Connect',
    vendor: 'Ubisoft',
    authUrl: 'https://connect.ubisoft.com',
    features: ['units', 'challenges', 'actions', 'overlay']
  },
  steam: {
    name: 'Steam',
    vendor: 'Valve',
    authUrl: 'https://steamcommunity.com/openid/login',
    features: ['achievements', 'stats', 'cloud_save', 'workshop', 'leaderboards']
  },
  apple_arcade: {
    name: 'Apple Arcade / Game Center',
    vendor: 'Apple',
    features: ['achievements', 'leaderboards', 'multiplayer', 'icloud_save']
  },
  google_play: {
    name: 'Google Play Games',
    vendor: 'Google',
    features: ['achievements', 'leaderboards', 'saved_games', 'sign_in']
  }
};

export function getAvailableConnectors() {
  return Object.entries(STORE_CONNECTORS).map(([key, c]) => ({
    key,
    ...c,
    authUrl: undefined  // never expose OAuth URLs in listing
  }));
}

export function connectStoreConnector(projectId, userId, storeKey, oauthConfig = {}) {
  const p = getProject(projectId, userId);
  const store = STORE_CONNECTORS[storeKey];
  if (!store) throw new Error(`Unknown store connector: ${storeKey}`);

  p.connectors[`store_${storeKey}`] = {
    connected: true,
    storeName: store.name,
    vendor: store.vendor,
    features: store.features,
    appId: oauthConfig.appId || null,
    connectedAt: Date.now(),
    lastSync: null,
    status: 'active'
  };
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return { connected: true, store: store.name, features: store.features };
}

// ── Achievement & Game Progress Tracking ──────────────────────────────────────
export function createAchievement(projectId, userId, achievementData) {
  const p = getProject(projectId, userId);
  const id = uuidv4();
  const achievement = {
    id,
    projectId,
    name: achievementData.name,
    description: achievementData.description || '',
    icon: achievementData.icon || '🏆',
    type: achievementData.type || 'standard',  // standard | hidden | incremental | challenge
    requirement: achievementData.requirement || {},
    xp: achievementData.xp || 10,
    platforms: achievementData.platforms || ['all'],
    unlockCondition: achievementData.unlockCondition || null,
    createdAt: Date.now()
  };
  if (!achievements.has(projectId)) achievements.set(projectId, new Map());
  achievements.get(projectId).set(id, achievement);
  return achievement;
}

export function getAchievements(projectId, userId) {
  getProject(projectId, userId); // access check
  const ach = achievements.get(projectId);
  if (!ach) return [];
  return Array.from(ach.values());
}

export function trackPlayerProgress(projectId, userId, playerId, progressData) {
  getProject(projectId, userId);
  const key = `${projectId}:${playerId}`;
  const existing = gameProgress.get(key) || { playerId, projectId, xp: 0, level: 1, achievements: [], stats: {}, lastSeen: null };
  const updated = {
    ...existing,
    ...progressData,
    xp: (existing.xp || 0) + (progressData.xpGained || 0),
    stats: { ...existing.stats, ...(progressData.stats || {}) },
    lastSeen: Date.now()
  };
  updated.level = Math.floor(1 + Math.sqrt(updated.xp / 100));
  gameProgress.set(key, updated);
  return updated;
}

export function getPlayerProgress(projectId, userId, playerId) {
  getProject(projectId, userId);
  return gameProgress.get(`${projectId}:${playerId}`) || null;
}

export function unlockAchievement(projectId, userId, playerId, achievementId) {
  getProject(projectId, userId);
  const ach = achievements.get(projectId)?.get(achievementId);
  if (!ach) throw new Error('Achievement not found');
  const key = `${projectId}:${playerId}`;
  const progress = gameProgress.get(key) || { playerId, projectId, xp: 0, level: 1, achievements: [], stats: {} };
  if (progress.achievements.includes(achievementId)) return { alreadyUnlocked: true };
  progress.achievements.push(achievementId);
  progress.xp = (progress.xp || 0) + (ach.xp || 0);
  progress.level = Math.floor(1 + Math.sqrt(progress.xp / 100));
  progress.lastSeen = Date.now();
  gameProgress.set(key, progress);
  return { unlocked: true, achievement: ach, xpGained: ach.xp, newXp: progress.xp, newLevel: progress.level };
}

// ── AR/VR/3D Project Specific Tracking ────────────────────────────────────────
export function updateArVrMetrics(projectId, userId, metrics) {
  const p = getProject(projectId, userId);
  p.metrics = {
    ...p.metrics,
    arVr: {
      targetFramerate: metrics.targetFramerate || 90,
      currentFps: metrics.currentFps || 0,
      polyCount: metrics.polyCount || 0,
      drawCalls: metrics.drawCalls || 0,
      vramUsageMb: metrics.vramUsageMb || 0,
      motionToPhotonLatency: metrics.motionToPhotonLatency || 0,
      comfortRating: metrics.comfortRating || null,
      supportedHeadsets: metrics.supportedHeadsets || [],
      spatialAudioEnabled: metrics.spatialAudioEnabled || false
    }
  };
  p.updatedAt = Date.now();
  projects.set(projectId, p);
  return p.metrics.arVr;
}

export function getProjectDashboard(userId) {
  const userProjects = listProjects(userId);
  const byType = {};
  for (const t of Object.values(PROJECT_TYPES)) byType[t] = [];
  for (const p of userProjects) {
    if (byType[p.type]) byType[p.type].push(p);
  }

  const totalProjects = userProjects.length;
  const activeProjects = userProjects.filter(p => p.status === 'active').length;
  const completedProjects = userProjects.filter(p => p.status === 'completed').length;
  const avgProgress = totalProjects > 0
    ? Math.round(userProjects.reduce((s, p) => s + p.progress, 0) / totalProjects)
    : 0;

  return { totalProjects, activeProjects, completedProjects, avgProgress, byType, projects: userProjects };
}
