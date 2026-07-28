#!/usr/bin/env node
'use strict';

const { createLowDisclosureRelayObserver } = require('./low-disclosure-observer');
const { createObserverSnapshotUdsServer } = require('./observer-snapshot-uds');
const { loadOutboundRelayRuntimeFromEnvironment } = require('./runtime-authority');

function createOutboundRelayService({
  runtime,
  snapshotServer = null,
  idlePollMs = 250,
  unavailableBackoffMs = 1_000
} = {}) {
  if (!runtime || typeof runtime.processNext !== 'function') throw safeError('relay_runtime_invalid');
  if (snapshotServer !== null &&
      (typeof snapshotServer.start !== 'function' ||
       typeof snapshotServer.stop !== 'function' ||
       typeof snapshotServer.snapshot !== 'function')) {
    throw safeError('relay_observer_snapshot_server_invalid');
  }
  validateDelay(idlePollMs);
  validateDelay(unavailableBackoffMs);
  let stopping = false;
  let running = false;

  return Object.freeze({
    stop() {
      stopping = true;
    },
    async run() {
      if (running) throw safeError('relay_service_already_running');
      running = true;
      try {
        if (snapshotServer) await snapshotServer.start();
        while (!stopping) {
          try {
            const result = await runtime.processNext();
            if (result.status === 'idle') await delay(idlePollMs);
          } catch (error) {
            if (!isAvailabilityError(error?.code)) throw safeError(error?.code);
            await delay(unavailableBackoffMs);
          }
        }
      } finally {
        await snapshotServer?.stop();
        running = false;
      }
    },
    snapshot() {
      return Object.freeze({
        running,
        stopping,
        observer_snapshot_exposed: snapshotServer !== null,
        observer_snapshot: snapshotServer?.snapshot() || null
      });
    }
  });
}

function createCanonicalOutboundRelayService({
  environment = process.env,
  createObserver = createLowDisclosureRelayObserver,
  createSnapshotServer = createObserverSnapshotUdsServer,
  loadRuntime = loadOutboundRelayRuntimeFromEnvironment
} = {}) {
  const socketPath = environment?.CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH;
  if (typeof socketPath !== 'string' || !socketPath ||
      socketPath.trim() !== socketPath) {
    throw safeError('relay_observer_snapshot_environment_missing');
  }
  const observer = createObserver();
  if (!observer || typeof observer.observe !== 'function' ||
      typeof observer.snapshot !== 'function') {
    throw safeError('relay_observer_invalid');
  }
  const snapshotServer = createSnapshotServer({
    socketPath,
    readObservation: observer.snapshot
  });
  const runtime = loadRuntime(environment, {
    eventSink: observer.observe
  });
  return createOutboundRelayService({ runtime, snapshotServer });
}

function validateDelay(value) {
  if (!Number.isInteger(value) || value < 10 || value > 30_000) throw safeError('relay_service_delay_invalid');
}

function isAvailabilityError(code) {
  return code === 'relay_edge_unavailable' || code === 'relay_edge_timeout' ||
    code === 'relay_uds_unavailable' || code === 'relay_uds_timeout' ||
    code === 'relay_uds_response_incomplete';
}

function safeError(code) {
  const safe = typeof code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(code)
    ? code
    : 'relay_service_failed';
  return Object.assign(new Error(safe), { code: safe });
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main() {
  const service = createCanonicalOutboundRelayService();
  process.once('SIGTERM', () => service.stop());
  process.once('SIGINT', () => service.stop());
  await service.run();
}

if (require.main === module) {
  main().catch(error => {
    const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
      ? error.code
      : 'relay_service_failed';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  createCanonicalOutboundRelayService,
  createOutboundRelayService,
  isAvailabilityError,
  safeError,
  validateDelay
};
