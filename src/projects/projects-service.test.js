// src/projects/projects-service.test.js
// 2026-06-12 | Nexus AI Pro — Projects Service Tests

import { describe, it, expect } from 'vitest';
import { ProjectsService, PROJECT_TYPES, GAME_CONNECTORS } from './projects-service.js';

const UID = 'test-user-123';

describe('ProjectsService', () => {
  describe('createProject', () => {
    it('creates a code project', () => {
      const p = ProjectsService.createProject({ userId: UID, name: 'My API', type: 'code', subtype: 'api', description: 'REST API' });
      expect(p.id).toBeTruthy();
      expect(p.type).toBe('code');
      expect(p.progress).toBe(0);
      expect(p.status).toBe('active');
    });

    it('creates a game project', () => {
      const p = ProjectsService.createProject({ userId: UID, name: 'Space Shooter', type: 'game', subtype: '3d', engine: 'unreal' });
      expect(p.type).toBe('game');
    });

    it('creates an AR/VR project', () => {
      const p = ProjectsService.createProject({ userId: UID, name: 'VR Experience', type: 'ar_vr', subtype: 'vr' });
      expect(p.type).toBe('ar_vr');
    });

    it('throws on unknown type', () => {
      expect(() => ProjectsService.createProject({ userId: UID, name: 'Bad', type: 'unknown' })).toThrow();
    });
  });

  describe('milestones', () => {
    it('completes a milestone and updates progress', () => {
      const p = ProjectsService.createProject({
        userId: UID, name: 'Milestone Test', type: 'code',
        milestones: [{ title: 'Setup', dueDate: null }, { title: 'Deploy', dueDate: null }]
      });
      const updated = ProjectsService.completeMilestone(p.id, p.milestones[0].id);
      expect(updated.milestones[0].completed).toBe(true);
      expect(updated.progress).toBe(50);
    });

    it('sets status to completed when all milestones done', () => {
      const p = ProjectsService.createProject({
        userId: UID, name: 'Done Test', type: 'code',
        milestones: [{ title: 'Only step', dueDate: null }]
      });
      const updated = ProjectsService.completeMilestone(p.id, p.milestones[0].id);
      expect(updated.progress).toBe(100);
      expect(updated.status).toBe('completed');
    });
  });

  describe('achievements', () => {
    it('grants and retrieves achievements', () => {
      const ach = ProjectsService.grantAchievement({ userId: 'ach-user', projectId: 'p1', title: 'First!', description: 'First project', xp: 25 });
      expect(ach.xp).toBe(25);
      const all = ProjectsService.getAchievements('ach-user');
      expect(all.length).toBeGreaterThan(0);
      expect(ProjectsService.getTotalXP('ach-user')).toBeGreaterThanOrEqual(25);
    });
  });

  describe('listProjects / stats', () => {
    it('filters by type', () => {
      const uid = 'filter-user';
      ProjectsService.createProject({ userId: uid, name: 'Code 1', type: 'code' });
      ProjectsService.createProject({ userId: uid, name: 'Game 1', type: 'game' });
      const codeOnly = ProjectsService.listProjects(uid, { type: 'code' });
      expect(codeOnly.every(p => p.type === 'code')).toBe(true);
    });

    it('returns stats', () => {
      const uid = 'stats-user';
      ProjectsService.createProject({ userId: uid, name: 'S1', type: 'code' });
      const stats = ProjectsService.getProjectStats(uid);
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.avgProgress).toBe('number');
    });
  });

  describe('constants', () => {
    it('exports all project types', () => {
      expect(Object.keys(PROJECT_TYPES)).toContain('code');
      expect(Object.keys(PROJECT_TYPES)).toContain('game');
      expect(Object.keys(PROJECT_TYPES)).toContain('ar_vr');
    });

    it('exports game connectors', () => {
      expect(GAME_CONNECTORS.unreal.name).toContain('Unreal');
      expect(GAME_CONNECTORS.sony.envKey).toBe('SONY_PSN_TOKEN');
    });
  });
});
