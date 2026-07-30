'use strict';

const {
  COUNTER_MODES,
  LIMITS,
  appendGovernedReadAttemptStage,
  createGovernedReadAttemptProtocol,
  createResponseEnvelope,
  createTerminalEnvelope,
  digestObject,
  governedReadAttemptResponseBindingDigest,
  isGovernedReadAttemptWorkingSetExtension,
  validateCounters,
  validateRequestEnvelope,
  validateReceiptChain,
  validateToolStructuredContent,
  validateGovernedReadAttemptWorkingSet,
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
  governedReadAttemptStageHooks
}) {
  if (typeof forwardToUds !== 'function') reject('relay_forwarder_missing');

  return Object.freeze({
    async handle(request, {
      governedReadAttempt
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
      let relayWorkingSet = null;
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
      const invocation = await forwardToUds({
        request: forwardedRequest,
        relayReceipt,
        ...(relayWorkingSet
          ? { governedReadAttempt: relayWorkingSet }
          : {})
      });
      const responseNow = clock();
      const remainingRequestTtlMs =
        Date.parse(request.expires_at) - responseNow.getTime();
      if (!Number.isFinite(remainingRequestTtlMs) || remainingRequestTtlMs <= 0) {
        reject('relay_request_expired_before_response');
      }
      validateInvocation(invocation, toolName, {
        counterMode,
        governedReadAttempt: relayWorkingSet !== null
      });
      const receiptChain = {
        edge_request: validation.requestDigest,
        relay: digestObject(relayReceipt),
        governance: invocation.receipt_digests.governance,
        context: invocation.receipt_digests.context
      };
      validateReceiptChain(receiptChain);

      if (!relayWorkingSet) {
        return createResponseEnvelope({
          requestId,
          requestDigest: validation.requestDigest,
          toolName,
          status: invocation.status,
          structuredContent: invocation.structured_content,
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
          structuredContent = unavailableStructuredContent(toolName);
        }
      }

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
      const response = createResponseEnvelope({
        requestId,
        requestDigest: validation.requestDigest,
        toolName,
        status: responseStatus,
        structuredContent,
        counters: invocation.counters,
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
        governed_read_attempt_candidate:
          createGovernedReadAttemptProtocol({
            header: candidateWorkingSet.header,
            receipts: candidateWorkingSet.receipts,
            terminal
          })
      });
    }
  });
}

function validateInvocationCounterAgreement(invocation, terminal) {
  const mappings = [
    ['provider_calls', terminal.provider.started],
    ['native_invocations', terminal.native_invocation.started],
    ['local_fallbacks', terminal.fallback.attempts],
    ['primary_memory_writes', terminal.primary_memory.write_attempts],
    ['derived_index_writes', terminal.derived_transaction.started]
  ];
  for (const [field, terminalValue] of mappings) {
    if (terminalValue !== null &&
        invocation[field] !== terminalValue) {
      reject('relay_attempt_counter_mismatch');
    }
  }
  if (invocation.other_durable_mutations !== 0 ||
      invocation.unrestricted_native_searches !== 0) {
    reject('relay_attempt_counter_mismatch');
  }
  return invocation;
}

function validateInvocation(invocation, toolName, {
  counterMode = COUNTER_MODES.zeroMemory,
  governedReadAttempt = false
} = {}) {
  if (!invocation || typeof invocation !== 'object' || Array.isArray(invocation)) {
    reject('relay_invocation_invalid');
  }
  const keys = Object.keys(invocation).sort();
  const expectedKeys = [
    'counters',
    ...(governedReadAttempt ? ['governed_read_attempt'] : []),
    'receipt_digests',
    'status',
    'structured_content'
  ].sort();
  if (keys.join(',') !== expectedKeys.join(',')) {
    reject('relay_invocation_shape_invalid');
  }
  if (!['ok', 'denied', 'unavailable'].includes(invocation.status)) reject('relay_invocation_status_invalid');
  validateToolStructuredContent(toolName, invocation.structured_content, {
    status: invocation.status
  });
  validateCounters(invocation.counters, { counterMode });
  if (!invocation.receipt_digests ||
      typeof invocation.receipt_digests !== 'object' ||
      Array.isArray(invocation.receipt_digests) ||
      Object.keys(invocation.receipt_digests).sort().join(',') !== 'context,governance' ||
      !/^sha256:[a-f0-9]{64}$/u.test(invocation.receipt_digests.governance || '') ||
      !/^sha256:[a-f0-9]{64}$/u.test(invocation.receipt_digests.context || '')) {
    reject('relay_invocation_receipt_invalid');
  }
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

function unavailableStructuredContent(toolName) {
  if (toolName === 'search_memory') {
    return { status: 'unavailable', result_count: 0, results: [] };
  }
  const kind = {
    memory_overview: 'overview',
    audit_memory: 'audit',
    prepare_memory_context: 'context'
  }[toolName];
  if (!kind) reject('relay_attempt_tool_invalid');
  return { status: 'unavailable', kind, item_count: 0 };
}

module.exports = {
  createRelayProcessor,
  unavailableStructuredContent,
  validateAttemptContinuation,
  validateInvocationCounterAgreement,
  validateInvocation
};
