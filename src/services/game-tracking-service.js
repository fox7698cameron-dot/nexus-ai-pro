// src/services/game-tracking-service.js
// Date: 2026-07-08
// Game development, AR/VR/3D project tracking, achievements, connectors

import { v4 as uuidv4 } from 'uuid';

export const ENGINES = Object.freeze({
  UNREAL: 'unreal',
  UNITY: 'unity',
  GODOT: 'godot',
  CUSTOM: 'custom'
});

export const PROJECT_TYPES = Object.freeze({
  GAME_2D: 'game_2d',
  GAME_3D: 'game_3d',
  AR: 'ar',
  VR: 'vr',
  XR: 'xr',
  METAVERSE: 'metaverse',
  SIMULATION: 'simulation',
  TOOL: 'tool'
});

export const PLATFORMS_GAME = Object.freeze({
  EPIC: 'epic',
  SONY: 'sony',
  MICROSOFT: 'microsoft',
  UBISOFT: 'ubisoft',
  STEAM: 'steam',
  MOBILE: 'mobile'
});

export class GameTrackingService {
  constructor(dataStore) {
    this.store = dataStore;
    this.projects = new Map();
    this.achievements = new Map();
    this.connectors = new Map();
    this.builds = new Map();
    this.playtesters = new Map();
  }

  // ---- Project Management ----
  createProject(userId, projectData) {
    const projectId = uuidv4();
    const project = {
      id: projectId,
      userId,
      name: projectData.name,
      type: projectData.type || PROJECT_TYPES.GAME_3D,
      engine: projectData.engine || ENGINES.UNREAL,
      description: projectData.description || '',
      genre: projectData.genre || 'Action',
      platforms: projectData.platforms || [],
      status: 'planning', // planning, in_dev, alpha, beta, release, live
      version: '0.1.0',
      targetPlatforms: projectData.targetPlatforms || [],
      team: projectData.team || [],
      milestones: [],
      builds: [],
      achievements: [],
      metrics: {
        linesOfCode: 0,
        assets: 0,
        commits: 0,
        bugs: 0,
        bugsFixed: 0,
        testCoverage: 0,
        buildSuccessRate: 100,
        polyCount: 0,
        textureMemoryMB: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.projects.set(projectId, project);
    this.store.auditLog('PROJECT_CREATED', { userId, projectId, name: project.name });
    return project;
  }

  getProject(projectId) {
    return this.projects.get(projectId) || null;
  }

  getUserProjects(userId) {
    return Array.from(this.projects.values()).filter(p => p.userId === userId);
  }

  updateProject(projectId, updates) {
    const project = this.projects.get(projectId);
    if (!project) return null;
    const updated = { ...project, ...updates, updatedAt: Date.now() };
    this.projects.set(projectId, updated);
    return updated;
  }

  // ---- Milestone Tracking ----
  addMilestone(projectId, milestoneData) {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const milestone = {
      id: uuidv4(),
      name: milestoneData.name,
      description: milestoneData.description || '',
      targetDate: milestoneData.targetDate,
      status: 'pending',
      tasks: milestoneData.tasks || [],
      completedAt: null
    };

    project.milestones.push(milestone);
    project.updatedAt = Date.now();
    this.projects.set(projectId, project);
    return milestone;
  }

  completeMilestone(projectId, milestoneId) {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (!milestone) return null;

    milestone.status = 'completed';
    milestone.completedAt = Date.now();
    project.updatedAt = Date.now();
    this.projects.set(projectId, project);
    return milestone;
  }

  // ---- Build Tracking ----
  recordBuild(projectId, buildData) {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const build = {
      id: uuidv4(),
      version: buildData.version || project.version,
      platform: buildData.platform,
      success: buildData.success !== false,
      duration: buildData.duration || 0,
      size: buildData.size || 0,
      errors: buildData.errors || [],
      warnings: buildData.warnings || [],
      timestamp: Date.now()
    };

    this.builds.set(build.id, build);
    project.builds.push(build.id);

    // Update metrics
    const totalBuilds = project.builds.length;
    const successBuilds = Array.from(this.builds.values()).filter(b => project.builds.includes(b.id) && b.success).length;
    project.metrics.buildSuccessRate = Math.round((successBuilds / totalBuilds) * 100);
    project.metrics.commits = (project.metrics.commits || 0) + 1;
    project.version = buildData.version || project.version;
    project.updatedAt = Date.now();
    this.projects.set(projectId, project);

    return build;
  }

  // ---- Achievement System ----
  defineAchievement(projectId, achievementData) {
    const achievement = {
      id: uuidv4(),
      projectId,
      name: achievementData.name,
      description: achievementData.description,
      icon: achievementData.icon || '🏆',
      rarity: achievementData.rarity || 'common', // common, uncommon, rare, epic, legendary
      points: achievementData.points || 10,
      hidden: achievementData.hidden || false,
      conditions: achievementData.conditions || {},
      unlockedBy: [] // player IDs who unlocked it
    };

    this.achievements.set(achievement.id, achievement);
    const project = this.projects.get(projectId);
    if (project) {
      project.achievements.push(achievement.id);
      this.projects.set(projectId, project);
    }
    return achievement;
  }

  unlockAchievement(achievementId, playerId) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return null;

    if (!achievement.unlockedBy.includes(playerId)) {
      achievement.unlockedBy.push(playerId);
      achievement.unlockedAt = Date.now();
      this.achievements.set(achievementId, achievement);
    }
    return achievement;
  }

  getProjectAchievements(projectId) {
    return Array.from(this.achievements.values()).filter(a => a.projectId === projectId);
  }

  getPlayerProgress(projectId, playerId) {
    const achievements = this.getProjectAchievements(projectId);
    const unlocked = achievements.filter(a => a.unlockedBy.includes(playerId));
    const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = unlocked.reduce((sum, a) => sum + a.points, 0);
    const completionPct = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

    return {
      playerId,
      projectId,
      unlocked: unlocked.length,
      total: achievements.length,
      completionPercentage: completionPct,
      earnedPoints,
      totalPoints,
      achievements: unlocked
    };
  }

  // ---- Platform Connectors ----
  connectPlatform(userId, projectId, platform, credentials) {
    if (!Object.values(PLATFORMS_GAME).includes(platform)) {
      return { success: false, error: `Unknown platform: ${platform}` };
    }

    const connectorId = uuidv4();
    const connector = {
      id: connectorId,
      userId,
      projectId,
      platform,
      appId: credentials.appId,
      connectedAt: Date.now(),
      lastSync: null,
      status: 'connected'
    };

    const key = `${userId}:${projectId}:${platform}`;
    this.connectors.set(key, connector);
    this.store.auditLog('PLATFORM_CONNECTED', { userId, projectId, platform });
    return { success: true, connectorId, platform };
  }

  getConnectors(userId, projectId) {
    const result = [];
    for (const [key, connector] of this.connectors) {
      if (connector.userId === userId && connector.projectId === projectId) {
        result.push(connector);
      }
    }
    return result;
  }

  // ---- Game Sales & Stats (mocked - real: use platform APIs) ----
  getGameStats(projectId, platform) {
    const bases = {
      epic: { downloads: 45000, revenue: 89500, reviews: 1240, rating: 4.3 },
      sony: { downloads: 32000, revenue: 128000, reviews: 890, rating: 4.1 },
      microsoft: { downloads: 28000, revenue: 98000, reviews: 760, rating: 4.4 },
      ubisoft: { downloads: 15000, revenue: 62000, reviews: 520, rating: 3.9 },
      steam: { downloads: 85000, revenue: 215000, reviews: 3200, rating: 4.6 },
      mobile: { downloads: 250000, revenue: 45000, reviews: 8900, rating: 4.2 }
    };

    const base = bases[platform] || { downloads: 1000, revenue: 5000, reviews: 50, rating: 4.0 };
    const noise = 0.9 + Math.random() * 0.2;
    return {
      platform,
      projectId,
      downloads: Math.round(base.downloads * noise),
      revenue: Math.round(base.revenue * noise),
      reviews: Math.round(base.reviews * noise),
      rating: parseFloat((base.rating * noise).toFixed(1)),
      activePlayers: Math.round(base.downloads * 0.12 * noise),
      dailyActiveUsers: Math.round(base.downloads * 0.04 * noise),
      sessionLength: Math.round(25 + Math.random() * 30),
      retentionD1: parseFloat((35 + Math.random() * 25).toFixed(1)),
      retentionD7: parseFloat((15 + Math.random() * 20).toFixed(1)),
      retentionD30: parseFloat((5 + Math.random() * 15).toFixed(1)),
      lastUpdated: Date.now()
    };
  }

  // ---- AR/VR Project Tracking ----
  getARVRMetrics(projectId) {
    const project = this.projects.get(projectId);
    if (!project) return null;

    return {
      projectId,
      type: project.type,
      polyCount: project.metrics.polyCount || Math.round(150000 + Math.random() * 350000),
      drawCalls: Math.round(80 + Math.random() * 120),
      frameRate: parseFloat((72 + Math.random() * 18).toFixed(1)),
      memoryUsageMB: Math.round(800 + Math.random() * 1200),
      textureMemoryMB: project.metrics.textureMemoryMB || Math.round(200 + Math.random() * 600),
      loadTimeMs: Math.round(1200 + Math.random() * 2800),
      spatialAnchorCount: Math.round(Math.random() * 50),
      trackingAccuracyCm: parseFloat((0.5 + Math.random() * 2).toFixed(2)),
      latencyMs: Math.round(8 + Math.random() * 12),
      fieldOfView: project.type === PROJECT_TYPES.VR ? 110 : 52,
      supportedDevices: project.type === PROJECT_TYPES.VR
        ? ['Meta Quest 3', 'PS VR2', 'Apple Vision Pro', 'Valve Index']
        : ['iOS ARKit', 'Android ARCore', 'HoloLens 2']
    };
  }

  // Real-time project dashboard
  getDashboard(userId) {
    const projects = this.getUserProjects(userId);
    return {
      totalProjects: projects.length,
      byStatus: projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      byType: projects.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {}),
      recentActivity: projects
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, status: p.status, updatedAt: p.updatedAt })),
      totalAchievements: Array.from(this.achievements.values()).filter(a => projects.some(p => p.id === a.projectId)).length
    };
  }
}
