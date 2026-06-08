/**
 * Nexus AI Pro — Project Tracking Service
 * Coding, game dev, AR/VR/3D projects. Connectors for Unreal, Epic Games,
 * Sony PlayStation, Microsoft Xbox, Ubisoft Connect. Achievement & progress tracking.
 * date: 2026-06-08
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ── Enumerations ──────────────────────────────────────────────────────────────

export const ProjectType = Object.freeze({
  CODING: 'coding',
  GAME: 'game',
  AR_VR: 'ar_vr',
  THREE_D: '3d',
  MOBILE: 'mobile',
  WEB: 'web',
});

export const GamePlatform = Object.freeze({
  UNREAL: 'unreal',
  EPIC: 'epic',
  UNITY: 'unity',
  GODOT: 'godot',
  PLAYSTATION: 'playstation',
  XBOX: 'xbox',
  UBISOFT: 'ubisoft',
  STEAM: 'steam',
});

export const ProjectStatus = Object.freeze({
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  TESTING: 'testing',
  GOLD: 'gold',
  SHIPPED: 'shipped',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
});

// ── In-memory store ───────────────────────────────────────────────────────────

const projects = new Map();
const milestones = new Map();
const achievements = new Map();   // userId → Set of achievement IDs
const gamePlatformConns = new Map();  // userId → { platform → credentials }
const gameStats = new Map();          // `${userId}:${platform}` → stats

// ── Achievement definitions ───────────────────────────────────────────────────

const ACHIEVEMENT_CATALOG = [
  { id: 'first_project', name: 'First Project', desc: 'Created your first project', icon: '🚀', xp: 50 },
  { id: 'game_dev', name: 'Game Developer', desc: 'Created a game project', icon: '🎮', xp: 100 },
  { id: 'arvr_pioneer', name: 'AR/VR Pioneer', desc: 'Started an AR/VR project', icon: '🥽', xp: 150 },
  { id: 'first_milestone', name: 'Milestone Setter', desc: 'Completed a milestone', icon: '🎯', xp: 75 },
  { id: 'shipped', name: 'Shipped!', desc: 'Shipped a project', icon: '📦', xp: 500 },
  { id: 'multiplatform', name: 'Multiplatform', desc: 'Connected 3+ game platforms', icon: '🌐', xp: 200 },
  { id: 'code_streak', name: 'Code Streak', desc: '7-day coding streak', icon: '🔥', xp: 300 },
  { id: 'collaborator', name: 'Collaborator', desc: 'Added a team member', icon: '🤝', xp: 100 },
];

// ── Project Tracking Service ──────────────────────────────────────────────────

export class ProjectTrackingService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // ── Projects CRUD ──

  createProject(userId, data) {
    if (!Object.values(ProjectType).includes(data.type)) throw new Error('Invalid project type');
    const id = uuidv4();
    const project = {
      id,
      userId,
      name: data.name?.trim() || 'Untitled Project',
      description: data.description || '',
      type: data.type,
      platform: data.platform || null,
      engine: data.engine || null,
      status: ProjectStatus.PLANNING,
      progress: 0,
      tags: data.tags || [],
      teamMembers: [userId],
      repo: data.repo || null,
      buildTarget: data.buildTarget || [],  // e.g. ['windows', 'ps5', 'xbox']
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archivedAt: null,
    };
    projects.set(id, project);
    this._checkAchievements(userId);
    this.emit('project:created', { userId, project });
    return project;
  }

  getProject(projectId) {
    const p = projects.get(projectId);
    if (!p) throw new Error('Project not found');
    return p;
  }

  listProjects(userId, filters = {}) {
    return Array.from(projects.values())
      .filter(p => p.userId === userId && !p.archivedAt)
      .filter(p => !filters.type || p.type === filters.type)
      .filter(p => !filters.status || p.status === filters.status)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  updateProject(projectId, userId, updates) {
    const p = projects.get(projectId);
    if (!p) throw new Error('Project not found');
    if (p.userId !== userId && !p.teamMembers.includes(userId)) throw new Error('Forbidden');
    const allowed = ['name', 'description', 'status', 'progress', 'tags', 'repo', 'buildTarget', 'engine', 'platform'];
    for (const key of allowed) {
      if (updates[key] !== undefined) p[key] = updates[key];
    }
    p.updatedAt = Date.now();
    if (updates.status === ProjectStatus.SHIPPED) this._awardAchievement(userId, 'shipped');
    this.emit('project:updated', { userId, project: p });
    return p;
  }

  deleteProject(projectId, userId) {
    const p = projects.get(projectId);
    if (!p) throw new Error('Project not found');
    if (p.userId !== userId) throw new Error('Forbidden');
    p.archivedAt = Date.now();
    return { ok: true };
  }

  addTeamMember(projectId, ownerId, memberId) {
    const p = projects.get(projectId);
    if (!p) throw new Error('Project not found');
    if (p.userId !== ownerId) throw new Error('Forbidden');
    if (!p.teamMembers.includes(memberId)) {
      p.teamMembers.push(memberId);
      this._awardAchievement(ownerId, 'collaborator');
    }
    return p;
  }

  // ── Milestones ──

  createMilestone(projectId, userId, data) {
    const p = projects.get(projectId);
    if (!p) throw new Error('Project not found');
    if (p.userId !== userId && !p.teamMembers.includes(userId)) throw new Error('Forbidden');
    const id = uuidv4();
    const milestone = {
      id, projectId, title: data.title || 'Milestone', description: data.description || '',
      dueDate: data.dueDate || null, completedAt: null, createdAt: Date.now(),
    };
    milestones.set(id, milestone);
    return milestone;
  }

  completeMilestone(milestoneId, userId) {
    const m = milestones.get(milestoneId);
    if (!m) throw new Error('Milestone not found');
    m.completedAt = Date.now();
    this._awardAchievement(userId, 'first_milestone');
    this.emit('milestone:completed', { userId, milestone: m });
    return m;
  }

  getMilestones(projectId) {
    return Array.from(milestones.values()).filter(m => m.projectId === projectId);
  }

  // ── Game platform connectors ──

  connectGamePlatform(userId, platform, credentials) {
    if (!Object.values(GamePlatform).includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
    if (!gamePlatformConns.has(userId)) gamePlatformConns.set(userId, new Map());
    gamePlatformConns.get(userId).set(platform, { ...credentials, connectedAt: Date.now() });
    this.emit('platform:connected', { userId, platform });
    const connCount = gamePlatformConns.get(userId).size;
    if (connCount >= 3) this._awardAchievement(userId, 'multiplatform');
    return { ok: true, platform };
  }

  disconnectGamePlatform(userId, platform) {
    gamePlatformConns.get(userId)?.delete(platform);
    gameStats.delete(`${userId}:${platform}`);
    return { ok: true };
  }

  getConnectedPlatforms(userId) {
    const map = gamePlatformConns.get(userId);
    if (!map) return [];
    return Array.from(map.entries()).map(([platform, c]) => ({ platform, connectedAt: c.connectedAt }));
  }

  // ── Game stats & progress ──

  async getGameStats(userId, platform) {
    const conn = gamePlatformConns.get(userId)?.get(platform);
    if (!conn) throw new Error(`${platform} not connected`);
    const cacheKey = `${userId}:${platform}`;
    const cached = gameStats.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) return cached;

    // Deterministic demo data — replace with real OAuth API calls per platform
    const seed = crypto.createHash('sha256').update(cacheKey).digest();
    const r = (min, max) => {
      const v = seed.readUInt32BE(0) / 0xffffffff;
      return Math.floor(v * (max - min + 1)) + min;
    };

    const stats = {
      platform,
      userId,
      gamesPublished: r(0, 20),
      totalDownloads: r(0, 1000000),
      totalRevenue: r(0, 50000),
      avgRating: (r(30, 50) / 10).toFixed(1),
      achievements: r(0, 500),
      friendCount: r(0, 1000),
      recentActivity: Array.from({ length: 5 }, (_, i) => ({
        game: `Game ${i + 1}`,
        action: ['Achievement unlocked', 'Trophy earned', 'Save synced', 'DLC downloaded', 'Review posted'][i % 5],
        ts: Date.now() - r(1, 72) * 3600000,
      })),
      fetchedAt: Date.now(),
    };

    // Platform-specific extras
    if (platform === GamePlatform.PLAYSTATION) {
      stats.trophies = { platinum: r(0, 10), gold: r(0, 50), silver: r(0, 100), bronze: r(0, 300) };
    } else if (platform === GamePlatform.XBOX) {
      stats.gamerscore = r(0, 100000);
      stats.gamesWithAchievements = r(0, 200);
    } else if (platform === GamePlatform.UNREAL || platform === GamePlatform.EPIC) {
      stats.epicGamesPublished = r(0, 5);
      stats.marketplaceRevenue = r(0, 10000);
      stats.unrealEngineVersion = '5.4';
    } else if (platform === GamePlatform.UBISOFT) {
      stats.ubiUnits = r(0, 5000);
      stats.uplayActions = r(0, 200);
    }

    gameStats.set(cacheKey, stats);
    return stats;
  }

  // ── Achievements ──

  getAchievements(userId) {
    const earned = achievements.get(userId) || new Set();
    return ACHIEVEMENT_CATALOG.map(a => ({ ...a, earned: earned.has(a.id), earnedAt: null }));
  }

  _awardAchievement(userId, achievementId) {
    const catalog = ACHIEVEMENT_CATALOG.find(a => a.id === achievementId);
    if (!catalog) return;
    if (!achievements.has(userId)) achievements.set(userId, new Set());
    const set = achievements.get(userId);
    if (!set.has(achievementId)) {
      set.add(achievementId);
      this.emit('achievement:earned', { userId, achievement: catalog });
    }
  }

  _checkAchievements(userId) {
    const userProjects = this.listProjects(userId);
    if (userProjects.length >= 1) this._awardAchievement(userId, 'first_project');
    if (userProjects.some(p => p.type === ProjectType.GAME)) this._awardAchievement(userId, 'game_dev');
    if (userProjects.some(p => p.type === ProjectType.AR_VR)) this._awardAchievement(userId, 'arvr_pioneer');
  }

  getTotalXP(userId) {
    const earned = achievements.get(userId) || new Set();
    return ACHIEVEMENT_CATALOG.filter(a => earned.has(a.id)).reduce((sum, a) => sum + a.xp, 0);
  }

  // ── Dashboard stats ──

  getDashboardStats(userId) {
    const userProjects = this.listProjects(userId);
    const byType = {};
    const byStatus = {};
    for (const p of userProjects) {
      byType[p.type] = (byType[p.type] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }
    return {
      total: userProjects.length,
      byType,
      byStatus,
      connectedPlatforms: this.getConnectedPlatforms(userId).length,
      xp: this.getTotalXP(userId),
      achievements: (achievements.get(userId) || new Set()).size,
      recentProjects: userProjects.slice(0, 5),
    };
  }
}

export const projectTracking = new ProjectTrackingService();
export default projectTracking;
