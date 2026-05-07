// index.js — 2026-05-07
// Gaming module — barrel re-exports

export {
  GameTrackingService,
  PLATFORM_IDS,
  PROJECT_TYPES,
  STATUS_CODES,
  ACHIEVEMENT_RARITY,
  ACHIEVEMENT_CATALOG,
} from './gameTrackingService.js';

export { default as GameDashboard } from './GameDashboard.jsx';
