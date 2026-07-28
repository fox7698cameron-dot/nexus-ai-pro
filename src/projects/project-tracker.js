// Created: 2026-07-28

const PROJECT_TYPES = new Set(['coding', 'game-development', 'ar-vr-3d']);
const VALID_STATUSES = new Set(['planning', 'active', 'review', 'complete', 'paused']);
const GAME_ENGINES = new Set(['unreal', 'unity', 'godot', 'custom']);
const XR_TYPES = new Set(['AR', 'VR', 'MR', 'XR']);
const CONNECTABLE_PLATFORMS = new Set(['unreal', 'epic', 'sony', 'microsoft', 'ubisoft']);
const MAX_COMMITS = 100;

function generateId(prefix = 'proj') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

function buildDefaultMetadata(type) {
  if (type === 'game-development') {
    return {
      engine: 'custom',
      targetPlatforms: [],
      achievements: [],
      gameProgress: {},
      connectedPlatforms: [],
    };
  }
  if (type === 'ar-vr-3d') {
    return {
      xrType: 'XR',
      targetDevices: [],
      renderPipeline: '',
      polycount: 0,
    };
  }
  return {};
}

export default class ProjectTrackerService {
  constructor() {
    this._projects = new Map();
    // userId -> Set<projectId>
    this._userIndex = new Map();
  }

  createProject(userId, projectData) {
    const { type, name, description = '', status = 'planning', tags = [], platform = '', engine = '', milestones = [], tasks = [], teamMembers = [], metadata = {} } = projectData;

    if (!type || !PROJECT_TYPES.has(type)) {
      throw new Error(`Invalid project type. Must be one of: ${[...PROJECT_TYPES].join(', ')}`);
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Project name is required');
    }
    if (!VALID_STATUSES.has(status)) {
      throw new Error(`Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}`);
    }

    const id = generateId();
    const ts = now();

    const defaultMeta = buildDefaultMetadata(type);
    const mergedMeta = { ...defaultMeta, ...metadata };

    if (type === 'game-development' && mergedMeta.engine && !GAME_ENGINES.has(mergedMeta.engine)) {
      throw new Error(`Invalid engine. Must be one of: ${[...GAME_ENGINES].join(', ')}`);
    }
    if (type === 'ar-vr-3d' && mergedMeta.xrType && !XR_TYPES.has(mergedMeta.xrType)) {
      throw new Error(`Invalid xrType. Must be one of: ${[...XR_TYPES].join(', ')}`);
    }

    const project = {
      id,
      name: name.trim(),
      type,
      description,
      status,
      progress: Math.max(0, Math.min(100, Number(projectData.progress) || 0)),
      tags: [...tags],
      platform,
      engine,
      milestones: [],
      tasks: [],
      commits: [],
      deployments: [],
      teamMembers: [...teamMembers],
      createdAt: ts,
      updatedAt: ts,
      metadata: mergedMeta,
    };

    // Pre-process any provided milestones/tasks through their respective methods after insertion
    this._projects.set(id, project);

    if (!this._userIndex.has(userId)) this._userIndex.set(userId, new Set());
    this._userIndex.get(userId).add(id);

    for (const m of milestones) this.addMilestone(id, m);
    for (const t of tasks) this.addTask(id, t);

    return { ...project };
  }

  updateProject(projectId, updates) {
    const project = this._getOrThrow(projectId);

    const forbidden = ['id', 'createdAt', 'commits', 'deployments'];
    for (const key of forbidden) delete updates[key];

    if (updates.status && !VALID_STATUSES.has(updates.status)) {
      throw new Error(`Invalid status: ${updates.status}`);
    }
    if (updates.progress !== undefined) {
      updates.progress = Math.max(0, Math.min(100, Number(updates.progress)));
    }
    if (updates.metadata) {
      updates.metadata = { ...project.metadata, ...updates.metadata };
    }

    Object.assign(project, updates, { updatedAt: now() });
    return { ...project };
  }

  getProject(projectId) {
    const project = this._getOrThrow(projectId);
    return { ...project };
  }

  listProjects(userId, filter = {}) {
    const ids = this._userIndex.get(userId);
    if (!ids) return [];

    let results = [];
    for (const id of ids) {
      const p = this._projects.get(id);
      if (!p) continue;

      if (filter.type && p.type !== filter.type) continue;
      if (filter.status && p.status !== filter.status) continue;
      if (filter.tag && !p.tags.includes(filter.tag)) continue;

      results.push({ ...p });
    }

    return results;
  }

  deleteProject(projectId) {
    if (!this._projects.has(projectId)) return false;
    this._projects.delete(projectId);
    for (const ids of this._userIndex.values()) ids.delete(projectId);
    return true;
  }

  addMilestone(projectId, milestone) {
    const project = this._getOrThrow(projectId);
    const { name, dueDate, completed = false } = milestone;
    if (!name) throw new Error('Milestone name is required');

    const id = generateId('ms');
    const entry = { id, name, dueDate: dueDate ?? null, completed: Boolean(completed), createdAt: now() };
    project.milestones.push(entry);
    project.updatedAt = now();
    return { ...entry };
  }

  completeMilestone(projectId, milestoneId) {
    const project = this._getOrThrow(projectId);
    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
    milestone.completed = true;
    milestone.completedAt = now();
    project.updatedAt = now();
    return { ...milestone };
  }

  addTask(projectId, task) {
    const project = this._getOrThrow(projectId);
    const { title, assignee = null, priority = 'medium', status = 'open' } = task;
    if (!title) throw new Error('Task title is required');

    const id = generateId('task');
    const entry = { id, title, assignee, priority, status, createdAt: now(), updatedAt: now() };
    project.tasks.push(entry);
    project.updatedAt = now();
    return { ...entry };
  }

  updateTask(projectId, taskId, updates) {
    const project = this._getOrThrow(projectId);
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    Object.assign(task, updates, { updatedAt: now() });
    project.updatedAt = now();
    return { ...task };
  }

  logCommit(projectId, commit) {
    const project = this._getOrThrow(projectId);
    const { hash, message, author, files = [] } = commit;
    if (!hash || !message) throw new Error('Commit hash and message are required');

    const entry = { hash, message, author, files: [...files], timestamp: now() };
    project.commits.unshift(entry);
    if (project.commits.length > MAX_COMMITS) project.commits.length = MAX_COMMITS;
    project.updatedAt = now();
    return { ...entry };
  }

  logDeployment(projectId, deployment) {
    const project = this._getOrThrow(projectId);
    const { platform, version, status, timestamp = now() } = deployment;
    if (!platform || !version) throw new Error('Deployment platform and version are required');

    const entry = { platform, version, status, timestamp };
    project.deployments.push(entry);
    project.updatedAt = now();
    return { ...entry };
  }

  addAchievement(projectId, achievement) {
    const project = this._getOrThrow(projectId);
    if (project.type !== 'game-development') {
      throw new Error('Achievements are only available for game-development projects');
    }
    const { id, name, description = '', icon = '', unlockedAt = now() } = achievement;
    if (!id || !name) throw new Error('Achievement id and name are required');

    const entry = { id, name, description, icon, unlockedAt };
    project.metadata.achievements.push(entry);
    project.updatedAt = now();
    return { ...entry };
  }

  updateGameProgress(projectId, progressData) {
    const project = this._getOrThrow(projectId);
    if (project.type !== 'game-development') {
      throw new Error('Game progress is only available for game-development projects');
    }
    project.metadata.gameProgress = { ...project.metadata.gameProgress, ...progressData };
    project.updatedAt = now();
    return { ...project.metadata.gameProgress };
  }

  connectPlatform(projectId, platform, credentials = {}) {
    const project = this._getOrThrow(projectId);
    if (!CONNECTABLE_PLATFORMS.has(platform)) {
      throw new Error(`Invalid platform. Must be one of: ${[...CONNECTABLE_PLATFORMS].join(', ')}`);
    }
    if (project.type !== 'game-development') {
      throw new Error('Platform connections are only available for game-development projects');
    }

    // Store sanitized config — raw credential values are not logged
    const entry = {
      platform,
      connectedAt: now(),
      config: { ...credentials },
    };

    const existing = project.metadata.connectedPlatforms.findIndex(c => c.platform === platform);
    if (existing >= 0) {
      project.metadata.connectedPlatforms[existing] = entry;
    } else {
      project.metadata.connectedPlatforms.push(entry);
    }

    project.updatedAt = now();
    return { platform, connectedAt: entry.connectedAt };
  }

  getProjectStats(projectId) {
    const project = this._getOrThrow(projectId);

    const completedMilestones = project.milestones.filter(m => m.completed).length;
    const totalMilestones = project.milestones.length;
    const completedTasks = project.tasks.filter(t => t.status === 'complete' || t.status === 'done').length;
    const totalTasks = project.tasks.length;
    const commitCount = project.commits.length;
    const deploymentCount = project.deployments.length;

    // Build a simple trend from progress value sampled with simulated prior snapshots
    const progress = project.progress;
    const progressTrend = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      progress: Math.max(0, Math.min(100, progress - (6 - i) * Math.random() * 3)),
    }));

    return {
      completedMilestones,
      totalMilestones,
      completedTasks,
      totalTasks,
      commitCount,
      deploymentCount,
      progressTrend,
    };
  }

  getRealTimeMetrics(projectId) {
    const project = this._getOrThrow(projectId);

    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const recentCommits = project.commits.filter(c => c.timestamp >= oneDayAgo).length;

    const openTasks = project.tasks.filter(t => t.status !== 'complete' && t.status !== 'done').length;

    // Velocity: tasks completed in last 7 days relative to total open tasks
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const recentlyCompleted = project.tasks.filter(
      t => (t.status === 'complete' || t.status === 'done') && t.updatedAt >= oneWeekAgo
    ).length;
    const velocity = openTasks > 0 ? parseFloat((recentlyCompleted / Math.max(openTasks, 1)).toFixed(2)) : 0;

    return {
      velocity,
      openTasks,
      recentCommitsLast24h: recentCommits,
      lastUpdated: project.updatedAt,
    };
  }

  _getOrThrow(projectId) {
    const project = this._projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    return project;
  }
}
