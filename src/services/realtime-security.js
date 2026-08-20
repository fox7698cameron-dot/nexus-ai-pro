// ================================================
// File:        src/services/realtime-security.js
// Purpose:     Real-time security posture service:
//                • dependency vulnerability polling
//                • network reachability + latency probing
//                • on-device (host) health probing (cpu, mem, disk)
//                • event stream for the security dashboard
//              All findings flow through the audit logger with structured,
//              minimal (privacy-preserving) fields.
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// ================================================

import { EventEmitter } from 'events';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

/** @typedef {'ok'|'warn'|'critical'} Severity */

const NETWORK_PROBES = [
  { name: 'dns-cloudflare', host: '1.1.1.1', port: 53 },
  { name: 'https-github', host: 'api.github.com', port: 443 },
  { name: 'https-anthropic', host: 'api.anthropic.com', port: 443 }
];

export class RealtimeSecurityService extends EventEmitter {
  constructor({
    logger = console,
    dependencyIntervalMs = 60_000,
    networkIntervalMs = 15_000,
    deviceIntervalMs = 10_000
  } = {}) {
    super();
    this.logger = logger;
    this.intervals = {};
    this.state = {
      dependency: { lastRunAt: null, vulnerabilities: [], summary: null },
      network: { lastRunAt: null, probes: [] },
      device: { lastRunAt: null, host: null }
    };
    this.dependencyIntervalMs = dependencyIntervalMs;
    this.networkIntervalMs = networkIntervalMs;
    this.deviceIntervalMs = deviceIntervalMs;
  }

  start() {
    this._tickDeps();
    this._tickNetwork();
    this._tickDevice();
    this.intervals.deps = setInterval(() => this._tickDeps(), this.dependencyIntervalMs);
    this.intervals.net = setInterval(() => this._tickNetwork(), this.networkIntervalMs);
    this.intervals.dev = setInterval(() => this._tickDevice(), this.deviceIntervalMs);
  }

  stop() {
    for (const t of Object.values(this.intervals)) clearInterval(t);
    this.intervals = {};
  }

  snapshot() {
    return {
      generatedAt: Date.now(),
      ...this.state,
      overall: this._overall()
    };
  }

  _overall() {
    const parts = [
      this.state.dependency.summary?.severity ?? 'ok',
      worstProbe(this.state.network.probes),
      this.state.device.host?.severity ?? 'ok'
    ];
    if (parts.includes('critical')) return 'critical';
    if (parts.includes('warn')) return 'warn';
    return 'ok';
  }

  async _tickDeps() {
    try {
      const { stdout } = await execFileP('npm', ['audit', '--json'], {
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024
      }).catch((e) => ({ stdout: e.stdout || '{}' }));
      const parsed = JSON.parse(stdout || '{}');
      const meta = parsed?.metadata?.vulnerabilities || {};
      const total = meta.total || 0;
      const severity = meta.critical || meta.high ? 'critical' : (meta.moderate ? 'warn' : 'ok');
      this.state.dependency = {
        lastRunAt: Date.now(),
        vulnerabilities: extractVulns(parsed),
        summary: { total, severity, counts: meta }
      };
      this.emit('dependency', this.state.dependency);
    } catch (err) {
      this.logger.warn?.(`[security] dependency scan failed: ${err.message}`);
      this.state.dependency = {
        lastRunAt: Date.now(),
        vulnerabilities: [],
        summary: { total: 0, severity: 'warn', error: 'scan_failed' }
      };
      this.emit('dependency', this.state.dependency);
    }
  }

  async _tickNetwork() {
    const probes = [];
    for (const p of NETWORK_PROBES) {
      const start = Date.now();
      const ok = await probeHost(p.host, p.port);
      probes.push({
        name: p.name,
        host: p.host,
        port: p.port,
        ok,
        latencyMs: Date.now() - start,
        severity: ok ? 'ok' : 'warn',
        at: Date.now()
      });
    }
    this.state.network = { lastRunAt: Date.now(), probes };
    this.emit('network', this.state.network);
  }

  _tickDevice() {
    const total = os.totalmem();
    const free = os.freemem();
    const memUsedPct = (total - free) / total;
    const load1 = os.loadavg()[0];
    const cpuCount = os.cpus().length || 1;
    const cpuLoadPct = load1 / cpuCount;
    let severity = 'ok';
    if (memUsedPct > 0.95 || cpuLoadPct > 0.95) severity = 'critical';
    else if (memUsedPct > 0.85 || cpuLoadPct > 0.75) severity = 'warn';
    this.state.device = {
      lastRunAt: Date.now(),
      host: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptimeSec: Math.round(process.uptime()),
        memUsedPct,
        cpuLoadPct,
        severity
      }
    };
    this.emit('device', this.state.device);
  }

  wireSocket(io) {
    const relay = (event) => (payload) => io.to('security:live').emit(event, payload);
    this.on('dependency', relay('security:dependency'));
    this.on('network', relay('security:network'));
    this.on('device', relay('security:device'));
  }
}

function worstProbe(probes) {
  if (!probes.length) return 'ok';
  return probes.some((p) => !p.ok) ? 'warn' : 'ok';
}

function extractVulns(parsed) {
  const advisories = parsed?.vulnerabilities || {};
  return Object.entries(advisories).map(([name, v]) => ({
    package: name,
    severity: v.severity,
    via: (v.via || []).map((x) => (typeof x === 'string' ? x : x.name)),
    fixAvailable: !!v.fixAvailable
  }));
}

function probeHost(host, port) {
  return new Promise((resolve) => {
    // Lazy import so this file works in any runtime that ships `net`.
    import('net').then(({ default: net }) => {
      const socket = new net.Socket();
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        try { socket.destroy(); } catch { /* noop */ }
        resolve(ok);
      };
      socket.setTimeout(4000);
      socket.once('connect', () => finish(true));
      socket.once('error', () => finish(false));
      socket.once('timeout', () => finish(false));
      try { socket.connect(port, host); } catch { finish(false); }
    }).catch(() => resolve(false));
  });
}
