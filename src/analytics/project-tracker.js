// src/analytics/project-tracker.js
// 2026-07-24 | Nexus AI Pro - Real-time Project Tracker
// Tracks: coding, game dev (Unreal/Unity), AR/VR/3D projects

import { v4 as uuidv4 } from 'uuid';

export const PROJECT_TYPES = {
  CODING: 'coding',
  GAME_DEV: 'game_dev',
  AR_VR: 'ar_vr',
  THREE_D: '3d',
  MOBILE: 'mobile',
  WEB: 'web',
  DESKTOP: 'desktop',
};

export const PROJECT_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  TESTING: 'testing',
  DEPLOYED: 'deployed',
  ARCHIVED: 'archived',
};

export const ENGINES = {
  UNREAL: { name: 'Unreal Engine', publisher: 'Epic Games', langs: ['C++', 'Blueprint'] },
  UNITY: { name: 'Unity', publisher: 'Unity Technologies', langs: ['C#'] },
  GODOT: { name: 'Godot', publisher: 'Godot Engine', langs: ['GDScript', 'C#', 'C++'] },
  BLENDER: { name: 'Blender', publisher: 'Blender Foundation', langs: ['Python'] },
  THREEJS: { name: 'Three.js', publisher: 'three.js contributors', langs: ['JavaScript'] },
  BABYLONJS: { name: 'Babylon.js', publisher: 'Microsoft', langs: ['JavaScript', 'TypeScript'] },
};

export class ProjectTracker {
  constructor(dataService, io) {
    this.data = dataService;
    this.io = io;
  }

  createProject({ userId, name, type, engine, description, tags = [] }) {
    if (!Object.values(PROJECT_TYPES).includes(type)) {
      return { success: false, error: 'Invalid project type.' };
    }
    const id = uuidv4();
    const project = {
      id,
      userId,
      name: name?.trim() || 'Untitled Project',
      type,
      engine: engine || null,
      description: description?.trim() || '',
      tags,
      status: PROJECT_STATUS.PLANNING,
      progress: 0,
      milestones: [],
      tasks: [],
      commits: [],
      builds: [],
      testResults: [],
      achievements: [],
      collaborators: [userId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metrics: {
        linesOfCode: 0,
        testCoverage: 0,
        buildTime: 0,
        deployments: 0,
        bugs: 0,
        bugsResolved: 0,
      },
    };

    this.data.storeProject(id, project);
    this._broadcast('project:created', { project });
    return { success: true, project };
  }

  getProject(projectId) {
    return this.data.getProject(projectId);
  }

  listProjects(userId) {
    return this.data.listProjectsByUser(userId);
  }

  updateProgress(projectId, progress, status) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    project.progress = Math.min(100, Math.max(0, progress));
    if (status && Object.values(PROJECT_STATUS).includes(status)) {
      project.status = status;
    }
    project.updatedAt = Date.now();

    this.data.storeProject(projectId, project);
    this._broadcast('project:updated', { projectId, progress: project.progress, status: project.status });
    return { success: true, project };
  }

  addMilestone(projectId, { name, targetDate, description }) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    const milestone = {
      id: uuidv4(),
      name: name?.trim(),
      targetDate,
      description: description?.trim() || '',
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
    };

    project.milestones.push(milestone);
    project.updatedAt = Date.now();
    this.data.storeProject(projectId, project);
    this._broadcast('project:milestone_added', { projectId, milestone });
    return { success: true, milestone };
  }

  completeMilestone(projectId, milestoneId) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    const ms = project.milestones.find(m => m.id === milestoneId);
    if (!ms) return { success: false, error: 'Milestone not found.' };

    ms.completed = true;
    ms.completedAt = Date.now();
    project.updatedAt = Date.now();

    const completedCount = project.milestones.filter(m => m.completed).length;
    project.progress = Math.round((completedCount / project.milestones.length) * 100);

    this.data.storeProject(projectId, project);
    this._broadcast('project:milestone_completed', { projectId, milestoneId });
    return { success: true };
  }

  recordBuild(projectId, { status, duration, version, platform }) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    const build = {
      id: uuidv4(),
      status,       // 'success' | 'failed' | 'in_progress'
      duration,     // ms
      version,
      platform,
      timestamp: Date.now(),
    };

    project.builds.push(build);
    project.metrics.buildTime = duration;
    if (status === 'success') project.metrics.deployments++;
    project.updatedAt = Date.now();

    this.data.storeProject(projectId, project);
    this._broadcast('project:build', { projectId, build });
    return { success: true, build };
  }

  updateMetrics(projectId, metrics) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    project.metrics = { ...project.metrics, ...metrics };
    project.updatedAt = Date.now();
    this.data.storeProject(projectId, project);
    this._broadcast('project:metrics', { projectId, metrics: project.metrics });
    return { success: true };
  }

  addAchievement(projectId, { title, description, icon = '🏆' }) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    const achievement = {
      id: uuidv4(),
      title,
      description,
      icon,
      unlockedAt: Date.now(),
    };

    project.achievements.push(achievement);
    project.updatedAt = Date.now();
    this.data.storeProject(projectId, project);
    this._broadcast('project:achievement', { projectId, achievement });
    return { success: true, achievement };
  }

  deleteProject(projectId, userId) {
    const project = this.data.getProject(projectId);
    if (!project) return { success: false, error: 'Not found.' };
    if (project.userId !== userId) return { success: false, error: 'Unauthorized.' };
    this.data.deleteProject(projectId);
    return { success: true };
  }

  _broadcast(event, data) {
    this.io?.to('projects').emit(event, data);
  }
}
