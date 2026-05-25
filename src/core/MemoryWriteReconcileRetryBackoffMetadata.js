'use strict';

const TASK_ID = 'CM-1067_MEMORY_WRITE_RECONCILE_RETRY_BACKOFF_METADATA_DESIGN';
const SCHEMA_VERSION = 'cm1067_reconcile_retry_backoff_metadata_v1';
const DEFAULT_BASE_DELAY_MS = 60_000;
const DEFAULT_MAX_DELAY_MS = 15 * 60_000;
const DEFAULT_DEAD_LETTER_AFTER_ATTEMPTS = 5;

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeTimestamp(value, fallback = null) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) {
    return fallback;
  }
  return date.toISOString();
}

function normalizeRetryBackoffPolicy(policy = {}) {
  const baseDelayMs = normalizePositiveInteger(policy.baseDelayMs, DEFAULT_BASE_DELAY_MS);
  const maxDelayMs = normalizePositiveInteger(policy.maxDelayMs, DEFAULT_MAX_DELAY_MS);
  return {
    baseDelayMs,
    maxDelayMs: Math.max(baseDelayMs, maxDelayMs),
    deadLetterAfterAttempts: normalizePositiveInteger(
      policy.deadLetterAfterAttempts,
      DEFAULT_DEAD_LETTER_AFTER_ATTEMPTS
    )
  };
}

function sanitizeErrorCode(error) {
  const hasNonEmptyMessage = typeof error === 'string'
    ? error.trim().length > 0
    : typeof error?.message === 'string' && error.message.trim().length > 0;
  const raw = error && typeof error.code === 'string'
    ? error.code
    : error && typeof error.name === 'string'
      ? error.name
      : hasNonEmptyMessage
        ? 'reconcile_replay_failed'
        : 'unknown_error';
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return normalized || 'unknown_error';
}

function calculateBackoffDelayMs(attemptCount, policy = {}) {
  const normalizedPolicy = normalizeRetryBackoffPolicy(policy);
  const exponent = Math.max(0, attemptCount - 1);
  const delay = normalizedPolicy.baseDelayMs * (2 ** exponent);
  return Math.min(delay, normalizedPolicy.maxDelayMs);
}

function buildReconcileRetryBackoffMetadata({
  previousMetadata = null,
  failedAt = new Date().toISOString(),
  error = null,
  policy = {}
} = {}) {
  const normalizedPolicy = normalizeRetryBackoffPolicy(policy);
  const failedAtIso = normalizeTimestamp(failedAt, new Date(0).toISOString());
  const previousAttemptCount = Number.isInteger(previousMetadata?.attemptCount)
    && previousMetadata.attemptCount >= 0
    ? previousMetadata.attemptCount
    : 0;
  const attemptCount = previousAttemptCount + 1;
  const state = attemptCount >= normalizedPolicy.deadLetterAfterAttempts
    ? 'dead_letter'
    : 'deferred';
  const backoffDelayMs = calculateBackoffDelayMs(attemptCount, normalizedPolicy);
  const failedAtMs = new Date(failedAtIso).getTime();
  const nextAttemptAfter = state === 'dead_letter'
    ? null
    : new Date(failedAtMs + backoffDelayMs).toISOString();

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    state,
    attemptCount,
    firstAttemptAt: normalizeTimestamp(previousMetadata?.firstAttemptAt, failedAtIso),
    lastAttemptAt: failedAtIso,
    nextAttemptAfter,
    backoffDelayMs,
    backoffBaseDelayMs: normalizedPolicy.baseDelayMs,
    backoffMaxDelayMs: normalizedPolicy.maxDelayMs,
    deadLetterAfterAttempts: normalizedPolicy.deadLetterAfterAttempts,
    lastErrorCode: sanitizeErrorCode(error),
    rawErrorStored: false,
    automaticStartupWorkerEnabled: false,
    requiresExplicitReplay: true
  };
}

module.exports = {
  SCHEMA_VERSION,
  TASK_ID,
  buildReconcileRetryBackoffMetadata,
  calculateBackoffDelayMs,
  normalizeRetryBackoffPolicy,
  sanitizeErrorCode
};
