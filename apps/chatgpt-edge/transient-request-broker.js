'use strict';

const {
  InMemoryReplayGuard,
  createOpaqueId,
  reject
} = require('../../packages/chatgpt-r4-contracts');

const TERMINAL_STATES = new Set(['completed', 'cancelled', 'expired']);

function createTransientRequestBroker({
  verifyRequest,
  verifyResponse,
  clock = () => new Date(),
  claimLeaseMs = 5_000,
  terminalRetentionMs = 5_000,
  maxInFlight = 64,
  maxRecords = 256,
  eventSink,
  eventComponent = 'transient_edge_broker'
} = {}) {
  if (typeof verifyRequest !== 'function') reject('edge_request_verifier_missing');
  if (typeof verifyResponse !== 'function') reject('edge_response_verifier_missing');
  if (!Number.isInteger(claimLeaseMs) || claimLeaseMs < 10 || claimLeaseMs > 60_000) {
    reject('edge_claim_lease_invalid');
  }
  if (!Number.isInteger(terminalRetentionMs) || terminalRetentionMs < 10 || terminalRetentionMs > 30_000) {
    reject('edge_terminal_retention_invalid');
  }
  if (!Number.isInteger(maxInFlight) || maxInFlight < 1 || maxInFlight > 1024) {
    reject('edge_inflight_limit_invalid');
  }
  if (!Number.isInteger(maxRecords) || maxRecords < maxInFlight || maxRecords > 4096) {
    reject('edge_record_limit_invalid');
  }
  if (eventSink !== undefined && typeof eventSink !== 'function') reject('edge_event_sink_invalid');
  if (typeof eventComponent !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/u.test(eventComponent)) {
    reject('edge_event_component_invalid');
  }

  const records = new Map();
  const waiters = new Map();
  const submissionReplayGuard = new InMemoryReplayGuard({
    maxEntries: maxRecords * 2,
    clock
  });

  function emit(event, record, extra = {}) {
    if (!eventSink) return;
    try {
      const pending = eventSink(Object.freeze({
        component: eventComponent,
        event,
        request_id: record?.request.request_id || null,
        status: record?.status || null,
        attempt: record?.attempt || 0,
        ...extra
      }));
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch {
      // Low-disclosure observability cannot alter broker state transitions.
    }
  }

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) reject('edge_clock_invalid');
    return milliseconds;
  }

  function terminalError(record) {
    if (record.status === 'cancelled') return 'edge_request_cancelled';
    if (record.status === 'expired') return 'edge_request_expired';
    return null;
  }

  function settleWaiters(record) {
    const pending = waiters.get(record.request.request_id);
    if (!pending) return;
    waiters.delete(record.request.request_id);
    for (const waiter of pending) {
      waiter.cleanup();
      if (record.status === 'completed') {
        waiter.resolve(structuredClone(record.response));
      } else {
        const code = terminalError(record) || 'edge_request_not_completed';
        waiter.reject(Object.assign(new Error(code), { code }));
      }
    }
  }

  function refresh(record) {
    if (TERMINAL_STATES.has(record.status)) return;
    const currentMs = nowMs();
    const requestExpiresMs = Date.parse(record.request.expires_at);
    if (requestExpiresMs <= currentMs) {
      record.status = 'expired';
      record.claim = null;
      record.purge_after_ms = requestExpiresMs + terminalRetentionMs;
      emit('request_expired', record);
      settleWaiters(record);
      return;
    }
    if (record.status === 'claimed' && record.claim.expires_ms <= currentMs) {
      const acknowledged = record.claim.acked;
      const claimExpiresMs = record.claim.expires_ms;
      record.status = acknowledged ? 'expired' : 'queued';
      record.claim = null;
      if (acknowledged) {
        record.purge_after_ms = claimExpiresMs + terminalRetentionMs;
        settleWaiters(record);
      }
      emit(acknowledged ? 'acknowledged_claim_expired' : 'claim_expired', record);
    }
  }

  function pruneTerminals() {
    const currentMs = nowMs();
    for (const [requestId, record] of records) {
      if (TERMINAL_STATES.has(record.status) && record.purge_after_ms <= currentMs) {
        records.delete(requestId);
      }
    }
  }

  function refreshAndPrune() {
    for (const record of records.values()) refresh(record);
    pruneTerminals();
  }

  function requireRecord(requestId) {
    refreshAndPrune();
    const record = records.get(requestId);
    if (!record) reject('edge_request_not_found');
    return record;
  }

  function requireLiveClaim(record, claimToken) {
    if (record.status === 'cancelled') reject('edge_request_cancelled');
    if (record.status === 'expired') reject('edge_request_expired');
    if (record.status !== 'claimed' || !record.claim) reject('edge_claim_missing');
    if (record.claim.token !== claimToken) reject('edge_claim_token_mismatch');
    if (record.claim.expires_ms <= nowMs()) {
      refresh(record);
      reject('edge_claim_expired');
    }
    return record.claim;
  }

  async function submit(request) {
    await verifyRequest(request);
    refreshAndPrune();
    if (records.has(request.request_id)) reject('replay_detected');
    if (records.size >= maxRecords) reject('edge_record_capacity_exceeded');
    const activeCount = [...records.values()].filter(record => {
      refresh(record);
      return !TERMINAL_STATES.has(record.status);
    }).length;
    if (activeCount >= maxInFlight) reject('edge_inflight_capacity_exceeded');
    submissionReplayGuard.consumeMany([
      { namespace: 'edge_submission_request_id', key: request.request_id, expiresAt: request.expires_at },
      { namespace: 'edge_submission_nonce', key: request.nonce, expiresAt: request.expires_at }
    ]);
    const record = {
      request: structuredClone(request),
      response: null,
      status: 'queued',
      attempt: 0,
      claim: null,
      purge_after_ms: null
    };
    records.set(request.request_id, record);
    emit('request_queued', record);
    return { request_id: request.request_id, status: record.status };
  }

  function claim(relayId) {
    if (typeof relayId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(relayId)) {
      reject('edge_relay_id_invalid');
    }
    refreshAndPrune();
    for (const record of records.values()) {
      if (record.status !== 'queued') continue;
      const expiresMs = nowMs() + claimLeaseMs;
      record.status = 'claimed';
      record.attempt += 1;
      record.claim = {
        token: createOpaqueId('clm_', undefined, 18),
        relay_id: relayId,
        expires_ms: expiresMs,
        acked: false
      };
      emit('request_claimed', record);
      return {
        request_id: record.request.request_id,
        request: structuredClone(record.request),
        claim_token: record.claim.token,
        lease_expires_at: new Date(expiresMs).toISOString(),
        attempt: record.attempt
      };
    }
    return null;
  }

  function acknowledge(requestId, claimToken) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (activeClaim.acked) reject('edge_claim_ack_replay');
    activeClaim.acked = true;
    emit('claim_acknowledged', record);
    return { request_id: requestId, status: 'acked', attempt: record.attempt };
  }

  async function complete(requestId, claimToken, response) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (!activeClaim.acked) reject('edge_claim_not_acknowledged');
    await verifyResponse(response, record.request);
    const currentRecord = requireRecord(requestId);
    const currentClaim = requireLiveClaim(currentRecord, claimToken);
    if (!currentClaim.acked) reject('edge_claim_not_acknowledged');
    currentRecord.response = structuredClone(response);
    currentRecord.status = 'completed';
    currentRecord.claim = null;
    currentRecord.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_completed', currentRecord);
    settleWaiters(currentRecord);
    return { request_id: requestId, status: currentRecord.status };
  }

  function cancel(requestId) {
    const record = requireRecord(requestId);
    if (TERMINAL_STATES.has(record.status)) reject('edge_request_terminal');
    record.status = 'cancelled';
    record.claim = null;
    record.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_cancelled', record);
    settleWaiters(record);
    return { request_id: requestId, status: record.status };
  }

  function state(requestId, claimToken) {
    const record = requireRecord(requestId);
    if (record.status === 'claimed') requireLiveClaim(record, claimToken);
    return {
      request_id: requestId,
      status: record.status,
      attempt: record.attempt,
      claim_state: record.status === 'claimed'
        ? (record.claim.acked ? 'acked' : 'claimed')
        : 'none'
    };
  }

  function result(requestId) {
    const record = requireRecord(requestId);
    if (record.status !== 'completed') {
      return { request_id: requestId, status: record.status };
    }
    return {
      request_id: requestId,
      status: record.status,
      response: structuredClone(record.response)
    };
  }

  function waitForResult(requestId, { signal, timeoutMs = 30_000 } = {}) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60_000) {
      reject('edge_wait_timeout_invalid');
    }
    const record = requireRecord(requestId);
    if (record.status === 'completed') return Promise.resolve(structuredClone(record.response));
    const code = terminalError(record);
    if (code) return Promise.reject(Object.assign(new Error(code), { code }));

    return new Promise((resolve, rejectWait) => {
      let timeout;
      const onAbort = () => {
        try {
          cancel(requestId);
        } catch {
          // The request may already have completed between the abort and cancellation.
        }
      };
      const waiter = {
        resolve,
        reject: rejectWait,
        cleanup() {
          clearTimeout(timeout);
          signal?.removeEventListener('abort', onAbort);
        }
      };
      const pending = waiters.get(requestId) || new Set();
      pending.add(waiter);
      waiters.set(requestId, pending);
      timeout = setTimeout(() => {
        pending.delete(waiter);
        if (pending.size === 0) waiters.delete(requestId);
        try {
          cancel(requestId);
        } catch {
          // A completion racing the timeout is returned by the result check below.
        }
        let current;
        try {
          current = result(requestId);
        } catch {
          current = null;
        }
        waiter.cleanup();
        if (current?.status === 'completed') {
          resolve(current.response);
          return;
        }
        rejectWait(Object.assign(new Error('edge_response_timeout'), { code: 'edge_response_timeout' }));
      }, timeoutMs);
      timeout.unref?.();
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  function snapshot() {
    refreshAndPrune();
    const counts = { queued: 0, claimed: 0, completed: 0, cancelled: 0, expired: 0 };
    for (const record of records.values()) counts[record.status] += 1;
    return Object.freeze({ in_memory_only: true, request_count: records.size, states: counts });
  }

  function close() {
    for (const record of records.values()) {
      if (!TERMINAL_STATES.has(record.status)) {
        record.status = 'expired';
        record.claim = null;
        record.purge_after_ms = nowMs();
        settleWaiters(record);
      }
    }
    records.clear();
  }

  return Object.freeze({
    submit,
    claim,
    acknowledge,
    complete,
    cancel,
    state,
    result,
    waitForResult,
    snapshot,
    close
  });
}

module.exports = {
  TERMINAL_STATES,
  createTransientRequestBroker
};
