// ================================================
// File:        src/services/reasoning-tiers.js
// Purpose:     Reasoning-tier policy — maps mini / mid / max / enterprise
//              to concrete model + token budget + tool ceilings.  Called
//              from the /api/chat route to shape the LLM request.
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// ================================================

export const REASONING_TIERS = Object.freeze({
  mini: {
    label: 'Mini — fastest, cheapest',
    maxTokens: 1024,
    temperature: 0.4,
    toolLimit: 2,
    parallel: 1,
    thinkingBudgetMs: 500
  },
  mid: {
    label: 'Mid — everyday balanced',
    maxTokens: 4096,
    temperature: 0.6,
    toolLimit: 8,
    parallel: 4,
    thinkingBudgetMs: 2500
  },
  max: {
    label: 'Max — deep multi-step',
    maxTokens: 16_384,
    temperature: 0.7,
    toolLimit: 24,
    parallel: 8,
    thinkingBudgetMs: 15_000
  },
  enterprise: {
    label: 'Enterprise — full context, audit-ready',
    maxTokens: 65_536,
    temperature: 0.5,
    toolLimit: 128,
    parallel: 16,
    thinkingBudgetMs: 60_000
  }
});

export function resolveReasoningTier(name) {
  if (!name) return REASONING_TIERS.mid;
  return REASONING_TIERS[String(name).toLowerCase()] || REASONING_TIERS.mid;
}

export function listReasoningTiers() {
  return Object.entries(REASONING_TIERS).map(([id, cfg]) => ({ id, ...cfg }));
}
