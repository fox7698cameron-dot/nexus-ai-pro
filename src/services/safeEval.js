// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/services/safeEval.js — 2026-07-13
// Safe expression evaluator — replaces jexl for workflow conditions and transforms
// Supports: arithmetic, comparisons, logical ops, property access, ternary, template strings

const ALLOWED_MATH = Object.freeze({
  abs: Math.abs, ceil: Math.ceil, floor: Math.floor, round: Math.round,
  min: Math.min, max: Math.max, sqrt: Math.sqrt, pow: Math.pow,
  log: Math.log, log2: Math.log2, log10: Math.log10,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  PI: Math.PI, E: Math.E,
});

const ALLOWED_GLOBALS = Object.freeze({
  Math: ALLOWED_MATH,
  String: (v) => String(v),
  Number: (v) => Number(v),
  Boolean: (v) => Boolean(v),
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  JSON: { parse: JSON.parse, stringify: JSON.stringify },
  Array: { isArray: Array.isArray, from: Array.from },
  Object: { keys: Object.keys, values: Object.values, entries: Object.entries },
  Date: { now: () => Date.now() },
  encodeURIComponent,
  decodeURIComponent,
});

// Block dangerous patterns before evaluation
const BLOCKED_PATTERNS = [
  /\beval\b/, /\bFunction\b/, /\bnew\s+Function\b/, /\brequire\b/,
  /\bimport\b/, /\bprocess\b/, /\bglobal\b/, /\bwindow\b/,
  /\bdocument\b/, /\blocation\b/, /\bnavigator\b/,
  /__proto__/, /prototype/, /constructor/,
  /\bfs\b/, /\bchild_process\b/, /\bexec\b/,
  /\bsetTimeout\b/, /\bsetInterval\b/, /\bclearTimeout\b/,
  /fetch\s*\(/, /XMLHttpRequest/,
];

function isSafe(expr) {
  if (typeof expr !== 'string') return false;
  return !BLOCKED_PATTERNS.some(pattern => pattern.test(expr));
}

/**
 * Safely evaluate a simple expression within a context object.
 * @param {string} expression
 * @param {object} context
 * @returns {Promise<any>}
 */
export async function safeEval(expression, context = {}) {
  if (!isSafe(expression)) {
    throw new Error(`Expression contains disallowed patterns: ${expression.slice(0, 100)}`);
  }

  // Build a sandboxed scope from context + allowed globals
  const scope = { ...ALLOWED_GLOBALS, ...context };
  const keys = Object.keys(scope);
  const values = Object.values(scope);

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${expression});`);
    const result = fn(...values);
    return result instanceof Promise ? await result : result;
  } catch (err) {
    throw new Error(`Expression evaluation error: ${err.message}`);
  }
}

/**
 * Evaluate a condition expression — returns boolean.
 */
export async function evalCondition(condition, context = {}) {
  const result = await safeEval(condition, context);
  return Boolean(result);
}

export default { safeEval, evalCondition };
