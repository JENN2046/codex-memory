'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  validateGovernedMcpVcpNativeBridgeGate
} = require('../src/core/GovernedMcpVcpNativeBridgeGate');
const {
  SCOPE_FILTERING_REQUIRED_VISIBILITIES,
  buildDelegatedArguments,
  executeGovernedMcpVcpNativeReadDelegation
} = require('../src/core/GovernedMcpVcpNativeReadDelegationAdapter');
const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE,
  validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal,
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal
} = require('../src/core/CurrentProductGoalContract');
const {
  SOURCE_AUTHORITY
} = require('../src/core/GovernedMcpVcpNativeRuntimeTargetConfig');

function gateResult(
  toolName = 'search_memory',
  { visibility = 'shared', scopeFilteringProven = true } = {}
) {
  const result = validateGovernedMcpVcpNativeBridgeGate({
    product_goal: {
      primary_runtime: REQUIRED_PRIMARY_RUNTIME,
      primary_value: REQUIRED_PRIMARY_VALUE,
      clients: [...REQUIRED_CLIENTS],
      access_path: REQUIRED_ACCESS_PATH,
      governed_dimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
      local_memory_role: [...REQUIRED_LOCAL_MEMORY_ROLE]
    },
    bridge_request: {
      client_id: 'Codex',
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        visibility
      },
      runtime_target: {
        kind: 'vcp_toolbox_native_memory',
        target_name: REQUIRED_PRIMARY_RUNTIME,
        target_reference_name: 'operator-vcp-toolbox-service-ref',
        target_kind: 'mcp_server',
        configured: true,
        source_authority: SOURCE_AUTHORITY
      },
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: toolName
      },
      read_write_authority: {
        read: true,
        write: false
      },
      output_disclosure_budget: {
        level: 'summary',
        low_disclosure: true,
        raw_output: false,
        max_items: 5,
        max_bytes: 4096
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_plan_id: 'cm-governed-readonly-receipt'
      },
      rollback_posture: {
        mode: 'no_runtime_state_to_rollback'
      }
    },
    trusted_execution_context: {
      accepted: true,
      executionContext: {
        agentAlias: 'Codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility
      }
    },
    counters: {}
  });
  if (scopeFilteringProven) {
    Object.assign(result.normalizedBridgeRequest, {
      native_scope_filtering_proven: true,
      scope_enforcement_mode: 'diary_allowlist_v1',
      expected_mapping_reference: 'jenn-vcp-diary-scope-v1',
      expected_mapping_digest: `sha256:${'a'.repeat(64)}`,
      recall_profile: 'exact_visibility',
      scope_id_affects_diary_acl: false,
      scope_id_enforcement_claimed: false
    });
  }
  return result;
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
    nativeRuntimeReceipt: {
      present: true,
      nativeRuntimeCalled: true,
      nativeRuntimeInitialized: false,
      providerApiCalled: true,
      memoryReadPerformed: true,
      memoryWritePerformed: false,
      durableWritePerformed: true,
      durableWriteScope: 'native_runtime_store',
      isolatedRuntimeStoreUsed: false,
      primaryMemoryStoreWritePerformed: false,
      derivedIndexWritePerformed: true,
      authorizationResolvedBeforeProvider: true,
      diaryAllowlistEnforcedBeforeIndexLoad: true,
      diaryAllowlistEnforcedBeforeVectorSearch: true,
      resultScopePostcheckPassed: true,
      unscopedNativeSearchUsed: false,
      mappingReferenceBound: true,
      mappingDigestBound: true,
      allowedDiaryCount: 1,
      rawDiaryNamesReturned: false,
      scopeIdAccepted: true,
      scopeIdAudited: true,
      scopeIdFingerprintBound: true,
      scopeIdAffectsDiaryAcl: false,
      scopeIdEnforcementClaimed: false,
      rawRuntimeOutputDisclosed: false,
      rawMemoryContentDisclosed: false,
      runtimeLocatorDisclosed: false,
      tokenMaterialDisclosed: false,
      readinessClaimed: false
    },
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

test('builds low-disclosure delegated arguments for read-only tools from governed gate scope', () => {
  const searchDelegated = buildDelegatedArguments('search_memory', {
    query: 'needle',
    target: 'both',
    limit: 10,
    include_content: true,
    scope: {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'codex',
      visibility: 'shared',
      unsupported: 'SHOULD_NOT_PASS'
    }
  }, gateResult('search_memory'));
  const searchCoverage =
    validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(searchDelegated, {
      toolName: 'search_memory'
    });

  assert.equal(searchDelegated.query, 'needle');
  assert.equal(searchCoverage.accepted, true, searchCoverage.blockers.join(', '));
  assert.equal(searchCoverage.direction, 'read');
  assert.equal(searchDelegated.target, 'both');
  assert.equal(searchDelegated.limit, 5);
  assert.equal(searchDelegated.include_content, false);
  assert.deepEqual(searchDelegated.scope, {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'shared'
  });
  assert.deepEqual(searchDelegated.governed_bridge, {
    primary_runtime: 'VCPToolBox native memory',
    access_path: 'governed MCP tools',
    runtime_target: {
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
    },
    client_id: 'Codex',
    scope: {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'shared'
    },
    scope_present: true,
    scope_identifier_present: true,
    scope_identifier_safe: true,
    scope_field_names: [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ],
    scope_identifier_field_names: [
      'project_id',
      'workspace_id'
    ],
    scope_fingerprint: '2931bf55168c1dee221fdcb5ea1cf659061f764f176aeaa5718d43af4507d8c0',
    raw_scope_persisted: false,
    raw_scope_value_returned: false,
    local_memory_role: 'not_used',
    local_memory_source_runtime: null,
    local_memory_primary_runtime: false,
    local_memory_fallback_used: false,
    local_memory_result_returned: false,
    local_memory_result_can_be_mistaken_for_vcp_native: false,
    local_memory_raw_content_disclosed: false,
    visibility: 'shared',
    client_identity_source: 'trusted_execution_context_or_transport',
    client_identity_bound: true,
    client_identity_tool_arguments_may_override: false,
    client_identity_governance_metadata_may_override: false,
    scope_boundary_source: 'trusted_execution_context_or_transport',
    scope_boundary_bound: true,
    scope_tool_arguments_may_override: false,
    scope_governance_metadata_may_override: false,
    visibility_bound: true,
    trusted_execution_context_supplied: true,
    trusted_execution_context_accepted: true,
    trusted_execution_context_scope_matched: true,
    invocation_profile: 'governed_read_only',
    invocation_profile_source: 'bridge_tool_binding',
    invocation_profile_bound: true,
    invocation_profile_tool_arguments_may_override: false,
    invocation_profile_governance_metadata_may_override: false,
    invocation_transport: 'mcp',
    invocation_tool_name: 'search_memory',
    invocation_profile_tool_match: true,
    invocation_profile_forbidden_field_count: 0,
    read_allowed: true,
    write_allowed: false,
    read_write_authority_source: 'bridge_tool_binding',
    read_write_authority_forbidden_field_count: 0,
    read_write_authority_bound: true,
    mixed_read_write_allowed: false,
    unbounded_write_allowed: false,
    write_requires_exact_approval: false,
    raw_output_allowed: false,
    disclosure_level: 'summary',
    output_disclosure_budget_source: 'bridge_gate_normalized_governance',
    disclosure_max_items: 5,
    disclosure_max_bytes: 4096,
    disclosure_forbidden_field_count: 0,
    output_disclosure_budget_bound: true,
    output_disclosure_budget_tool_arguments_may_override: false,
    output_disclosure_budget_governance_metadata_may_override: false,
    over_budget_fallback_to_raw_output: false,
    raw_response_body_disclosed: false,
    audit_receipt_required: true,
    audit_receipt_low_disclosure: true,
    audit_receipt_source: 'bridge_gate_normalized_governance',
    audit_receipt_reference_present: true,
    audit_receipt_reference_name: 'cm-governed-readonly-receipt',
    audit_receipt_forbidden_field_count: 0,
    audit_receipt_event_type: 'governed_mcp_vcp_native_bridge_receipt',
    audit_receipt_append_required: true,
    audit_receipt_low_disclosure_bound: true,
    audit_receipt_tool_arguments_may_override: false,
    audit_receipt_governance_metadata_may_override: false,
    audit_raw_request_body_persisted: false,
    audit_raw_response_body_persisted: false,
    rollback_posture: 'no_runtime_state_to_rollback',
    rollback_posture_source: 'bridge_gate_normalized_governance',
    rollback_plan_reference_present: false,
    rollback_posture_forbidden_field_count: 0,
    rollback_posture_bound: true,
    rollback_posture_tool_arguments_may_override: false,
    rollback_posture_governance_metadata_may_override: false,
    rollback_plan_shape_only: false,
    rollback_auto_apply_allowed: false,
    rollback_apply_requires_governed_followup: false,
    rollback_raw_plan_disclosed: false,
    rollback_raw_plan_persisted: false,
    low_disclosure: true
  });
  assert.equal(JSON.stringify(searchDelegated.governed_bridge).includes('needle'), false);

  const auditDelegated = buildDelegatedArguments('audit_memory', {
    audit_family: 'recall',
    window: 500,
    include_raw: true,
    scope: {
      project_id: 'payload-project-should-not-win',
      client_id: 'other-client',
      visibility: 'workspace'
    }
  }, gateResult('audit_memory'));
  const auditCoverage =
    validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(auditDelegated, {
      toolName: 'audit_memory'
    });

  assert.equal(auditDelegated.audit_family, 'recall');
  assert.equal(auditCoverage.accepted, true, auditCoverage.blockers.join(', '));
  assert.equal(auditDelegated.window, 5);
  assert.equal(auditDelegated.include_raw, false);
  assert.deepEqual(auditDelegated.scope, {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'shared'
  });
  assert.equal(auditDelegated.governed_bridge.audit_receipt_required, true);
  assert.equal(auditDelegated.governed_bridge.low_disclosure, true);

  const overviewDelegated = buildDelegatedArguments('memory_overview', {
    auditWindow: 500,
    limit: 9,
    scope: {
      project_id: 'payload-project-should-not-win',
      client_id: 'other-client',
      visibility: 'workspace'
    }
  }, gateResult('memory_overview'));
  const overviewCoverage =
    validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(overviewDelegated, {
      toolName: 'memory_overview'
    });

  assert.equal(overviewDelegated.auditWindow, 5);
  assert.equal(overviewCoverage.accepted, true, overviewCoverage.blockers.join(', '));
  assert.equal(overviewDelegated.limit, 5);
  assert.deepEqual(overviewDelegated.scope, {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'shared'
  });
  assert.equal(overviewDelegated.governed_bridge.disclosure_max_items, 5);
  assert.equal(overviewDelegated.governed_bridge.disclosure_max_bytes, 4096);
});

test('fails closed before native invocation for scope-bound visibility without filtering proof', async () => {
  for (const visibility of SCOPE_FILTERING_REQUIRED_VISIBILITIES) {
    let calls = 0;
    const result = await executeGovernedMcpVcpNativeReadDelegation({
      toolName: 'search_memory',
      args: { query: 'bounded query' },
      gateResult: gateResult('search_memory', {
        visibility,
        scopeFilteringProven: false
      }),
      callMcpTool: receiptAwareCallMcpTool(async () => {
        calls += 1;
        return { results: [] };
      })
    });

    assert.equal(result.accepted, false, visibility);
    assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary', visibility);
    assert.deepEqual(
      result.invalidFields,
      [
        'gateResult.normalizedBridgeRequest.native_scope_filtering_proven',
        'gateResult.normalizedBridgeRequest.scope_enforcement_mode',
        'gateResult.normalizedBridgeRequest.expected_mapping_reference',
        'gateResult.normalizedBridgeRequest.expected_mapping_digest',
        'gateResult.normalizedBridgeRequest.recall_profile'
      ],
      visibility
    );
    assert.equal(result.runtimeCalled, false, visibility);
    assert.equal(result.vcpToolBoxCalled, false, visibility);
    assert.equal(result.mcpToolCalled, false, visibility);
    assert.equal(result.memoryReadPerformed, false, visibility);
    assert.equal(result.localMemoryFallbackEligible, false, visibility);
    assert.equal(result.localMemoryFallbackUsed, false, visibility);
    assert.equal(result.rawRequestBodyDisclosed, false, visibility);
    assert.equal(result.rawResponseBodyDisclosed, false, visibility);
    assert.equal(calls, 0, visibility);
  }
});

test('read delegation rejects search arguments beyond MCP schema bounds before native call', async () => {
  let calls = 0;
  const delegated = buildDelegatedArguments('search_memory', {
    query: 'q'.repeat(1001),
    context_text: 'c'.repeat(8001),
    limit: 10
  }, gateResult('search_memory'));

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'PRIVATE_QUERY_SHOULD_NOT_ECHO'.repeat(50),
      context_text: 'PRIVATE_CONTEXT_SHOULD_NOT_ECHO'.repeat(300)
    },
    gateResult: gateResult('search_memory'),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(delegated.query.length, 1000);
  assert.equal(delegated.context_text.length, 8000);
  assert.equal(delegated.limit, 5);
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('args.query'));
  assert.ok(result.invalidFields.includes('args.context_text'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_CONTEXT_SHOULD_NOT_ECHO'), false);
});

test('read delegated envelope drops target reference when runtime forbidden evidence survived gate', () => {
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_path =
    'runtimeTarget.endpointUrl.PRIVATE_ENDPOINT_SHOULD_NOT_ECHO';

  const delegated = buildDelegatedArguments('search_memory', {
    query: 'needle'
  }, gate);
  const serialized = JSON.stringify(delegated);

  assert.equal(delegated.governed_bridge.runtime_target.target_reference_name, null);
  assert.equal(delegated.governed_bridge.runtime_target.forbidden_field_count, null);
  assert.equal(delegated.governed_bridge.runtime_target.endpoint_included, false);
  assert.equal(delegated.governed_bridge.runtime_target.token_material_included, false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
});

test('delegates governed read to native MCP caller and returns only low-disclosure receipt', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      limit: 3
    },
    gateResult: gateResult('search_memory'),
    callMcpTool: receiptAwareCallMcpTool(async payload => {
      calls += 1;
      assert.equal(payload.targetReferenceName, 'operator-vcp-toolbox-service-ref');
      assert.equal(payload.toolName, 'search_memory');
      assert.equal(payload.arguments.include_content, false);
      assert.equal(payload.arguments.scope.client_id, 'Codex');
      assert.equal(payload.arguments.scope.visibility, 'shared');
      assert.equal(payload.arguments.governed_bridge.primary_runtime, 'VCPToolBox native memory');
      assert.equal(
        payload.arguments.governed_bridge.runtime_target.target_reference_name,
        'operator-vcp-toolbox-service-ref'
      );
      assert.equal(payload.arguments.governed_bridge.runtime_target.target_kind, 'mcp_server');
      assert.equal(
        payload.arguments.governed_bridge.runtime_target.source_authority,
        'bridge_runtime_or_static_config'
      );
      assert.equal(payload.arguments.governed_bridge.runtime_target.endpoint_included, false);
      assert.equal(payload.arguments.governed_bridge.runtime_target.token_material_included, false);
      assert.equal(payload.arguments.governed_bridge.client_id, 'Codex');
      assert.equal(payload.arguments.governed_bridge.local_memory_role, 'not_used');
      assert.equal(payload.arguments.governed_bridge.local_memory_source_runtime, null);
      assert.equal(payload.arguments.governed_bridge.local_memory_primary_runtime, false);
      assert.equal(payload.arguments.governed_bridge.local_memory_fallback_used, false);
      assert.equal(payload.arguments.governed_bridge.local_memory_result_returned, false);
      assert.equal(payload.arguments.governed_bridge.local_memory_result_can_be_mistaken_for_vcp_native, false);
      assert.equal(payload.arguments.governed_bridge.local_memory_raw_content_disclosed, false);
      assert.equal(payload.arguments.governed_bridge.read_allowed, true);
      assert.equal(payload.arguments.governed_bridge.write_allowed, false);
      assert.equal(payload.arguments.governed_bridge.read_write_authority_source, 'bridge_tool_binding');
      assert.equal(payload.arguments.governed_bridge.read_write_authority_bound, true);
      assert.equal(payload.arguments.governed_bridge.mixed_read_write_allowed, false);
      assert.equal(payload.arguments.governed_bridge.unbounded_write_allowed, false);
      assert.equal(payload.arguments.governed_bridge.write_requires_exact_approval, false);
      assert.equal(payload.arguments.governed_bridge.rollback_posture_bound, true);
      assert.equal(payload.arguments.governed_bridge.rollback_plan_shape_only, false);
      assert.equal(payload.arguments.governed_bridge.rollback_auto_apply_allowed, false);
      assert.equal(payload.arguments.governed_bridge.rollback_raw_plan_disclosed, false);
      assert.equal(payload.arguments.governed_bridge.rollback_raw_plan_persisted, false);
      assert.equal(payload.arguments.governed_bridge.audit_receipt_required, true);
      assert.equal(
        payload.arguments.governed_bridge.audit_receipt_reference_name,
        'cm-governed-readonly-receipt'
      );
      assert.equal(payload.arguments.governed_bridge.low_disclosure, true);
      assert.equal(JSON.stringify(payload.arguments.governed_bridge).includes('needle'), false);
      assert.equal(
        payload.governanceMeta.schemaVersion,
        'codex_memory_governed_native_bridge_call_governance_v1'
      );
      assert.equal(payload.governanceMeta.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
      assert.equal(payload.governanceMeta.invocationProfile.profile, 'governed_read_only');
      assert.equal(payload.governanceMeta.invocationProfile.toolName, 'search_memory');
      assert.equal(payload.governanceMeta.readWriteAuthority.readAllowed, true);
      assert.equal(payload.governanceMeta.readWriteAuthority.writeAllowed, false);
      assert.equal(payload.governanceMeta.outputDisclosureBudget.rawOutput, false);
      assert.equal(payload.governanceMeta.auditReceipt.receipt_id, 'cm-governed-readonly-receipt');
      assert.equal(payload.governanceMeta.rollbackPosture.mode, 'no_runtime_state_to_rollback');
      assert.equal(payload.governanceMeta.runtimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
      const governanceMetadataCoverage =
        validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(payload.governanceMeta, {
          toolName: 'search_memory'
        });
      assert.equal(
        governanceMetadataCoverage.accepted,
        true,
        governanceMetadataCoverage.blockers.join(', ')
      );
      assert.equal(governanceMetadataCoverage.metadataPath, 'params._meta.codexMemoryGovernance');
      assert.equal(governanceMetadataCoverage.direction, 'read');
      assert.equal(JSON.stringify(payload.governanceMeta).includes('needle'), false);
      return {
        results: [{
          memoryId: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO',
          content: 'RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'
        }]
      };
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(calls, 1);
  assert.equal(result.accepted, true);
  assert.equal(result.delegatedResult.access.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(result.delegatedResult.access.rawMemoryReturned, false);
  assert.equal(result.delegatedResult.receipt.runtimeTargetBound, true);
  assert.equal(result.delegatedResult.receipt.runtimeTargetToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.runtimeTargetGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.invocationProfileSource, 'bridge_tool_binding');
  assert.equal(result.delegatedResult.receipt.invocationProfileBound, true);
  assert.equal(result.delegatedResult.receipt.invocationProfileToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.invocationProfileGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.outputDisclosureBudgetSource, 'bridge_gate_normalized_governance');
  assert.equal(result.delegatedResult.receipt.outputDisclosureBudgetBound, true);
  assert.equal(result.delegatedResult.receipt.outputDisclosureBudgetToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.outputDisclosureBudgetGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.auditReceiptSource, 'bridge_gate_normalized_governance');
  assert.equal(result.delegatedResult.receipt.auditReceiptLowDisclosureBound, true);
  assert.equal(result.delegatedResult.receipt.auditReceiptToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.auditReceiptGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.rollbackPostureSource, 'bridge_gate_normalized_governance');
  assert.equal(result.delegatedResult.receipt.rollbackPostureToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.rollbackPostureGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.clientIdentitySource, 'trusted_execution_context_or_transport');
  assert.equal(result.delegatedResult.receipt.clientIdentityBound, true);
  assert.equal(result.delegatedResult.receipt.clientIdentityToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.clientIdentityGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.scopeBoundarySource, 'trusted_execution_context_or_transport');
  assert.equal(result.delegatedResult.receipt.scopeBoundaryBound, true);
  assert.equal(result.delegatedResult.receipt.scopeToolArgumentsMayOverride, false);
  assert.equal(result.delegatedResult.receipt.scopeGovernanceMetadataMayOverride, false);
  assert.equal(result.delegatedResult.receipt.visibilityBound, true);
  assert.equal(result.delegatedResult.receipt.rawScopeValueReturned, false);
  assert.equal(result.delegatedResult.receipt.localMemoryRole, 'not_used');
  assert.equal(result.delegatedResult.receipt.localMemorySourceRuntime, null);
  assert.equal(result.delegatedResult.receipt.localMemoryPrimaryRuntime, false);
  assert.equal(result.delegatedResult.receipt.localMemoryFallbackUsed, false);
  assert.equal(result.delegatedResult.receipt.localMemoryResultReturned, false);
  assert.equal(result.delegatedResult.receipt.localMemoryResultCanBeMistakenForVcpNative, false);
  assert.equal(result.delegatedResult.receipt.localMemoryRawContentDisclosed, false);
  assert.equal(result.delegatedResult.receipt.readWriteAuthoritySource, 'bridge_tool_binding');
  assert.equal(result.delegatedResult.receipt.readWriteAuthorityForbiddenFieldCount, 0);
  assert.equal(result.delegatedResult.receipt.readWriteAuthorityBound, true);
  assert.equal(result.delegatedResult.receipt.mixedReadWriteAllowed, false);
  assert.equal(result.delegatedResult.receipt.unboundedWriteAllowed, false);
  assert.equal(result.delegatedResult.receipt.writeRequiresExactApproval, false);
  assert.equal(result.delegatedResult.receipt.itemCountBucket, 'one');
  assert.equal(result.delegatedResult.receipt.responseShapeCategory, 'object_top_level_kind_only_no_field_names');
  assert.equal(result.delegatedResult.receipt.rollbackPosture, 'no_runtime_state_to_rollback');
  assert.equal(result.delegatedResult.receipt.rollbackPlanReferencePresent, false);
  assert.equal(result.delegatedResult.receipt.rollbackPlanReferenceSafe, false);
  assert.equal(result.delegatedResult.receipt.rollbackPlanBound, false);
  assert.equal(result.delegatedResult.receipt.rollbackPostureBound, true);
  assert.equal(result.delegatedResult.receipt.rollbackPlanShapeOnly, false);
  assert.equal(result.delegatedResult.receipt.rollbackRequired, false);
  assert.equal(result.delegatedResult.receipt.rollbackDisposition, 'no_runtime_write_to_rollback');
  assert.equal(result.delegatedResult.receipt.rollbackApplyPolicy, 'not_applicable');
  assert.equal(result.delegatedResult.receipt.rollbackAutoApplyAllowed, false);
  assert.equal(result.delegatedResult.receipt.rollbackRawPlanDisclosed, false);
  assert.equal(result.delegatedResult.receipt.rollbackRawPlanPersisted, false);
  const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(
    result.delegatedResult.receipt
  );
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(coverage.direction, 'read');
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
  assert.equal(serialized.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read delegation requires native caller receipt capability before native call', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    gateResult: gateResult('search_memory'),
    callMcpTool: async () => {
      calls += 1;
      return {
        results: [{ content: 'RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO' }]
      };
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('callMcpTool.callWithReceipt'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read delegation rejects successful native value when invocation receipt is missing', async () => {
  let calls = 0;
  const callMcpTool = async () => {
    throw new Error('raw native call path should not be used');
  };
  callMcpTool.callWithReceipt = async () => {
    calls += 1;
    return {
      value: {
        results: [{ content: 'RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO' }]
      }
    };
  };

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    gateResult: gateResult('search_memory'),
    callMcpTool
  });
  const serialized = JSON.stringify(result);

  assert.equal(calls, 1);
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.receipt.nativeInvocationReceipt, null);
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryReadPerformed, true);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('read delegation rejects matching native receipt when governance metadata was not sent', async () => {
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    gateResult: gateResult('search_memory'),
    callMcpTool: receiptAwareCallMcpTool(async () => ({
      results: [{ content: 'RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO' }]
    }), {
      governanceMetadataSent: false
    })
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryReadPerformed, true);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(receipt.invocationBindingMatched, true);
  assert.equal(receipt.governanceMetadataSent, false);
  assert.equal(receipt.governanceMetadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(receipt.governanceMetadataRawValueDisclosed, false);
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('rejects read delegation when required read governance fields did not survive gate', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.client_id = 'Manual';
  gate.normalizedBridgeRequest.visibility = 'public';
  gate.normalizedBridgeRequest.scope_identifier_present = false;
  gate.normalizedBridgeRequest.scope = {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Claude',
    visibility: 'workspace'
  };
  gate.normalizedBridgeRequest.access_path = 'direct local call';
  gate.normalizedBridgeRequest.runtime_target = 'codex-memory local memory';
  gate.normalizedBridgeRequest.runtime_target_kind = 'local_memory';
  gate.normalizedBridgeRequest.runtime_target_source_authority = 'tool_payload';
  gate.normalizedBridgeRequest.runtime_target_configured = false;
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.invocation_profile = 'governed_bounded_write';
  gate.normalizedBridgeRequest.invocation_profile_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.read_write_authority_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.disclosure_level = 'raw';
  gate.normalizedBridgeRequest.disclosure_max_items = 500;
  gate.normalizedBridgeRequest.disclosure_max_bytes = 65536;
  gate.normalizedBridgeRequest.disclosure_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.audit_receipt_required = false;
  gate.normalizedBridgeRequest.audit_receipt_low_disclosure = false;
  gate.normalizedBridgeRequest.audit_receipt_reference_present = false;
  gate.normalizedBridgeRequest.audit_receipt_reference_name = 'https://PRIVATE_RECEIPT_SHOULD_NOT_ECHO';
  gate.normalizedBridgeRequest.audit_receipt_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.rollback_posture = 'bounded_rollback_plan';
  gate.normalizedBridgeRequest.rollback_plan_reference_present = true;
  gate.normalizedBridgeRequest.rollback_plan_reference_safe = false;
  gate.normalizedBridgeRequest.rollback_plan_reference_name = null;
  gate.normalizedBridgeRequest.rollback_posture_forbidden_field_count = 2;

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
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
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.invocation_profile'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_level'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_max_items'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_max_bytes'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_required'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_low_disclosure'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_reference_present'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_reference_name'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_posture'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_plan_reference_present'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_plan_reference_safe'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_count'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(result).includes('PRIVATE_RECEIPT_SHOULD_NOT_ECHO'), false);
});

test('read delegation rejects forbidden disclosure audit and rollback evidence after forged gate acceptance', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.disclosure_forbidden_field_count = 1;
  gate.normalizedBridgeRequest.audit_receipt_forbidden_field_count = 1;
  gate.normalizedBridgeRequest.rollback_posture_forbidden_field_count = 1;

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_count'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(calls, 0);
});

test('read delegation rejects forbidden invocation profile and authority evidence after forged gate acceptance', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.invocation_profile_forbidden_field_count = 1;
  gate.normalizedBridgeRequest.read_write_authority_forbidden_field_count = 1;

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_count'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_count'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(calls, 0);
});

test('read delegation rejection low-disclosure projection drops unsafe forged governance strings', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.invocation_profile = 'https://PRIVATE_PROFILE_SHOULD_NOT_ECHO';
  gate.normalizedBridgeRequest.disclosure_level = 'https://PRIVATE_DISCLOSURE_SHOULD_NOT_ECHO';
  gate.normalizedBridgeRequest.rollback_posture = 'https://PRIVATE_ROLLBACK_SHOULD_NOT_ECHO';

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.equal(result.lowDisclosureProjection.invocationProfile, null);
  assert.equal(result.lowDisclosureProjection.disclosureLevel, null);
  assert.equal(result.lowDisclosureProjection.rollbackPosture, null);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DISCLOSURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_SHOULD_NOT_ECHO'), false);
});

test('read delegation rejects forged write authority after gate acceptance', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.read_allowed = false;
  gate.normalizedBridgeRequest.write_allowed = true;

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.read_allowed'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.write_allowed'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(calls, 0);
});

test('rejects read delegation when forged gate scope identifiers are unsafe', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.scope = {
    project_id: 'https://PRIVATE_PROJECT_SCOPE_SHOULD_NOT_ECHO',
    workspace_id: 'workspace-alpha',
    scope_id: 'file:///PRIVATE_SCOPE_ID_SHOULD_NOT_ECHO',
    client_id: 'Codex',
    visibility: 'private'
  };
  const delegated = buildDelegatedArguments('search_memory', {
    query: 'needle'
  }, gate);

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });
  const serialized = JSON.stringify({ result, delegated });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.project_id'));
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.scope.scope_id'));
  assert.equal(delegated.scope.project_id, undefined);
  assert.equal(delegated.scope.scope_id, undefined);
  assert.equal(delegated.scope.workspace_id, 'workspace-alpha');
  assert.equal(delegated.governed_bridge.scope.project_id, undefined);
  assert.equal(delegated.governed_bridge.scope.scope_id, undefined);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_PROJECT_SCOPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SCOPE_ID_SHOULD_NOT_ECHO'), false);
});

test('read delegated scope projection drops forged client id and visibility before native arguments', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.scope = {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'PRIVATE_CLIENT_SHOULD_NOT_ECHO',
    visibility: 'PRIVATE_VISIBILITY_SHOULD_NOT_ECHO'
  };
  const delegated = buildDelegatedArguments('search_memory', {
    query: 'needle'
  }, gate);

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
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
  assert.equal(serialized.includes('PRIVATE_CLIENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_VISIBILITY_SHOULD_NOT_ECHO'), false);
});

test('read governed bridge envelope projects forged governance fields before native arguments', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  Object.assign(gate.normalizedBridgeRequest, {
    client_id: 'PRIVATE_ENVELOPE_CLIENT_SHOULD_NOT_ECHO',
    visibility: 'PRIVATE_ENVELOPE_VISIBILITY_SHOULD_NOT_ECHO',
    runtime_target_kind: 'PRIVATE_ENVELOPE_TARGET_KIND_SHOULD_NOT_ECHO',
    runtime_target_source_authority: 'PRIVATE_ENVELOPE_SOURCE_SHOULD_NOT_ECHO',
    invocation_profile: 'PRIVATE_ENVELOPE_PROFILE_SHOULD_NOT_ECHO',
    disclosure_level: 'PRIVATE_ENVELOPE_DISCLOSURE_SHOULD_NOT_ECHO',
    rollback_posture: 'PRIVATE_ENVELOPE_ROLLBACK_SHOULD_NOT_ECHO'
  });
  const delegated = buildDelegatedArguments('search_memory', {
    query: 'needle'
  }, gate);

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
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
  assert.equal(envelope.disclosure_level, null);
  assert.equal(envelope.rollback_posture, null);
  assert.equal(result.accepted, false);
  assert.equal(calls, 0);
  assert.equal(serialized.includes('PRIVATE_ENVELOPE_'), false);
});

test('rejects read delegation when trusted execution context checks did not survive gate', async () => {
  let calls = 0;
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.trusted_execution_context_supplied = false;
  gate.normalizedBridgeRequest.trusted_execution_context_accepted = false;
  gate.normalizedBridgeRequest.trusted_execution_context_scope_matched = false;

  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {},
    gateResult: gate,
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
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
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(calls, 0);
});

test('rejects read delegation when gate mcp tool name does not match actual tool', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'audit_memory',
    args: {},
    gateResult: gateResult('search_memory'),
    callMcpTool: async () => {
      calls += 1;
      return {};
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_native_read_delegation_boundary');
  assert.ok(result.invalidFields.includes('gateResult.normalizedBridgeRequest.mcp_tool_name'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(calls, 0);
});

test('rejects native read responses that exceed the governed output item budget', async () => {
  let calls = 0;
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      limit: 10
    },
    gateResult: gateResult('search_memory'),
    callMcpTool: receiptAwareCallMcpTool(async payload => {
      calls += 1;
      assert.equal(payload.arguments.limit, 5);
      return {
        results: [
          { content: 'RAW_PRIVATE_CONTENT_1_SHOULD_NOT_ECHO' },
          { content: 'RAW_PRIVATE_CONTENT_2_SHOULD_NOT_ECHO' },
          { content: 'RAW_PRIVATE_CONTENT_3_SHOULD_NOT_ECHO' },
          { content: 'RAW_PRIVATE_CONTENT_4_SHOULD_NOT_ECHO' },
          { content: 'RAW_PRIVATE_CONTENT_5_SHOULD_NOT_ECHO' },
          { content: 'RAW_PRIVATE_CONTENT_6_SHOULD_NOT_ECHO' }
        ]
      };
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(calls, 1);
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_output_budget_exceeded');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryReadPerformed, true);
  assert.equal(result.localMemoryFallbackEligible, false);
  assert.equal(result.receipt.outputBudgetExceeded, true);
  assert.equal(result.receipt.itemCountBucket, 'over_budget_many');
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_1_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_6_SHOULD_NOT_ECHO'), false);
});

test('rejects native read responses that exceed the governed output byte budget', async () => {
  const gate = gateResult('search_memory');
  gate.normalizedBridgeRequest.disclosure_max_bytes = 64;
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      limit: 1
    },
    gateResult: gate,
    callMcpTool: receiptAwareCallMcpTool(async () => ({
      results: [{
        content: 'RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO_'.repeat(8)
      }]
    }))
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_output_budget_exceeded');
  assert.equal(result.receipt.outputBudgetExceeded, true);
  assert.equal(result.receipt.itemCountBucket, 'one');
  assert.equal(result.receipt.byteCountBucket, 'over_budget');
  assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'), false);
});

test('rejected native delegation remains low-disclosure and fallback eligible', async () => {
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'memory_overview',
    args: {},
    gateResult: gateResult('memory_overview'),
    callMcpTool: receiptAwareCallMcpTool(async () => {
      const error = new Error('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO');
      error.statusClass = 'transport_error';
      throw error;
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_transport_error');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.vcpToolBoxCalled, true);
  assert.equal(result.mcpToolCalled, true);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.localMemoryFallbackEligible, true);
  assert.equal(result.receipt.nativeInvocationAttempted, true);
  assert.equal(result.receipt.nativeMcpToolInvocationAttempted, true);
  assert.equal(result.rawResponseBodyDisclosed, false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
});

test('native read error statusClass is whitelisted before reasonCode projection', async () => {
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'memory_overview',
    args: {},
    gateResult: gateResult('memory_overview'),
    callMcpTool: receiptAwareCallMcpTool(async () => {
      const error = new Error('PRIVATE_NATIVE_ERROR_MESSAGE_SHOULD_NOT_ECHO');
      error.statusClass = 'https://PRIVATE_ERROR_STATUS_SHOULD_NOT_ECHO';
      throw error;
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_transport_error');
  assert.equal(result.receipt.statusClass, 'transport_error');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.vcpToolBoxCalled, true);
  assert.equal(result.mcpToolCalled, true);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.localMemoryFallbackEligible, true);
  assert.equal(serialized.includes('PRIVATE_ERROR_STATUS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_ERROR_MESSAGE_SHOULD_NOT_ECHO'), false);
});

test('native read failure receipt tool and target must match actual delegation', async () => {
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    gateResult: gateResult('search_memory'),
    callMcpTool: receiptAwareCallMcpTool(async () => {
      const error = new Error('PRIVATE_NATIVE_READ_FAILURE_SHOULD_NOT_ECHO');
      error.statusClass = 'server_error';
      error.lowDisclosureReceipt = {
        targetReferenceName: 'other-safe-native-target-ref',
        targetKind: 'mcp_server',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        toolName: 'audit_memory',
        requestIdCategory: 'generated_bridge_request_id',
        jsonRpcResponseIdMatched: true,
        governanceMetadataPath: 'params._meta.codexMemoryGovernance',
        governanceMetadataSent: true,
        governanceMetadataRawValueDisclosed: false,
        statusClass: 'success',
        httpStatusClass: 'success',
        responseShapeCategory: 'array_item_count_bucket_only',
        topLevelKindCategory: 'array',
        endpoint: 'https://PRIVATE_NATIVE_READ_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO',
        token: 'PRIVATE_NATIVE_READ_RECEIPT_TOKEN_SHOULD_NOT_ECHO'
      };
      throw error;
    })
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_server_error');
  assert.equal(result.receipt.statusClass, 'server_error');
  assert.equal(result.localMemoryFallbackEligible, true);
  assert.equal(result.memoryReadPerformed, false);
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
  assert.equal(receipt.responseShapeCategory, null);
  assert.equal(receipt.topLevelKindCategory, null);
  assert.equal(serialized.includes('PRIVATE_NATIVE_READ_FAILURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_READ_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_READ_RECEIPT_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('native read invocation receipt buckets are whitelisted before returning to Codex', async () => {
  const callMcpTool = async () => {
    throw new Error('fallback call path should not run');
  };
  callMcpTool.callWithReceipt = async () => ({
    value: {
      results: []
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
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    gateResult: gateResult('search_memory'),
    callMcpTool
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryReadPerformed, true);
  assert.equal(result.localMemoryFallbackEligible, false);
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

test('native read invocation receipt tool and target must match actual delegation', async () => {
  const callMcpTool = async () => {
    throw new Error('fallback call path should not run');
  };
  callMcpTool.callWithReceipt = async () => ({
    value: {
      results: []
    },
    receipt: {
      targetReferenceName: 'other-safe-native-target-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'audit_memory',
      requestIdCategory: 'generated_bridge_request_id',
      statusClass: 'success',
      httpStatusClass: 'success',
      responseShapeCategory: 'array_item_count_bucket_only',
      topLevelKindCategory: 'array'
    }
  });
  const result = await executeGovernedMcpVcpNativeReadDelegation({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    gateResult: gateResult('search_memory'),
    callMcpTool
  });
  const serialized = JSON.stringify(result);
  const receipt = result.receipt.nativeInvocationReceipt;

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
  assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound');
  assert.equal(result.runtimeCalled, true);
  assert.equal(result.memoryReadPerformed, true);
  assert.equal(result.localMemoryFallbackEligible, false);
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
  assert.equal(receipt.jsonRpcErrorPresent, false);
  assert.equal(receipt.responseShapeCategory, null);
  assert.equal(receipt.topLevelKindCategory, null);
  assert.equal(serialized.includes('other-safe-native-target-ref'), false);
});

test('native read invocation receipt must bind JSON-RPC response and success status', async () => {
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
    const result = await executeGovernedMcpVcpNativeReadDelegation({
      toolName: 'search_memory',
      args: {
        query: 'needle'
      },
      gateResult: gateResult('search_memory'),
      callMcpTool: receiptAwareCallMcpTool(async () => ({
        results: [{ content: 'RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO' }]
      }), testCase.receiptOverrides)
    });
    const serialized = JSON.stringify(result);
    const receipt = result.receipt.nativeInvocationReceipt;
    const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(result.receipt);

    assert.equal(result.accepted, false, testCase.name);
    assert.equal(result.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound', testCase.name);
    assert.equal(result.receipt.statusClass, 'native_invocation_receipt_unbound', testCase.name);
    assert.equal(result.runtimeCalled, true, testCase.name);
    assert.equal(result.memoryReadPerformed, true, testCase.name);
    assert.equal(result.localMemoryFallbackEligible, false, testCase.name);
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
    assert.equal(serialized.includes('RAW_PRIVATE_CONTENT_SHOULD_NOT_ECHO'), false, testCase.name);
  }
});
