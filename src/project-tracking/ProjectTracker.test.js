/**
 * src/project-tracking/ProjectTracker.test.js
 * Unit tests for ProjectTracker
 * Date: 2026-08-28
 */
import { describe, it, expect } from 'vitest';
import {
  createProject,
  getProject,
  updateProject,
  listProjects,
  createMilestone,
  getMilestonesByProject,
  createTask,
  getTasksByProject,
  updateTask,
  startCodingSession,
  endCodingSession,
  registerAchievement,
  unlockAchievement,
  getUserAchievements,
  getAchievementProgress,
  getProjectAnalytics,
  PROJECT_TYPES,
  GAME_ENGINES,
  TARGET_PLATFORMS,
} from './ProjectTracker.js';

describe('Project types & engines', () => {
  it('includes VR, AR, and XR types', () => {
    expect(PROJECT_TYPES.VR).toBeDefined();
    expect(PROJECT_TYPES.AR).toBeDefined();
    expect(PROJECT_TYPES.XR).toBeDefined();
  });
  it('includes major game engines', () => {
    expect(GAME_ENGINES.UNREAL).toBeDefined();
    expect(GAME_ENGINES.UNITY).toBeDefined();
    expect(GAME_ENGINES.GODOT).toBeDefined();
  });
  it('includes major target platforms', () => {
    expect(TARGET_PLATFORMS.PC).toBeDefined();
    expect(TARGET_PLATFORMS.IOS).toBeDefined();
    expect(TARGET_PLATFORMS.ANDROID).toBeDefined();
    expect(TARGET_PLATFORMS.VR_QUEST).toBeDefined();
  });
});

describe('Projects', () => {
  const uid = 'test-user-proj';

  it('creates and retrieves a project', () => {
    const p = createProject({ userId: uid, name: 'My Game', type: 'game_3d', description: 'A test game' });
    expect(p.id).toBeTruthy();
    expect(p.status).toBe('active');
    expect(getProject(p.id)).toEqual(p);
  });

  it('lists projects by user', () => {
    createProject({ userId: uid, name: 'Web App', type: 'web' });
    const list = listProjects(uid);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.every(p => p.userId === uid)).toBe(true);
  });

  it('updates a project', () => {
    const p       = createProject({ userId: uid, name: 'VR World', type: 'vr' });
    const updated = updateProject(p.id, { progress: 50, linesOfCode: 1000 });
    expect(updated.progress).toBe(50);
    expect(updated.linesOfCode).toBe(1000);
  });
});

describe('Tasks', () => {
  it('creates and retrieves tasks', () => {
    const p = createProject({ userId: 'u', name: 'Task Test', type: 'web' });
    createTask({ projectId: p.id, title: 'Setup repo', priority: 'high' });
    createTask({ projectId: p.id, title: 'Build login', priority: 'medium', labels: ['auth'] });
    const tasks = getTasksByProject(p.id);
    expect(tasks.length).toBe(2);
  });

  it('updates task status', () => {
    const p    = createProject({ userId: 'u', name: 'T2', type: 'web' });
    const task = createTask({ projectId: p.id, title: 'Do thing', priority: 'low' });
    const updated = updateTask(task.id, { status: 'done' });
    expect(updated.status).toBe('done');
    expect(updated.completedAt).toBeTruthy();
  });
});

describe('Milestones', () => {
  it('creates and retrieves milestones', () => {
    const p = createProject({ userId: 'u', name: 'M1', type: 'game_2d' });
    createMilestone({ projectId: p.id, name: 'Alpha', dueDate: '2026-12-01' });
    createMilestone({ projectId: p.id, name: 'Beta',  dueDate: '2027-01-01' });
    const ms = getMilestonesByProject(p.id);
    expect(ms.length).toBe(2);
  });
});

describe('Coding sessions', () => {
  it('starts and ends a session', () => {
    const p = createProject({ userId: 'u', name: 'Sessions', type: 'api' });
    const s = startCodingSession({ userId: 'u', projectId: p.id, language: 'javascript' });
    expect(s.id).toBeTruthy();
    const ended = endCodingSession(s.id, { linesAdded: 120, linesRemoved: 10 });
    expect(ended.linesAdded).toBe(120);
    expect(ended.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('Achievements', () => {
  it('unlocks and retrieves achievements', () => {
    registerAchievement({ id: 'test_ach', name: 'Test', description: 'A test achievement', icon: '🏅', points: 5 });
    const result = unlockAchievement('user-ach', 'test_ach');
    expect(result.unlocked).toBe(true);
    const achs = getUserAchievements('user-ach');
    expect(achs.some(a => a.id === 'test_ach')).toBe(true);
  });

  it('does not double-unlock', () => {
    registerAchievement({ id: 'double', name: 'Double', description: '', icon: '🏅', points: 5 });
    unlockAchievement('user-dbl', 'double');
    const second = unlockAchievement('user-dbl', 'double');
    expect(second.alreadyUnlocked).toBe(true);
  });

  it('computes progress correctly', () => {
    const progress = getAchievementProgress('user-ach');
    expect(progress.unlocked).toBeGreaterThanOrEqual(1);
    expect(progress.points).toBeGreaterThan(0);
  });
});

describe('Project analytics', () => {
  it('returns null for unknown project', () => {
    expect(getProjectAnalytics('nonexistent')).toBeNull();
  });

  it('returns analytics with task summary', () => {
    const p = createProject({ userId: 'u', name: 'Analytics', type: 'web' });
    createTask({ projectId: p.id, title: 'T1', priority: 'high' });
    const t2 = createTask({ projectId: p.id, title: 'T2', priority: 'low' });
    updateTask(t2.id, { status: 'done' });
    const analytics = getProjectAnalytics(p.id);
    expect(analytics).not.toBeNull();
    expect(analytics.taskSummary.total).toBe(2);
    expect(analytics.taskSummary.done).toBe(1);
  });
});
