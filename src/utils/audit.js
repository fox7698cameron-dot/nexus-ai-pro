// File: audit.js | Date: 2026-06-16
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const MAX_ENTRIES = 50000;
const SEVERITIES = ['info', 'warn', 'error', 'critical'];

export class AuditLogger {
  constructor() {
    this._log = []; // Array of audit entries, oldest first
  }

  /**
   * Create and store an audit log entry.
   *
   * @param {string} event         - Event name/type (e.g. 'auth.login')
   * @param {string|null} userId   - User performing the action (null for system)
   * @param {object} details       - Additional context
   * @param {'info'|'warn'|'error'|'critical'} severity
   * @returns {object} The created audit entry
   */
  log(event, userId = null, details = {}, severity = 'info') {
    if (!SEVERITIES.includes(severity)) severity = 'info';

    const timestamp = Date.now();
    const dateLabel = new Date(timestamp).toISOString().slice(0, 10); // YYYY-MM-DD

    const hash = crypto
      .createHash('sha256')
      .update(`${event}:${timestamp}:${JSON.stringify(details)}`)
      .digest('hex');

    const entry = {
      id: uuidv4(),
      timestamp,
      dateLabel,
      event,
      userId,
      details,
      severity,
      hash,
    };

    this._log.push(entry);

    // Trim if over max
    if (this._log.length > MAX_ENTRIES) {
      this._log = this._log.slice(-MAX_ENTRIES);
    }

    return entry;
  }

  /**
   * Retrieve log entries matching optional filters.
   *
   * @param {object} filters
   * @param {string}  [filters.userId]
   * @param {string}  [filters.event]
   * @param {string}  [filters.severity]
   * @param {string}  [filters.from]   - ISO date string (inclusive)
   * @param {string}  [filters.to]     - ISO date string (inclusive)
   * @param {number}  [filters.limit=100]
   * @returns {object[]}
   */
  getLog({ userId, event, severity, from, to, limit = 100 } = {}) {
    let result = this._log;

    if (userId) result = result.filter(e => e.userId === userId);
    if (event) result = result.filter(e => e.event === event || e.event.startsWith(event));
    if (severity) result = result.filter(e => e.severity === severity);
    if (from) {
      const fromTs = new Date(from).getTime();
      result = result.filter(e => e.timestamp >= fromTs);
    }
    if (to) {
      const toTs = new Date(to).getTime() + 86400000; // Include end of day
      result = result.filter(e => e.timestamp <= toTs);
    }

    // Return most recent first
    return result.slice(-Math.min(limit, 5000)).reverse();
  }

  /**
   * Get the most recent N log entries.
   * @param {number} [limit=50]
   * @returns {object[]}
   */
  getRecentLog(limit = 50) {
    return this._log.slice(-Math.min(limit, 5000)).reverse();
  }

  /**
   * Remove entries older than daysToKeep days.
   * @param {number} [daysToKeep=90]
   * @returns {number} Number of entries removed
   */
  clearOld(daysToKeep = 90) {
    const cutoff = Date.now() - daysToKeep * 86400000;
    const before = this._log.length;
    this._log = this._log.filter(e => e.timestamp >= cutoff);
    return before - this._log.length;
  }

  /**
   * Total number of stored log entries.
   */
  get size() {
    return this._log.length;
  }
}

export default new AuditLogger();
