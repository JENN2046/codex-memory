'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_PRIMARY_RUNTIME,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal
} = require('./CurrentProductGoalContract');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  GOVERNED_NATIVE_VISIBILITIES,
  canonicalGovernedNativeClient
} = require('./MemoryAccessContract');
const {
  buildMemoryContextLowDisclosureProjection
} = require('./MemoryContextPackageService');
const { resolveRead } = require('./DiaryScopeMapping');
const { loadDiaryScopeMapping } = require('./DiaryScopeMappingLoader');
const { postCheckNativeDiaryResults } = require('./NativeDiaryResultPostCheck');
const {
  DERIVED_RUNTIME_MUTATION_POLICY,
  createDerivedRuntimeMutationLifecycle
} = require('./DerivedRuntimeMutationLifecycle');

const GOVERNANCE_METADATA_PATH = 'params._meta.codexMemoryGovernance';
const PUBLIC_TOOL_TO_NATIVE_TOOLS = Object.freeze({
  search_memory: Object.freeze(['knowledge_base.search']),
  memory_overview: Object.freeze(['memory_overview']),
  audit_memory: Object.freeze(['audit_memory']),
  record_memory: Object.freeze(['knowledge_base.record', 'knowledge_base.write']),
  tombstone_memory: Object.freeze(['knowledge_base.tombstone']),
  supersede_memory: Object.freeze(['knowledge_base.supersede'])
});
const GOVERNANCE_ARGUMENT_KEYS = Object.freeze(new Set([
  'accesspath',
  'auditreceipt',
  'clientid',
  'alloweddiaries',
  'alloweddiarynames',
  'diary',
  'diaryname',
  'diarynames',
  'exactapprovalresult',
  'governedbridge',
  'governancemeta',
  'invocationprofile',
  'localmemoryrole',
  'mappingdigest',
  'mappingreference',
  'outputdisclosurebudget',
  'primaryruntime',
  'readwriteauthority',
  'rollbackposture',
  'runtimetarget',
  'scope',
  'scopeenforcement',
  'scopeenforcementmode',
  'visibility'
]));
const SHIM_SERVER_NAME = 'codex-memory-governed-vcp-toolbox-native-shim';
const SHIM_PROTOCOL_VERSION = '2024-11-05';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonRpcError(id, code, message, data = undefined) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

const NATIVE_RUNTIME_FAILURE_REASON_CODES = Object.freeze(new Set([
  'native_runtime_initialization_failed',
  'native_provider_embedding_failed',
  'native_query_vector_invalid_shape',
  'native_query_vector_dimension_unavailable',
  'native_query_vector_dimension_mismatch',
  'native_query_vector_non_finite',
  'native_query_vector_zero_norm',
  'native_selected_diary_index_recovery_failed',
  'native_selected_diary_index_empty_after_hydration',
  'native_vector_search_not_executed',
  'native_vector_search_failed',
  'native_vector_search_ghost_result',
  'native_diary_search_failed',
  'native_result_scope_postcheck_failed'
]));

const VECTOR_RETRIEVAL_DIAGNOSTICS_MODE = 'fail_closed_v1';
const VECTOR_RETRIEVAL_OUTCOMES = Object.freeze(new Set([
  'not_attempted',
  'empty_index',
  'empty',
  'found'
]));

function nonNegativeInteger(value, fallback = 0) {
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function nativeVectorRetrievalDiagnostics(overrides = {}) {
  const enabled = overrides.vectorRetrievalDiagnosticsMode ===
    VECTOR_RETRIEVAL_DIAGNOSTICS_MODE;
  return {
    vectorRetrievalDiagnosticsMode: enabled
      ? VECTOR_RETRIEVAL_DIAGNOSTICS_MODE
      : 'not_applicable',
    hydratedChunkCount: enabled
      ? nonNegativeInteger(overrides.hydratedChunkCount)
      : 0,
    loadedIndexVectorCount: enabled
      ? nonNegativeInteger(overrides.loadedIndexVectorCount)
      : 0,
    queryVectorShapeValid: enabled && overrides.queryVectorShapeValid === true,
    queryVectorExpectedDimensionKnown:
      enabled && overrides.queryVectorExpectedDimensionKnown === true,
    queryVectorDimensionMatched:
      enabled && overrides.queryVectorDimensionMatched === true,
    queryVectorFinite: enabled && overrides.queryVectorFinite === true,
    queryVectorNonzero: enabled && overrides.queryVectorNonzero === true,
    indexSearchCalled: enabled && overrides.indexSearchCalled === true,
    indexSearchSucceeded: enabled && overrides.indexSearchSucceeded === true,
    rawCandidateCount: enabled
      ? nonNegativeInteger(overrides.rawCandidateCount)
      : 0,
    ghostCandidateCount: enabled
      ? nonNegativeInteger(overrides.ghostCandidateCount)
      : 0,
    vectorRetrievalOutcome: enabled && VECTOR_RETRIEVAL_OUTCOMES.has(
      overrides.vectorRetrievalOutcome
    )
      ? overrides.vectorRetrievalOutcome
      : 'not_attempted',
    vectorRetrievalRawDetailsDisclosed: false
  };
}

function isSupportedNumericVector(value) {
  return Array.isArray(value) || (
    ArrayBuffer.isView(value) &&
    !(value instanceof DataView) &&
    !Buffer.isBuffer(value)
  );
}

function validateNativeQueryVector(vector, expectedDimension, { requireExpectedDimension = false } = {}) {
  if (!isSupportedNumericVector(vector) || vector.length < 1) {
    throw nativeRuntimeStageError('native_query_vector_invalid_shape');
  }
  const expectedDimensionKnown = Number.isSafeInteger(expectedDimension) &&
    expectedDimension > 0;
  if (requireExpectedDimension && !expectedDimensionKnown) {
    throw nativeRuntimeStageError('native_query_vector_dimension_unavailable');
  }
  if (expectedDimensionKnown && vector.length !== expectedDimension) {
    throw nativeRuntimeStageError('native_query_vector_dimension_mismatch');
  }
  let nonzero = false;
  for (const value of vector) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw nativeRuntimeStageError('native_query_vector_non_finite');
    }
    if (value !== 0) nonzero = true;
  }
  if (!nonzero) {
    throw nativeRuntimeStageError('native_query_vector_zero_norm');
  }
  return {
    queryVectorShapeValid: true,
    queryVectorExpectedDimensionKnown: expectedDimensionKnown,
    queryVectorDimensionMatched: expectedDimensionKnown,
    queryVectorFinite: true,
    queryVectorNonzero: true
  };
}

function nativeRuntimeStageError(reasonCode, internalMessage = 'native_runtime_stage_failed') {
  const safeInternalMessage = /^native_result_[a-z0-9_]+$/.test(internalMessage)
    ? internalMessage
    : 'native_runtime_stage_failed';
  const error = new Error(safeInternalMessage);
  error.reasonCode = NATIVE_RUNTIME_FAILURE_REASON_CODES.has(reasonCode)
    ? reasonCode
    : 'native_runtime_call_failed';
  return error;
}

function nativeRuntimeFailureReasonCode(error) {
  return NATIVE_RUNTIME_FAILURE_REASON_CODES.has(error?.reasonCode)
    ? error.reasonCode
    : 'native_runtime_call_failed';
}

function nativeRuntimeReceipt(overrides = {}) {
  const derivedRuntimeMutationCumulativeCount = Number.isInteger(
    overrides.derivedRuntimeMutationCumulativeCount
  ) && overrides.derivedRuntimeMutationCumulativeCount >= 0
    ? overrides.derivedRuntimeMutationCumulativeCount
    : 0;
  const derivedRuntimeMutationReceiptDelta = Number.isInteger(
    overrides.derivedRuntimeMutationReceiptDelta
  ) && overrides.derivedRuntimeMutationReceiptDelta >= 0
    ? overrides.derivedRuntimeMutationReceiptDelta
    : 0;
  return {
    nativeRuntimeCalled: overrides.nativeRuntimeCalled === true,
    nativeRuntimeInitialized: overrides.nativeRuntimeInitialized === true,
    providerApiCalled: overrides.providerApiCalled === true,
    memoryReadPerformed: overrides.memoryReadPerformed === true,
    memoryWritePerformed: overrides.memoryWritePerformed === true,
    durableWritePerformed: overrides.durableWritePerformed === true,
    durableWriteScope: typeof overrides.durableWriteScope === 'string'
      ? overrides.durableWriteScope
      : null,
    isolatedRuntimeStoreUsed: overrides.isolatedRuntimeStoreUsed === true,
    primaryMemoryStoreWritePerformed: overrides.primaryMemoryStoreWritePerformed === true,
    derivedIndexWritePerformed: overrides.derivedIndexWritePerformed === true,
    derivedRuntimeMutationPolicy: overrides.derivedRuntimeMutationPolicy ===
      DERIVED_RUNTIME_MUTATION_POLICY
      ? DERIVED_RUNTIME_MUTATION_POLICY
      : 'disabled',
    derivedRuntimeMutationAccountingMode: overrides.derivedRuntimeMutationAccountingMode ===
      'lifecycle_event_v1'
      ? 'lifecycle_event_v1'
      : 'not_applicable',
    derivedRuntimeMutationAuthorized: overrides.derivedRuntimeMutationAuthorized === true,
    derivedRuntimeMutationAccountingFinal:
      overrides.derivedRuntimeMutationAccountingFinal === true,
    derivedRuntimeMutationBackgroundTasksDrained:
      overrides.derivedRuntimeMutationBackgroundTasksDrained === true,
    derivedRuntimeMutationCumulativeCount,
    derivedRuntimeMutationReceiptDelta,
    derivedRuntimeMutationActiveCount: Number.isInteger(overrides.derivedRuntimeMutationActiveCount) &&
      overrides.derivedRuntimeMutationActiveCount >= 0
      ? overrides.derivedRuntimeMutationActiveCount
      : 0,
    derivedRuntimeMutationCompletedCount:
      Number.isInteger(overrides.derivedRuntimeMutationCompletedCount) &&
      overrides.derivedRuntimeMutationCompletedCount >= 0
        ? overrides.derivedRuntimeMutationCompletedCount
        : 0,
    derivedRuntimeMutationFailedCount:
      Number.isInteger(overrides.derivedRuntimeMutationFailedCount) &&
      overrides.derivedRuntimeMutationFailedCount >= 0
        ? overrides.derivedRuntimeMutationFailedCount
        : 0,
    derivedRuntimeMutationTriggerCategories: Array.isArray(
      overrides.derivedRuntimeMutationTriggerCategories
    )
      ? overrides.derivedRuntimeMutationTriggerCategories.filter(value =>
          ['startup', 'hydration', 'cache', 'vector', 'tag', 'matrix'].includes(value)
        )
      : [],
    derivedRuntimeMutationZeroClaimed: overrides.derivedRuntimeMutationZeroClaimed === true,
    derivedRuntimeMutationPolicyViolation:
      overrides.derivedRuntimeMutationPolicyViolation === true,
    sourcePartitionMutationPerformed: overrides.sourcePartitionMutationPerformed === true,
    legacyPartitionAccessed: overrides.legacyPartitionAccessed === true,
    ambiguousPartitionAccessed: overrides.ambiguousPartitionAccessed === true,
    unregisteredPartitionAccessed: overrides.unregisteredPartitionAccessed === true,
    derivedRuntimeMutationRawDetailsDisclosed: false,
    authorizationResolvedBeforeProvider: overrides.authorizationResolvedBeforeProvider === true,
    diaryAllowlistEnforcedBeforeIndexLoad: overrides.diaryAllowlistEnforcedBeforeIndexLoad === true,
    diaryAllowlistEnforcedBeforeVectorSearch: overrides.diaryAllowlistEnforcedBeforeVectorSearch === true,
    resultScopePostcheckPassed: overrides.resultScopePostcheckPassed === true,
    unscopedNativeSearchUsed: overrides.unscopedNativeSearchUsed === true,
    mappingReferenceBound: overrides.mappingReferenceBound === true,
    mappingDigestBound: overrides.mappingDigestBound === true,
    allowedDiaryCount: Number.isInteger(overrides.allowedDiaryCount) &&
      overrides.allowedDiaryCount >= 1 && overrides.allowedDiaryCount <= 8
      ? overrides.allowedDiaryCount
      : 0,
    rawDiaryNamesReturned: false,
    scopeIdAccepted: overrides.scopeIdAccepted === true,
    scopeIdAudited: overrides.scopeIdAudited === true,
    scopeIdFingerprintBound: overrides.scopeIdFingerprintBound === true,
    scopeIdAffectsDiaryAcl: false,
    scopeIdEnforcementClaimed: false,
    omittedPartitionCategories: Array.isArray(overrides.omittedPartitionCategories)
      ? overrides.omittedPartitionCategories.filter(value =>
          ['project_shared', 'workspace_shared'].includes(value)
        )
      : [],
    ...nativeVectorRetrievalDiagnostics(overrides),
    actualMappingReference: typeof overrides.actualMappingReference === 'string'
      ? overrides.actualMappingReference
      : null,
    actualMappingDigest: /^sha256:[a-f0-9]{64}$/.test(overrides.actualMappingDigest || '')
      ? overrides.actualMappingDigest
      : null,
    rawRuntimeOutputDisclosed: false,
    rawMemoryContentDisclosed: false,
    runtimeLocatorDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false
  };
}

function jsonRpcResult(id, structuredContent, runtimeReceipt = null) {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      structuredContent,
      ...(runtimeReceipt ? {
        _meta: {
          codexMemoryNativeRuntimeReceipt: runtimeReceipt
        }
      } : {})
    }
  };
}

function lowDisclosureShimMeta(enableWrite = false, mappingState = null) {
  return {
    bridge: 'codex-memory-governed-vcp-toolbox-native-memory',
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    accessPath: REQUIRED_ACCESS_PATH,
    governanceMetadataPath: GOVERNANCE_METADATA_PATH,
    publicTools: Object.keys(PUBLIC_TOOL_TO_NATIVE_TOOLS),
    writeEnabled: enableWrite === true,
    lowDisclosure: true,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    locatorDisclosed: false,
    configEnvRead: false,
    providerApiCalled: false,
    nativeRuntimeCalled: false,
    scopeEnforcementMode: 'diary_allowlist_v1',
    mappingConfigured: mappingState?.configured === true,
    mappingReferenceBound: mappingState?.accepted === true,
    mappingDigestBound: mappingState?.accepted === true,
    exactMappingReferenceDisclosed: false,
    exactMappingDigestDisclosed: false,
    readinessClaimed: false
  };
}

function toolInputSchema(nativeToolName, publicToolNames = []) {
  const writeTool = publicToolNames.some(toolName => [
    'record_memory',
    'tombstone_memory',
    'supersede_memory'
  ].includes(toolName));
  const overviewTool = publicToolNames.includes('memory_overview') || nativeToolName === 'memory_overview';
  const auditTool = publicToolNames.includes('audit_memory') || nativeToolName === 'audit_memory';
  return {
    type: 'object',
    additionalProperties: true,
    properties: {
      ...(writeTool ? {
        title: { type: 'string' },
        content: { type: 'string' },
        evidence: { type: 'string' },
        memory_id: { type: 'string' },
        old_memory_id: { type: 'string' },
        new_memory_id: { type: 'string' }
      } : overviewTool ? {
        limit: { type: 'number' }
      } : auditTool ? {
        audit_family: { type: 'string' },
        window: { type: 'number' },
        include_raw: { type: 'boolean' }
      } : {
        query: { type: 'string' },
        limit: { type: 'number' },
        max_results: { type: 'number' }
      })
    },
    _meta: {
      codexMemoryGovernanceRequired: true,
      governanceMetadataPath: GOVERNANCE_METADATA_PATH,
      publicToolNames,
      nativeToolName,
      toolArgumentsMayCarryGovernance: false,
      rawOutputAllowed: false,
      lowDisclosure: true
    }
  };
}

function nativeToolDescriptors(enableWrite = false) {
  const descriptors = [{
    name: 'knowledge_base.search',
    description: 'Governed VCPToolBox native memory search surface for Codex search_memory.',
    inputSchema: toolInputSchema('knowledge_base.search', ['search_memory']),
    _meta: {
      publicToolNames: ['search_memory'],
      readAllowed: true,
      writeAllowed: false,
      exactApprovalRequired: false,
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  }, {
    name: 'memory_overview',
    description: 'Governed VCPToolBox native memory overview surface for Codex memory_overview.',
    inputSchema: toolInputSchema('memory_overview', ['memory_overview']),
    _meta: {
      publicToolNames: ['memory_overview'],
      readAllowed: true,
      writeAllowed: false,
      exactApprovalRequired: false,
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  }, {
    name: 'audit_memory',
    description: 'Governed VCPToolBox native memory audit surface for Codex audit_memory.',
    inputSchema: toolInputSchema('audit_memory', ['audit_memory']),
    _meta: {
      publicToolNames: ['audit_memory'],
      readAllowed: true,
      writeAllowed: false,
      exactApprovalRequired: false,
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  }];

  if (enableWrite === true) {
    for (const [nativeToolName, publicToolNames] of [
      ['knowledge_base.record', ['record_memory']],
      ['knowledge_base.write', ['record_memory']],
      ['knowledge_base.tombstone', ['tombstone_memory']],
      ['knowledge_base.supersede', ['supersede_memory']]
    ]) {
      descriptors.push({
        name: nativeToolName,
        description: 'Governed VCPToolBox native memory write surface requiring exact approval.',
        inputSchema: toolInputSchema(nativeToolName, publicToolNames),
        _meta: {
          publicToolNames,
          readAllowed: false,
          writeAllowed: true,
          exactApprovalRequired: true,
          lowDisclosure: true,
          rawOutputAllowed: false,
          readinessClaimed: false
        }
      });
    }
  }

  return descriptors;
}

function initializeResult(enableWrite = false, mappingState = null) {
  return {
    protocolVersion: SHIM_PROTOCOL_VERSION,
    serverInfo: {
      name: SHIM_SERVER_NAME,
      version: '0.0.0'
    },
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    _meta: lowDisclosureShimMeta(enableWrite, mappingState)
  };
}

function toolsListResult(enableWrite = false, mappingState = null) {
  return {
    tools: nativeToolDescriptors(enableWrite),
    _meta: lowDisclosureShimMeta(enableWrite, mappingState)
  };
}

function readRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('request_body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validateGovernanceForNativeTool(nativeToolName, governanceMeta) {
  if (!isPlainObject(governanceMeta)) {
    return {
      accepted: false,
      publicToolName: null,
      reasonCode: 'invalid_governance_metadata'
    };
  }
  const publicToolName = typeof governanceMeta?.invocationProfile?.toolName === 'string'
    ? governanceMeta.invocationProfile.toolName
    : null;
  const allowedNativeTools = publicToolName ? PUBLIC_TOOL_TO_NATIVE_TOOLS[publicToolName] : null;
  if (!allowedNativeTools || !allowedNativeTools.includes(nativeToolName)) {
    return {
      accepted: false,
      publicToolName,
      reasonCode: allowedNativeTools ? 'native_tool_public_binding_mismatch' : 'unsupported_native_tool'
    };
  }
  const coverage = validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(
    governanceMeta,
    { toolName: publicToolName }
  );
  return {
    accepted: coverage.accepted === true,
    publicToolName,
    reasonCode: coverage.accepted === true
      ? null
      : 'invalid_governance_metadata',
    blockers: coverage.blockers || []
  };
}

function boundedString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizedArgumentKey(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isGovernanceArgumentKey(key) {
  return GOVERNANCE_ARGUMENT_KEYS.has(normalizedArgumentKey(key));
}

function sanitizeNativeBusinessArguments(value, depth = 0) {
  if (depth > 6) return null;
  if (Array.isArray(value)) {
    return value.map(item => sanitizeNativeBusinessArguments(item, depth + 1));
  }
  if (!isPlainObject(value)) {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') return null;
    return value;
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isGovernanceArgumentKey(key)) continue;
    output[key] = sanitizeNativeBusinessArguments(nestedValue, depth + 1);
  }
  return output;
}

function canonicalScopeFromGovernanceMeta(governanceMeta = {}) {
  const executionContext = governanceMeta?.trustedExecutionContext?.executionContext || {};
  const scope = {};
  const clientId = canonicalGovernedNativeClient(executionContext.clientId);
  if (isSafeReferenceName(executionContext.projectId)) scope.project_id = executionContext.projectId;
  if (isSafeReferenceName(executionContext.workspaceId)) scope.workspace_id = executionContext.workspaceId;
  if (isSafeReferenceName(executionContext.scopeId)) scope.scope_id = executionContext.scopeId;
  if (clientId) scope.client_id = clientId;
  if (GOVERNED_NATIVE_VISIBILITIES.includes(executionContext.visibility)) {
    scope.visibility = executionContext.visibility;
  }
  return Object.keys(scope).length > 0 ? scope : null;
}

function canonicalGovernedBridgeFromGovernanceMeta(nativeToolName, publicToolName, governanceMeta = {}) {
  const scope = canonicalScopeFromGovernanceMeta(governanceMeta);
  const clientId = canonicalGovernedNativeClient(
    governanceMeta?.trustedExecutionContext?.executionContext?.clientId
  );
  const readAllowed = governanceMeta?.readWriteAuthority?.readAllowed === true;
  const writeAllowed = governanceMeta?.readWriteAuthority?.writeAllowed === true;
  const targetReferenceName = isSafeReferenceName(governanceMeta?.runtimeTarget?.targetReferenceName)
    ? governanceMeta.runtimeTarget.targetReferenceName
    : null;
  return {
    primary_runtime: REQUIRED_PRIMARY_RUNTIME,
    access_path: REQUIRED_ACCESS_PATH,
    client_id: clientId,
    scope,
    visibility: scope?.visibility || null,
    runtime_target: {
      primary_runtime: REQUIRED_PRIMARY_RUNTIME,
      target_reference_name: targetReferenceName,
      target_kind: governanceMeta?.runtimeTarget?.targetKind === 'mcp_server' ? 'mcp_server' : null,
      bound: governanceMeta?.runtimeTarget?.bound === true,
      endpoint_included: false,
      token_material_included: false
    },
    invocation_profile: typeof governanceMeta?.invocationProfile?.profile === 'string'
      ? governanceMeta.invocationProfile.profile
      : null,
    invocation_tool_name: publicToolName,
    native_tool_name: nativeToolName,
    read_allowed: readAllowed,
    write_allowed: writeAllowed,
    raw_output_allowed: governanceMeta?.outputDisclosureBudget?.rawOutput === true,
    disclosure_level: typeof governanceMeta?.outputDisclosureBudget?.level === 'string'
      ? governanceMeta.outputDisclosureBudget.level
      : null,
    audit_receipt_required: governanceMeta?.auditReceipt?.required === true,
    rollback_posture: typeof governanceMeta?.rollbackPosture?.mode === 'string'
      ? governanceMeta.rollbackPosture.mode
      : null,
    tool_arguments_may_override_governance: false,
    governance_metadata_may_override_transport_context: false,
    raw_scope_value_returned: false,
    raw_request_body_disclosed: false,
    raw_response_body_disclosed: false,
    endpoint_disclosed: false,
    token_material_disclosed: false,
    low_disclosure: true,
    readiness_claimed: false
  };
}

function projectNativeArguments(nativeToolName, publicToolName, args = {}, governanceMeta = {}) {
  const projected = sanitizeNativeBusinessArguments(isPlainObject(args) ? args : {});
  const canonicalScope = canonicalScopeFromGovernanceMeta(governanceMeta);
  if (canonicalScope) projected.scope = canonicalScope;
  projected.governed_bridge = canonicalGovernedBridgeFromGovernanceMeta(
    nativeToolName,
    publicToolName,
    governanceMeta
  );
  return projected;
}

function normalizeLimit(value, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(0, Math.min(parsed, 5));
}

function bucketCount(value) {
  const count = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(count) || count <= 0) return 'zero';
  if (count <= 5) return 'bounded';
  return 'over_budget';
}

function defaultReadRuntimeReceipt({
  nativeRuntimeInitialized = false,
  providerApiCalled = false,
  memoryReadPerformed = true,
  isolatedRuntimeStoreUsed = false,
  authorization = null,
  resultScopePostcheckPassed = false,
  derivedRuntimeMutation = null,
  vectorRetrievalDiagnostics = null
} = {}) {
  const derivedMutationObserved =
    derivedRuntimeMutation?.derivedRuntimeMutationCumulativeCount > 0;
  return nativeRuntimeReceipt({
    nativeRuntimeCalled: true,
    nativeRuntimeInitialized,
    providerApiCalled,
    memoryReadPerformed,
    memoryWritePerformed: false,
    durableWritePerformed: derivedMutationObserved,
    durableWriteScope: derivedMutationObserved ? 'isolated_derived_index' : null,
    isolatedRuntimeStoreUsed,
    primaryMemoryStoreWritePerformed: false,
    derivedIndexWritePerformed: derivedMutationObserved,
    ...(isPlainObject(derivedRuntimeMutation) ? derivedRuntimeMutation : {}),
    authorizationResolvedBeforeProvider: authorization?.accepted === true,
    diaryAllowlistEnforcedBeforeIndexLoad: authorization?.accepted === true,
    diaryAllowlistEnforcedBeforeVectorSearch: authorization?.accepted === true,
    resultScopePostcheckPassed,
    unscopedNativeSearchUsed: false,
    mappingReferenceBound: authorization?.accepted === true,
    mappingDigestBound: authorization?.accepted === true,
    allowedDiaryCount: authorization?.allowedDiaryCount,
    scopeIdAccepted: authorization?.scopeIdAccepted === true,
    scopeIdAudited: authorization?.scopeIdAudited === true,
    scopeIdFingerprintBound: authorization?.scopeIdFingerprintBound === true,
    omittedPartitionCategories: authorization?.omittedCategories,
    ...(isPlainObject(vectorRetrievalDiagnostics) ? vectorRetrievalDiagnostics : {}),
    actualMappingReference: authorization?.mappingReference,
    actualMappingDigest: authorization?.mappingDigest
  });
}

function projectReadResults(results = []) {
  if (!Array.isArray(results)) return [];
  return results.slice(0, 5).map((item, index) => ({
    sourceFilePresent: typeof item?.sourceFile === 'string' && item.sourceFile.length > 0,
    scorePresent: typeof item?.score === 'number',
    tagCountBucket: Array.isArray(item?.matchedTags)
      ? item.matchedTags.length === 0
        ? 'zero'
        : item.matchedTags.length <= 5
          ? 'bounded'
          : 'over_budget'
      : 'unknown',
    sourceKinds: ['vcp_native'],
    memoryContextProjection: buildMemoryContextLowDisclosureProjection(item, index)
  }));
}

function safeFilenamePart(value) {
  return String(value || 'memory')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'memory';
}

function createRecordMarkdown(args = {}) {
  const title = boundedString(args.title, 200) || 'codex-memory governed native record';
  const content = boundedString(args.content, 20_000);
  const evidence = boundedString(args.evidence, 8_000);
  const sensitivity = boundedString(args.sensitivity, 80) || 'internal';
  return [
    '---',
    'source: codex-memory-governed-native-mcp-shim',
    `sensitivity: ${JSON.stringify(sensitivity)}`,
    '---',
    '',
    `# ${title}`,
    '',
    content,
    '',
    '## Evidence',
    '',
    evidence,
    ''
  ].join('\n');
}

function createMutationMarkdown(toolName, args = {}) {
  const titleByTool = {
    tombstone_memory: 'codex-memory governed native tombstone marker',
    supersede_memory: 'codex-memory governed native supersede marker'
  };
  const markerFields = toolName === 'supersede_memory'
    ? [
        ['old_memory_id', 200],
        ['new_memory_id', 200],
        ['reason', 1000],
        ['evidence', 4000],
        ['supersedes_link', 200],
        ['superseded_by_link', 200]
      ]
    : [
        ['memory_id', 200],
        ['reason', 1000],
        ['evidence', 4000],
        ['tombstone_reason', 1000]
      ];
  const lines = [
    '---',
    'source: codex-memory-governed-native-mcp-shim',
    `governed_mutation_tool: ${JSON.stringify(toolName)}`,
    'mutation_marker_only: true',
    '---',
    '',
    `# ${titleByTool[toolName] || 'codex-memory governed native mutation marker'}`,
    ''
  ];
  for (const [field, limit] of markerFields) {
    const value = boundedString(args[field], limit);
    if (value) {
      lines.push(`## ${field}`, '', value, '');
    }
  }
  return lines.join('\n');
}

function createVcpToolBoxNativeMemoryAdapter(options = {}) {
  const runtimeInjected = Boolean(options.knowledgeBaseManager && options.embeddingUtils);
  const vcpToolBoxRoot = path.resolve(options.vcpToolBoxRoot || process.env.VCPTOOLBOX_ROOT || process.cwd());
  const knowledgeBaseManagerPath = path.join(vcpToolBoxRoot, 'KnowledgeBaseManager.js');
  const embeddingUtilsPath = path.join(vcpToolBoxRoot, 'EmbeddingUtils.js');
  const knowledgeBaseRootPath = path.resolve(
    options.knowledgeBaseRootPath ||
    process.env.KNOWLEDGEBASE_ROOT_PATH ||
    path.join(vcpToolBoxRoot, 'dailynote')
  );
  const knowledgeBaseStorePath = options.knowledgeBaseStorePath
    ? path.resolve(options.knowledgeBaseStorePath)
    : process.env.KNOWLEDGEBASE_STORE_PATH
      ? path.resolve(process.env.KNOWLEDGEBASE_STORE_PATH)
      : '';
  const isolatedRuntimeStoreConfigured = Boolean(knowledgeBaseStorePath);
  const primaryWriteOnly = options.primaryWriteOnly === true;
  const derivedRuntimeMutationGovernanceEnabled = isolatedRuntimeStoreConfigured &&
    !primaryWriteOnly;
  const derivedRuntimeMutationPolicy = options.derivedRuntimeMutationPolicy ||
    DERIVED_RUNTIME_MUTATION_POLICY;
  if (derivedRuntimeMutationGovernanceEnabled &&
      derivedRuntimeMutationPolicy !== DERIVED_RUNTIME_MUTATION_POLICY) {
    throw new Error('derived_runtime_mutation_policy_mismatch');
  }
  const derivedRuntimeMutationLifecycle = createDerivedRuntimeMutationLifecycle({
    enabled: derivedRuntimeMutationGovernanceEnabled,
    isolatedRuntimeStore: isolatedRuntimeStoreConfigured
  });
  const primaryWritePreflight = typeof options.primaryWritePreflight === 'function'
    ? options.primaryWritePreflight
    : null;
  if (options.selectedDiaryRuntimeHydrator != null &&
      typeof options.selectedDiaryRuntimeHydrator !== 'function') {
    throw new Error('selected_diary_runtime_hydrator_invalid');
  }
  const selectedDiaryRuntimeHydrator = options.selectedDiaryRuntimeHydrator || null;
  if (selectedDiaryRuntimeHydrator && !derivedRuntimeMutationGovernanceEnabled) {
    throw new Error('selected_diary_runtime_hydrator_isolation_required');
  }
  const writeSubdir = safeFilenamePart(options.writeSubdir || 'codex-memory-governed');
  let knowledgeBaseManager = options.knowledgeBaseManager || null;
  let embeddingUtils = options.embeddingUtils || null;
  let runtimeInitialized = false;
  let runtimeInstrumented = false;
  let tagMemoInstrumented = false;
  let shutdownReceipt = null;
  let shutdownError = null;
  let shuttingDown = false;
  let selectedDiaryHydrationAuthorizationKey = null;
  let selectedDiaryHydrationReservationKey = null;
  let selectedDiaryHydrationReservationCount = 0;
  let selectedDiaryHydrationPromise = null;
  let selectedDiaryHydrationCompleted = false;
  let selectedDiaryHydrationFailureLatched = false;
  let selectedDiaryHydrationReceipt = null;
  const restoreRuntimeHooks = [];
  const derivedTaskAccountingContext = new AsyncLocalStorage();
  const vectorSearchAccountingContext = new AsyncLocalStorage();
  const instrumentedSelectedDiaryIndexes = new WeakSet();

  function bindDerivedMutationAuthorization(authorization) {
    derivedRuntimeMutationLifecycle.bindAuthorization({
      accepted: authorization?.accepted === true,
      allowedDiaryCount: authorization?.allowedDiaryCount,
      mappingReferenceBound: typeof authorization?.mappingReference === 'string',
      mappingDigestBound: /^sha256:[a-f0-9]{64}$/.test(authorization?.mappingDigest || '')
    });
  }

  function takeDerivedMutationReceipt() {
    return derivedRuntimeMutationLifecycle.projection({ consume: true });
  }

  function selectedDiaryAuthorizationKey(authorization) {
    return JSON.stringify({
      allowedDiaryNames: [...authorization.allowedDiaryNames].sort(),
      mappingReference: authorization.mappingReference,
      mappingDigest: authorization.mappingDigest
    });
  }

  function reserveSelectedDiaryHydrationScope(authorization) {
    if (!selectedDiaryRuntimeHydrator) return () => {};
    if (selectedDiaryHydrationFailureLatched) {
      throw new Error('selected_diary_hydration_failure_latched');
    }
    const authorizationKey = selectedDiaryAuthorizationKey(authorization);
    const boundKey = selectedDiaryHydrationAuthorizationKey ||
      selectedDiaryHydrationReservationKey;
    if (boundKey !== null && authorizationKey !== boundKey) {
      throw new Error('selected_diary_hydration_scope_change_forbidden');
    }
    if (selectedDiaryHydrationAuthorizationKey !== null) return () => {};
    if (selectedDiaryHydrationReservationKey === null) {
      selectedDiaryHydrationReservationKey = authorizationKey;
    }
    selectedDiaryHydrationReservationCount += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      selectedDiaryHydrationReservationCount -= 1;
      if (selectedDiaryHydrationReservationCount === 0 &&
          selectedDiaryHydrationAuthorizationKey === null) {
        selectedDiaryHydrationReservationKey = null;
      }
    };
  }

  async function hydrateAuthorizedSelectedDiaries(authorization) {
    if (!selectedDiaryRuntimeHydrator || selectedDiaryHydrationCompleted) return;
    try {
      if (selectedDiaryHydrationPromise === null) {
        selectedDiaryHydrationPromise = derivedRuntimeMutationLifecycle.track('hydration', async () => {
          const receipt = await selectedDiaryRuntimeHydrator({
            allowedDiaryNames: Object.freeze([...authorization.allowedDiaryNames]),
            knowledgeBaseManager,
            knowledgeBaseRootPath,
            knowledgeBaseStorePath
          });
          if (receipt?.accepted !== true ||
              receipt.authorizationResolvedBeforeHydration !== true ||
              receipt.selectedDiaryOnly !== true ||
              receipt.sourcePartitionMutationPerformed !== false ||
              receipt.primaryMemoryWritePerformed !== false ||
              receipt.unauthorizedSourceRowsRead !== false ||
              receipt.hydratedDiaryCount !== authorization.allowedDiaryCount ||
              !Number.isInteger(receipt.hydratedFileCount) || receipt.hydratedFileCount < 0 ||
              !Number.isInteger(receipt.hydratedChunkCount) || receipt.hydratedChunkCount < 0) {
            throw new Error('selected_diary_hydration_receipt_invalid');
          }
          selectedDiaryHydrationReceipt = Object.freeze({
            hydratedDiaryCount: receipt.hydratedDiaryCount,
            hydratedFileCount: receipt.hydratedFileCount,
            hydratedChunkCount: receipt.hydratedChunkCount
          });
        });
      }
      await selectedDiaryHydrationPromise;
    } catch (error) {
      selectedDiaryHydrationFailureLatched = true;
      throw error;
    }
    selectedDiaryHydrationAuthorizationKey = selectedDiaryAuthorizationKey(authorization);
    selectedDiaryHydrationCompleted = true;
  }

  function instrumentSelectedDiaryIndex(index) {
    if (!index || (typeof index !== 'object' && typeof index !== 'function')) {
      throw nativeRuntimeStageError('native_selected_diary_index_recovery_failed');
    }
    if (instrumentedSelectedDiaryIndexes.has(index)) return;
    if (typeof index.search !== 'function') {
      throw nativeRuntimeStageError('native_selected_diary_index_recovery_failed');
    }
    const originalSearch = index.search;
    index.search = function governedSelectedDiaryVectorSearch(...args) {
      const accounting = vectorSearchAccountingContext.getStore();
      if (accounting) accounting.indexSearchCallCount += 1;
      try {
        const result = originalSearch.apply(this, args);
        if (result && typeof result.then === 'function') {
          return Promise.resolve(result).then(value => {
            if (accounting) {
              accounting.indexSearchSuccessCount += 1;
              const candidates = Array.isArray(value) ? value : [];
              accounting.rawCandidateCount += candidates.length;
              for (const candidate of candidates) {
                const chunkId = Number(candidate?.id);
                if (Number.isSafeInteger(chunkId) && chunkId >= 0) {
                  accounting.candidateChunkIds.add(chunkId);
                }
              }
            }
            return value;
          }, error => {
            if (accounting) accounting.indexSearchFailureCount += 1;
            throw error;
          });
        }
        if (accounting) {
          accounting.indexSearchSuccessCount += 1;
          const candidates = Array.isArray(result) ? result : [];
          accounting.rawCandidateCount += candidates.length;
          for (const candidate of candidates) {
            const chunkId = Number(candidate?.id);
            if (Number.isSafeInteger(chunkId) && chunkId >= 0) {
              accounting.candidateChunkIds.add(chunkId);
            }
          }
        }
        return result;
      } catch (error) {
        if (accounting) accounting.indexSearchFailureCount += 1;
        throw error;
      }
    };
    restoreRuntimeHooks.push(() => { index.search = originalSearch; });

    if (typeof index.remove === 'function') {
      const originalRemove = index.remove;
      index.remove = function governedSelectedDiaryGhostRemoval(...args) {
        const accounting = vectorSearchAccountingContext.getStore();
        if (accounting) accounting.ghostCandidateCount += 1;
        return originalRemove.apply(this, args);
      };
      restoreRuntimeHooks.push(() => { index.remove = originalRemove; });
    }
    instrumentedSelectedDiaryIndexes.add(index);
  }

  async function inspectAuthorizedSelectedDiaryIndexes(authorization) {
    if (!selectedDiaryRuntimeHydrator) {
      return {
        enforced: false,
        hydratedChunkCount: 0,
        loadedIndexVectorCount: 0
      };
    }
    if (!selectedDiaryHydrationReceipt ||
        typeof knowledgeBaseManager?._getOrLoadDiaryIndex !== 'function') {
      throw nativeRuntimeStageError('native_selected_diary_index_recovery_failed');
    }
    let loadedIndexVectorCount = 0;
    try {
      for (const diaryName of authorization.allowedDiaryNames) {
        const index = await knowledgeBaseManager._getOrLoadDiaryIndex(diaryName);
        instrumentSelectedDiaryIndex(index);
        if (typeof index.stats !== 'function') {
          throw new Error('selected_diary_index_stats_unavailable');
        }
        const stats = await index.stats();
        if (!Number.isSafeInteger(stats?.totalVectors) || stats.totalVectors < 0) {
          throw new Error('selected_diary_index_stats_invalid');
        }
        loadedIndexVectorCount += stats.totalVectors;
        if (!Number.isSafeInteger(loadedIndexVectorCount)) {
          throw new Error('selected_diary_index_vector_count_invalid');
        }
      }
    } catch (error) {
      if (error?.reasonCode) throw error;
      throw nativeRuntimeStageError('native_selected_diary_index_recovery_failed');
    }
    const hydratedChunkCount = selectedDiaryHydrationReceipt.hydratedChunkCount;
    if (hydratedChunkCount > 0 && loadedIndexVectorCount === 0) {
      throw nativeRuntimeStageError('native_selected_diary_index_empty_after_hydration');
    }
    return {
      enforced: true,
      hydratedChunkCount,
      loadedIndexVectorCount
    };
  }

  function instrumentTagMemoRuntime() {
    if (tagMemoInstrumented || !knowledgeBaseManager?.tagMemoEngine) return;
    const tagMemo = knowledgeBaseManager.tagMemoEngine;

    if (typeof tagMemo.doMatrixRebuild === 'function') {
      const original = tagMemo.doMatrixRebuild;
      tagMemo.doMatrixRebuild = function governedMatrixRebuild(...args) {
        if (derivedTaskAccountingContext.getStore()?.trigger === 'matrix') {
          return original.apply(this, args);
        }
        return derivedRuntimeMutationLifecycle.track('matrix', () => original.apply(this, args));
      };
      restoreRuntimeHooks.push(() => { tagMemo.doMatrixRebuild = original; });
    }

    if (typeof tagMemo._enqueueDerivedTask === 'function') {
      const original = tagMemo._enqueueDerivedTask;
      tagMemo._enqueueDerivedTask = function governedDerivedTask(type, run, taskOptions) {
        if (shuttingDown) return null;
        const trigger = type === 'epa-basis'
          ? 'vector'
          : ['matrix-rebuild', 'active-full-training'].includes(type)
            ? 'matrix'
            : 'unsupported_derived_task';
        const governedRun = () => derivedRuntimeMutationLifecycle.track(trigger, () =>
          derivedTaskAccountingContext.run({ trigger }, run)
        );
        return original.call(this, type, governedRun, taskOptions);
      };
      restoreRuntimeHooks.push(() => { tagMemo._enqueueDerivedTask = original; });
    }
    tagMemoInstrumented = true;
  }

  function instrumentRuntime() {
    if (runtimeInstrumented || !knowledgeBaseManager) return;
    if (typeof knowledgeBaseManager._getOrLoadDiaryIndex === 'function') {
      const original = knowledgeBaseManager._getOrLoadDiaryIndex;
      knowledgeBaseManager._getOrLoadDiaryIndex = function governedDiaryIndexHydration(
        diaryName,
        ...args
      ) {
        const alreadyLoaded = this.diaryIndices instanceof Map &&
          this.diaryIndices.has(diaryName);
        if (alreadyLoaded) return original.call(this, diaryName, ...args);
        return derivedRuntimeMutationLifecycle.track('hydration', () =>
          original.call(this, diaryName, ...args)
        );
      };
      restoreRuntimeHooks.push(() => { knowledgeBaseManager._getOrLoadDiaryIndex = original; });
    }
    if (typeof knowledgeBaseManager._recoverIndexFromDB === 'function') {
      const original = knowledgeBaseManager._recoverIndexFromDB;
      knowledgeBaseManager._recoverIndexFromDB = function governedVectorRecovery(...args) {
        return derivedRuntimeMutationLifecycle.track('vector', () =>
          original.apply(this, args)
        );
      };
      restoreRuntimeHooks.push(() => { knowledgeBaseManager._recoverIndexFromDB = original; });
    }
    if (typeof knowledgeBaseManager._ensureDiaryDateIndexCached === 'function') {
      const original = knowledgeBaseManager._ensureDiaryDateIndexCached;
      knowledgeBaseManager._ensureDiaryDateIndexCached = function governedDiaryCache(
        diaryName,
        ...args
      ) {
        const alreadyCached = this.diaryDateIndexCache instanceof Map &&
          this.diaryDateIndexCache.has(diaryName);
        if (alreadyCached) return original.call(this, diaryName, ...args);
        return derivedRuntimeMutationLifecycle.track('cache', () =>
          original.call(this, diaryName, ...args)
        );
      };
      restoreRuntimeHooks.push(() => {
        knowledgeBaseManager._ensureDiaryDateIndexCached = original;
      });
    }
    if (typeof knowledgeBaseManager._saveIndexToDisk === 'function') {
      const original = knowledgeBaseManager._saveIndexToDisk;
      knowledgeBaseManager._saveIndexToDisk = function governedIndexSave(name, ...args) {
        const trigger = name === 'global_tags' ? 'tag' : 'vector';
        return derivedRuntimeMutationLifecycle.track(trigger, () =>
          original.call(this, name, ...args)
        );
      };
      restoreRuntimeHooks.push(() => { knowledgeBaseManager._saveIndexToDisk = original; });
    }
    runtimeInstrumented = true;
  }

  function loadRuntime() {
    if (!runtimeInjected) {
      process.env.KNOWLEDGEBASE_ROOT_PATH = knowledgeBaseRootPath;
      process.env.KNOWLEDGEBASE_FULL_SCAN_ON_STARTUP = 'false';
      if (knowledgeBaseStorePath) {
        process.env.KNOWLEDGEBASE_STORE_PATH = knowledgeBaseStorePath;
      }
    }
    if (!knowledgeBaseManager) {
      knowledgeBaseManager = require(knowledgeBaseManagerPath);
    }
    if (!embeddingUtils) {
      embeddingUtils = require(embeddingUtilsPath);
    }
    instrumentRuntime();
  }

  async function stopSourceMutationWatchers() {
    const watcher = knowledgeBaseManager?.watcher;
    if (watcher) {
      const stopWatch = watcher.stopWatch || watcher.stop_watch;
      if (knowledgeBaseManager.watcherType === 'rust' && typeof stopWatch === 'function') {
        await stopWatch.call(watcher);
      } else if (typeof watcher.close === 'function') {
        await watcher.close();
      }
      knowledgeBaseManager.watcher = null;
    }
    const ragParamsWatcher = knowledgeBaseManager?.ragParamsWatcher;
    if (ragParamsWatcher && typeof ragParamsWatcher.close === 'function') {
      await ragParamsWatcher.close();
      knowledgeBaseManager.ragParamsWatcher = null;
    }
    const pendingSourceWork = Number(knowledgeBaseManager?.pendingFiles?.size || 0) +
      Number(knowledgeBaseManager?.pendingDeletes?.size || 0);
    if (knowledgeBaseManager?.pendingFiles?.clear) knowledgeBaseManager.pendingFiles.clear();
    if (knowledgeBaseManager?.pendingDeletes?.clear) knowledgeBaseManager.pendingDeletes.clear();
    if (pendingSourceWork > 0) {
      throw new Error('native_source_partition_mutation_pending');
    }
  }

  async function ensureReady() {
    loadRuntime();
    if (knowledgeBaseManager?.config?.fullScanOnStartup === true) {
      throw new Error('native_unscoped_initialization_forbidden');
    }
    if (!runtimeInitialized && knowledgeBaseManager &&
        typeof knowledgeBaseManager.initialize === 'function') {
      await derivedRuntimeMutationLifecycle.track('startup', () =>
        knowledgeBaseManager.initialize()
      );
      await stopSourceMutationWatchers();
      runtimeInitialized = true;
      instrumentTagMemoRuntime();
    }
  }

  async function ensurePrimaryWriteReady(toolName) {
    if (!primaryWriteOnly) {
      await fs.mkdir(knowledgeBaseRootPath, { recursive: true });
    }
    const rootStat = await fs.lstat(knowledgeBaseRootPath);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new Error('primary_write_root_invalid');
    }
    if (primaryWritePreflight) {
      const projection = await primaryWritePreflight({
        toolName,
        knowledgeBaseRootPath
      });
      if (projection?.accepted !== true) {
        throw new Error('primary_write_preflight_rejected');
      }
    }
  }

  async function runNativeReadProbe(
    args = {},
    fallbackQuery = 'codex memory governed native read proof',
    authorization = null
  ) {
    if (
      authorization?.accepted !== true ||
      !Array.isArray(authorization.allowedDiaryNames) ||
      authorization.allowedDiaryNames.length < 1 ||
      authorization.allowedDiaryNames.length > 8
    ) {
      throw new Error('native_diary_authorization_required');
    }
    bindDerivedMutationAuthorization(authorization);
    const releaseSelectedDiaryHydrationScope =
      reserveSelectedDiaryHydrationScope(authorization);
    try {
      try {
        await ensureReady();
      } catch {
        throw nativeRuntimeStageError('native_runtime_initialization_failed');
      }
      const query = boundedString(args.query, 1000) || fallbackQuery;
      const limit = normalizeLimit(args.limit ?? args.max_results, 1);
      let embeddings;
      try {
        embeddings = await embeddingUtils.getEmbeddingsBatch(
          [query],
          runtimeInjected
            ? {}
            : {
                apiUrl: process.env.API_URL,
                apiKey: process.env.API_Key,
                model: process.env.WhitelistEmbeddingModel
              }
        );
      } catch {
        throw nativeRuntimeStageError('native_provider_embedding_failed');
      }
      const vector = embeddings && embeddings[0];
      if (!vector) {
        throw nativeRuntimeStageError('native_provider_embedding_failed');
      }
      const queryVectorDiagnostics = validateNativeQueryVector(
        vector,
        knowledgeBaseManager?.config?.dimension,
        { requireExpectedDimension: selectedDiaryRuntimeHydrator !== null }
      );
      try {
        await hydrateAuthorizedSelectedDiaries(authorization);
      } catch {
        throw nativeRuntimeStageError('native_selected_diary_hydration_failed');
      }
      const indexDiagnostics = await inspectAuthorizedSelectedDiaryIndexes(authorization);
      const vectorSearchAccounting = {
        indexSearchCallCount: 0,
        indexSearchSuccessCount: 0,
        indexSearchFailureCount: 0,
        rawCandidateCount: 0,
        ghostCandidateCount: 0,
        candidateChunkIds: new Set()
      };
      let results;
      try {
        results = await vectorSearchAccountingContext.run(
          vectorSearchAccounting,
          () => knowledgeBaseManager.search(
            authorization.allowedDiaryNames,
            vector,
            limit,
            0,
            []
          )
        );
      } catch {
        throw nativeRuntimeStageError('native_diary_search_failed');
      }
      if (vectorSearchAccounting.indexSearchFailureCount > 0 ||
          vectorSearchAccounting.indexSearchSuccessCount !==
            vectorSearchAccounting.indexSearchCallCount) {
        throw nativeRuntimeStageError('native_vector_search_failed');
      }
      if (vectorSearchAccounting.ghostCandidateCount > 0) {
        throw nativeRuntimeStageError('native_vector_search_ghost_result');
      }
      if (indexDiagnostics.enforced &&
          indexDiagnostics.loadedIndexVectorCount > 0 &&
          vectorSearchAccounting.indexSearchCallCount === 0) {
        throw nativeRuntimeStageError('native_vector_search_not_executed');
      }
      const rawResultCount = Array.isArray(results) ? results.length : 0;
      if (indexDiagnostics.enforced &&
          indexDiagnostics.loadedIndexVectorCount === 0 && (
            rawResultCount > 0 ||
            vectorSearchAccounting.indexSearchCallCount > 0 ||
            vectorSearchAccounting.rawCandidateCount > 0
          )) {
        throw nativeRuntimeStageError('native_vector_search_not_executed');
      }
      if (indexDiagnostics.enforced &&
          rawResultCount > vectorSearchAccounting.rawCandidateCount) {
        throw nativeRuntimeStageError('native_vector_search_failed');
      }
      if (indexDiagnostics.enforced && rawResultCount > 0 && results.some(result => {
        const chunkId = Number(result?.chunkId);
        return !Number.isSafeInteger(chunkId) || chunkId < 0 ||
          !vectorSearchAccounting.candidateChunkIds.has(chunkId);
      })) {
        throw nativeRuntimeStageError('native_vector_search_failed');
      }
      const postcheck = postCheckNativeDiaryResults(results, authorization.allowedDiaryNames);
      if (!postcheck.accepted) {
        throw nativeRuntimeStageError(
          'native_result_scope_postcheck_failed',
          postcheck.reasonCode
        );
      }
      const vectorRetrievalDiagnostics = {
        vectorRetrievalDiagnosticsMode: indexDiagnostics.enforced
          ? VECTOR_RETRIEVAL_DIAGNOSTICS_MODE
          : 'not_applicable',
        ...queryVectorDiagnostics,
        hydratedChunkCount: indexDiagnostics.hydratedChunkCount,
        loadedIndexVectorCount: indexDiagnostics.loadedIndexVectorCount,
        indexSearchCalled: vectorSearchAccounting.indexSearchCallCount > 0,
        indexSearchSucceeded: vectorSearchAccounting.indexSearchCallCount > 0 &&
          vectorSearchAccounting.indexSearchFailureCount === 0 &&
          vectorSearchAccounting.indexSearchSuccessCount ===
            vectorSearchAccounting.indexSearchCallCount,
        rawCandidateCount: vectorSearchAccounting.rawCandidateCount,
        ghostCandidateCount: vectorSearchAccounting.ghostCandidateCount,
        vectorRetrievalOutcome: indexDiagnostics.enforced &&
          indexDiagnostics.loadedIndexVectorCount === 0
          ? 'empty_index'
          : rawResultCount > 0
            ? 'found'
            : 'empty'
      };
      return {
        results: projectReadResults(results),
        rawResultCount,
        runtimeReceipt: defaultReadRuntimeReceipt({
          nativeRuntimeInitialized: true,
          providerApiCalled: true,
          memoryReadPerformed: true,
          isolatedRuntimeStoreUsed: isolatedRuntimeStoreConfigured,
          authorization,
          resultScopePostcheckPassed: true,
          derivedRuntimeMutation: takeDerivedMutationReceipt(),
          vectorRetrievalDiagnostics
        })
      };
    } finally {
      releaseSelectedDiaryHydrationScope();
    }
  }

  async function search(args = {}, context = {}) {
    if (context.authorization?.accepted !== true) {
      throw new Error('native_diary_authorization_required');
    }
    bindDerivedMutationAuthorization(context.authorization);
    const query = boundedString(args.query, 1000);
    if (!query.trim()) {
      return {
        results: [],
        _nativeRuntimeReceipt: defaultReadRuntimeReceipt({
          providerApiCalled: false,
          memoryReadPerformed: false,
          isolatedRuntimeStoreUsed: isolatedRuntimeStoreConfigured,
          authorization: context.authorization,
          resultScopePostcheckPassed: true,
          derivedRuntimeMutation: takeDerivedMutationReceipt()
        })
      };
    }
    const readProbe = await runNativeReadProbe(
      args,
      'codex memory governed native search proof',
      context.authorization
    );
    return {
      results: readProbe.results,
      _nativeRuntimeReceipt: readProbe.runtimeReceipt
    };
  }

  async function overview(args = {}, context = {}) {
    const readProbe = await runNativeReadProbe(
      { ...args, limit: normalizeLimit(args.limit ?? args.max_results, 1) },
      'codex memory governed native overview proof',
      context.authorization
    );
    return {
      overview: {
        status: 'available',
        resultCountBucket: bucketCount(readProbe.rawResultCount),
        rawMemoryContentDisclosed: false,
        readinessClaimed: false
      },
      _nativeRuntimeReceipt: readProbe.runtimeReceipt
    };
  }

  async function audit(args = {}, context = {}) {
    const readProbe = await runNativeReadProbe(
      {
        ...args,
        limit: normalizeLimit(args.window ?? args.limit ?? args.max_results, 1)
      },
      'codex memory governed native audit proof',
      context.authorization
    );
    return {
      audit: {
        status: 'available',
        findingCountBucket: 'zero',
        sampledReadResultCountBucket: bucketCount(readProbe.rawResultCount),
        includeRawHonored: args.include_raw !== true,
        rawMemoryContentDisclosed: false,
        readinessClaimed: false
      },
      _nativeRuntimeReceipt: readProbe.runtimeReceipt
    };
  }

  async function record(args = {}) {
    const title = boundedString(args.title, 200) || 'codex-memory governed native record';
    const markdown = createRecordMarkdown(args);
    const digest = crypto
      .createHash('sha256')
      .update(markdown)
      .digest('hex')
      .slice(0, 16);
    const dir = path.join(knowledgeBaseRootPath, writeSubdir);
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeFilenamePart(title)}-${digest}.md`;
    const filePath = path.join(dir, filename);
    await ensurePrimaryWriteReady('record_memory');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, markdown, { encoding: 'utf8', flag: 'wx' });
    return {
      recorded: true,
      memory_id_ref: `vcp-kb-${digest}`,
      write_shape: 'markdown_dailynote_file',
      raw_path_disclosed: false,
      _nativeRuntimeReceipt: nativeRuntimeReceipt({
        nativeRuntimeCalled: false,
        nativeRuntimeInitialized: false,
        providerApiCalled: false,
        memoryReadPerformed: false,
        memoryWritePerformed: true,
        durableWritePerformed: true,
        durableWriteScope: 'primary_memory_write',
        isolatedRuntimeStoreUsed: false,
        primaryMemoryStoreWritePerformed: true,
        derivedIndexWritePerformed: false
      })
    };
  }

  async function mutationMarker(toolName, args = {}) {
    const markdown = createMutationMarkdown(toolName, args);
    const digest = crypto
      .createHash('sha256')
      .update(markdown)
      .digest('hex')
      .slice(0, 16);
    const dir = path.join(knowledgeBaseRootPath, writeSubdir);
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeFilenamePart(toolName)}-${digest}.md`;
    const filePath = path.join(dir, filename);
    await ensurePrimaryWriteReady(toolName);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, markdown, { encoding: 'utf8', flag: 'wx' });
    return {
      recorded: true,
      memory_id_ref: `vcp-kb-${digest}`,
      write_shape: 'markdown_dailynote_mutation_marker',
      mutation_tool: toolName,
      raw_path_disclosed: false,
      _nativeRuntimeReceipt: nativeRuntimeReceipt({
        nativeRuntimeCalled: false,
        nativeRuntimeInitialized: false,
        providerApiCalled: false,
        memoryReadPerformed: false,
        memoryWritePerformed: true,
        durableWritePerformed: true,
        durableWriteScope: 'primary_memory_mutation_marker',
        isolatedRuntimeStoreUsed: false,
        primaryMemoryStoreWritePerformed: true,
        derivedIndexWritePerformed: false
      })
    };
  }

  return {
    search,
    overview,
    audit,
    record,
    tombstone: args => mutationMarker('tombstone_memory', args),
    supersede: args => mutationMarker('supersede_memory', args),
    takeDerivedRuntimeMutationReceipt: () => derivedRuntimeMutationLifecycle.projection(),
    getDerivedRuntimeMutationShutdownReceipt: () => shutdownReceipt,
    async shutdown() {
      if (shutdownReceipt) return shutdownReceipt;
      if (shutdownError) throw shutdownError;
      shuttingDown = true;
      const tagMemo = knowledgeBaseManager?.tagMemoEngine;
      const cancelBackgroundScheduling = () => {
        for (const timerField of [
          '_postStartupDerivedRefreshTimer',
          '_derivedTaskTimer',
          '_matrixRebuildTimer'
        ]) {
          if (tagMemo?.[timerField]) {
            clearTimeout(tagMemo[timerField]);
            tagMemo[timerField] = null;
          }
        }
        if (Array.isArray(tagMemo?._derivedTaskQueue) &&
            tagMemo?._derivedTaskRunning !== true) {
          tagMemo._derivedTaskQueue = [];
        }
      };
      try {
        cancelBackgroundScheduling();
        await derivedRuntimeMutationLifecycle.waitForIdle({ timeoutMs: 10_000 });
        cancelBackgroundScheduling();
        const pendingSourceWork = Number(knowledgeBaseManager?.pendingFiles?.size || 0) +
          Number(knowledgeBaseManager?.pendingDeletes?.size || 0);
        if (knowledgeBaseManager?.pendingFiles?.clear) knowledgeBaseManager.pendingFiles.clear();
        if (knowledgeBaseManager?.pendingDeletes?.clear) knowledgeBaseManager.pendingDeletes.clear();
        if (knowledgeBaseManager && typeof knowledgeBaseManager.shutdown === 'function') {
          await knowledgeBaseManager.shutdown();
        }
        cancelBackgroundScheduling();
        const finalReceipt = await derivedRuntimeMutationLifecycle.drain({ timeoutMs: 10_000 });
        if (pendingSourceWork > 0) {
          shutdownError = new Error('native_source_partition_mutation_pending');
          throw shutdownError;
        }
        shutdownReceipt = finalReceipt;
        return shutdownReceipt;
      } catch (error) {
        shutdownError = error;
        throw error;
      } finally {
        while (restoreRuntimeHooks.length > 0) restoreRuntimeHooks.pop()();
        knowledgeBaseManager = null;
        embeddingUtils = null;
      }
    }
  };
}

function createGovernedMcpVcpNativeVcpToolBoxMcpShimHandler(options = {}) {
  const adapter = options.adapter || createVcpToolBoxNativeMemoryAdapter(options);
  const enableWrite = options.enableWrite === true;
  const mappingState = loadDiaryScopeMapping({
    mapping: options.diaryScopeMapping,
    mappingPath: options.diaryScopeMappingPath,
    readFileSync: options.readFileSync
  });

  const handleJsonRpc = async function handleJsonRpc(body = {}) {
    if (!isPlainObject(body) || body.jsonrpc !== '2.0') {
      return jsonRpcError(body?.id, -32600, 'Invalid Request');
    }
    if (body.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: body.id,
        result: initializeResult(enableWrite, mappingState)
      };
    }
    if (body.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: body.id,
        result: toolsListResult(enableWrite, mappingState)
      };
    }
    if (body.method !== 'tools/call') {
      return jsonRpcError(body.id, -32601, 'Method not found');
    }
    const params = isPlainObject(body.params) ? body.params : {};
    const nativeToolName = typeof params.name === 'string' ? params.name : '';
    const governanceMeta = params._meta?.codexMemoryGovernance;
    const governance = validateGovernanceForNativeTool(nativeToolName, governanceMeta);
    if (governance.accepted !== true) {
      return jsonRpcError(body.id, -32602, 'Governance metadata rejected', {
        reasonCode: governance.reasonCode,
        lowDisclosure: true,
        rawRequestBodyDisclosed: false,
        rawResponseBodyDisclosed: false
      });
    }

    const args = projectNativeArguments(
      nativeToolName,
      governance.publicToolName,
      params.arguments,
      governanceMeta
    );
    try {
      if (['knowledge_base.search', 'memory_overview', 'audit_memory'].includes(nativeToolName)) {
        const scopeEnforcement = governanceMeta?.scopeEnforcement;
        if (
          mappingState.accepted !== true ||
          scopeEnforcement?.mode !== 'diary_allowlist_v1' ||
          scopeEnforcement?.bound !== true ||
          scopeEnforcement?.expectedMappingReference !== mappingState.mappingReference ||
          scopeEnforcement?.expectedMappingDigest !== mappingState.mappingDigest
        ) {
          return jsonRpcError(body.id, -32602, 'Diary scope enforcement rejected', {
            reasonCode: mappingState.accepted === true
              ? 'diary_scope_mapping_binding_mismatch'
              : 'diary_scope_mapping_missing',
            lowDisclosure: true
          });
        }
        const authorization = resolveRead({
          mapping: mappingState.mapping,
          trustedScope: canonicalScopeFromGovernanceMeta(governanceMeta),
          recallProfile: scopeEnforcement.recallProfile
        });
        if (authorization.accepted !== true || authorization.allowedDiaryCount < 1) {
          return jsonRpcError(body.id, -32602, 'Diary scope authorization rejected', {
            reasonCode: 'diary_scope_authorization_rejected',
            lowDisclosure: true
          });
        }
        const methodName = nativeToolName === 'knowledge_base.search'
          ? 'search'
          : nativeToolName === 'memory_overview'
            ? 'overview'
            : 'audit';
        if (typeof adapter[methodName] !== 'function') {
          return jsonRpcError(body.id, -32602, 'Native read tool unavailable', {
            reasonCode: 'native_read_tool_unavailable',
            lowDisclosure: true
          });
        }
        const nativeResult = await adapter[methodName](args, {
          publicToolName: governance.publicToolName,
          authorization
        });
        const runtimeReceipt = nativeResult?._nativeRuntimeReceipt || defaultReadRuntimeReceipt({
          authorization,
          resultScopePostcheckPassed: true
        });
        const { _nativeRuntimeReceipt, ...structuredContent } = isPlainObject(nativeResult) ? nativeResult : {};
        return jsonRpcResult(body.id, structuredContent, runtimeReceipt);
      }
      if (nativeToolName === 'knowledge_base.record' || nativeToolName === 'knowledge_base.write') {
        if (enableWrite !== true) {
          return jsonRpcError(body.id, -32602, 'Native write disabled', {
            reasonCode: 'native_write_disabled',
            lowDisclosure: true
          });
        }
        const nativeResult = await adapter.record(args, {
          publicToolName: governance.publicToolName
        });
        const runtimeReceipt = nativeResult?._nativeRuntimeReceipt || nativeRuntimeReceipt({
          nativeRuntimeCalled: true,
          nativeRuntimeInitialized: true,
          providerApiCalled: false,
          memoryReadPerformed: false,
          memoryWritePerformed: true,
          durableWritePerformed: true,
          durableWriteScope: 'primary_memory_write',
          isolatedRuntimeStoreUsed: false,
          primaryMemoryStoreWritePerformed: true,
          derivedIndexWritePerformed: false
        });
        const { _nativeRuntimeReceipt, ...structuredContent } = isPlainObject(nativeResult) ? nativeResult : {};
        return jsonRpcResult(body.id, structuredContent, runtimeReceipt);
      }
      if (nativeToolName === 'knowledge_base.tombstone' || nativeToolName === 'knowledge_base.supersede') {
        if (enableWrite !== true) {
          return jsonRpcError(body.id, -32602, 'Native write disabled', {
            reasonCode: 'native_write_disabled',
            lowDisclosure: true
          });
        }
        const methodName = nativeToolName === 'knowledge_base.tombstone' ? 'tombstone' : 'supersede';
        if (typeof adapter[methodName] !== 'function') {
          return jsonRpcError(body.id, -32602, 'Native mutation tool unavailable', {
            reasonCode: 'native_mutation_tool_unavailable',
            lowDisclosure: true
          });
        }
        const nativeResult = await adapter[methodName](args, {
          publicToolName: governance.publicToolName
        });
        const runtimeReceipt = nativeResult?._nativeRuntimeReceipt || nativeRuntimeReceipt({
          nativeRuntimeCalled: true,
          nativeRuntimeInitialized: true,
          providerApiCalled: false,
          memoryReadPerformed: false,
          memoryWritePerformed: true,
          durableWritePerformed: true,
          durableWriteScope: 'primary_memory_mutation_marker',
          isolatedRuntimeStoreUsed: false,
          primaryMemoryStoreWritePerformed: true,
          derivedIndexWritePerformed: false
        });
        const { _nativeRuntimeReceipt, ...structuredContent } = isPlainObject(nativeResult) ? nativeResult : {};
        return jsonRpcResult(body.id, structuredContent, runtimeReceipt);
      }
      return jsonRpcError(body.id, -32602, 'Unsupported native tool');
    } catch (error) {
      return jsonRpcError(body.id, -32000, 'Native runtime call failed', {
        reasonCode: nativeRuntimeFailureReasonCode(error),
        lowDisclosure: true,
        rawErrorDisclosed: false
      });
    }
  };
  handleJsonRpc.takeDerivedRuntimeMutationReceipt = () =>
    typeof adapter.takeDerivedRuntimeMutationReceipt === 'function'
      ? adapter.takeDerivedRuntimeMutationReceipt()
      : null;
  handleJsonRpc.shutdownGovernedRuntime = async () =>
    typeof adapter.shutdown === 'function' ? adapter.shutdown() : null;
  return handleJsonRpc;
}

function createGovernedMcpVcpNativeVcpToolBoxMcpShimServer(options = {}) {
  const handler = createGovernedMcpVcpNativeVcpToolBoxMcpShimHandler(options);
  const expectedBearerToken = typeof options.expectedBearerToken === 'string'
    ? options.expectedBearerToken
    : '';
  let authorizedRequestCount = 0;
  let rejectedAuthorizationCount = 0;
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify(jsonRpcError(null, -32601, 'Method not found')));
      return;
    }
    if (expectedBearerToken) {
      const actualHeader = typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : '';
      const actualBytes = Buffer.from(actualHeader, 'utf8');
      const expectedBytes = Buffer.from(`Bearer ${expectedBearerToken}`, 'utf8');
      const matched = actualBytes.length === expectedBytes.length &&
        crypto.timingSafeEqual(actualBytes, expectedBytes);
      if (!matched) {
        rejectedAuthorizationCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify(jsonRpcError(null, -32001, 'Unauthorized', {
          reasonCode: 'transport_authorization_rejected',
          lowDisclosure: true
        })));
        return;
      }
      authorizedRequestCount += 1;
    }
    try {
      const rawBody = await readRequestBody(req, options.maxRequestBytes || 1024 * 1024);
      const body = JSON.parse(rawBody || '{}');
      const response = await handler(body);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')));
    }
  });
  server.getLowDisclosureAuthorizationProjection = () => ({
    authorizationRequired: Boolean(expectedBearerToken),
    authorizedRequestCount,
    rejectedAuthorizationCount,
    tokenMaterialDisclosed: false
  });
  server.takeDerivedRuntimeMutationReceipt = () =>
    handler.takeDerivedRuntimeMutationReceipt();
  server.shutdownGovernedRuntime = async () => {
    let finalReceipt = null;
    let runtimeError = null;
    let closeError = null;
    try {
      finalReceipt = await handler.shutdownGovernedRuntime();
    } catch (error) {
      runtimeError = error;
    }
    try {
      if (server.listening) {
        await new Promise((resolve, reject) => {
          server.close(error => error ? reject(error) : resolve());
        });
      }
    } catch (error) {
      closeError = error;
    }
    if (runtimeError) throw runtimeError;
    if (closeError) throw closeError;
    return finalReceipt;
  };
  return server;
}

module.exports = {
  GOVERNANCE_METADATA_PATH,
  PUBLIC_TOOL_TO_NATIVE_TOOLS,
  createMutationMarkdown,
  createRecordMarkdown,
  createGovernedMcpVcpNativeVcpToolBoxMcpShimHandler,
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createVcpToolBoxNativeMemoryAdapter,
  initializeResult,
  toolsListResult,
  validateGovernanceForNativeTool
};
