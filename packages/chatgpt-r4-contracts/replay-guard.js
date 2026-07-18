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
    return this.consumeMany([{ namespace, key, expiresAt }]);
  }

  consumeMany(entries) {
    if (!Array.isArray(entries) || entries.length < 1) reject('replay_batch_invalid');
    const pending = entries.map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) reject('replay_batch_invalid');
      const { namespace, key, expiresAt } = entry;
      if (typeof namespace !== 'string' || !namespace) reject('replay_namespace_invalid');
      if (typeof key !== 'string' || !key) reject('replay_key_invalid');
      const expiresMs = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiresMs)) reject('replay_expiry_invalid');
      return { composite: `${namespace}:${key}`, expiresMs };
    });

    const nowMs = this.clock().getTime();
    this.prune(nowMs);
    const composites = new Set();
    for (const entry of pending) {
      if (composites.has(entry.composite) || this.entries.has(entry.composite)) reject('replay_detected');
      if (entry.expiresMs <= nowMs) reject('replay_expiry_elapsed');
      composites.add(entry.composite);
    }
    if (this.entries.size + pending.length > this.maxEntries) reject('replay_guard_capacity_exceeded');
    for (const entry of pending) this.entries.set(entry.composite, entry.expiresMs);
    return true;
  }

  get size() {
    this.prune();
    return this.entries.size;
  }
}

module.exports = { InMemoryReplayGuard };
