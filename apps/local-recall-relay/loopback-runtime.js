'use strict';

const { createLoopbackEdgeClient } = require('./loopback-http-client');
const { createRelayRuntime, classifyEdgeInterruption } = require('./relay-runtime');
const { createUdsForwarder } = require('./uds-transport');

function createLoopbackRelayRuntime({
  edgeUrl,
  socketPath,
  relayId = 'local-relay-r4c',
  edgeTimeoutMs = 5_000,
  udsTimeoutMs = 2_000,
  ...options
} = {}) {
  return createRelayRuntime({
    ...options,
    relayId,
    edgeClient: createLoopbackEdgeClient(edgeUrl, { timeoutMs: edgeTimeoutMs }),
    forwardToUds: createUdsForwarder({ socketPath, timeoutMs: udsTimeoutMs }),
    eventComponent: 'loopback_relay'
  });
}

module.exports = {
  classifyEdgeInterruption,
  createLoopbackRelayRuntime
};
