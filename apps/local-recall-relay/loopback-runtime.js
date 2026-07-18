'use strict';

const {
  InMemoryReplayGuard,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const { createLoopbackEdgeClient } = require('./loopback-http-client');
const { createRelayProcessor } = require('./relay-processor');
const { createUdsForwarder } = require('./uds-transport');

function createLoopbackRelayRuntime({
  edgeUrl,
  socketPath,
  relayId = 'local-relay-r4c',
  expectedIssuer,
  expectedAudience,
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  requestReplayGuard,
  responseSigning,
  clock = () => new Date(),
  cancelPollMs = 10,
  udsTimeoutMs = 2_000,
  eventSink
} = {}) {
  if (!Number.isInteger(cancelPollMs) || cancelPollMs < 1 || cancelPollMs > 1000) {
    reject('relay_cancel_poll_invalid');
  }
  if (eventSink !== undefined && typeof eventSink !== 'function') reject('relay_event_sink_invalid');
  const edge = createLoopbackEdgeClient(edgeUrl);
  const udsForwarder = createUdsForwarder({ socketPath, timeoutMs: udsTimeoutMs });
  const replayGuard = requestReplayGuard || new InMemoryReplayGuard({ clock });

  function emit(event, requestId, extra = {}) {
    if (!eventSink) return;
    eventSink(Object.freeze({
      component: 'loopback_relay',
      event,
      request_id: requestId || null,
      ...extra
    }));
  }

  return Object.freeze({
    async processNext() {
      const claim = await edge.claim(relayId);
      if (!claim) return Object.freeze({ status: 'idle' });
      emit('claim_received', claim.request_id, { attempt: claim.attempt });
      await edge.acknowledge(claim);
      emit('claim_acknowledged', claim.request_id, { attempt: claim.attempt });

      const cancellation = new AbortController();
      let monitorStopped = false;
      const monitor = monitorCancellation({
        edge,
        claim,
        cancellation,
        pollMs: cancelPollMs,
        isStopped: () => monitorStopped
      });
      const processor = createRelayProcessor({
        expectedIssuer,
        expectedAudience,
        resolveRequestPublicKey,
        resolvePrincipalPublicKey,
        requestReplayGuard: replayGuard,
        responseSigning,
        clock,
        async forwardToUds(payload) {
          emit('uds_forward_started', claim.request_id, { attempt: claim.attempt });
          const invocation = await udsForwarder(payload, { signal: cancellation.signal });
          emit('uds_forward_completed', claim.request_id, { attempt: claim.attempt });
          return invocation;
        }
      });

      try {
        const response = await processor.handle(claim.request);
        await edge.complete(claim, response);
        emit('response_completed', claim.request_id, { attempt: claim.attempt });
        return Object.freeze({
          status: 'completed',
          request_id: claim.request_id,
          attempt: claim.attempt,
          response
        });
      } catch (error) {
        if (error?.code === 'relay_cancelled' || error?.code === 'edge_request_cancelled' ||
            cancellation.signal.aborted) {
          emit('request_cancelled', claim.request_id, { attempt: claim.attempt });
          return Object.freeze({
            status: 'cancelled',
            request_id: claim.request_id,
            attempt: claim.attempt
          });
        }
        const code = safeErrorCode(error?.code);
        emit('request_failed', claim.request_id, { attempt: claim.attempt, error_code: code });
        throw Object.assign(new Error(code), { code });
      } finally {
        monitorStopped = true;
        await monitor;
      }
    }
  });
}

function safeErrorCode(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(value)
    ? value
    : 'relay_failure';
}

async function monitorCancellation({ edge, claim, cancellation, pollMs, isStopped }) {
  while (!isStopped() && !cancellation.signal.aborted) {
    await delay(pollMs);
    if (isStopped() || cancellation.signal.aborted) return;
    try {
      const current = await edge.state(claim);
      if (current.status === 'cancelled') cancellation.abort();
      if (current.status === 'expired') cancellation.abort();
    } catch (error) {
      if (error?.code === 'edge_request_cancelled' || error?.code === 'edge_request_expired') {
        cancellation.abort();
      }
    }
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

module.exports = {
  createLoopbackRelayRuntime
};
