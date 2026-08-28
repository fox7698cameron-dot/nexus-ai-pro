/**
 * src/project-tracking/ProjectTracker.js
 * Nexus AI Pro — Real-Time Project Tracker
 * Covers: coding, game development (2D/3D/AR/VR), achievement tracking
 * Date: 2026-08-28
 */

import { v4 as uuidv4 } from 'uuid';

// ── Project types ──────────────────────────────────────────────────────────
export const PROJECT_TYPES = Object.freeze({
  WEB:          { id: 'web',          name: 'Web Application',     icon: '🌐' },
  MOBILE:       { id: 'mobile',       name: 'Mobile App',          icon: '📱' },
  DESKTOP:      { id: 'desktop',      name: 'Desktop App',         icon: '🖥️'  },
  GAME_2D:      { id: 'game_2d',      name: '2D Game',             icon: '🕹️'  },
  GAME_3D:      { id: 'game_3d',      name: '3D Game',             icon: '🎮' },
  AR:           { id: 'ar',           name: 'Augmented Reality',   icon: '📡' },
  VR:           { id: 'vr',           name: 'Virtual Reality',     icon: '🥽' },
  XR:           { id: 'xr',           name: 'Extended Reality',    icon: '🔮' },
  AI_ML:        { id: 'ai_ml',        name: 'AI / Machine Learning', icon: '🤖' },
  API:          { id: 'api',          name: 'API / Backend',       icon: '⚙️'  },
  DATA:         { id: 'data',         name: 'Data Science',        icon: '📊' },
  BLOCKCHAIN:   { id: 'blockchain',   name: 'Blockchain / Web3',   icon: '⛓️'  },
  PLUGIN:       { id: 'plugin',       name: 'Plugin / Extension',  icon: '🔌' },
  OTHER:        { id: 'other',        name: 'Other',               icon: '📦' },
});

export const GAME_ENGINES = Object.freeze({
  UNREAL:  { id: 'unreal',  name: 'Unreal Engine', version: '5.x', icon: '🎮' },
  UNITY:   { id: 'unity',   name: 'Unity',         version: '2024.x', icon: '🔲' },
  GODOT:   { id: 'godot',   name: 'Godot',         version: '4.x', icon: '👁️'  },
  CUSTOM:  { id: 'custom',  name: 'Custom Engine', version: '',    icon: '🔧' },
});

export const TARGET_PLATFORMS = Object.freeze({
  PC:        { id: 'pc',       name: 'PC (Windows)',   icon: '🪟' },
  MACOS:     { id: 'macos',    name: 'macOS',          icon: '🍎' },
  LINUX:     { id: 'linux',    name: 'Linux',          icon: '🐧' },
  PLAYSTATION: { id: 'ps',     name: 'PlayStation',    icon: '🎯' },
  XBOX:      { id: 'xbox',     name: 'Xbox',           icon: '🟩' },
  NINTENDO:  { id: 'nintendo', name: 'Nintendo Switch', icon: '🔴' },
  IOS:       { id: 'ios',      name: 'iOS',            icon: '📱' },
  ANDROID:   { id: 'android',  name: 'Android',        icon: '🤖' },
  WEB:       { id: 'web',      name: 'WebGL',          icon: '🌐' },
  VR_QUEST:  { id: 'quest',    name: 'Meta Quest',     icon: '🥽' },
});

// ── In-memory project store (production: PostgreSQL + Redis) ───────────────
const projects  = new Map();
const milestones = new Map();
const tasks     = new Map();
const sessions  = new Map(); // coding sessions

// ── Project CRUD ───────────────────────────────────────────────────────────
export function createProject({
  userId, name, description = '', type = 'other',
  engine = null, platforms = [], repo = null,
  tags = [], metadata = {},
}) {
  const id  = uuidv4();
  const now = new Date().toISOString();
  const project = {
    id,
    userId,
    name,
    description,
    type,
    engine,
    platforms,
    repo,
    tags,
    metadata,
    status:    'active',
    progress:  0,           // 0–100
    linesOfCode: 0,
    commits:   0,
    bugsFound: 0,
    bugsFixed: 0,
    buildStatus: 'unknown', // 'passing' | 'failing' | 'unknown'
    testCoverage: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  projects.set(id, project);
  return project;
}

export function getProject(id) {
  return projects.get(id) || null;
}

export function updateProject(id, updates) {
  const p = projects.get(id);
  if (!p) return null;
  Object.assign(p, updates, { updatedAt: new Date().toISOString() });
  return p;
}

export function listProjects(userId) {
  return [...projects.values()].filter(p => p.userId === userId);
}

export function deleteProject(id) {
  return projects.delete(id);
}

// ── Milestone management ───────────────────────────────────────────────────
export function createMilestone({ projectId, name, description = '', dueDate, tasks: taskIds = [] }) {
  const id  = uuidv4();
  const now = new Date().toISOString();
  const m   = { id, projectId, name, description, dueDate, taskIds, status: 'pending', completedAt: null, createdAt: now };
  milestones.set(id, m);
  return m;
}

export function getMilestonesByProject(projectId) {
  return [...milestones.values()].filter(m => m.projectId === projectId);
}

export function updateMilestone(id, updates) {
  const m = milestones.get(id);
  if (!m) return null;
  Object.assign(m, updates);
  return m;
}

// ── Task management ────────────────────────────────────────────────────────
export function createTask({
  projectId, milestoneId = null, title, description = '',
  type = 'feature', priority = 'medium', assignee = null,
  estimatedHours = 0, labels = [],
}) {
  const id  = uuidv4();
  const now = new Date().toISOString();
  const t   = {
    id, projectId, milestoneId, title, description, type, priority,
    assignee, estimatedHours, actualHours: 0, labels,
    status: 'todo', // 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
    createdAt: now, updatedAt: now, completedAt: null,
  };
  tasks.set(id, t);
  return t;
}

export function getTasksByProject(projectId) {
  return [...tasks.values()].filter(t => t.projectId === projectId);
}

export function updateTask(id, updates) {
  const t = tasks.get(id);
  if (!t) return null;
  Object.assign(t, updates, { updatedAt: new Date().toISOString() });
  if (updates.status === 'done' && !t.completedAt) {
    t.completedAt = new Date().toISOString();
  }
  return t;
}

// ── Coding session tracking ────────────────────────────────────────────────
export function startCodingSession({ userId, projectId, language = 'unknown' }) {
  const id  = uuidv4();
  const now = Date.now();
  const s   = { id, userId, projectId, language, startedAt: now, endedAt: null, linesAdded: 0, linesRemoved: 0, duration: 0 };
  sessions.set(id, s);
  return s;
}

export function endCodingSession(sessionId, { linesAdded = 0, linesRemoved = 0 } = {}) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  const now     = Date.now();
  s.endedAt     = now;
  s.duration    = now - s.startedAt;
  s.linesAdded  = linesAdded;
  s.linesRemoved = linesRemoved;

  // Update project stats
  const p = projects.get(s.projectId);
  if (p) {
    p.linesOfCode   = Math.max(0, (p.linesOfCode || 0) + linesAdded - linesRemoved);
    p.lastActivityAt = new Date(now).toISOString();
    p.updatedAt      = p.lastActivityAt;
  }

  return s;
}

export function getCodingSessionsByUser(userId) {
  return [...sessions.values()].filter(s => s.userId === userId);
}

// ── Achievement & game progress tracking ──────────────────────────────────
const achievements = new Map(); // achievementId → definition
const userAchievements = new Map(); // userId → Set of achieved IDs

export function registerAchievement({ id, name, description, icon = '🏆', points = 10, rarity = 'common' }) {
  achievements.set(id, { id, name, description, icon, points, rarity });
}

export function unlockAchievement(userId, achievementId, metadata = {}) {
  const def = achievements.get(achievementId);
  if (!def) return null;
  if (!userAchievements.has(userId)) userAchievements.set(userId, new Map());
  const ua = userAchievements.get(userId);
  if (ua.has(achievementId)) return { alreadyUnlocked: true, achievement: def };
  ua.set(achievementId, { ...def, unlockedAt: new Date().toISOString(), metadata });
  return { unlocked: true, achievement: def };
}

export function getUserAchievements(userId) {
  return [...(userAchievements.get(userId)?.values() || [])];
}

export function getAchievementProgress(userId) {
  const total    = achievements.size;
  const unlocked = userAchievements.get(userId)?.size || 0;
  const points   = getUserAchievements(userId).reduce((s, a) => s + (a.points || 0), 0);
  return { total, unlocked, points, percent: total ? Math.round((unlocked / total) * 100) : 0 };
}

// Register built-in achievements
[
  { id: 'first_project',      name: 'First Steps',     description: 'Created your first project',       icon: '🌱', points: 10 },
  { id: 'hundred_commits',    name: 'Code Machine',    description: 'Made 100 commits',                 icon: '🔥', points: 50 },
  { id: 'bug_squasher',       name: 'Bug Squasher',    description: 'Fixed 10 bugs',                    icon: '🐛', points: 25 },
  { id: 'ten_projects',       name: 'Prolific Dev',    description: 'Created 10 projects',              icon: '🚀', points: 100 },
  { id: 'full_coverage',      name: 'Test Hero',       description: 'Reached 90% test coverage',        icon: '🛡️', points: 75  },
  { id: 'vr_pioneer',         name: 'VR Pioneer',      description: 'Created a VR/AR project',          icon: '🥽', points: 50 },
  { id: 'game_dev',           name: 'Game Developer',  description: 'Created a game project',           icon: '🎮', points: 30 },
  { id: 'multiplatform',      name: 'Everywhere',      description: 'Shipped to 5+ platforms',          icon: '🌐', points: 100 },
].forEach(registerAchievement);

// ── Project analytics ──────────────────────────────────────────────────────
export function getProjectAnalytics(projectId) {
  const p  = projects.get(projectId);
  if (!p) return null;
  const ts = getTasksByProject(projectId);
  const ms = getMilestonesByProject(projectId);
  const done     = ts.filter(t => t.status === 'done').length;
  const total    = ts.length;
  const velocity = ts.filter(t => t.completedAt && new Date(t.completedAt) > new Date(Date.now() - 7 * 86400e3)).length;

  return {
    project:       p,
    taskSummary:   { total, done, inProgress: ts.filter(t => t.status === 'in_progress').length, blocked: ts.filter(t => t.status === 'blocked').length },
    milestones:    { total: ms.length, completed: ms.filter(m => m.status === 'completed').length },
    velocity,    // tasks completed in last 7 days
    progress:      total ? Math.round((done / total) * 100) : p.progress,
  };
}

export { achievements as _achievements };

export default {
  PROJECT_TYPES,
  GAME_ENGINES,
  TARGET_PLATFORMS,
  createProject,
  getProject,
  updateProject,
  listProjects,
  deleteProject,
  createMilestone,
  getMilestonesByProject,
  updateMilestone,
  createTask,
  getTasksByProject,
  updateTask,
  startCodingSession,
  endCodingSession,
  getCodingSessionsByUser,
  registerAchievement,
  unlockAchievement,
  getUserAchievements,
  getAchievementProgress,
  getProjectAnalytics,
};
