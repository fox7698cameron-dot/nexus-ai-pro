/**
 * vitest.config.js
 * Nexus AI Pro — Vitest configuration
 * Date: 2026-08-28
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environment
    environment: 'node',

    // Test file patterns
    include: [
      'src/**/*.test.{js,ts,jsx,tsx}',
      'tests/**/*.test.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'dev-dist/**',
    ],

    // Coverage
    coverage: {
      provider:     'v8',
      reporter:     ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{js,ts}',
        'server.js',
      ],
      exclude: [
        'src/**/*.test.{js,ts}',
        'src/**/*.d.ts',
        'node_modules/**',
      ],
      thresholds: {
        lines:      70,
        functions:  70,
        branches:   60,
        statements: 70,
      },
    },

    // Globals (no need to import describe/it/expect)
    globals: true,

    // Timeouts
    testTimeout:  10_000,
    hookTimeout:  10_000,
  },
});
