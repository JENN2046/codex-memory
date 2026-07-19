#!/usr/bin/env node
'use strict';

const { loadOutboundRelayRuntimeFromEnvironment } = require('./runtime-authority');

function createOutboundRelayService({
  runtime,
  idlePollMs = 250,
  unavailableBackoffMs = 1_000
} = {}) {
  if (!runtime || typeof runtime.processNext !== 'function') throw safeError('relay_runtime_invalid');
  validateDelay(idlePollMs);
  validateDelay(unavailableBackoffMs);
  let stopping = false;

  return Object.freeze({
    stop() {
      stopping = true;
    },
    async run() {
      while (!stopping) {
        try {
          const result = await runtime.processNext();
          if (result.status === 'idle') await delay(idlePollMs);
        } catch (error) {
          if (!isAvailabilityError(error?.code)) throw safeError(error?.code);
          await delay(unavailableBackoffMs);
        }
      }
    }
  });
}

function validateDelay(value) {
  if (!Number.isInteger(value) || value < 10 || value > 30_000) throw safeError('relay_service_delay_invalid');
}

function isAvailabilityError(code) {
  return code === 'relay_edge_unavailable' || code === 'relay_edge_timeout' ||
    code === 'relay_uds_unavailable' || code === 'relay_uds_timeout';
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
  const runtime = loadOutboundRelayRuntimeFromEnvironment();
  const service = createOutboundRelayService({ runtime });
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
  createOutboundRelayService,
  isAvailabilityError,
  safeError,
  validateDelay
};
