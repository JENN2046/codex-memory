'use strict';

const {
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  GOVERNED_READ_ATTEMPT_LIMITS,
  LIMITS,
  aggregateAttemptCounters,
  canonicalJson,
  createAttemptHeader,
  createGovernedReadAttemptProtocol,
  createGovernedReadAttemptWorkingSet,
  createStageReceipt,
  createTerminalEnvelope,
  createContextResolutionHeader,
  createContextResolutionStageReceipt,
  contextResolutionFailureRegistryEntry,
  validateGovernedContextResolutionProtocol,
  isGovernedContextResolutionWorkingSetExtension,
  isGovernedReadAttemptWorkingSetExtension,
  governedReadAttemptResponseBindingDigest,
  digestObject,
  projectGovernedReadAttemptPublic,
  validateAttemptCounterRelationships,
  validateAttemptHeader,
  validateGovernedReadAttemptProtocol,
  validateStageReceipt,
  validateTerminalEnvelope,
  InMemoryReplayGuard,
  createOpaqueId,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const {
  deriveGovernedReadAttemptRetention
} = require('./governed-read-attempt-retention');
const {
  createGovernedContextResolutionCoordinator
} = require('./governed-context-resolution-coordinator');

const TERMINAL_STATES = new Set(['completed', 'cancelled', 'expired', 'failed']);
const GOVERNED_ATTEMPT_FAILURE_RESULT_KIND =
  'governed_read_attempt_terminal_result';
const GOVERNED_ATTEMPT_RESPONSE_RESULT_KIND =
  'governed_read_attempt_response_result';
const REQUIRED_ATTEMPT_COORDINATOR_METHODS = Object.freeze([
  'acceptAttempt',
  'appendReceipt',
  'cancelAttempt',
  'commitProtocolCandidate',
  'protocol',
  'reportCoordinatorLoss',
  'timeoutAttempt',
  'workingSet'
]);
const REQUIRED_CONTEXT_RESOLUTION_COORDINATOR_METHODS = Object.freeze([
  'acceptResolution',
  'appendReceipt',
  'cancelResolution',
  'commitProtocolCandidate',
  'protocol',
  'reportCoordinatorLoss',
  'timeoutResolution',
  'workingSet'
]);

function createTransientRequestBroker({
  verifyRequest,
  verifyResponse,
  clock = () => new Date(),
  claimLeaseMs = 5_000,
  terminalRetentionMs = 5_000,
  maxInFlight = 64,
  maxRecords = 256,
  eventSink,
  eventComponent = 'transient_edge_broker',
  attemptCoordinator = null,
  attemptEventSink,
  contextResolutionCoordinator = null,
  contextResolutionEventSink
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
  if (attemptEventSink !== undefined &&
      typeof attemptEventSink !== 'function') {
    reject('edge_attempt_event_sink_invalid');
  }
  if (contextResolutionEventSink !== undefined &&
      typeof contextResolutionEventSink !== 'function') {
    reject('edge_context_resolution_event_sink_invalid');
  }
  if (typeof eventComponent !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/u.test(eventComponent)) {
    reject('edge_event_component_invalid');
  }

  const records = new Map();
  const waiters = new Map();
  const attemptRetention = deriveGovernedReadAttemptRetention({
    maxRecords,
    requestRecordRetentionMs: terminalRetentionMs
  });
  const governedCoordinator =
    attemptCoordinator || createGovernedReadAttemptCoordinator({
      clock,
      maxAttempts: maxInFlight,
      maxRetainedAttempts: attemptRetention.maxRetainedAttempts,
      terminalRetentionMs: attemptRetention.terminalRetentionMs,
      eventSink: attemptEventSink || eventSink,
      eventComponent: `${eventComponent.slice(0, 71)}_attempt`
    });
  if (REQUIRED_ATTEMPT_COORDINATOR_METHODS.some(method =>
    typeof governedCoordinator?.[method] !== 'function'
  )) {
    reject('edge_attempt_coordinator_invalid');
  }
  const resolutionCoordinator = contextResolutionCoordinator ||
    createGovernedContextResolutionCoordinator({
      clock,
      maxResolutions: maxInFlight,
      maxRetainedResolutions: Math.max(maxInFlight, maxRecords),
      terminalRetentionMs,
      eventSink: contextResolutionEventSink || eventSink
    });
  if (REQUIRED_CONTEXT_RESOLUTION_COORDINATOR_METHODS.some(method =>
    typeof resolutionCoordinator?.[method] !== 'function'
  )) {
    reject('edge_context_resolution_coordinator_invalid');
  }
  const submissionReplayGuard = new InMemoryReplayGuard({
    maxEntries:
      maxRecords *
      3 *
      Math.ceil(
        LIMITS.maxEnvelopeTtlSeconds * 1000 /
          terminalRetentionMs
      ),
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
        attempt_ref: record?.attempt_ref || null,
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
    if (record.status === 'failed') return record.failure_code;
    return null;
  }

  function attemptFailureResult(record) {
    if (!record.attempt_protocol) {
      reject('edge_attempt_terminal_missing');
    }
    return Object.freeze({
      kind: GOVERNED_ATTEMPT_FAILURE_RESULT_KIND,
      request_id: record.request.request_id,
      tool_name: record.request.tool_request.name,
      governed_read_attempt: structuredClone(record.attempt_protocol)
    });
  }

  function attemptResponseResult(record) {
    if (!record.attempt_protocol || !record.response) {
      reject('edge_attempt_response_missing');
    }
    return Object.freeze({
      kind: GOVERNED_ATTEMPT_RESPONSE_RESULT_KIND,
      request_id: record.request.request_id,
      tool_name: record.request.tool_request.name,
      response: structuredClone(record.response),
      governed_read_attempt:
        structuredClone(record.attempt_protocol)
    });
  }

  function completedBrokerResult(record) {
    return record.attempt_ref
      ? attemptResponseResult(record)
      : structuredClone(record.response);
  }

  function settleWaiters(record) {
    const pending = waiters.get(record.request.request_id);
    if (!pending) return;
    waiters.delete(record.request.request_id);
    for (const waiter of pending) {
      waiter.cleanup();
      if (record.status === 'completed') {
        waiter.resolve(completedBrokerResult(record));
      } else if (record.attempt_protocol) {
        waiter.resolve(attemptFailureResult(record));
      } else {
        const code = terminalError(record) || 'edge_request_not_completed';
        waiter.reject(Object.assign(new Error(code), { code }));
      }
    }
  }

  function commitAttemptFailure(record, reasonCode) {
    if (!record.attempt_ref) return null;
    const acceptance = reasonCode === 'attempt_timeout'
      ? governedCoordinator.timeoutAttempt(record.attempt_ref)
      : governedCoordinator.cancelAttempt(record.attempt_ref);
    if (acceptance?.accepted !== true ||
        acceptance.attempt_ref !== record.attempt_ref ||
        acceptance.outcome !== 'failure') {
      reject('edge_attempt_terminal_invalid');
    }
    record.attempt_protocol =
      governedCoordinator.protocol(record.attempt_ref);
    return acceptance;
  }

  function commitContextResolutionFailure(record, reasonCode) {
    if (!record.resolution_ref) return null;
    const acceptance = reasonCode === 'resolution_timeout'
      ? resolutionCoordinator.timeoutResolution(record.resolution_ref)
      : resolutionCoordinator.cancelResolution(record.resolution_ref);
    if (acceptance?.accepted !== true ||
        acceptance.resolution_ref !== record.resolution_ref ||
        acceptance.outcome !== 'failure') {
      reject('edge_context_resolution_terminal_invalid');
    }
    record.context_resolution_protocol =
      resolutionCoordinator.protocol(record.resolution_ref);
    return acceptance;
  }

  function refresh(record) {
    if (TERMINAL_STATES.has(record.status)) return;
    const currentMs = nowMs();
    const requestExpiresMs = Date.parse(record.request.expires_at);
    if ((record.attempt_deadline_ms !== null &&
         record.attempt_deadline_ms <= currentMs) ||
        (record.resolution_deadline_ms !== null &&
         record.resolution_deadline_ms <= currentMs) ||
        requestExpiresMs <= currentMs) {
      commitAttemptFailure(record, 'attempt_timeout');
      commitContextResolutionFailure(record, 'resolution_timeout');
      record.status = 'expired';
      record.claim = null;
      record.purge_after_ms = (record.attempt_ref || record.resolution_ref)
        ? currentMs + terminalRetentionMs
        : requestExpiresMs + terminalRetentionMs;
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
        commitAttemptFailure(record, 'attempt_timeout');
        commitContextResolutionFailure(record, 'resolution_timeout');
        record.purge_after_ms = (record.attempt_ref || record.resolution_ref)
          ? currentMs + terminalRetentionMs
          : claimExpiresMs + terminalRetentionMs;
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
    const attemptTool = GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(
      request?.tool_request?.name
    );
    let attemptHeader = null;
    let contextResolutionHeader = null;
    if (attemptTool) {
      const currentMs = nowMs();
      const requestDeadlineMs = Date.parse(request.expires_at);
      const attemptDeadlineMs = Math.min(
        requestDeadlineMs,
        currentMs +
          GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000
      );
      const contextReference =
        request.tool_request.arguments.project_context_ref;
      if (!Number.isFinite(attemptDeadlineMs) ||
          attemptDeadlineMs <= currentMs ||
          typeof contextReference !== 'string') {
        reject('edge_attempt_header_binding_invalid');
      }
      attemptHeader = createAttemptHeader({
        toolName: request.tool_request.name,
        requestDigest: digestObject(request),
        contextBindingDigest: digestObject(contextReference),
        now: new Date(currentMs),
        deadlineAt: new Date(attemptDeadlineMs).toISOString()
      });
    }
    if (request?.tool_request?.name === 'resolve_memory_context') {
      const currentMs = nowMs();
      const deadlineAtMs = Math.min(
        Date.parse(request.expires_at),
        currentMs + 60_000
      );
      if (!Number.isFinite(deadlineAtMs) || deadlineAtMs <= currentMs) {
        reject('edge_context_resolution_header_binding_invalid');
      }
      contextResolutionHeader = createContextResolutionHeader({
        requestDigest: digestObject(request),
        now: new Date(currentMs),
        deadlineAt: new Date(deadlineAtMs).toISOString()
      });
    }
    const replayReservation = submissionReplayGuard.reserveMany([
      { namespace: 'edge_submission_request_id', key: request.request_id, expiresAt: request.expires_at },
      { namespace: 'edge_submission_nonce', key: request.nonce, expiresAt: request.expires_at },
      ...(attemptHeader
        ? [{
            namespace: 'edge_submission_attempt_ref',
            key: attemptHeader.attempt_ref,
            expiresAt: attemptHeader.deadline_at
          }]
        : []),
      ...(contextResolutionHeader
        ? [{
            namespace: 'edge_submission_resolution_ref',
            key: contextResolutionHeader.resolution_ref,
            expiresAt: contextResolutionHeader.deadline_at
          }]
        : [])
    ]);
    const record = {
      request: structuredClone(request),
      response: null,
      failure_code: null,
      status: 'queued',
      attempt: 0,
      claim: null,
      purge_after_ms: null,
      attempt_ref: attemptHeader?.attempt_ref || null,
      attempt_deadline_ms: attemptHeader
        ? Date.parse(attemptHeader.deadline_at)
        : null,
      attempt_protocol: null,
      resolution_ref: contextResolutionHeader?.resolution_ref || null,
      resolution_deadline_ms: contextResolutionHeader
        ? Date.parse(contextResolutionHeader.deadline_at)
        : null,
      context_resolution_protocol: null
    };
    if (attemptHeader) {
      let accepted = false;
      try {
        governedCoordinator.acceptAttempt(attemptHeader);
        accepted = true;
        const workingSet = governedCoordinator.workingSet(
          attemptHeader.attempt_ref
        );
        governedCoordinator.appendReceipt(
          attemptHeader.attempt_ref,
          createStageReceipt({
            header: workingSet.header,
            receipts: workingSet.receipts,
            stage: 'EDGE_VALIDATED'
          })
        );
      } catch (error) {
        if (accepted) {
          try {
            governedCoordinator.cancelAttempt(attemptHeader.attempt_ref);
          } catch {
            // A deadline can win while the submission is rolling back.
          }
        }
        replayReservation.rollback();
        throw error;
      }
    }
    if (contextResolutionHeader) {
      let accepted = false;
      try {
        resolutionCoordinator.acceptResolution(contextResolutionHeader);
        accepted = true;
        const workingSet = resolutionCoordinator.workingSet(
          contextResolutionHeader.resolution_ref
        );
        resolutionCoordinator.appendReceipt(
          contextResolutionHeader.resolution_ref,
          createContextResolutionStageReceipt({
            header: workingSet.header,
            receipts: workingSet.receipts,
            stage: 'EDGE_VALIDATED'
          })
        );
      } catch (error) {
        if (accepted) {
          try {
            resolutionCoordinator.cancelResolution(
              contextResolutionHeader.resolution_ref
            );
          } catch {
            // A deadline can win while submission is rolling back.
          }
        }
        replayReservation.rollback();
        throw error;
      }
    }
    replayReservation.commit();
    records.set(request.request_id, record);
    emit('request_queued', record);
    return {
      request_id: request.request_id,
      status: record.status,
      ...(attemptHeader
        ? { attempt_ref: attemptHeader.attempt_ref }
        : {}),
      ...(contextResolutionHeader
        ? { resolution_ref: contextResolutionHeader.resolution_ref }
        : {})
    };
  }

  function claim(relayId) {
    if (typeof relayId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(relayId)) {
      reject('edge_relay_id_invalid');
    }
    refreshAndPrune();
    for (const record of records.values()) {
      if (record.status !== 'queued') continue;
      const configuredExpiresMs = nowMs() + claimLeaseMs;
      const expiresMs = record.attempt_deadline_ms === null
        ? (record.resolution_deadline_ms === null
          ? configuredExpiresMs
          : Math.min(configuredExpiresMs, record.resolution_deadline_ms))
        : Math.min(configuredExpiresMs, record.attempt_deadline_ms,
          record.resolution_deadline_ms ?? Number.POSITIVE_INFINITY);
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
        attempt: record.attempt,
        ...(record.attempt_ref
          ? {
              governed_read_attempt:
                governedCoordinator.workingSet(record.attempt_ref)
            }
          : {}),
        ...(record.resolution_ref
          ? {
              governed_context_resolution:
                resolutionCoordinator.workingSet(record.resolution_ref)
            }
          : {})
      };
    }
    return null;
  }

  function acknowledge(requestId, claimToken) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (activeClaim.acked) reject('edge_claim_ack_replay');
    activeClaim.acked = true;
    if (record.attempt_deadline_ms !== null) {
      activeClaim.expires_ms = record.attempt_deadline_ms;
      if (activeClaim.expires_ms <= nowMs()) {
        refresh(record);
        reject('edge_claim_expired');
      }
    }
    emit('claim_acknowledged', record);
    return { request_id: requestId, status: 'acked', attempt: record.attempt };
  }

  async function complete(
    requestId,
    claimToken,
    response,
    governedReadAttemptCandidate = null,
    governedContextResolutionCandidate = null
  ) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (!activeClaim.acked) reject('edge_claim_not_acknowledged');
    await verifyResponse(response, record.request);
    const currentRecord = requireRecord(requestId);
    const currentClaim = requireLiveClaim(currentRecord, claimToken);
    if (!currentClaim.acked) reject('edge_claim_not_acknowledged');
    if ((currentRecord.attempt_ref === null) !==
        (governedReadAttemptCandidate === null)) {
      reject('edge_attempt_candidate_required');
    }
    if ((currentRecord.resolution_ref === null) !==
        (governedContextResolutionCandidate === null)) {
      reject('edge_context_resolution_candidate_required');
    }
    if (currentRecord.attempt_ref) {
      let expectedBinding;
      try {
        validateGovernedReadAttemptProtocol(
          governedReadAttemptCandidate
        );
        expectedBinding = governedReadAttemptResponseBindingDigest({
          requestDigest: digestObject(currentRecord.request),
          terminalDigest:
            governedReadAttemptCandidate.terminal.terminal_digest
        });
      } catch {
        reject('edge_attempt_response_binding_invalid');
      }
      if (response?.receipt_chain?.relay !== expectedBinding ||
          canonicalJson(response?.structured_content?.attempt) !==
            canonicalJson(projectGovernedReadAttemptPublic(
              governedReadAttemptCandidate
            ))) {
        reject('edge_attempt_response_binding_invalid');
      }
    } else if (Object.hasOwn(
      response?.structured_content || {},
      'attempt'
    )) {
      reject('edge_attempt_response_binding_invalid');
    }
    if (currentRecord.resolution_ref) {
      try {
        validateGovernedContextResolutionProtocol(
          governedContextResolutionCandidate
        );
      } catch {
        reject('edge_context_resolution_candidate_invalid');
      }
      if (governedContextResolutionCandidate.header.resolution_ref !==
            currentRecord.resolution_ref ||
          governedContextResolutionCandidate.header.request_digest !==
            digestObject(currentRecord.request)) {
        reject('edge_context_resolution_candidate_invalid');
      }
      if (!isGovernedContextResolutionWorkingSetExtension(
        resolutionCoordinator.workingSet(currentRecord.resolution_ref),
        {
          header: governedContextResolutionCandidate.header,
          receipts: governedContextResolutionCandidate.receipts
        }
      )) {
        reject('edge_context_resolution_candidate_invalid');
      }
      const terminal = governedContextResolutionCandidate.terminal;
      const expectedStatus = terminal.outcome === 'success'
        ? 'resolved'
        : contextResolutionFailureRegistryEntry(
          terminal.reason_code
        ).public_response_status;
      if (expectedStatus === null ||
          response?.status !== (expectedStatus === 'resolved' ? 'ok' : expectedStatus) ||
          response?.structured_content?.context_status !== expectedStatus) {
        reject('edge_context_resolution_response_binding_invalid');
      }
    }
    const acceptedResponse = structuredClone(response);
    if (currentRecord.attempt_ref) {
      governedCoordinator.commitProtocolCandidate(
        currentRecord.attempt_ref,
        governedReadAttemptCandidate
      );
      currentRecord.attempt_protocol =
        governedCoordinator.protocol(currentRecord.attempt_ref);
    }
    if (currentRecord.resolution_ref) {
      resolutionCoordinator.commitProtocolCandidate(
        currentRecord.resolution_ref,
        governedContextResolutionCandidate
      );
      currentRecord.context_resolution_protocol =
        resolutionCoordinator.protocol(currentRecord.resolution_ref);
    }
    currentRecord.response = acceptedResponse;
    currentRecord.status = 'completed';
    currentRecord.claim = null;
    currentRecord.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_completed', currentRecord);
    settleWaiters(currentRecord);
    return { request_id: requestId, status: currentRecord.status };
  }

  function fail(
    requestId,
    claimToken,
    governedContextResolutionCandidate,
    errorCode
  ) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (!activeClaim.acked) reject('edge_claim_not_acknowledged');
    if (!record.resolution_ref || record.attempt_ref) {
      reject('edge_context_resolution_failure_forbidden');
    }
    if (typeof errorCode !== 'string' ||
        !/^[a-z][a-z0-9_]{0,79}$/u.test(errorCode)) {
      reject('edge_context_resolution_failure_code_invalid');
    }
    try {
      validateGovernedContextResolutionProtocol(
        governedContextResolutionCandidate
      );
    } catch {
      reject('edge_context_resolution_candidate_invalid');
    }
    if (governedContextResolutionCandidate.header.resolution_ref !==
          record.resolution_ref ||
        governedContextResolutionCandidate.header.request_digest !==
          digestObject(record.request) ||
        governedContextResolutionCandidate.terminal.outcome !== 'failure') {
      reject('edge_context_resolution_candidate_invalid');
    }
    if (!isGovernedContextResolutionWorkingSetExtension(
      resolutionCoordinator.workingSet(record.resolution_ref),
      {
        header: governedContextResolutionCandidate.header,
        receipts: governedContextResolutionCandidate.receipts
      }
    )) {
      reject('edge_context_resolution_candidate_invalid');
    }
    resolutionCoordinator.commitProtocolCandidate(
      record.resolution_ref,
      governedContextResolutionCandidate
    );
    record.context_resolution_protocol =
      resolutionCoordinator.protocol(record.resolution_ref);
    record.failure_code = errorCode;
    record.status = 'failed';
    record.claim = null;
    record.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_failed', record, { error_code: errorCode });
    settleWaiters(record);
    return { request_id: requestId, status: record.status };
  }

  function cancel(requestId) {
    const record = requireRecord(requestId);
    if (TERMINAL_STATES.has(record.status)) reject('edge_request_terminal');
    commitAttemptFailure(record, 'attempt_cancelled');
    commitContextResolutionFailure(record, 'resolution_cancelled');
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
      if (record.attempt_protocol) {
        return {
          request_id: requestId,
          status: record.status,
          governed_read_attempt_result:
            attemptFailureResult(record)
        };
      }
      return { request_id: requestId, status: record.status };
    }
    return {
      request_id: requestId,
      status: record.status,
      response: completedBrokerResult(record)
    };
  }

  function waitForResult(requestId, { signal, timeoutMs = 30_000 } = {}) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60_000) {
      reject('edge_wait_timeout_invalid');
    }
    const record = requireRecord(requestId);
    if (record.status === 'completed') {
      return Promise.resolve(completedBrokerResult(record));
    }
    if (record.attempt_protocol) {
      return Promise.resolve(attemptFailureResult(record));
    }
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
        try {
          const currentRecord = requireRecord(requestId);
          if (!TERMINAL_STATES.has(currentRecord.status)) {
            commitAttemptFailure(currentRecord, 'attempt_timeout');
            commitContextResolutionFailure(currentRecord, 'resolution_timeout');
            currentRecord.status = 'expired';
            currentRecord.claim = null;
            currentRecord.purge_after_ms =
              nowMs() + terminalRetentionMs;
            emit('request_expired', currentRecord);
            settleWaiters(currentRecord);
          }
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
        if (current?.governed_read_attempt_result) {
          resolve(current.governed_read_attempt_result);
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
    const counts = { queued: 0, claimed: 0, completed: 0, cancelled: 0, expired: 0, failed: 0 };
    for (const record of records.values()) counts[record.status] += 1;
    return Object.freeze({
      in_memory_only: true,
      governed_read_attempts_enabled: true,
      request_count: records.size,
      states: counts
    });
  }

  function close() {
    for (const record of records.values()) {
      if (!TERMINAL_STATES.has(record.status)) {
        try {
          commitAttemptFailure(record, 'attempt_cancelled');
          commitContextResolutionFailure(record, 'resolution_cancelled');
        } catch {
          // Coordinator-loss reporting below preserves fail-closed evidence.
        }
        record.status = 'expired';
        record.claim = null;
        record.purge_after_ms = nowMs();
        settleWaiters(record);
      }
    }
    governedCoordinator.reportCoordinatorLoss();
    resolutionCoordinator.reportCoordinatorLoss();
    records.clear();
  }

  return Object.freeze({
    governedReadAttempts: true,
    governedContextResolutions: true,
    submit,
    claim,
    acknowledge,
    complete,
    fail,
    cancel,
    state,
    result,
    waitForResult,
    snapshot,
    close
  });
}

function createGovernedReadAttemptCoordinator({
  clock = () => new Date(),
  maxAttempts = 64,
  maxRetainedAttempts = Math.max(maxAttempts, 256),
  terminalRetentionMs =
    GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000,
  eventSink,
  eventComponent = 'transient_edge_broker'
} = {}) {
  if (typeof clock !== 'function') reject('attempt_coordinator_clock_invalid');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 1024) {
    reject('attempt_coordinator_capacity_invalid');
  }
  if (!Number.isInteger(maxRetainedAttempts) ||
      maxRetainedAttempts < maxAttempts ||
      maxRetainedAttempts > 4096) {
    reject('attempt_coordinator_retention_capacity_invalid');
  }
  if (!Number.isInteger(terminalRetentionMs) ||
      terminalRetentionMs < 10 ||
      terminalRetentionMs >
        GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000) {
    reject('attempt_coordinator_terminal_retention_invalid');
  }
  if (eventSink !== undefined && typeof eventSink !== 'function') {
    reject('attempt_coordinator_event_sink_invalid');
  }
  if (typeof eventComponent !== 'string' ||
      !/^[a-z][a-z0-9_]{0,79}$/u.test(eventComponent)) {
    reject('attempt_coordinator_event_component_invalid');
  }

  const attempts = new Map();
  let activeAttempts = 0;
  let eventDispatchDepth = 0;

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date
      ? value.getTime()
      : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) reject('attempt_coordinator_clock_invalid');
    return milliseconds;
  }

  function deadlineReached(record) {
    return Date.parse(record.header.deadline_at) <= nowMs();
  }

  function pruneExpiredTerminalAttempts(currentMs) {
    for (const [attemptRef, record] of attempts) {
      if (record.terminal &&
          Number.isFinite(record.purge_after_ms) &&
          record.purge_after_ms <= currentMs) {
        attempts.delete(attemptRef);
      }
    }
  }

  function emit(event, payload = {}) {
    if (!eventSink) return;
    eventDispatchDepth += 1;
    try {
      const pending = eventSink(Object.freeze({
        component: eventComponent,
        event,
        ...payload
      }));
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch {
      // Protocol observation is independent from the coordinator's CAS state.
    } finally {
      eventDispatchDepth -= 1;
    }
  }

  function guardMutation(operation) {
    return (...args) => {
      if (eventDispatchDepth > 0) {
        reject('attempt_coordinator_reentrant_mutation');
      }
      return operation(...args);
    };
  }

  function requireAttempt(attemptRef) {
    const record = attempts.get(attemptRef);
    if (!record) reject('attempt_not_found');
    return record;
  }

  function acceptAttempt(header) {
    validateAttemptHeader(header);
    const acceptedAtMs = nowMs();
    pruneExpiredTerminalAttempts(acceptedAtMs);
    if (Date.parse(header.created_at) > acceptedAtMs) {
      reject('attempt_created_at_in_future');
    }
    if (Date.parse(header.deadline_at) <= acceptedAtMs) {
      reject('attempt_deadline_expired');
    }
    if (attempts.has(header.attempt_ref)) reject('attempt_ref_replay');
    if (activeAttempts >= maxAttempts) {
      reject('attempt_coordinator_capacity_exceeded');
    }
    if (attempts.size >= maxRetainedAttempts) {
      reject('attempt_coordinator_retention_capacity_exceeded');
    }
    const acceptedHeader = structuredClone(header);
    const created = createStageReceipt({
      header: acceptedHeader,
      receipts: [],
      stage: 'CREATED'
    });
    const record = {
      header: acceptedHeader,
      receipts: [structuredClone(created)],
      terminal: null,
      purge_after_ms: null
    };
    attempts.set(header.attempt_ref, record);
    activeAttempts += 1;
    emit('attempt_accepted', { header: structuredClone(acceptedHeader) });

    emit('attempt_receipt_appended', {
      attempt_ref: header.attempt_ref,
      receipt: structuredClone(created)
    });
    return Object.freeze({
      attempt_ref: header.attempt_ref,
      header_digest: created.previous_digest,
      created_receipt_digest: created.receipt_digest
    });
  }

  function appendReceipt(attemptRef, receipt) {
    const record = requireAttempt(attemptRef);
    if (record.terminal) reject('attempt_terminal_already_committed');
    if (deadlineReached(record)) {
      commitCoordinatorFailure(attemptRef, 'attempt_timeout');
      reject('attempt_receipt_after_deadline');
    }
    validateStageReceipt(receipt, {
      header: record.header,
      receipts: record.receipts
    });
    const prospectiveReceipts = [
      ...record.receipts,
      receipt
    ];
    validateAttemptCounterRelationships(
      aggregateAttemptCounters(prospectiveReceipts)
    );
    if (receipt.outcome === 'failed') {
      createTerminalEnvelope({
        header: record.header,
        receipts: prospectiveReceipts,
        outcome: 'failure',
        reasonCode: receipt.reason_code,
        evidenceComplete: false,
        failureOrigin: receipt.origin
      });
    }
    record.receipts.push(structuredClone(receipt));
    emit('attempt_receipt_appended', {
      attempt_ref: attemptRef,
      receipt: structuredClone(receipt)
    });
    return Object.freeze({
      attempt_ref: attemptRef,
      sequence: receipt.sequence,
      receipt_digest: receipt.receipt_digest
    });
  }

  function rejectTerminalCandidate(attemptRef) {
    emit('attempt_terminal_rejected', {
      attempt_ref: attemptRef,
      rejection_code: 'attempt_terminal_already_committed'
    });
    reject('attempt_terminal_already_committed');
  }

  function finalizeTerminalCandidate(
    attemptRef,
    record,
    terminal,
    committedAtMs
  ) {
    if (record.terminal) rejectTerminalCandidate(attemptRef);
    record.terminal = structuredClone(terminal);
    record.purge_after_ms = committedAtMs + terminalRetentionMs;
    activeAttempts -= 1;
    return Object.freeze({
      attempt_ref: attemptRef,
      outcome: terminal.outcome,
      terminal_digest: terminal.terminal_digest,
      accepted: true
    });
  }

  function emitTerminalCommitted(attemptRef, terminal) {
    emit('attempt_terminal_committed', {
      attempt_ref: attemptRef,
      terminal: structuredClone(terminal)
    });
  }

  function acceptTerminalCandidate(
    attemptRef,
    record,
    terminal,
    { deadlineWins = false } = {}
  ) {
    if (record.terminal) rejectTerminalCandidate(attemptRef);
    validateTerminalEnvelope(terminal, {
      header: record.header,
      receipts: record.receipts
    });
    const committedAtMs = nowMs();
    if (deadlineWins &&
        Date.parse(record.header.deadline_at) <= committedAtMs) {
      commitCoordinatorFailure(attemptRef, 'attempt_timeout');
      rejectTerminalCandidate(attemptRef);
    }
    const acceptance = finalizeTerminalCandidate(
      attemptRef,
      record,
      terminal,
      committedAtMs
    );
    emitTerminalCommitted(attemptRef, terminal);
    return acceptance;
  }

  function commitCoordinatorFailure(attemptRef, reasonCode) {
    const record = requireAttempt(attemptRef);
    if (record.terminal) rejectTerminalCandidate(attemptRef);
    const lastReceipt = record.receipts.at(-1) || null;
    const failedReceipt = lastReceipt?.outcome === 'failed'
      ? lastReceipt
      : null;
    const terminal = createTerminalEnvelope({
      header: record.header,
      receipts: record.receipts,
      outcome: 'failure',
      reasonCode: failedReceipt?.reason_code || reasonCode,
      evidenceComplete: false,
      failureOrigin: failedReceipt?.origin || 'edge_broker'
    });
    return acceptTerminalCandidate(attemptRef, record, terminal);
  }

  function commitTerminal(attemptRef, terminal) {
    const record = requireAttempt(attemptRef);
    if (record.terminal) rejectTerminalCandidate(attemptRef);
    if (deadlineReached(record)) {
      commitCoordinatorFailure(attemptRef, 'attempt_timeout');
      rejectTerminalCandidate(attemptRef);
    }
    return acceptTerminalCandidate(
      attemptRef,
      record,
      terminal,
      { deadlineWins: true }
    );
  }

  function commitProtocolCandidate(attemptRef, candidate) {
    const record = requireAttempt(attemptRef);
    if (record.terminal) rejectTerminalCandidate(attemptRef);
    if (deadlineReached(record)) {
      commitCoordinatorFailure(attemptRef, 'attempt_timeout');
      rejectTerminalCandidate(attemptRef);
    }
    validateGovernedReadAttemptProtocol(candidate);
    const existingWorkingSet = createGovernedReadAttemptWorkingSet({
      header: record.header,
      receipts: record.receipts
    });
    const candidateWorkingSet = createGovernedReadAttemptWorkingSet({
      header: candidate.header,
      receipts: candidate.receipts
    });
    if (!isGovernedReadAttemptWorkingSetExtension(
      existingWorkingSet,
      candidateWorkingSet
    )) {
      reject('attempt_candidate_prefix_invalid');
    }
    const acceptedReceipts = [...record.receipts];
    for (const receipt of candidate.receipts.slice(record.receipts.length)) {
      validateStageReceipt(receipt, {
        header: record.header,
        receipts: acceptedReceipts
      });
      acceptedReceipts.push(receipt);
      validateAttemptCounterRelationships(
        aggregateAttemptCounters(acceptedReceipts)
      );
    }
    validateTerminalEnvelope(candidate.terminal, {
      header: record.header,
      receipts: acceptedReceipts
    });
    const committedAtMs = nowMs();
    if (Date.parse(record.header.deadline_at) <= committedAtMs) {
      commitCoordinatorFailure(attemptRef, 'attempt_timeout');
      rejectTerminalCandidate(attemptRef);
    }
    const appendedReceipts =
      candidate.receipts.slice(record.receipts.length)
        .map(receipt => structuredClone(receipt));
    record.receipts.push(...appendedReceipts);
    const acceptance = finalizeTerminalCandidate(
      attemptRef,
      record,
      candidate.terminal,
      committedAtMs
    );
    for (const receipt of appendedReceipts) {
      emit('attempt_receipt_appended', {
        attempt_ref: attemptRef,
        receipt: structuredClone(receipt)
      });
    }
    emitTerminalCommitted(attemptRef, candidate.terminal);
    return acceptance;
  }

  function timeoutAttempt(attemptRef) {
    return commitCoordinatorFailure(attemptRef, 'attempt_timeout');
  }

  function cancelAttempt(attemptRef) {
    const record = requireAttempt(attemptRef);
    if (record.terminal) rejectTerminalCandidate(attemptRef);
    return commitCoordinatorFailure(
      attemptRef,
      deadlineReached(record) ? 'attempt_timeout' : 'attempt_cancelled'
    );
  }

  function expireDueAttempts() {
    const currentMs = nowMs();
    let committed = 0;
    for (const [attemptRef, record] of attempts) {
      if (record.terminal || Date.parse(record.header.deadline_at) > currentMs) continue;
      timeoutAttempt(attemptRef);
      committed += 1;
    }
    return committed;
  }

  function snapshot(attemptRef) {
    const record = requireAttempt(attemptRef);
    const lastReceipt = record.receipts.at(-1) || null;
    return Object.freeze({
      attempt_ref: attemptRef,
      receipt_count: record.receipts.length,
      last_stage: lastReceipt?.stage || null,
      terminal_committed: record.terminal !== null,
      terminal_outcome: record.terminal?.outcome || null,
      in_memory_only: true
    });
  }

  function protocol(attemptRef) {
    const record = requireAttempt(attemptRef);
    if (!record.terminal) reject('attempt_terminal_missing');
    return createGovernedReadAttemptProtocol({
      header: record.header,
      receipts: record.receipts,
      terminal: record.terminal
    });
  }

  function workingSet(attemptRef) {
    const record = requireAttempt(attemptRef);
    if (record.terminal) reject('attempt_terminal_already_committed');
    return createGovernedReadAttemptWorkingSet({
      header: record.header,
      receipts: record.receipts
    });
  }

  function reportCoordinatorLoss() {
    let missing = 0;
    for (const [attemptRef, record] of attempts) {
      if (record.terminal) continue;
      emit('attempt_terminal_missing', { attempt_ref: attemptRef });
      missing += 1;
    }
    attempts.clear();
    activeAttempts = 0;
    return Object.freeze({
      active_attempts_lost: missing,
      terminals_fabricated: 0
    });
  }

  return Object.freeze({
    acceptAttempt: guardMutation(acceptAttempt),
    appendReceipt: guardMutation(appendReceipt),
    cancelAttempt: guardMutation(cancelAttempt),
    commitProtocolCandidate: guardMutation(commitProtocolCandidate),
    commitTerminal: guardMutation(commitTerminal),
    expireDueAttempts: guardMutation(expireDueAttempts),
    protocol,
    reportCoordinatorLoss: guardMutation(reportCoordinatorLoss),
    snapshot,
    timeoutAttempt: guardMutation(timeoutAttempt),
    workingSet
  });
}

module.exports = {
  GOVERNED_ATTEMPT_FAILURE_RESULT_KIND,
  GOVERNED_ATTEMPT_RESPONSE_RESULT_KIND,
  TERMINAL_STATES,
  createGovernedReadAttemptCoordinator,
  createTransientRequestBroker
};
