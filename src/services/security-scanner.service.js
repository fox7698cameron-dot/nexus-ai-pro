// src/services/security-scanner.service.js
// Real-time security scanning — network, on-device, dependency, config checks
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import crypto from 'crypto';
import os from 'os';
import { EventEmitter } from 'events';
import { AUDIT_EVENTS } from '../config/constants.js';
import { logAuditEvent } from './audit.service.js';

export const scanEvents = new EventEmitter();

// Severity enumeration — never use raw strings for comparisons
export const SEVERITY = Object.freeze({ INFO: 'info', LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' });

// Category enumeration
export const SCAN_CATEGORY = Object.freeze({
  NETWORK: 'network',
  AUTH: 'auth',
  ENCRYPTION: 'encryption',
  DEPENDENCY: 'dependency',
  CONFIG: 'config',
  FILE_SYSTEM: 'file_system',
  PROCESS: 'process',
  MEMORY: 'memory',
});

class SecurityScanner {
  #scans = new Map();
  #alerts = [];
  #lastFullScan = null;
  #score = 100;

  async runScan(scanType = 'full', userId = null) {
    const scanId = crypto.randomUUID();
    const scan = {
      id: scanId,
      userId,
      scanType,
      status: 'running',
      findings: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    this.#scans.set(scanId, scan);
    scanEvents.emit('scan:started', { scanId, scanType });

    try {
      const findings = await this.#executeScan(scanType);
      scan.findings = findings;
      scan.status = 'completed';
      scan.completedAt = new Date().toISOString();
      scan.score = this.#calculateScore(findings);
      this.#score = scan.score;
      this.#lastFullScan = scan.completedAt;

      // Emit alerts for high/critical findings
      for (const f of findings) {
        if (f.severity === SEVERITY.HIGH || f.severity === SEVERITY.CRITICAL) {
          const alert = { id: crypto.randomUUID(), scanId, ...f, isResolved: false, createdAt: new Date().toISOString() };
          this.#alerts.push(alert);
          scanEvents.emit('security:alert', alert);
        }
      }

      logAuditEvent({ userId, event: AUDIT_EVENTS.SECURITY_SCAN, metadata: { scanId, score: scan.score, findingCount: findings.length } });
      scanEvents.emit('scan:completed', scan);
      return scan;
    } catch (err) {
      scan.status = 'failed';
      scan.error = err.message;
      scanEvents.emit('scan:failed', { scanId, error: err.message });
      return scan;
    }
  }

  async #executeScan(scanType) {
    const checks = {
      full: ['network', 'auth', 'encryption', 'config', 'process', 'memory'],
      network: ['network'],
      quick: ['auth', 'config'],
    };
    const toRun = checks[scanType] ?? checks.quick;
    const results = await Promise.all(toRun.map(c => this.#runCheck(c)));
    return results.flat();
  }

  async #runCheck(category) {
    switch (category) {
      case 'network': return this.#checkNetwork();
      case 'auth': return this.#checkAuth();
      case 'encryption': return this.#checkEncryption();
      case 'config': return this.#checkConfig();
      case 'process': return this.#checkProcess();
      case 'memory': return this.#checkMemory();
      default: return [];
    }
  }

  #checkNetwork() {
    const findings = [];
    const interfaces = os.networkInterfaces();
    let hasExternalIface = false;

    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of (addrs ?? [])) {
        if (!addr.internal) {
          hasExternalIface = true;
          if (addr.family === 'IPv6' && addr.address.startsWith('::')) {
            findings.push({
              id: crypto.randomUUID(),
              category: SCAN_CATEGORY.NETWORK,
              severity: SEVERITY.LOW,
              title: `Wildcard IPv6 binding on ${name}`,
              description: 'Interface is bound to all IPv6 addresses. Restrict if not required.',
              remediation: 'Bind server to specific interface or 127.0.0.1 for local-only services.',
            });
          }
        }
      }
    }

    if (!hasExternalIface) {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.NETWORK,
        severity: SEVERITY.INFO,
        title: 'No external network interfaces detected',
        description: 'Server appears to be in a sandboxed or container network.',
        remediation: 'No action required for development environments.',
      });
    }

    return findings;
  }

  #checkAuth() {
    const findings = [];
    const jwtSecret = process.env.JWT_SECRET ?? '';
    if (jwtSecret.length < 32) {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.AUTH,
        severity: SEVERITY.CRITICAL,
        title: 'JWT secret too short',
        description: `JWT_SECRET is ${jwtSecret.length} chars. Minimum 32 required.`,
        remediation: 'Set JWT_SECRET to a cryptographically random 64+ character string.',
      });
    }
    if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN === '*') {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.CONFIG,
        severity: SEVERITY.HIGH,
        title: 'Wildcard CORS in production',
        description: 'CORS_ORIGIN=* allows any origin in production.',
        remediation: 'Set CORS_ORIGIN to specific allowed domains.',
      });
    }
    return findings;
  }

  #checkEncryption() {
    const findings = [];
    const secret = process.env.ENCRYPTION_SECRET ?? '';
    if (secret.length < 32 || secret.includes('change')) {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.ENCRYPTION,
        severity: SEVERITY.CRITICAL,
        title: 'Weak or default encryption secret',
        description: 'ENCRYPTION_SECRET appears to be a default or weak value.',
        remediation: 'Run: openssl rand -hex 32 and set as ENCRYPTION_SECRET.',
      });
    }
    return findings;
  }

  #checkConfig() {
    const findings = [];
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.CONFIG,
        severity: SEVERITY.MEDIUM,
        title: 'Unknown NODE_ENV value',
        description: `NODE_ENV="${process.env.NODE_ENV}" is unexpected.`,
        remediation: 'Set NODE_ENV to production, development, or test.',
      });
    }
    return findings;
  }

  #checkProcess() {
    const findings = [];
    if (process.getuid?.() === 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.PROCESS,
        severity: SEVERITY.HIGH,
        title: 'Running as root',
        description: 'The Node.js process is running as UID 0 (root). This is a security risk.',
        remediation: 'Run as a non-privileged user (e.g., UID 1000).',
      });
    }
    return findings;
  }

  #checkMemory() {
    const findings = [];
    const { heapUsed, heapTotal } = process.memoryUsage();
    const usagePct = (heapUsed / heapTotal) * 100;
    if (usagePct > 90) {
      findings.push({
        id: crypto.randomUUID(),
        category: SCAN_CATEGORY.MEMORY,
        severity: SEVERITY.HIGH,
        title: 'High heap memory usage',
        description: `Heap usage at ${usagePct.toFixed(1)}% — potential memory leak or DoS condition.`,
        remediation: 'Profile memory usage and check for leaks.',
      });
    }
    return findings;
  }

  #calculateScore(findings) {
    const deductions = { critical: 25, high: 15, medium: 7, low: 3, info: 0 };
    const total = findings.reduce((acc, f) => acc + (deductions[f.severity] ?? 0), 0);
    return Math.max(0, 100 - total);
  }

  getScore() { return this.#score; }
  getAlerts(limit = 50) { return this.#alerts.slice(-limit).reverse(); }
  getScan(scanId) { return this.#scans.get(scanId); }
  getLastScanTime() { return this.#lastFullScan; }
  resolveAlert(alertId) {
    const alert = this.#alerts.find(a => a.id === alertId);
    if (alert) { alert.isResolved = true; alert.resolvedAt = new Date().toISOString(); }
    return alert;
  }
}

export const securityScanner = new SecurityScanner();
