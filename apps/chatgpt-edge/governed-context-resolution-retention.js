'use strict';

const {
  GOVERNED_CONTEXT_RESOLUTION_LIMITS,
  reject
} = require('../../packages/chatgpt-r4-contracts');

function deriveGovernedContextResolutionRetention({
  maxRecords,
  requestRecordRetentionMs
} = {}) {
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 4096 ||
      !Number.isInteger(requestRecordRetentionMs) ||
      requestRecordRetentionMs < 10 || requestRecordRetentionMs > 30_000) {
    reject('context_resolution_retention_invalid');
  }
  const replayWindows = Math.ceil(
    GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 2 * 1000 /
      requestRecordRetentionMs
  );
  return Object.freeze({
    maxRetainedResolutions: maxRecords,
    maxReplayTombstones: Math.min(65_536, maxRecords * replayWindows)
  });
}

module.exports = { deriveGovernedContextResolutionRetention };
