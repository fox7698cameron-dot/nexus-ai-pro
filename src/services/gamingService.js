// File: gamingService.js | Date: 2026-06-16
import { v4 as uuidv4 } from 'uuid';
import cryptoService from './cryptoService.js';

const GAME_ENGINES = ['unity', 'unreal', 'godot', 'gamemaker', 'custom', 'bevy', 'phaser', 'o3de'];
const GAME_PLATFORMS = ['pc', 'mac', 'linux', 'mobile', 'console', 'web', 'vr', 'ar'];
const GAME_GENRES = ['action', 'rpg', 'strategy', 'simulation', 'puzzle', 'racing', 'sports', 'horror', 'platformer'];
const GAMING_PLATFORMS = ['epic', 'steam', 'playstation', 'xbox', 'nintendo', 'ubisoft'];
const ACHIEVEMENT_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const DEV_PHASES = ['concept', 'pre_production', 'production', 'alpha', 'beta', 'gold', 'released', 'post_launch'];

const gameProjects = new Map();     // projectId → project
const userGameProjects = new Map(); // userId → Set<projectId>
const achievements = new Map();     // userId → [{...}]
const gameStats = new Map();        // `${userId}:${gameId}` → stats
const gamePlatforms = new Map();    // userId → {platform → encryptedCredentials}
const leaderboards = new Map();     // gameId → [{userId, score, metric, rank}]
const arvrData = new Map();         // projectId → ARVRInfo
const threeDData = new Map();       // projectId → 3DInfo

function now() { return new Date().toISOString(); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export class GamingService {
  /**
   * Create a game development project.
   */
  createGameProject(userId, data) {
    const {
      name, engine, genre, platform = [], targetPlatforms = [], teamSize = 1
    } = data;

    if (!name || !engine) throw new Error('Project name and engine are required');

    const projectId = uuidv4();
    const project = {
      id: projectId,
      userId,
      name,
      engine,
      genre,
      platform,
      targetPlatforms,
      teamSize,
      phase: 'concept',
      completion: 0,
      currentMilestone: null,
      budget: null,
      trailer: null,
      storeUrl: null,
      rating: null,
      downloads: 0,
      revenue: 0,
      createdAt: now(),
      updatedAt: now(),
    };

    gameProjects.set(projectId, project);
    if (!userGameProjects.has(userId)) userGameProjects.set(userId, new Set());
    userGameProjects.get(userId).add(projectId);

    return project;
  }

  /**
   * Get a game project by ID.
   */
  getGameProject(projectId) {
    const project = gameProjects.get(projectId);
    if (!project) throw new Error('Game project not found');
    return project;
  }

  /**
   * Get all game projects for a user.
   */
  getUserGameProjects(userId) {
    const ids = userGameProjects.get(userId) || new Set();
    return [...ids].map(id => gameProjects.get(id)).filter(Boolean);
  }

  /**
   * Update the development phase/progress of a game project.
   */
  updateProgress(projectId, data) {
    const project = this.getGameProject(projectId);
    const { phase, completion, milestone } = data;

    if (phase && !DEV_PHASES.includes(phase)) {
      throw new Error(`Invalid phase. Valid: ${DEV_PHASES.join(', ')}`);
    }
    if (completion !== undefined) {
      if (completion < 0 || completion > 100) throw new Error('Completion must be 0-100');
      project.completion = completion;
    }
    if (phase) project.phase = phase;
    if (milestone) project.currentMilestone = milestone;

    project.updatedAt = now();
    return project;
  }

  /**
   * Track a user achievement.
   */
  trackAchievement(userId, achievement) {
    const { id, name, description, rarity = 'common', points = 10, unlockedAt } = achievement;

    if (!ACHIEVEMENT_RARITIES.includes(rarity)) {
      throw new Error(`Invalid rarity. Valid: ${ACHIEVEMENT_RARITIES.join(', ')}`);
    }

    if (!achievements.has(userId)) achievements.set(userId, []);
    const userAchievements = achievements.get(userId);

    // Prevent duplicate achievements
    if (id && userAchievements.find(a => a.id === id)) {
      return { alreadyUnlocked: true };
    }

    const entry = {
      id: id || uuidv4(),
      name,
      description,
      rarity,
      points,
      unlockedAt: unlockedAt || now(),
    };

    userAchievements.push(entry);
    return entry;
  }

  /**
   * Get all achievements for a user.
   */
  getUserAchievements(userId) {
    const list = achievements.get(userId) || [];
    const totalPoints = list.reduce((sum, a) => sum + (a.points || 0), 0);
    const byRarity = {};
    for (const r of ACHIEVEMENT_RARITIES) {
      byRarity[r] = list.filter(a => a.rarity === r).length;
    }

    return {
      achievements: list,
      stats: {
        total: list.length,
        totalPoints,
        byRarity,
      },
    };
  }

  /**
   * Update game-specific stats for a user.
   */
  updateGameStats(userId, gameId, stats) {
    const key = `${userId}:${gameId}`;
    const existing = gameStats.get(key) || {};
    const updated = {
      ...existing,
      playtime: stats.playtime ?? existing.playtime ?? 0,
      level: stats.level ?? existing.level ?? 1,
      score: stats.score ?? existing.score ?? 0,
      completionPercent: stats.completionPercent ?? existing.completionPercent ?? 0,
      lastUpdated: now(),
    };
    gameStats.set(key, updated);

    // Update leaderboard
    this._updateLeaderboard(gameId, userId, updated);

    return updated;
  }

  /**
   * Get game stats for a user.
   */
  getUserGameStats(userId, gameId) {
    const key = `${userId}:${gameId}`;
    return gameStats.get(key) || null;
  }

  /**
   * Get leaderboard for a game.
   */
  getLeaderboard(gameId, metric = 'score', limit = 10) {
    const board = leaderboards.get(gameId) || [];
    return board
      .filter(e => e[metric] !== undefined)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .slice(0, Math.min(limit, 100))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  /**
   * Connect a gaming platform for a user.
   */
  async connectGamePlatform(userId, platform, credentials) {
    if (!GAMING_PLATFORMS.includes(platform)) {
      throw new Error(`Unsupported platform. Valid: ${GAMING_PLATFORMS.join(', ')}`);
    }

    if (!gamePlatforms.has(userId)) gamePlatforms.set(userId, {});
    const userPlatforms = gamePlatforms.get(userId);

    let encryptedCredentials;
    try {
      encryptedCredentials = cryptoService.encrypt(JSON.stringify(credentials), `${userId}:gaming:${platform}`);
    } catch {
      encryptedCredentials = { dev: true, platform };
    }

    userPlatforms[platform] = {
      connected: true,
      connectedAt: now(),
      credentials: encryptedCredentials,
    };

    gamePlatforms.set(userId, userPlatforms);
    return { success: true, platform, connectedAt: userPlatforms[platform].connectedAt };
  }

  /**
   * Get the game library (all games from all connected platforms).
   */
  async getGameLibrary(userId) {
    const platforms = gamePlatforms.get(userId) || {};
    const library = {};

    for (const platform of Object.keys(platforms)) {
      try {
        library[platform] = await this._fetchPlatformLibrary(userId, platform);
      } catch {
        library[platform] = this._generateMockLibrary(platform);
      }
    }

    if (Object.keys(library).length === 0) {
      library['steam'] = this._generateMockLibrary('steam');
    }

    return library;
  }

  /**
   * Sync achievements from a gaming platform.
   */
  async syncAchievements(userId, platform) {
    if (!GAMING_PLATFORMS.includes(platform)) {
      throw new Error(`Unsupported platform. Valid: ${GAMING_PLATFORMS.join(', ')}`);
    }

    // Mock sync — in production, call platform API
    const mockAchievements = Array.from({ length: rand(2, 8) }, () => ({
      id: uuidv4(),
      name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Achievement ${rand(1, 100)}`,
      description: 'Synced from platform',
      rarity: ACHIEVEMENT_RARITIES[rand(0, 4)],
      points: [5, 10, 25, 50, 100][rand(0, 4)],
      unlockedAt: new Date(Date.now() - rand(1, 365) * 86400000).toISOString(),
    }));

    for (const achievement of mockAchievements) {
      this.trackAchievement(userId, achievement);
    }

    return { synced: mockAchievements.length, platform };
  }

  /**
   * Track AR/VR/MR data for a project.
   */
  trackARVRProject(projectId, data) {
    const { type, headset, framework, targetFPS = 72, polyCount = 0 } = data;
    const validTypes = ['ar', 'vr', 'mr'];
    if (!validTypes.includes(type)) throw new Error(`Invalid type. Valid: ${validTypes.join(', ')}`);

    const info = {
      projectId,
      type,
      headset,
      framework,
      targetFPS,
      polyCount,
      updatedAt: now(),
    };

    arvrData.set(projectId, info);
    return info;
  }

  /**
   * Get AR/VR stats for a project.
   */
  getARVRStats(projectId) {
    return arvrData.get(projectId) || { projectId, noData: true };
  }

  /**
   * Get 3D project rendering statistics.
   */
  get3DProjectStats(projectId) {
    const stored = threeDData.get(projectId);
    if (stored) return stored;

    // Generate mock stats
    const polyCount = rand(10000, 5000000);
    const textureMemoryMB = rand(50, 4096);
    const drawCalls = rand(100, 5000);
    const estimatedFPS = Math.max(5, Math.round(2000000 / drawCalls));

    const stats = {
      projectId,
      polyCount,
      textureMemoryMB,
      drawCalls,
      estimatedFPS,
      lodLevels: rand(1, 5),
      shaderComplexity: ['low', 'medium', 'high', 'ultra'][rand(0, 3)],
      shadowQuality: ['low', 'medium', 'high'][rand(0, 2)],
      updatedAt: now(),
    };

    threeDData.set(projectId, stats);
    return stats;
  }

  // --- Internal helpers ---

  _updateLeaderboard(gameId, userId, stats) {
    if (!leaderboards.has(gameId)) leaderboards.set(gameId, []);
    const board = leaderboards.get(gameId);
    const existing = board.findIndex(e => e.userId === userId);
    const entry = { userId, score: stats.score, level: stats.level, playtime: stats.playtime, lastUpdated: now() };

    if (existing !== -1) board[existing] = entry;
    else board.push(entry);
  }

  async _fetchPlatformLibrary(userId, platform) {
    throw new Error('Platform API not configured');
  }

  _generateMockLibrary(platform) {
    const gameNames = {
      steam: ['Elden Ring', 'Cyberpunk 2077', 'Hollow Knight', 'Deep Rock Galactic'],
      epic: ['Fortnite', 'Rocket League', 'Fall Guys', 'Alan Wake 2'],
      playstation: ['God of War', 'Spider-Man 2', 'Returnal', 'Demon\'s Souls'],
      xbox: ['Halo Infinite', 'Forza Horizon 5', 'Starfield', 'Sea of Thieves'],
      nintendo: ['Zelda: TotK', 'Mario Kart 8', 'Metroid Prime 4', 'Pikmin 4'],
      ubisoft: ['Assassin\'s Creed', 'Far Cry 6', 'Rainbow Six Siege', 'The Crew Motorfest'],
    };
    return (gameNames[platform] || ['Unknown Game']).map(name => ({
      id: uuidv4(),
      name,
      platform,
      playtime: rand(0, 500),
      lastPlayed: new Date(Date.now() - rand(1, 180) * 86400000).toISOString(),
    }));
  }
}

export default new GamingService();
