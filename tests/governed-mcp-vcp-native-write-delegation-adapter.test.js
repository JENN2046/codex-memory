'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildDelegatedArguments,
  executeGovernedMcpVcpNativeWriteDelegation
} = require('../src/core/GovernedMcpVcpNativeWriteDelegationAdapter');
const {
  validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal,
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal
} = require('../src/core/CurrentProductGoalContract');

const WRITE_TOOL_EXACT_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});

function acceptedGate(overrides = {}) {
  return {
    accepted: true,
    normalizedBridgeRequest: {
      client_id: 'Codex',
      visibility: 'private',
      scope_present: true,
      scope_identifier_present: true,
      scope_identifier_safe: true,
      trusted_execution_context_supplied: true,
      trusted_execution_context_accepted: true,
      trusted_execution_context_scope_matched: true,
      scope: {
        project_id: 'codex-memory',
        scope_id: 'scope-alpha',
        workspace_id: 'workspace-alpha',
        client_id: 'Codex',
        visibility: 'private'
      },
      runtime_target: 'VCPToolBox native memory',
      runtime_target_reference_name: 'operator-vcp-toolbox-service-ref',
      runtime_target_kind: 'mcp_server',
      runtime_target_source_authority: 'bridge_runtime_or_static_config',
      runtime_target_configured: true,
      runtime_target_forbidden_field_count: 0,
      access_path: 'governed MCP tools',
      invocation_profile: 'governed_bounded_write',
      transport: 'mcp',
      invocation_profile_forbidden_field_count: 0,
      mcp_tool_name: 'record_memory',
      read_allowed: false,
      write_allowed: true,
      write_policy: 'exact_approval',
      read_write_authority_forbidden_field_count: 0,
      exact_approval_action: 'live_bridge_record_memory_proof',
      exact_approval_action_matched: true,
      exact_approval_scope_matched: true,
      exact_approval_runtime_target_matched: true,
      exact_approval_rollback_plan_matched: true,
      exact_approval_scope_references_safe: true,
      exact_approval_scope_visibility_accepted: true,
      exact_approval_runtime_target_reference_safe: true,
      exact_approval_runtime_target_kind_accepted: true,
      exact_approval_runtime_target_primary_runtime_accepted: true,
      exact_approval_rollback_plan_reference_present: true,
      exact_approval_rollback_plan_reference_safe: true,
      exact_approval_forbidden_field_count: 0,
      disclosure_level: 'receipt_only',
      disclosure_max_items: 3,
      disclosure_max_bytes: 1024,
      disclosure_forbidden_field_count: 0,
      raw_output_allowed: false,
      audit_receipt_required: true,
      audit_receipt_low_disclosure: true,
      audit_receipt_reference_present: true,
      audit_receipt_reference_name: 'cm-governed-write-receipt',
      audit_receipt_forbidden_field_count: 0,
      rollback_posture: 'bounded_rollback_plan',
      rollback_plan_reference_present: true,
      rollback_plan_reference_safe: true,
      rollback_plan_reference_name: 'cm-governed-write-rollback-plan',
      rollback_posture_forbidden_field_count: 0,
      ...overrides
    }
  };
}

function acceptedGateForTool(toolName, overrides = {}) {
  return acceptedGate({
    mcp_tool_name: toolName,
    exact_approval_action: WRITE_TOOL_EXACT_APPROVAL_ACTIONS[toolName],
    ...overrides
  });
}

function nativeInvocationReceiptForPayload(payload, overrides = {}) {
  return {
    targetReferenceName: payload.targetReferenceName,
    targetKind: 'mcp_server',
    transportCategory: 'local_http_transport',
    mcpMethod: 'tools/call',
    toolName: payload.toolName,
    requestIdCategory: 'generated_bridge_request_id',
    jsonRpcResponseIdMatched: true,
    governanceMetadataPath: 'params._meta.codexMemoryGovernance',
    governanceMetadataSent: true,
    governanceMetadataRawValueDisclosed: false,
    statusClass: 'success',
    httpStatusClass: 'success',
    responseShapeCategory: 'object_top_level_kind_only_no_field_names',
    topLevelKindCategory: 'object',
    ...overrides
  };
}

function receiptAwareCallMcpTool(handler, receiptOverrides = {}) {
  const callMcpTool = async () => {
    throw new Error('raw native call path should not be used without audit receipt');
  };
  callMcpTool.callWithReceipt = async payload => ({
    value: await handler(payload),
    receipt: nativeInvocationReceiptForPayload(payload, receiptOverrides)
  });
  return callMcpTool;
}

test('delegates bounded record_memory write to native MCP without returning raw payload', async () => {
  let call = null;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none',
      endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_FORWARD',
      scope: {
        project_id: 'attacker-project',
        scope_id: 'attacker-scope',
        workspace_id: 'attacker-workspace',
        client_id: 'other-client',
        visibility: 'workspace'
      },
      project_id: 'attacker-project',
      scope_id: 'attacker-scope',
      workspace_id: 'attacker-workspace',
      client_id: 'other-client',
      visibility: 'workspace'
    },
    gateResult: acceptedGate(),
    callMcpTool: receiptAwareCallMcpTool(async payload => {
      call = payload;
      return {
        memory_id: 'RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO',
        content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
      };
    })
  });
  const serializedResult = JSON.stringify(result);
  const delegatedCoverage =
    validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(call.arguments, {
      toolName: 'record_memory'
    });

  assert.equal(call.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(delegatedCoverage.accepted, true, delegatedCoverage.blockers.join(', '));
  assert.equal(delegatedCoverage.direction, 'write');
  assert.equal(call.toolName, 'record_memory');
  assert.equal(call.arguments.content, 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO');
  assert.equal(call.arguments.endpoint, undefined);
  assert.equal(call.arguments.project_id, undefined);
  assert.equal(call.arguments.scope_id, undefined);
  assert.equal(call.arguments.workspace_id, undefined);
  assert.equal(call.arguments.client_id, undefined);
  assert.equal(call.arguments.visibility, undefined);
  assert.deepEqual(call.arguments.scope, {
    project_id: 'codex-memory',
    scope_id: 'scope-alpha',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  });
  assert.equal(call.arguments.governed_bridge.primary_runtime, 'VCPToolBox native memory');
  assert.equal(call.arguments.governed_bridge.access_path, 'governed MCP tools');
  assert.deepEqual(call.arguments.governed_bridge.runtime_target, {
    primary_runtime: 'VCPToolBox native memory',
    target_reference_name: 'operator-vcp-toolbox-service-ref',
    target_kind: 'mcp_server',
    source_authority: 'bridge_runtime_or_static_config',
    forbidden_field_count: 0,
    bound: true,
    tool_arguments_may_override: false,
    governance_metadata_may_override: false,
    locator_included: false,
    endpoint_included: false,
    token_material_included: false,
    locator_disclosed: false,
    endpoint_disclosed: false,
    token_material_disclosed: false
  });
  assert.equal(call.arguments.governed_bridge.invocation_profile_source, 'bridge_tool_binding');
  assert.equal(call.arguments.governed_bridge.invocation_profile_bound, true);
  assert.equal(call.arguments.governed_bridge.invocation_profile_tool_arguments_may_override, false);
  assert.equal(call.arguments.governed_bridge.invocation_profile_governance_metadata_may_override, false);
  assert.equal(call.arguments.governed_bridge.invocation_profile_forbidden_field_count, 0);
  assert.equal(call.arguments.governed_bridge.read_allowed, false);
  assert.equal(call.arguments.governed_bridge.write_allowed, true);
  assert.equal(call.arguments.governed_bridge.exact_approval_action, 'live_bridge_record_memory_proof');
  assert.equal(call.arguments.governed_bridge.read_write_authority_source, 'bridge_tool_binding');
  assert.equal(call.arguments.governed_bridge.read_write_authority_forbidden_field_count, 0);
  assert.equal(call.arguments.governed_bridge.read_write_authority_bound, true);
  assert.equal(call.arguments.governed_bridge.mixed_read_write_allowed, false);
  assert.equal(call.arguments.governed_bridge.unbounded_write_allowed, false);
  assert.equal(call.arguments.governed_bridge.write_requires_exact_approval, true);
  assert.equal(call.arguments.governed_bridge.exact_approval_action_matched, true);
  assert.equal(call.arguments.governed_bridge.exact_approval_scope_matched, true);
  assert.equal(call.arguments.governed_bridge.exact_approval_runtime_target_matched, true);
  assert.equal(call.arguments.governed_bridge.exact_approval_rollback_plan_matched, true);
  assert.equal(call.arguments.governed_bridge.exact_approval_forbidden_field_count, 0);
  assert.equal(call.arguments.governed_bridge.raw_output_allowed, false);
  assert.equal(call.arguments.governed_bridge.disclosure_level, 'receipt_only');
  assert.equal(call.arguments.governed_bridge.disclosure_max_items, 3);
  assert.equal(call.arguments.governed_bridge.disclosure_max_bytes, 1024);
  assert.equal(call.arguments.governed_bridge.output_disclosure_budget_bound, true);
  assert.equal(call.arguments.governed_bridge.over_budget_fallback_to_raw_output, false);
  assert.equal(call.arguments.governed_bridge.raw_response_body_disclosed, false);
  assert.equal(call.arguments.governed_bridge.rollback_plan_reference_present, true);
  assert.equal(call.arguments.governed_bridge.rollback_plan_reference_safe, true);
  assert.equal(
    call.arguments.governed_bridge.rollback_plan_reference_name,
    'cm-governed-write-rollback-plan'
  );
  assert.equal(call.arguments.governed_bridge.rollback_posture_bound, true);
  assert.equal(call.arguments.governed_bridge.rollback_plan_shape_only, true);
  assert.equal(call.arguments.governed_bridge.rollback_auto_apply_allowed, false);
  assert.equal(call.arguments.governed_bridge.rollback_apply_requires_governed_followup, true);
  assert.equal(call.arguments.governed_bridge.rollback_raw_plan_disclosed, false);
  assert.equal(call.arguments.governed_bridge.rollback_raw_plan_persisted, false);
  assert.equal(call.arguments.governed_bridge.audit_receipt_low_disclosure, true);
  assert.equal(call.arguments.governed_bridge.audit_receipt_reference_present, true);
  assert.equal(call.arguments.governed_bridge.audit_receipt_reference_name, 'cm-governed-write-receipt');
  assert.equal(call.arguments.governed_bridge.audit_receipt_event_type, 'governed_mcp_vcp_native_bridge_receipt');
  assert.equal(call.arguments.governed_bridge.audit_receipt_append_required, true);
  assert.equal(call.arguments.governed_bridge.audit_receipt_low_disclosure_bound, true);
  assert.equal(call.arguments.governed_bridge.audit_raw_request_body_persisted, false);
  assert.equal(call.arguments.governed_bridge.audit_raw_response_body_persisted, false);
  assert.deepEqual(call.arguments.governed_bridge.scope, {
    project_id: 'codex-memory',
    scope_id: 'scope-alpha',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  });
  assert.equal(call.arguments.governed_bridge.scope_present, true);
  assert.equal(call.arguments.governed_bridge.scope_identifier_present, true);
  assert.equal(call.arguments.governed_bridge.scope_identifier_safe, true);
  assert.deepEqual(call.arguments.governed_bridge.scope_field_names, [
    'client_id',
    'project_id',
    'scope_id',
    'visibility',
    'workspace_id'
  ]);
  assert.deepEqual(call.arguments.governed_bridge.scope_identifier_field_names, [
    'project_id',
    'scope_id',
    'workspace_id'
  ]);
  assert.equal(
    call.arguments.governed_bridge.scope_fingerprint,
    'f34c14c55b2f97e90cee55b0ad91abeff0941991b895e0ca64e3d9248b98c3d8'
  );
  assert.equal(call.arguments.governed_bridge.raw_scope_persisted, false);
  assert.equal(call.arguments.governed_bridge.raw_scope_value_returned, false);
  assert.equal(call.arguments.governed_bridge.client_identity_source, 'trusted_execution_context_or_transport');
  assert.equal(call.arguments.governed_bridge.client_identity_bound, true);
  assert.equal(call.arguments.governed_bridge.client_identity_tool_arguments_may_override, false);
  assert.equal(call.arguments.governed_bridge.client_identity_governance_metadata_may_override, false);
  assert.equal(call.arguments.governed_bridge.scope_boundary_source, 'trusted_execution_context_or_transport');
  assert.equal(call.arguments.governed_bridge.scope_boundary_bound, true);
  assert.equal(call.arguments.governed_bridge.scope_tool_arguments_may_override, false);
  assert.equal(call.arguments.governed_bridge.scope_governance_metadata_may_override, false);
  assert.equal(call.arguments.governed_bridge.visibility_bound, true);
  assert.equal(call.arguments.governed_bridge.local_memory_role, 'not_used');
  assert.equal(call.arguments.governed_bridge.local_memory_source_runtime, null);
  assert.equal(call.arguments.governed_bridge.local_memory_primary_runtime, false);
  assert.equal(call.arguments.governed_bridge.local_memory_fallback_used, false);
  assert.equal(call.arguments.governed_bridge.local_memory_result_returned, false);
  assert.equal(call.arguments.governed_bridge.local_memory_result_can_be_mistaken_for_vcp_native, false);
  assert.equal(call.arguments.governed_bridge.local_memory_raw_content_disclosed, false);
  assert.equal(call.arguments.governed_bridge.trusted_execution_context_supplied, true);
  assert.equal(call.arguments.governed_bridge.trusted_execution_context_accepted, true);
  assert.equal(call.arguments.governed_bridge.trusted_execution_context_scope_matched, true);
  assert.equal(call.arguments.governed_bridge.invocation_transport, 'mcp');
  assert.equal(call.arguments.governed_bridge.invocation_tool_name, 'record_memory');
  assert.equal(call.arguments.governed_bridge.invocation_profile_tool_match, true);
  assert.equal(
    call.governanceMeta.schemaVersion,
    'codex_memory_governed_native_bridge_call_governance_v1'
  );
  assert.equal(call.governanceMeta.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(call.governanceMeta.invocationProfile.profile, 'governed_bounded_write');
  assert.equal(call.governanceMeta.invocationProfile.toolName, 'record_memory');
  assert.equal(call.governanceMeta.readWriteAuthority.writeRequiresExactApproval, true);
  assert.equal(call.governanceMeta.exactApprovalResult.allowedAction, 'live_bridge_record_memory_proof');
  assert.equal(call.governanceMeta.exactApprovalResult.scopeMatched, true);
  assert.equal(call.governanceMeta.exactApprovalResult.runtimeTargetMatched, true);
  assert.equal(call.governanceMeta.exactApprovalResult.rollbackPlanMatched, true);
  assert.equal(call.governanceMeta.exactApprovalResult.rollbackPlanRef, 'cm-governed-write-rollback-plan');
  assert.equal(call.governanceMeta.outputDisclosureBudget.rawOutput, false);
  assert.equal(call.governanceMeta.auditReceipt.receipt_id, 'cm-governed-write-receipt');
  assert.equal(call.governanceMeta.rollbackPosture.mode, 'bounded_rollback_plan');
  assert.equal(call.governanceMeta.rollbackPosture.rollback_plan_ref, 'cm-governed-write-rollback-plan');
  assert.equal(call.governanceMeta.runtimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  const governanceMetadataCoverage =
    validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(call.governanceMeta, {
      toolName: 'record_memory'
    });
  assert.equal(
    governanceMetadataCoverage.accepted,
    true,
    governanceMetadataCoverage.blockers.join(', ')
  );
  assert.equal(governanceMetadataCoverage.metadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(governanceMetadataCoverage.direction, 'write');
  assert.equal(result.accepted, true);
  assert.equal(result.delegatedResult.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
  assert.equal(result.delegatedResult.access.memoryWritePerformed, true);
  assert.equal(result.delegatedResult.access.localMemoryFallbackUsed, false);
  assert.equal(result.receipt.fieldNameDisclosurePolicy, 'no_native_field_names_or_memory_payload_disclosed');
  assert.equal(result.receipt.exactApprovalAction, 'live_bridge_record_memory_proof');
  assert.equal(result.receipt.exactApprovalActionMatched, true);
  assert.equal(result.receipt.exactApprovalScopeMatched, true);
  assert.equal(result.receipt.exactApprovalRuntimeTargetMatched, true);
  assert.equal(result.receipt.exactApprovalRollbackPlanMatched, true);
  assert.equal(result.receipt.exactApprovalForbiddenFieldCount, 0);
  assert.equal(result.receipt.runtimeTargetBound, true);
  assert.equal(result.receipt.runtimeTargetToolArgumentsMayOverride, false);
  assert.equal(result.receipt.runtimeTargetGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.invocationProfileSource, 'bridge_tool_binding');
  assert.equal(result.receipt.invocationProfileBound, true);
  assert.equal(result.receipt.invocationProfileToolArgumentsMayOverride, false);
  assert.equal(result.receipt.invocationProfileGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.outputDisclosureBudgetSource, 'bridge_gate_normalized_governance');
  assert.equal(result.receipt.outputDisclosureBudgetBound, true);
  assert.equal(result.receipt.outputDisclosureBudgetToolArgumentsMayOverride, false);
  assert.equal(result.receipt.outputDisclosureBudgetGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.auditReceiptSource, 'bridge_gate_normalized_governance');
  assert.equal(result.receipt.auditReceiptLowDisclosureBound, true);
  assert.equal(result.receipt.auditReceiptToolArgumentsMayOverride, false);
  assert.equal(result.receipt.auditReceiptGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.rollbackPostureSource, 'bridge_gate_normalized_governance');
  assert.equal(result.receipt.rollbackPostureToolArgumentsMayOverride, false);
  assert.equal(result.receipt.rollbackPostureGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.clientIdentitySource, 'trusted_execution_context_or_transport');
  assert.equal(result.receipt.clientIdentityBound, true);
  assert.equal(result.receipt.clientIdentityToolArgumentsMayOverride, false);
  assert.equal(result.receipt.clientIdentityGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.scopeBoundarySource, 'trusted_execution_context_or_transport');
  assert.equal(result.receipt.scopeBoundaryBound, true);
  assert.equal(result.receipt.scopeToolArgumentsMayOverride, false);
  assert.equal(result.receipt.scopeGovernanceMetadataMayOverride, false);
  assert.equal(result.receipt.visibilityBound, true);
  assert.equal(result.receipt.rawScopeValueReturned, false);
  assert.equal(result.receipt.localMemoryRole, 'not_used');
  assert.equal(result.receipt.localMemorySourceRuntime, null);
  assert.equal(result.receipt.localMemoryPrimaryRuntime, false);
  assert.equal(result.receipt.localMemoryFallbackUsed, false);
  assert.equal(result.receipt.localMemoryResultReturned, false);
  assert.equal(result.receipt.localMemoryResultCanBeMistakenForVcpNative, false);
  assert.equal(result.receipt.localMemoryRawContentDisclosed, false);
  assert.equal(result.receipt.readWriteAuthoritySource, 'bridge_tool_binding');
  assert.equal(result.receipt.readWriteAuthorityForbiddenFieldCount, 0);
  assert.equal(result.receipt.readWriteAuthorityBound, true);
  assert.equal(result.receipt.mixedReadWriteAllowed, false);
  assert.equal(result.receipt.unboundedWriteAllowed, false);
  assert.equal(result.receipt.writeRequiresExactApproval, true);
  assert.equal(result.receipt.rollbackPlanBound, true);
  assert.equal(result.receipt.rollbackPostureBound, true);
  assert.equal(result.receipt.rollbackPlanShapeOnly, true);
  assert.equal(result.receipt.rollbackRequired, false);
  assert.equal(result.receipt.rollbackDisposition, 'no_rollback_required');
  assert.equal(result.receipt.rollbackFollowupRequired, false);
  assert.equal(result.receipt.rollbackApplyPolicy, 'not_applicable');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(result.receipt.rollbackRawPlanDisclosed, false);
  assert.equal(result.receipt.rollbackRawPlanPersisted, false);
  const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(result.receipt);
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(coverage.direction, 'write');
  assert.deepEqual(coverage.requiredGovernedDimensions, [
    'client_id',
    'scope',
    'visibility',
    'runtime target',
    'invocation profile',
    'read/write authority',
    'output disclosure budget',
    'audit receipt',
    'rollback posture'
  ]);
  assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(JSON.stringify(call.arguments.governed_bridge).includes('attacker-project'), false);
  assert.equal(JSON.stringify(call.arguments.governed_bridge).includes('attacker-scope'), false);
  assert.equal(JSON.stringify(call.arguments.scope).includes('other-client'), false);
});

test('delegates write with mutation cleanup rollback posture accepted by gate', async () => {
  let call = null;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed cleanup posture proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate({
      rollback_posture: 'mutation_cleanup_plan'
    }),
    callMcpTool: receiptAwareCallMcpTool(async payload => {
      call = payload;
      return {
        status: 'ok',
        content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
      };
    })
  });
  const serializedResult = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(call.arguments.governed_bridge.rollback_posture, 'mutation_cleanup_plan');
  assert.equal(call.arguments.governed_bridge.rollback_posture_bound, true);
  assert.equal(call.arguments.governed_bridge.rollback_auto_apply_allowed, false);
  assert.equal(call.arguments.governed_bridge.rollback_apply_requires_governed_followup, true);
  assert.equal(
    call.arguments.governed_bridge.rollback_plan_reference_name,
    'cm-governed-write-rollback-plan'
  );
  assert.equal(result.receipt.rollbackPosture, 'mutation_cleanup_plan');
  assert.equal(result.receipt.rollbackPlanReferencePresent, true);
  assert.equal(result.receipt.rollbackPlanReferenceName, 'cm-governed-write-rollback-plan');
  assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('write delegation requires native caller receipt capability before native call', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool: async () => {
      calls += 1;
      return {
        status: 'ok',
        content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
      };
    }
  });
  const serializedResult = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('callMcpTool.callWithReceipt'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(result.rollbackApplied, false);
  assert.equal(calls, 0);
  assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('write delegation marks rollback required when successful native value has no invocation receipt', async () => {
  let calls = 0;
  const callMcpTool = async () => {
    throw new Error('raw native call path should not be used');
  };
  callMcpTool.callWithReceipt = async () => {
    calls += 1;
    return {
      value: {
        status: 'ok',
        content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
      }
    };
  };

  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool
  });
  const serializedResult = JSON.stringify(result);

  assert.equal(calls, 1);
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.receipt.nativeInvocationReceipt, null);
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(result.receipt.rollbackRequired, true);
  assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
  assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
  assert.equal(result.receipt.rollbackFollowupRequired, true);
  assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(result.rollbackApplied, false);
  assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('write delegation marks rollback required when native receipt disclosed governance metadata raw value', async () => {
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool: receiptAwareCallMcpTool(async () => ({
      status: 'ok',
      content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
    }), {
      governanceMetadataRawValueDisclosed: true
    })
  });
  const serializedResult = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(result.receipt.rollbackRequired, true);
  assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
  assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
  assert.equal(result.receipt.rollbackFollowupRequired, true);
  assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(receipt.invocationBindingMatched, true);
  assert.equal(receipt.governanceMetadataSent, true);
  assert.equal(receipt.governanceMetadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(receipt.governanceMetadataRawValueDisclosed, true);
  assert.equal(result.rollbackApplied, false);
  assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('write delegation rejects oversized public schema fields before native call', async () => {
  const cases = [
    {
      toolName: 'record_memory',
      args: {
        target: 'knowledge',
        title: 'safe title',
        content: 'PRIVATE_OVERSIZED_RECORD_CONTENT_SHOULD_NOT_ECHO'.repeat(500),
        evidence: 'safe evidence',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      },
      invalidField: 'args.content'
    },
    {
      toolName: 'tombstone_memory',
      args: {
        memory_id: 'memory-id',
        reason: 'safe reason',
        evidence: 'PRIVATE_OVERSIZED_TOMBSTONE_EVIDENCE_SHOULD_NOT_ECHO'.repeat(100),
        tombstone_reason: 'safe tombstone reason',
        actor_client_id: 'Codex',
        request_source: 'governed-bridge'
      },
      invalidField: 'args.evidence'
    },
    {
      toolName: 'supersede_memory',
      args: {
        old_memory_id: 'PRIVATE_OVERSIZED_OLD_MEMORY_ID_SHOULD_NOT_ECHO'.repeat(10),
        new_memory_id: 'new-id',
        reason: 'safe reason',
        evidence: 'safe evidence',
        supersedes_link: 'supersedes-link',
        superseded_by_link: 'superseded-by-link',
        actor_client_id: 'Codex',
        request_source: 'governed-bridge'
      },
      invalidField: 'args.old_memory_id'
    }
  ];

  for (const testCase of cases) {
    let calls = 0;
    const result = await executeGovernedMcpVcpNativeWriteDelegation({
      toolName: testCase.toolName,
      args: testCase.args,
      gateResult: acceptedGateForTool(testCase.toolName),
      callMcpTool: async () => {
        calls += 1;
        return {};
      }
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.accepted, false, testCase.toolName);
    assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
    assert.ok(result.invalidFields.includes(testCase.invalidField), testCase.toolName);
    assert.equal(result.runtimeCalled, false);
    assert.equal(result.memoryWritePerformed, false);
    assert.equal(calls, 0);
    assert.equal(serialized.includes('PRIVATE_OVERSIZED_'), false);
  }
});

test('write delegation rejects missing public schema fields before native call', async () => {
  const cases = [
    {
      toolName: 'record_memory',
      args: {
        target: 'knowledge',
        title: 'safe title',
        evidence: 'safe evidence',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      },
      invalidField: 'args.content'
    },
    {
      toolName: 'tombstone_memory',
      args: {
        memory_id: 'memory-id',
        reason: 'safe reason',
        evidence: 'safe evidence',
        actor_client_id: 'Codex',
        request_source: 'governed-bridge'
      },
      invalidField: 'args.tombstone_reason'
    },
    {
      toolName: 'supersede_memory',
      args: {
        old_memory_id: 'old-id',
        new_memory_id: 'new-id',
        reason: 'safe reason',
        evidence: 'safe evidence',
        superseded_by_link: 'superseded-by-link',
        actor_client_id: 'Codex',
        request_source: 'governed-bridge'
      },
      invalidField: 'args.supersedes_link'
    }
  ];

  for (const testCase of cases) {
    let calls = 0;
    const result = await executeGovernedMcpVcpNativeWriteDelegation({
      toolName: testCase.toolName,
      args: testCase.args,
      gateResult: acceptedGateForTool(testCase.toolName),
      callMcpTool: async () => {
        calls += 1;
        return {};
      }
    });

    assert.equal(result.accepted, false, testCase.toolName);
    assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
    assert.ok(result.invalidFields.includes(testCase.invalidField), testCase.toolName);
    assert.equal(result.runtimeCalled, false);
    assert.equal(result.memoryWritePerformed, false);
    assert.equal(calls, 0);
  }
});

test('rejects write delegation unless exact approval rollback and audit controls survived gate', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      client_id: 'Claude',
      visibility: 'public',
      scope_identifier_present: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'Claude',
        visibility: 'workspace'
      },
      runtime_target: 'codex-memory local memory',
      runtime_target_kind: 'local_memory',
      runtime_target_source_authority: 'tool_payload',
      runtime_target_configured: false,
      runtime_target_forbidden_field_count: 2,
      access_path: 'direct local call',
      invocation_profile_forbidden_field_count: 2,
      write_policy: null,
      read_write_authority_forbidden_field_count: 2,
      disclosure_level: 'raw',
      disclosure_max_items: 500,
      disclosure_max_bytes: 65536,
      disclosure_forbidden_field_count: 2,
      audit_receipt_required: false,
      audit_receipt_low_disclosure: false,
      audit_receipt_reference_name: 'https://PRIVATE_WRITE_RECEIPT_SHOULD_NOT_ECHO',
      audit_receipt_forbidden_field_count: 2,
      rollback_plan_reference_present: false,
      rollback_plan_reference_safe: false,
      rollback_plan_reference_name: null,
      rollback_posture_forbidden_field_count: 2
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.client_id'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.client_id'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.visibility'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.visibility'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope_identifier_present'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.access_path'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.runtime_target'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.runtime_target_kind'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.runtime_target_source_authority'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.runtime_target_configured'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.write_policy'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_level'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_max_items'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_max_bytes'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_required'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_low_disclosure'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_reference_name'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_plan_reference_present'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_plan_reference_safe'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_plan_reference_name'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_count'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(result).includes('PRIVATE_WRITE_RECEIPT_SHOULD_NOT_ECHO'), false);
});

test('write delegation rejects forbidden disclosure audit and rollback evidence after forged gate acceptance', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'bounded content'
    },
    gateResult: acceptedGate({
      disclosure_forbidden_field_count: 1,
      audit_receipt_forbidden_field_count: 1,
      rollback_posture_forbidden_field_count: 1
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_count'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('write delegation rejects forbidden invocation profile and authority evidence after forged gate acceptance', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'bounded content'
    },
    gateResult: acceptedGate({
      invocation_profile_forbidden_field_count: 1,
      read_write_authority_forbidden_field_count: 1
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_count'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('write delegation rejection low-disclosure projection drops unsafe forged governance strings', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      invocation_profile: 'https://PRIVATE_WRITE_PROFILE_SHOULD_NOT_ECHO',
      disclosure_level: 'https://PRIVATE_WRITE_DISCLOSURE_SHOULD_NOT_ECHO',
      rollback_posture: 'https://PRIVATE_WRITE_ROLLBACK_SHOULD_NOT_ECHO'
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.equal(result.lowDisclosureProjection.invocationProfile, null);
  assert.equal(result.lowDisclosureProjection.disclosureLevel, null);
  assert.equal(result.lowDisclosureProjection.rollbackPosture, null);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_WRITE_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WRITE_DISCLOSURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WRITE_ROLLBACK_SHOULD_NOT_ECHO'), false);
});

test('write delegation rejects forged read authority after gate acceptance', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      read_allowed: true,
      write_allowed: false,
      write_policy: null
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.read_allowed'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.write_allowed'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.write_policy'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('rejects write delegation when forged gate scope identifiers are unsafe', async () => {
  let calls = 0;
  const gateResult = acceptedGate({
    scope: {
      project_id: 'https://PRIVATE_WRITE_PROJECT_SCOPE_SHOULD_NOT_ECHO',
      workspace_id: 'workspace-alpha',
      scope_id: 'file:///PRIVATE_WRITE_SCOPE_ID_SHOULD_NOT_ECHO',
      client_id: 'Codex',
      visibility: 'private'
    }
  });
  const delegated = buildDelegatedArguments('record_memory', {
    target: 'knowledge',
    title: 'Governed write',
    content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'
  }, gateResult);

  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify({ result, delegated });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.project_id'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.scope_id'));
  assert.equal(delegated.scope.project_id, undefined);
  assert.equal(delegated.scope.scope_id, undefined);
  assert.equal(delegated.scope.workspace_id, 'workspace-alpha');
  assert.equal(delegated.governed_bridge.scope.project_id, undefined);
  assert.equal(delegated.governed_bridge.scope.scope_id, undefined);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_WRITE_PROJECT_SCOPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WRITE_SCOPE_ID_SHOULD_NOT_ECHO'), false);
});

test('write delegated scope projection drops forged client id and visibility before native arguments', async () => {
  let calls = 0;
  const gateResult = acceptedGate({
    scope: {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'PRIVATE_WRITE_CLIENT_SHOULD_NOT_ECHO',
      visibility: 'PRIVATE_WRITE_VISIBILITY_SHOULD_NOT_ECHO'
    }
  });
  const delegated = buildDelegatedArguments('record_memory', {
    target: 'knowledge',
    title: 'Governed write',
    content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'
  }, gateResult);

  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify({ delegated, result });

  assert.equal(delegated.scope.project_id, 'codex-memory');
  assert.equal(delegated.scope.workspace_id, 'workspace-alpha');
  assert.equal(delegated.scope.client_id, undefined);
  assert.equal(delegated.scope.visibility, undefined);
  assert.equal(delegated.governed_bridge.scope.client_id, undefined);
  assert.equal(delegated.governed_bridge.scope.visibility, undefined);
  assert.equal(result.accepted, false);
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.client_id'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.visibility'));
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_WRITE_CLIENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WRITE_VISIBILITY_SHOULD_NOT_ECHO'), false);
});

test('write governed bridge envelope projects forged governance fields before native arguments', async () => {
  let calls = 0;
  const gateResult = acceptedGate({
    client_id: 'PRIVATE_WRITE_ENVELOPE_CLIENT_SHOULD_NOT_ECHO',
    visibility: 'PRIVATE_WRITE_ENVELOPE_VISIBILITY_SHOULD_NOT_ECHO',
    runtime_target_kind: 'PRIVATE_WRITE_ENVELOPE_TARGET_KIND_SHOULD_NOT_ECHO',
    runtime_target_source_authority: 'PRIVATE_WRITE_ENVELOPE_SOURCE_SHOULD_NOT_ECHO',
    invocation_profile: 'PRIVATE_WRITE_ENVELOPE_PROFILE_SHOULD_NOT_ECHO',
    write_policy: 'PRIVATE_WRITE_ENVELOPE_POLICY_SHOULD_NOT_ECHO',
    disclosure_level: 'PRIVATE_WRITE_ENVELOPE_DISCLOSURE_SHOULD_NOT_ECHO',
    rollback_posture: 'PRIVATE_WRITE_ENVELOPE_ROLLBACK_SHOULD_NOT_ECHO'
  });
  const delegated = buildDelegatedArguments('record_memory', {
    target: 'knowledge',
    title: 'Governed write',
    content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'
  }, gateResult);

  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const envelope = delegated.governed_bridge;
  const serialized = JSON.stringify({ delegated, result });

  assert.equal(envelope.client_id, null);
  assert.equal(envelope.visibility, null);
  assert.equal(envelope.runtime_target.target_kind, null);
  assert.equal(envelope.runtime_target.source_authority, null);
  assert.equal(envelope.invocation_profile, null);
  assert.equal(envelope.write_policy, null);
  assert.equal(envelope.disclosure_level, null);
  assert.equal(envelope.rollback_posture, null);
  assert.equal(result.accepted, false);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_WRITE_ENVELOPE_'), false);
});

test('rejects write delegation when trusted execution context checks did not survive gate', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      trusted_execution_context_supplied: false,
      trusted_execution_context_accepted: false,
      trusted_execution_context_scope_matched: false
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.trusted_execution_context_supplied'
  ));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.trusted_execution_context_accepted'
  ));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.trusted_execution_context_scope_matched'
  ));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('rejects write delegation when exact approval scope, runtime, or rollback binding did not survive gate', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      exact_approval_scope_matched: false,
      exact_approval_runtime_target_matched: false,
      exact_approval_rollback_plan_matched: false
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_scope_matched'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_runtime_target_matched'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_matched'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(calls, 0);
});

test('rejects write delegation when exact approval safe-reference checks did not survive gate', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      exact_approval_scope_references_safe: false,
      exact_approval_scope_visibility_accepted: false,
      exact_approval_runtime_target_reference_safe: false,
      exact_approval_runtime_target_kind_accepted: false,
      exact_approval_runtime_target_primary_runtime_accepted: false,
      exact_approval_rollback_plan_reference_present: false,
      exact_approval_rollback_plan_reference_safe: false
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_scope_references_safe'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_scope_visibility_accepted'));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.exact_approval_runtime_target_reference_safe'
  ));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.exact_approval_runtime_target_kind_accepted'
  ));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.exact_approval_runtime_target_primary_runtime_accepted'
  ));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_present'
  ));
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_safe'
  ));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('rejects write delegation when exact approval forbidden field evidence survived gate', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {},
    gateResult: acceptedGate({
      exact_approval_forbidden_field_count: 2
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_forbidden_field_count'));
  assert.equal(result.lowDisclosureProjection.exactApprovalForbiddenFieldCount, 2);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_ECHO'), false);
});

test('rejects write delegation when gate mcp tool name does not match actual tool', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'tombstone_memory',
    args: {},
    gateResult: acceptedGate(),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.mcp_tool_name'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('rejects write delegation when exact approval action does not match actual tool', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'tombstone_memory',
    args: {},
    gateResult: acceptedGate({
      mcp_tool_name: 'tombstone_memory',
      exact_approval_action: 'live_bridge_record_memory_proof',
      exact_approval_action_matched: true
    }),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.exact_approval_action'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(calls, 0);
});

test('native write transport failure is low-disclosure and not locally fallback eligible', async () => {
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'tombstone_memory',
    args: {
      memory_id: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO',
      reason: 'duplicate',
      evidence: 'reviewed',
      tombstone_reason: 'duplicate',
      actor_client_id: 'codex',
      request_source: 'test',
      dry_run: false,
      confirm: true
    },
    gateResult: acceptedGate({
      mcp_tool_name: 'tombstone_memory',
      exact_approval_action: 'live_bridge_tombstone_memory_proof'
    }),
    callMcpTool: receiptAwareCallMcpTool(async () => {
      const error = new Error('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
      error.statusClass = 'transport_error';
      throw error;
    })
  });
  const serializedResult = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_transport_error');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.vcpToolBoxCalled, true);
  assert.equal(result.mcpToolCalled, true);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(result.receipt.statusClass, 'transport_error');
  assert.equal(result.receipt.nativeInvocationAttempted, true);
  assert.equal(result.receipt.nativeMcpToolInvocationAttempted, true);
  assert.equal(result.receipt.rollbackRequired, false);
  assert.equal(result.receipt.rollbackPlanBound, true);
  assert.equal(result.receipt.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(result.receipt.rollbackFollowupRequired, false);
  assert.equal(result.receipt.rollbackApplyPolicy, 'not_applicable');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(serializedResult.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
});

test('rejects native tombstone and supersede without explicit confirm and dry_run=false', async () => {
  const cases = [
    {
      toolName: 'tombstone_memory',
      args: {
        memory_id: 'RAW_TOMBSTONE_MEMORY_ID_SHOULD_NOT_ECHO',
        reason: 'duplicate',
        tombstone_reason: 'duplicate',
        evidence: 'reviewed',
        actor_client_id: 'codex',
        request_source: 'test'
      },
      expectedInvalidFields: ['args.dry_run', 'args.confirm']
    },
    {
      toolName: 'tombstone_memory',
      args: {
        memory_id: 'RAW_TOMBSTONE_MEMORY_ID_SHOULD_NOT_ECHO',
        reason: 'duplicate',
        tombstone_reason: 'duplicate',
        evidence: 'reviewed',
        actor_client_id: 'codex',
        request_source: 'test',
        dry_run: false
      },
      expectedInvalidFields: ['args.confirm']
    },
    {
      toolName: 'supersede_memory',
      args: {
        old_memory_id: 'RAW_OLD_MEMORY_ID_SHOULD_NOT_ECHO',
        new_memory_id: 'RAW_NEW_MEMORY_ID_SHOULD_NOT_ECHO',
        reason: 'newer evidence',
        evidence: 'reviewed',
        supersedes_link: 'raw-old-memory-link',
        superseded_by_link: 'raw-new-memory-link',
        actor_client_id: 'codex',
        request_source: 'test'
      },
      expectedInvalidFields: ['args.dry_run', 'args.confirm']
    },
    {
      toolName: 'supersede_memory',
      args: {
        old_memory_id: 'RAW_OLD_MEMORY_ID_SHOULD_NOT_ECHO',
        new_memory_id: 'RAW_NEW_MEMORY_ID_SHOULD_NOT_ECHO',
        reason: 'newer evidence',
        evidence: 'reviewed',
        supersedes_link: 'raw-old-memory-link',
        superseded_by_link: 'raw-new-memory-link',
        actor_client_id: 'codex',
        request_source: 'test',
        confirm: true
      },
      expectedInvalidFields: ['args.dry_run']
    }
  ];

  for (const testCase of cases) {
    let calls = 0;
    const result = await executeGovernedMcpVcpNativeWriteDelegation({
      toolName: testCase.toolName,
      args: testCase.args,
      gateResult: acceptedGateForTool(testCase.toolName),
      callMcpTool: receiptAwareCallMcpTool(async () => {
        calls += 1;
        return { status: 'native_should_not_be_called' };
      })
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.accepted, false, testCase.toolName);
    assert.equal(result.reasonCode, 'invalid_governed_native_write_delegation_boundary');
    for (const field of testCase.expectedInvalidFields) {
      assert.ok(result.invalidFields.includes(field), `${testCase.toolName} missing ${field}`);
    }
    assert.equal(result.runtimeCalled, false);
    assert.equal(result.vcpToolBoxCalled, false);
    assert.equal(result.mcpToolCalled, false);
    assert.equal(result.memoryWritePerformed, false);
    assert.equal(result.localMemoryFallbackEligible, false);
    assert.equal(calls, 0);
    assert.equal(serialized.includes('RAW_TOMBSTONE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('RAW_OLD_MEMORY_ID_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('RAW_NEW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  }
});

test('delegates bounded tombstone_memory write with tool-bound exact approval action', async () => {
  let call = null;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'tombstone_memory',
    args: {
      memory_id: 'RAW_TOMBSTONE_MEMORY_ID_SHOULD_NOT_ECHO',
      reason: 'duplicate',
      tombstone_reason: 'duplicate',
      evidence: 'reviewed',
      actor_client_id: 'codex',
      request_source: 'test',
      dry_run: false,
      confirm: true,
      endpoint: 'http://PRIVATE_TOMBSTONE_ENDPOINT_SHOULD_NOT_FORWARD'
    },
    gateResult: acceptedGateForTool('tombstone_memory'),
    callMcpTool: receiptAwareCallMcpTool(async payload => {
      call = payload;
      return {
        status: 'ok',
        memory_id: 'RAW_NATIVE_TOMBSTONE_ID_SHOULD_NOT_ECHO'
      };
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(call.toolName, 'tombstone_memory');
  assert.equal(call.arguments.endpoint, undefined);
  assert.equal(call.arguments.dry_run, false);
  assert.equal(call.arguments.confirm, true);
  assert.equal(
    call.arguments.governed_bridge.exact_approval_action,
    'live_bridge_tombstone_memory_proof'
  );
  assert.equal(call.arguments.governed_bridge.exact_approval_action_matched, true);
  assert.equal(result.receipt.exactApprovalAction, 'live_bridge_tombstone_memory_proof');
  assert.equal(result.receipt.toolName, 'tombstone_memory');
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(serialized.includes('RAW_TOMBSTONE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NATIVE_TOMBSTONE_ID_SHOULD_NOT_ECHO'), false);
});

test('delegates bounded supersede_memory write with tool-bound exact approval action', async () => {
  let call = null;
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'supersede_memory',
    args: {
      old_memory_id: 'RAW_OLD_MEMORY_ID_SHOULD_NOT_ECHO',
      new_memory_id: 'RAW_NEW_MEMORY_ID_SHOULD_NOT_ECHO',
      reason: 'newer evidence',
      evidence: 'reviewed',
      supersedes_link: 'raw-old-memory-link',
      superseded_by_link: 'raw-new-memory-link',
      actor_client_id: 'codex',
      request_source: 'test',
      dry_run: false,
      confirm: true,
      token: 'PRIVATE_SUPERSEDE_TOKEN_SHOULD_NOT_FORWARD'
    },
    gateResult: acceptedGateForTool('supersede_memory'),
    callMcpTool: receiptAwareCallMcpTool(async payload => {
      call = payload;
      return {
        status: 'ok',
        superseded_id: 'RAW_NATIVE_SUPERSEDE_ID_SHOULD_NOT_ECHO'
      };
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(call.toolName, 'supersede_memory');
  assert.equal(call.arguments.token, undefined);
  assert.equal(call.arguments.dry_run, false);
  assert.equal(call.arguments.confirm, true);
  assert.equal(
    call.arguments.governed_bridge.exact_approval_action,
    'live_bridge_supersede_memory_proof'
  );
  assert.equal(call.arguments.governed_bridge.exact_approval_action_matched, true);
  assert.equal(result.receipt.exactApprovalAction, 'live_bridge_supersede_memory_proof');
  assert.equal(result.receipt.toolName, 'supersede_memory');
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(serialized.includes('RAW_OLD_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NEW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NATIVE_SUPERSEDE_ID_SHOULD_NOT_ECHO'), false);
});

test('native write error statusClass is whitelisted before reasonCode projection', async () => {
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write failure',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool: receiptAwareCallMcpTool(async () => {
      const error = new Error('PRIVATE_NATIVE_WRITE_ERROR_MESSAGE_SHOULD_NOT_ECHO');
      error.statusClass = 'https://PRIVATE_WRITE_ERROR_STATUS_SHOULD_NOT_ECHO';
      throw error;
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_transport_error');
  assert.equal(result.receipt.statusClass, 'transport_error');
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(result.receipt.rollbackRequired, false);
  assert.equal(serialized.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WRITE_ERROR_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_WRITE_ERROR_MESSAGE_SHOULD_NOT_ECHO'), false);
});

test('native write failure receipt tool and target must match actual delegation', async () => {
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write failure',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool: receiptAwareCallMcpTool(async () => {
      const error = new Error('PRIVATE_NATIVE_WRITE_FAILURE_SHOULD_NOT_ECHO');
      error.statusClass = 'server_error';
      error.lowDisclosureReceipt = {
        targetReferenceName: 'other-safe-native-target-ref',
        targetKind: 'mcp_server',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        toolName: 'tombstone_memory',
        requestIdCategory: 'generated_bridge_request_id',
        jsonRpcResponseIdMatched: true,
        statusClass: 'success',
        httpStatusClass: 'success',
        responseShapeCategory: 'object_top_level_kind_only_no_field_names',
        topLevelKindCategory: 'object',
        endpoint: 'https://PRIVATE_NATIVE_WRITE_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO',
        token: 'PRIVATE_NATIVE_WRITE_RECEIPT_TOKEN_SHOULD_NOT_ECHO'
      };
      throw error;
    })
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_server_error');
  assert.equal(result.receipt.statusClass, 'server_error');
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.receipt.rollbackRequired, false);
  assert.equal(receipt.invocationBindingMatched, false);
  assert.equal(receipt.targetReferenceName, null);
  assert.equal(receipt.toolName, null);
  assert.equal(receipt.targetKind, null);
  assert.equal(receipt.transportCategory, null);
  assert.equal(receipt.mcpMethod, null);
  assert.equal(receipt.requestIdCategory, null);
  assert.equal(receipt.jsonRpcResponseIdMatched, false);
  assert.equal(receipt.statusClass, null);
  assert.equal(receipt.httpStatusClass, null);
  assert.equal(receipt.responseShapeCategory, null);
  assert.equal(receipt.topLevelKindCategory, null);
  assert.equal(serialized.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_WRITE_FAILURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_WRITE_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_WRITE_RECEIPT_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('native write invocation receipt buckets are whitelisted before returning to Codex', async () => {
  const callMcpTool = async () => {
    throw new Error('fallback call path should not run');
  };
  callMcpTool.callWithReceipt = async () => ({
    value: {
      status: 'ok'
    },
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'https://PRIVATE_TRANSPORT_SHOULD_NOT_ECHO',
      mcpMethod: 'https://PRIVATE_METHOD_SHOULD_NOT_ECHO',
      toolName: 'https://PRIVATE_NATIVE_TOOL_SHOULD_NOT_ECHO',
      requestIdCategory: 'https://PRIVATE_REQUEST_ID_SHOULD_NOT_ECHO',
      jsonRpcResponseIdMatched: 'https://PRIVATE_RESPONSE_ID_MATCH_SHOULD_NOT_ECHO',
      governanceMetadataPath: 'params._meta.codexMemoryGovernance',
      governanceMetadataSent: true,
      governanceMetadataRawValueDisclosed: false,
      statusClass: 'https://PRIVATE_STATUS_SHOULD_NOT_ECHO',
      httpStatusClass: 'https://PRIVATE_HTTP_STATUS_SHOULD_NOT_ECHO',
      jsonRpcErrorReasonCode: 'https://PRIVATE_JSONRPC_REASON_SHOULD_NOT_ECHO',
      responseShapeCategory: 'https://PRIVATE_SHAPE_SHOULD_NOT_ECHO',
      topLevelKindCategory: 'https://PRIVATE_KIND_SHOULD_NOT_ECHO'
    }
  });
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(result.receipt.rollbackRequired, true);
  assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
  assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
  assert.equal(result.receipt.rollbackFollowupRequired, true);
  assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(receipt.invocationBindingMatched, false);
  assert.equal(receipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(receipt.targetKind, null);
  assert.equal(receipt.transportCategory, null);
  assert.equal(receipt.mcpMethod, null);
  assert.equal(receipt.toolName, null);
  assert.equal(receipt.requestIdCategory, null);
  assert.equal(receipt.jsonRpcResponseIdMatched, false);
  assert.equal(receipt.governanceMetadataSent, true);
  assert.equal(receipt.governanceMetadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(receipt.governanceMetadataRawValueDisclosed, false);
  assert.equal(receipt.statusClass, null);
  assert.equal(receipt.httpStatusClass, null);
  assert.equal(receipt.jsonRpcErrorReasonCode, null);
  assert.equal(receipt.responseShapeCategory, null);
  assert.equal(receipt.topLevelKindCategory, null);
  const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(result.receipt);
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(serialized.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TRANSPORT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_METHOD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_TOOL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_REQUEST_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_ID_MATCH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_HTTP_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_JSONRPC_REASON_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SHAPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_SHOULD_NOT_ECHO'), false);
});

test('native write invocation receipt tool and target must match actual delegation', async () => {
  const callMcpTool = async () => {
    throw new Error('fallback call path should not run');
  };
  callMcpTool.callWithReceipt = async () => ({
    value: {
      status: 'ok'
    },
    receipt: {
      targetReferenceName: 'other-safe-native-target-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'tombstone_memory',
      requestIdCategory: 'generated_bridge_request_id',
      governanceMetadataPath: 'params._meta.codexMemoryGovernance',
      governanceMetadataSent: true,
      governanceMetadataRawValueDisclosed: false,
      statusClass: 'success',
      httpStatusClass: 'success',
      responseShapeCategory: 'object_top_level_kind_only_no_field_names',
      topLevelKindCategory: 'object'
    }
  });
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate(),
    callMcpTool
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(result.receipt.rollbackRequired, true);
  assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
  assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
  assert.equal(result.receipt.rollbackFollowupRequired, true);
  assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(receipt.invocationBindingMatched, false);
  assert.equal(receipt.targetReferenceName, null);
  assert.equal(receipt.toolName, null);
  assert.equal(receipt.targetKind, null);
  assert.equal(receipt.transportCategory, null);
  assert.equal(receipt.mcpMethod, null);
  assert.equal(receipt.requestIdCategory, null);
  assert.equal(receipt.jsonRpcResponseIdMatched, false);
  assert.equal(receipt.governanceMetadataSent, true);
  assert.equal(receipt.governanceMetadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(receipt.governanceMetadataRawValueDisclosed, false);
  assert.equal(receipt.statusClass, null);
  assert.equal(receipt.httpStatusClass, null);
  assert.equal(receipt.jsonRpcErrorPresent, false);
  assert.equal(receipt.responseShapeCategory, null);
  assert.equal(receipt.topLevelKindCategory, null);
  assert.equal(serialized.includes('other-safe-native-target-ref'), false);
  assert.equal(serialized.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('native write invocation receipt must bind JSON-RPC response and success status', async () => {
  const cases = [
    {
      name: 'response id mismatch',
      receiptOverrides: {
        jsonRpcResponseIdMatched: false
      },
      expected: {
        jsonRpcResponseIdMatched: false,
        statusClass: 'success',
        httpStatusClass: 'success'
      }
    },
    {
      name: 'native status not success',
      receiptOverrides: {
        statusClass: 'server_error',
        httpStatusClass: 'server_error',
        jsonRpcErrorPresent: true,
        jsonRpcErrorReasonCode: 'native_runtime_call_failed'
      },
      expected: {
        jsonRpcResponseIdMatched: true,
        statusClass: 'server_error',
        httpStatusClass: 'server_error',
        jsonRpcErrorReasonCode: 'native_runtime_call_failed'
      }
    }
  ];

  for (const testCase of cases) {
    const result = await executeGovernedMcpVcpNativeWriteDelegation({
      toolName: 'record_memory',
      args: {
        target: 'knowledge',
        title: 'Governed write proof',
        content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
        evidence: 'operator approved',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      },
      gateResult: acceptedGate(),
      callMcpTool: receiptAwareCallMcpTool(async () => ({
        status: 'ok',
        content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
      }), testCase.receiptOverrides)
    });
    const serialized = JSON.stringify(result);
    const receipt = result.receipt.nativeInvocationReceipt;
    const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(result.receipt);

    assert.equal(result.accepted, false, testCase.name);
    assert.equal(result.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound', testCase.name);
    assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound', testCase.name);
    assert.equal(result.runtimeCalled, true, testCase.name);
    assert.equal(result.memoryWritePerformed, true, testCase.name);
    assert.equal(result.receipt.rollbackRequired, true, testCase.name);
    assert.equal(
      result.receipt.rollbackReasonCode,
      'write_post_commit_native_invocation_receipt_unbound',
      testCase.name
    );
    assert.equal(result.receipt.rollbackFollowupRequired, true, testCase.name);
    assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required', testCase.name);
    assert.equal(result.receipt.rollbackApplyAttempted, false, testCase.name);
    assert.equal(result.receipt.rollbackAutoApplyAllowed, false, testCase.name);
    assert.equal(receipt.invocationBindingMatched, true, testCase.name);
    assert.equal(receipt.targetKind, 'mcp_server', testCase.name);
    assert.equal(receipt.transportCategory, 'local_http_transport', testCase.name);
    assert.equal(receipt.mcpMethod, 'tools/call', testCase.name);
    assert.equal(receipt.requestIdCategory, 'generated_bridge_request_id', testCase.name);
    assert.equal(receipt.jsonRpcResponseIdMatched, testCase.expected.jsonRpcResponseIdMatched, testCase.name);
    assert.equal(receipt.statusClass, testCase.expected.statusClass, testCase.name);
    assert.equal(receipt.httpStatusClass, testCase.expected.httpStatusClass, testCase.name);
    assert.equal(receipt.jsonRpcErrorReasonCode, testCase.expected.jsonRpcErrorReasonCode || null, testCase.name);
    assert.equal(receipt.governanceMetadataSent, true, testCase.name);
    assert.equal(receipt.governanceMetadataPath, 'params._meta.codexMemoryGovernance', testCase.name);
    assert.equal(receipt.governanceMetadataRawValueDisclosed, false, testCase.name);
    assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
    assert.equal(serialized.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false, testCase.name);
    assert.equal(serialized.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false, testCase.name);
  }
});

test('rejects native write responses that exceed the governed output byte budget', async () => {
  const result = await executeGovernedMcpVcpNativeWriteDelegation({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write proof',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'operator approved',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    },
    gateResult: acceptedGate({
      disclosure_max_bytes: 64
    }),
    callMcpTool: receiptAwareCallMcpTool(async () => ({
      memory_id: 'RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO',
      content: 'RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO_'.repeat(8)
    }))
  });
  const serializedResult = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_write_delegation_output_budget_exceeded');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryWritePerformed, true);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(result.receipt.statusClass, 'output_budget_exceeded');
  assert.equal(result.receipt.outputBudgetExceeded, true);
  assert.equal(result.receipt.byteCountBucket, 'over_budget');
  assert.equal(result.receipt.rollbackRequired, true);
  assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_output_budget_exceeded');
  assert.equal(result.receipt.rollbackPlanReferencePresent, true);
  assert.equal(result.receipt.rollbackPlanReferenceSafe, true);
  assert.equal(result.receipt.rollbackPlanReferenceName, 'cm-governed-write-rollback-plan');
  assert.equal(result.receipt.rollbackPlanBound, true);
  assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
  assert.equal(result.receipt.rollbackFollowupRequired, true);
  assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
  assert.equal(result.receipt.rollbackApplyAttempted, false);
  assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(result.rollbackApplied, false);
  assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serializedResult.includes('RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO'), false);
});

test('delegated write arguments preserve write payload but remove locator and token fields', () => {
  const delegated = buildDelegatedArguments('supersede_memory', {
    old_memory_id: 'old-id',
    new_memory_id: 'new-id',
    token: 'SECRET_SHOULD_NOT_FORWARD',
    nested: {
      endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_FORWARD',
      safe: true
    }
  }, acceptedGateForTool('supersede_memory'));

  assert.equal(delegated.old_memory_id, 'old-id');
  assert.equal(delegated.new_memory_id, 'new-id');
  assert.equal(delegated.token, undefined);
  assert.equal(delegated.nested.endpoint, undefined);
  assert.equal(delegated.nested.safe, true);
  assert.equal(delegated.governed_bridge.scope.client_id, 'Codex');
  assert.equal(
    delegated.governed_bridge.runtime_target.target_reference_name,
    'operator-vcp-toolbox-service-ref'
  );
  assert.equal(delegated.governed_bridge.runtime_target.endpoint_included, false);
  assert.equal(delegated.governed_bridge.runtime_target.token_material_included, false);
  assert.equal(delegated.governed_bridge.read_allowed, false);
  assert.equal(delegated.governed_bridge.write_allowed, true);
  assert.equal(delegated.governed_bridge.write_policy, 'exact_approval');
  assert.equal(delegated.governed_bridge.exact_approval_action, 'live_bridge_supersede_memory_proof');
  assert.equal(delegated.governed_bridge.exact_approval_scope_matched, true);
  assert.equal(delegated.governed_bridge.exact_approval_runtime_target_matched, true);
  assert.equal(delegated.governed_bridge.exact_approval_rollback_plan_matched, true);
  assert.equal(delegated.governed_bridge.exact_approval_forbidden_field_count, 0);
  assert.equal(delegated.governed_bridge.disclosure_level, 'receipt_only');
  assert.equal(delegated.governed_bridge.disclosure_max_items, 3);
  assert.equal(delegated.governed_bridge.disclosure_max_bytes, 1024);
  assert.equal(delegated.governed_bridge.rollback_plan_reference_name, 'cm-governed-write-rollback-plan');
  assert.equal(delegated.governed_bridge.audit_receipt_reference_name, 'cm-governed-write-receipt');
});

test('delegated write envelope drops target reference when runtime forbidden evidence survived gate', () => {
  const gate = acceptedGateForTool('record_memory');
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_path =
    'runtimeTarget.endpointUrl.PRIVATE_ENDPOINT_SHOULD_NOT_ECHO';

  const delegated = buildDelegatedArguments('record_memory', {
    target: 'knowledge',
    title: 'safe title',
    content: 'safe content',
    evidence: 'safe evidence',
    validated: true
  }, gate);
  const serialized = JSON.stringify(delegated);

  assert.equal(delegated.governed_bridge.runtime_target.target_reference_name, null);
  assert.equal(delegated.governed_bridge.runtime_target.forbidden_field_count, null);
  assert.equal(delegated.governed_bridge.runtime_target.endpoint_included, false);
  assert.equal(delegated.governed_bridge.runtime_target.token_material_included, false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
});

test('delegated write arguments do not carry exact approval action across tools', () => {
  const delegated = buildDelegatedArguments('supersede_memory', {
    old_memory_id: 'old-id',
    new_memory_id: 'new-id'
  }, acceptedGate());

  assert.equal(delegated.governed_bridge.exact_approval_action, null);
  assert.equal(delegated.governed_bridge.write_policy, 'exact_approval');
  assert.equal(delegated.governed_bridge.exact_approval_scope_matched, true);
  assert.equal(delegated.governed_bridge.exact_approval_runtime_target_matched, true);
  assert.equal(delegated.governed_bridge.exact_approval_rollback_plan_matched, true);
  assert.equal(delegated.governed_bridge.exact_approval_forbidden_field_count, 0);
});

test('delegated write arguments remove case and separator variants of secret locator fields', () => {
  const delegated = buildDelegatedArguments('record_memory', {
    target: 'knowledge',
    title: 'safe title',
    content: 'safe content',
    evidence: 'safe evidence',
    apiKey: 'API_KEY_SHOULD_NOT_FORWARD',
    base_url: 'http://BASE_URL_SHOULD_NOT_FORWARD',
    Authorization: 'Bearer TOKEN_SHOULD_NOT_FORWARD',
    runtimeTarget: 'runtime-target-should-not-forward',
    runtimeTargetReference: 'RUNTIME_TARGET_REF_SHOULD_NOT_FORWARD',
    endpointUrl: 'http://ENDPOINT_URL_SHOULD_NOT_FORWARD',
    fileSystemPath: '/FILESYSTEM_PATH_SHOULD_NOT_FORWARD',
    rawResponseBody: 'RAW_RESPONSE_BODY_SHOULD_NOT_FORWARD',
    nested: {
      provider_api_key: 'PROVIDER_KEY_SHOULD_NOT_FORWARD',
      privateKey: 'PRIVATE_KEY_SHOULD_NOT_FORWARD',
      credentialValue: 'CREDENTIAL_VALUE_SHOULD_NOT_FORWARD',
      secretValue: 'SECRET_VALUE_SHOULD_NOT_FORWARD',
      authToken: 'AUTH_TOKEN_SHOULD_NOT_FORWARD',
      credentials: {
        token: 'NESTED_TOKEN_SHOULD_NOT_FORWARD'
      },
      safeFlag: true
    },
    arrayPayload: [
      {
        refreshToken: 'REFRESH_TOKEN_SHOULD_NOT_FORWARD',
        locatorValue: 'LOCATOR_SHOULD_NOT_FORWARD',
        safeItem: 'kept'
      }
    ]
  }, acceptedGate());

  const serialized = JSON.stringify(delegated);

  assert.equal(delegated.title, 'safe title');
  assert.equal(delegated.content, 'safe content');
  assert.equal(delegated.apiKey, undefined);
  assert.equal(delegated.base_url, undefined);
  assert.equal(delegated.Authorization, undefined);
  assert.equal(delegated.runtimeTarget, undefined);
  assert.equal(delegated.runtimeTargetReference, undefined);
  assert.equal(delegated.endpointUrl, undefined);
  assert.equal(delegated.fileSystemPath, undefined);
  assert.equal(delegated.rawResponseBody, undefined);
  assert.equal(delegated.nested.provider_api_key, undefined);
  assert.equal(delegated.nested.privateKey, undefined);
  assert.equal(delegated.nested.credentialValue, undefined);
  assert.equal(delegated.nested.secretValue, undefined);
  assert.equal(delegated.nested.authToken, undefined);
  assert.equal(delegated.nested.credentials, undefined);
  assert.equal(delegated.nested.safeFlag, true);
  assert.equal(delegated.arrayPayload[0].refreshToken, undefined);
  assert.equal(delegated.arrayPayload[0].locatorValue, undefined);
  assert.equal(delegated.arrayPayload[0].safeItem, 'kept');
  assert.equal(serialized.includes('SHOULD_NOT_FORWARD'), false);
  assert.equal(delegated.governed_bridge.runtime_target.endpoint_included, false);
  assert.equal(delegated.governed_bridge.runtime_target.token_material_included, false);
});
