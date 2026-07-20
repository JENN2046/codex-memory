'use strict';

const {
  COUNTER_MODES,
  createResponseEnvelope,
  digestObject,
  validateCounters,
  validateRequestEnvelope,
  validateReceiptChain,
  validateToolStructuredContent,
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
  clock = () => new Date()
}) {
  if (typeof forwardToUds !== 'function') reject('relay_forwarder_missing');

  return Object.freeze({
    async handle(request) {
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
      const invocation = await forwardToUds({ request: forwardedRequest, relayReceipt });
      const responseNow = clock();
      validateInvocation(invocation, toolName, { counterMode });
      const receiptChain = {
        edge_request: validation.requestDigest,
        relay: digestObject(relayReceipt),
        governance: invocation.receipt_digests.governance,
        context: invocation.receipt_digests.context
      };
      validateReceiptChain(receiptChain);

      return createResponseEnvelope({
        requestId,
        requestDigest: validation.requestDigest,
        toolName,
        status: invocation.status,
        structuredContent: invocation.structured_content,
        counters: invocation.counters,
        receiptChain,
        now: responseNow,
        signing: responseSigning
      });
    }
  });
}

function validateInvocation(invocation, toolName, { counterMode = COUNTER_MODES.zeroMemory } = {}) {
  if (!invocation || typeof invocation !== 'object' || Array.isArray(invocation)) {
    reject('relay_invocation_invalid');
  }
  const keys = Object.keys(invocation).sort();
  if (keys.join(',') !== ['counters', 'receipt_digests', 'status', 'structured_content'].sort().join(',')) {
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

module.exports = {
  createRelayProcessor,
  validateInvocation
};
