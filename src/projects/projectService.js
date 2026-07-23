// src/projects/projectService.js
// 2026-07-23 | Nexus AI Pro - Project Tracking Service
// Types: coding, game-dev, ar-vr-3d | Real-time updates via Socket.io

import { v4 as uuidv4 } from 'uuid';

export const PROJECT_TYPES = Object.freeze({
  CODING: 'coding',
  GAME_DEV: 'game_dev',
  AR_VR_3D: 'ar_vr_3d',
  APP_DEV: 'app_dev',
  WEB: 'web',
  MOBILE: 'mobile',
  AI_ML: 'ai_ml',
  BLOCKCHAIN: 'blockchain',
});

export const PROJECT_STATUS = Object.freeze({
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  REVIEW: 'review',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

export const GAME_ENGINES = Object.freeze({
  UNREAL: 'unreal',
  UNITY: 'unity',
  GODOT: 'godot',
  CUSTOM: 'custom',
});

export const PLATFORMS_GAME = Object.freeze({
  PC: 'pc',
  PLAYSTATION: 'playstation',
  XBOX: 'xbox',
  SWITCH: 'switch',
  MOBILE_IOS: 'mobile_ios',
  MOBILE_ANDROID: 'mobile_android',
  VR_META: 'vr_meta',
  VR_VALVE: 'vr_valve',
  WEB: 'web',
});

export const PUBLISHER_CONNECTORS = Object.freeze({
  EPIC: 'epic_games',
  SONY: 'sony_playstation',
  MICROSOFT: 'microsoft_xbox',
  UBISOFT: 'ubisoft_connect',
  STEAM: 'steam',
  APPLE: 'apple_arcade',
  GOOGLE: 'google_play',
});

export class ProjectService {
  constructor(io, securityModule) {
    this.io = io;
    this.security = securityModule;
    this.projects = new Map();
    this.milestones = new Map();
    this.tasks = new Map();
    this.achievements = new Map();
    this.buildLogs = new Map();
    this.publisherConnections = new Map();
  }

  _emit(event, data) {
    if (this.io) this.io.emit(event, data);
  }

  createProject({ userId, name, type, description, engine, targetPlatforms = [], publisherConnectors = [], language = 'en' }) {
    const validType = Object.values(PROJECT_TYPES).includes(type) ? type : PROJECT_TYPES.CODING;
    const id = uuidv4();

    const project = {
      id,
      userId,
      name,
      type: validType,
      description,
      status: PROJECT_STATUS.PLANNING,
      engine: engine || null,
      targetPlatforms: targetPlatforms.filter(p => Object.values(PLATFORMS_GAME).includes(p)),
      publisherConnectors: publisherConnectors.filter(c => Object.values(PUBLISHER_CONNECTORS).includes(c)),
      language,
      progress: 0,
      milestoneIds: [],
      taskIds: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      coveragePercent: 0,
      linesOfCode: 0,
      buildStatus: 'unknown',
      lastBuild: null,
    };

    this.projects.set(id, project);
    this._emit('project:created', { projectId: id, userId, name, type: validType });
    this.security.logAudit('PROJECT_CREATED', { projectId: id, userId, type: validType });
    return project;
  }

  updateProject(projectId, updates, userId) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');
    if (project.userId !== userId) throw new Error('Access denied');

    const immutable = ['id', 'userId', 'createdAt'];
    const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => !immutable.includes(k)));

    const updated = { ...project, ...safeUpdates, updatedAt: Date.now() };

    if (safeUpdates.status === PROJECT_STATUS.COMPLETED && !project.completedAt) {
      updated.completedAt = Date.now();
      updated.progress = 100;
    }

    this.projects.set(projectId, updated);
    this._emit('project:updated', { projectId, status: updated.status, progress: updated.progress });
    return updated;
  }

  createMilestone(projectId, { title, description, dueDate, targetProgress }) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const id = uuidv4();
    const milestone = {
      id,
      projectId,
      title,
      description,
      dueDate,
      targetProgress: targetProgress || 0,
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
    };

    this.milestones.set(id, milestone);
    project.milestoneIds.push(id);
    project.updatedAt = Date.now();
    this.projects.set(projectId, project);
    this._emit('project:milestone_added', { projectId, milestoneId: id, title });
    return milestone;
  }

  completeMilestone(milestoneId) {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');
    milestone.status = 'completed';
    milestone.completedAt = Date.now();
    this.milestones.set(milestoneId, milestone);

    const project = this.projects.get(milestone.projectId);
    if (project) {
      const completedMilestones = project.milestoneIds
        .map(id => this.milestones.get(id))
        .filter(m => m && m.status === 'completed').length;
      const totalMilestones = project.milestoneIds.length;
      if (totalMilestones > 0) {
        project.progress = Math.round((completedMilestones / totalMilestones) * 100);
        project.updatedAt = Date.now();
        this.projects.set(milestone.projectId, project);
      }
    }

    this._emit('project:milestone_completed', { milestoneId, projectId: milestone.projectId });
    return milestone;
  }

  createTask(projectId, { title, description, assignedTo, priority = 'medium', estimatedHours, tags = [] }) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const id = uuidv4();
    const task = {
      id,
      projectId,
      title,
      description,
      assignedTo,
      priority,
      estimatedHours,
      loggedHours: 0,
      tags,
      status: 'todo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
    };

    this.tasks.set(id, task);
    project.taskIds.push(id);
    project.updatedAt = Date.now();
    this.projects.set(projectId, project);
    this._emit('project:task_created', { projectId, taskId: id, title });
    return task;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const updated = { ...task, ...updates, updatedAt: Date.now() };
    if (updates.status === 'completed' && !task.completedAt) updated.completedAt = Date.now();
    this.tasks.set(taskId, updated);
    this._emit('project:task_updated', { taskId, projectId: task.projectId, status: updated.status });
    return updated;
  }

  recordBuild(projectId, { platform, status, duration, errors = [], warnings = [], coveragePercent, linesOfCode, buildNumber }) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const buildId = uuidv4();
    const buildLog = {
      id: buildId,
      projectId,
      platform,
      status,
      duration,
      errors,
      warnings,
      coveragePercent,
      linesOfCode,
      buildNumber,
      timestamp: Date.now(),
    };

    const logs = this.buildLogs.get(projectId) || [];
    logs.push(buildLog);
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    this.buildLogs.set(projectId, logs);

    project.buildStatus = status;
    project.lastBuild = Date.now();
    if (coveragePercent !== undefined) project.coveragePercent = coveragePercent;
    if (linesOfCode !== undefined) project.linesOfCode = linesOfCode;
    project.updatedAt = Date.now();
    this.projects.set(projectId, project);

    this._emit('project:build', { projectId, buildId, status, platform, coveragePercent, errors: errors.length });
    return buildLog;
  }

  getBuildHistory(projectId, limit = 20) {
    const logs = this.buildLogs.get(projectId) || [];
    return logs.slice(-limit).reverse();
  }

  connectPublisher(projectId, { publisher, credentialRef, appId }) {
    if (!Object.values(PUBLISHER_CONNECTORS).includes(publisher)) {
      throw new Error(`Unsupported publisher: ${publisher}`);
    }

    const connId = uuidv4();
    const conn = {
      id: connId,
      projectId,
      publisher,
      appId,
      credentialRef,
      connectedAt: Date.now(),
      status: 'connected',
    };

    const existing = this.publisherConnections.get(projectId) || [];
    existing.push(conn);
    this.publisherConnections.set(projectId, existing);

    const project = this.projects.get(projectId);
    if (project && !project.publisherConnectors.includes(publisher)) {
      project.publisherConnectors.push(publisher);
      project.updatedAt = Date.now();
      this.projects.set(projectId, project);
    }

    this._emit('project:publisher_connected', { projectId, publisher });
    this.security.logAudit('PUBLISHER_CONNECTED', { projectId, publisher });
    return conn;
  }

  trackAchievement(projectId, { title, description, xpValue = 10, platform }) {
    const id = uuidv4();
    const achievement = {
      id,
      projectId,
      title,
      description,
      xpValue,
      platform,
      unlockedAt: Date.now(),
    };

    const existing = this.achievements.get(projectId) || [];
    existing.push(achievement);
    this.achievements.set(projectId, existing);

    this._emit('project:achievement', { projectId, achievement });
    return achievement;
  }

  getProjectSummary(projectId) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const milestones = project.milestoneIds.map(id => this.milestones.get(id)).filter(Boolean);
    const tasks = project.taskIds.map(id => this.tasks.get(id)).filter(Boolean);
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const builds = this.buildLogs.get(projectId) || [];
    const achievements = this.achievements.get(projectId) || [];
    const publishers = this.publisherConnections.get(projectId) || [];

    return {
      ...project,
      milestones: { total: milestones.length, completed: milestones.filter(m => m.status === 'completed').length, items: milestones },
      tasks: { total: tasks.length, completed: completedTasks, todo: tasks.filter(t => t.status === 'todo').length, inProgress: tasks.filter(t => t.status === 'in_progress').length, items: tasks },
      recentBuilds: builds.slice(-5).reverse(),
      achievements: { total: achievements.length, totalXp: achievements.reduce((s, a) => s + a.xpValue, 0), items: achievements },
      publishers: publishers.map(({ credentialRef, ...safe }) => safe),
    };
  }

  getProjectsByUser(userId) {
    const results = [];
    for (const project of this.projects.values()) {
      if (project.userId === userId) results.push(project);
    }
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteProject(projectId, userId) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');
    if (project.userId !== userId) throw new Error('Access denied');
    this.projects.delete(projectId);
    this.buildLogs.delete(projectId);
    this.achievements.delete(projectId);
    this.publisherConnections.delete(projectId);
    this._emit('project:deleted', { projectId, userId });
    this.security.logAudit('PROJECT_DELETED', { projectId, userId });
  }
}
