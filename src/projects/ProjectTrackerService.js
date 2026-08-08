/**
 * src/projects/ProjectTrackerService.js
 * Nexus AI Pro — Real-time project tracker
 * Covers: general coding, game development, AR/VR, 3D projects
 * Tracks: milestones, tasks, build status, commits, deadlines, team
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ── Enumerations ─────────────────────────────────────────────────────────

export const PROJECT_TYPES = Object.freeze({
  CODING: 'coding',
  GAME_DEV: 'game_dev',
  AR: 'ar',
  VR: 'vr',
  THREE_D: '3d',
  MOBILE: 'mobile',
  WEB: 'web',
  ENTERPRISE: 'enterprise',
});

export const PROJECT_STATUS = Object.freeze({
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  REVIEW: 'review',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

export const TASK_STATUS = Object.freeze({
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  REVIEW: 'review',
  DONE: 'done',
});

export const PRIORITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

// ── ProjectTrackerService ─────────────────────────────────────────────────

export class ProjectTrackerService {
  constructor() {
    /** In-memory stores (replace with Redis/DB in production) */
    this._projects = new Map();  // id → project
    this._tasks = new Map();     // id → task
    this._milestones = new Map();// id → milestone
    this._commits = new Map();   // id → commit
    this._builds = new Map();    // id → build
    this._metrics = new Map();   // projectId → []  time-series
    /** WebSocket emit callback */
    this._emit = null;
    /** Polling intervals for external build systems */
    this._pollingIntervals = new Map();
  }

  setEmitCallback(fn) {
    this._emit = fn;
  }

  _broadcast(event, data) {
    if (this._emit) this._emit(event, data);
  }

  // ── Projects ───────────────────────────────────────────────────────────

  createProject(ownerId, data) {
    if (!Object.values(PROJECT_TYPES).includes(data.type))
      throw new Error(`Invalid project type: ${data.type}`);

    const id = uuidv4();
    const project = {
      id,
      ownerId,
      name: String(data.name || '').slice(0, 200),
      type: data.type,
      description: data.description || '',
      status: PROJECT_STATUS.PLANNING,
      priority: data.priority || PRIORITY.MEDIUM,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      team: Array.isArray(data.team) ? data.team : [],
      repository: data.repository || null,
      engine: data.engine || null,        // e.g. 'Unreal', 'Unity', 'Godot'
      platform: data.platform || null,    // e.g. 'PC', 'PS5', 'Quest 3'
      languages: Array.isArray(data.languages) ? data.languages : [], // C++, Swift, JS, etc.
      startDate: data.startDate || new Date().toISOString(),
      targetDate: data.targetDate || null,
      budget: data.budget || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completionPercent: 0,
    };

    this._projects.set(id, project);
    this._broadcast('project:created', { project });
    return project;
  }

  updateProject(projectId, patch, callerId) {
    const project = this._projects.get(projectId);
    if (!project) throw new Error('Project not found');
    this._checkAccess(project, callerId);

    const allowed = ['name', 'description', 'status', 'priority', 'tags', 'team',
                     'repository', 'engine', 'platform', 'languages', 'targetDate',
                     'budget', 'completionPercent'];
    const update = {};
    for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];
    update.updatedAt = new Date().toISOString();

    // Auto-recalculate completion from tasks if not provided
    if (update.completionPercent === undefined) {
      update.completionPercent = this._calcCompletion(projectId);
    }

    const updated = { ...project, ...update };
    this._projects.set(projectId, updated);
    this._broadcast('project:updated', { project: updated });
    return updated;
  }

  getProject(projectId) {
    return this._projects.get(projectId) || null;
  }

  listProjects(ownerId, filters = {}) {
    let projects = [...this._projects.values()].filter(
      (p) => p.ownerId === ownerId || p.team.includes(ownerId)
    );
    if (filters.type) projects = projects.filter((p) => p.type === filters.type);
    if (filters.status) projects = projects.filter((p) => p.status === filters.status);
    if (filters.priority) projects = projects.filter((p) => p.priority === filters.priority);
    return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  deleteProject(projectId, callerId) {
    const project = this._projects.get(projectId);
    if (!project) throw new Error('Project not found');
    if (project.ownerId !== callerId) throw new Error('Only owner can delete project');
    this._projects.delete(projectId);
    // Clean up tasks and milestones
    for (const [tid, t] of this._tasks.entries()) if (t.projectId === projectId) this._tasks.delete(tid);
    for (const [mid, m] of this._milestones.entries()) if (m.projectId === projectId) this._milestones.delete(mid);
    this._broadcast('project:deleted', { projectId });
    return { success: true };
  }

  // ── Tasks ──────────────────────────────────────────────────────────────

  createTask(projectId, assigneeId, data) {
    const project = this._projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const id = uuidv4();
    const task = {
      id,
      projectId,
      title: String(data.title || '').slice(0, 500),
      description: data.description || '',
      status: TASK_STATUS.TODO,
      priority: data.priority || PRIORITY.MEDIUM,
      assigneeId: assigneeId || null,
      dueDate: data.dueDate || null,
      estimatedHours: data.estimatedHours || null,
      loggedHours: 0,
      tags: Array.isArray(data.tags) ? data.tags : [],
      dependencies: [],
      milestoneId: data.milestoneId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this._tasks.set(id, task);
    this._updateProjectCompletion(projectId);
    this._broadcast('task:created', { task });
    return task;
  }

  updateTask(taskId, patch, callerId) {
    const task = this._tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const allowed = ['title', 'description', 'status', 'priority', 'assigneeId',
                     'dueDate', 'estimatedHours', 'loggedHours', 'tags', 'dependencies', 'milestoneId'];
    const update = {};
    for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];
    update.updatedAt = new Date().toISOString();

    const updated = { ...task, ...update };
    this._tasks.set(taskId, updated);
    this._updateProjectCompletion(task.projectId);
    this._broadcast('task:updated', { task: updated });
    return updated;
  }

  getTasksForProject(projectId) {
    return [...this._tasks.values()].filter((t) => t.projectId === projectId);
  }

  // ── Milestones ────────────────────────────────────────────────────────

  createMilestone(projectId, data) {
    if (!this._projects.has(projectId)) throw new Error('Project not found');
    const id = uuidv4();
    const milestone = {
      id,
      projectId,
      title: String(data.title || '').slice(0, 300),
      description: data.description || '',
      dueDate: data.dueDate || null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    this._milestones.set(id, milestone);
    this._broadcast('milestone:created', { milestone });
    return milestone;
  }

  completeMilestone(milestoneId) {
    const m = this._milestones.get(milestoneId);
    if (!m) throw new Error('Milestone not found');
    const updated = { ...m, completed: true, completedAt: new Date().toISOString() };
    this._milestones.set(milestoneId, updated);
    this._broadcast('milestone:completed', { milestone: updated });
    return updated;
  }

  getMilestonesForProject(projectId) {
    return [...this._milestones.values()].filter((m) => m.projectId === projectId);
  }

  // ── Build tracking ────────────────────────────────────────────────────

  recordBuild(projectId, data) {
    const id = uuidv4();
    const build = {
      id,
      projectId,
      buildNumber: data.buildNumber || null,
      platform: data.platform || 'all',
      engine: data.engine || null,
      status: data.status || 'pending',    // pending|running|success|failed
      startedAt: data.startedAt || new Date().toISOString(),
      finishedAt: data.finishedAt || null,
      duration: data.duration || null,    // ms
      artifactUrl: data.artifactUrl || null,
      logs: data.logs || '',
      triggeredBy: data.triggeredBy || null,
    };
    this._builds.set(id, build);
    this._broadcast('build:recorded', { build });
    return build;
  }

  updateBuildStatus(buildId, status, extra = {}) {
    const build = this._builds.get(buildId);
    if (!build) throw new Error('Build not found');
    const updated = { ...build, ...extra, status, updatedAt: new Date().toISOString() };
    if (['success', 'failed'].includes(status) && !build.finishedAt) {
      updated.finishedAt = new Date().toISOString();
      updated.duration = new Date(updated.finishedAt) - new Date(build.startedAt);
    }
    this._builds.set(buildId, updated);
    this._broadcast('build:updated', { build: updated });
    return updated;
  }

  getBuildsForProject(projectId, limit = 20) {
    return [...this._builds.values()]
      .filter((b) => b.projectId === projectId)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, limit);
  }

  // ── Commit tracking ───────────────────────────────────────────────────

  recordCommit(projectId, data) {
    const id = uuidv4();
    const commit = {
      id,
      projectId,
      sha: data.sha || crypto.randomBytes(20).toString('hex'),
      message: String(data.message || '').slice(0, 2000),
      author: data.author || 'unknown',
      branch: data.branch || 'main',
      timestamp: data.timestamp || new Date().toISOString(),
      additions: data.additions || 0,
      deletions: data.deletions || 0,
      filesChanged: data.filesChanged || 0,
    };
    this._commits.set(id, commit);
    this._broadcast('commit:recorded', { commit });
    return commit;
  }

  getCommitsForProject(projectId, limit = 50) {
    return [...this._commits.values()]
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // ── Metrics / time-series ─────────────────────────────────────────────

  recordMetric(projectId, key, value, unit = '') {
    const series = this._metrics.get(projectId) || [];
    series.push({ key, value, unit, ts: new Date().toISOString() });
    if (series.length > 10_000) series.splice(0, 1_000);
    this._metrics.set(projectId, series);
    this._broadcast('metric:recorded', { projectId, key, value, unit });
  }

  getMetrics(projectId, key, limitPoints = 200) {
    const series = this._metrics.get(projectId) || [];
    return (key ? series.filter((m) => m.key === key) : series).slice(-limitPoints);
  }

  // ── Dashboard summary ─────────────────────────────────────────────────

  getDashboardSummary(userId) {
    const projects = this.listProjects(userId);
    const tasks = [...this._tasks.values()].filter(
      (t) => projects.some((p) => p.id === t.projectId)
    );
    const milestones = [...this._milestones.values()].filter(
      (m) => projects.some((p) => p.id === m.projectId)
    );
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TASK_STATUS.DONE
    );
    const upcomingMilestones = milestones
      .filter((m) => !m.completed && m.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
    const recentBuilds = [...this._builds.values()]
      .filter((b) => projects.some((p) => p.id === b.projectId))
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 10);

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === PROJECT_STATUS.ACTIVE).length,
      totalTasks: tasks.length,
      doneTasks: tasks.filter((t) => t.status === TASK_STATUS.DONE).length,
      overdueTasks: overdueTasks.length,
      upcomingMilestones,
      recentBuilds,
      projectsByType: Object.fromEntries(
        Object.values(PROJECT_TYPES).map((type) => [
          type, projects.filter((p) => p.type === type).length
        ])
      ),
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  _checkAccess(project, callerId) {
    if (project.ownerId !== callerId && !project.team.includes(callerId))
      throw new Error('Access denied');
  }

  _calcCompletion(projectId) {
    const tasks = this.getTasksForProject(projectId);
    if (!tasks.length) return 0;
    const done = tasks.filter((t) => t.status === TASK_STATUS.DONE).length;
    return Math.round((done / tasks.length) * 100);
  }

  _updateProjectCompletion(projectId) {
    const project = this._projects.get(projectId);
    if (!project) return;
    const pct = this._calcCompletion(projectId);
    this._projects.set(projectId, { ...project, completionPercent: pct, updatedAt: new Date().toISOString() });
  }
}

export default ProjectTrackerService;
