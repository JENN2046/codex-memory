'use strict';

const {
  appendGovernedReadAttemptStage,
  validateGovernedReadAttemptWorkingSet
} = require('../../../packages/chatgpt-r4-contracts');

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

function validateAuthorizationDecision(decision) {
  if (!decision ||
      typeof decision !== 'object' ||
      Array.isArray(decision) ||
      typeof decision.accepted !== 'boolean') {
    throw codedError('governed_read_authorization_invalid');
  }
  if (decision.accepted === true) {
    if (!decision.authorization ||
        decision.authorization.accepted !== true ||
        typeof decision.query !== 'string' ||
        !Number.isInteger(decision.limit)) {
      throw codedError('governed_read_authorization_invalid');
    }
  } else {
    validateInvocation(decision.invocation);
  }
  return decision;
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
    } = {}) {
      validateGovernedReadAttemptWorkingSet(governedReadAttempt);
      const lastReceipt = governedReadAttempt.receipts.at(-1);
      if (lastReceipt?.stage !== 'RELAY_CLAIMED' ||
          lastReceipt.outcome !== 'completed' ||
          governedReadAttempt.header.tool_name !==
            request?.tool_request?.name) {
        throw codedError('governed_read_governance_stage_invalid');
      }

      const decision = validateAuthorizationDecision(
        await authorizeRead({
          request,
          relayReceipt,
          attemptRef: governedReadAttempt.header.attempt_ref
        })
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
      const bridgeResult = await invokeBridge({
        workingSet: authorized,
        authorization: decision.authorization,
        query: decision.query,
        limit: decision.limit
      });
      if (!bridgeResult ||
          typeof bridgeResult !== 'object' ||
          Array.isArray(bridgeResult) ||
          !bridgeResult.working_set ||
          typeof bridgeResult.evidence_complete !== 'boolean') {
        throw codedError('governed_read_bridge_result_invalid');
      }
      const invocation = validateInvocation(
        await projectInvocation({
          request,
          authorization: decision.authorization,
          bridgeResult
        })
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
  createGovernedReadAttemptGovernanceRuntime,
  validateAuthorizationDecision,
  validateInvocation
};
