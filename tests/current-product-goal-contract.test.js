'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE,
  validateCurrentProductGoalContract,
  validateGovernedMcpOverviewStatusCoversCurrentProductGoal,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal,
  validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole
} = require('../src/core/CurrentProductGoalContract');

function currentGoal(overrides = {}) {
  return {
    product_goal: {
      primary_runtime: REQUIRED_PRIMARY_RUNTIME,
      primary_value: REQUIRED_PRIMARY_VALUE,
      clients: [...REQUIRED_CLIENTS],
      access_path: REQUIRED_ACCESS_PATH,
      governed_dimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
      local_memory_role: [...REQUIRED_LOCAL_MEMORY_ROLE],
      ...(overrides.product_goal || {})
    },
    counters: {
      ...(overrides.counters || {})
    }
  };
}

function governedOverviewStatus(overrides = {}) {
  const latest = {
    schemaVersion: 'governed_native_bridge_observation_summary_v1',
    toolName: 'search_memory',
    mode: 'observe',
    gateAccepted: true,
    accessPath: REQUIRED_ACCESS_PATH,
    clientId: 'Codex',
    visibility: 'private',
    scopePresent: true,
    scopeIdentifierPresent: true,
    scopeIdentifierSafe: true,
    scopeFieldNames: ['client_id', 'project_id', 'visibility', 'workspace_id'],
    scopeIdentifierFieldNames: ['project_id', 'workspace_id'],
    scopeFingerprintPresent: true,
    rawScopePersisted: false,
    rawScopeValueReturned: false,
    clientIdentitySource: 'trusted_execution_context_or_transport',
    clientIdentityBound: true,
    clientIdentityToolArgumentsMayOverride: false,
    clientIdentityGovernanceMetadataMayOverride: false,
    scopeBoundarySource: 'trusted_execution_context_or_transport',
    scopeBoundaryBound: true,
    scopeToolArgumentsMayOverride: false,
    scopeGovernanceMetadataMayOverride: false,
    visibilityBound: true,
    trustedExecutionContextSupplied: true,
    trustedExecutionContextAccepted: true,
    trustedExecutionContextScopeMatched: true,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    runtimeTargetConfigured: true,
    runtimeTargetKind: 'mcp_server',
    runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
    runtimeTargetForbiddenFieldCount: 0,
    runtimeTargetBound: true,
    runtimeTargetToolArgumentsMayOverride: false,
    runtimeTargetGovernanceMetadataMayOverride: false,
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    runtimeTargetLocatorDisclosed: false,
    runtimeTargetEndpointDisclosed: false,
    runtimeTargetTokenMaterialDisclosed: false,
    invocationProfile: 'governed_read_only',
    invocationProfileSource: 'bridge_tool_binding',
    invocationProfileBound: true,
    invocationProfileToolArgumentsMayOverride: false,
    invocationProfileGovernanceMetadataMayOverride: false,
    invocationProfileForbiddenFieldCount: 0,
    readAllowed: true,
    writeAllowed: false,
    readWriteAuthoritySource: 'bridge_tool_binding',
    readWriteAuthorityBound: true,
    mixedReadWriteAllowed: false,
    unboundedWriteAllowed: false,
    writeRequiresExactApproval: false,
    readWriteAuthorityForbiddenFieldCount: 0,
    disclosureLevel: 'summary',
    outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
    outputDisclosureBudgetBound: true,
    outputDisclosureBudgetToolArgumentsMayOverride: false,
    outputDisclosureBudgetGovernanceMetadataMayOverride: false,
    disclosureMaxItems: 5,
    disclosureMaxBytes: 4096,
    disclosureForbiddenFieldCount: 0,
    rawOutputAllowed: false,
    readDelegationAttempted: true,
    readDelegationAccepted: true,
    writeDelegationAttempted: false,
    writeDelegationAccepted: false,
    delegationDirection: 'read',
    delegationStatusClass: 'success',
    delegationReasonCode: null,
    bridgeAuditReceiptAppended: true,
    bridgeAuditReceiptStatus: 'appended',
    bridgeAuditReceiptRequired: true,
    auditReceiptSource: 'bridge_gate_normalized_governance',
    auditReceiptLowDisclosure: true,
    auditReceiptLowDisclosureBound: true,
    auditReceiptToolArgumentsMayOverride: false,
    auditReceiptGovernanceMetadataMayOverride: false,
    bridgeReceiptLowDisclosure: true,
    auditReceiptReferencePresent: true,
    auditReceiptReferenceSafe: true,
    auditReceiptReferenceName: 'cm-governed-readonly-receipt',
    auditReceiptForbiddenFieldCount: 0,
    localMemoryRole: 'not_used',
    localMemorySourceRuntime: null,
    localMemoryPrimaryRuntime: false,
    localMemoryFallbackUsed: false,
    localMemoryResultReturned: false,
    localMemoryResultCanBeMistakenForVcpNative: false,
    localMemoryRawContentDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    rawMemoryReturned: false,
    nativeInvocationReceiptBindingMatched: true,
    nativeInvocationGovernanceMetadataSent: true,
    nativeInvocationGovernanceMetadataPath: 'params._meta.codexMemoryGovernance',
    nativeInvocationGovernanceMetadataRawValueDisclosed: false,
    nativeInvocationToolName: 'search_memory',
    nativeInvocationTransportCategory: 'local_http_transport',
    nativeInvocationMcpMethod: 'tools/call',
    nativeInvocationRequestIdCategory: 'generated_bridge_request_id',
    nativeInvocationJsonRpcResponseIdMatched: true,
    nativeInvocationStatusClass: 'success',
    nativeInvocationHttpStatusClass: 'success',
    nativeInvocationJsonRpcErrorPresent: false,
    nativeInvocationJsonRpcErrorReasonCode: null,
    nativeInvocationFailureCategory: null,
    rollbackPosture: 'no_runtime_state_to_rollback',
    rollbackPostureSource: 'bridge_gate_normalized_governance',
    rollbackPostureForbiddenFieldCount: 0,
    rollbackPlanReferencePresent: false,
    rollbackPostureBound: true,
    rollbackPostureToolArgumentsMayOverride: false,
    rollbackPostureGovernanceMetadataMayOverride: false,
    rollbackPlanShapeOnly: false,
    rollbackApplyAttempted: false,
    rollbackAutoApplyAllowed: false,
    rollbackRawPlanDisclosed: false,
    rollbackRawPlanPersisted: false,
    readinessClaimed: false,
    ...(overrides.latest || {})
  };

  return {
    schemaVersion: 'governed_native_bridge_observation_status_v1',
    available: true,
    retainedObservationLimit: 5,
    observationCount: 1,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    rawMemoryReturned: false,
    readinessClaimed: false,
    latest,
    ...overrides.status
  };
}

function governedReadFallbackToolResult(overrides = {}) {
  const fallback = {
    used: true,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    localMemoryRole: 'fallback',
    localMemorySourceRuntime: 'codex_memory_local_fallback',
    localMemoryFallbackAttempted: true,
    localMemoryFallbackReadPerformed: true,
    localMemoryFallbackReturned: true,
    reasonCode: 'native_read_delegation_transport_error',
    fallbackRequiresAuditReceipt: true,
    fallbackAfterAuditReceiptAppended: true,
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    nativeRuntimeCalled: true,
    nativeMcpToolCalled: true,
    nativeInvocationAttempted: true,
    nativeMcpToolInvocationAttempted: true,
    nativeStatusClass: 'transport_error',
    nativeMemoryReadPerformed: false,
    rawNativeOutputReturned: false,
    rawNativeMemoryReturned: false,
    tokenMaterialReturned: false,
    endpointReturned: false,
    readinessClaimed: false,
    localFallbackAuditReceipt: {
      appended: true,
      status: 'appended',
      authorized: true,
      lowDisclosure: true,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false
    },
    ...(overrides.fallback || {})
  };
  const access = {
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    localMemoryRole: 'fallback',
    localMemorySourceRuntime: 'codex_memory_local_fallback',
    localMemoryFallbackAttempted: true,
    localMemoryFallbackUsed: true,
    localMemoryFallbackReadPerformed: true,
    localMemoryFallbackReturned: true,
    localMemoryFallbackReasonCode: fallback.reasonCode,
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    fallbackRequiresAuditReceipt: true,
    fallbackAfterAuditReceiptAppended: true,
    localFallbackAuditReceiptStatus: 'appended',
    lowDisclosure: true,
    rawOutputReturned: false,
    rawMemoryReturned: false,
    rawNativeOutputReturned: false,
    rawNativeMemoryReturned: false,
    tokenMaterialReturned: false,
    endpointReturned: false,
    readinessClaimed: false,
    ...(overrides.access || {})
  };

  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_LOCAL_FALLBACK',
    access,
    governedNativeReadFallback: fallback,
    readinessClaimed: false,
    ...overrides.result
  };
}

test('accepts current Codex and Claude governed VCPToolBox-native product goal', () => {
  const result = validateCurrentProductGoalContract(currentGoal());

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'current_product_goal_accepted');
  assert.equal(result.normalizedProductGoal.primary_runtime, 'VCPToolBox native memory');
  assert.equal(result.normalizedProductGoal.primary_value, 'governance, not memory intelligence');
  assert.deepEqual(result.normalizedProductGoal.clients, ['Codex', 'Claude']);
  assert.deepEqual(result.normalizedProductGoal.governed_dimensions, [
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
  assert.deepEqual(result.normalizedProductGoal.local_memory_role, [
    'fallback',
    'audit',
    'validation fixture',
    'compatibility',
    'offline continuity'
  ]);
  assert.equal(result.vcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.readinessClaimed, false);
});

test('rejects goals that make codex-memory the primary memory-intelligence runtime', () => {
  const result = validateCurrentProductGoalContract(currentGoal({
    product_goal: {
      primary_runtime: 'codex-memory local memory',
      primary_value: 'memory intelligence'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('primary_runtime_must_be_vcp_toolbox_native_memory'));
  assert.ok(result.blockers.includes('primary_value_must_be_governance_not_memory_intelligence'));
  assert.equal(result.vcpToolBoxCalled, false);
});

test('rejects current-client expansion beyond Codex and Claude', () => {
  const result = validateCurrentProductGoalContract(currentGoal({
    product_goal: {
      clients: ['Codex', 'Claude', 'Manual']
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('clients_must_match_current_product_goal_exact_order'));
});

test('repository goal docs keep the active client contract scoped to Codex and Claude', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const projectGoal = fs.readFileSync(path.join(repoRoot, 'PROJECT_GOAL.md'), 'utf8');
  const readmeCurrentIntro = readme.slice(0, readme.indexOf('当前 governed VCPToolBox native bridge 入口：'));
  const currentGoalSection = projectGoal.slice(0, projectGoal.indexOf('## 1.'));

  assert.match(readmeCurrentIntro, /当前目标是让 Codex 与 Claude 通过 `codex-memory` 治理桥/);
  assert.match(currentGoalSection, /clients:\n\s+- Codex/);
  assert.match(currentGoalSection, /\s+- Claude/);
  assert.match(projectGoal, /## 1\. Legacy Long-Term Context \(Not Current Product Goal\)/);
  assert.match(projectGoal, /must not override Section 0/);
});

test('canonical Chinese manual keeps the complete five-tool default configuration', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const manual = fs.readFileSync(path.join(repoRoot, 'README.zh-CN.md'), 'utf8');
  const expectedEnabledTools =
    'enabled_tools = ["search_memory", "memory_overview", "audit_memory", "prepare_memory_context", "propose_memory_delta"]';

  assert.match(manual, /当前默认开放给 Codex \/ Claude 的五工具面是：/);
  assert.ok(manual.includes(expectedEnabledTools));
  assert.match(manual, /\[mcp_servers\.vcp_codex_memory\.tools\.prepare_memory_context\]/);
  assert.match(manual, /\[mcp_servers\.vcp_codex_memory\.tools\.propose_memory_delta\]/);
});

test('rejects missing governed dimensions or local fallback role drift', () => {
  const result = validateCurrentProductGoalContract(currentGoal({
    product_goal: {
      governed_dimensions: ['client_id', 'scope', 'visibility'],
      local_memory_role: ['primary runtime']
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('governed_dimensions_must_match_current_product_goal_exact_order'));
  assert.ok(result.blockers.includes('local_memory_role_must_match_current_product_goal_exact_order'));
});

test('rejects product goal evidence with side-effect counters', () => {
  const result = validateCurrentProductGoalContract(currentGoal({
    counters: {
      vcpToolBoxCalls: 1,
      memoryWrites: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('vcpToolBoxCalls_must_be_zero'));
  assert.ok(result.blockers.includes('memoryWrites_must_be_zero'));
  assert.ok(result.blockers.includes('readinessClaims_must_be_zero'));
});

test('overview status requires native delegation audit receipt append evidence', () => {
  const accepted = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(governedOverviewStatus());
  const missingAppendEvidence = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(
    governedOverviewStatus({
      latest: {
        bridgeAuditReceiptAppended: false,
        bridgeAuditReceiptStatus: null
      }
    })
  );
  const acceptedAppendFailure = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(
    governedOverviewStatus({
      latest: {
        readDelegationAccepted: false,
        delegationStatusClass: 'audit_receipt_not_appended',
        delegationReasonCode: 'required_bridge_audit_receipt_not_appended',
        bridgeAuditReceiptAppended: false,
        bridgeAuditReceiptStatus: 'not_appended',
        bridgeReceiptLowDisclosure: false
      }
    })
  );
  const forgedAppendFailure = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(
    governedOverviewStatus({
      latest: {
        readDelegationAccepted: false,
        delegationStatusClass: 'audit_receipt_not_appended',
        delegationReasonCode: 'required_bridge_audit_receipt_not_appended',
        bridgeAuditReceiptAppended: true,
        bridgeAuditReceiptStatus: 'appended'
      }
    })
  );

  assert.equal(accepted.accepted, true, accepted.blockers.join(', '));
  assert.equal(missingAppendEvidence.accepted, false);
  assert.ok(missingAppendEvidence.blockers.includes('bridgeAuditReceiptAppended_must_equal_true'));
  assert.ok(missingAppendEvidence.blockers.includes('bridgeAuditReceiptStatus_must_equal_appended'));
  assert.equal(acceptedAppendFailure.accepted, true, acceptedAppendFailure.blockers.join(', '));
  assert.equal(forgedAppendFailure.accepted, false);
  assert.ok(forgedAppendFailure.blockers.includes('bridgeAuditReceiptAppended_must_equal_false'));
  assert.ok(forgedAppendFailure.blockers.includes('bridgeAuditReceiptStatus_must_equal_not_appended'));
});

test('overview status requires native invocation execution binding for completed delegation', () => {
  const accepted = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(governedOverviewStatus());
  const forgedResponseId = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(
    governedOverviewStatus({
      latest: {
        nativeInvocationJsonRpcResponseIdMatched: false
      }
    })
  );
  const forgedNativeFailure = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(
    governedOverviewStatus({
      latest: {
        nativeInvocationStatusClass: 'server_error',
        nativeInvocationHttpStatusClass: 'server_error',
        nativeInvocationJsonRpcErrorPresent: true
      }
    })
  );

  assert.equal(accepted.accepted, true, accepted.blockers.join(', '));
  assert.equal(forgedResponseId.accepted, false);
  assert.ok(
    forgedResponseId.blockers.includes('native_invocation_json_rpc_response_id_must_match')
  );
  assert.equal(forgedNativeFailure.accepted, false);
  assert.ok(
    forgedNativeFailure.blockers.includes('native_invocation_status_class_must_be_success')
  );
  assert.ok(
    forgedNativeFailure.blockers.includes('native_invocation_http_status_class_must_be_success')
  );
  assert.ok(
    forgedNativeFailure.blockers.includes('native_invocation_json_rpc_error_present_must_equal_false')
  );
});

test('read fallback tool result requires governed native failure evidence', () => {
  const accepted = validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(
    governedReadFallbackToolResult()
  );
  const forgedReason = validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(
    governedReadFallbackToolResult({
      fallback: {
        reasonCode: 'local_cache_preferred_without_native_failure',
        nativeStatusClass: 'transport_error'
      }
    })
  );
  const forgedNativeStatus = validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(
    governedReadFallbackToolResult({
      fallback: {
        reasonCode: 'native_read_delegation_server_error',
        nativeStatusClass: 'transport_error'
      }
    })
  );
  const forgedAccessReason = validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(
    governedReadFallbackToolResult({
      access: {
        localMemoryFallbackReasonCode: 'native_read_delegation_client_error'
      }
    })
  );

  assert.equal(accepted.accepted, true, accepted.blockers.join(', '));
  assert.equal(forgedReason.accepted, false);
  assert.ok(
    forgedReason.blockers.includes(
      'governedNativeReadFallback.reasonCode_must_be_governed_native_read_failure'
    )
  );
  assert.equal(forgedNativeStatus.accepted, false);
  assert.ok(
    forgedNativeStatus.blockers.includes(
      'governedNativeReadFallback.nativeStatusClass_must_match_reasonCode'
    )
  );
  assert.equal(forgedAccessReason.accepted, false);
  assert.ok(
    forgedAccessReason.blockers.includes(
      'access.localMemoryFallbackReasonCode_must_match_fallback.reasonCode'
    )
  );
});

test('rejects native governance metadata that does not carry governed MCP bridge controls', () => {
  const metadata = {
    schemaVersion: 'codex_memory_governed_native_bridge_call_governance_v1',
    trustedExecutionContext: {
      accepted: true,
      source: 'trusted_execution_context_or_transport',
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'Codex',
        projectId: 'codex-memory',
        scopeId: null,
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      }
    },
    runtimeTarget: {
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    invocationProfile: {
      profile: 'governed_read_only',
      source: 'bridge_tool_binding',
      transport: 'mcp',
      toolName: 'search_memory',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    readWriteAuthority: {
      readAllowed: true,
      writeAllowed: false,
      source: 'bridge_tool_binding',
      bound: true,
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      writeRequiresExactApproval: false,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    outputDisclosureBudget: {
      level: 'summary',
      lowDisclosure: true,
      rawOutput: false,
      maxItems: 5,
      maxBytes: 4096,
      source: 'bridge_gate_normalized_governance',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    auditReceipt: {
      receipt_id: 'cm-governed-readonly-receipt',
      required: true,
      lowDisclosure: true,
      source: 'bridge_gate_normalized_governance',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    rollbackPosture: {
      mode: 'no_runtime_state_to_rollback',
      source: 'bridge_gate_normalized_governance',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      automaticRollbackAppliedByBridge: false
    },
    governanceTransport: {
      metadataPath: 'params._meta.codexMemoryGovernance',
      toolArgumentsMayCarryGovernance: false,
      trustedExecutionContextMustMatchTransportContext: true,
      transportContextFieldsOverrideGovernanceMetadata: true
    },
    lowDisclosure: true,
    readinessClaimed: false
  };

  const accepted = validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(metadata, {
    toolName: 'search_memory'
  });
  const rejected = validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal({
    ...metadata,
    outputDisclosureBudget: {
      ...metadata.outputDisclosureBudget,
      rawOutput: true
    },
    governanceTransport: {
      ...metadata.governanceTransport,
      metadataPath: 'params.arguments.governance'
    }
  }, {
    toolName: 'search_memory'
  });

  assert.equal(accepted.accepted, true, accepted.blockers.join(', '));
  assert.equal(accepted.metadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(rejected.accepted, false);
  assert.ok(rejected.blockers.includes('outputDisclosureBudget.rawOutput_must_equal_false'));
  assert.ok(
    rejected.blockers.includes(
      'governanceTransport.metadataPath_must_equal_params._meta.codexMemoryGovernance'
    )
  );
});
