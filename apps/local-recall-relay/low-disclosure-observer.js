'use strict';

const EVENT_COUNTERS = Object.freeze({
  claim_received: 'claims_received',
  claim_acknowledged: 'claims_acknowledged',
  uds_forward_started: 'uds_forwards_started',
  uds_forward_completed: 'uds_forwards_completed',
  response_prepared: 'responses_prepared',
  edge_complete_started: 'edge_completions_started',
  response_completed: 'edge_completions_accepted',
  request_failed: 'requests_failed',
  request_cancelled: 'requests_cancelled',
  request_expired: 'requests_expired'
});

const FAILURE_STAGES = new Set(['acknowledge', 'process', 'complete']);
const SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{0,79}$/u;

function createLowDisclosureRelayObserver() {
  const counters = Object.fromEntries(
    [...new Set(Object.values(EVENT_COUNTERS))].map(name => [name, 0])
  );
  let lastFailureStage = null;
  let lastErrorCode = null;

  function observe(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event) ||
        event.component !== 'outbound_relay') {
      return false;
    }
    const counter = EVENT_COUNTERS[event.event];
    if (!counter) return false;
    counters[counter] += 1;
    if (event.event === 'request_failed') {
      lastFailureStage = FAILURE_STAGES.has(event.failure_stage)
        ? event.failure_stage
        : 'unknown';
      lastErrorCode = typeof event.error_code === 'string' &&
        SAFE_ERROR_CODE.test(event.error_code)
        ? event.error_code
        : 'relay_failure';
    }
    return true;
  }

  function snapshot() {
    return Object.freeze({
      schema_version: 1,
      component: 'outbound_relay',
      ...counters,
      last_failure_stage: lastFailureStage,
      last_error_code: lastErrorCode,
      completion_state: completionState(counters, lastFailureStage),
      request_identifiers_retained: false,
      response_bodies_retained: false,
      raw_memory_retained: false,
      secret_values_retained: false
    });
  }

  return Object.freeze({ observe, snapshot });
}

function completionState(counters, lastFailureStage) {
  if (counters.edge_completions_accepted > 0) return 'edge_accepted';
  if (lastFailureStage === 'complete') return 'edge_complete_failed';
  if (lastFailureStage === 'process') return 'response_processing_failed';
  if (lastFailureStage === 'acknowledge') return 'edge_acknowledge_failed';
  if (counters.uds_forwards_completed > 0) return 'response_completion_unobserved';
  if (counters.uds_forwards_started > 0) return 'uds_incomplete';
  if (counters.claims_received > 0) return 'claimed';
  return 'idle';
}

module.exports = {
  EVENT_COUNTERS,
  FAILURE_STAGES,
  completionState,
  createLowDisclosureRelayObserver
};
