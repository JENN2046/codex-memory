'use strict';

const {
  InMemoryReplayGuard,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const { createRelayProcessor } = require('./relay-processor');

function createRelayRuntime({
  edgeClient,
  forwardToUds,
  relayId,
  expectedIssuer,
  expectedAudience,
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  requestReplayGuard,
  responseSigning,
  counterMode,
  clock = () => new Date(),
  cancelPollMs = 10,
  eventComponent = 'outbound_relay',
  eventSink
} = {}) {
  validateEdgeClient(edgeClient);
  if (typeof forwardToUds !== 'function') reject('relay_forwarder_missing');
  if (typeof relayId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(relayId)) {
    reject('relay_id_invalid');
  }
  if (!Number.isInteger(cancelPollMs) || cancelPollMs < 1 || cancelPollMs > 1000) {
    reject('relay_cancel_poll_invalid');
  }
  if (typeof eventComponent !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/u.test(eventComponent)) {
    reject('relay_event_component_invalid');
  }
  if (eventSink !== undefined && typeof eventSink !== 'function') reject('relay_event_sink_invalid');
  const replayGuard = requestReplayGuard || new InMemoryReplayGuard({ clock });

  function emit(event, requestId, extra = {}) {
    if (!eventSink) return;
    try {
      const pending = eventSink(Object.freeze({
        component: eventComponent,
        event,
        request_id: requestId || null,
        ...extra
      }));
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch {
      // Observability is best-effort and cannot alter Relay processing.
    }
  }

  return Object.freeze({
    async processNext({ signal } = {}) {
      validateAbortSignal(signal);
      if (signal?.aborted) throw cancelledError();
      const claim = await edgeClient.claim(relayId, { signal });
      if (!claim) return Object.freeze({ status: 'idle' });
      emit('claim_received', claim.request_id, { attempt: claim.attempt });
      function interrupted(status) {
        emit(status === 'expired' ? 'request_expired' : 'request_cancelled', claim.request_id, {
          attempt: claim.attempt
        });
        return Object.freeze({
          status,
          request_id: claim.request_id,
          attempt: claim.attempt
        });
      }
      function processingFailure(error, failureStage) {
        const errorStatus = classifyEdgeInterruption(error);
        if (error?.code === 'relay_cancelled' || errorStatus || cancellation.signal.aborted) {
          const status = interruptionStatus || errorStatus || 'cancelled';
          return interrupted(status);
        }
        const code = safeErrorCode(error?.code);
        emit('request_failed', claim.request_id, {
          attempt: claim.attempt,
          error_code: code,
          failure_stage: failureStage
        });
        throw Object.assign(new Error(code), { code });
      }
      try {
        await edgeClient.acknowledge(claim, { signal });
      } catch (error) {
        if (error?.code === 'relay_cancelled' || signal?.aborted) {
          return interrupted('cancelled');
        }
        const status = classifyEdgeInterruption(error);
        if (status) return interrupted(status);
        const code = safeErrorCode(error?.code);
        emit('request_failed', claim.request_id, {
          attempt: claim.attempt,
          error_code: code,
          failure_stage: 'acknowledge'
        });
        throw Object.assign(new Error(code), { code });
      }
      emit('claim_acknowledged', claim.request_id, { attempt: claim.attempt });

      const cancellation = new AbortController();
      const onExternalAbort = () => cancellation.abort();
      if (signal?.aborted) {
        cancellation.abort();
      } else {
        signal?.addEventListener('abort', onExternalAbort, { once: true });
      }
      let interruptionStatus = null;
      let monitorStopped = false;
      const monitor = monitorCancellation({
        edge: edgeClient,
        claim,
        cancellation,
        pollMs: cancelPollMs,
        isStopped: () => monitorStopped,
        onInterrupted(status) {
          interruptionStatus = status;
        }
      });
      const processor = createRelayProcessor({
        expectedIssuer,
        expectedAudience,
        resolveRequestPublicKey,
        resolvePrincipalPublicKey,
        requestReplayGuard: replayGuard,
        responseSigning,
        counterMode,
        clock,
        async forwardToUds(payload) {
          emit('uds_forward_started', claim.request_id, { attempt: claim.attempt });
          const invocation = await forwardToUds(payload, { signal: cancellation.signal });
          emit('uds_forward_completed', claim.request_id, { attempt: claim.attempt });
          return invocation;
        }
      });

      try {
        let response;
        try {
          response = await processor.handle(claim.request);
          emit('response_prepared', claim.request_id, { attempt: claim.attempt });
        } catch (error) {
          return processingFailure(error, 'process');
        }
        try {
          emit('edge_complete_started', claim.request_id, { attempt: claim.attempt });
          await edgeClient.complete(claim, response, {
            signal: cancellation.signal
          });
        } catch (error) {
          return processingFailure(error, 'complete');
        }
        emit('response_completed', claim.request_id, { attempt: claim.attempt });
        return Object.freeze({
          status: 'completed',
          request_id: claim.request_id,
          attempt: claim.attempt,
          response
        });
      } finally {
        monitorStopped = true;
        cancellation.abort();
        signal?.removeEventListener('abort', onExternalAbort);
        await monitor;
      }
    }
  });
}

function validateEdgeClient(value) {
  if (!value || typeof value !== 'object') reject('relay_edge_client_invalid');
  for (const method of ['claim', 'acknowledge', 'complete', 'state']) {
    if (typeof value[method] !== 'function') reject('relay_edge_client_invalid');
  }
}

function classifyEdgeInterruption(error) {
  if (error?.code === 'edge_request_cancelled') return 'cancelled';
  if (error?.code === 'edge_request_expired' || error?.code === 'edge_claim_expired' ||
      error?.code === 'edge_request_not_found' ||
      error?.code === 'relay_request_expired_before_response') return 'expired';
  return null;
}

function safeErrorCode(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(value)
    ? value
    : 'relay_failure';
}

async function monitorCancellation({ edge, claim, cancellation, pollMs, isStopped, onInterrupted }) {
  while (!isStopped() && !cancellation.signal.aborted) {
    await delay(pollMs);
    if (isStopped() || cancellation.signal.aborted) return;
    try {
      const current = await edge.state(claim, {
        signal: cancellation.signal
      });
      if (current.status === 'cancelled' || current.status === 'expired') {
        onInterrupted(current.status);
        cancellation.abort();
      }
    } catch (error) {
      const status = classifyEdgeInterruption(error);
      if (status) {
        onInterrupted(status);
        cancellation.abort();
      }
    }
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function validateAbortSignal(signal) {
  if (signal === undefined) return;
  if (!signal || typeof signal !== 'object' ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function' ||
      typeof signal.removeEventListener !== 'function') {
    reject('relay_abort_signal_invalid');
  }
}

function cancelledError() {
  return Object.assign(new Error('relay_cancelled'), {
    code: 'relay_cancelled'
  });
}

module.exports = {
  classifyEdgeInterruption,
  createRelayRuntime,
  safeErrorCode,
  validateEdgeClient
};
