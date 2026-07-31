'use strict';

const {
  GOVERNED_READ_ATTEMPT_LIMITS,
  reject
} = require('../../packages/chatgpt-r4-contracts');

const GOVERNED_READ_ATTEMPT_TERMINAL_RETENTION_MS =
  GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000;
const MAX_GOVERNED_READ_ATTEMPT_RETAINED_ATTEMPTS = 4096;

function deriveGovernedReadAttemptRetention({
  maxRecords,
  requestRecordRetentionMs
}) {
  if (!Number.isInteger(maxRecords) || maxRecords < 1 ||
      !Number.isInteger(requestRecordRetentionMs) ||
      requestRecordRetentionMs < 1) {
    reject('edge_attempt_retention_derivation_invalid');
  }
  const retentionWindows = Math.ceil(
    GOVERNED_READ_ATTEMPT_TERMINAL_RETENTION_MS /
      requestRecordRetentionMs
  );
  const requestedCapacity = maxRecords * retentionWindows;
  if (!Number.isSafeInteger(requestedCapacity)) {
    reject('edge_attempt_retention_derivation_invalid');
  }
  return Object.freeze({
    maxRetainedAttempts: Math.min(
      requestedCapacity,
      MAX_GOVERNED_READ_ATTEMPT_RETAINED_ATTEMPTS
    ),
    terminalRetentionMs:
      GOVERNED_READ_ATTEMPT_TERMINAL_RETENTION_MS
  });
}

module.exports = {
  deriveGovernedReadAttemptRetention
};
