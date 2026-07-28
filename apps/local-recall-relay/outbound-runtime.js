'use strict';

const { createOutboundEdgeClient } = require('./outbound-https-client');
const { createRelayRuntime } = require('./relay-runtime');
const {
  DEFAULT_UDS_TIMEOUT_MS,
  createUdsForwarder
} = require('./uds-transport');

function createOutboundRelayRuntime({
  edgeOrigin,
  relayAuthToken,
  socketPath,
  relayId = 'local-relay-r4d',
  edgeTimeoutMs = 5_000,
  udsTimeoutMs = DEFAULT_UDS_TIMEOUT_MS,
  verifyUdsListenerOwner,
  verifyConnectedUdsPeer,
  edgeRequest,
  ...options
} = {}) {
  const clientOptions = { authToken: relayAuthToken, timeoutMs: edgeTimeoutMs };
  if (edgeRequest !== undefined) clientOptions.request = edgeRequest;
  return createRelayRuntime({
    ...options,
    relayId,
    edgeClient: createOutboundEdgeClient(edgeOrigin, clientOptions),
    forwardToUds: createUdsForwarder({
      socketPath,
      timeoutMs: udsTimeoutMs,
      verifyUdsListenerOwner,
      verifyConnectedUdsPeer
    }),
    eventComponent: 'outbound_relay'
  });
}

module.exports = {
  createOutboundRelayRuntime
};
