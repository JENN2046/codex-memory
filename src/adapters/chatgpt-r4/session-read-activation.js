'use strict';

const {
  CONTEXT_VISIBILITIES,
  digestObject,
  reject
} = require('../../../packages/chatgpt-r4-contracts');

const SESSION_READ_TOOLS = Object.freeze([
  'memory_overview',
  'search_memory',
  'audit_memory',
  'prepare_memory_context'
]);
const SESSION_ACTIVATION_MIN_TTL_SECONDS = 30;
const SESSION_ACTIVATION_MAX_TTL_SECONDS = 300;
const SESSION_ACTIVATION_DEFAULT_TTL_SECONDS = 300;
const MAX_RETAINED_IN_FLIGHT_READS = 8;
const PRINCIPAL_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SAFE_ALIAS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;
const CONTROL_REQUEST_ID_PATTERN = /^op_[A-Za-z0-9_-]{24,96}$/u;

function createSessionReadActivationController({
  expectedPrincipalFingerprint,
  selectedProjectAlias,
  clock = () => new Date(),
  schedule = defaultSchedule,
  cancelSchedule = clearTimeout
} = {}) {
  if (!PRINCIPAL_FINGERPRINT_PATTERN.test(expectedPrincipalFingerprint || '') ||
      /^(.)\1+$/u.test(expectedPrincipalFingerprint.slice(7)) ||
      !SAFE_ALIAS_PATTERN.test(selectedProjectAlias || '') ||
      typeof clock !== 'function' || typeof schedule !== 'function' ||
      typeof cancelSchedule !== 'function') {
    reject('r4_session_activation_controller_invalid');
  }

  let generation = 0;
  let lease = null;
  let expirationTimer = null;
  const inFlightReads = new Map();
  const observations = {
    activation_count: 0,
    context_bind_count: 0,
    authorized_read_count: 0,
    completed_read_count: 0,
    suppressed_read_count: 0,
    expiry_count: 0,
    kill_count: 0,
    denied_operation_count: 0
  };

  function currentTime(candidate) {
    const value = candidate === undefined ? clock() : candidate;
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) reject('r4_session_activation_clock_invalid');
    return date;
  }

  function cancelExpirationTimer() {
    if (expirationTimer === null) return;
    cancelSchedule(expirationTimer);
    expirationTimer = null;
  }

  function terminalize(status, reason, now) {
    if (!lease || lease.status !== 'active') return;
    cancelExpirationTimer();
    lease.status = status;
    lease.terminalReason = reason;
    lease.terminalAt = now.toISOString();
    const retainedRead = inFlightReads.get(lease.readUseTokenDigest);
    if (retainedRead) {
      retainedRead.status = status;
      retainedRead.terminalReason = reason;
      retainedRead.terminalAt = lease.terminalAt;
    }
    if (status === 'expired') observations.expiry_count += 1;
    if (status === 'killed') observations.kill_count += 1;
  }

  function expireIfNeeded(now = currentTime()) {
    if (lease?.status === 'active' && Date.parse(lease.expiresAt) <= now.getTime()) {
      terminalize('expired', 'ttl_elapsed', now);
    }
  }

  function receiptDigest(operation, now = currentTime(), sourceLease = lease) {
    expireIfNeeded(now);
    return digestObject({
      schemaVersion: 1,
      kind: 'r4_session_activation_receipt',
      operation,
      generation: sourceLease?.generation ?? generation,
      status: sourceLease?.status || 'inactive',
      activationReferenceDigest: sourceLease?.activationReferenceDigest || null,
      contextBound: Boolean(sourceLease?.contextRefDigest),
      readInFlight: Boolean(sourceLease?.readUseTokenDigest),
      readConsumed: sourceLease?.readConsumed === true,
      expiresAt: sourceLease?.expiresAt || null,
      terminalReason: sourceLease?.terminalReason || null
    });
  }

  function scheduleExpiration(expiresAt, leaseGeneration) {
    cancelExpirationTimer();
    const delay = Math.max(0, Date.parse(expiresAt) - currentTime().getTime());
    expirationTimer = schedule(() => {
      expirationTimer = null;
      if (generation !== leaseGeneration || lease?.status !== 'active') return;
      expireIfNeeded(currentTime());
    }, delay);
  }

  function activate({
    requestId,
    requestedVisibility = 'task_start_context',
    ttlSeconds = SESSION_ACTIVATION_DEFAULT_TTL_SECONDS,
    now
  } = {}) {
    const activatedAt = currentTime(now);
    expireIfNeeded(activatedAt);
    if (!CONTROL_REQUEST_ID_PATTERN.test(requestId || '') ||
        !CONTEXT_VISIBILITIES.includes(requestedVisibility) ||
        !Number.isInteger(ttlSeconds) || ttlSeconds < SESSION_ACTIVATION_MIN_TTL_SECONDS ||
        ttlSeconds > SESSION_ACTIVATION_MAX_TTL_SECONDS) {
      reject('r4_session_activation_request_invalid');
    }
    if (lease?.status === 'active') {
      observations.denied_operation_count += 1;
      reject('r4_session_activation_already_active');
    }
    generation += 1;
    const expiresAt = new Date(activatedAt.getTime() + ttlSeconds * 1000).toISOString();
    lease = {
      generation,
      status: 'active',
      controlRequestDigest: digestObject(requestId),
      activationReferenceDigest: digestObject({ requestId, generation, expiresAt }),
      requestedVisibility,
      issuedAt: activatedAt.toISOString(),
      expiresAt,
      contextReservation: false,
      contextRefDigest: null,
      readUseTokenDigest: null,
      readConsumed: false,
      terminalReason: null,
      terminalAt: null
    };
    observations.activation_count += 1;
    scheduleExpiration(expiresAt, generation);
    return Object.freeze({
      accepted: true,
      status: 'active',
      expires_at: expiresAt,
      remaining_read_calls: 1,
      receipt_digest: receiptDigest('activate', activatedAt)
    });
  }

  function checkContextIssueAuthorization({
    principalFingerprint,
    safeProjectAlias,
    requestedVisibility,
    now
  } = {}) {
    const checkedAt = currentTime(now);
    expireIfNeeded(checkedAt);
    if (!lease || lease.status !== 'active') {
      observations.denied_operation_count += 1;
      return unavailable('resolve_memory_context', checkedAt);
    }
    if (principalFingerprint !== expectedPrincipalFingerprint ||
        safeProjectAlias !== selectedProjectAlias ||
        requestedVisibility !== lease.requestedVisibility ||
        lease.contextReservation || lease.contextRefDigest || lease.readConsumed) {
      observations.denied_operation_count += 1;
      return unavailable('resolve_memory_context', checkedAt);
    }
    return Object.freeze({
      accepted: true,
      status: 'active',
      receipt_digest: receiptDigest('preauthorize_context', checkedAt)
    });
  }

  function authorizeContextIssue(input = {}) {
    const checkedAt = currentTime(input.now);
    const preliminary = checkContextIssueAuthorization({ ...input, now: checkedAt });
    if (preliminary.accepted !== true) return preliminary;
    const remainingMs = Date.parse(lease.expiresAt) - checkedAt.getTime();
    const contextTtlSeconds = Math.min(
      SESSION_ACTIVATION_MAX_TTL_SECONDS,
      Math.floor(remainingMs / 1000)
    );
    if (contextTtlSeconds < 1) {
      terminalize('expired', 'ttl_elapsed', checkedAt);
      observations.denied_operation_count += 1;
      return unavailable('resolve_memory_context', checkedAt);
    }
    lease.contextReservation = true;
    return Object.freeze({
      accepted: true,
      status: 'active',
      context_ttl_seconds: contextTtlSeconds,
      receipt_digest: receiptDigest('authorize_context', checkedAt)
    });
  }

  function bindContext({ projectContextRef, now } = {}) {
    const boundAt = currentTime(now);
    expireIfNeeded(boundAt);
    if (!lease || lease.status !== 'active' || lease.contextReservation !== true ||
        lease.contextRefDigest || typeof projectContextRef !== 'string' || !projectContextRef) {
      observations.denied_operation_count += 1;
      reject('r4_session_context_bind_rejected');
    }
    lease.contextReservation = false;
    lease.contextRefDigest = digestObject(projectContextRef);
    observations.context_bind_count += 1;
    return Object.freeze({
      accepted: true,
      status: 'active',
      receipt_digest: receiptDigest('bind_context', boundAt)
    });
  }

  function checkReadAuthorization({
    principalFingerprint,
    toolName,
    now
  } = {}) {
    const checkedAt = currentTime(now);
    expireIfNeeded(checkedAt);
    if (!lease || lease.status !== 'active' ||
        principalFingerprint !== expectedPrincipalFingerprint ||
        !SESSION_READ_TOOLS.includes(toolName) ||
        !lease.contextRefDigest || lease.readUseTokenDigest || lease.readConsumed ||
        inFlightReads.size >= MAX_RETAINED_IN_FLIGHT_READS) {
      observations.denied_operation_count += 1;
      return unavailable(toolName, checkedAt);
    }
    return Object.freeze({
      accepted: true,
      status: 'active',
      receipt_digest: receiptDigest('preauthorize_read', checkedAt)
    });
  }

  function authorizeRead({
    principalFingerprint,
    projectContextRef,
    toolName,
    now
  } = {}) {
    const checkedAt = currentTime(now);
    expireIfNeeded(checkedAt);
    if (!lease || lease.status !== 'active' ||
        principalFingerprint !== expectedPrincipalFingerprint ||
        !SESSION_READ_TOOLS.includes(toolName) ||
        lease.contextRefDigest !== digestObject(projectContextRef || '') ||
        lease.readUseTokenDigest || lease.readConsumed ||
        inFlightReads.size >= MAX_RETAINED_IN_FLIGHT_READS) {
      observations.denied_operation_count += 1;
      return unavailable(toolName, checkedAt);
    }
    const useToken = digestObject({
      activationReferenceDigest: lease.activationReferenceDigest,
      contextRefDigest: lease.contextRefDigest,
      toolName,
      generation
    });
    lease.readUseTokenDigest = digestObject(useToken);
    inFlightReads.set(lease.readUseTokenDigest, {
      generation: lease.generation,
      status: lease.status,
      activationReferenceDigest: lease.activationReferenceDigest,
      contextRefDigest: lease.contextRefDigest,
      readUseTokenDigest: lease.readUseTokenDigest,
      readConsumed: false,
      expiresAt: lease.expiresAt,
      terminalReason: lease.terminalReason,
      terminalAt: lease.terminalAt
    });
    observations.authorized_read_count += 1;
    return Object.freeze({
      accepted: true,
      status: 'active',
      use_token: useToken,
      receipt_digest: receiptDigest('authorize_read', checkedAt)
    });
  }

  function completeRead({ useToken, now } = {}) {
    const completedAt = currentTime(now);
    expireIfNeeded(completedAt);
    const tokenDigest = digestObject(useToken || '');
    const retainedRead = inFlightReads.get(tokenDigest);
    if (!retainedRead) {
      observations.denied_operation_count += 1;
      reject('r4_session_read_completion_token_invalid');
    }
    const tokenMatches = lease?.readUseTokenDigest === tokenDigest &&
      lease.activationReferenceDigest === retainedRead.activationReferenceDigest;
    const matches = tokenMatches && lease.status === 'active';
    if (!matches) {
      inFlightReads.delete(tokenDigest);
      retainedRead.readUseTokenDigest = null;
      observations.suppressed_read_count += 1;
      return Object.freeze({
        accepted: false,
        status: retainedRead.status,
        receipt_digest: receiptDigest('suppress_read', completedAt, retainedRead)
      });
    }
    lease.readUseTokenDigest = null;
    lease.readConsumed = true;
    observations.completed_read_count += 1;
    terminalize('consumed', 'read_completed', completedAt);
    inFlightReads.delete(tokenDigest);
    return Object.freeze({
      accepted: true,
      status: 'consumed',
      receipt_digest: receiptDigest('complete_read', completedAt)
    });
  }

  function kill({ reason = 'operator_requested', now } = {}) {
    const killedAt = currentTime(now);
    if (!['operator_requested', 'emergency_stop', 'verification_complete'].includes(reason)) {
      reject('r4_session_kill_reason_invalid');
    }
    expireIfNeeded(killedAt);
    if (lease?.status === 'active') terminalize('killed', reason, killedAt);
    return Object.freeze({
      accepted: true,
      status: lease?.status || 'inactive',
      receipt_digest: receiptDigest('kill', killedAt)
    });
  }

  function unavailable(operation, now) {
    return Object.freeze({
      accepted: false,
      status: lease?.status || 'inactive',
      receipt_digest: receiptDigest(`deny_${operation || 'unknown'}`, now)
    });
  }

  function snapshot(now) {
    const checkedAt = currentTime(now);
    expireIfNeeded(checkedAt);
    const remainingTtlSeconds = lease?.status === 'active'
      ? Math.max(0, Math.ceil((Date.parse(lease.expiresAt) - checkedAt.getTime()) / 1000))
      : 0;
    return Object.freeze({
      default_closed: true,
      activation_status: lease?.status || 'inactive',
      active: lease?.status === 'active',
      remaining_ttl_seconds: remainingTtlSeconds,
      context_bound: Boolean(lease?.contextRefDigest),
      read_in_flight: inFlightReads.size > 0,
      retained_in_flight_read_count: inFlightReads.size,
      remaining_read_calls: lease?.status === 'active' && !lease.readConsumed && !lease.readUseTokenDigest ? 1 : 0,
      durable_activation_state_written: false,
      receipt_digest: receiptDigest('status', checkedAt),
      ...observations
    });
  }

  return Object.freeze({
    activate,
    checkContextIssueAuthorization,
    authorizeContextIssue,
    bindContext,
    checkReadAuthorization,
    authorizeRead,
    completeRead,
    kill,
    snapshot
  });
}

function defaultSchedule(callback, delay) {
  const timer = setTimeout(callback, delay);
  timer.unref?.();
  return timer;
}

module.exports = {
  CONTROL_REQUEST_ID_PATTERN,
  MAX_RETAINED_IN_FLIGHT_READS,
  PRINCIPAL_FINGERPRINT_PATTERN,
  SESSION_ACTIVATION_DEFAULT_TTL_SECONDS,
  SESSION_ACTIVATION_MAX_TTL_SECONDS,
  SESSION_ACTIVATION_MIN_TTL_SECONDS,
  SESSION_READ_TOOLS,
  createSessionReadActivationController
};
