'use strict';

const {
  GOVERNED_READ_ATTEMPT_LIMITS,
  appendGovernedContextResolutionStage,
  appendGovernedReadAttemptStage,
  createAttemptHeader,
  createContextResolutionHeader,
  createContextResolutionTerminalEnvelope,
  createGovernedContextResolutionProtocol,
  contextResolutionFailureRegistryEntry,
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

function createEdgeValidatedContextResolutionWorkingSet(request, {
  resolutionRef,
  now = new Date(),
  ttlSeconds = 60
} = {}) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  const remainingSeconds = Math.floor(
    (Date.parse(request.expires_at) - current.getTime()) / 1000
  );
  const header = createContextResolutionHeader({
    ...(resolutionRef ? { resolutionRef } : {}),
    requestDigest: digestObject(request),
    now: current,
    ttlSeconds: Math.min(ttlSeconds, remainingSeconds)
  });
  let workingSet = { header, receipts: [] };
  for (const stage of ['CREATED', 'EDGE_VALIDATED']) {
    workingSet = appendGovernedContextResolutionStage(workingSet, { stage });
  }
  return workingSet;
}

function completeContextResolutionWorkingSet(workingSet) {
  let completed = workingSet;
  for (const stage of [
    'REGISTRY_RESOLVED',
    'SCOPE_RESOLVED',
    'CONTEXT_ISSUED'
  ]) {
    completed = appendGovernedContextResolutionStage(completed, { stage });
  }
  return completed;
}

function createSuccessfulContextResolutionProtocol(request, options = {}) {
  let workingSet = createEdgeValidatedContextResolutionWorkingSet(
    request,
    options
  );
  workingSet = appendGovernedContextResolutionStage(workingSet, {
    stage: 'RELAY_CLAIMED'
  });
  workingSet = completeContextResolutionWorkingSet(workingSet);
  workingSet = appendGovernedContextResolutionStage(workingSet, {
    stage: 'RESPONSE_FINALIZED'
  });
  return createGovernedContextResolutionProtocol({
    header: workingSet.header,
    receipts: workingSet.receipts,
    terminal: createContextResolutionTerminalEnvelope({
      header: workingSet.header,
      receipts: workingSet.receipts,
      outcome: 'success',
      evidenceComplete: true
    })
  });
}

function createFailedContextResolutionProtocol(request, reasonCode, options = {}) {
  const entry = contextResolutionFailureRegistryEntry(reasonCode);
  let workingSet = createEdgeValidatedContextResolutionWorkingSet(
    request,
    options
  );
  for (const stage of [
    'RELAY_CLAIMED',
    'REGISTRY_RESOLVED',
    'SCOPE_RESOLVED',
    'CONTEXT_ISSUED',
    'RESPONSE_FINALIZED'
  ]) {
    if (stage === entry.stage) {
      workingSet = appendGovernedContextResolutionStage(workingSet, {
        stage,
        outcome: 'failed',
        reasonCode
      });
      break;
    }
    workingSet = appendGovernedContextResolutionStage(workingSet, { stage });
  }
  return createGovernedContextResolutionProtocol({
    header: workingSet.header,
    receipts: workingSet.receipts,
    terminal: createContextResolutionTerminalEnvelope({
      header: workingSet.header,
      receipts: workingSet.receipts,
      outcome: 'failure',
      reasonCode,
      evidenceComplete: true,
      failureOrigin: entry.origin
    })
  });
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

function addContextResolutionContinuation(invocation, relayWorkingSet) {
  return {
    ...invocation,
    governed_context_resolution: {
      working_set: completeContextResolutionWorkingSet(relayWorkingSet),
      evidence_complete: true,
      terminal_failure: null
    }
  };
}

module.exports = {
  addContextResolutionContinuation,
  addZeroMemoryAttemptContinuation,
  completeContextResolutionWorkingSet,
  completeZeroMemoryAttemptWorkingSet,
  createAttemptHeaderForRequest,
  createEdgeValidatedAttemptWorkingSet,
  createEdgeValidatedContextResolutionWorkingSet,
  createFailedContextResolutionProtocol,
  createSuccessfulContextResolutionProtocol
};
