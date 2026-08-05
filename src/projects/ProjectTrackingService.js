// src/projects/ProjectTrackingService.js
// Nexus AI Pro — Real-Time Project Tracking Service
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Tracks: software projects, game dev (Unreal, Epic, Unity, Godot),
//         AR/VR/3D projects, achievements, game progress.
// Connectors: Unreal/Epic Games, Sony PlayStation, Microsoft Xbox,
//             Ubisoft Connect, Steam, GitHub, Bitbucket.
// NO hardcoded secrets — all keys read from process.env.

import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// ENUMERATIONS
// ---------------------------------------------------------------------------
export const ProjectType = Object.freeze({
  SOFTWARE:    'SOFTWARE',
  GAME:        'GAME',
  AR:          'AR',
  VR:          'VR',
  XR:          'XR',          // Mixed Reality
  THREED:      '3D',
  MOBILE:      'MOBILE',
  WEB:         'WEB',
});

export const ProjectStatus = Object.freeze({
  PLANNING:    'PLANNING',
  ACTIVE:      'ACTIVE',
  ON_HOLD:     'ON_HOLD',
  REVIEW:      'REVIEW',
  SHIPPED:     'SHIPPED',
  ARCHIVED:    'ARCHIVED',
});

export const GamePlatform = Object.freeze({
  UNREAL:      'UNREAL',
  EPIC:        'EPIC',
  UNITY:       'UNITY',
  GODOT:       'GODOT',
  SONY:        'SONY',
  XBOX:        'XBOX',
  UBISOFT:     'UBISOFT',
  STEAM:       'STEAM',
  APPLE:       'APPLE',
  GOOGLE_PLAY: 'GOOGLE_PLAY',
});

// ---------------------------------------------------------------------------
// PROJECT TRACKING SERVICE
// ---------------------------------------------------------------------------
export class ProjectTrackingService {
  constructor(redisClient = null) {
    this.redis    = redisClient;
    this._projects    = new Map();
    this._milestones  = new Map();
    this._achievements= new Map();
    this._snapshots   = new Map();  // Real-time metric snapshots
    this._connectors  = this._buildConnectors();
  }

  // -------------------------------------------------------------------------
  // PROJECT CRUD
  // -------------------------------------------------------------------------

  async createProject({
    ownerId, name, type = ProjectType.SOFTWARE, description = '',
    platforms = [], engine = null, techStack = [], tags = [],
    targetRelease = null,
  }) {
    if (!name?.trim()) throw new Error('Project name is required.');
    if (!Object.values(ProjectType).includes(type)) throw new Error(`Invalid project type: ${type}`);

    const id = uuidv4();
    const project = {
      id,
      ownerId,
      name:          name.trim(),
      type,
      description,
      platforms,
      engine,
      techStack,
      tags,
      status:        ProjectStatus.PLANNING,
      targetRelease,
      metrics: {
        linesOfCode:    0,
        commits:        0,
        openIssues:     0,
        closedIssues:   0,
        pullRequests:   0,
        testCoverage:   0,
        buildStatus:    'unknown',
        deployments:    0,
      },
      gameMetrics: type === ProjectType.GAME ? {
        players:        0,
        dau:            0,
        mau:            0,
        retentionD1:    0,
        retentionD7:    0,
        retentionD30:   0,
        avgSessionMin:  0,
        revenue:        0,
        achievements:   [],
      } : null,
      arvrMetrics: [ProjectType.AR, ProjectType.VR, ProjectType.XR].includes(type) ? {
        activeUsers:    0,
        avgFps:         0,
        latencyMs:      0,
        sessionCount:   0,
        deviceTypes:    {},
      } : null,
      milestones:    [],
      collaborators: [ownerId],
      externalLinks: {},
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    };

    await this._store(`project:${id}`, project);
    return project;
  }

  async getProject(projectId) {
    const p = await this._load(`project:${projectId}`);
    if (!p) throw new Error(`Project ${projectId} not found.`);
    return p;
  }

  async updateProject(projectId, updates) {
    const project = await this.getProject(projectId);
    const allowed = ['name', 'description', 'status', 'platforms', 'engine',
                     'techStack', 'tags', 'targetRelease', 'metrics', 'gameMetrics',
                     'arvrMetrics', 'externalLinks'];

    for (const key of allowed) {
      if (key in updates) {
        if (typeof project[key] === 'object' && !Array.isArray(project[key]) && project[key] !== null) {
          project[key] = { ...project[key], ...updates[key] };
        } else {
          project[key] = updates[key];
        }
      }
    }
    project.updatedAt = new Date().toISOString();
    await this._store(`project:${projectId}`, project);
    return project;
  }

  async listProjectsForUser(ownerId) {
    // Scan stored projects (in production use indexed DB query)
    const results = [];
    for (const [key, val] of this._projects.entries()) {
      if (val.ownerId === ownerId || (val.collaborators ?? []).includes(ownerId)) {
        results.push(val);
      }
    }
    return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  // -------------------------------------------------------------------------
  // MILESTONES
  // -------------------------------------------------------------------------

  async addMilestone(projectId, { title, description = '', dueDate = null, tasks = [] }) {
    const project   = await this.getProject(projectId);
    const milestone = {
      id:          uuidv4(),
      projectId,
      title,
      description,
      dueDate,
      tasks:       tasks.map(t => ({ id: uuidv4(), ...t, done: false })),
      status:      'PENDING',
      completedAt: null,
      createdAt:   new Date().toISOString(),
    };
    project.milestones.push(milestone.id);
    project.updatedAt = new Date().toISOString();
    await this._store(`milestone:${milestone.id}`, milestone);
    await this._store(`project:${projectId}`, project);
    return milestone;
  }

  async updateMilestone(milestoneId, updates) {
    const ms = await this._load(`milestone:${milestoneId}`);
    if (!ms) throw new Error(`Milestone ${milestoneId} not found.`);
    Object.assign(ms, updates);
    if (ms.tasks?.every(t => t.done) && ms.status !== 'COMPLETED') {
      ms.status      = 'COMPLETED';
      ms.completedAt = new Date().toISOString();
    }
    await this._store(`milestone:${milestoneId}`, ms);
    return ms;
  }

  // -------------------------------------------------------------------------
  // ACHIEVEMENTS & GAME PROGRESS
  // -------------------------------------------------------------------------

  async registerAchievement(projectId, {
    name, description, icon = '🏆', points = 10,
    platform = GamePlatform.STEAM, rarity = 'COMMON',
  }) {
    const project = await this.getProject(projectId);
    const achievement = {
      id:          uuidv4(),
      projectId,
      name,
      description,
      icon,
      points,
      platform,
      rarity,       // COMMON | UNCOMMON | RARE | EPIC | LEGENDARY
      unlockedBy:   [],
      createdAt:    new Date().toISOString(),
    };
    await this._store(`achievement:${achievement.id}`, achievement);
    if (project.gameMetrics) {
      project.gameMetrics.achievements.push(achievement.id);
      await this._store(`project:${projectId}`, project);
    }
    return achievement;
  }

  async unlockAchievement(achievementId, userId) {
    const ach = await this._load(`achievement:${achievementId}`);
    if (!ach) throw new Error(`Achievement ${achievementId} not found.`);
    if (!ach.unlockedBy.includes(userId)) {
      ach.unlockedBy.push(userId);
      await this._store(`achievement:${achievementId}`, ach);
    }
    return { unlocked: true, achievement: ach };
  }

  async getUserAchievements(userId) {
    // Scan all achievements for those unlocked by this user
    const result = [];
    for (const [, ach] of this._achievements.entries()) {
      if ((ach.unlockedBy ?? []).includes(userId)) result.push(ach);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // REAL-TIME METRIC SNAPSHOTS
  // -------------------------------------------------------------------------

  async recordMetricSnapshot(projectId, metrics) {
    const snap = {
      id:        uuidv4(),
      projectId,
      metrics,
      recordedAt: new Date().toISOString(),
    };
    // Store last 100 snapshots per project
    const key  = `snapshots:${projectId}`;
    let snaps  = (await this._loadRaw(key)) ?? [];
    snaps.push(snap);
    if (snaps.length > 100) snaps = snaps.slice(-100);
    await this._storeRaw(key, snaps);
    return snap;
  }

  async getMetricHistory(projectId, limit = 50) {
    const snaps = (await this._loadRaw(`snapshots:${projectId}`)) ?? [];
    return snaps.slice(-limit);
  }

  // -------------------------------------------------------------------------
  // PLATFORM CONNECTORS
  // -------------------------------------------------------------------------

  async syncFromConnector(projectId, connectorType, connectorConfig) {
    const connector = this._connectors[connectorType];
    if (!connector) throw new Error(`Unknown connector: ${connectorType}`);
    const data = await connector.fetchMetrics(connectorConfig);
    await this.updateProject(projectId, { metrics: data.metrics ?? {}, updatedAt: new Date().toISOString() });
    await this.recordMetricSnapshot(projectId, data.metrics ?? {});
    return data;
  }

  _buildConnectors() {
    return {
      // GitHub connector
      [GamePlatform.UNITY]: {
        fetchMetrics: async ({ owner, repo }) => {
          const token = process.env.GITHUB_TOKEN;
          const headers = { Accept: 'application/vnd.github.v3+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
          const [repoData, issues] = await Promise.all([
            fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }).then(r => r.json()),
            fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=1`, { headers }),
          ]);
          return {
            metrics: {
              commits:      repoData.pushed_at ? 1 : 0,
              openIssues:   repoData.open_issues_count ?? 0,
              stars:        repoData.stargazers_count  ?? 0,
              forks:        repoData.forks_count       ?? 0,
              defaultBranch: repoData.default_branch  ?? 'main',
            },
            source: 'github',
          };
        },
      },

      // Unreal Engine / Epic Games (Fab marketplace & analytics)
      [GamePlatform.UNREAL]: {
        fetchMetrics: async ({ projectId: epicProjectId }) => {
          const token = process.env.EPIC_ACCESS_TOKEN;
          if (!token) throw new Error('EPIC_ACCESS_TOKEN not set.');
          const data = await fetch(
            `https://api.epicgames.com/analytics/v1/projects/${epicProjectId}/summary`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then(r => r.json());
          return { metrics: data?.summary ?? {}, source: 'epic' };
        },
      },

      // Sony PlayStation (Partner API)
      [GamePlatform.SONY]: {
        fetchMetrics: async ({ titleId }) => {
          const token = process.env.SONY_PSN_ACCESS_TOKEN;
          if (!token) throw new Error('SONY_PSN_ACCESS_TOKEN not set.');
          const data = await fetch(
            `https://m.np.playstation.com/api/trophy/v1/npCommunicationIds/${titleId}/trophyGroups`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then(r => r.json());
          return { metrics: data ?? {}, source: 'sony' };
        },
      },

      // Microsoft Xbox (Partner Center API)
      [GamePlatform.XBOX]: {
        fetchMetrics: async ({ productId }) => {
          const token = process.env.MICROSOFT_PARTNER_TOKEN;
          if (!token) throw new Error('MICROSOFT_PARTNER_TOKEN not set.');
          const data = await fetch(
            `https://manage.devcenter.microsoft.com/v1.0/my/analytics/gamestatistics?applicationId=${productId}`,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
          ).then(r => r.json());
          return { metrics: data?.Value?.[0] ?? {}, source: 'xbox' };
        },
      },

      // Ubisoft Connect (Developer API)
      [GamePlatform.UBISOFT]: {
        fetchMetrics: async ({ appId }) => {
          const token = process.env.UBISOFT_APP_TOKEN;
          if (!token) throw new Error('UBISOFT_APP_TOKEN not set.');
          const data = await fetch(
            `https://public-ubiservices.ubi.com/v1/applications/${appId}/achievements`,
            {
              headers: {
                Authorization: `Ubi_v1 t=${token}`,
                'Ubi-AppId': appId,
              },
            }
          ).then(r => r.json());
          return { metrics: { achievements: data?.achievements?.length ?? 0 }, source: 'ubisoft' };
        },
      },

      // Steam (Steamworks API)
      [GamePlatform.STEAM]: {
        fetchMetrics: async ({ appId }) => {
          const key = process.env.STEAM_WEB_API_KEY;
          if (!key) throw new Error('STEAM_WEB_API_KEY not set.');
          const data = await fetch(
            `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}&key=${key}`
          ).then(r => r.json());
          return {
            metrics: { currentPlayers: data?.response?.player_count ?? 0 },
            source: 'steam',
          };
        },
      },
    };
  }

  // -------------------------------------------------------------------------
  // STORAGE HELPERS
  // -------------------------------------------------------------------------
  async _store(key, value) {
    const json = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, json);
    } else {
      // Use appropriate in-memory store based on key prefix
      if (key.startsWith('project:'))     this._projects.set(key, value);
      else if (key.startsWith('milestone:')) this._milestones.set(key, value);
      else if (key.startsWith('achievement:')) this._achievements.set(key, value);
    }
  }

  async _load(key) {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    if (key.startsWith('project:'))     return this._projects.get(key)     ?? null;
    if (key.startsWith('milestone:'))   return this._milestones.get(key)   ?? null;
    if (key.startsWith('achievement:')) return this._achievements.get(key)  ?? null;
    return null;
  }

  async _storeRaw(key, value) {
    if (this.redis) await this.redis.set(key, JSON.stringify(value));
    else this._snapshots.set(key, value);
  }

  async _loadRaw(key) {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    return this._snapshots.get(key) ?? null;
  }
}
