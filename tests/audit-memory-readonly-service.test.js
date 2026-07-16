const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  ACCESS_MODE,
  AuditMemoryReadonlyService,
  FORBIDDEN_OUTPUT_KEYS,
  SERVICE_STATUS_ACCEPTED,
  SERVICE_STATUS_REJECTED,
  ensureNoForbiddenOutputKeys
} = require('../src/core/AuditMemoryReadonlyService');
const {
  MUTATION_INPUT_KEYS
} = require('../src/core/AuditMemoryReadonlyToolDraft');
const {
  buildRequestedScopeAuditFilter,
  buildGovernedNativeBridgeAuditMemoryDecisionProvider,
  projectGovernedNativeAuditDecision,
  projectGovernedNativeBridgeAuditReceipt,
  projectGovernedNativeBridgeAuditReceiptDecision
} = require('../src/core/GovernedNativeBridgeAuditMemoryProjection');
const {
  validateGovernedMcpAuditMemoryBridgeFindingCoversCurrentProductGoal,
  validateGovernedMcpAuditMemoryReadFallbackFindingCoversLocalMemoryRole
} = require('../src/core/CurrentProductGoalContract');

function scopeFingerprint(scope) {
  const source = Object.keys(scope)
    .sort()
    .filter(key => ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id'].includes(key))
    .reduce((output, key) => {
      output[key] = scope[key];
      return output;
    }, {});
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(source), 'utf8')
    .digest('hex');
}

test('governed native audit scope filter canonicalizes both supported clients and rejects unknown clients', () => {
  assert.equal(buildRequestedScopeAuditFilter({
    client_id: 'claude',
    visibility: 'private'
  }).clientId, 'Claude');
  assert.equal(buildRequestedScopeAuditFilter({
    client_id: 'codex',
    visibility: 'private'
  }).clientId, 'Codex');
  assert.deepEqual(buildRequestedScopeAuditFilter({
    client_id: 'manual',
    visibility: 'private'
  }), { matchNone: true });
});

function governedBridgeReceiptEntry(overrides = {}) {
  const toolName = overrides.toolName || 'record_memory';
  const delegationDirection = overrides.delegationDirection || 'write';
  const write = delegationDirection === 'write';
  const exactApprovalActions = {
    record_memory: 'live_bridge_record_memory_proof',
    tombstone_memory: 'live_bridge_tombstone_memory_proof',
    supersede_memory: 'live_bridge_supersede_memory_proof'
  };
  return {
    eventType: 'governed_mcp_vcp_native_bridge_receipt',
    toolName,
    primaryRuntime: 'VCPToolBox native memory',
    delegationDirection,
    clientId: 'Codex',
    visibility: 'private',
    scopePresent: true,
    scopeIdentifierPresent: true,
    scopeFingerprint: 'a'.repeat(64),
    scopeFieldNames: ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id'],
    scopeIdentifierFieldNames: ['project_id', 'scope_id', 'workspace_id'],
    rawScopePersisted: false,
    clientIdentitySource: 'trusted_execution_context_or_transport',
    clientIdentityBound: true,
    scopeBoundarySource: 'trusted_execution_context_or_transport',
    scopeBoundaryBound: true,
    visibilityBound: true,
    trustedExecutionContextSupplied: true,
    trustedExecutionContextAccepted: true,
    trustedExecutionContextScopeMatched: true,
    invocationProfile: write ? 'governed_bounded_write' : 'governed_read_only',
    invocationProfileSource: 'bridge_tool_binding',
    invocationProfileBound: true,
    readAllowed: !write,
    writeAllowed: write,
    writePolicy: write ? 'exact_approval' : 'read_only',
    writeRequiresExactApproval: write,
    readWriteAuthoritySource: 'bridge_tool_binding',
    readWriteAuthorityBound: true,
    mixedReadWriteAllowed: false,
    unboundedWriteAllowed: false,
    exactApprovalAction: write ? exactApprovalActions[toolName] : null,
    exactApprovalActionMatched: write,
    exactApprovalScopeMatched: write,
    exactApprovalRuntimeTargetMatched: write,
    exactApprovalRollbackPlanMatched: write,
    exactApprovalScopeReferencesSafe: write,
    exactApprovalScopeVisibilityAccepted: write,
    exactApprovalRuntimeTargetReferenceSafe: write,
    exactApprovalRuntimeTargetKindAccepted: write,
    exactApprovalRuntimeTargetPrimaryRuntimeAccepted: write,
    exactApprovalRollbackPlanReferencePresent: write,
    exactApprovalRollbackPlanReferenceSafe: write,
    exactApprovalForbiddenFieldCount: 0,
    runtimeTargetKind: 'mcp_server',
    runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
    runtimeTargetBound: true,
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    disclosureLevel: 'summary',
    outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
    outputDisclosureBudgetBound: true,
    disclosureMaxItems: 5,
    disclosureMaxBytes: 4096,
    disclosureForbiddenFieldCount: 0,
    rawOutputAllowed: false,
    auditReceiptRequired: true,
    auditReceiptSource: 'bridge_gate_normalized_governance',
    auditReceiptLowDisclosure: true,
    auditReceiptLowDisclosureBound: true,
    bridgeReceiptLowDisclosure: true,
    localMemoryRole: 'not_used',
    localMemorySourceRuntime: null,
    localMemoryPrimaryRuntime: false,
    localMemoryFallbackUsed: false,
    localMemoryResultReturned: false,
    localMemoryResultCanBeMistakenForVcpNative: false,
    localMemoryRawContentDisclosed: false,
    auditReceiptReferencePresent: true,
    auditReceiptReferenceSafe: true,
    auditReceiptReferenceName: `governed-mcp-${toolName}-receipt`,
    auditReceiptForbiddenFieldCount: 0,
    rollbackPosture: write ? 'bounded_rollback_plan' : 'read_only_no_write',
    rollbackPostureSource: 'bridge_gate_normalized_governance',
    rollbackPostureForbiddenFieldCount: 0,
    rollbackPlanReferencePresent: write,
    rollbackPlanReferenceSafe: write,
    rollbackWritePostureBound: write,
    rollbackReadPostureBound: !write,
    rollbackPostureBound: true,
    rollbackPlanBound: write,
    rollbackPlanShapeOnly: write,
    rollbackRequired: false,
    rollbackReasonCode: null,
    rollbackDisposition: write ? 'no_rollback_required' : 'no_runtime_write_to_rollback',
    rollbackFollowupRequired: false,
    rollbackApplyPolicy: 'not_applicable',
    rollbackApplyAttempted: false,
    rollbackAutoApplyAllowed: false,
    rollbackRawPlanDisclosed: false,
    rollbackRawPlanPersisted: false,
    transportCategory: 'local_http_transport',
    mcpMethod: 'tools/call',
    nativeInvocationToolName: toolName,
    nativeInvocationStatusClass: 'success',
    nativeInvocationHttpStatusClass: 'success',
    nativeInvocationResponseShapeCategory: 'object_top_level_kind_only_no_field_names',
    nativeInvocationAttempted: true,
    nativeMcpToolInvocationAttempted: true,
    nativeInvocationReceiptBindingMatched: true,
    nativeInvocationGovernanceMetadataPath: 'params._meta.codexMemoryGovernance',
    nativeInvocationGovernanceMetadataSent: true,
    nativeInvocationGovernanceMetadataRawValueDisclosed: false,
    nativeInvocationRequestIdCategory: 'generated_bridge_request_id',
    nativeInvocationJsonRpcResponseIdMatched: true,
    nativeInvocationJsonRpcErrorPresent: false,
    nativeInvocationJsonRpcErrorReasonCode: null,
    memoryReadPerformed: !write,
    memoryWritePerformed: write,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    memoryContentDisclosed: false,
    readinessClaimed: false,
    ...overrides
  };
}

function governedReadFallbackReceiptEntry(overrides = {}) {
  return {
    eventType: 'governed_mcp_vcp_native_read_fallback_receipt',
    toolName: 'search_memory',
    delegationDirection: 'read',
    clientId: 'Codex',
    visibility: 'private',
    scopePresent: true,
    scopeIdentifierPresent: true,
    scopeFingerprint: 'd'.repeat(64),
    scopeFieldNames: ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id'],
    scopeIdentifierFieldNames: ['project_id', 'scope_id', 'workspace_id'],
    rawScopePersisted: false,
    primaryRuntime: 'VCPToolBox native memory',
    localMemoryRole: 'fallback',
    localMemorySourceRuntime: 'codex_memory_local_fallback',
    localMemoryFallbackAuthorized: true,
    localMemoryFallbackUsed: false,
    localMemoryFallbackReadPerformed: false,
    localMemoryFallbackReturned: false,
    fallbackReasonCode: 'native_read_delegation_transport_error',
    fallbackRequiresAuditReceipt: true,
    fallbackAfterAuditReceiptAppended: true,
    bridgeAuditReceiptStatus: 'appended',
    bridgeAuditReceiptAppended: true,
    nativeRuntimeCalled: true,
    nativeMcpToolCalled: true,
    nativeInvocationAttempted: true,
    nativeMcpToolInvocationAttempted: true,
    nativeMemoryReadPerformed: false,
    nativeStatusClass: 'transport_error',
    nativeResponseShapeCategory: 'not_consumed',
    nativeTopLevelKindCategory: 'not_consumed',
    nativeItemCountBucket: 'not_consumed',
    nativeByteCountBucket: 'not_consumed',
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    lowDisclosure: true,
    fallbackReceiptLowDisclosure: true,
    rawNativeOutputReturned: false,
    rawNativeMemoryReturned: false,
    rawFallbackMemoryPersisted: false,
    rawFallbackMemoryReturned: false,
    tokenMaterialDisclosed: false,
    endpointDisclosed: false,
    memoryContentDisclosed: false,
    memoryIdsDisclosed: false,
    nativeFieldNamesDisclosed: false,
    readinessClaimed: false,
    ...overrides
  };
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

const CM1507_FORBIDDEN_OUTPUT_KEYS = Object.freeze([
  ...FORBIDDEN_OUTPUT_KEYS,
  'apiKey',
  'api_key',
  'bearer',
  'bearerToken',
  'providerPayload',
  'providerApi',
  'providerAPI',
  'requestHeaders',
  'authorizationHeader'
]);

const CM1507_PRIVATE_FIXTURE_VALUES = Object.freeze([
  'cm1507-memory-id-must-not-leak',
  'cm1507-title-must-not-leak',
  'cm1507-content-must-not-leak',
  'cm1507-snippet-must-not-leak',
  'A:/cm1507/must/not/leak',
  'cm1507-raw-audit-must-not-leak',
  'cm1507-provider-url-must-not-leak',
  'cm1507-provider-payload-must-not-leak',
  'cm1507-api-key-must-not-leak',
  'cm1507-bearer-token-must-not-leak',
  'cm1507-authorization-must-not-leak'
]);

function assertNoCm1507PrivateFixtureLeak(report) {
  const outputKeys = collectKeys(report);
  for (const forbidden of CM1507_FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(outputKeys.includes(forbidden), false, forbidden);
  }

  const serialized = JSON.stringify(report);
  for (const value of CM1507_PRIVATE_FIXTURE_VALUES) {
    assert.equal(serialized.includes(value), false, value);
  }
}

test('CM1460 audit_memory readonly service returns bounded empty projection by default', async () => {
  const service = new AuditMemoryReadonlyService();
  const report = await service.run({
    audit_family: 'all',
    window: 50,
    include_raw: false
  });

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.access.mode, ACCESS_MODE);
  assert.equal(report.access.selectedProjection, true);
  assert.equal(report.access.rawMemoryReturned, false);
  assert.equal(report.access.rawAuditReturned, false);
  assert.equal(report.access.filesystemPathsReturned, false);
  assert.equal(report.access.tokenMaterialReturned, false);
  assert.equal(report.access.providerPayloadReturned, false);
  assert.equal(report.access.memoryIdsReturned, false);
  assert.equal(report.access.titlesReturned, false);
  assert.equal(report.access.snippetsReturned, false);
  assert.equal(report.access.contentReturned, false);
  assert.deepEqual(report.summary, {
    requestedFamily: 'all',
    window: 50,
    visibleDecisionCount: 0,
    hiddenDecisionCount: 0,
    suppressedDecisionCount: 0
  });
  assert.equal(report.policy.lifecyclePolicyExplained, true);
  assert.equal(report.policy.scopePolicyExplained, true);
  assert.equal(report.policy.redactionApplied, true);
  assert.equal(report.policy.rawAuditScanPerformed, false);
  assert.equal(report.policy.providerCalled, false);
  assert.equal(report.policy.durableMutationPerformed, false);
  assert.equal(report.policy.publicMcpExpanded, false);
  assert.equal(report.policy.readinessClaimed, false);
  assert.equal(report.policy.rcReadyClaimed, false);
  assert.deepEqual(report.findings, []);
  ensureNoForbiddenOutputKeys(report);
});

test('CM1460 audit_memory readonly service aggregates explicit safe decisions only', async () => {
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => [
      {
        auditFamily: 'write',
        decision: 'visible',
        reasonCode: 'scope_visible',
        lifecyclePolicy: 'active_visible',
        scopePolicy: 'project_scope_match',
        memoryId: 'must-not-leak',
        title: 'must-not-leak',
        content: 'must-not-leak',
        filePath: 'A:/must/not/leak'
      },
      {
        auditFamily: 'recall',
        decision: 'hidden',
        reasonCode: 'lifecycle_hidden',
        lifecyclePolicy: 'tombstoned_hidden',
        scopePolicy: 'scope_match'
      },
      {
        auditFamily: 'governance',
        decision: 'suppressed',
        reasonCode: 'scope_suppressed',
        lifecyclePolicy: 'active',
        scopePolicy: 'private_cross_client_blocked'
      }
    ]
  });
  const report = await service.run({
    audit_family: 'all',
    window: 10,
    include_raw: false
  });

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.summary.visibleDecisionCount, 1);
  assert.equal(report.summary.hiddenDecisionCount, 1);
  assert.equal(report.summary.suppressedDecisionCount, 1);
  assert.deepEqual(report.findings, [
    {
      auditFamily: 'write',
      decision: 'visible',
      reasonCode: 'scope_visible',
      lifecyclePolicy: 'active_visible',
      scopePolicy: 'project_scope_match',
      redacted: true
    },
    {
      auditFamily: 'recall',
      decision: 'hidden',
      reasonCode: 'lifecycle_hidden',
      lifecyclePolicy: 'tombstoned_hidden',
      scopePolicy: 'scope_match',
      redacted: true
    },
    {
      auditFamily: 'governance',
      decision: 'suppressed',
      reasonCode: 'scope_suppressed',
      lifecyclePolicy: 'active',
      scopePolicy: 'private_cross_client_blocked',
      redacted: true
    }
  ]);

  const outputKeys = collectKeys(report);
  for (const forbidden of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(outputKeys.includes(forbidden), false, forbidden);
  }
});

test('CM1460 audit_memory readonly service rejects raw unbounded and mutation-like inputs', async () => {
  const service = new AuditMemoryReadonlyService();
  const raw = await service.run({
    audit_family: 'raw',
    window: 201,
    include_raw: true
  });

  assert.equal(raw.status, SERVICE_STATUS_REJECTED);
  assert.equal(raw.accepted, false);
  assert.deepEqual(raw.blockerReasons, [
    'include_raw_not_allowed',
    'audit_family_not_allowed',
    'window_out_of_bounds'
  ]);
  assert.equal(raw.access.rawAuditReturned, false);
  assert.equal(raw.policy.durableMutationPerformed, false);

  for (const key of MUTATION_INPUT_KEYS) {
    const report = await service.run({
      audit_family: 'governance',
      window: 10,
      include_raw: false,
      [key]: true
    });
    assert.equal(report.status, SERVICE_STATUS_REJECTED, key);
    assert.deepEqual(report.blockerReasons, ['mutation_input_not_allowed'], key);
  }
});

test('CM1460 audit_memory readonly service does not call provider fetch or mutate DB-like input', async () => {
  const oldFetch = global.fetch;
  let fetchCalls = 0;
  const mutable = {
    changed: false,
    update() {
      this.changed = true;
    }
  };

  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error('provider must not be called');
  };

  try {
    const service = new AuditMemoryReadonlyService({
      decisionProvider: () => [
        {
          auditFamily: 'write',
          decision: 'visible',
          reasonCode: mutable.changed ? 'mutated' : 'not_mutated',
          lifecyclePolicy: 'active',
          scopePolicy: 'scope_match'
        }
      ]
    });
    const report = await service.run({ audit_family: 'write', window: 1, include_raw: false });

    assert.equal(fetchCalls, 0);
    assert.equal(mutable.changed, false);
    assert.equal(report.policy.providerCalled, false);
    assert.equal(report.policy.durableMutationPerformed, false);
    assert.equal(report.findings[0].reasonCode, 'not_mutated');
  } finally {
    global.fetch = oldFetch;
  }
});

test('CM1460 audit_memory readonly output key guard rejects forbidden keys recursively', () => {
  assert.throws(
    () => ensureNoForbiddenOutputKeys({ findings: [{ nested: { memoryId: 'x' } }] }),
    /Forbidden audit_memory output key/
  );
});

test('audit_memory governed native decision provider filters receipts by requested scope fingerprint', async () => {
  const requestedScope = {
    client_id: 'codex',
    project_id: 'codex-memory',
    visibility: 'private',
    workspace_id: 'workspace-alpha'
  };
  const canonicalMatchingScope = {
    client_id: 'Codex',
    project_id: 'codex-memory',
    visibility: 'private',
    workspace_id: 'workspace-alpha'
  };
  const otherScope = {
    client_id: 'Codex',
    project_id: 'other-project',
    visibility: 'private',
    workspace_id: 'workspace-alpha'
  };
  const matchingScopeFingerprint = scopeFingerprint(canonicalMatchingScope);
  const otherScopeFingerprint = scopeFingerprint(otherScope);
  const baseEntry = governedBridgeReceiptEntry({
    toolName: 'search_memory',
    delegationDirection: 'read',
    scopeFieldNames: ['client_id', 'project_id', 'visibility', 'workspace_id'],
    scopeIdentifierFieldNames: ['project_id', 'workspace_id'],
    auditReceiptReferencePresent: true,
    auditReceiptReferenceSafe: true,
    auditReceiptReferenceName: 'cm-governed-read-receipt',
    rollbackPosture: 'read_only_no_write'
  });
  const fallbackEntry = governedReadFallbackReceiptEntry({
    scopeFieldNames: ['client_id', 'project_id', 'visibility', 'workspace_id'],
    scopeIdentifierFieldNames: ['project_id', 'workspace_id'],
    scopeFingerprint: matchingScopeFingerprint
  });
  const entries = [
    {
      ...baseEntry,
      scopeFingerprint: matchingScopeFingerprint,
      auditReceiptReferenceName: 'cm-governed-read-matching-receipt'
    },
    {
      ...baseEntry,
      scopeFingerprint: otherScopeFingerprint,
      auditReceiptReferenceName: 'cm-governed-read-other-project-receipt'
    },
    fallbackEntry
  ];
  const provider = buildGovernedNativeBridgeAuditMemoryDecisionProvider({
    auditLogStore: {
      async readRecentWriteAudit(window) {
        assert.equal(window, 200);
        return entries;
      }
    }
  });

  const decisions = await provider({
    auditFamily: 'governance',
    window: 10,
    scope: requestedScope
  });
  const serialized = JSON.stringify(decisions);

  assert.equal(decisions.length, 2);
  assert.deepEqual(decisions.map(decision => decision.reasonCode), [
    'governed_native_bridge_audit_receipt',
    'governed_native_read_fallback_audit_receipt'
  ]);
  assert.equal(
    decisions[0].governedNativeBridgeReceipt.auditReceiptReferenceName,
    'cm-governed-read-matching-receipt'
  );
  assert.equal(decisions[0].governedNativeBridgeReceipt.scopeFingerprintPresent, true);
  assert.equal(decisions[1].governedNativeReadFallbackReceipt.scopeFingerprintPresent, true);
  assert.equal(serialized.includes('cm-governed-read-other-project-receipt'), false);
  assert.equal(serialized.includes(matchingScopeFingerprint), false);
  assert.equal(serialized.includes(otherScopeFingerprint), false);
  assert.equal(serialized.includes('other-project'), false);

  const unsafeScopeDecisions = await provider({
    auditFamily: 'governance',
    window: 10,
    scope: {
      ...requestedScope,
      project_id: 'https://raw-project-scope-should-not-match'
    }
  });
  assert.deepEqual(unsafeScopeDecisions, []);

  const requestedScopeIdScope = {
    client_id: 'codex',
    scope_id: 'scope-alpha',
    visibility: 'private'
  };
  const canonicalScopeIdScope = {
    client_id: 'Codex',
    scope_id: 'scope-alpha',
    visibility: 'private'
  };
  const otherScopeIdScope = {
    client_id: 'Codex',
    scope_id: 'scope-beta',
    visibility: 'private'
  };
  const matchingScopeIdFingerprint = scopeFingerprint(canonicalScopeIdScope);
  const otherScopeIdFingerprint = scopeFingerprint(otherScopeIdScope);
  const scopeIdProvider = buildGovernedNativeBridgeAuditMemoryDecisionProvider({
    auditLogStore: {
      async readRecentWriteAudit(window) {
        assert.equal(window, 200);
        return [
          {
            ...baseEntry,
            scopeFieldNames: ['client_id', 'scope_id', 'visibility'],
            scopeIdentifierFieldNames: ['scope_id'],
            scopeFingerprint: matchingScopeIdFingerprint,
            auditReceiptReferenceName: 'cm-governed-read-scope-id-receipt'
          },
          {
            ...baseEntry,
            scopeFieldNames: ['client_id', 'scope_id', 'visibility'],
            scopeIdentifierFieldNames: ['scope_id'],
            scopeFingerprint: otherScopeIdFingerprint,
            auditReceiptReferenceName: 'cm-governed-read-other-scope-id-receipt'
          }
        ];
      }
    }
  });

  const scopeIdDecisions = await scopeIdProvider({
    auditFamily: 'governance',
    window: 10,
    scope: requestedScopeIdScope
  });
  const serializedScopeIdDecisions = JSON.stringify(scopeIdDecisions);

  assert.equal(scopeIdDecisions.length, 1);
  assert.equal(
    scopeIdDecisions[0].governedNativeBridgeReceipt.auditReceiptReferenceName,
    'cm-governed-read-scope-id-receipt'
  );
  assert.deepEqual(scopeIdDecisions[0].governedNativeBridgeReceipt.scopeFieldNames, [
    'client_id',
    'scope_id',
    'visibility'
  ]);
  assert.equal(serializedScopeIdDecisions.includes('cm-governed-read-other-scope-id-receipt'), false);
  assert.equal(serializedScopeIdDecisions.includes('scope-alpha'), false);
  assert.equal(serializedScopeIdDecisions.includes('scope-beta'), false);
});

test('audit_memory governed native projection hides receipts missing current goal coverage', async () => {
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => [
      projectGovernedNativeAuditDecision(governedBridgeReceiptEntry({
        outputDisclosureBudgetBound: false,
        nativeInvocationGovernanceMetadataRawValueDisclosed: true,
        rawResponseBody: 'RAW_INVALID_BRIDGE_RECEIPT_SHOULD_NOT_LEAK'
      })),
      projectGovernedNativeAuditDecision(governedBridgeReceiptEntry({
        statusClass: 'success',
        nativeInvocationJsonRpcResponseIdMatched: false,
        rawResponseBody: 'RAW_FORGED_NATIVE_INVOCATION_BINDING_SHOULD_NOT_LEAK'
      })),
      projectGovernedNativeAuditDecision(governedReadFallbackReceiptEntry({
        bridgeAuditReceiptStatus: 'not_appended',
        bridgeAuditReceiptAppended: false,
        privateFallbackContent: 'RAW_INVALID_FALLBACK_RECEIPT_SHOULD_NOT_LEAK'
      })),
      projectGovernedNativeAuditDecision(governedReadFallbackReceiptEntry({
        fallbackReasonCode: null,
        nativeStatusClass: null,
        nativeRuntimeCalled: false,
        nativeMcpToolCalled: false,
        nativeInvocationAttempted: false,
        nativeMcpToolInvocationAttempted: false,
        privateFallbackContent: 'RAW_FORGED_FALLBACK_AUTHORIZATION_SHOULD_NOT_LEAK'
      }))
    ].filter(Boolean)
  });

  const report = await service.run({
    audit_family: 'governance',
    window: 5,
    include_raw: false
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.summary.visibleDecisionCount, 0);
  assert.deepEqual(report.findings, []);
  assert.equal(serialized.includes('RAW_INVALID_BRIDGE_RECEIPT_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('RAW_FORGED_NATIVE_INVOCATION_BINDING_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('RAW_INVALID_FALLBACK_RECEIPT_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('RAW_FORGED_FALLBACK_AUTHORIZATION_SHOULD_NOT_LEAK'), false);
});

test('CM1507 audit_memory readonly projection strips raw private provider token fixture fields', async () => {
  let providerCalls = 0;
  const oldFetch = global.fetch;

  global.fetch = async () => {
    providerCalls += 1;
    throw new Error('provider must not be called');
  };

  try {
    const service = new AuditMemoryReadonlyService({
      decisionProvider: () => [
        {
          auditFamily: 'write',
          decision: 'visible',
          reasonCode: 'scope_visible',
          lifecyclePolicy: 'active_visible',
          scopePolicy: 'project_scope_match',
          memoryId: 'cm1507-memory-id-must-not-leak',
          title: 'cm1507-title-must-not-leak',
          content: 'cm1507-content-must-not-leak',
          snippet: 'cm1507-snippet-must-not-leak',
          filePath: 'A:/cm1507/must/not/leak',
          rawAudit: 'cm1507-raw-audit-must-not-leak',
          providerUrl: 'cm1507-provider-url-must-not-leak',
          providerPayload: 'cm1507-provider-payload-must-not-leak',
          apiKey: 'cm1507-api-key-must-not-leak',
          bearerToken: 'cm1507-bearer-token-must-not-leak',
          authorization: 'cm1507-authorization-must-not-leak'
        }
      ]
    });

    const report = await service.run({
      audit_family: 'write',
      window: 1,
      include_raw: false
    });

    assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
    assert.equal(report.access.mode, ACCESS_MODE);
    assert.equal(report.access.selectedProjection, true);
    assert.equal(report.access.rawMemoryReturned, false);
    assert.equal(report.access.rawAuditReturned, false);
    assert.equal(report.access.filesystemPathsReturned, false);
    assert.equal(report.access.tokenMaterialReturned, false);
    assert.equal(report.access.providerPayloadReturned, false);
    assert.equal(report.access.memoryIdsReturned, false);
    assert.equal(report.policy.rawAuditScanPerformed, false);
    assert.equal(report.policy.providerCalled, false);
    assert.equal(report.policy.durableMutationPerformed, false);
    assert.equal(providerCalls, 0);
    assert.deepEqual(report.findings, [
      {
        auditFamily: 'write',
        decision: 'visible',
        reasonCode: 'scope_visible',
        lifecyclePolicy: 'active_visible',
        scopePolicy: 'project_scope_match',
        redacted: true
      }
    ]);
    assertNoCm1507PrivateFixtureLeak(report);
  } finally {
    global.fetch = oldFetch;
  }
});

test('CM1507 audit_memory rejected path stays low-disclosure and no-mutation', async () => {
  const service = new AuditMemoryReadonlyService();
  const report = await service.run({
    audit_family: 'raw',
    window: 999,
    include_raw: true,
    write: true,
    bearerToken: 'cm1507-bearer-token-must-not-leak',
    providerPayload: 'cm1507-provider-payload-must-not-leak',
    rawAudit: 'cm1507-raw-audit-must-not-leak'
  });

  assert.equal(report.status, SERVICE_STATUS_REJECTED);
  assert.equal(report.accepted, false);
  assert.deepEqual(report.blockerReasons, [
    'include_raw_not_allowed',
    'audit_family_not_allowed',
    'window_out_of_bounds',
    'mutation_input_not_allowed'
  ]);
  assert.equal(report.access.selectedProjection, true);
  assert.equal(report.access.rawMemoryReturned, false);
  assert.equal(report.access.rawAuditReturned, false);
  assert.equal(report.access.filesystemPathsReturned, false);
  assert.equal(report.access.tokenMaterialReturned, false);
  assert.equal(report.access.providerPayloadReturned, false);
  assert.equal(report.policy.rawAuditScanPerformed, false);
  assert.equal(report.policy.providerCalled, false);
  assert.equal(report.policy.durableMutationPerformed, false);
  assert.deepEqual(report.findings, []);
  assertNoCm1507PrivateFixtureLeak(report);
});

test('audit_memory projects governed native bridge audit receipts without raw payload disclosure', async () => {
  const rawPrivateValues = [
    'RAW_SCOPE_PROJECT_SHOULD_NOT_LEAK',
    'https://127.0.0.1:65535/private-native-endpoint',
    'secret-native-bearer-token',
    'RAW_NATIVE_REQUEST_BODY',
    'RAW_NATIVE_RESPONSE_BODY',
    'RAW_MEMORY_CONTENT_SHOULD_NOT_LEAK'
  ];
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => [
      projectGovernedNativeAuditDecision({
        eventType: 'governed_mcp_vcp_native_bridge_receipt',
        toolName: 'record_memory',
        primaryRuntime: 'VCPToolBox native memory',
        delegationDirection: 'write',
        clientId: 'Codex',
        visibility: 'private',
        scopePresent: true,
        scopeIdentifierPresent: true,
        scopeFingerprint: 'a'.repeat(64),
        scopeFieldNames: ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id'],
        scopeIdentifierFieldNames: ['project_id', 'scope_id', 'workspace_id'],
        rawScopePersisted: false,
        clientIdentitySource: 'trusted_execution_context_or_transport',
        clientIdentityBound: true,
        scopeBoundarySource: 'trusted_execution_context_or_transport',
        scopeBoundaryBound: true,
        visibilityBound: true,
        trustedExecutionContextSupplied: true,
        trustedExecutionContextAccepted: true,
        trustedExecutionContextScopeMatched: true,
        invocationProfile: 'governed_bounded_write',
        invocationProfileSource: 'bridge_tool_binding',
        invocationProfileBound: true,
        readAllowed: false,
        writeAllowed: true,
        writePolicy: 'exact_approval',
        writeRequiresExactApproval: true,
        readWriteAuthoritySource: 'bridge_tool_binding',
        readWriteAuthorityBound: true,
        exactApprovalAction: 'live_bridge_record_memory_proof',
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
        exactApprovalForbiddenFieldCount: 0,
        runtimeTargetKind: 'mcp_server',
        runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
        runtimeTargetBound: true,
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        disclosureLevel: 'summary',
        outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
        outputDisclosureBudgetBound: true,
        disclosureMaxItems: 5,
        disclosureMaxBytes: 4096,
        disclosureForbiddenFieldCount: 0,
        rawOutputAllowed: false,
        auditReceiptRequired: true,
        auditReceiptSource: 'bridge_gate_normalized_governance',
        auditReceiptLowDisclosure: true,
        auditReceiptLowDisclosureBound: true,
        bridgeReceiptLowDisclosure: true,
        localMemoryRole: 'not_used',
        auditReceiptReferencePresent: true,
        auditReceiptReferenceSafe: true,
        auditReceiptReferenceName: 'governed-mcp-record_memory-receipt',
        auditReceiptForbiddenFieldCount: 0,
        rollbackPosture: 'bounded_rollback_plan',
        rollbackPostureSource: 'bridge_gate_normalized_governance',
        rollbackPostureForbiddenFieldCount: 0,
        rollbackPlanReferencePresent: true,
        rollbackPlanReferenceSafe: true,
        rollbackWritePostureBound: true,
        rollbackPostureBound: true,
        rollbackPlanBound: true,
        rollbackPlanShapeOnly: true,
        rollbackRequired: false,
        rollbackDisposition: 'no_rollback_required',
        rollbackFollowupRequired: false,
        rollbackApplyPolicy: 'not_applicable',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        nativeInvocationToolName: 'record_memory',
        nativeInvocationStatusClass: 'success',
        nativeInvocationHttpStatusClass: 'success',
        nativeInvocationResponseShapeCategory: 'object_top_level_kind_only_no_field_names',
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        nativeInvocationReceiptBindingMatched: true,
        nativeInvocationGovernanceMetadataPath: 'params._meta.codexMemoryGovernance',
        nativeInvocationGovernanceMetadataSent: true,
        nativeInvocationGovernanceMetadataRawValueDisclosed: false,
        nativeInvocationRequestIdCategory: 'generated_bridge_request_id',
        nativeInvocationJsonRpcResponseIdMatched: true,
        nativeInvocationJsonRpcErrorPresent: false,
        memoryReadPerformed: false,
        memoryWritePerformed: true,
        endpoint: rawPrivateValues[1],
        bearerToken: rawPrivateValues[2],
        rawRequestBody: rawPrivateValues[3],
        rawResponseBody: rawPrivateValues[4],
        content: rawPrivateValues[5]
      })
    ]
  });

  const report = await service.run({
    audit_family: 'governance',
    window: 5,
    include_raw: false
  });
  const receipt = report.findings[0].governedNativeBridgeReceipt;
  const coverage = validateGovernedMcpAuditMemoryBridgeFindingCoversCurrentProductGoal(report.findings[0]);
  const serialized = JSON.stringify(report);

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.policy.governedNativeBridgeAuditReceiptProjection, true);
  assert.equal(report.summary.visibleDecisionCount, 1);
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(receipt.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(receipt.clientId, 'Codex');
  assert.equal(receipt.visibility, 'private');
  assert.equal(receipt.scopeFingerprintPresent, true);
  assert.deepEqual(receipt.scopeIdentifierFieldNames, ['project_id', 'scope_id', 'workspace_id']);
  assert.equal(receipt.rawScopePersisted, false);
  assert.equal(receipt.invocationProfile, 'governed_bounded_write');
  assert.equal(receipt.writePolicy, 'exact_approval');
  assert.equal(receipt.exactApprovalScopeReferencesSafe, true);
  assert.equal(receipt.exactApprovalScopeVisibilityAccepted, true);
  assert.equal(receipt.exactApprovalRuntimeTargetReferenceSafe, true);
  assert.equal(receipt.exactApprovalRuntimeTargetKindAccepted, true);
  assert.equal(receipt.exactApprovalRuntimeTargetPrimaryRuntimeAccepted, true);
  assert.equal(receipt.exactApprovalRollbackPlanReferencePresent, true);
  assert.equal(receipt.exactApprovalRollbackPlanReferenceSafe, true);
  assert.equal(receipt.rollbackPlanBound, true);
  assert.equal(receipt.rawOutputAllowed, false);
  assert.equal(receipt.auditReceiptRequired, true);
  assert.equal(receipt.auditReceiptLowDisclosure, true);
  assert.equal(receipt.bridgeReceiptLowDisclosure, true);
  assert.equal(receipt.auditReceiptReferencePresent, true);
  assert.equal(receipt.auditReceiptReferenceSafe, true);
  assert.equal(receipt.auditReceiptForbiddenFieldCount, 0);
  assert.equal(receipt.rollbackPostureForbiddenFieldCount, 0);
  assert.equal(receipt.rollbackPlanReferencePresent, true);
  assert.equal(receipt.rollbackPlanReferenceSafe, true);
  assert.equal(receipt.rollbackWritePostureBound, true);
  assert.equal(receipt.nativeInvocationAttempted, true);
  assert.equal(receipt.nativeInvocationRequestIdCategory, 'generated_bridge_request_id');
  assert.equal(receipt.nativeInvocationJsonRpcResponseIdMatched, true);
  assert.equal(receipt.nativeInvocationJsonRpcErrorPresent, false);
  assert.equal(receipt.nativeInvocationJsonRpcErrorReasonCode, null);
  assert.equal(receipt.memoryWritePerformed, true);
  assert.equal(receipt.rawRequestBodyPersisted, false);
  assert.equal(receipt.rawResponseBodyPersisted, false);
  assert.equal(receipt.tokenMaterialDisclosed, false);
  assert.equal(receipt.endpointDisclosed, false);
  assert.equal(receipt.readinessClaimed, false);
  for (const value of rawPrivateValues) {
    assert.equal(serialized.includes(value), false, value);
  }
  ensureNoForbiddenOutputKeys(report);
});

test('audit_memory projects governed native lifecycle write receipts with exact approval evidence', async () => {
  const lifecycleReceipts = [
    {
      toolName: 'tombstone_memory',
      exactApprovalAction: 'live_bridge_tombstone_memory_proof',
      auditReceiptReferenceName: 'governed-mcp-tombstone_memory-receipt',
      rollbackPosture: 'bounded_rollback_plan',
      rawValue: 'RAW_TOMBSTONE_MEMORY_ID_SHOULD_NOT_LEAK'
    },
    {
      toolName: 'supersede_memory',
      exactApprovalAction: 'live_bridge_supersede_memory_proof',
      auditReceiptReferenceName: 'governed-mcp-supersede_memory-receipt',
      rollbackPosture: 'mutation_cleanup_plan',
      rawValue: 'RAW_SUPERSEDE_MEMORY_PAIR_SHOULD_NOT_LEAK'
    }
  ];
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => lifecycleReceipts.map(receipt =>
      projectGovernedNativeBridgeAuditReceiptDecision(governedBridgeReceiptEntry({
        toolName: receipt.toolName,
        delegationDirection: 'write',
        scopeFingerprint: 'b'.repeat(64),
        exactApprovalAction: receipt.exactApprovalAction,
        auditReceiptReferenceName: receipt.auditReceiptReferenceName,
        rollbackPosture: receipt.rollbackPosture,
        nativeInvocationToolName: receipt.toolName,
        rawMemoryId: receipt.rawValue,
        rawRequestBody: receipt.rawValue,
        rawResponseBody: receipt.rawValue
      }))
    )
  });

  const report = await service.run({
    audit_family: 'governance',
    window: 5,
    include_raw: false
  });
  const receipts = report.findings.map(finding => finding.governedNativeBridgeReceipt);
  const serialized = JSON.stringify(report);

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.policy.governedNativeBridgeAuditReceiptProjection, true);
  assert.equal(report.summary.visibleDecisionCount, 2);
  assert.deepEqual(receipts.map(receipt => receipt.toolName), [
    'tombstone_memory',
    'supersede_memory'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.exactApprovalAction), [
    'live_bridge_tombstone_memory_proof',
    'live_bridge_supersede_memory_proof'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.nativeInvocationToolName), [
    'tombstone_memory',
    'supersede_memory'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.rollbackPosture), [
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ]);
  for (const receipt of receipts) {
    assert.equal(receipt.writePolicy, 'exact_approval');
    assert.equal(receipt.exactApprovalActionMatched, true);
    assert.equal(receipt.writeAllowed, true);
    assert.equal(receipt.rawOutputAllowed, false);
    assert.equal(receipt.auditReceiptRequired, true);
    assert.equal(receipt.auditReceiptLowDisclosure, true);
    assert.equal(receipt.bridgeReceiptLowDisclosure, true);
    assert.equal(receipt.auditReceiptReferencePresent, true);
    assert.equal(receipt.auditReceiptReferenceSafe, true);
    assert.equal(receipt.rollbackPlanReferencePresent, true);
    assert.equal(receipt.rollbackPlanReferenceSafe, true);
    assert.equal(receipt.rollbackWritePostureBound, true);
    assert.equal(receipt.memoryWritePerformed, true);
    assert.equal(receipt.rawRequestBodyPersisted, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.tokenMaterialDisclosed, false);
    assert.equal(receipt.endpointDisclosed, false);
  }
  for (const receipt of lifecycleReceipts) {
    assert.equal(serialized.includes(receipt.rawValue), false, receipt.rawValue);
  }
  ensureNoForbiddenOutputKeys(report);
});

test('governed native audit projection preserves whitelisted JSON-RPC reason codes only', () => {
  const rawPrivateDetail = 'PRIVATE_NATIVE_JSONRPC_DETAIL_SHOULD_NOT_ECHO';
  const receipt = projectGovernedNativeBridgeAuditReceipt(governedBridgeReceiptEntry({
    toolName: 'search_memory',
    delegationDirection: 'read',
    statusClass: 'client_error',
    reasonCode: 'native_read_delegation_client_error',
    memoryReadPerformed: false,
    nativeInvocationStatusClass: 'client_error',
    nativeInvocationHttpStatusClass: 'success',
    nativeInvocationJsonRpcErrorPresent: true,
    nativeInvocationJsonRpcErrorReasonCode: 'native_runtime_call_failed',
    rawPrivateDetail
  }));
  const unsafeReceipt = projectGovernedNativeBridgeAuditReceipt(governedBridgeReceiptEntry({
    toolName: 'search_memory',
    delegationDirection: 'read',
    statusClass: 'client_error',
    reasonCode: 'native_read_delegation_client_error',
    memoryReadPerformed: false,
    nativeInvocationStatusClass: 'client_error',
    nativeInvocationHttpStatusClass: 'success',
    nativeInvocationJsonRpcErrorPresent: true,
    nativeInvocationJsonRpcErrorReasonCode: 'https://PRIVATE_REASON_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify({ receipt, unsafeReceipt });

  assert.equal(receipt.nativeInvocationJsonRpcErrorPresent, true);
  assert.equal(receipt.nativeInvocationJsonRpcErrorReasonCode, 'native_runtime_call_failed');
  assert.equal(unsafeReceipt.nativeInvocationJsonRpcErrorReasonCode, null);
  assert.equal(serialized.includes(rawPrivateDetail), false);
  assert.equal(serialized.includes('PRIVATE_REASON_SHOULD_NOT_ECHO'), false);
});

test('audit_memory projects governed native write rollback reason evidence without raw failure payloads', async () => {
  const postCommitFailures = [
    {
      statusClass: 'output_budget_exceeded',
      reasonCode: 'native_write_delegation_output_budget_exceeded',
      rollbackReasonCode: 'write_post_commit_output_budget_exceeded',
      rawValue: 'RAW_OVER_BUDGET_NATIVE_RESPONSE_SHOULD_NOT_LEAK'
    },
    {
      statusClass: 'audit_receipt_not_appended',
      reasonCode: 'required_bridge_audit_receipt_not_appended',
      rollbackReasonCode: 'write_post_commit_audit_receipt_not_appended',
      rawValue: 'RAW_AUDIT_APPEND_ERROR_SHOULD_NOT_LEAK'
    },
    {
      statusClass: 'native_invocation_receipt_unbound',
      reasonCode: 'native_write_delegation_native_invocation_receipt_unbound',
      rollbackReasonCode: 'write_post_commit_native_invocation_receipt_unbound',
      nativeInvocationReceiptBindingMatched: false,
      rawValue: 'RAW_UNBOUND_NATIVE_INVOCATION_RECEIPT_SHOULD_NOT_LEAK'
    }
  ];
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => postCommitFailures.map(failure =>
      projectGovernedNativeBridgeAuditReceiptDecision(governedBridgeReceiptEntry({
        toolName: 'record_memory',
        delegationDirection: 'write',
        scopeFingerprint: 'c'.repeat(64),
        rollbackRequired: true,
        rollbackReasonCode: failure.rollbackReasonCode,
        rollbackDisposition: 'rollback_required_not_applied',
        rollbackFollowupRequired: true,
        rollbackApplyPolicy: 'manual_governed_followup_required',
        statusClass: failure.statusClass,
        reasonCode: failure.reasonCode,
        responseShapeCategory: 'object_top_level_kind_only_no_field_names',
        topLevelKindCategory: 'object',
        itemCountBucket: 'object_not_counted',
        byteCountBucket: failure.statusClass === 'output_budget_exceeded' ? 'over_budget' : 'bounded',
        outputBudgetExceeded: failure.statusClass === 'output_budget_exceeded',
        ...(failure.nativeInvocationReceiptBindingMatched !== undefined
          ? { nativeInvocationReceiptBindingMatched: failure.nativeInvocationReceiptBindingMatched }
          : {}),
        rawResponseBody: failure.rawValue,
        rawFailureDetail: failure.rawValue
      }))
    )
  });

  const report = await service.run({
    audit_family: 'governance',
    window: 5,
    include_raw: false
  });
  const receipts = report.findings.map(finding => finding.governedNativeBridgeReceipt);
  const serialized = JSON.stringify(report);

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.policy.governedNativeBridgeAuditReceiptProjection, true);
  assert.deepEqual(receipts.map(receipt => receipt.delegationStatusClass), [
    'output_budget_exceeded',
    'audit_receipt_not_appended',
    'native_invocation_receipt_unbound'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.delegationReasonCode), [
    'native_write_delegation_output_budget_exceeded',
    'required_bridge_audit_receipt_not_appended',
    'native_write_delegation_native_invocation_receipt_unbound'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.rollbackReasonCode), [
    'write_post_commit_output_budget_exceeded',
    'write_post_commit_audit_receipt_not_appended',
    'write_post_commit_native_invocation_receipt_unbound'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.responseShapeCategory), [
    'object_top_level_kind_only_no_field_names',
    'object_top_level_kind_only_no_field_names',
    'object_top_level_kind_only_no_field_names'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.topLevelKindCategory), ['object', 'object', 'object']);
  assert.deepEqual(receipts.map(receipt => receipt.itemCountBucket), [
    'object_not_counted',
    'object_not_counted',
    'object_not_counted'
  ]);
  assert.deepEqual(receipts.map(receipt => receipt.byteCountBucket), ['over_budget', 'bounded', 'bounded']);
  assert.deepEqual(receipts.map(receipt => receipt.outputBudgetExceeded), [true, false, false]);
  assert.equal(receipts[2].nativeInvocationReceiptBindingMatched, false);
  for (const receipt of receipts) {
    assert.equal(receipt.rollbackRequired, true);
    assert.equal(receipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(receipt.rollbackFollowupRequired, true);
    assert.equal(receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(receipt.rollbackApplyAttempted, false);
    assert.equal(receipt.rollbackAutoApplyAllowed, false);
    assert.equal(receipt.memoryWritePerformed, true);
    assert.equal(receipt.rawResponseBodyPersisted, false);
  }
  for (const failure of postCommitFailures) {
    assert.equal(serialized.includes(failure.rawValue), false, failure.rawValue);
  }
  ensureNoForbiddenOutputKeys(report);
});

test('audit_memory projects governed native read fallback receipts as local auxiliary evidence', async () => {
  const rawFallbackContent = 'RAW_LOCAL_FALLBACK_MEMORY_CONTENT_SHOULD_NOT_LEAK';
  const rawNativeFailure = 'RAW_NATIVE_FAILURE_DETAIL_SHOULD_NOT_LEAK';
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => [
      projectGovernedNativeAuditDecision({
        eventType: 'governed_mcp_vcp_native_read_fallback_receipt',
        toolName: 'audit_memory',
        delegationDirection: 'read',
        clientId: 'Codex',
        visibility: 'private',
        scopePresent: true,
        scopeIdentifierPresent: true,
        scopeFieldNames: ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id'],
        scopeIdentifierFieldNames: ['project_id', 'scope_id', 'workspace_id'],
        scopeFingerprint: 'e'.repeat(64),
        rawScopePersisted: false,
        primaryRuntime: 'VCPToolBox native memory',
        localMemoryRole: 'fallback',
        localMemorySourceRuntime: 'codex_memory_local_fallback',
        localMemoryFallbackAuthorized: true,
        localMemoryFallbackUsed: false,
        localMemoryFallbackReadPerformed: false,
        localMemoryFallbackReturned: false,
        fallbackReasonCode: 'native_read_delegation_transport_error',
        fallbackRequiresAuditReceipt: true,
        fallbackAfterAuditReceiptAppended: true,
        bridgeAuditReceiptStatus: 'appended',
        bridgeAuditReceiptAppended: true,
        nativeRuntimeCalled: true,
        nativeMcpToolCalled: true,
        nativeInvocationAttempted: true,
        nativeMcpToolInvocationAttempted: true,
        nativeMemoryReadPerformed: false,
        nativeStatusClass: 'transport_error',
        nativeResponseShapeCategory: 'not_consumed',
        nativeTopLevelKindCategory: 'not_consumed',
        nativeItemCountBucket: 'not_consumed',
        nativeByteCountBucket: 'not_consumed',
        lowDisclosure: true,
        fallbackReceiptLowDisclosure: true,
        rawNativeOutputReturned: false,
        rawNativeMemoryReturned: false,
        rawFallbackMemoryPersisted: false,
        rawFallbackMemoryReturned: false,
        tokenMaterialDisclosed: false,
        endpointDisclosed: false,
        memoryContentDisclosed: false,
        memoryIdsDisclosed: false,
        nativeFieldNamesDisclosed: false,
        privateFallbackContent: rawFallbackContent,
        privateNativeFailure: rawNativeFailure
      })
    ]
  });

  const report = await service.run({
    audit_family: 'governance',
    window: 5,
    include_raw: false
  });
  const finding = report.findings[0];
  const receipt = finding.governedNativeReadFallbackReceipt;
  const coverage = validateGovernedMcpAuditMemoryReadFallbackFindingCoversLocalMemoryRole(finding);
  const serialized = JSON.stringify(report);

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.policy.governedNativeBridgeAuditReceiptProjection, true);
  assert.equal(finding.reasonCode, 'governed_native_read_fallback_audit_receipt');
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(receipt.clientId, 'Codex');
  assert.equal(receipt.visibility, 'private');
  assert.equal(receipt.scopePresent, true);
  assert.equal(receipt.scopeIdentifierPresent, true);
  assert.equal(receipt.scopeFingerprintPresent, true);
  assert.deepEqual(receipt.scopeFieldNames, [
    'client_id',
    'project_id',
    'scope_id',
    'visibility',
    'workspace_id'
  ]);
  assert.deepEqual(receipt.scopeIdentifierFieldNames, ['project_id', 'scope_id', 'workspace_id']);
  assert.equal(receipt.rawScopePersisted, false);
  assert.equal(receipt.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(receipt.localMemoryRole, 'fallback');
  assert.equal(receipt.localMemorySourceRuntime, 'codex_memory_local_fallback');
  assert.equal(receipt.localMemoryFallbackAuthorized, true);
  assert.equal(receipt.localMemoryFallbackUsed, false);
  assert.equal(receipt.fallbackReasonCode, 'native_read_delegation_transport_error');
  assert.equal(receipt.fallbackRequiresAuditReceipt, true);
  assert.equal(receipt.fallbackAfterAuditReceiptAppended, true);
  assert.equal(receipt.bridgeAuditReceiptStatus, 'appended');
  assert.equal(receipt.bridgeAuditReceiptAppended, true);
  assert.equal(receipt.nativeInvocationAttempted, true);
  assert.equal(receipt.nativeMcpToolInvocationAttempted, true);
  assert.equal(receipt.nativeMemoryReadPerformed, false);
  assert.equal(receipt.nativeStatusClass, 'transport_error');
  assert.equal(receipt.vcpNativeResult, false);
  assert.equal(receipt.resultCanBeMistakenForVcpNative, false);
  assert.equal(receipt.lowDisclosure, true);
  assert.equal(receipt.fallbackReceiptLowDisclosure, true);
  assert.equal(receipt.rawFallbackMemoryPersisted, false);
  assert.equal(receipt.rawFallbackMemoryReturned, false);
  assert.equal(receipt.memoryContentDisclosed, false);
  assert.equal(receipt.tokenMaterialDisclosed, false);
  assert.equal(receipt.endpointDisclosed, false);
  assert.equal(receipt.readinessClaimed, false);
  assert.equal(serialized.includes(rawFallbackContent), false);
  assert.equal(serialized.includes(rawNativeFailure), false);
  ensureNoForbiddenOutputKeys(report);
});
