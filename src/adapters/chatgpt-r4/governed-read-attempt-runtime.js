'use strict';

const {
  appendGovernedReadAttemptStage,
  digestObject,
  isGovernedReadAttemptWorkingSetExtension,
  validateGovernedReadTerminalFailureCandidate,
  validateGovernedReadAttemptWorkingSet,
  validateToolRequest
} = require('../../../packages/chatgpt-r4-contracts');
const {
  structuredProjection
} = require('./governed-read-public-projection');

const MAX_NATIVE_RESULT_LIMIT = 5;
const GOVERNED_READ_DEFAULT_QUERIES = Object.freeze({
  audit_memory: 'current project memory audit',
  memory_overview: 'current project memory overview',
  prepare_memory_context: 'current project task context'
});

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function validateInvocation(value) {
  if (!value ||
      typeof value !== 'object' ||
      Array.isArray(value)) {
    throw codedError('governed_read_invocation_invalid');
  }
  const keys = Object.keys(value).sort();
  const expected = [
    'counters',
    'receipt_digests',
    'status',
    'structured_content'
  ];
  if (keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])) {
    throw codedError('governed_read_invocation_invalid');
  }
  return value;
}

function deriveExpectedPublicProjection(request, bridgeResult) {
  const lastReceipt = bridgeResult.working_set.receipts.at(-1);
  if (bridgeResult.accepted === true) {
    if (bridgeResult.evidence_complete !== true ||
        bridgeResult.terminal_failure !== null ||
        !bridgeResult.result ||
        typeof bridgeResult.result !== 'object' ||
        Array.isArray(bridgeResult.result) ||
        lastReceipt?.stage !== 'SCOPE_POSTCHECK' ||
        lastReceipt.outcome !== 'completed') {
      throw codedError('governed_read_bridge_result_invalid');
    }
    try {
      return structuredProjection(
        request.tool_request.name,
        bridgeResult.result,
        request.tool_request.arguments.project_context_ref
      );
    } catch {
      throw codedError('governed_read_projection_binding_invalid');
    }
  }

  const hasFailedReceipt = lastReceipt?.outcome === 'failed';
  const hasTerminalFailure = bridgeResult.terminal_failure !== null;
  if (bridgeResult.result !== null ||
      hasFailedReceipt === hasTerminalFailure) {
    throw codedError('governed_read_bridge_result_invalid');
  }
  if (hasTerminalFailure) {
    try {
      validateGovernedReadTerminalFailureCandidate(
        bridgeResult.terminal_failure
      );
      if (bridgeResult.terminal_failure.failure_origin !==
          'lease_worker') {
        throw codedError('governed_read_bridge_result_invalid');
      }
    } catch {
      throw codedError('governed_read_bridge_result_invalid');
    }
  }
  return null;
}

function validateInvocationProjectionBinding(
  invocation,
  expectedProjection
) {
  if (expectedProjection === null) {
    if (invocation.status !== 'unavailable') {
      throw codedError('governed_read_projection_binding_invalid');
    }
    return invocation;
  }
  try {
    if (invocation.status !== 'ok' ||
        digestObject(invocation.structured_content) !==
          digestObject(expectedProjection)) {
      throw codedError('governed_read_projection_binding_invalid');
    }
  } catch (error) {
    if (error?.code ===
        'governed_read_projection_binding_invalid') {
      throw error;
    }
    throw codedError('governed_read_projection_binding_invalid');
  }
  return invocation;
}

function deriveGovernedReadExecutionParameters(request) {
  try {
    validateToolRequest(request?.tool_request);
  } catch {
    throw codedError('governed_read_authorization_invalid');
  }
  const toolName = request.tool_request.name;
  const requestArguments = request.tool_request.arguments;
  if (toolName === 'search_memory') {
    return Object.freeze({
      query: requestArguments.query,
      limit: Math.min(
        requestArguments.limit ?? MAX_NATIVE_RESULT_LIMIT,
        MAX_NATIVE_RESULT_LIMIT
      )
    });
  }
  if (toolName === 'prepare_memory_context') {
    return Object.freeze({
      query: requestArguments.task_summary ??
        GOVERNED_READ_DEFAULT_QUERIES.prepare_memory_context,
      limit: MAX_NATIVE_RESULT_LIMIT
    });
  }
  if (toolName === 'memory_overview') {
    return Object.freeze({
      query: GOVERNED_READ_DEFAULT_QUERIES.memory_overview,
      limit: 1
    });
  }
  if (toolName === 'audit_memory') {
    return Object.freeze({
      query: GOVERNED_READ_DEFAULT_QUERIES.audit_memory,
      limit: Math.min(
        requestArguments.event_limit ?? MAX_NATIVE_RESULT_LIMIT,
        MAX_NATIVE_RESULT_LIMIT
      )
    });
  }
  throw codedError('governed_read_authorization_invalid');
}

function validateAuthorizationDecision(decision, request) {
  if (!decision ||
      typeof decision !== 'object' ||
      Array.isArray(decision) ||
      typeof decision.accepted !== 'boolean') {
    throw codedError('governed_read_authorization_invalid');
  }
  if (decision.accepted === true) {
    const execution =
      deriveGovernedReadExecutionParameters(request);
    if (!decision.authorization ||
        decision.authorization.accepted !== true ||
        typeof decision.query !== 'string' ||
        !Number.isInteger(decision.limit) ||
        decision.query !== execution.query ||
        decision.limit !== execution.limit) {
      throw codedError('governed_read_authorization_invalid');
    }
  } else {
    validateInvocation(decision.invocation);
  }
  return decision;
}

function validateAbortSignal(signal) {
  if (signal === undefined) return;
  if (!signal ||
      typeof signal !== 'object' ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function' ||
      typeof signal.removeEventListener !== 'function') {
    throw codedError('governed_read_abort_signal_invalid');
  }
}

function invokeWithSignal(operation, signal) {
  validateAbortSignal(signal);
  if (signal === undefined) return Promise.resolve().then(operation);
  if (signal.aborted) {
    return Promise.reject(codedError('governed_read_attempt_cancelled'));
  }
  return new Promise((resolve, rejectInvocation) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback(value);
    };
    const onAbort = () => finish(
      rejectInvocation,
      codedError('governed_read_attempt_cancelled')
    );
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    Promise.resolve().then(operation).then(
      value => finish(resolve, value),
      error => finish(rejectInvocation, error)
    );
  });
}

function createGovernedReadAttemptGovernanceRuntime({
  authorizeRead,
  invokeBridge,
  projectInvocation
} = {}) {
  if (typeof authorizeRead !== 'function' ||
      typeof invokeBridge !== 'function' ||
      typeof projectInvocation !== 'function') {
    throw codedError('governed_read_governance_runtime_invalid');
  }

  return Object.freeze({
    async handle({
      request,
      relayReceipt,
      governedReadAttempt
    } = {}, { signal } = {}) {
      validateAbortSignal(signal);
      validateGovernedReadAttemptWorkingSet(governedReadAttempt);
      const lastReceipt = governedReadAttempt.receipts.at(-1);
      if (lastReceipt?.stage !== 'RELAY_CLAIMED' ||
          lastReceipt.outcome !== 'completed' ||
          governedReadAttempt.header.tool_name !==
            request?.tool_request?.name) {
        throw codedError('governed_read_governance_stage_invalid');
      }

      const decision = validateAuthorizationDecision(
        await invokeWithSignal(() => authorizeRead({
          request,
          relayReceipt,
          attemptRef: governedReadAttempt.header.attempt_ref,
          signal
        }), signal),
        request
      );
      if (decision.accepted !== true) {
        const denied = appendGovernedReadAttemptStage(
          governedReadAttempt,
          {
            stage: 'AUTHORIZED',
            outcome: 'failed',
            reasonCode: 'governance_denied',
            counterFacts: {
              provider: { started: 0, succeeded: 0, failed: 0 },
              native_invocation: {
                started: 0,
                succeeded: 0,
                failed: 0
              }
            }
          }
        );
        return Object.freeze({
          ...decision.invocation,
          governed_read_attempt: Object.freeze({
            working_set: denied,
            evidence_complete: false,
            terminal_failure: null
          })
        });
      }

      const authorized = appendGovernedReadAttemptStage(
        governedReadAttempt,
        { stage: 'AUTHORIZED' }
      );
      const bridgeResult = await invokeWithSignal(() => invokeBridge({
        workingSet: authorized,
        authorization: decision.authorization,
        query: decision.query,
        limit: decision.limit,
        signal
      }), signal);
      if (!bridgeResult ||
          typeof bridgeResult !== 'object' ||
          Array.isArray(bridgeResult) ||
          typeof bridgeResult.accepted !== 'boolean' ||
          !bridgeResult.working_set ||
          typeof bridgeResult.evidence_complete !== 'boolean' ||
          !Object.hasOwn(bridgeResult, 'result') ||
          !Object.hasOwn(bridgeResult, 'terminal_failure')) {
        throw codedError('governed_read_bridge_result_invalid');
      }
      try {
        validateGovernedReadAttemptWorkingSet(
          bridgeResult.working_set
        );
        if (!isGovernedReadAttemptWorkingSetExtension(
          authorized,
          bridgeResult.working_set
        )) {
          throw codedError('governed_read_bridge_result_invalid');
        }
      } catch {
        throw codedError('governed_read_bridge_result_invalid');
      }
      const expectedProjection =
        deriveExpectedPublicProjection(request, bridgeResult);
      const invocation = validateInvocationProjectionBinding(
        validateInvocation(
          await invokeWithSignal(() => projectInvocation({
            request,
            authorization: decision.authorization,
            bridgeResult,
            signal
          }), signal)
        ),
        expectedProjection
      );
      return Object.freeze({
        ...invocation,
        governed_read_attempt: Object.freeze({
          working_set: bridgeResult.working_set,
          evidence_complete: bridgeResult.evidence_complete,
          terminal_failure: bridgeResult.terminal_failure
        })
      });
    }
  });
}

module.exports = {
  GOVERNED_READ_DEFAULT_QUERIES,
  MAX_NATIVE_RESULT_LIMIT,
  createGovernedReadAttemptGovernanceRuntime,
  deriveGovernedReadExecutionParameters,
  invokeWithSignal,
  validateAuthorizationDecision,
  validateAbortSignal,
  validateInvocation
};
