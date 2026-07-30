'use strict';

const { createLoopbackEdgeClient } = require('./loopback-http-client');
const { createRelayRuntime, classifyEdgeInterruption } = require('./relay-runtime');
const {
  DEFAULT_UDS_TIMEOUT_MS,
  createUdsForwarder
} = require('./uds-transport');

function createLoopbackRelayRuntime({
  edgeUrl,
  socketPath,
  relayId = 'local-relay-r4c',
  edgeTimeoutMs = 5_000,
  udsTimeoutMs = DEFAULT_UDS_TIMEOUT_MS,
  clock = () => new Date(),
  ...options
} = {}) {
  return createRelayRuntime({
    ...options,
    clock,
    relayId,
    edgeClient: createLoopbackEdgeClient(edgeUrl, { timeoutMs: edgeTimeoutMs }),
    forwardToUds: createUdsForwarder({
      socketPath,
      timeoutMs: udsTimeoutMs,
      clock
    }),
    eventComponent: 'loopback_relay'
  });
}

module.exports = {
  classifyEdgeInterruption,
  createLoopbackRelayRuntime
};
