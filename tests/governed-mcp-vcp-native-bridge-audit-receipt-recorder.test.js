'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EVENT_TYPE,
  READ_FALLBACK_EVENT_TYPE,
  attachBridgeAuditReceiptStatus,
  buildLowDisclosureReadFallbackAuditEntry,
  buildLowDisclosureReceiptAuditEntry,
  recordGovernedMcpVcpNativeBridgeAuditReceipt,
  recordGovernedMcpVcpNativeReadFallbackAuditReceipt
} = require('../src/core/GovernedMcpVcpNativeBridgeAuditReceiptRecorder');
const {
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal,
  validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole
} = require('../src/core/CurrentProductGoalContract');

function acceptedGate() {
  return {
    accepted: true,
    normalizedBridgeRequest: {
      client_id: 'Codex',
      visibility: 'private',
      scope: {
        project_id: 'codex-memory',
        scope_id: 'scope-alpha',
        workspace_id: 'workspace-alpha',
        client_id: 'Codex',
        visibility: 'private'
      },
      trusted_execution_context_supplied: true,
      trusted_execution_context_accepted: true,
      trusted_execution_context_scope_matched: true,
      runtime_target: 'VCPToolBox native memory',
      runtime_target_reference_name: 'operator-vcp-toolbox-service-ref',
      runtime_target_kind: 'mcp_server',
      runtime_target_source_authority: 'bridge_runtime_or_static_config',
      runtime_target_configured: true,
      runtime_target_forbidden_field_count: 0,
      access_path: 'governed MCP tools',
      invocation_profile: 'governed_bounded_write',
      mcp_tool_name: 'record_memory',
      transport: 'mcp',
      invocation_profile_forbidden_field_count: 0,
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
      disclosure_level: 'summary',
      disclosure_max_items: 5,
      disclosure_max_bytes: 4096,
      disclosure_forbidden_field_count: 0,
      raw_output_allowed: false,
      audit_receipt_required: true,
      audit_receipt_low_disclosure: true,
      audit_receipt_reference_present: true,
      audit_receipt_reference_safe: true,
      audit_receipt_reference_name: 'cm-governed-write-receipt',
      audit_receipt_forbidden_field_count: 0,
      rollback_posture: 'bounded_rollback_plan',
      rollback_plan_reference_present: true,
      rollback_plan_reference_safe: true,
      rollback_plan_reference_name: 'cm-governed-write-rollback-plan',
      rollback_posture_forbidden_field_count: 0
    }
  };
}

function validWriteDelegationResult() {
  const receipt = {
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    toolName: 'record_memory',
    primaryRuntime: 'VCPToolBox native memory',
    statusClass: 'success',
    nativeInvocationAttempted: true,
    nativeMcpToolInvocationAttempted: true,
    responseShapeCategory: 'object_top_level_kind_only_no_field_names',
    rollbackRequired: false,
    rollbackReasonCode: null,
    rollbackPlanBound: true,
    rollbackDisposition: 'no_rollback_required',
    rollbackFollowupRequired: false,
    rollbackApplyPolicy: 'not_applicable',
    rollbackApplyAttempted: false,
    rollbackAutoApplyAllowed: false,
    nativeInvocationReceipt: {
      invocationBindingMatched: true,
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'record_memory',
      requestIdCategory: 'generated_bridge_request_id',
      jsonRpcResponseIdMatched: true,
      governanceMetadataPath: 'params._meta.codexMemoryGovernance',
      governanceMetadataSent: true,
      governanceMetadataRawValueDisclosed: false,
      statusClass: 'success',
      httpStatusClass: 'success',
      jsonRpcErrorReasonCode: 'https://PRIVATE_JSONRPC_REASON_SHOULD_NOT_ECHO',
      responseShapeCategory: 'object_top_level_kind_only_no_field_names',
      topLevelKindCategory: 'object',
      rawResponseBodyDisclosed: false,
      endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      token: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
    },
    nativePrivateFieldName: 'RAW_NATIVE_FIELD_SHOULD_NOT_ECHO',
    content: 'RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'
  };

  return {
    accepted: true,
    contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
    contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
    runtimeCalled: true,
    vcpToolBoxCalled: true,
    mcpToolCalled: true,
    memoryWritePerformed: true,
    receipt,
    delegatedResult: {
      receipt: {
        ...receipt,
        nativeInvocationReceipt: { ...receipt.nativeInvocationReceipt }
      }
    }
  };
}

function validReadFallbackContext() {
  return {
    used: true,
    reasonCode: 'native_read_delegation_transport_error',
    localMemoryRole: 'fallback',
    localMemorySourceRuntime: 'codex_memory_local_fallback',
    clientId: 'Codex',
    visibility: 'private',
    scopePresent: true,
    scopeIdentifierPresent: true,
    scopeFieldNames: ['workspace_id', 'client_id', 'visibility', 'scope_id', 'project_id'],
    scopeIdentifierFieldNames: ['workspace_id', 'scope_id', 'project_id'],
    scopeFingerprint: 'd'.repeat(64),
    rawScopePersisted: false,
    fallbackRequiresAuditReceipt: true,
    fallbackAfterAuditReceiptAppended: true,
    auditReceiptStatus: 'appended',
    nativeRuntimeCalled: true,
    nativeMcpToolCalled: true,
    nativeInvocationAttempted: true,
    nativeMcpToolInvocationAttempted: true,
    nativeMemoryReadPerformed: false,
    nativeStatusClass: 'transport_error',
    nativeResponseShapeCategory: 'not_consumed',
    rawNativeOutputReturned: false,
    privateFallbackContent: 'RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO',
    privateScopeIdentifier: 'RAW_SCOPE_IDENTIFIER_SHOULD_NOT_ECHO'
  };
}

test('builds low-disclosure bridge receipt audit event without native payload fields', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: validWriteDelegationResult()
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.eventType, EVENT_TYPE);
  assert.equal(entry.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(entry.delegationDirection, 'write');
  assert.equal(entry.accessPath, 'governed MCP tools');
  assert.equal(entry.gateMcpToolName, 'record_memory');
  assert.equal(entry.toolNameMatchesGate, true);
  assert.equal(entry.clientId, 'Codex');
  assert.equal(entry.visibility, 'private');
  assert.equal(entry.scopePresent, true);
  assert.equal(entry.scopeIdentifierPresent, true);
  assert.deepEqual(entry.scopeFieldNames, ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id']);
  assert.deepEqual(entry.scopeIdentifierFieldNames, ['project_id', 'scope_id', 'workspace_id']);
  assert.match(entry.scopeFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(entry.rawScopePersisted, false);
  assert.equal(entry.rawScopeValueReturned, false);
  assert.equal(entry.clientIdentitySource, 'trusted_execution_context_or_transport');
  assert.equal(entry.clientIdentityBound, true);
  assert.equal(entry.clientIdentityToolArgumentsMayOverride, false);
  assert.equal(entry.clientIdentityGovernanceMetadataMayOverride, false);
  assert.equal(entry.scopeBoundarySource, 'trusted_execution_context_or_transport');
  assert.equal(entry.scopeBoundaryBound, true);
  assert.equal(entry.scopeToolArgumentsMayOverride, false);
  assert.equal(entry.scopeGovernanceMetadataMayOverride, false);
  assert.equal(entry.visibilityBound, true);
  assert.equal(entry.localMemoryRole, 'not_used');
  assert.equal(entry.localMemorySourceRuntime, null);
  assert.equal(entry.localMemoryPrimaryRuntime, false);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.localMemoryResultReturned, false);
  assert.equal(entry.localMemoryResultCanBeMistakenForVcpNative, false);
  assert.equal(entry.localMemoryRawContentDisclosed, false);
  assert.equal(entry.trustedExecutionContextSupplied, true);
  assert.equal(entry.trustedExecutionContextAccepted, true);
  assert.equal(entry.trustedExecutionContextScopeMatched, true);
  assert.equal(entry.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(entry.runtimeTargetKind, 'mcp_server');
  assert.equal(entry.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
  assert.equal(entry.runtimeTargetConfigured, true);
  assert.equal(entry.runtimeTargetForbiddenFieldCount, 0);
  assert.equal(entry.runtimeTargetBound, true);
  assert.equal(entry.runtimeTargetToolArgumentsMayOverride, false);
  assert.equal(entry.runtimeTargetGovernanceMetadataMayOverride, false);
  assert.equal(entry.invocationProfile, 'governed_bounded_write');
  assert.equal(entry.invocationProfileSource, 'bridge_tool_binding');
  assert.equal(entry.invocationProfileBound, true);
  assert.equal(entry.invocationProfileToolArgumentsMayOverride, false);
  assert.equal(entry.invocationProfileGovernanceMetadataMayOverride, false);
  assert.equal(entry.invocationProfileForbiddenFieldCount, 0);
  assert.equal(entry.readWriteAuthorityForbiddenFieldCount, 0);
  assert.equal(entry.readWriteAuthoritySource, 'bridge_tool_binding');
  assert.equal(entry.readWriteAuthorityBound, true);
  assert.equal(entry.mixedReadWriteAllowed, false);
  assert.equal(entry.unboundedWriteAllowed, false);
  assert.equal(entry.writeRequiresExactApproval, true);
  assert.equal(entry.writePolicy, 'exact_approval');
  assert.equal(entry.exactApprovalAction, 'live_bridge_record_memory_proof');
  assert.equal(entry.exactApprovalActionMatched, true);
  assert.equal(entry.exactApprovalScopeMatched, true);
  assert.equal(entry.exactApprovalRuntimeTargetMatched, true);
  assert.equal(entry.exactApprovalRollbackPlanMatched, true);
  assert.equal(entry.exactApprovalScopeReferencesSafe, true);
  assert.equal(entry.exactApprovalScopeVisibilityAccepted, true);
  assert.equal(entry.exactApprovalRuntimeTargetReferenceSafe, true);
  assert.equal(entry.exactApprovalRuntimeTargetKindAccepted, true);
  assert.equal(entry.exactApprovalRuntimeTargetPrimaryRuntimeAccepted, true);
  assert.equal(entry.exactApprovalRollbackPlanReferencePresent, true);
  assert.equal(entry.exactApprovalRollbackPlanReferenceSafe, true);
  assert.equal(entry.exactApprovalForbiddenFieldCount, 0);
  assert.equal(entry.outputDisclosureBudgetSource, 'bridge_gate_normalized_governance');
  assert.equal(entry.outputDisclosureBudgetBound, true);
  assert.equal(entry.outputDisclosureBudgetToolArgumentsMayOverride, false);
  assert.equal(entry.outputDisclosureBudgetGovernanceMetadataMayOverride, false);
  assert.equal(entry.auditReceiptSource, 'bridge_gate_normalized_governance');
  assert.equal(entry.auditReceiptLowDisclosureBound, true);
  assert.equal(entry.auditReceiptToolArgumentsMayOverride, false);
  assert.equal(entry.auditReceiptGovernanceMetadataMayOverride, false);
  assert.equal(entry.memoryWritePerformed, true);
  assert.equal(entry.rollbackRequired, false);
  assert.equal(entry.rollbackReasonCode, null);
  assert.equal(entry.rollbackPlanReferenceSafe, true);
  assert.equal(entry.rollbackWritePostureBound, true);
  assert.equal(entry.rollbackPostureSource, 'bridge_gate_normalized_governance');
  assert.equal(entry.rollbackPostureToolArgumentsMayOverride, false);
  assert.equal(entry.rollbackPostureGovernanceMetadataMayOverride, false);
  assert.equal(entry.rollbackPlanReferenceName, 'cm-governed-write-rollback-plan');
  assert.equal(entry.rollbackPlanBound, true);
  assert.equal(entry.rollbackPostureBound, true);
  assert.equal(entry.rollbackPlanShapeOnly, true);
  assert.equal(entry.rollbackDisposition, 'no_rollback_required');
  assert.equal(entry.rollbackFollowupRequired, false);
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
  assert.equal(entry.rollbackApplyAttempted, false);
  assert.equal(entry.rollbackAutoApplyAllowed, false);
  assert.equal(entry.rollbackRawPlanDisclosed, false);
  assert.equal(entry.rollbackRawPlanPersisted, false);
  assert.equal(entry.disclosureLevel, 'summary');
  assert.equal(entry.disclosureMaxItems, 5);
  assert.equal(entry.disclosureMaxBytes, 4096);
  assert.equal(entry.disclosureForbiddenFieldCount, 0);
  assert.equal(entry.auditReceiptLowDisclosure, true);
  assert.equal(entry.bridgeReceiptLowDisclosure, true);
  assert.equal(entry.auditReceiptReferenceSafe, true);
  assert.equal(entry.auditReceiptReferenceName, 'cm-governed-write-receipt');
  assert.equal(entry.auditReceiptForbiddenFieldCount, 0);
  assert.equal(entry.rollbackPostureForbiddenFieldCount, 0);
  assert.equal(entry.nativeInvocationAttempted, true);
  assert.equal(entry.nativeMcpToolInvocationAttempted, true);
  assert.equal(entry.nativeInvocationReceiptBindingMatched, true);
  assert.equal(entry.rawRequestBodyPersisted, false);
  assert.equal(entry.rawResponseBodyPersisted, false);
  assert.equal(entry.tokenMaterialDisclosed, false);
  assert.equal(entry.nativeFieldNamesDisclosed, false);
  assert.equal(entry.nativeTransportCategory, 'local_http_transport');
  assert.equal(entry.nativeMcpMethod, 'tools/call');
  assert.equal(entry.nativeToolName, 'record_memory');
  assert.equal(entry.nativeInvocationRequestIdCategory, 'generated_bridge_request_id');
  assert.equal(entry.nativeInvocationJsonRpcResponseIdMatched, true);
  assert.equal(entry.nativeInvocationGovernanceMetadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(entry.nativeInvocationGovernanceMetadataSent, true);
  assert.equal(entry.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
  assert.equal(entry.nativeInvocationStatusClass, 'success');
  assert.equal(entry.nativeInvocationHttpStatusClass, 'success');
  assert.equal(entry.nativeInvocationJsonRpcErrorReasonCode, null);
  assert.equal(entry.nativeInvocationResponseShapeCategory, 'object_top_level_kind_only_no_field_names');
  const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(entry);
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
  assert.equal(serialized.includes('codex-memory'), false);
  assert.equal(serialized.includes('scope-alpha'), false);
  assert.equal(serialized.includes('workspace-alpha'), false);
  assert.equal(serialized.includes('RAW_NATIVE_FIELD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_JSONRPC_REASON_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt coverage rejects forged successful native invocation execution binding', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: validWriteDelegationResult()
  });
  const forged = {
    ...entry,
    nativeInvocationJsonRpcResponseIdMatched: false,
    nativeInvocationStatusClass: 'success',
    nativeInvocationHttpStatusClass: 'success',
    nativeInvocationJsonRpcErrorPresent: false
  };
  const missingStatusBinding = {
    ...entry,
    nativeInvocationJsonRpcResponseIdMatched: true,
    nativeInvocationStatusClass: 'server_error',
    nativeInvocationHttpStatusClass: 'server_error',
    nativeInvocationJsonRpcErrorPresent: true
  };

  const accepted = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(entry);
  const forgedCoverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(forged);
  const missingStatusCoverage =
    validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(missingStatusBinding);

  assert.equal(accepted.accepted, true, accepted.blockers.join(', '));
  assert.equal(forgedCoverage.accepted, false);
  assert.ok(
    forgedCoverage.blockers.includes('native_invocation_json_rpc_response_id_must_match')
  );
  assert.equal(missingStatusCoverage.accepted, false);
  assert.ok(
    missingStatusCoverage.blockers.includes('native_invocation_status_class_must_be_success')
  );
  assert.ok(
    missingStatusCoverage.blockers.includes('native_invocation_http_status_class_must_be_success')
  );
  assert.ok(
    missingStatusCoverage.blockers.includes('native_invocation_json_rpc_error_present_must_equal_false')
  );
});

test('bridge receipt records whitelisted native JSON-RPC error reason codes without raw details', () => {
  const gateResult = acceptedGate();
  Object.assign(gateResult.normalizedBridgeRequest, {
    invocation_profile: 'governed_read_only',
    mcp_tool_name: 'search_memory',
    read_allowed: true,
    write_allowed: false,
    write_policy: null,
    exact_approval_action: null,
    rollback_posture: 'no_runtime_state_to_rollback',
    rollback_plan_reference_present: false,
    rollback_plan_reference_safe: false,
    rollback_plan_reference_name: null
  });

  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'search_memory',
    gateResult,
    readDelegationResult: {
      accepted: false,
      reasonCode: 'native_read_delegation_client_error',
      contractName: 'GovernedMcpVcpNativeReadDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_read_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryReadPerformed: false,
      localMemoryFallbackEligible: true,
      localMemoryFallbackUsed: false,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'client_error',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        nativeInvocationReceipt: {
          invocationBindingMatched: true,
          transportCategory: 'local_http_transport',
          mcpMethod: 'tools/call',
          toolName: 'search_memory',
          requestIdCategory: 'generated_bridge_request_id',
          jsonRpcResponseIdMatched: true,
          governanceMetadataPath: 'params._meta.codexMemoryGovernance',
          governanceMetadataSent: true,
          governanceMetadataRawValueDisclosed: false,
          statusClass: 'client_error',
          httpStatusClass: 'success',
          jsonRpcErrorPresent: true,
          jsonRpcErrorReasonCode: 'native_provider_embedding_failed',
          responseShapeCategory: 'not_consumed',
          topLevelKindCategory: 'not_consumed',
          rawErrorDetail: 'PRIVATE_NATIVE_ERROR_DETAIL_SHOULD_NOT_ECHO'
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.nativeInvocationJsonRpcErrorPresent, true);
  assert.equal(entry.nativeInvocationJsonRpcErrorReasonCode, 'native_provider_embedding_failed');
  assert.equal(entry.nativeInvocationStatusClass, 'client_error');
  assert.equal(entry.nativeInvocationHttpStatusClass, 'success');
  assert.equal(entry.rollbackPostureBound, true);
  assert.equal(entry.rollbackReadPostureBound, true);
  assert.equal(entry.rollbackRequired, false);
  assert.equal(entry.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(entry.rollbackFollowupRequired, false);
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
  assert.equal(entry.rollbackApplyAttempted, false);
  assert.equal(entry.rollbackAutoApplyAllowed, false);
  assert.equal(entry.rollbackRawPlanDisclosed, false);
  assert.equal(entry.rollbackRawPlanPersisted, false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_ERROR_DETAIL_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt coverage rejects write receipt without bounded rollback plan evidence', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: validWriteDelegationResult()
  });
  const forged = {
    ...entry,
    rollbackPlanReferencePresent: false,
    rollbackPlanReferenceSafe: false,
    rollbackPlanBound: false,
    rollbackPlanShapeOnly: false
  };

  const accepted = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(entry);
  const forgedCoverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(forged);

  assert.equal(accepted.accepted, true, accepted.blockers.join(', '));
  assert.equal(forgedCoverage.accepted, false);
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanReferencePresent_must_equal_true'));
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanReferenceSafe_must_equal_true'));
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanBound_must_equal_true'));
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanShapeOnly_must_equal_true'));
});

test('bridge receipt does not echo unsafe forged access path or MCP tool binding', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.access_path = 'http://PRIVATE_ACCESS_PATH_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.mcp_tool_name = 'http://PRIVATE_TOOL_NAME_SHOULD_NOT_ECHO';
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        statusClass: 'not_consumed'
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.accessPath, null);
  assert.equal(entry.gateMcpToolName, null);
  assert.equal(entry.toolNameMatchesGate, false);
  assert.equal(serialized.includes('PRIVATE_ACCESS_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TOOL_NAME_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt records forbidden profile and authority counts without treating them as bound', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_path =
    'invocation_profile.endpoint.PRIVATE_PROFILE_PATH_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_path =
    'read_write_authority.token.SECRET_AUTHORITY_PATH_SHOULD_NOT_ECHO';

  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: true,
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      delegatedResult: {
        receipt: {
          targetReferenceName: 'operator-vcp-toolbox-service-ref',
          toolName: 'record_memory',
          primaryRuntime: 'VCPToolBox native memory',
          statusClass: 'success',
          nativeInvocationAttempted: true,
          nativeMcpToolInvocationAttempted: true
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.invocationProfileForbiddenFieldCount, 2);
  assert.equal(entry.readWriteAuthorityForbiddenFieldCount, 2);
  assert.equal(entry.gateMcpToolName, null);
  assert.equal(entry.toolNameMatchesGate, false);
  assert.equal(entry.invocationProfile, null);
  assert.equal(entry.readAllowed, false);
  assert.equal(entry.writeAllowed, false);
  assert.equal(entry.writePolicy, null);
  assert.equal(entry.delegationAccepted, false);
  assert.equal(entry.runtimeCalled, false);
  assert.equal(entry.memoryWritePerformed, false);
  assert.equal(serialized.includes('PRIVATE_PROFILE_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_AUTHORITY_PATH_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt does not echo unsafe forged enumerated governance fields', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.client_id = 'https://PRIVATE_CLIENT_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.visibility = 'https://PRIVATE_VISIBILITY_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.scope.PRIVATE_SCOPE_FIELD_SHOULD_NOT_ECHO = 'private-scope-value';
  gateResult.normalizedBridgeRequest.runtime_target_kind = 'https://PRIVATE_KIND_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.runtime_target_source_authority =
    'https://PRIVATE_SOURCE_AUTHORITY_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.invocation_profile = 'https://PRIVATE_PROFILE_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.write_policy = 'https://PRIVATE_WRITE_POLICY_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.exact_approval_action = 'https://PRIVATE_ACTION_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.disclosure_level = 'https://PRIVATE_DISCLOSURE_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.rollback_posture = 'https://PRIVATE_ROLLBACK_POSTURE_SHOULD_NOT_ECHO';
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        statusClass: 'not_consumed',
        nativeInvocationReceipt: {
          toolName: 'https://PRIVATE_NATIVE_TOOL_SHOULD_NOT_ECHO'
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.clientId, null);
  assert.equal(entry.visibility, null);
  assert.deepEqual(entry.scopeFieldNames, ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id']);
  assert.equal(entry.runtimeTargetKind, null);
  assert.equal(entry.runtimeTargetSourceAuthority, null);
  assert.equal(entry.invocationProfile, null);
  assert.equal(entry.writePolicy, null);
  assert.equal(entry.exactApprovalAction, null);
  assert.equal(entry.disclosureLevel, null);
  assert.equal(entry.rollbackPosture, null);
  assert.equal(entry.nativeToolName, null);
  assert.equal(serialized.includes('PRIVATE_CLIENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_VISIBILITY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SCOPE_FIELD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SOURCE_AUTHORITY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WRITE_POLICY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ACTION_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DISCLOSURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_POSTURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_TOOL_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt does not persist out-of-range disclosure budget integers', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.disclosure_max_items = 500;
  gateResult.normalizedBridgeRequest.disclosure_max_bytes = 999999;
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        statusClass: 'not_consumed'
      }
    }
  });

  assert.equal(entry.disclosureMaxItems, null);
  assert.equal(entry.disclosureMaxBytes, null);
});

test('bridge receipt does not echo unsafe forged execution bucket fields', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'https://PRIVATE_REASON_SHOULD_NOT_ECHO',
      receipt: {
        statusClass: 'https://PRIVATE_STATUS_SHOULD_NOT_ECHO',
        rollbackReasonCode: 'https://PRIVATE_ROLLBACK_REASON_SHOULD_NOT_ECHO',
        rollbackDisposition: 'https://PRIVATE_ROLLBACK_DISPOSITION_SHOULD_NOT_ECHO',
        rollbackApplyPolicy: 'https://PRIVATE_ROLLBACK_POLICY_SHOULD_NOT_ECHO',
        responseShapeCategory: 'https://PRIVATE_SHAPE_SHOULD_NOT_ECHO',
        topLevelKindCategory: 'https://PRIVATE_KIND_BUCKET_SHOULD_NOT_ECHO',
        itemCountBucket: 'https://PRIVATE_ITEM_BUCKET_SHOULD_NOT_ECHO',
        byteCountBucket: 'https://PRIVATE_BYTE_BUCKET_SHOULD_NOT_ECHO',
        nativeInvocationReceipt: {
          transportCategory: 'https://PRIVATE_TRANSPORT_SHOULD_NOT_ECHO',
          mcpMethod: 'https://PRIVATE_METHOD_SHOULD_NOT_ECHO',
          toolName: 'https://PRIVATE_NATIVE_TOOL_SHOULD_NOT_ECHO',
          statusClass: 'https://PRIVATE_NATIVE_STATUS_SHOULD_NOT_ECHO',
          httpStatusClass: 'https://PRIVATE_HTTP_STATUS_SHOULD_NOT_ECHO',
          responseShapeCategory: 'https://PRIVATE_NATIVE_SHAPE_SHOULD_NOT_ECHO',
          topLevelKindCategory: 'https://PRIVATE_NATIVE_KIND_SHOULD_NOT_ECHO'
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.reasonCode, null);
  assert.equal(entry.statusClass, 'not_available');
  assert.equal(entry.rollbackReasonCode, null);
  assert.equal(entry.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
  assert.equal(entry.responseShapeCategory, null);
  assert.equal(entry.topLevelKindCategory, null);
  assert.equal(entry.itemCountBucket, null);
  assert.equal(entry.byteCountBucket, null);
  assert.equal(entry.nativeTransportCategory, null);
  assert.equal(entry.nativeMcpMethod, null);
  assert.equal(entry.nativeToolName, null);
  assert.equal(entry.nativeInvocationStatusClass, null);
  assert.equal(entry.nativeInvocationHttpStatusClass, null);
  assert.equal(entry.nativeInvocationResponseShapeCategory, null);
  assert.equal(entry.nativeInvocationTopLevelKindCategory, null);
  assert.equal(serialized.includes('PRIVATE_REASON_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_REASON_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_DISPOSITION_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_POLICY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SHAPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_BUCKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ITEM_BUCKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_BYTE_BUCKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TRANSPORT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_METHOD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_TOOL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_HTTP_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_SHAPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_KIND_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt does not convert failed requested low-disclosure evidence into true', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.audit_receipt_low_disclosure = false;
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        statusClass: 'not_consumed'
      }
    }
  });

  assert.equal(entry.auditReceiptLowDisclosure, false);
  assert.equal(entry.bridgeReceiptLowDisclosure, true);
});

test('bridge receipt treats gate request as governance truth over forged delegation receipt', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.runtime_target_reference_name = 'https://PRIVATE_TARGET_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.trusted_execution_context_supplied = false;
  gateResult.normalizedBridgeRequest.trusted_execution_context_accepted = false;
  gateResult.normalizedBridgeRequest.trusted_execution_context_scope_matched = false;
  gateResult.normalizedBridgeRequest.read_allowed = true;
  gateResult.normalizedBridgeRequest.write_allowed = false;
  gateResult.normalizedBridgeRequest.write_policy = null;
  gateResult.normalizedBridgeRequest.exact_approval_action_matched = false;
  gateResult.normalizedBridgeRequest.exact_approval_scope_matched = false;
  gateResult.normalizedBridgeRequest.exact_approval_runtime_target_matched = false;
  gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_matched = false;
  gateResult.normalizedBridgeRequest.exact_approval_scope_references_safe = false;
  gateResult.normalizedBridgeRequest.exact_approval_scope_visibility_accepted = false;
  gateResult.normalizedBridgeRequest.exact_approval_runtime_target_reference_safe = false;
  gateResult.normalizedBridgeRequest.exact_approval_runtime_target_kind_accepted = false;
  gateResult.normalizedBridgeRequest.exact_approval_runtime_target_primary_runtime_accepted = false;
  gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_present = false;
  gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_safe = false;
  gateResult.normalizedBridgeRequest.exact_approval_forbidden_field_count = 3;
  gateResult.normalizedBridgeRequest.exact_approval_forbidden_field_path =
    'runtimeTarget.endpointUrl.PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.audit_receipt_required = false;
  gateResult.normalizedBridgeRequest.audit_receipt_low_disclosure = false;
  gateResult.normalizedBridgeRequest.audit_receipt_reference_present = false;
  gateResult.normalizedBridgeRequest.audit_receipt_reference_safe = false;
  gateResult.normalizedBridgeRequest.audit_receipt_reference_name = 'https://PRIVATE_RECEIPT_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.rollback_plan_reference_present = false;
  gateResult.normalizedBridgeRequest.rollback_plan_reference_safe = false;
  gateResult.normalizedBridgeRequest.rollback_plan_reference_name = 'https://PRIVATE_ROLLBACK_SHOULD_NOT_ECHO';

  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        targetReferenceName: 'forged-safe-target-ref',
        trustedExecutionContextSupplied: true,
        trustedExecutionContextAccepted: true,
        trustedExecutionContextScopeMatched: true,
        readAllowed: false,
        writeAllowed: true,
        writePolicy: 'exact_approval',
        exactApprovalActionMatched: true,
        exactApprovalScopeMatched: true,
        exactApprovalRuntimeTargetMatched: true,
        exactApprovalRollbackPlanMatched: true,
        exactApprovalScopeReferencesSafe: true,
        exactApprovalScopeVisibilityAccepted: true,
        exactApprovalRuntimeTargetReferenceSafe: true,
        exactApprovalRuntimeTargetKindAccepted: true,
        exactApprovalRuntimeTargetPrimaryRuntimeAccepted: true,
        exactApprovalRollbackPlanReferencePresent: true,
        exactApprovalRollbackPlanReferenceSafe: true,
        auditReceiptRequired: true,
        auditReceiptLowDisclosure: true,
        auditReceiptReferencePresent: true,
        rollbackPlanReferencePresent: true,
        rollbackPlanReferenceName: 'forged-safe-rollback-ref'
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.targetReferenceName, null);
  assert.equal(entry.trustedExecutionContextSupplied, false);
  assert.equal(entry.trustedExecutionContextAccepted, false);
  assert.equal(entry.trustedExecutionContextScopeMatched, false);
  assert.equal(entry.readAllowed, true);
  assert.equal(entry.writeAllowed, false);
  assert.equal(entry.writePolicy, null);
  assert.equal(entry.readWriteAuthoritySource, 'bridge_tool_binding');
  assert.equal(entry.readWriteAuthorityBound, true);
  assert.equal(entry.mixedReadWriteAllowed, false);
  assert.equal(entry.unboundedWriteAllowed, false);
  assert.equal(entry.writeRequiresExactApproval, false);
  assert.equal(entry.exactApprovalActionMatched, false);
  assert.equal(entry.exactApprovalScopeMatched, false);
  assert.equal(entry.exactApprovalRuntimeTargetMatched, false);
  assert.equal(entry.exactApprovalRollbackPlanMatched, false);
  assert.equal(entry.exactApprovalScopeReferencesSafe, false);
  assert.equal(entry.exactApprovalScopeVisibilityAccepted, false);
  assert.equal(entry.exactApprovalRuntimeTargetReferenceSafe, false);
  assert.equal(entry.exactApprovalRuntimeTargetKindAccepted, false);
  assert.equal(entry.exactApprovalRuntimeTargetPrimaryRuntimeAccepted, false);
  assert.equal(entry.exactApprovalRollbackPlanReferencePresent, false);
  assert.equal(entry.exactApprovalRollbackPlanReferenceSafe, false);
  assert.equal(entry.exactApprovalForbiddenFieldCount, 3);
  assert.equal(entry.auditReceiptRequired, false);
  assert.equal(entry.auditReceiptLowDisclosure, false);
  assert.equal(entry.auditReceiptReferencePresent, false);
  assert.equal(entry.auditReceiptReferenceSafe, false);
  assert.equal(entry.auditReceiptReferenceName, null);
  assert.equal(entry.rollbackPlanReferencePresent, false);
  assert.equal(entry.rollbackPlanReferenceSafe, false);
  assert.equal(entry.rollbackPlanReferenceName, null);
  assert.equal(serialized.includes('PRIVATE_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RECEIPT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('forged-safe-target-ref'), false);
  assert.equal(serialized.includes('forged-safe-rollback-ref'), false);
});

test('bridge receipt rejects safe-looking runtime and exact approval binding when forbidden counts are nonzero', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.exact_approval_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_path =
    'runtime_target.endpoint.PRIVATE_TARGET_PATH_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.exact_approval_forbidden_field_path =
    'exact_approval_result.token.SECRET_APPROVAL_PATH_SHOULD_NOT_ECHO';

  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: true,
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'success',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        nativeInvocationReceipt: {
          invocationBindingMatched: true,
          transportCategory: 'local_http_transport',
          mcpMethod: 'tools/call',
          toolName: 'record_memory',
          requestIdCategory: 'generated_bridge_request_id',
          jsonRpcResponseIdMatched: true,
          statusClass: 'success',
          httpStatusClass: 'success'
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.runtimeTargetForbiddenFieldCount, 2);
  assert.equal(entry.targetReferenceName, null);
  assert.equal(entry.runtimeTargetKind, null);
  assert.equal(entry.runtimeTargetSourceAuthority, null);
  assert.equal(entry.runtimeTargetConfigured, false);
  assert.equal(entry.exactApprovalForbiddenFieldCount, 2);
  assert.equal(entry.exactApprovalAction, null);
  assert.equal(entry.exactApprovalActionMatched, false);
  assert.equal(entry.exactApprovalScopeMatched, false);
  assert.equal(entry.exactApprovalRuntimeTargetMatched, false);
  assert.equal(entry.exactApprovalRollbackPlanMatched, false);
  assert.equal(entry.exactApprovalScopeReferencesSafe, false);
  assert.equal(entry.exactApprovalScopeVisibilityAccepted, false);
  assert.equal(entry.exactApprovalRuntimeTargetReferenceSafe, false);
  assert.equal(entry.exactApprovalRuntimeTargetKindAccepted, false);
  assert.equal(entry.exactApprovalRuntimeTargetPrimaryRuntimeAccepted, false);
  assert.equal(entry.exactApprovalRollbackPlanReferencePresent, false);
  assert.equal(entry.exactApprovalRollbackPlanReferenceSafe, false);
  assert.equal(entry.delegationContractMatched, true);
  assert.equal(entry.delegationReceiptMatchedActualInvocation, false);
  assert.equal(entry.delegationAccepted, false);
  assert.equal(entry.nativeInvocationAttempted, false);
  assert.equal(entry.nativeMcpToolInvocationAttempted, false);
  assert.equal(entry.runtimeCalled, false);
  assert.equal(entry.vcpToolBoxCalled, false);
  assert.equal(entry.mcpToolCalled, false);
  assert.equal(entry.memoryWritePerformed, false);
  assert.equal(entry.nativeInvocationReceiptBindingMatched, false);
  assert.equal(entry.nativeToolName, null);
  assert.equal(serialized.includes('PRIVATE_TARGET_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_APPROVAL_PATH_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt does not use delegation receipt to fill actual tool binding', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        toolName: 'record_memory',
        statusClass: 'not_consumed'
      }
    }
  });

  assert.equal(entry.toolName, null);
  assert.equal(entry.gateMcpToolName, 'record_memory');
  assert.equal(entry.toolNameMatchesGate, false);
});

test('bridge receipt does not use forged native invocation tool binding', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: true,
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'success',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        nativeInvocationReceipt: {
          invocationBindingMatched: false,
          targetReferenceName: null,
          toolName: 'search_memory',
          statusClass: 'success'
        }
      }
    }
  });

  assert.equal(entry.toolName, 'record_memory');
  assert.equal(entry.gateMcpToolName, 'record_memory');
  assert.equal(entry.toolNameMatchesGate, true);
  assert.equal(entry.nativeInvocationAttempted, true);
  assert.equal(entry.nativeInvocationReceiptBindingMatched, false);
  assert.equal(entry.nativeToolName, null);
});

test('bridge receipt does not let forged delegation execution flags create audit evidence', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: true,
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      localMemoryFallbackEligible: true,
      localMemoryFallbackUsed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'success',
        responseShapeCategory: 'object_top_level_kind_only_no_field_names',
        topLevelKindCategory: 'object',
        itemCountBucket: 'one',
        byteCountBucket: 'bounded',
        outputBudgetExceeded: true,
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        nativeInvocationReceipt: {
          transportCategory: 'local_http_transport',
          mcpMethod: 'tools/call',
          toolName: 'record_memory',
          requestIdCategory: 'generated_bridge_request_id',
          jsonRpcResponseIdMatched: true,
          statusClass: 'success',
          httpStatusClass: 'success',
          responseShapeCategory: 'object_top_level_kind_only_no_field_names',
          topLevelKindCategory: 'object',
          jsonRpcErrorPresent: true
        }
      }
    }
  });

  assert.equal(entry.toolNameMatchesGate, true);
  assert.equal(entry.delegationContractMatched, false);
  assert.equal(entry.delegationReceiptMatchedActualInvocation, true);
  assert.equal(entry.delegationStatusReasonMatched, true);
  assert.equal(entry.delegationAccepted, false);
  assert.equal(entry.runtimeCalled, false);
  assert.equal(entry.vcpToolBoxCalled, false);
  assert.equal(entry.mcpToolCalled, false);
  assert.equal(entry.memoryWritePerformed, false);
  assert.equal(entry.localMemoryFallbackEligible, false);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.responseShapeCategory, null);
  assert.equal(entry.topLevelKindCategory, null);
  assert.equal(entry.itemCountBucket, null);
  assert.equal(entry.byteCountBucket, null);
  assert.equal(entry.outputBudgetExceeded, false);
  assert.equal(entry.nativeInvocationAttempted, false);
  assert.equal(entry.nativeMcpToolInvocationAttempted, false);
  assert.equal(entry.nativeInvocationReceiptBindingMatched, false);
  assert.equal(entry.nativeTransportCategory, null);
  assert.equal(entry.nativeMcpMethod, null);
  assert.equal(entry.nativeToolName, null);
  assert.equal(entry.nativeInvocationRequestIdCategory, null);
  assert.equal(entry.nativeInvocationJsonRpcResponseIdMatched, false);
  assert.equal(entry.nativeInvocationStatusClass, null);
  assert.equal(entry.nativeInvocationHttpStatusClass, null);
  assert.equal(entry.nativeInvocationJsonRpcErrorPresent, false);
  assert.equal(entry.nativeInvocationResponseShapeCategory, null);
  assert.equal(entry.nativeInvocationTopLevelKindCategory, null);
});

test('bridge receipt records native read transport attempts without claiming memory read', () => {
  const gateResult = acceptedGate();
  Object.assign(gateResult.normalizedBridgeRequest, {
    invocation_profile: 'governed_read_only',
    mcp_tool_name: 'search_memory',
    read_allowed: true,
    write_allowed: false,
    write_policy: null,
    exact_approval_action: null,
    rollback_posture: 'no_runtime_state_to_rollback',
    rollback_plan_reference_present: false,
    rollback_plan_reference_safe: false,
    rollback_plan_reference_name: null
  });

  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'search_memory',
    gateResult,
    readDelegationResult: {
      accepted: false,
      reasonCode: 'native_read_delegation_transport_error',
      contractName: 'GovernedMcpVcpNativeReadDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_read_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryReadPerformed: false,
      localMemoryFallbackEligible: true,
      localMemoryFallbackUsed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'transport_error',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true
      }
    }
  });

  assert.equal(entry.delegationDirection, 'read');
  assert.equal(entry.delegationContractMatched, true);
  assert.equal(entry.delegationReceiptMatchedActualInvocation, true);
  assert.equal(entry.delegationStatusReasonMatched, true);
  assert.equal(entry.delegationAccepted, false);
  assert.equal(entry.statusClass, 'transport_error');
  assert.equal(entry.reasonCode, 'native_read_delegation_transport_error');
  assert.equal(entry.nativeInvocationAttempted, true);
  assert.equal(entry.nativeMcpToolInvocationAttempted, true);
  assert.equal(entry.runtimeCalled, true);
  assert.equal(entry.vcpToolBoxCalled, true);
  assert.equal(entry.mcpToolCalled, true);
  assert.equal(entry.memoryReadPerformed, false);
  assert.equal(entry.memoryWritePerformed, false);
  assert.equal(entry.localMemoryFallbackEligible, true);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.localMemoryRole, 'not_used');
  assert.equal(entry.localMemorySourceRuntime, null);
  assert.equal(entry.localMemoryPrimaryRuntime, false);
  assert.equal(entry.localMemoryResultReturned, false);
  assert.equal(entry.localMemoryResultCanBeMistakenForVcpNative, false);
  assert.equal(entry.localMemoryRawContentDisclosed, false);
  assert.equal(entry.rollbackReadPostureBound, true);
  assert.equal(entry.rollbackWritePostureBound, false);
  assert.equal(entry.rollbackPostureBound, true);
  assert.equal(entry.rollbackPlanBound, false);
  assert.equal(entry.rollbackPlanShapeOnly, false);
  assert.equal(entry.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(entry.rollbackRawPlanDisclosed, false);
  assert.equal(entry.rollbackRawPlanPersisted, false);
});

test('bridge receipt coverage rejects read receipt with write rollback plan evidence', () => {
  const gateResult = acceptedGate();
  Object.assign(gateResult.normalizedBridgeRequest, {
    invocation_profile: 'governed_read_only',
    mcp_tool_name: 'search_memory',
    read_allowed: true,
    write_allowed: false,
    write_policy: null,
    exact_approval_action: null,
    rollback_posture: 'no_runtime_state_to_rollback',
    rollback_plan_reference_present: false,
    rollback_plan_reference_safe: false,
    rollback_plan_reference_name: null
  });
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'search_memory',
    gateResult,
    readDelegationResult: {
      accepted: false,
      reasonCode: 'native_read_delegation_transport_error',
      contractName: 'GovernedMcpVcpNativeReadDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_read_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryReadPerformed: false,
      localMemoryFallbackEligible: true,
      localMemoryFallbackUsed: false,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'transport_error',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true
      }
    }
  });
  const accepted = {
    ...entry,
    nativeInvocationGovernanceMetadataPath: 'params._meta.codexMemoryGovernance',
    nativeInvocationGovernanceMetadataSent: true,
    nativeInvocationGovernanceMetadataRawValueDisclosed: false
  };
  const forged = {
    ...accepted,
    rollbackPosture: 'bounded_rollback_plan',
    rollbackPlanReferencePresent: true,
    rollbackPlanBound: true,
    rollbackPlanShapeOnly: true,
    rollbackDisposition: 'rollback_required_not_applied'
  };

  const acceptedCoverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(accepted);
  const forgedCoverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(forged);

  assert.equal(acceptedCoverage.accepted, true, acceptedCoverage.blockers.join(', '));
  assert.equal(forgedCoverage.accepted, false);
  assert.ok(forgedCoverage.blockers.includes('rollbackPosture_must_be_read_only_posture'));
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanReferencePresent_must_equal_false'));
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanBound_must_equal_false'));
  assert.ok(forgedCoverage.blockers.includes('rollbackPlanShapeOnly_must_equal_false'));
  assert.ok(forgedCoverage.blockers.includes('rollbackDisposition_must_equal_no_runtime_write_to_rollback'));
});

test('bridge receipt records native write transport attempts without claiming memory write or rollback need', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'native_write_delegation_transport_error',
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: false,
      localMemoryFallbackEligible: true,
      localMemoryFallbackUsed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'transport_error',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true
      }
    }
  });

  assert.equal(entry.delegationDirection, 'write');
  assert.equal(entry.delegationContractMatched, true);
  assert.equal(entry.delegationReceiptMatchedActualInvocation, true);
  assert.equal(entry.delegationStatusReasonMatched, true);
  assert.equal(entry.delegationAccepted, false);
  assert.equal(entry.statusClass, 'transport_error');
  assert.equal(entry.reasonCode, 'native_write_delegation_transport_error');
  assert.equal(entry.nativeInvocationAttempted, true);
  assert.equal(entry.nativeMcpToolInvocationAttempted, true);
  assert.equal(entry.runtimeCalled, true);
  assert.equal(entry.vcpToolBoxCalled, true);
  assert.equal(entry.mcpToolCalled, true);
  assert.equal(entry.memoryReadPerformed, false);
  assert.equal(entry.memoryWritePerformed, false);
  assert.equal(entry.localMemoryFallbackEligible, false);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.rollbackRequired, false);
  assert.equal(entry.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
});

test('bridge receipt does not let forged rollback receipt create post-commit rollback evidence', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: true,
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'success',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        rollbackRequired: true,
        rollbackReasonCode: 'write_post_commit_output_budget_exceeded',
        rollbackDisposition: 'rollback_required_not_applied',
        rollbackFollowupRequired: true,
        rollbackApplyPolicy: 'manual_governed_followup_required'
      }
    }
  });

  assert.equal(entry.delegationContractMatched, true);
  assert.equal(entry.delegationReceiptMatchedActualInvocation, true);
  assert.equal(entry.delegationAccepted, true);
  assert.equal(entry.memoryWritePerformed, true);
  assert.equal(entry.statusClass, 'success');
  assert.equal(entry.rollbackPlanBound, true);
  assert.equal(entry.rollbackPostureBound, true);
  assert.equal(entry.rollbackPlanShapeOnly, true);
  assert.equal(entry.rollbackRequired, false);
  assert.equal(entry.rollbackReasonCode, null);
  assert.equal(entry.rollbackDisposition, 'no_rollback_required');
  assert.equal(entry.rollbackFollowupRequired, false);
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
  assert.equal(entry.rollbackApplyAttempted, false);
  assert.equal(entry.rollbackAutoApplyAllowed, false);
  assert.equal(entry.rollbackRawPlanDisclosed, false);
  assert.equal(entry.rollbackRawPlanPersisted, false);
});

test('bridge receipt records native invocation receipt binding failure as post-commit rollback evidence', () => {
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'native_write_delegation_native_invocation_receipt_unbound',
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'native_invocation_receipt_unbound',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        rollbackRequired: true,
        rollbackReasonCode: 'write_post_commit_native_invocation_receipt_unbound',
        rollbackDisposition: 'rollback_required_not_applied',
        rollbackFollowupRequired: true,
        rollbackApplyPolicy: 'manual_governed_followup_required',
        rollbackApplyAttempted: false,
        rollbackAutoApplyAllowed: false,
        nativeInvocationReceipt: {
          invocationBindingMatched: false,
          toolName: null,
          targetReferenceName: null,
          statusClass: null,
          rawResponseBodyDisclosed: false,
          endpoint: 'PRIVATE_UNBOUND_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO',
          token: 'PRIVATE_UNBOUND_RECEIPT_TOKEN_SHOULD_NOT_ECHO'
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.delegationContractMatched, true);
  assert.equal(entry.delegationReceiptMatchedActualInvocation, true);
  assert.equal(entry.delegationStatusReasonMatched, true);
  assert.equal(entry.delegationAccepted, false);
  assert.equal(entry.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(entry.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
  assert.equal(entry.memoryWritePerformed, true);
  assert.equal(entry.nativeInvocationReceiptBindingMatched, false);
  assert.equal(entry.rollbackPostureBound, true);
  assert.equal(entry.rollbackPlanShapeOnly, true);
  assert.equal(entry.rollbackRequired, true);
  assert.equal(entry.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
  assert.equal(entry.rollbackDisposition, 'rollback_required_not_applied');
  assert.equal(entry.rollbackFollowupRequired, true);
  assert.equal(entry.rollbackApplyPolicy, 'manual_governed_followup_required');
  assert.equal(entry.rollbackApplyAttempted, false);
  assert.equal(entry.rollbackAutoApplyAllowed, false);
  assert.equal(entry.rollbackRawPlanDisclosed, false);
  assert.equal(entry.rollbackRawPlanPersisted, false);
  assert.equal(serialized.includes('PRIVATE_UNBOUND_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_UNBOUND_RECEIPT_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt requires write rollback posture before post-commit rollback evidence', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.rollback_posture = 'read_only_no_write';
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'native_write_delegation_output_budget_exceeded',
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        statusClass: 'output_budget_exceeded',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        rollbackReasonCode: 'write_post_commit_output_budget_exceeded'
      }
    }
  });

  assert.equal(entry.memoryWritePerformed, true);
  assert.equal(entry.statusClass, 'output_budget_exceeded');
  assert.equal(entry.rollbackPosture, 'read_only_no_write');
  assert.equal(entry.rollbackPlanReferencePresent, true);
  assert.equal(entry.rollbackPlanReferenceSafe, true);
  assert.equal(entry.rollbackWritePostureBound, false);
  assert.equal(entry.rollbackReadPostureBound, false);
  assert.equal(entry.rollbackPostureBound, false);
  assert.equal(entry.rollbackPlanBound, false);
  assert.equal(entry.rollbackRequired, false);
  assert.equal(entry.rollbackReasonCode, null);
  assert.equal(entry.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
});

test('bridge receipt records unsafe reference decisions without echoing unsafe references', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.audit_receipt_reference_safe = false;
  gateResult.normalizedBridgeRequest.audit_receipt_reference_name =
    'https://PRIVATE_AUDIT_RECEIPT_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.rollback_plan_reference_safe = false;
  gateResult.normalizedBridgeRequest.rollback_plan_reference_name =
    'https://PRIVATE_ROLLBACK_PLAN_SHOULD_NOT_ECHO';
  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: false,
      reasonCode: 'invalid_governed_native_write_delegation_boundary',
      receipt: {
        statusClass: 'not_consumed'
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.auditReceiptReferenceSafe, false);
  assert.equal(entry.auditReceiptReferenceName, null);
  assert.equal(entry.rollbackPlanReferenceSafe, false);
  assert.equal(entry.rollbackPlanReferenceName, null);
  assert.equal(serialized.includes('PRIVATE_AUDIT_RECEIPT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_PLAN_SHOULD_NOT_ECHO'), false);
});

test('bridge receipt records forbidden governance counts without treating tainted controls as bound', () => {
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_count = 2;
  gateResult.normalizedBridgeRequest.disclosure_forbidden_field_path =
    'output_disclosure_budget.endpoint.PRIVATE_DISCLOSURE_PATH_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_path =
    'audit_receipt.token.SECRET_AUDIT_PATH_SHOULD_NOT_ECHO';
  gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_path =
    'rollback_posture.url.SECRET_ROLLBACK_PATH_SHOULD_NOT_ECHO';

  const entry = buildLowDisclosureReceiptAuditEntry({
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: {
      accepted: true,
      contractName: 'GovernedMcpVcpNativeWriteDelegationAdapter',
      contractMode: 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation',
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      delegatedResult: {
        receipt: {
          targetReferenceName: 'operator-vcp-toolbox-service-ref',
          toolName: 'record_memory',
          primaryRuntime: 'VCPToolBox native memory',
          statusClass: 'output_budget_exceeded',
          nativeInvocationAttempted: true,
          nativeMcpToolInvocationAttempted: true,
          rollbackReasonCode: 'write_post_commit_output_budget_exceeded'
        }
      }
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.disclosureForbiddenFieldCount, 2);
  assert.equal(entry.auditReceiptForbiddenFieldCount, 2);
  assert.equal(entry.rollbackPostureForbiddenFieldCount, 2);
  assert.equal(entry.auditReceiptReferenceSafe, false);
  assert.equal(entry.auditReceiptReferenceName, null);
  assert.equal(entry.rollbackPlanReferenceSafe, false);
  assert.equal(entry.rollbackPlanReferenceName, null);
  assert.equal(entry.rollbackPlanBound, false);
  assert.equal(entry.rollbackRequired, false);
  assert.equal(entry.rollbackReasonCode, null);
  assert.equal(entry.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(entry.rollbackApplyPolicy, 'not_applicable');
  assert.equal(serialized.includes('PRIVATE_DISCLOSURE_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_AUDIT_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_ROLLBACK_PATH_SHOULD_NOT_ECHO'), false);
});

test('appends low-disclosure bridge receipt audit event and attaches receipt status', async () => {
  const appended = [];
  const delegationResult = validWriteDelegationResult();
  const result = await recordGovernedMcpVcpNativeBridgeAuditReceipt({
    auditLogStore: {
      async appendWriteAudit(entry) {
        appended.push(entry);
      }
    },
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: delegationResult
  });
  attachBridgeAuditReceiptStatus(delegationResult, result);

  assert.equal(result.accepted, true);
  assert.equal(result.appended, true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].eventType, EVENT_TYPE);
  assert.equal(delegationResult.receipt.localAuditReceipt.status, 'appended');
  assert.equal(delegationResult.delegatedResult.receipt.localAuditReceipt.rawPayloadPersisted, false);
});

test('does not append bridge audit receipt when current product goal coverage is missing', async () => {
  const appended = [];
  const gateResult = acceptedGate();
  gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count = 1;
  const result = await recordGovernedMcpVcpNativeBridgeAuditReceipt({
    auditLogStore: {
      async appendWriteAudit(entry) {
        appended.push(entry);
      }
    },
    toolName: 'record_memory',
    gateResult,
    writeDelegationResult: validWriteDelegationResult()
  });
  const serialized = JSON.stringify({ result, appended });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'audit_receipt_current_product_goal_coverage_missing');
  assert.equal(result.appended, false);
  assert.equal(result.lowDisclosure, true);
  assert.equal(result.currentProductGoalCoverageAccepted, false);
  assert.equal(result.currentProductGoalCoverageBlockerCount > 0, true);
  assert.equal(appended.length, 0);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('does not append bridge audit receipt when native invocation disclosed governance metadata raw value', async () => {
  const appended = [];
  const delegationResult = validWriteDelegationResult();
  delegationResult.receipt.nativeInvocationReceipt.governanceMetadataRawValueDisclosed = true;
  delegationResult.delegatedResult.receipt.nativeInvocationReceipt.governanceMetadataRawValueDisclosed = true;
  const result = await recordGovernedMcpVcpNativeBridgeAuditReceipt({
    auditLogStore: {
      async appendWriteAudit(entry) {
        appended.push(entry);
      }
    },
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: delegationResult
  });
  const serialized = JSON.stringify({ result, appended });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'audit_receipt_current_product_goal_coverage_missing');
  assert.equal(result.appended, false);
  assert.equal(result.currentProductGoalCoverageAccepted, false);
  assert.equal(appended.length, 0);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('does not append bridge audit receipt when native invocation lacks governed metadata evidence', async () => {
  const appended = [];
  const delegationResult = validWriteDelegationResult();
  delete delegationResult.receipt.nativeInvocationReceipt.governanceMetadataPath;
  delegationResult.receipt.nativeInvocationReceipt.governanceMetadataSent = false;
  delete delegationResult.delegatedResult.receipt.nativeInvocationReceipt.governanceMetadataPath;
  delegationResult.delegatedResult.receipt.nativeInvocationReceipt.governanceMetadataSent = false;
  const result = await recordGovernedMcpVcpNativeBridgeAuditReceipt({
    auditLogStore: {
      async appendWriteAudit(entry) {
        appended.push(entry);
      }
    },
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: delegationResult
  });
  const serialized = JSON.stringify({ result, appended });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'audit_receipt_current_product_goal_coverage_missing');
  assert.equal(result.appended, false);
  assert.equal(result.currentProductGoalCoverageAccepted, false);
  assert.equal(result.currentProductGoalCoverageBlockerCount >= 2, true);
  assert.equal(appended.length, 0);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_NATIVE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('attached bridge audit status requires both accepted and appended evidence', () => {
  const delegationResult = {
    accepted: true,
    receipt: {
      statusClass: 'success'
    },
    delegatedResult: {
      receipt: {
        statusClass: 'success'
      }
    }
  };

  attachBridgeAuditReceiptStatus(delegationResult, {
    accepted: true,
    appended: false,
    reasonCode: 'audit_receipt_append_failed'
  });

  assert.equal(delegationResult.receipt.localAuditReceipt.appended, false);
  assert.equal(delegationResult.receipt.localAuditReceipt.status, 'not_appended');
  assert.equal(delegationResult.receipt.localAuditReceipt.reasonCode, 'audit_receipt_append_failed');
  assert.equal(delegationResult.delegatedResult.receipt.localAuditReceipt.appended, false);
  assert.equal(delegationResult.delegatedResult.receipt.localAuditReceipt.status, 'not_appended');
});

test('audit append failure stays low-disclosure and does not expose error details', async () => {
  const result = await recordGovernedMcpVcpNativeBridgeAuditReceipt({
    auditLogStore: {
      async appendWriteAudit() {
        throw new Error('PRIVATE_AUDIT_PATH_SHOULD_NOT_ECHO');
      }
    },
    toolName: 'record_memory',
    gateResult: acceptedGate(),
    writeDelegationResult: validWriteDelegationResult()
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'audit_receipt_append_failed');
  assert.equal(result.appended, false);
  assert.equal(serialized.includes('PRIVATE_AUDIT_PATH_SHOULD_NOT_ECHO'), false);
});

test('builds and appends low-disclosure read fallback audit event', async () => {
  const fallbackContext = validReadFallbackContext();
  const entry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext
  });
  const appended = [];
  const result = await recordGovernedMcpVcpNativeReadFallbackAuditReceipt({
    auditLogStore: {
      async appendWriteAudit(value) {
        appended.push(value);
      }
    },
    toolName: 'audit_memory',
    fallbackContext
  });
  const serialized = JSON.stringify({ entry, appended, result });

  assert.equal(entry.eventType, READ_FALLBACK_EVENT_TYPE);
  assert.equal(entry.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(entry.localMemoryRole, 'fallback');
  assert.equal(entry.localMemorySourceRuntime, 'codex_memory_local_fallback');
  assert.equal(entry.clientId, 'Codex');
  assert.equal(entry.visibility, 'private');
  assert.equal(entry.scopePresent, true);
  assert.equal(entry.scopeIdentifierPresent, true);
  assert.deepEqual(entry.scopeFieldNames, ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id']);
  assert.deepEqual(entry.scopeIdentifierFieldNames, ['project_id', 'scope_id', 'workspace_id']);
  assert.equal(entry.scopeFingerprint, 'd'.repeat(64));
  assert.equal(entry.rawScopePersisted, false);
  assert.equal(entry.localMemoryFallbackAuthorized, true);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.localMemoryFallbackReadPerformed, false);
  assert.equal(entry.localMemoryFallbackReturned, false);
  assert.equal(entry.fallbackAfterAuditReceiptAppended, true);
  assert.equal(entry.bridgeAuditReceiptStatus, 'appended');
  assert.equal(entry.bridgeAuditReceiptAppended, true);
  assert.equal(entry.fallbackReceiptLowDisclosure, true);
  assert.equal(entry.nativeRuntimeCalled, true);
  assert.equal(entry.nativeMcpToolCalled, true);
  assert.equal(entry.nativeInvocationAttempted, true);
  assert.equal(entry.nativeMcpToolInvocationAttempted, true);
  assert.equal(entry.vcpNativeResult, false);
  assert.equal(entry.resultCanBeMistakenForVcpNative, false);
  assert.equal(entry.rawFallbackMemoryPersisted, false);
  assert.equal(entry.memoryContentDisclosed, false);
  assert.equal(result.accepted, true);
  assert.equal(result.appended, true);
  assert.equal(result.localMemoryFallbackAuthorized, true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].eventType, READ_FALLBACK_EVENT_TYPE);
  const fallbackCoverage = validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole(entry);
  assert.equal(fallbackCoverage.accepted, true, fallbackCoverage.blockers.join(', '));
  assert.deepEqual(fallbackCoverage.requiredLocalMemoryRole, [
    'fallback',
    'audit',
    'validation fixture',
    'compatibility',
    'offline continuity'
  ]);
  assert.equal(fallbackCoverage.vcpNativeResult, false);
  assert.equal(fallbackCoverage.resultCanBeMistakenForVcpNative, false);
  assert.equal(fallbackCoverage.readinessClaimed, false);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_SCOPE_IDENTIFIER_SHOULD_NOT_ECHO'), false);
});

test('does not append read fallback audit receipt when local memory role coverage is missing', async () => {
  const appended = [];
  const fallbackContext = {
    ...validReadFallbackContext(),
    auditReceiptStatus: 'not_appended'
  };
  const result = await recordGovernedMcpVcpNativeReadFallbackAuditReceipt({
    auditLogStore: {
      async appendWriteAudit(value) {
        appended.push(value);
      }
    },
    toolName: 'audit_memory',
    fallbackContext
  });
  const serialized = JSON.stringify({ result, appended });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'read_fallback_audit_receipt_local_memory_role_coverage_missing');
  assert.equal(result.eventType, READ_FALLBACK_EVENT_TYPE);
  assert.equal(result.appended, false);
  assert.equal(result.lowDisclosure, true);
  assert.equal(result.localMemoryRoleCoverageAccepted, false);
  assert.equal(result.localMemoryRoleCoverageBlockerCount > 0, true);
  assert.equal(appended.length, 0);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_SCOPE_IDENTIFIER_SHOULD_NOT_ECHO'), false);
});

test('read fallback audit entry does not echo unsafe forged tool names', () => {
  const entry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'http://PRIVATE_FALLBACK_TOOL_SHOULD_NOT_ECHO',
    fallbackContext: {
      used: true,
      reasonCode: 'native_read_delegation_transport_error',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: false,
      auditReceiptStatus: 'not_appended',
      privateFallbackContent: 'RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.toolName, null);
  assert.equal(entry.bridgeAuditReceiptAppended, false);
  assert.equal(entry.fallbackReceiptLowDisclosure, true);
  assert.equal(serialized.includes('PRIVATE_FALLBACK_TOOL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read fallback audit entry does not echo unsafe forged fallback bucket fields', () => {
  const entry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext: {
      used: true,
      reasonCode: 'https://PRIVATE_FALLBACK_REASON_SHOULD_NOT_ECHO',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: false,
      auditReceiptStatus: 'https://PRIVATE_AUDIT_STATUS_SHOULD_NOT_ECHO',
      nativeStatusClass: 'https://PRIVATE_NATIVE_STATUS_SHOULD_NOT_ECHO',
      nativeResponseShapeCategory: 'https://PRIVATE_NATIVE_SHAPE_SHOULD_NOT_ECHO',
      nativeTopLevelKindCategory: 'https://PRIVATE_NATIVE_KIND_SHOULD_NOT_ECHO',
      nativeItemCountBucket: 'https://PRIVATE_NATIVE_ITEM_BUCKET_SHOULD_NOT_ECHO',
      nativeByteCountBucket: 'https://PRIVATE_NATIVE_BYTE_BUCKET_SHOULD_NOT_ECHO',
      privateFallbackContent: 'RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.fallbackReasonCode, null);
  assert.equal(entry.bridgeAuditReceiptStatus, null);
  assert.equal(entry.bridgeAuditReceiptAppended, false);
  assert.equal(entry.nativeStatusClass, null);
  assert.equal(entry.nativeResponseShapeCategory, null);
  assert.equal(entry.nativeTopLevelKindCategory, null);
  assert.equal(entry.nativeItemCountBucket, null);
  assert.equal(entry.nativeByteCountBucket, null);
  assert.equal(serialized.includes('PRIVATE_FALLBACK_REASON_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_AUDIT_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_SHAPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_KIND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_ITEM_BUCKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_BYTE_BUCKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read fallback audit entry derives fallback authorization from appended bridge receipt status', () => {
  const entry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext: {
      used: true,
      reasonCode: 'native_read_delegation_transport_error',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      auditReceiptStatus: 'not_appended',
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeStatusClass: 'transport_error',
      privateFallbackContent: 'RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(entry);

  assert.equal(entry.bridgeAuditReceiptStatus, 'not_appended');
  assert.equal(entry.bridgeAuditReceiptAppended, false);
  assert.equal(entry.fallbackAfterAuditReceiptAppended, false);
  assert.equal(entry.localMemoryFallbackAuthorized, false);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.fallbackRequiresAuditReceipt, true);
  assert.equal(entry.nativeInvocationAttempted, true);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read fallback audit entry only records native buckets for matched read failures', () => {
  const reasonMismatchEntry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext: {
      used: true,
      reasonCode: 'native_read_delegation_client_error',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      auditReceiptStatus: 'appended',
      nativeRuntimeCalled: true,
      nativeMcpToolCalled: true,
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeMemoryReadPerformed: false,
      nativeStatusClass: 'transport_error',
      nativeResponseShapeCategory: 'object_top_level_kind_only_no_field_names',
      nativeTopLevelKindCategory: 'object',
      nativeItemCountBucket: 'one',
      nativeByteCountBucket: 'bounded'
    }
  });
  const successStatusEntry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext: {
      used: true,
      reasonCode: 'native_read_delegation_transport_error',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      auditReceiptStatus: 'appended',
      nativeRuntimeCalled: true,
      nativeMcpToolCalled: true,
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeMemoryReadPerformed: false,
      nativeStatusClass: 'success',
      nativeResponseShapeCategory: 'object_top_level_kind_only_no_field_names',
      nativeTopLevelKindCategory: 'object',
      nativeItemCountBucket: 'one',
      nativeByteCountBucket: 'bounded'
    }
  });

  for (const entry of [reasonMismatchEntry, successStatusEntry]) {
    assert.equal(entry.localMemoryFallbackAuthorized, false);
    assert.equal(entry.nativeRuntimeCalled, false);
    assert.equal(entry.nativeMcpToolCalled, false);
    assert.equal(entry.nativeInvocationAttempted, false);
    assert.equal(entry.nativeMcpToolInvocationAttempted, false);
    assert.equal(entry.nativeMemoryReadPerformed, false);
    assert.equal(entry.nativeStatusClass, null);
    assert.equal(entry.nativeResponseShapeCategory, null);
    assert.equal(entry.nativeTopLevelKindCategory, null);
    assert.equal(entry.nativeItemCountBucket, null);
    assert.equal(entry.nativeByteCountBucket, null);
  }
});

test('read fallback audit entry rejects forged native success evidence before authorizing fallback', () => {
  const entry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext: {
      used: true,
      reasonCode: 'native_read_delegation_transport_error',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      auditReceiptStatus: 'appended',
      nativeRuntimeCalled: true,
      nativeMcpToolCalled: true,
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeMemoryReadPerformed: true,
      nativeStatusClass: 'transport_error',
      privateFallbackContent: 'RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'
    }
  });
  const successStatusEntry = buildLowDisclosureReadFallbackAuditEntry({
    toolName: 'audit_memory',
    fallbackContext: {
      used: true,
      reasonCode: 'native_read_delegation_transport_error',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      auditReceiptStatus: 'appended',
      nativeRuntimeCalled: true,
      nativeMcpToolCalled: true,
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeMemoryReadPerformed: false,
      nativeStatusClass: 'success',
      privateFallbackContent: 'RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify({ entry, successStatusEntry });

  assert.equal(entry.bridgeAuditReceiptAppended, true);
  assert.equal(entry.fallbackAfterAuditReceiptAppended, true);
  assert.equal(entry.localMemoryFallbackUsed, false);
  assert.equal(entry.localMemoryFallbackAuthorized, false);
  assert.equal(entry.nativeRuntimeCalled, false);
  assert.equal(entry.nativeMcpToolCalled, false);
  assert.equal(entry.nativeInvocationAttempted, false);
  assert.equal(entry.nativeMcpToolInvocationAttempted, false);
  assert.equal(entry.nativeMemoryReadPerformed, false);
  assert.equal(entry.nativeStatusClass, null);
  assert.equal(successStatusEntry.bridgeAuditReceiptAppended, true);
  assert.equal(successStatusEntry.localMemoryFallbackAuthorized, false);
  assert.equal(successStatusEntry.localMemoryFallbackUsed, false);
  assert.equal(successStatusEntry.nativeRuntimeCalled, false);
  assert.equal(successStatusEntry.nativeInvocationAttempted, false);
  assert.equal(successStatusEntry.nativeMemoryReadPerformed, false);
  assert.equal(successStatusEntry.nativeStatusClass, null);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read fallback audit append failure stays low-disclosure', async () => {
  const result = await recordGovernedMcpVcpNativeReadFallbackAuditReceipt({
    auditLogStore: {
      async appendWriteAudit() {
        throw new Error('PRIVATE_FALLBACK_AUDIT_FAILURE_SHOULD_NOT_ECHO');
      }
    },
    toolName: 'audit_memory',
    fallbackContext: validReadFallbackContext()
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'read_fallback_audit_receipt_append_failed');
  assert.equal(result.eventType, READ_FALLBACK_EVENT_TYPE);
  assert.equal(result.appended, false);
  assert.equal(result.lowDisclosure, true);
  assert.equal(serialized.includes('PRIVATE_FALLBACK_AUDIT_FAILURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
});
