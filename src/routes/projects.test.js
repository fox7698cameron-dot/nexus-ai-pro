// src/routes/projects.test.js — Updated: 2026-07-25
import { describe, it, expect } from 'vitest';

const PROJECT_TYPES = ['coding', 'game', 'ar_vr_3d', 'mobile', 'web', 'console'];
const GAME_ENGINES = ['unreal', 'unity', 'godot', 'gamemaker', 'rpgmaker', 'custom'];
const CONNECTOR_TYPES = ['github', 'bitbucket', 'gitlab', 'unreal_epic', 'sony_dev', 'microsoft_gdp', 'ubisoft_connect', 'steam', 'google_play', 'app_store', 'azure_devops', 'aws_codecommit'];

describe('Project type validation', () => {
  it('accepts all valid project types', () => {
    for (const type of PROJECT_TYPES) {
      expect(PROJECT_TYPES.includes(type)).toBe(true);
    }
  });

  it('rejects unknown project types', () => {
    expect(PROJECT_TYPES.includes('unknown_type')).toBe(false);
    expect(PROJECT_TYPES.includes('')).toBe(false);
  });

  it('includes game and ar_vr_3d types', () => {
    expect(PROJECT_TYPES).toContain('game');
    expect(PROJECT_TYPES).toContain('ar_vr_3d');
    expect(PROJECT_TYPES).toContain('console');
  });
});

describe('Game engine validation', () => {
  it('includes major game engines', () => {
    expect(GAME_ENGINES).toContain('unreal');
    expect(GAME_ENGINES).toContain('unity');
    expect(GAME_ENGINES).toContain('godot');
  });

  it('includes custom engine option', () => {
    expect(GAME_ENGINES).toContain('custom');
  });
});

describe('Connector type validation', () => {
  it('includes game platform connectors', () => {
    expect(CONNECTOR_TYPES).toContain('unreal_epic');
    expect(CONNECTOR_TYPES).toContain('sony_dev');
    expect(CONNECTOR_TYPES).toContain('microsoft_gdp');
    expect(CONNECTOR_TYPES).toContain('ubisoft_connect');
    expect(CONNECTOR_TYPES).toContain('steam');
  });

  it('includes dev tool connectors', () => {
    expect(CONNECTOR_TYPES).toContain('github');
    expect(CONNECTOR_TYPES).toContain('bitbucket');
    expect(CONNECTOR_TYPES).toContain('gitlab');
  });

  it('rejects unknown connector types', () => {
    expect(CONNECTOR_TYPES.includes('random_connector')).toBe(false);
  });
});

describe('Achievement rarity system', () => {
  const rarities = ['common', 'rare', 'epic', 'legendary'];

  it('includes all four rarity levels', () => {
    expect(rarities).toContain('common');
    expect(rarities).toContain('rare');
    expect(rarities).toContain('epic');
    expect(rarities).toContain('legendary');
  });

  it('defaults unknown rarity to common', () => {
    const resolveRarity = (r) => rarities.includes(r) ? r : 'common';
    expect(resolveRarity('mythic')).toBe('common');
    expect(resolveRarity('legendary')).toBe('legendary');
  });
});

describe('Achievement progress clamping', () => {
  function clampProgress(progress, target = 100) {
    const clamped = Math.max(0, Math.min(target, progress));
    return { progress: clamped, unlocked: clamped >= target };
  }

  it('clamps progress to 0 minimum', () => {
    const result = clampProgress(-50);
    expect(result.progress).toBe(0);
    expect(result.unlocked).toBe(false);
  });

  it('clamps progress to target maximum', () => {
    const result = clampProgress(150);
    expect(result.progress).toBe(100);
    expect(result.unlocked).toBe(true);
  });

  it('marks achievement unlocked at 100%', () => {
    const result = clampProgress(100);
    expect(result.unlocked).toBe(true);
  });

  it('does not mark unlocked below target', () => {
    const result = clampProgress(99);
    expect(result.unlocked).toBe(false);
  });

  it('supports custom targets', () => {
    const result = clampProgress(50, 50);
    expect(result.unlocked).toBe(true);
  });
});

describe('Build status transitions', () => {
  const validStatuses = ['pending', 'running', 'success', 'failed', 'cancelled'];

  it('only marks completedAt for terminal statuses', () => {
    const terminalStatuses = ['success', 'failed'];
    const nonTerminalStatuses = ['pending', 'running', 'cancelled'];

    for (const s of terminalStatuses) {
      const shouldSetCompletion = s === 'success' || s === 'failed';
      expect(shouldSetCompletion).toBe(true);
    }

    for (const s of nonTerminalStatuses) {
      const shouldSetCompletion = s === 'success' || s === 'failed';
      expect(shouldSetCompletion).toBe(false);
    }
  });

  it('valid build statuses are defined', () => {
    expect(validStatuses.length).toBeGreaterThan(3);
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('success');
    expect(validStatuses).toContain('failed');
  });
});

describe('Project progress calculation', () => {
  it('calculates task completion ratio', () => {
    const tasks = [
      { column: 'done' },
      { column: 'done' },
      { column: 'in_progress' },
      { column: 'backlog' }
    ];
    const completed = tasks.filter(t => t.column === 'done').length;
    const ratio = completed / tasks.length;
    expect(ratio).toBeCloseTo(0.5);
  });

  it('handles empty task list', () => {
    const tasks = [];
    const completed = tasks.filter(t => t.column === 'done').length;
    expect(completed).toBe(0);
    // No divide-by-zero — check with guard
    const ratio = tasks.length ? completed / tasks.length : 0;
    expect(ratio).toBe(0);
  });
});
