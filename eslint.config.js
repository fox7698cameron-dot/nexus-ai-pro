/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**', 'node_modules/**', 'build/**', '.git/**',
      'nexus-ai-pro/**', 'capacitor/**', 'desktop/**', 'multiplatform/**',
      'dev-dist/**',                // Generated service worker build artifacts
      'src/network/p2p.js',         // Third-party p2p module
      'src/security/index.ts',      // TypeScript — not linted by eslint .js
      'scripts/add-copyright.js'    // Build script with intentional patterns
    ]
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'always'],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'indent': ['warn', 2],
      'comma-dangle': ['warn', 'never'],
      'no-trailing-spaces': 'warn'
    }
  }
];
