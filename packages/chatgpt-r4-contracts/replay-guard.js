'use strict';

const { reject } = require('./errors');

class InMemoryReplayGuard {
  constructor({ maxEntries = 4096, clock = () => new Date() } = {}) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) reject('replay_guard_limit_invalid');
    this.maxEntries = maxEntries;
    this.clock = clock;
    this.entries = new Map();
  }

  prune(nowMs = this.clock().getTime()) {
    for (const [key, expiresMs] of this.entries) {
      if (expiresMs <= nowMs) this.entries.delete(key);
    }
  }

  consume({ namespace, key, expiresAt }) {
    if (typeof namespace !== 'string' || !namespace) reject('replay_namespace_invalid');
    if (typeof key !== 'string' || !key) reject('replay_key_invalid');
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) reject('replay_expiry_invalid');

    const nowMs = this.clock().getTime();
    this.prune(nowMs);
    const composite = `${namespace}:${key}`;
    if (this.entries.has(composite)) reject('replay_detected');
    if (this.entries.size >= this.maxEntries) reject('replay_guard_capacity_exceeded');
    if (expiresMs <= nowMs) reject('replay_expiry_elapsed');
    this.entries.set(composite, expiresMs);
    return true;
  }

  get size() {
    this.prune();
    return this.entries.size;
  }
}

module.exports = { InMemoryReplayGuard };
