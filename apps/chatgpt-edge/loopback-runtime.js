'use strict';

const http = require('node:http');

const {
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  InMemoryReplayGuard,
  LIMITS,
  canonicalJson,
  createOpaqueId,
  createContextResolutionHeader,
  createContextResolutionStageReceipt,
  createStageReceipt,
  digestObject,
  governedReadAttemptResponseBindingDigest,
  projectGovernedReadAttemptPublic,
  isGovernedContextResolutionWorkingSetExtension,
  validateAttemptHeader,
  validateGovernedContextResolutionProtocol,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const {
  createGovernedReadAttemptCoordinator
} = require('./transient-request-broker');
const {
  deriveGovernedReadAttemptRetention
} = require('./governed-read-attempt-retention');
const { createGovernedContextResolutionCoordinator } =
  require('./governed-context-resolution-coordinator');

const LOOPBACK_HOST = '127.0.0.1';
const MAX_CONTROL_BODY_BYTES = LIMITS.maxResponseBytes + LIMITS.maxRequestBytes + 4096;
const TERMINAL_STATES = new Set(['completed', 'cancelled', 'expired', 'failed']);
const REQUIRED_ATTEMPT_COORDINATOR_METHODS = Object.freeze([
  'acceptAttempt',
  'appendReceipt',
  'cancelAttempt',
  'commitProtocolCandidate',
  'reportCoordinatorLoss',
  'timeoutAttempt',
  'workingSet'
]);

function createLoopbackEdgeRuntime({
  verifyRequest,
  verifyResponse,
  clock = () => new Date(),
  claimLeaseMs = 5_000,
  terminalRetentionMs = 5_000,
  maxInFlight = 64,
  maxRecords = 256,
  eventSink,
  governedReadAttempts = false,
  attemptCoordinator = null,
  attemptEventSink,
  governedContextResolutions = false,
  contextResolutionCoordinator = null,
  contextResolutionEventSink
} = {}) {
  if (typeof verifyRequest !== 'function') reject('edge_request_verifier_missing');
  if (typeof verifyResponse !== 'function') reject('edge_response_verifier_missing');
  if (!Number.isInteger(claimLeaseMs) || claimLeaseMs < 10 || claimLeaseMs > 30_000) {
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
  if (typeof governedReadAttempts !== 'boolean' ||
      (attemptEventSink !== undefined &&
       typeof attemptEventSink !== 'function')) {
    reject('edge_attempt_runtime_invalid');
  }
  if (typeof governedContextResolutions !== 'boolean' ||
      (contextResolutionEventSink !== undefined &&
       typeof contextResolutionEventSink !== 'function')) {
    reject('edge_context_resolution_runtime_invalid');
  }
  const attemptRetention = governedReadAttempts
    ? deriveGovernedReadAttemptRetention({
        maxRecords,
        requestRecordRetentionMs: terminalRetentionMs
      })
    : null;
  const governedCoordinator = governedReadAttempts
    ? attemptCoordinator || createGovernedReadAttemptCoordinator({
        clock,
        maxAttempts: maxInFlight,
        maxRetainedAttempts: attemptRetention.maxRetainedAttempts,
        terminalRetentionMs: attemptRetention.terminalRetentionMs,
        eventSink: attemptEventSink
      })
    : null;
  const resolutionCoordinator = governedContextResolutions
    ? contextResolutionCoordinator || createGovernedContextResolutionCoordinator({
        clock,
        maxResolutions: maxInFlight,
        maxRetainedResolutions: Math.max(maxInFlight, maxRecords),
        terminalRetentionMs,
        eventSink: contextResolutionEventSink
      })
    : null;
  if (attemptCoordinator !== null && (
    !governedReadAttempts ||
    REQUIRED_ATTEMPT_COORDINATOR_METHODS.some(method =>
      typeof attemptCoordinator[method] !== 'function'
    )
  )) {
    reject('edge_attempt_coordinator_invalid');
  }

  const records = new Map();
  const replayRetentionWindows = Math.ceil(
    LIMITS.maxEnvelopeTtlSeconds * 1000 / terminalRetentionMs
  );
  const submissionReplayGuard = new InMemoryReplayGuard({
    maxEntries:
      maxRecords *
      (governedReadAttempts || governedContextResolutions ? 3 : 2) *
      replayRetentionWindows,
    clock
  });
  let started = false;

  function emit(event, record, extra = {}) {
    if (!eventSink) return;
    try {
      const pending = eventSink(Object.freeze({
        component: 'loopback_edge',
        event,
        request_id: record?.request.request_id || null,
        status: record?.status || null,
        attempt: record?.attempt || 0,
        ...extra
      }));
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch {
      // Observability is best-effort and cannot alter queue state transitions.
    }
  }

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) reject('edge_clock_invalid');
    return milliseconds;
  }

  function confirmAttemptTimeout(record) {
    if (!record.attempt_ref) return;
    const confirmation =
      governedCoordinator.timeoutAttempt(record.attempt_ref);
    if (confirmation?.accepted !== true ||
        confirmation.attempt_ref !== record.attempt_ref ||
        confirmation.outcome !== 'failure' ||
        !/^sha256:[a-f0-9]{64}$/u.test(
          confirmation.terminal_digest || ''
        )) {
      reject('edge_attempt_timeout_terminal_invalid');
    }
  }

  function confirmResolutionTimeout(record) {
    if (!record.resolution_ref) return;
    const confirmation = resolutionCoordinator.timeoutResolution(
      record.resolution_ref
    );
    if (confirmation?.accepted !== true ||
        confirmation.resolution_ref !== record.resolution_ref ||
        confirmation.outcome !== 'failure') {
      reject('edge_context_resolution_timeout_terminal_invalid');
    }
  }

  function refresh(record) {
    if (TERMINAL_STATES.has(record.status)) return;
    const currentMs = nowMs();
    if ((record.attempt_deadline_ms !== null &&
         record.attempt_deadline_ms <= currentMs) ||
        (record.resolution_deadline_ms !== null &&
         record.resolution_deadline_ms <= currentMs)) {
      confirmAttemptTimeout(record);
      confirmResolutionTimeout(record);
      record.status = 'expired';
      record.claim = null;
      record.purge_after_ms =
        currentMs + terminalRetentionMs;
      emit('request_expired', record);
      return;
    }
    const requestExpiresMs = Date.parse(record.request.expires_at);
    if (requestExpiresMs <= currentMs) {
      confirmAttemptTimeout(record);
      confirmResolutionTimeout(record);
      record.status = 'expired';
      record.claim = null;
      record.purge_after_ms = requestExpiresMs + terminalRetentionMs;
      emit('request_expired', record);
      return;
    }
    if (record.status === 'claimed' && record.claim.expires_ms <= currentMs) {
      const acknowledged = record.claim.acked;
      const claimExpiresMs = record.claim.expires_ms;
      if (acknowledged) {
        confirmAttemptTimeout(record);
        confirmResolutionTimeout(record);
      }
      record.status = acknowledged ? 'expired' : 'queued';
      record.claim = null;
      if (acknowledged) record.purge_after_ms = claimExpiresMs + terminalRetentionMs;
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

  async function submit(request, attemptHeader = null) {
    await verifyRequest(request);
    const attemptTool =
      GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(
        request?.tool_request?.name
      );
    const attemptHeaderRequired =
      governedCoordinator !== null && attemptTool;
    if ((attemptHeader !== null) !== attemptHeaderRequired) {
      reject('edge_attempt_header_required');
    }
    if (attemptHeader !== null) {
      validateAttemptHeader(attemptHeader);
      const contextReference =
        request?.tool_request?.arguments?.project_context_ref;
      if (attemptHeader.tool_name !== request?.tool_request?.name ||
          attemptHeader.request_digest !== digestObject(request) ||
          typeof contextReference !== 'string' ||
          attemptHeader.context_binding_digest !==
            digestObject(contextReference) ||
          Date.parse(attemptHeader.deadline_at) >
            Date.parse(request.expires_at)) {
        reject('edge_attempt_header_binding_invalid');
      }
    }
    const contextResolutionHeader = governedContextResolutions &&
        request?.tool_request?.name === 'resolve_memory_context'
      ? createContextResolutionHeader({
          requestDigest: digestObject(request),
          now: clock(),
          deadlineAt: new Date(Math.min(
            Date.parse(request.expires_at), nowMs() + 60_000
          )).toISOString()
        })
      : null;
    refreshAndPrune();
    if (records.has(request.request_id)) reject('replay_detected');
    if (records.size >= maxRecords) reject('edge_record_capacity_exceeded');
    const activeCount = [...records.values()].filter(record => {
      refresh(record);
      return !TERMINAL_STATES.has(record.status);
    }).length;
    if (activeCount >= maxInFlight) reject('edge_inflight_capacity_exceeded');
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
      status: 'queued',
      attempt: 0,
      claim: null,
      purge_after_ms: null,
      attempt_ref: attemptHeader?.attempt_ref || null,
      attempt_deadline_ms: attemptHeader
        ? Date.parse(attemptHeader.deadline_at)
        : null,
      resolution_ref: contextResolutionHeader?.resolution_ref || null,
      resolution_deadline_ms: contextResolutionHeader
        ? Date.parse(contextResolutionHeader.deadline_at)
        : null
    };
    if (attemptHeader) {
      let attemptAccepted = false;
      try {
        governedCoordinator.acceptAttempt(attemptHeader);
        attemptAccepted = true;
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
        if (attemptAccepted) {
          try {
            governedCoordinator.cancelAttempt(
              attemptHeader.attempt_ref
            );
          } catch {
            // A deadline may already have won the coordinator terminal CAS.
          }
        }
        replayReservation.rollback();
        throw error;
      }
    }
    if (contextResolutionHeader) {
      let resolutionAccepted = false;
      try {
        resolutionCoordinator.acceptResolution(contextResolutionHeader);
        resolutionAccepted = true;
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
        if (resolutionAccepted) {
          try {
            resolutionCoordinator.cancelResolution(
              contextResolutionHeader.resolution_ref
            );
          } catch {
            // The terminal CAS may already have selected timeout.
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
      const expiresMs = Math.min(
        configuredExpiresMs,
        record.attempt_deadline_ms ?? Number.POSITIVE_INFINITY,
        record.resolution_deadline_ms ?? Number.POSITIVE_INFINITY
      );
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
    if (record.attempt_deadline_ms !== null ||
        record.resolution_deadline_ms !== null) {
      activeClaim.expires_ms = Math.min(
        record.attempt_deadline_ms ?? Number.POSITIVE_INFINITY,
        record.resolution_deadline_ms ?? Number.POSITIVE_INFINITY
      );
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
        expectedBinding =
          governedReadAttemptResponseBindingDigest({
            requestDigest: digestObject(currentRecord.request),
            terminalDigest:
              governedReadAttemptCandidate?.terminal?.terminal_digest
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
      const responseResolved = response?.status === 'ok' &&
        response?.structured_content?.context_status === 'resolved';
      if ((governedContextResolutionCandidate.terminal.outcome ===
          'success') !== responseResolved) {
        reject('edge_context_resolution_response_binding_invalid');
      }
      resolutionCoordinator.commitProtocolCandidate(
        currentRecord.resolution_ref,
        governedContextResolutionCandidate
      );
    }
    const acceptedResponse = structuredClone(response);
    if (currentRecord.attempt_ref) {
      governedCoordinator.commitProtocolCandidate(
        currentRecord.attempt_ref,
        governedReadAttemptCandidate
      );
    }
    currentRecord.response = acceptedResponse;
    currentRecord.status = 'completed';
    currentRecord.claim = null;
    currentRecord.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_completed', currentRecord);
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
    if (!activeClaim.acked || !record.resolution_ref || record.attempt_ref) {
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
    record.status = 'failed';
    record.claim = null;
    record.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_failed', record, { error_code: errorCode });
    return { request_id: requestId, status: record.status };
  }

  function cancel(requestId) {
    const record = requireRecord(requestId);
    if (TERMINAL_STATES.has(record.status)) reject('edge_request_terminal');
    if (record.attempt_ref) {
      governedCoordinator.cancelAttempt(record.attempt_ref);
    }
    if (record.resolution_ref) {
      resolutionCoordinator.cancelResolution(record.resolution_ref);
    }
    record.status = 'cancelled';
    record.claim = null;
    record.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_cancelled', record);
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

  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const parsedUrl = new URL(incoming.url || '/', 'http://loopback.invalid');
      if (parsedUrl.search || parsedUrl.hash) reject('edge_route_query_forbidden');
      const route = `${incoming.method || ''} ${parsedUrl.pathname}`;
      if (route === 'POST /v1/requests/submit') {
        const body = await readJsonBody(incoming);
        assertControlKeys(
          body,
          body.attempt_header
            ? ['attempt_header', 'request']
            : ['request']
        );
        return sendJson(
          outgoing,
          202,
          await submit(body.request, body.attempt_header || null)
        );
      }
      if (route === 'POST /v1/relay/claim') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['relay_id']);
        const claimed = claim(body.relay_id);
        return claimed ? sendJson(outgoing, 200, claimed) : sendEmpty(outgoing, 204);
      }
      if (route === 'POST /v1/relay/ack') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id', 'claim_token']);
        return sendJson(outgoing, 200, acknowledge(body.request_id, body.claim_token));
      }
      if (route === 'POST /v1/relay/complete') {
        const body = await readJsonBody(incoming);
        assertControlKeys(
          body,
          [
            'request_id',
            'claim_token',
            'response',
            ...(body.governed_read_attempt_candidate
              ? ['governed_read_attempt_candidate']
              : []),
            ...(body.governed_context_resolution_candidate
              ? ['governed_context_resolution_candidate']
              : [])
          ]
        );
        return sendJson(outgoing, 200, await complete(
          body.request_id,
          body.claim_token,
          body.response,
          body.governed_read_attempt_candidate || null,
          body.governed_context_resolution_candidate || null
        ));
      }
      if (route === 'POST /v1/relay/fail') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, [
          'request_id',
          'claim_token',
          'governed_context_resolution_candidate',
          'error_code'
        ]);
        return sendJson(outgoing, 200, fail(
          body.request_id,
          body.claim_token,
          body.governed_context_resolution_candidate,
          body.error_code
        ));
      }
      if (route === 'POST /v1/relay/state') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id', 'claim_token']);
        return sendJson(outgoing, 200, state(body.request_id, body.claim_token));
      }
      if (route === 'POST /v1/requests/cancel') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id']);
        return sendJson(outgoing, 200, cancel(body.request_id));
      }
      if (route === 'POST /v1/requests/result') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id']);
        return sendJson(outgoing, 200, result(body.request_id));
      }
      return sendJson(outgoing, 404, { error: 'edge_route_not_found' });
    } catch (error) {
      const code = safeErrorCode(error?.code, 'edge_request_rejected');
      const statusCode = code === 'replay_detected' || code.endsWith('_replay') ? 409 :
        (code.includes('expired') || code.includes('cancelled') ? 410 : 400);
      return sendJson(outgoing, statusCode, { error: code });
    }
  });

  return Object.freeze({
    async start() {
      if (started) reject('edge_runtime_already_started');
      await new Promise((resolve, rejectStart) => {
        const onError = error => {
          server.off('listening', onListening);
          rejectStart(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(0, '127.0.0.1');
      });
      started = true;
      const address = server.address();
      if (!address || typeof address === 'string' || address.address !== LOOPBACK_HOST) {
        await stopServer(server);
        started = false;
        reject('edge_loopback_bind_failed');
      }
      return Object.freeze({
        host: address.address,
        port: address.port,
        url: `http://${address.address}:${address.port}`
      });
    },
    async stop() {
      if (!started) return;
      await stopServer(server);
      started = false;
      try {
        governedCoordinator?.reportCoordinatorLoss();
        resolutionCoordinator?.reportCoordinatorLoss();
      } finally {
        records.clear();
      }
    },
    snapshot() {
      refreshAndPrune();
      const counts = {
        queued: 0,
        claimed: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
        failed: 0
      };
      for (const record of records.values()) {
        counts[record.status] += 1;
      }
      return Object.freeze({
        in_memory_only: true,
        request_count: records.size,
        states: counts,
        ...(governedCoordinator
          ? { governed_read_attempts_enabled: true }
          : {})
      });
    }
  });
}

function readJsonBody(incoming) {
  return new Promise((resolve, rejectRead) => {
    const chunks = [];
    let bytes = 0;
    incoming.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_CONTROL_BODY_BYTES) {
        rejectRead(Object.assign(new Error('edge_http_body_too_large'), { code: 'edge_http_body_too_large' }));
        incoming.destroy();
        return;
      }
      chunks.push(chunk);
    });
    incoming.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || typeof body !== 'object' || Array.isArray(body)) reject('edge_http_body_invalid');
        resolve(body);
      } catch (error) {
        rejectRead(error);
      }
    });
    incoming.on('error', rejectRead);
  });
}

function safeErrorCode(value, fallback) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(value) ? value : fallback;
}

function assertControlKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject('edge_control_shape_invalid');
  }
}

function sendJson(outgoing, statusCode, value) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  const body = JSON.stringify(value);
  outgoing.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  outgoing.end(body);
}

function sendEmpty(outgoing, statusCode) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  outgoing.writeHead(statusCode, { 'cache-control': 'no-store' });
  outgoing.end();
}

function stopServer(server) {
  return new Promise((resolve, rejectStop) => {
    server.close(error => error ? rejectStop(error) : resolve());
  });
}

module.exports = {
  LOOPBACK_HOST,
  createLoopbackEdgeRuntime
};
