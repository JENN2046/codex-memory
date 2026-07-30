'use strict';

const {
  GOVERNED_READ_ATTEMPT_LIMITS,
  appendGovernedReadAttemptStage,
  createAttemptHeader,
  digestObject
} = require('../../packages/chatgpt-r4-contracts');

function createAttemptHeaderForRequest(request, {
  attemptRef,
  now = new Date(),
  ttlSeconds
} = {}) {
  const current = now instanceof Date
    ? new Date(now.getTime())
    : new Date(now);
  const remainingSeconds = Math.floor(
    (Date.parse(request.expires_at) - current.getTime()) / 1000
  );
  const selectedTtlSeconds = ttlSeconds ??
    Math.min(
      GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds,
      remainingSeconds
    );
  return createAttemptHeader({
    ...(attemptRef ? { attemptRef } : {}),
    toolName: request.tool_request.name,
    requestDigest: digestObject(request),
    contextBindingDigest: digestObject(
      request.tool_request.arguments.project_context_ref
    ),
    now: current,
    ttlSeconds: selectedTtlSeconds
  });
}

function createEdgeValidatedAttemptWorkingSet(header) {
  let workingSet = { header, receipts: [] };
  for (const stage of ['CREATED', 'EDGE_VALIDATED']) {
    workingSet = appendGovernedReadAttemptStage(
      workingSet,
      { stage }
    );
  }
  return workingSet;
}

function completeZeroMemoryAttemptWorkingSet(workingSet) {
  let completed = workingSet;
  for (const stage of [
    'AUTHORIZED',
    'BRIDGE_DELEGATED',
    'NATIVE_DISPATCHED',
    'SOURCE_PREFLIGHT',
    'PROVIDER_EMBEDDING',
    'HYDRATION',
    'INDEX_RECOVERY',
    'VECTOR_SEARCH',
    'SCOPE_POSTCHECK'
  ]) {
    const counterFacts = {
      BRIDGE_DELEGATED: {
        fallback: { attempts: 0 }
      },
      NATIVE_DISPATCHED: {
        native_invocation: {
          started: 0,
          succeeded: 0,
          failed: 0
        },
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        }
      },
      PROVIDER_EMBEDDING: {
        provider: {
          started: 0,
          succeeded: 0,
          failed: 0
        }
      },
      HYDRATION: {
        derived_transaction: {
          started: 0,
          committed: 0,
          rolled_back: 0
        }
      }
    }[stage] || {};
    completed = appendGovernedReadAttemptStage(
      completed,
      { stage, counterFacts }
    );
  }
  return completed;
}

function addZeroMemoryAttemptContinuation(
  invocation,
  relayWorkingSet
) {
  return {
    ...invocation,
    governed_read_attempt: {
      working_set:
        completeZeroMemoryAttemptWorkingSet(relayWorkingSet),
      evidence_complete: true,
      terminal_failure: null
    }
  };
}

module.exports = {
  addZeroMemoryAttemptContinuation,
  completeZeroMemoryAttemptWorkingSet,
  createAttemptHeaderForRequest,
  createEdgeValidatedAttemptWorkingSet
};
