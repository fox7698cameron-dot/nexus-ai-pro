// File: src/server/routes/gamedev.js
// Updated: 2026-10-20
// Game development and AR/VR/3D project tracking routes

import { v4 as uuidv4 } from 'uuid';

const projects = new Map();
const milestones = new Map();
const builds = new Map();

const PROJECT_TYPES = ['game', 'ar', 'vr', '3d', 'xr', 'mobile-game', 'web-game'];
const ENGINES = ['unreal', 'unity', 'godot', 'custom', 'o3de', 'cryengine'];
const PLATFORMS = ['pc', 'playstation', 'xbox', 'nintendo', 'ios', 'android', 'vr-oculus', 'vr-steamvr', 'ar-arkit', 'ar-arcore', 'web'];

function createDefaultProject(data) {
  return {
    id: uuidv4(),
    name: data.name || 'Untitled Project',
    type: PROJECT_TYPES.includes(data.type) ? data.type : 'game',
    engine: ENGINES.includes(data.engine) ? data.engine : 'unreal',
    targetPlatforms: (data.targetPlatforms || ['pc']).filter(p => PLATFORMS.includes(p)),
    description: data.description || '',
    status: 'active',
    progress: 0,
    userId: data.userId,
    team: data.team || [],
    repository: data.repository || null,
    buildPipeline: data.buildPipeline || null,
    tags: data.tags || [],
    coveragePercent: 0,
    localizationPercent: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    milestones: [],
    currentBuild: null,
    achievements: [],
    genre: data.genre || '',
    studioName: data.studioName || '',
  };
}

export function registerGameDevRoutes(app, security) {
  // List projects
  app.get('/api/gamedev/projects', (req, res) => {
    const { userId, type } = req.query;
    let list = Array.from(projects.values());
    if (userId) list = list.filter(p => p.userId === userId);
    if (type && PROJECT_TYPES.includes(type)) list = list.filter(p => p.type === type);
    res.json({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
  });

  // Create project
  app.post('/api/gamedev/projects', (req, res) => {
    const project = createDefaultProject({ ...req.body });
    projects.set(project.id, project);
    security.logAudit('GAMEDEV_PROJECT_CREATED', { id: project.id, type: project.type });
    res.status(201).json(project);
  });

  // Get project
  app.get('/api/gamedev/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  });

  // Update project
  app.put('/api/gamedev/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const allowedUpdates = ['name', 'description', 'status', 'progress', 'targetPlatforms',
      'engine', 'coveragePercent', 'localizationPercent', 'tags', 'genre', 'studioName'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const updated = { ...project, ...updates, updatedAt: Date.now() };
    projects.set(project.id, updated);
    res.json(updated);
  });

  // Delete project
  app.delete('/api/gamedev/projects/:id', (req, res) => {
    const deleted = projects.delete(req.params.id);
    res.json({ success: deleted });
  });

  // Milestones
  app.get('/api/gamedev/projects/:id/milestones', (req, res) => {
    const projectMilestones = Array.from(milestones.values())
      .filter(m => m.projectId === req.params.id)
      .sort((a, b) => a.dueDate - b.dueDate);
    res.json({ milestones: projectMilestones });
  });

  app.post('/api/gamedev/projects/:id/milestones', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const milestone = {
      id: uuidv4(),
      projectId: req.params.id,
      name: req.body.name || 'New Milestone',
      description: req.body.description || '',
      dueDate: req.body.dueDate || Date.now() + 30 * 86400000,
      status: 'pending',
      tasks: req.body.tasks || [],
      createdAt: Date.now(),
    };
    milestones.set(milestone.id, milestone);
    res.status(201).json(milestone);
  });

  app.put('/api/gamedev/milestones/:id', (req, res) => {
    const milestone = milestones.get(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    const updated = { ...milestone, ...req.body, id: milestone.id, projectId: milestone.projectId };
    milestones.set(milestone.id, updated);
    res.json(updated);
  });

  // Build tracking
  app.get('/api/gamedev/projects/:id/builds', (req, res) => {
    const projectBuilds = Array.from(builds.values())
      .filter(b => b.projectId === req.params.id)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 20);
    res.json({ builds: projectBuilds });
  });

  app.post('/api/gamedev/projects/:id/builds', (req, res) => {
    const build = {
      id: uuidv4(),
      projectId: req.params.id,
      version: req.body.version || '0.0.1',
      platform: req.body.platform || 'pc',
      status: 'queued',
      pipeline: req.body.pipeline || 'default',
      startedAt: Date.now(),
      completedAt: null,
      artifacts: [],
      logs: [],
    };
    builds.set(build.id, build);

    // Simulate build completion after 3 seconds
    setTimeout(() => {
      const b = builds.get(build.id);
      if (b) {
        b.status = Math.random() > 0.1 ? 'success' : 'failed';
        b.completedAt = Date.now();
        b.artifacts = b.status === 'success' ? [`build-${b.version}-${b.platform}.zip`] : [];
      }
    }, 3000);

    res.status(201).json(build);
  });

  app.get('/api/gamedev/builds/:id', (req, res) => {
    const build = builds.get(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(build);
  });

  // Achievements
  app.get('/api/gamedev/projects/:id/achievements', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ achievements: project.achievements || [] });
  });

  app.post('/api/gamedev/projects/:id/achievements', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const achievement = {
      id: uuidv4(),
      name: req.body.name || 'New Achievement',
      description: req.body.description || '',
      icon: req.body.icon || 'trophy',
      points: req.body.points || 10,
      rarity: req.body.rarity || 'common',
      unlocked: false,
      createdAt: Date.now(),
    };

    if (!project.achievements) project.achievements = [];
    project.achievements.push(achievement);
    project.updatedAt = Date.now();
    projects.set(project.id, project);

    res.status(201).json(achievement);
  });

  // Platform connectors status
  app.get('/api/gamedev/connectors', (req, res) => {
    res.json({
      connectors: [
        {
          id: 'epic-games',
          name: 'Epic Games / Unreal Engine',
          status: process.env.EPIC_GAMES_CLIENT_ID ? 'configured' : 'unconfigured',
          oauthUrl: process.env.EPIC_GAMES_OAUTH_URL || null,
          features: ['builds', 'marketplace', 'achievements', 'analytics'],
        },
        {
          id: 'sony-psn',
          name: 'Sony PlayStation Network',
          status: process.env.SONY_PSN_CLIENT_ID ? 'configured' : 'unconfigured',
          oauthUrl: process.env.SONY_PSN_OAUTH_URL || null,
          features: ['trophies', 'leaderboards', 'dlc', 'playerdata'],
        },
        {
          id: 'xbox-live',
          name: 'Microsoft Xbox Live',
          status: process.env.XBOX_CLIENT_ID ? 'configured' : 'unconfigured',
          oauthUrl: process.env.XBOX_OAUTH_URL || null,
          features: ['achievements', 'gamerscore', 'clubs', 'tournaments'],
        },
        {
          id: 'ubisoft-connect',
          name: 'Ubisoft Connect',
          status: process.env.UBISOFT_CLIENT_ID ? 'configured' : 'unconfigured',
          oauthUrl: process.env.UBISOFT_OAUTH_URL || null,
          features: ['units', 'challenges', 'rewards', 'friends'],
        },
        {
          id: 'steam',
          name: 'Steam / Valve',
          status: process.env.STEAM_API_KEY ? 'configured' : 'unconfigured',
          features: ['achievements', 'leaderboards', 'workshop', 'stats'],
        },
      ],
    });
  });

  // Project statistics summary
  app.get('/api/gamedev/stats', (req, res) => {
    const { userId } = req.query;
    let list = Array.from(projects.values());
    if (userId) list = list.filter(p => p.userId === userId);

    res.json({
      totalProjects: list.length,
      byType: PROJECT_TYPES.reduce((acc, t) => ({ ...acc, [t]: list.filter(p => p.type === t).length }), {}),
      byStatus: ['active', 'paused', 'completed', 'archived'].reduce(
        (acc, s) => ({ ...acc, [s]: list.filter(p => p.status === s).length }), {}
      ),
      avgProgress: list.length ? Math.round(list.reduce((s, p) => s + p.progress, 0) / list.length) : 0,
      totalBuilds: builds.size,
      totalMilestones: milestones.size,
    });
  });
}
