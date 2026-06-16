// File: projectService.js | Date: 2026-06-16
import { v4 as uuidv4 } from 'uuid';

const PROJECT_TYPES = ['webapp', 'mobile', 'desktop', 'api', 'gamedev', 'arvr', '3d', 'library'];
const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const BUILD_STATUSES = ['pending', 'running', 'success', 'failed', 'cancelled'];

// In-memory stores
const projects = new Map();     // projectId → project
const userProjects = new Map(); // userId → Set<projectId>

function now() { return new Date().toISOString(); }

export class ProjectService {
  /**
   * Create a new project.
   */
  createProject(userId, data) {
    const { name, type, description = '', stack = [], tags = [], platform = [], language = [] } = data;

    if (!name || !type) throw new Error('Project name and type are required');
    if (!PROJECT_TYPES.includes(type)) {
      throw new Error(`Invalid project type. Valid: ${PROJECT_TYPES.join(', ')}`);
    }

    const projectId = uuidv4();
    const project = {
      id: projectId,
      userId,
      name,
      type,
      description,
      stack,
      tags,
      platform,
      language,
      status: 'active',
      milestones: [],
      tasks: [],
      activity: [],
      builds: [],
      createdAt: now(),
      updatedAt: now(),
    };

    projects.set(projectId, project);
    if (!userProjects.has(userId)) userProjects.set(userId, new Set());
    userProjects.get(userId).add(projectId);

    return project;
  }

  /**
   * Get a project by ID.
   */
  getProject(projectId) {
    const project = projects.get(projectId);
    if (!project) throw new Error('Project not found');
    return project;
  }

  /**
   * Get all projects for a user with optional filtering.
   */
  getUserProjects(userId, filter = {}) {
    const ids = userProjects.get(userId) || new Set();
    let result = [...ids].map(id => projects.get(id)).filter(Boolean);

    if (filter.type) result = result.filter(p => p.type === filter.type);
    if (filter.status) result = result.filter(p => p.status === filter.status);
    if (filter.tag) result = result.filter(p => p.tags.includes(filter.tag));

    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Update project fields.
   */
  updateProject(projectId, updates) {
    const project = this.getProject(projectId);
    const allowed = ['name', 'description', 'stack', 'tags', 'platform', 'language', 'status'];
    for (const key of allowed) {
      if (updates[key] !== undefined) project[key] = updates[key];
    }
    project.updatedAt = now();
    return project;
  }

  /**
   * Delete a project.
   */
  deleteProject(projectId) {
    const project = this.getProject(projectId);
    projects.delete(projectId);
    const ids = userProjects.get(project.userId);
    if (ids) ids.delete(projectId);
    return { success: true };
  }

  /**
   * Add a milestone to a project.
   */
  addMilestone(projectId, milestone) {
    const project = this.getProject(projectId);
    const { name, description = '', dueDate, priority = 'medium' } = milestone;

    if (!name) throw new Error('Milestone name is required');

    const entry = {
      id: uuidv4(),
      name,
      description,
      dueDate,
      priority,
      status: 'pending',
      createdAt: now(),
    };

    project.milestones.push(entry);
    project.updatedAt = now();
    this._logActivity(project, { type: 'milestone_added', description: `Milestone "${name}" added`, metadata: { milestoneId: entry.id } });

    return entry;
  }

  /**
   * Update a milestone.
   */
  updateMilestone(projectId, milestoneId, updates) {
    const project = this.getProject(projectId);
    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    const allowed = ['name', 'description', 'dueDate', 'priority', 'status'];
    for (const key of allowed) {
      if (updates[key] !== undefined) milestone[key] = updates[key];
    }
    milestone.updatedAt = now();
    project.updatedAt = now();

    return milestone;
  }

  /**
   * Add a task to a project.
   */
  addTask(projectId, task) {
    const project = this.getProject(projectId);
    const { name, description = '', assignee, priority = 'medium', status = 'todo', dueDate, codeFile, lineNumber } = task;

    if (!name) throw new Error('Task name is required');
    if (!TASK_STATUSES.includes(status)) throw new Error(`Invalid status. Valid: ${TASK_STATUSES.join(', ')}`);
    if (!TASK_PRIORITIES.includes(priority)) throw new Error(`Invalid priority. Valid: ${TASK_PRIORITIES.join(', ')}`);

    const entry = {
      id: uuidv4(),
      name,
      description,
      assignee,
      priority,
      status,
      dueDate,
      codeFile,
      lineNumber,
      createdAt: now(),
      updatedAt: now(),
    };

    project.tasks.push(entry);
    project.updatedAt = now();
    this._logActivity(project, { type: 'task_added', description: `Task "${name}" added`, metadata: { taskId: entry.id } });

    return entry;
  }

  /**
   * Update a task.
   */
  updateTask(projectId, taskId, updates) {
    const project = this.getProject(projectId);
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const allowed = ['name', 'description', 'assignee', 'priority', 'status', 'dueDate', 'codeFile', 'lineNumber'];
    for (const key of allowed) {
      if (updates[key] !== undefined) task[key] = updates[key];
    }
    task.updatedAt = now();
    project.updatedAt = now();

    return task;
  }

  /**
   * Log a project activity entry.
   */
  logActivity(projectId, activity) {
    const project = this.getProject(projectId);
    return this._logActivity(project, activity);
  }

  /**
   * Get project activity log.
   */
  getActivity(projectId, limit = 50) {
    const project = this.getProject(projectId);
    return project.activity.slice(-Math.min(limit, 200)).reverse();
  }

  /**
   * Get project statistics.
   */
  getProjectStats(projectId) {
    const project = this.getProject(projectId);
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = project.tasks.filter(t => t.status === 'in_progress').length;
    const blockedTasks = project.tasks.filter(t => t.status === 'blocked').length;

    const overdueTasks = project.tasks.filter(t => {
      return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done';
    }).length;

    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const recentBuilds = project.builds.slice(-10);
    const successBuilds = recentBuilds.filter(b => b.status === 'success').length;
    const buildSuccessRate = recentBuilds.length ? Math.round((successBuilds / recentBuilds.length) * 100) : null;

    let riskLevel = 'low';
    if (blockedTasks > 2 || overdueTasks > 3) riskLevel = 'high';
    else if (blockedTasks > 0 || overdueTasks > 0) riskLevel = 'medium';

    return {
      projectId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      overdueTasks,
      completionRate,
      totalMilestones: project.milestones.length,
      completedMilestones: project.milestones.filter(m => m.status === 'completed').length,
      totalBuilds: project.builds.length,
      buildSuccessRate,
      riskLevel,
      burndown: this._computeBurndown(project),
      velocity: this._computeVelocity(project),
    };
  }

  /**
   * Track a build event.
   */
  trackBuild(projectId, buildData) {
    const project = this.getProject(projectId);
    const { status, duration, errors = [], warnings = [], platform: buildPlatform, version } = buildData;

    if (!BUILD_STATUSES.includes(status)) {
      throw new Error(`Invalid build status. Valid: ${BUILD_STATUSES.join(', ')}`);
    }

    const build = {
      id: uuidv4(),
      status,
      duration,
      errors,
      warnings,
      platform: buildPlatform,
      version,
      timestamp: now(),
    };

    project.builds.push(build);
    if (project.builds.length > 100) project.builds = project.builds.slice(-100);
    project.updatedAt = now();

    return build;
  }

  /**
   * Get real-time project metrics.
   */
  getRealTimeMetrics(projectId) {
    const project = this.getProject(projectId);
    const latestBuild = project.builds[project.builds.length - 1] || null;

    return {
      projectId,
      activeDevelopers: Math.floor(Math.random() * 5),
      openPRs: Math.floor(Math.random() * 10),
      latestBuild: latestBuild ? { status: latestBuild.status, timestamp: latestBuild.timestamp } : null,
      buildQueue: Math.floor(Math.random() * 3),
      activeTests: Math.floor(Math.random() * 20),
      timestamp: now(),
    };
  }

  // --- Internal helpers ---

  _logActivity(project, activity) {
    const entry = {
      id: uuidv4(),
      type: activity.type || 'generic',
      description: activity.description || '',
      metadata: activity.metadata || {},
      timestamp: now(),
    };
    project.activity.push(entry);
    if (project.activity.length > 500) project.activity = project.activity.slice(-500);
    return entry;
  }

  _computeBurndown(project) {
    // Simple burndown: remaining tasks per day over last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const remaining = project.tasks.filter(t =>
        t.status !== 'done' || (t.updatedAt && t.updatedAt.slice(0, 10) > date)
      ).length;
      days.push({ date, remaining });
    }
    return days;
  }

  _computeVelocity(project) {
    // Tasks completed in last 7 days
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    return project.tasks.filter(t => t.status === 'done' && t.updatedAt > cutoff).length;
  }
}

export default new ProjectService();
