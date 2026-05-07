// gameTrackingService.js — 2026-05-07

import { randomUUID } from 'crypto';

// ─── Enum-style constants ────────────────────────────────────────────────────

export const PLATFORM_IDS = Object.freeze({
  UNREAL:      'unreal',
  EPIC_GAMES:  'epic_games',
  PLAYSTATION: 'playstation',
  XBOX:        'xbox',
  UBISOFT:     'ubisoft',
});

export const PROJECT_TYPES = Object.freeze({
  GAME:    'game',
  APP:     'app',
  AR_VR:   'ar-vr',
  THREE_D: '3d',
  CODING:  'coding',
});

export const STATUS_CODES = Object.freeze({
  ACTIVE:    'active',
  PAUSED:    'paused',
  COMPLETED: 'completed',
  ARCHIVED:  'archived',
  CANCELLED: 'cancelled',
});

export const ACHIEVEMENT_RARITY = Object.freeze({
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  EPIC:      'epic',
  LEGENDARY: 'legendary',
});

// ─── Achievement catalog ─────────────────────────────────────────────────────

export const ACHIEVEMENT_CATALOG = Object.freeze({
  first_project:        { id: 'first_project',        name: 'First Steps',          description: 'Created your first project',                     xp: 100,  rarity: ACHIEVEMENT_RARITY.COMMON    },
  first_game:           { id: 'first_game',            name: 'Game On',              description: 'Created your first game project',                xp: 150,  rarity: ACHIEVEMENT_RARITY.COMMON    },
  ar_pioneer:           { id: 'ar_pioneer',            name: 'AR Pioneer',           description: 'Launched an AR/VR project',                      xp: 300,  rarity: ACHIEVEMENT_RARITY.RARE      },
  vr_master:            { id: 'vr_master',             name: 'VR Master',            description: 'Completed a VR project to 100%',                 xp: 500,  rarity: ACHIEVEMENT_RARITY.EPIC      },
  '3d_artist':          { id: '3d_artist',             name: '3D Artist',            description: 'Shipped a 3D project',                           xp: 250,  rarity: ACHIEVEMENT_RARITY.UNCOMMON  },
  code_warrior:         { id: 'code_warrior',          name: 'Code Warrior',         description: 'Logged 100+ coding hours',                       xp: 400,  rarity: ACHIEVEMENT_RARITY.RARE      },
  milestone_25:         { id: 'milestone_25',          name: '25% There',            description: 'Reached 25% progress on a project',              xp: 50,   rarity: ACHIEVEMENT_RARITY.COMMON    },
  milestone_50:         { id: 'milestone_50',          name: 'Halfway There',        description: 'Reached 50% progress on a project',              xp: 100,  rarity: ACHIEVEMENT_RARITY.COMMON    },
  milestone_100:        { id: 'milestone_100',         name: 'Completionist',        description: 'Reached 100% progress on a project',             xp: 500,  rarity: ACHIEVEMENT_RARITY.EPIC      },
  shipped_game:         { id: 'shipped_game',          name: 'Ship It!',             description: 'Shipped a game to a live platform',              xp: 1000, rarity: ACHIEVEMENT_RARITY.LEGENDARY },
  daily_streak_7:       { id: 'daily_streak_7',        name: 'Week Warrior',         description: 'Maintained a 7-day development streak',          xp: 200,  rarity: ACHIEVEMENT_RARITY.UNCOMMON  },
  daily_streak_30:      { id: 'daily_streak_30',       name: 'Month of Madness',     description: 'Maintained a 30-day development streak',         xp: 750,  rarity: ACHIEVEMENT_RARITY.EPIC      },
  collaboration_master: { id: 'collaboration_master',  name: 'Team Player',          description: 'Collaborated on 5+ shared projects',             xp: 350,  rarity: ACHIEVEMENT_RARITY.RARE      },
  bug_hunter:           { id: 'bug_hunter',            name: 'Bug Hunter',           description: 'Resolved 50 tasks flagged as bugs',              xp: 300,  rarity: ACHIEVEMENT_RARITY.RARE      },
  performance_ace:      { id: 'performance_ace',       name: 'Performance Ace',      description: 'Optimized a project below target render time',   xp: 400,  rarity: ACHIEVEMENT_RARITY.RARE      },
  security_badge:       { id: 'security_badge',        name: 'Security Badge',       description: 'Passed all security checks on a release',        xp: 300,  rarity: ACHIEVEMENT_RARITY.UNCOMMON  },
  multi_platform:       { id: 'multi_platform',        name: 'Platform Hopper',      description: 'Synced achievements on 3+ platforms',            xp: 450,  rarity: ACHIEVEMENT_RARITY.RARE      },
  global_launch:        { id: 'global_launch',         name: 'Global Launch',        description: 'Published a project with worldwide availability', xp: 800,  rarity: ACHIEVEMENT_RARITY.EPIC      },
  level_10:             { id: 'level_10',              name: 'Veteran Developer',    description: 'Reached level 10',                               xp: 1000, rarity: ACHIEVEMENT_RARITY.LEGENDARY },
  hall_of_fame:         { id: 'hall_of_fame',          name: 'Hall of Fame',         description: 'Featured on the platform leaderboard Top 10',   xp: 2000, rarity: ACHIEVEMENT_RARITY.LEGENDARY },
});

// ─── In-memory stores (replace with DB layer in production) ──────────────────

const _projects  = new Map(); // projectId → project object
const _users     = new Map(); // userId    → user profile
const _sessions  = new Map(); // sessionId → session object

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _getOrCreateUser(userId) {
  if (!_users.has(userId)) {
    _users.set(userId, { userId, achievements: [], xp: 0, level: 1, connectedPlatforms: {} });
  }
  return _users.get(userId);
}

function _xpToLevel(xp) {
  return Math.floor(1 + Math.sqrt(xp / 100));
}

function _validateProjectType(type) {
  const valid = Object.values(PROJECT_TYPES);
  if (!valid.includes(type)) {
    throw new Error(`Invalid project type "${type}". Must be one of: ${valid.join(', ')}`);
  }
}

function _validateStatus(status) {
  const valid = Object.values(STATUS_CODES);
  if (!valid.includes(status)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${valid.join(', ')}`);
  }
}

// ─── GameTrackingService ──────────────────────────────────────────────────────

export class GameTrackingService {

  // ── Project Tracking ────────────────────────────────────────────────────────

  createProject(data = {}) {
    const { name, type = PROJECT_TYPES.GAME, userId, platforms = [], description = '' } = data;
    if (!name)   throw new Error('Project name is required');
    if (!userId) throw new Error('userId is required');
    _validateProjectType(type);

    const projectId = randomUUID();
    const now = new Date().toISOString();
    const project = {
      projectId,
      userId,
      name,
      type,
      description,
      platforms,
      status: STATUS_CODES.ACTIVE,
      progress: 0,
      milestone: null,
      tasks: [],
      sessions: [],
      stats: { total_hours: 0, commits: 0, tasks_done: 0, tasks_pending: 0 },
      createdAt: now,
      updatedAt: now,
    };

    _projects.set(projectId, project);

    // First-project achievements
    const userProfile = _getOrCreateUser(userId);
    const userProjects = [..._projects.values()].filter(p => p.userId === userId);
    if (userProjects.length === 1) this.awardAchievement(userId, 'first_project', { projectId });
    if (type === PROJECT_TYPES.GAME && !userProfile.achievements.some(a => a.id === 'first_game')) {
      this.awardAchievement(userId, 'first_game', { projectId });
    }
    if (type === PROJECT_TYPES.AR_VR && !userProfile.achievements.some(a => a.id === 'ar_pioneer')) {
      this.awardAchievement(userId, 'ar_pioneer', { projectId });
    }

    return { ...project };
  }

  updateProject(projectId, updates = {}) {
    const project = this._requireProject(projectId);
    const allowed = ['name', 'description', 'platforms', 'status', 'type'];
    if (updates.status) _validateStatus(updates.status);
    if (updates.type)   _validateProjectType(updates.type);

    allowed.forEach(key => {
      if (updates[key] !== undefined) project[key] = updates[key];
    });
    project.updatedAt = new Date().toISOString();
    return { ...project };
  }

  getProject(projectId) {
    return { ...this._requireProject(projectId) };
  }

  listProjects(userId, filters = {}) {
    const { type, status, sortBy = 'updatedAt', order = 'desc' } = filters;
    let results = [..._projects.values()].filter(p => p.userId === userId);

    if (type)   results = results.filter(p => p.type === type);
    if (status) results = results.filter(p => p.status === status);

    results.sort((a, b) => {
      const av = a[sortBy] ?? '';
      const bv = b[sortBy] ?? '';
      return order === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return results.map(p => ({ ...p }));
  }

  updateProjectProgress(projectId, percent, milestone = null) {
    const project = this._requireProject(projectId);
    const prev = project.progress;
    project.progress = Math.max(0, Math.min(100, Math.round(percent)));
    if (milestone) project.milestone = milestone;
    project.updatedAt = new Date().toISOString();

    const milestoneResult = this.checkMilestones(projectId, prev);
    return { ...project, milestoneResult };
  }

  addTask(projectId, taskData = {}) {
    const project = this._requireProject(projectId);
    const task = {
      taskId:      randomUUID(),
      title:       taskData.title  ?? 'Untitled task',
      description: taskData.description ?? '',
      type:        taskData.type   ?? 'feature',
      status:      STATUS_CODES.ACTIVE,
      createdAt:   new Date().toISOString(),
      completedAt: null,
    };
    project.tasks.push(task);
    project.stats.tasks_pending += 1;
    project.updatedAt = new Date().toISOString();
    return { ...task };
  }

  completeTask(projectId, taskId) {
    const project = this._requireProject(projectId);
    const task = project.tasks.find(t => t.taskId === taskId);
    if (!task) throw new Error(`Task ${taskId} not found in project ${projectId}`);
    if (task.status === STATUS_CODES.COMPLETED) return { ...task };

    task.status      = STATUS_CODES.COMPLETED;
    task.completedAt = new Date().toISOString();
    project.stats.tasks_done    += 1;
    project.stats.tasks_pending  = Math.max(0, project.stats.tasks_pending - 1);
    project.updatedAt = new Date().toISOString();

    // Bug hunter check
    const bugsDone = project.tasks.filter(t => t.type === 'bug' && t.status === STATUS_CODES.COMPLETED).length;
    if (bugsDone >= 50) {
      const user = _getOrCreateUser(project.userId);
      if (!user.achievements.some(a => a.id === 'bug_hunter')) {
        this.awardAchievement(project.userId, 'bug_hunter', { projectId });
      }
    }

    return { ...task };
  }

  // ── Achievement System ──────────────────────────────────────────────────────

  awardAchievement(userId, achievementId, metadata = {}) {
    const catalog = ACHIEVEMENT_CATALOG[achievementId];
    if (!catalog) throw new Error(`Unknown achievement: ${achievementId}`);

    const user = _getOrCreateUser(userId);
    if (user.achievements.some(a => a.id === achievementId)) {
      return { alreadyAwarded: true, achievementId };
    }

    const record = {
      ...catalog,
      awardedAt: new Date().toISOString(),
      metadata,
    };
    user.achievements.push(record);
    user.xp    += catalog.xp;
    user.level  = _xpToLevel(user.xp);

    if (user.level >= 10 && !user.achievements.some(a => a.id === 'level_10')) {
      this.awardAchievement(userId, 'level_10', { triggeredBy: achievementId });
    }

    return { awarded: true, achievement: { ...record }, xp: user.xp, level: user.level };
  }

  getAchievements(userId) {
    const user = _getOrCreateUser(userId);
    const unlocked = user.achievements.map(a => ({ ...a }));
    const lockedIds = Object.keys(ACHIEVEMENT_CATALOG).filter(
      id => !user.achievements.some(a => a.id === id)
    );
    const locked = lockedIds.map(id => ({ ...ACHIEVEMENT_CATALOG[id], locked: true }));
    return { unlocked, locked, xp: user.xp, level: user.level };
  }

  checkMilestones(projectId, previousProgress = null) {
    const project = this._requireProject(projectId);
    const user    = _getOrCreateUser(project.userId);
    const progress = project.progress;
    const prev     = previousProgress ?? 0;
    const awarded  = [];

    const THRESHOLDS = [
      { pct: 25,  id: 'milestone_25'  },
      { pct: 50,  id: 'milestone_50'  },
      { pct: 100, id: 'milestone_100' },
    ];

    THRESHOLDS.forEach(({ pct, id }) => {
      const crossed = prev < pct && progress >= pct;
      if (!crossed) return;
      if (user.achievements.some(a => a.id === id)) return;
      const result = this.awardAchievement(project.userId, id, { projectId, progress });
      if (result.awarded) awarded.push(result.achievement);
    });

    if (progress === 100 && project.type === PROJECT_TYPES.GAME) {
      if (!user.achievements.some(a => a.id === 'vr_master') && project.type === PROJECT_TYPES.AR_VR) {
        const r = this.awardAchievement(project.userId, 'vr_master', { projectId });
        if (r.awarded) awarded.push(r.achievement);
      }
      if (!user.achievements.some(a => a.id === '3d_artist') && project.type === PROJECT_TYPES.THREE_D) {
        const r = this.awardAchievement(project.userId, '3d_artist', { projectId });
        if (r.awarded) awarded.push(r.achievement);
      }
    }

    return { milestones: awarded };
  }

  // ── Platform Connectors ─────────────────────────────────────────────────────

  connectUnreal(projectId, projectPath) {
    this._requireProject(projectId);
    return {
      connected:   true,
      engine:      'Unreal Engine 5',
      projectPath,
      projectId,
      connectedAt: new Date().toISOString(),
    };
  }

  async connectEpicGames(userId, accessToken) {
    const expected = process.env.EPIC_GAMES_CLIENT_ID;
    if (!expected) throw new Error('EPIC_GAMES_CLIENT_ID env var not set');
    if (!accessToken) throw new Error('accessToken is required');

    const user = _getOrCreateUser(userId);
    user.connectedPlatforms[PLATFORM_IDS.EPIC_GAMES] = {
      connectedAt: new Date().toISOString(),
      token: '[redacted]',
    };

    return {
      connected:   true,
      platform:    PLATFORM_IDS.EPIC_GAMES,
      userId,
      gameLibrary: [],  // populated via Epic Games API in production
      connectedAt: new Date().toISOString(),
    };
  }

  connectSonyPlayStation(userId) {
    const clientId = process.env.SONY_CLIENT_ID;
    if (!clientId) throw new Error('SONY_CLIENT_ID env var not set');

    const authUrl = `https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize`
      + `?client_id=${clientId}&response_type=code&scope=psn:s2s`;

    const user = _getOrCreateUser(userId);
    user.connectedPlatforms[PLATFORM_IDS.PLAYSTATION] = {
      status: 'oauth_pending',
      authUrl,
      initiatedAt: new Date().toISOString(),
    };

    return { platform: PLATFORM_IDS.PLAYSTATION, oauthUrl: authUrl, status: 'oauth_pending' };
  }

  connectMicrosoftXbox(userId) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) throw new Error('MICROSOFT_CLIENT_ID env var not set');

    const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize`
      + `?client_id=${clientId}&response_type=code&scope=Xboxlive.signin`;

    const user = _getOrCreateUser(userId);
    user.connectedPlatforms[PLATFORM_IDS.XBOX] = {
      status: 'oauth_pending',
      authUrl,
      initiatedAt: new Date().toISOString(),
    };

    return { platform: PLATFORM_IDS.XBOX, oauthUrl: authUrl, status: 'oauth_pending' };
  }

  connectUbisoftConnect(userId) {
    const clientId = process.env.UBISOFT_CLIENT_ID;
    if (!clientId) throw new Error('UBISOFT_CLIENT_ID env var not set');

    const authUrl = `https://connect.ubisoft.com/oauth/authorize`
      + `?client_id=${clientId}&response_type=code&scope=openid`;

    const user = _getOrCreateUser(userId);
    user.connectedPlatforms[PLATFORM_IDS.UBISOFT] = {
      status: 'oauth_pending',
      authUrl,
      initiatedAt: new Date().toISOString(),
    };

    return { platform: PLATFORM_IDS.UBISOFT, oauthUrl: authUrl, status: 'oauth_pending' };
  }

  async syncGameProgress(userId, platform, gameId) {
    const validPlatforms = Object.values(PLATFORM_IDS);
    if (!validPlatforms.includes(platform)) {
      throw new Error(`Unknown platform "${platform}"`);
    }
    // Stub: in production this calls the relevant platform REST API
    return {
      userId,
      platform,
      gameId,
      trophies:     [],
      achievements: [],
      playtime:     0,
      lastPlayed:   null,
      syncedAt:     new Date().toISOString(),
    };
  }

  async syncAchievements(userId, platform) {
    const syncData = await this.syncGameProgress(userId, platform, null);
    const results  = [];

    for (const extAchievement of syncData.achievements) {
      const catalogId = this._mapExternalAchievement(platform, extAchievement);
      if (!catalogId) continue;
      const result = this.awardAchievement(userId, catalogId, { platform, external: extAchievement });
      results.push(result);
    }

    const user = _getOrCreateUser(userId);
    const platformCount = Object.keys(user.connectedPlatforms).length;
    if (platformCount >= 3 && !user.achievements.some(a => a.id === 'multi_platform')) {
      this.awardAchievement(userId, 'multi_platform', { platforms: Object.keys(user.connectedPlatforms) });
    }

    return { platform, synced: results.length, results, syncedAt: new Date().toISOString() };
  }

  // ── Real-time Tracking ──────────────────────────────────────────────────────

  startTracking(projectId, sessionData = {}) {
    const project   = this._requireProject(projectId);
    const sessionId = randomUUID();
    const session   = {
      sessionId,
      projectId,
      startTime:     new Date().toISOString(),
      endTime:       null,
      duration:      0,
      linesChanged:  sessionData.linesChanged ?? 0,
      commits:       sessionData.commits      ?? 0,
      tasksCompleted: 0,
      active:        true,
    };
    _sessions.set(sessionId, session);
    project.sessions.push(sessionId);
    return { ...session };
  }

  endTracking(projectId, sessionId) {
    this._requireProject(projectId);
    const session = _sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (!session.active) return { ...session };

    const endTime   = new Date();
    const startTime = new Date(session.startTime);
    const durationMs = endTime - startTime;
    const durationHours = durationMs / 3_600_000;

    session.endTime  = endTime.toISOString();
    session.duration = Math.round(durationMs / 1000); // seconds
    session.active   = false;

    const project = _projects.get(projectId);
    project.stats.total_hours = +(project.stats.total_hours + durationHours).toFixed(3);
    project.stats.commits    += session.commits;
    project.updatedAt = endTime.toISOString();

    // code_warrior check
    if (project.stats.total_hours >= 100) {
      const user = _getOrCreateUser(project.userId);
      if (!user.achievements.some(a => a.id === 'code_warrior')) {
        this.awardAchievement(project.userId, 'code_warrior', { projectId, hours: project.stats.total_hours });
      }
    }

    return { ...session };
  }

  getStats(projectId) {
    const project  = this._requireProject(projectId);
    const sessions = project.sessions
      .map(id => _sessions.get(id))
      .filter(Boolean);

    const completedSessions = sessions.filter(s => !s.active);
    const avgSession = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length
      : 0;

    return {
      total_hours:      project.stats.total_hours,
      avg_session:      Math.round(avgSession),       // seconds
      commits:          project.stats.commits,
      tasks_done:       project.stats.tasks_done,
      tasks_pending:    project.stats.tasks_pending,
      progress_percent: project.progress,
      active_session:   sessions.find(s => s.active) ?? null,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  _requireProject(projectId) {
    const project = _projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    return project;
  }

  _mapExternalAchievement(platform, externalAchievement) {
    // Stub mapping — real implementation would use a DB lookup table
    const mappings = {
      [PLATFORM_IDS.PLAYSTATION]: {},
      [PLATFORM_IDS.XBOX]:        {},
      [PLATFORM_IDS.UBISOFT]:     {},
    };
    return mappings[platform]?.[externalAchievement?.id] ?? null;
  }
}

export default GameTrackingService;
