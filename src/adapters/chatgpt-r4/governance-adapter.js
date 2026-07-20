'use strict';

const {
  COUNTER_MODES,
  ZERO_MEMORY_COUNTERS,
  digestObject,
  validateCounters,
  validateProjectContextClaim,
  validatePublicStructuredContent,
  validateRequestEnvelope,
  reject
} = require('../../../packages/chatgpt-r4-contracts');

function createGovernanceAdapter({
  expectedIssuer,
  expectedAudience,
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  resolveContextPublicKey,
  issueProjectContext,
  resolveProjectContext,
  contextReplayGuard,
  invokeGovernance,
  counterMode = COUNTER_MODES.zeroMemory,
  clock = () => new Date()
}) {
  if (typeof issueProjectContext !== 'function') reject('context_issuer_missing');
  if (typeof resolveProjectContext !== 'function') reject('context_resolver_missing');
  if (typeof invokeGovernance !== 'function') reject('governance_invoker_missing');

  return Object.freeze({
    async handle({ request, relayReceipt }) {
      const now = clock();
      const validation = validateRequestEnvelope(request, {
        now,
        resolveRequestPublicKey,
        resolvePrincipalPublicKey,
        expectedIssuer,
        expectedAudience,
        consumeReplay: false
      });
      validateRelayReceipt(relayReceipt, validation.requestDigest);
      const toolName = request.tool_request.name;
      const principalFingerprint = validation.principalFingerprint;

      if (toolName === 'resolve_memory_context') {
        return handleResolve({
          request,
          relayReceipt,
          principalFingerprint,
          now,
          issueProjectContext,
          resolveContextPublicKey
        });
      }

      const contextRef = request.tool_request.arguments.project_context_ref;
      const claim = await resolveProjectContext(contextRef);
      validateProjectContextClaim(claim, {
        now,
        resolvePublicKey: resolveContextPublicKey,
        expectedPrincipalFingerprint: principalFingerprint,
        expectedContextRef: contextRef
      });
      if (!contextReplayGuard || typeof contextReplayGuard.consume !== 'function') {
        reject('context_replay_guard_missing');
      }
      contextReplayGuard.consume({
        namespace: 'project_context_ref',
        key: contextRef,
        expiresAt: claim.expires_at
      });

      const trustedScope = Object.freeze({
        clientId: claim.client_id,
        projectId: claim.project_id,
        workspaceId: claim.workspace_id,
        visibilityAllowlist: Object.freeze([...claim.visibility_allowlist]),
        registryReference: claim.registry_reference,
        mappingReference: claim.mapping_reference,
        mappingDigest: claim.mapping_digest
      });
      const invocation = await invokeGovernance({
        toolName,
        arguments: stripContextReference(request.tool_request.arguments),
        trustedScope,
        principalFingerprint,
        projectContextRef: contextRef
      });
      validateGovernanceInvocation(invocation, { counterMode });

      const contextReceipt = {
        schema_version: 1,
        kind: 'chatgpt_r4_context_receipt',
        project_context_ref_digest: digestObject(contextRef),
        principal_bound: true,
        client_bound: claim.client_id === 'ChatGPT',
        project_bound: true,
        workspace_bound: true,
        visibility_bound: true,
        registry_reference_bound: true,
        mapping_reference_bound: true,
        mapping_digest_bound: true,
        private_partition_access: false,
        legacy_partition_access: false
      };
      const governanceReceipt = {
        schema_version: 1,
        kind: 'chatgpt_r4_governance_receipt',
        request_digest: validation.requestDigest,
        relay_receipt_digest: digestObject(relayReceipt),
        context_receipt_digest: digestObject(contextReceipt),
        tool_name: toolName,
        authorization_resolved_locally: true,
        tool_arguments_used_as_diary_acl: false,
        result_scope_postcheck_passed: invocation.result_scope_postcheck_passed,
        counters_digest: digestObject(invocation.counters)
      };
      return {
        status: invocation.status,
        structured_content: invocation.structured_content,
        counters: { ...invocation.counters },
        receipt_digests: {
          governance: digestObject(governanceReceipt),
          context: digestObject(contextReceipt)
        }
      };
    }
  });
}

async function handleResolve({
  request,
  relayReceipt,
  principalFingerprint,
  now,
  issueProjectContext,
  resolveContextPublicKey
}) {
  const args = request.tool_request.arguments;
  const issued = await issueProjectContext({
    principalFingerprint,
    safeProjectAlias: args.project_alias,
    requestedVisibility: args.requested_visibility || 'task_start_context',
    now
  });
  if (issued && typeof issued === 'object' && !Array.isArray(issued) &&
      ['denied', 'unavailable'].includes(issued.status)) {
    if (Object.keys(issued).length !== 1) reject('context_issue_denial_shape_invalid');
    return buildResolveResult({
      request,
      relayReceipt,
      status: issued.status,
      structuredContent: { context_status: issued.status },
      contextReceipt: {
        schema_version: 1,
        kind: 'chatgpt_r4_context_receipt',
        context_status: issued.status,
        context_issued: false,
        principal_bound: true,
        private_partition_access: false,
        legacy_partition_access: false
      }
    });
  }
  if (!issued || typeof issued !== 'object' || Array.isArray(issued) ||
      typeof issued.safe_project_alias !== 'string') {
    reject('context_issue_result_invalid');
  }
  validateProjectContextClaim(issued.claim, {
    now,
    resolvePublicKey: resolveContextPublicKey,
    expectedPrincipalFingerprint: principalFingerprint
  });
  const requestedVisibility = args.requested_visibility || 'task_start_context';
  if (!issued.claim.visibility_allowlist.includes(requestedVisibility)) {
    reject('context_issue_visibility_mismatch');
  }

  const structuredContent = {
    project_context_ref: issued.claim.project_context_ref,
    safe_project_alias: issued.safe_project_alias,
    expires_at: issued.claim.expires_at,
    visibility_labels: [...issued.claim.visibility_allowlist],
    context_status: 'resolved'
  };
  validatePublicStructuredContent(structuredContent);

  const contextReceipt = {
    schema_version: 1,
    kind: 'chatgpt_r4_context_receipt',
    project_context_ref_digest: digestObject(issued.claim.project_context_ref),
    principal_bound: true,
    client_bound: true,
    project_bound: true,
    workspace_bound: true,
    visibility_bound: true,
    registry_reference_bound: true,
    mapping_reference_bound: true,
    mapping_digest_bound: true,
    private_partition_access: false,
    legacy_partition_access: false
  };
  return buildResolveResult({
    request,
    relayReceipt,
    status: 'ok',
    structuredContent,
    contextReceipt
  });
}

function buildResolveResult({ request, relayReceipt, status, structuredContent, contextReceipt }) {
  validatePublicStructuredContent(structuredContent);
  const governanceReceipt = {
    schema_version: 1,
    kind: 'chatgpt_r4_governance_receipt',
    request_digest: digestObject(request),
    relay_receipt_digest: digestObject(relayReceipt),
    context_receipt_digest: digestObject(contextReceipt),
    tool_name: 'resolve_memory_context',
    authorization_resolved_locally: status !== 'unavailable',
    tool_arguments_used_as_diary_acl: false,
    result_scope_postcheck_passed: true,
    counters_digest: digestObject(ZERO_MEMORY_COUNTERS)
  };
  return {
    status,
    structured_content: structuredContent,
    counters: { ...ZERO_MEMORY_COUNTERS },
    receipt_digests: {
      governance: digestObject(governanceReceipt),
      context: digestObject(contextReceipt)
    }
  };
}

function validateRelayReceipt(receipt, expectedRequestDigest) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) reject('relay_receipt_invalid');
  const expectedKeys = [
    'schema_version', 'kind', 'request_digest', 'signature_valid',
    'replay_guard_passed', 'forwarded_over', 'scope_authorized_by_relay',
    'durable_state_written'
  ].sort();
  const actualKeys = Object.keys(receipt).sort();
  if (actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index])) {
    reject('relay_receipt_shape_invalid');
  }
  if (receipt.schema_version !== 1 ||
      receipt.forwarded_over !== 'injected_uds_boundary' ||
      !/^sha256:[a-f0-9]{64}$/u.test(receipt.request_digest)) {
    reject('relay_receipt_value_invalid');
  }
  if (receipt.kind !== 'chatgpt_r4_relay_receipt' || receipt.request_digest !== expectedRequestDigest) {
    reject('relay_receipt_binding_invalid');
  }
  if (receipt.signature_valid !== true || receipt.replay_guard_passed !== true ||
      receipt.scope_authorized_by_relay !== false || receipt.durable_state_written !== false) {
    reject('relay_receipt_invariant_invalid');
  }
}

function stripContextReference(args) {
  const { project_context_ref, ...rest } = args;
  return Object.freeze({ ...rest });
}

function validateGovernanceInvocation(invocation, { counterMode = COUNTER_MODES.zeroMemory } = {}) {
  if (!invocation || typeof invocation !== 'object' || Array.isArray(invocation)) {
    reject('governance_invocation_invalid');
  }
  const expected = ['status', 'structured_content', 'counters', 'result_scope_postcheck_passed'].sort();
  const actual = Object.keys(invocation).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    reject('governance_invocation_shape_invalid');
  }
  if (!['ok', 'denied', 'unavailable'].includes(invocation.status)) reject('governance_status_invalid');
  if (invocation.result_scope_postcheck_passed !== true) reject('governance_result_postcheck_failed');
  validatePublicStructuredContent(invocation.structured_content);
  validateCounters(invocation.counters, { counterMode });
}

module.exports = {
  createGovernanceAdapter,
  validateRelayReceipt,
  validateGovernanceInvocation
};
