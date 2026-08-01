'use strict';

const {
  COUNTER_MODES,
  LIMITS,
  ZERO_MEMORY_COUNTERS,
  appendGovernedContextResolutionStage,
  appendGovernedReadAttemptStage,
  createChatGptEdgeDataResponseV2,
  createGovernedReadFailureLegacyContent,
  createGovernedReadAttemptProtocol,
  createGovernedContextResolutionProtocol,
  createContextResolutionTerminalEnvelope,
  contextResolutionPublicResponseStatus,
  contextResolutionResponseBindingDigest,
  createResponseEnvelope,
  createTerminalEnvelope,
  digestObject,
  governedReadAttemptResponseBindingDigest,
  isGovernedReadAttemptWorkingSetExtension,
  isGovernedContextResolutionWorkingSetExtension,
  validateCounters,
  validateCounterMode,
  validateRequestEnvelope,
  validateReceiptChain,
  validateLegacyInvocationCountersAgainstAttemptTerminal,
  validateLegacyToolStructuredContent,
  validateGovernedReadResponseStatus,
  validateGovernedReadAttemptWorkingSet,
  validateGovernedContextResolutionWorkingSet,
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  projectLegacyCountersFromGovernedReadAttempt,
  deepFreeze,
  reject
} = require('../../packages/chatgpt-r4-contracts');

function createRelayProcessor({
  expectedIssuer,
  expectedAudience,
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  requestReplayGuard,
  forwardToUds,
  responseSigning,
  counterMode = COUNTER_MODES.zeroMemory,
  clock = () => new Date(),
  governedReadAttemptStageHooks,
  governedContextResolutionStageHooks,
  governedContextResolutions = false,
  contextResolutionResponseResultFactory =
    contextResolutionResponseResult
}) {
  if (typeof forwardToUds !== 'function') reject('relay_forwarder_missing');
  if (typeof contextResolutionResponseResultFactory !== 'function') {
    reject('relay_context_resolution_response_factory_invalid');
  }

  return Object.freeze({
    async handle(request, {
      governedReadAttempt,
      governedContextResolution
    } = {}) {
      const now = clock();
      const validation = validateRequestEnvelope(request, {
        now,
        resolveRequestPublicKey,
        resolvePrincipalPublicKey,
        expectedIssuer,
        expectedAudience,
        replayGuard: requestReplayGuard,
        consumeReplay: true
      });
      const requestId = request.request_id;
      const toolName = request.tool_request.name;
      const governedRead =
        GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(toolName);
      if (governedRead && governedReadAttempt === undefined) {
        reject('relay_attempt_required');
      }
      if (toolName === 'resolve_memory_context' &&
          governedReadAttempt !== undefined) {
        reject('relay_attempt_forbidden');
      }
      if (governedContextResolutions && toolName === 'resolve_memory_context' &&
          governedContextResolution === undefined) {
        reject('relay_context_resolution_required');
      }
      if (governedContextResolutions && toolName !== 'resolve_memory_context' &&
          governedContextResolution !== undefined) {
        reject('relay_context_resolution_forbidden');
      }
      let relayWorkingSet = null;
      let relayContextResolution = null;
      if (governedReadAttempt !== undefined) {
        validateGovernedReadAttemptWorkingSet(governedReadAttempt);
        const lastReceipt = governedReadAttempt.receipts.at(-1);
        if (lastReceipt?.stage !== 'EDGE_VALIDATED' ||
            lastReceipt.outcome !== 'completed' ||
            governedReadAttempt.header.tool_name !== toolName ||
            governedReadAttempt.header.request_digest !==
              validation.requestDigest) {
          reject('relay_attempt_binding_invalid');
        }
        relayWorkingSet = appendGovernedReadAttemptStage(
          governedReadAttempt,
          { stage: 'RELAY_CLAIMED' }
        );
      }
      if (governedContextResolution !== undefined) {
        validateGovernedContextResolutionWorkingSet(governedContextResolution);
        const lastReceipt = governedContextResolution.receipts.at(-1);
        if (lastReceipt?.stage !== 'EDGE_VALIDATED' ||
            lastReceipt.outcome !== 'completed' ||
            governedContextResolution.header.operation !== toolName ||
            governedContextResolution.header.request_digest !==
              validation.requestDigest) {
          reject('relay_context_resolution_binding_invalid');
        }
        relayContextResolution = appendGovernedContextResolutionStage(
          governedContextResolution,
          { stage: 'RELAY_CLAIMED' }
        );
      }
      const forwardedRequest = deepFreeze(structuredClone(request));
      const relayReceipt = Object.freeze({
        schema_version: 1,
        kind: 'chatgpt_r4_relay_receipt',
        request_digest: validation.requestDigest,
        signature_valid: true,
        replay_guard_passed: true,
        forwarded_over: 'injected_uds_boundary',
        scope_authorized_by_relay: false,
        durable_state_written: false
      });
      let invocation;
      try {
        invocation = await forwardToUds({
          request: forwardedRequest,
          relayReceipt,
          ...(relayWorkingSet
            ? { governedReadAttempt: relayWorkingSet }
            : {}),
          ...(relayContextResolution
            ? { governedContextResolution: relayContextResolution }
            : {})
        });
      } catch (error) {
        if (!relayContextResolution ||
            !error?.governed_context_resolution) {
          throw error;
        }
        const continuation = validateContextResolutionContinuation(
          error.governed_context_resolution,
          relayContextResolution
        );
        const failure = createContextResolutionFailureResult({
          workingSet: continuation.working_set,
          reasonCode: continuation.terminal_failure?.reason_code ||
            'context_issuance_failed',
          errorCode: error.code,
          evidenceComplete: continuation.evidence_complete
        });
        return contextResolutionResponseResultFactory({
          requestId,
          requestDigest: validation.requestDigest,
          responseNow: clock(),
          requestExpiresAt: request.expires_at,
          relayReceipt,
          candidate: failure.governed_context_resolution_failure_candidate,
          responseSigning
        });
      }
      const responseNow = clock();
      const remainingRequestTtlMs =
        Date.parse(request.expires_at) - responseNow.getTime();
      if (!Number.isFinite(remainingRequestTtlMs) || remainingRequestTtlMs <= 0) {
        reject('relay_request_expired_before_response');
      }
      validateInvocation(invocation, toolName, {
        counterMode,
        governedReadAttempt: relayWorkingSet !== null,
        governedContextResolution: relayContextResolution !== null
      });
      const receiptChain = {
        edge_request: validation.requestDigest,
        relay: digestObject(relayReceipt),
        governance: invocation.receipt_digests.governance,
        context: invocation.receipt_digests.context
      };
      validateReceiptChain(receiptChain);

      if (!relayWorkingSet) {
        if (!relayContextResolution) {
          return createResponseEnvelope({
            requestId,
            requestDigest: validation.requestDigest,
            toolName,
            status: invocation.status,
            structuredContent: createChatGptEdgeDataResponseV2({
              toolName,
              structuredContent: invocation.structured_content
            }),
            counters: invocation.counters,
            receiptChain,
            now: responseNow,
            ttlSeconds: Math.min(
              LIMITS.maxEnvelopeTtlSeconds,
              remainingRequestTtlMs / 1000
            ),
            signing: responseSigning
          });
        }
        const continuation = validateContextResolutionContinuation(
          invocation.governed_context_resolution,
          relayContextResolution
        );
        let candidateWorkingSet = continuation.working_set;
        let terminal;
        const lastReceipt = candidateWorkingSet.receipts.at(-1);
        if (continuation.terminal_failure) {
          terminal = createContextResolutionTerminalEnvelope({
            header: candidateWorkingSet.header,
            receipts: candidateWorkingSet.receipts,
            outcome: 'failure',
            reasonCode: continuation.terminal_failure.reason_code,
            evidenceComplete: continuation.evidence_complete,
            failureOrigin: continuation.terminal_failure.failure_origin
          });
        } else if (lastReceipt?.outcome === 'failed') {
          terminal = createContextResolutionTerminalEnvelope({
            header: candidateWorkingSet.header,
            receipts: candidateWorkingSet.receipts,
            outcome: 'failure',
            reasonCode: lastReceipt.reason_code,
            evidenceComplete: continuation.evidence_complete,
            failureOrigin: lastReceipt.origin
          });
        } else {
          if (lastReceipt?.stage !== 'CONTEXT_ISSUED' ||
              continuation.evidence_complete !== true) {
            reject('relay_context_resolution_continuation_invalid');
          }
          try {
            const hook = governedContextResolutionStageHooks?.RESPONSE_FINALIZED;
            if (hook !== undefined) {
              if (typeof hook !== 'function') {
                reject('relay_context_resolution_stage_hook_invalid');
              }
              await hook({ resolution_ref: candidateWorkingSet.header.resolution_ref });
            }
            candidateWorkingSet = appendGovernedContextResolutionStage(
              candidateWorkingSet,
              { stage: 'RESPONSE_FINALIZED' }
            );
            terminal = createContextResolutionTerminalEnvelope({
              header: candidateWorkingSet.header,
              receipts: candidateWorkingSet.receipts,
              outcome: 'success',
              evidenceComplete: true
            });
          } catch {
            candidateWorkingSet = appendGovernedContextResolutionStage(
              candidateWorkingSet,
              {
                stage: 'RESPONSE_FINALIZED',
                outcome: 'failed',
                reasonCode: 'context_response_finalization_failed'
              }
            );
            terminal = createContextResolutionTerminalEnvelope({
              header: candidateWorkingSet.header,
              receipts: candidateWorkingSet.receipts,
              outcome: 'failure',
              reasonCode: 'context_response_finalization_failed',
              evidenceComplete: true,
              failureOrigin: 'relay'
            });
          }
        }
        const candidate = createGovernedContextResolutionProtocol({
          header: candidateWorkingSet.header,
          receipts: candidateWorkingSet.receipts,
          terminal
        });
        try {
          return contextResolutionResponseResultFactory({
            requestId,
            requestDigest: validation.requestDigest,
            responseNow,
            requestExpiresAt: request.expires_at,
            relayReceipt,
            receiptChain,
            invocation,
            candidate,
            responseSigning
          });
        } catch (error) {
          if (candidate.terminal.outcome !== 'success') throw error;
          const failure = createContextResolutionFailureResult({
            workingSet: continuation.working_set,
            reasonCode: 'context_response_projection_invalid',
            errorCode: error.code,
            evidenceComplete: true
          });
          return contextResolutionResponseResultFactory({
            requestId,
            requestDigest: validation.requestDigest,
            responseNow,
            requestExpiresAt: request.expires_at,
            relayReceipt,
            receiptChain,
            candidate: failure.governed_context_resolution_failure_candidate,
            responseSigning
          });
        }
      }

      const continuation = validateAttemptContinuation(
        invocation.governed_read_attempt,
        relayWorkingSet
      );
      let candidateWorkingSet = continuation.working_set;
      let terminal;
      let responseStatus = invocation.status;
      let structuredContent = invocation.structured_content;
      const lastReceipt = candidateWorkingSet.receipts.at(-1);
      if (continuation.terminal_failure) {
        terminal = createTerminalEnvelope({
          header: candidateWorkingSet.header,
          receipts: candidateWorkingSet.receipts,
          outcome: 'failure',
          reasonCode: continuation.terminal_failure.reason_code,
          evidenceComplete: continuation.evidence_complete,
          failureOrigin:
            continuation.terminal_failure.failure_origin
        });
      } else if (lastReceipt?.outcome === 'failed') {
        terminal = createTerminalEnvelope({
          header: candidateWorkingSet.header,
          receipts: candidateWorkingSet.receipts,
          outcome: 'failure',
          reasonCode: lastReceipt.reason_code,
          evidenceComplete: continuation.evidence_complete,
          failureOrigin: lastReceipt.origin
        });
      } else {
        if (lastReceipt?.stage !== 'SCOPE_POSTCHECK' ||
            continuation.evidence_complete !== true) {
          reject('relay_attempt_continuation_invalid');
        }
        try {
          const hook =
            governedReadAttemptStageHooks?.RESPONSE_FINALIZATION;
          if (hook !== undefined) {
            if (typeof hook !== 'function') {
              reject('relay_attempt_stage_hook_invalid');
            }
            await hook({
              attempt_ref: candidateWorkingSet.header.attempt_ref
            });
          }
          candidateWorkingSet = appendGovernedReadAttemptStage(
            candidateWorkingSet,
            { stage: 'RESPONSE_FINALIZATION' }
          );
          terminal = createTerminalEnvelope({
            header: candidateWorkingSet.header,
            receipts: candidateWorkingSet.receipts,
            outcome: 'success',
            evidenceComplete: true
          });
        } catch {
          candidateWorkingSet = appendGovernedReadAttemptStage(
            candidateWorkingSet,
            {
              stage: 'RESPONSE_FINALIZATION',
              outcome: 'failed',
              reasonCode: 'response_finalization_failed'
            }
          );
          terminal = createTerminalEnvelope({
            header: candidateWorkingSet.header,
            receipts: candidateWorkingSet.receipts,
            outcome: 'failure',
            reasonCode: 'response_finalization_failed',
            evidenceComplete: true,
            failureOrigin: 'relay'
          });
          responseStatus = 'unavailable';
          structuredContent = createGovernedReadFailureLegacyContent(
            toolName,
            terminal
          );
        }
      }

      validateTerminalResponseAgreement(responseStatus, terminal);
      validateInvocationCounterAgreement(
        invocation.counters,
        terminal.counters
      );
      const attemptReceiptChain = {
        ...receiptChain,
        relay: governedReadAttemptResponseBindingDigest({
          requestDigest: validation.requestDigest,
          terminalDigest: terminal.terminal_digest
        })
      };
      validateReceiptChain(attemptReceiptChain);
      const candidate = createGovernedReadAttemptProtocol({
        header: candidateWorkingSet.header,
        receipts: candidateWorkingSet.receipts,
        terminal
      });
      const response = createResponseEnvelope({
        requestId,
        requestDigest: validation.requestDigest,
        toolName,
        status: responseStatus,
        structuredContent: createChatGptEdgeDataResponseV2({
          toolName,
          structuredContent,
          governedReadAttempt: candidate
        }),
        counters: projectLegacyCountersFromGovernedReadAttempt(
          candidate
        ),
        receiptChain: attemptReceiptChain,
        now: responseNow,
        ttlSeconds: Math.min(
          LIMITS.maxEnvelopeTtlSeconds,
          remainingRequestTtlMs / 1000
        ),
        signing: responseSigning
      });
      return Object.freeze({
        response,
        governed_read_attempt_candidate: candidate
      });
    }
  });
}

function validateTerminalResponseAgreement(responseStatus, terminal) {
  return validateGovernedReadResponseStatus(responseStatus, terminal);
}

function validateInvocationCounterAgreement(invocation, terminal) {
  return validateLegacyInvocationCountersAgainstAttemptTerminal(
    invocation,
    { counters: terminal }
  );
}

function validateInvocation(invocation, toolName, {
  counterMode = COUNTER_MODES.zeroMemory,
  governedReadAttempt = false,
  governedContextResolution = false
} = {}) {
  if (!invocation || typeof invocation !== 'object' || Array.isArray(invocation)) {
    reject('relay_invocation_invalid');
  }
  if (counterMode !== null) validateCounterMode(counterMode);
  const keys = Object.keys(invocation).sort();
  const expectedKeys = [
    'counters',
    ...(governedReadAttempt ? ['governed_read_attempt'] : []),
    ...(governedContextResolution ? ['governed_context_resolution'] : []),
    'receipt_digests',
    'status',
    'structured_content'
  ].sort();
  if (keys.join(',') !== expectedKeys.join(',')) {
    reject('relay_invocation_shape_invalid');
  }
  if (!['ok', 'denied', 'unavailable'].includes(invocation.status)) reject('relay_invocation_status_invalid');
  validateLegacyToolStructuredContent(toolName, invocation.structured_content, {
    status: invocation.status
  });
  if (governedReadAttempt) {
    validateGovernedReadInvocationCounters(invocation.counters);
  } else if (toolName === 'resolve_memory_context') {
    validateCounters(invocation.counters, { requireZero: true });
  } else {
    validateCounters(invocation.counters, { counterMode });
  }
  if (!invocation.receipt_digests ||
      typeof invocation.receipt_digests !== 'object' ||
      Array.isArray(invocation.receipt_digests) ||
      Object.keys(invocation.receipt_digests).sort().join(',') !== 'context,governance' ||
      !/^sha256:[a-f0-9]{64}$/u.test(invocation.receipt_digests.governance || '') ||
      !/^sha256:[a-f0-9]{64}$/u.test(invocation.receipt_digests.context || '')) {
    reject('relay_invocation_receipt_invalid');
  }
}

function validateContextResolutionContinuation(value, prefix) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !==
        'evidence_complete,terminal_failure,working_set' ||
      typeof value.evidence_complete !== 'boolean') {
    reject('relay_context_resolution_continuation_invalid');
  }
  validateGovernedContextResolutionWorkingSet(value.working_set);
  if (!isGovernedContextResolutionWorkingSetExtension(prefix, value.working_set)) {
    reject('relay_context_resolution_continuation_invalid');
  }
  if (value.terminal_failure !== null &&
      (!value.terminal_failure || typeof value.terminal_failure !== 'object' ||
       Array.isArray(value.terminal_failure) ||
       Object.keys(value.terminal_failure).sort().join(',') !==
         'failure_origin,reason_code' ||
       typeof value.terminal_failure.reason_code !== 'string' ||
       typeof value.terminal_failure.failure_origin !== 'string')) {
    reject('relay_context_resolution_continuation_invalid');
  }
  return value;
}

function contextResolutionResponseResult({
  requestId,
  requestDigest,
  responseNow,
  requestExpiresAt,
  relayReceipt,
  receiptChain = null,
  invocation = null,
  candidate,
  responseSigning
}) {
  const terminal = candidate?.terminal;
  const publicStatus = contextResolutionPublicResponseStatus(terminal);
  const status = publicStatus === 'ok' ? 'ok' : publicStatus;
  const legacyContent = terminal.outcome === 'success'
    ? invocation?.structured_content
    : { context_status: publicStatus };
  const structuredContent = createChatGptEdgeDataResponseV2({
    toolName: 'resolve_memory_context',
    structuredContent: legacyContent,
    governedContextResolution: candidate
  });
  const baseReceiptChain = receiptChain || {
    edge_request: requestDigest,
    relay: digestObject(relayReceipt),
    governance: contextResolutionReceiptDigest(candidate, 'governance'),
    context: contextResolutionReceiptDigest(candidate, 'context')
  };
  const boundReceiptChain = {
    ...baseReceiptChain,
    relay: contextResolutionResponseBindingDigest({
      requestDigest,
      resolutionRef: candidate.header.resolution_ref,
      terminalDigest: terminal.terminal_digest,
      structuredContentDigest: digestObject(structuredContent)
    })
  };
  validateReceiptChain(boundReceiptChain);
  const remainingRequestTtlMs =
    Date.parse(requestExpiresAt) - responseNow.getTime();
  if (!Number.isFinite(remainingRequestTtlMs) || remainingRequestTtlMs <= 0) {
    reject('relay_request_expired_before_response');
  }
  return Object.freeze({
    response: createResponseEnvelope({
      requestId,
      requestDigest,
      toolName: 'resolve_memory_context',
      status,
      structuredContent,
      counters: ZERO_MEMORY_COUNTERS,
      receiptChain: boundReceiptChain,
      now: responseNow,
      ttlSeconds: Math.min(
        LIMITS.maxEnvelopeTtlSeconds,
        remainingRequestTtlMs / 1000
      ),
      signing: responseSigning
    }),
    governed_context_resolution_candidate: candidate
  });
}

function contextResolutionReceiptDigest(candidate, origin) {
  const receipt = [...candidate.receipts].reverse().find(value =>
    value.origin === origin
  );
  return receipt?.receipt_digest || digestObject({
    protocol: candidate.terminal.protocol,
    terminal_digest: candidate.terminal.terminal_digest,
    component: origin
  });
}

function createContextResolutionFailureResult({
  workingSet,
  reasonCode,
  errorCode,
  evidenceComplete
}) {
  validateGovernedContextResolutionWorkingSet(workingSet);
  let candidateWorkingSet = workingSet;
  const lastReceipt = candidateWorkingSet.receipts.at(-1);
  if (lastReceipt?.outcome !== 'failed') {
    candidateWorkingSet = appendGovernedContextResolutionStage(
      candidateWorkingSet,
      {
        stage: 'RESPONSE_FINALIZED',
        outcome: 'failed',
        reasonCode
      }
    );
  }
  const terminalReason = candidateWorkingSet.receipts.at(-1).reason_code ||
    reasonCode;
  const terminal = createContextResolutionTerminalEnvelope({
    header: candidateWorkingSet.header,
    receipts: candidateWorkingSet.receipts,
    outcome: 'failure',
    reasonCode: terminalReason,
    evidenceComplete,
    failureOrigin: candidateWorkingSet.receipts.at(-1).origin
  });
  return Object.freeze({
    governed_context_resolution_failure_candidate:
      createGovernedContextResolutionProtocol({
        header: candidateWorkingSet.header,
        receipts: candidateWorkingSet.receipts,
        terminal
      }),
    error_code: safeContextResolutionErrorCode(errorCode, reasonCode)
  });
}

function safeContextResolutionErrorCode(value, fallback) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(value)
    ? value
    : fallback;
}

function validateAttemptContinuation(value, prefix) {
  if (!value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(',') !==
        'evidence_complete,terminal_failure,working_set' ||
      typeof value.evidence_complete !== 'boolean') {
    reject('relay_attempt_continuation_invalid');
  }
  validateGovernedReadAttemptWorkingSet(value.working_set);
  if (!isGovernedReadAttemptWorkingSetExtension(
    prefix,
    value.working_set
  )) {
    reject('relay_attempt_continuation_invalid');
  }
  if (value.terminal_failure !== null) {
    if (!value.terminal_failure ||
        typeof value.terminal_failure !== 'object' ||
        Array.isArray(value.terminal_failure) ||
        Object.keys(value.terminal_failure).sort().join(',') !==
          'failure_origin,reason_code' ||
        typeof value.terminal_failure.reason_code !== 'string' ||
        typeof value.terminal_failure.failure_origin !== 'string') {
      reject('relay_attempt_continuation_invalid');
    }
  }
  return value;
}

function validateGovernedReadInvocationCounters(counters) {
  const keys = [
    'provider_calls',
    'native_invocations',
    'local_fallbacks',
    'primary_memory_writes',
    'derived_index_writes',
    'other_durable_mutations',
    'unrestricted_native_searches'
  ];
  if (!counters ||
      typeof counters !== 'object' ||
      Array.isArray(counters) ||
      Object.keys(counters).sort().join(',') !==
        [...keys].sort().join(',')) {
    reject('counter_shape_invalid');
  }
  for (const key of keys.slice(0, 5)) {
    const value = counters[key];
    if (value !== null &&
        (!Number.isSafeInteger(value) || value < 0)) {
      reject('counter_value_invalid');
    }
  }
  if (counters.other_durable_mutations !== 0 ||
      counters.unrestricted_native_searches !== 0) {
    reject('counter_value_invalid');
  }
  return counters;
}

module.exports = {
  createRelayProcessor,
  validateAttemptContinuation,
  validateGovernedReadInvocationCounters,
  validateInvocationCounterAgreement,
  validateTerminalResponseAgreement,
  validateContextResolutionContinuation,
  contextResolutionResponseResult,
  createContextResolutionFailureResult,
  validateInvocation
};
