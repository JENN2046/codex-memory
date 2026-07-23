'use strict';

const {
  COUNTER_MODES,
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  createOpaqueId,
  createProjectContextClaim,
  digestObject,
  validatePublicStructuredContent,
  reject
} = require('../../../packages/chatgpt-r4-contracts');
const { createGovernanceAdapter } = require('./governance-adapter');
const { resolveRegisteredProject, visibilityScope } = require('./project-registry');

const R4_LIVE_READ_MODE = COUNTER_MODES.governedLiveReadV1;
const R4_SESSION_SCOPED_LIVE_READ_MODE = COUNTER_MODES.sessionScopedLiveReadV1;
const NATIVE_SHARED_READ_CLIENT_ID = 'Codex';
const MAX_CONTEXTS = 1024;
const MAX_AUTHORIZED_TOOL_CALLS = 20;
const MAX_R5A_AUTHORIZED_TOOL_CALLS = 40;
const MAX_INACTIVE_REQUEST_ATTEMPTS = 128;
const MIN_PUBLIC_RELEVANCE = 0.5;
const R5A_POST_CALL_SAFETY_ERROR_CODES = new Set([
  'r4_live_read_native_delegation_rejected',
  'r4_live_read_native_receipt_invalid',
  'r4_live_read_mapping_disclosure_forbidden',
  'r4_live_read_native_evidence_missing',
  'response_structured_content_shape_invalid'
]);
const R5A_OBSERVED_TOOL_NAMES = new Set([
  'resolve_memory_context',
  'memory_overview',
  'search_memory',
  'audit_memory',
  'prepare_memory_context'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createContextAuthority({
  registryState,
  mappingState,
  selectedProjectAlias,
  signing,
  activationController = null,
  clock = () => new Date(),
  randomBytes
}) {
  if (!registryState?.accepted || !mappingState?.accepted ||
      typeof selectedProjectAlias !== 'string' ||
      !signing?.privateKey || typeof signing.keyId !== 'string' ||
      (activationController !== null &&
       (typeof activationController.checkContextIssueAuthorization !== 'function' ||
        typeof activationController.authorizeContextIssue !== 'function' ||
        typeof activationController.bindContext !== 'function' ||
        typeof activationController.checkReadAuthorization !== 'function'))) {
    reject('r4_context_authority_invalid');
  }
  const selectedProject = registryState.registry.projects.find(project =>
    project.safeProjectAlias === selectedProjectAlias
  );
  if (!selectedProject) reject('r4_context_selected_project_unregistered');
  const publicKey = require('node:crypto').createPublicKey(signing.privateKey);
  const contexts = new Map();

  function prune(nowMs = clock().getTime()) {
    for (const [reference, claim] of contexts) {
      if (Date.parse(claim.expires_at) <= nowMs) contexts.delete(reference);
    }
  }

  return Object.freeze({
    resolvePublicKey(keyId) {
      return keyId === signing.keyId ? publicKey : null;
    },
    async issue({ principalFingerprint, safeProjectAlias, requestedVisibility, now }) {
      const preauthorization = activationController?.checkContextIssueAuthorization({
        principalFingerprint,
        safeProjectAlias,
        requestedVisibility,
        now
      });
      if (preauthorization && preauthorization.accepted !== true) {
        return {
          status: preauthorization.governed_status || 'unavailable',
          activation_receipt_digest: preauthorization.receipt_digest
        };
      }
      const project = resolveRegisteredProject(
        registryState,
        safeProjectAlias,
        requestedVisibility
      );
      if (!project || project.projectId !== selectedProject.projectId) {
        return activationController ? {
          status: 'denied',
          activation_receipt_digest: preauthorization.receipt_digest
        } : { status: 'denied' };
      }
      prune(now.getTime());
      if (contexts.size >= MAX_CONTEXTS) {
        return {
          status: 'unavailable',
          ...(preauthorization
            ? { activation_receipt_digest: preauthorization.receipt_digest }
            : {})
        };
      }
      const activation = activationController?.authorizeContextIssue({
        principalFingerprint,
        safeProjectAlias,
        requestedVisibility,
        now
      });
      if (activation && activation.accepted !== true) {
        return {
          status: activation.governed_status || 'unavailable',
          activation_receipt_digest: activation.receipt_digest
        };
      }
      const projectContextRef = createOpaqueId('pctx_', randomBytes);
      const claim = createProjectContextClaim({
        projectContextRef,
        principalFingerprint,
        projectId: project.projectId,
        workspaceId: project.workspaceId,
        visibilityAllowlist: visibilityLabels(requestedVisibility),
        registryReference: registryState.registryReference,
        mappingReference: mappingState.mappingReference,
        mappingDigest: mappingState.mappingDigest,
        now,
        ttlSeconds: activation?.context_ttl_seconds,
        nonce: createOpaqueId('cn_', randomBytes, 18),
        signing
      });
      const bound = activationController?.bindContext({ projectContextRef, now });
      contexts.set(projectContextRef, claim);
      return {
        claim,
        safe_project_alias: project.safeProjectAlias,
        ...(bound ? { activation_receipt_digest: bound.receipt_digest } : {})
      };
    },
    async resolve(reference) {
      prune();
      return contexts.get(reference) || null;
    },
    snapshot() {
      prune();
      return Object.freeze({ active_context_count: contexts.size, durable_state_written: false });
    }
  });
}

function visibilityLabels(requestedVisibility) {
  if (requestedVisibility === 'shared') return ['project', 'workspace', 'shared'];
  if (requestedVisibility === 'task_start_context') {
    return ['project', 'workspace', 'task_start_context'];
  }
  return [requestedVisibility];
}

function effectiveVisibility(labels) {
  if (!Array.isArray(labels)) reject('r4_context_visibility_invalid');
  if (labels.length === 1 && labels[0] === 'project') return 'project';
  if (labels.length === 1 && labels[0] === 'workspace') return 'workspace';
  if (labels.includes('shared') || labels.includes('task_start_context')) return 'shared';
  reject('r4_context_visibility_invalid');
}

function buildNativeRequest(toolName, args) {
  if (toolName === 'search_memory') {
    return {
      nativeToolName: 'search_memory',
      args: {
        query: args.query,
        target: 'both',
        limit: Math.min(Number(args.limit) || 5, 5),
        include_content: false
      }
    };
  }
  if (toolName === 'prepare_memory_context') {
    return {
      nativeToolName: 'search_memory',
      args: {
        query: args.task_summary || 'current project task context',
        target: 'both',
        limit: 5,
        include_content: false
      }
    };
  }
  if (toolName === 'memory_overview') {
    return { nativeToolName: toolName, args: { limit: 1, auditWindow: 0 } };
  }
  if (toolName === 'audit_memory') {
    return {
      nativeToolName: toolName,
      args: { 'window': Math.min(Number(args.event_limit) || 5, 5), include_raw: false }
    };
  }
  reject('r4_live_read_tool_invalid');
}

function buildRequestContext({ trustedScope, visibility, projectContextRef, nativeToolName }) {
  const executionContext = {
    agentAlias: NATIVE_SHARED_READ_CLIENT_ID,
    clientId: NATIVE_SHARED_READ_CLIENT_ID,
    projectId: trustedScope.projectId,
    workspaceId: trustedScope.workspaceId,
    visibility,
    requestSource: 'chatgpt-r4-governed-live-read'
  };
  return {
    executionContext,
    trustedExecutionContext: {
      accepted: true,
      executionContext
    },
    outputDisclosureBudget: {
      level: 'summary',
      lowDisclosure: true,
      rawOutput: false,
      maxItems: 5,
      maxBytes: 4096
    },
    auditReceipt: {
      receipt_id: `r4f-${nativeToolName}-${digestObject(projectContextRef).slice(7, 23)}`
    },
    rollbackPosture: { mode: 'read_only_no_write' }
  };
}

function emptyIndexSearchEvidenceComplete(runtime) {
  return (runtime.indexSearchCalled === false &&
    runtime.indexSearchSucceeded === false) ||
    (runtime.indexSearchCalled === true &&
      runtime.indexSearchSucceeded === true);
}

function emptyIndexDelegatedResultEvidenceComplete(result) {
  const evidence = [];
  if (Array.isArray(result?.results)) evidence.push(result.results.length === 0);
  if (Array.isArray(result?.items)) evidence.push(result.items.length === 0);
  if (isPlainObject(result?.overview)) {
    evidence.push(result.overview.resultCountBucket === 'zero');
  }
  if (isPlainObject(result?.audit)) {
    evidence.push(result.audit.sampledReadResultCountBucket === 'zero');
  }
  return evidence.length === 1 && evidence[0] === true;
}

function nativeEvidence(result, expectedAllowedDiaryCount) {
  const receipt = result?.receipt;
  const invocation = receipt?.nativeInvocationReceipt;
  const runtime = invocation?.nativeRuntimeReceipt;
  if (!isPlainObject(receipt) || !isPlainObject(invocation) || !isPlainObject(runtime) ||
      result?.access?.localMemoryFallbackUsed !== false ||
      invocation.invocationBindingMatched !== true ||
      invocation.governanceMetadataSent !== true ||
      invocation.governanceMetadataRawValueDisclosed !== false ||
      invocation.endpointDisclosed !== false ||
      invocation.tokenMaterialDisclosed !== false ||
      invocation.rawRequestBodyDisclosed !== false ||
      invocation.rawResponseBodyDisclosed !== false ||
      runtime.present !== true ||
      runtime.nativeRuntimeCalled !== true ||
      typeof runtime.providerApiCalled !== 'boolean' ||
      typeof runtime.derivedIndexWritePerformed !== 'boolean' ||
      runtime.memoryReadPerformed !== true ||
      runtime.memoryWritePerformed !== false ||
      runtime.isolatedRuntimeStoreUsed !== true ||
      typeof runtime.durableWritePerformed !== 'boolean' ||
      runtime.primaryMemoryStoreWritePerformed !== false ||
      runtime.durableWritePerformed !== runtime.derivedIndexWritePerformed ||
      runtime.derivedRuntimeMutationPolicy !== 'isolated_derived_runtime_mutation_v1' ||
      runtime.derivedRuntimeMutationAccountingMode !== 'lifecycle_event_v1' ||
      runtime.derivedRuntimeMutationAuthorized !== true ||
      runtime.derivedRuntimeMutationAccountingFinal !== false ||
      runtime.derivedRuntimeMutationBackgroundTasksDrained !== false ||
      runtime.derivedRuntimeMutationZeroClaimed !== false ||
      runtime.derivedRuntimeMutationPolicyViolation !== false ||
      runtime.sourcePartitionMutationPerformed !== false ||
      runtime.legacyPartitionAccessed !== false ||
      runtime.ambiguousPartitionAccessed !== false ||
      runtime.unregisteredPartitionAccessed !== false ||
      runtime.derivedRuntimeMutationRawDetailsDisclosed !== false ||
      !Number.isInteger(runtime.derivedRuntimeMutationCumulativeCount) ||
      runtime.derivedRuntimeMutationCumulativeCount < 0 ||
      !Number.isInteger(runtime.derivedRuntimeMutationReceiptDelta) ||
      runtime.derivedRuntimeMutationReceiptDelta < 0 ||
      runtime.derivedRuntimeMutationReceiptDelta >
        runtime.derivedRuntimeMutationCumulativeCount ||
      !Number.isInteger(runtime.derivedRuntimeMutationActiveCount) ||
      runtime.derivedRuntimeMutationActiveCount < 0 ||
      !Number.isInteger(runtime.derivedRuntimeMutationCompletedCount) ||
      runtime.derivedRuntimeMutationCompletedCount < 0 ||
      !Number.isInteger(runtime.derivedRuntimeMutationFailedCount) ||
      runtime.derivedRuntimeMutationFailedCount < 0 ||
      runtime.derivedRuntimeMutationCompletedCount +
        runtime.derivedRuntimeMutationFailedCount +
        runtime.derivedRuntimeMutationActiveCount !==
        runtime.derivedRuntimeMutationCumulativeCount ||
      !Array.isArray(runtime.derivedRuntimeMutationTriggerCategories) ||
      runtime.derivedRuntimeMutationTriggerCategories.some(value =>
        !['startup', 'hydration', 'cache', 'vector', 'tag', 'matrix'].includes(value)
      ) ||
      new Set(runtime.derivedRuntimeMutationTriggerCategories).size !==
        runtime.derivedRuntimeMutationTriggerCategories.length ||
      (runtime.derivedRuntimeMutationCumulativeCount > 0 &&
        runtime.derivedRuntimeMutationTriggerCategories.length === 0) ||
      runtime.derivedIndexWritePerformed !==
        (runtime.derivedRuntimeMutationCumulativeCount > 0) ||
      (runtime.derivedIndexWritePerformed === true && ![
        'isolated_derived_index',
        'native_runtime_store'
      ].includes(runtime.durableWriteScope)) ||
      runtime.authorizationResolvedBeforeProvider !== true ||
      runtime.diaryAllowlistEnforcedBeforeIndexLoad !== true ||
      runtime.diaryAllowlistEnforcedBeforeVectorSearch !== true ||
      runtime.resultScopePostcheckPassed !== true ||
      runtime.unscopedNativeSearchUsed !== false ||
      runtime.mappingReferenceBound !== true ||
      runtime.mappingDigestBound !== true ||
      runtime.allowedDiaryCount !== expectedAllowedDiaryCount ||
      runtime.rawDiaryNamesReturned !== false ||
      runtime.vectorRetrievalDiagnosticsMode !== 'fail_closed_v1' ||
      !Number.isSafeInteger(runtime.hydratedChunkCount) ||
      runtime.hydratedChunkCount < 0 ||
      !Number.isSafeInteger(runtime.loadedIndexVectorCount) ||
      runtime.loadedIndexVectorCount < 0 ||
      runtime.queryVectorShapeValid !== true ||
      runtime.queryVectorExpectedDimensionKnown !== true ||
      runtime.queryVectorDimensionMatched !== true ||
      runtime.queryVectorFinite !== true ||
      runtime.queryVectorNonzero !== true ||
      !Number.isSafeInteger(runtime.rawCandidateCount) ||
      runtime.rawCandidateCount < 0 ||
      runtime.ghostCandidateCount !== 0 ||
      !['empty_index', 'empty', 'found'].includes(runtime.vectorRetrievalOutcome) ||
      runtime.vectorRetrievalRawDetailsDisclosed !== false ||
      (runtime.loadedIndexVectorCount > 0 && (
        runtime.indexSearchCalled !== true ||
        runtime.indexSearchSucceeded !== true ||
        !['empty', 'found'].includes(runtime.vectorRetrievalOutcome)
      )) ||
      (runtime.loadedIndexVectorCount === 0 &&
        runtime.vectorRetrievalOutcome !== 'empty_index') ||
      (runtime.vectorRetrievalOutcome === 'empty_index' && (
        runtime.hydratedChunkCount !== 0 ||
        runtime.loadedIndexVectorCount !== 0 ||
        !emptyIndexSearchEvidenceComplete(runtime) ||
        runtime.rawCandidateCount !== 0 ||
        !emptyIndexDelegatedResultEvidenceComplete(result)
      )) ||
      (runtime.vectorRetrievalOutcome === 'found' &&
        runtime.rawCandidateCount < 1) ||
      runtime.rawRuntimeOutputDisclosed !== false ||
      runtime.rawMemoryContentDisclosed !== false ||
      runtime.runtimeLocatorDisclosed !== false ||
      runtime.tokenMaterialDisclosed !== false ||
      runtime.readinessClaimed !== false ||
      receipt.localAuditReceipt?.appended !== true) {
    reject('r4_live_read_native_receipt_invalid');
  }
  return { receipt, invocation, runtime };
}

function countersFromEvidence(evidence) {
  return {
    provider_calls: evidence.runtime.providerApiCalled === true ? 1 : 0,
    native_invocations: 1,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: evidence.runtime.derivedRuntimeMutationReceiptDelta,
    other_durable_mutations: evidence.receipt.localAuditReceipt.appended === true ? 1 : 0,
    unrestricted_native_searches: 0
  };
}

function receiptBackedNativePreflightFailure(result) {
  const receipt = result?.receipt;
  const invocation = receipt?.nativeInvocationReceipt;
  const runtime = invocation?.nativeRuntimeReceipt;
  if (result?.status !== 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED' ||
      result?.accepted !== false ||
      result?.decision !== 'rejected' ||
      result?.reasonCode !== 'native_read_delegation_client_error' ||
      result?.access?.lowDisclosure !== true ||
      result?.access?.rawOutputReturned !== false ||
      result?.access?.rawMemoryReturned !== false ||
      result?.access?.tokenMaterialReturned !== false ||
      result?.access?.memoryReadPerformed !== false ||
      result?.access?.localMemoryFallbackEligible !== false ||
      result?.access?.localMemoryFallbackUsed !== false ||
      result?.access?.delegationStatusClass !== 'client_error' ||
      result?.access?.delegationReasonCode !== 'native_read_delegation_client_error' ||
      !isPlainObject(receipt) ||
      receipt.statusClass !== 'client_error' ||
      receipt.memoryWritten !== false ||
      receipt.rawResponseBodyPersisted !== false ||
      receipt.rawResponseBodyPrinted !== false ||
      receipt.tokenMaterialDisclosed !== false ||
      receipt.localAuditReceipt?.appended !== true ||
      receipt.localAuditReceipt?.lowDisclosure !== true ||
      !isPlainObject(invocation) ||
      invocation.statusClass !== 'client_error' ||
      invocation.failureCategory !== 'scope_binding_rejected' ||
      invocation.jsonRpcErrorPresent !== true ||
      ![
        'diary_scope_mapping_missing',
        'diary_scope_mapping_binding_mismatch'
      ].includes(invocation.jsonRpcErrorReasonCode) ||
      invocation.endpointDisclosed !== false ||
      invocation.tokenMaterialDisclosed !== false ||
      invocation.rawRequestBodyDisclosed !== false ||
      invocation.rawResponseBodyDisclosed !== false ||
      !isPlainObject(runtime) ||
      runtime.present !== false ||
      runtime.nativeRuntimeCalled !== false ||
      runtime.providerApiCalled !== false ||
      runtime.memoryReadPerformed !== false ||
      runtime.memoryWritePerformed !== false ||
      runtime.durableWritePerformed !== false ||
      runtime.primaryMemoryStoreWritePerformed !== false ||
      runtime.derivedIndexWritePerformed !== false ||
      runtime.sourcePartitionMutationPerformed !== false ||
      runtime.legacyPartitionAccessed !== false ||
      runtime.ambiguousPartitionAccessed !== false ||
      runtime.unregisteredPartitionAccessed !== false ||
      runtime.unscopedNativeSearchUsed !== false ||
      runtime.rawRuntimeOutputDisclosed !== false ||
      runtime.rawMemoryContentDisclosed !== false ||
      runtime.runtimeLocatorDisclosed !== false ||
      runtime.tokenMaterialDisclosed !== false) {
    return null;
  }
  return Object.freeze({
    status: 'unavailable',
    counters: Object.freeze({
      ...ZERO_MEMORY_COUNTERS,
      other_durable_mutations: 1
    })
  });
}

function unavailableReadProjection(toolName) {
  if (toolName === 'search_memory') {
    return { status: 'unavailable', result_count: 0, results: [] };
  }
  const kind = {
    memory_overview: 'overview',
    audit_memory: 'audit',
    prepare_memory_context: 'context'
  }[toolName];
  if (!kind) reject('r4_live_read_tool_invalid');
  return { status: 'unavailable', kind, item_count: 0 };
}

function assertNoMappingDisclosure(value, mappingState) {
  const forbidden = [
    mappingState.mappingReference,
    mappingState.mappingDigest,
    ...mappingState.mapping.entries.flatMap(entry => [
    entry.diaryName,
    entry.partitionReference
    ])
  ].filter(Boolean).map(item => item.normalize('NFKC').toLocaleLowerCase('en-US'));
  const strings = [];
  (function collect(candidate) {
    if (typeof candidate === 'string') strings.push(candidate);
    else if (Array.isArray(candidate)) candidate.forEach(collect);
    else if (isPlainObject(candidate)) Object.values(candidate).forEach(collect);
  })(value);
  for (const string of strings) {
    const normalized = string.normalize('NFKC').toLocaleLowerCase('en-US');
    if (forbidden.some(item => normalized.includes(item))) reject('r4_live_read_mapping_disclosure_forbidden');
  }
}

function searchProjection(result, projectContextRef) {
  const source = Array.isArray(result?.results) ? result.results : [];
  const results = source.slice(0, 5).flatMap((item, index) => {
    const projection = item?.memoryContextProjection;
    if (!isPlainObject(projection) || projection.lowDisclosure !== true ||
        typeof projection.statement !== 'string' || !projection.statement.trim()) return [];
    const numeric = item.score;
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return [];
    const relevance = Math.max(0, Math.min(1, numeric));
    if (relevance < MIN_PUBLIC_RELEVANCE) return [];
    return [{
      result_ref: `mref_${digestObject({ projectContextRef, index, projection }).slice(7, 31)}`,
      summary: projection.statement,
      relevance
    }];
  });
  return {
    status: results.length > 0 ? 'found' : 'empty',
    result_count: results.length,
    results
  };
}

function structuredProjection(toolName, nativeResult, projectContextRef) {
  if (toolName === 'search_memory') return searchProjection(nativeResult, projectContextRef);
  if (toolName === 'prepare_memory_context') {
    const search = searchProjection(nativeResult, projectContextRef);
    return { status: search.status, kind: 'context', item_count: search.result_count };
  }
  if (toolName === 'memory_overview') {
    return { status: 'available', kind: 'overview', item_count: 1 };
  }
  return { status: 'available', kind: 'audit', item_count: 1 };
}

function createGovernedLiveReadInvoker({
  mappingState,
  resolveDiaryRead,
  callGovernedTool,
  observeNativeEvidence = () => {}
}) {
  if (!mappingState?.accepted || typeof resolveDiaryRead !== 'function' ||
      typeof callGovernedTool !== 'function' || typeof observeNativeEvidence !== 'function') {
    reject('r4_live_read_invoker_invalid');
  }
  return async function invoke({
    toolName,
    arguments: args,
    trustedScope,
    projectContextRef,
    activationReceiptDigest = null
  }) {
    if (trustedScope.clientId !== 'ChatGPT' ||
        trustedScope.mappingReference !== mappingState.mappingReference ||
        trustedScope.mappingDigest !== mappingState.mappingDigest) {
      reject('r4_live_read_trusted_scope_mismatch');
    }
    const visibility = effectiveVisibility(trustedScope.visibilityAllowlist);
    const resolution = resolveDiaryRead({
      mapping: mappingState.mapping,
      trustedScope: {
        clientId: NATIVE_SHARED_READ_CLIENT_ID,
        projectId: trustedScope.projectId,
        workspaceId: trustedScope.workspaceId,
        visibility
      },
      recallProfile: visibilityScope(visibility).recallProfile
    });
    if (!resolution.accepted || resolution.allowedDiaryCount < 1) {
      reject('r4_live_read_scope_authorization_rejected');
    }
    const nativeRequest = buildNativeRequest(toolName, args);
    const result = await callGovernedTool(
      nativeRequest.nativeToolName,
      nativeRequest.args,
      buildRequestContext({
        trustedScope,
        visibility,
        projectContextRef,
        nativeToolName: nativeRequest.nativeToolName
      })
    );
    if (result?.status !== 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED' || result?.accepted !== true) {
      const failure = receiptBackedNativePreflightFailure(result);
      if (failure) {
        const structuredContent = unavailableReadProjection(toolName);
        assertNoMappingDisclosure(structuredContent, mappingState);
        validatePublicStructuredContent(structuredContent);
        return {
          status: failure.status,
          structured_content: structuredContent,
          counters: { ...failure.counters },
          result_scope_postcheck_passed: true
        };
      }
      reject('r4_live_read_native_delegation_rejected');
    }
    const evidence = nativeEvidence(result, resolution.allowedDiaryCount);
    const structuredContent = structuredProjection(toolName, result, projectContextRef);
    assertNoMappingDisclosure(structuredContent, mappingState);
    validatePublicStructuredContent(structuredContent);
    const counters = countersFromEvidence(evidence);
    observeNativeEvidence(Object.freeze({
      project_context_ref_digest: digestObject(projectContextRef),
      tool_name: toolName,
      native_runtime_receipt_digest: digestObject(evidence.runtime),
      native_invocation_receipt_digest: digestObject(evidence.invocation),
      bridge_receipt_digest: digestObject(evidence.receipt),
      activation_receipt_digest: activationReceiptDigest,
      allowed_diary_count: evidence.runtime.allowedDiaryCount,
      result_count: Number.isInteger(structuredContent.result_count)
        ? structuredContent.result_count
        : Number.isInteger(structuredContent.item_count) ? structuredContent.item_count : 0,
      counters: Object.freeze({ ...counters }),
      derived_runtime_mutation: Object.freeze({
        policy: evidence.runtime.derivedRuntimeMutationPolicy,
        authorized: evidence.runtime.derivedRuntimeMutationAuthorized,
        isolated_runtime_store: evidence.runtime.isolatedRuntimeStoreUsed,
        accounting_final: evidence.runtime.derivedRuntimeMutationAccountingFinal,
        cumulative_count: evidence.runtime.derivedRuntimeMutationCumulativeCount,
        receipt_delta: evidence.runtime.derivedRuntimeMutationReceiptDelta,
        active_count: evidence.runtime.derivedRuntimeMutationActiveCount,
        completed_count: evidence.runtime.derivedRuntimeMutationCompletedCount,
        failed_count: evidence.runtime.derivedRuntimeMutationFailedCount,
        trigger_categories: Object.freeze([
          ...evidence.runtime.derivedRuntimeMutationTriggerCategories
        ]),
        policy_violation: evidence.runtime.derivedRuntimeMutationPolicyViolation,
        source_partition_mutation: evidence.runtime.sourcePartitionMutationPerformed,
        legacy_partition_accessed: evidence.runtime.legacyPartitionAccessed,
        ambiguous_partition_accessed: evidence.runtime.ambiguousPartitionAccessed,
        unregistered_partition_accessed: evidence.runtime.unregisteredPartitionAccessed,
        unrestricted_native_search: evidence.runtime.unscopedNativeSearchUsed,
        raw_details_disclosed: evidence.runtime.derivedRuntimeMutationRawDetailsDisclosed
      })
    }));
    return {
      status: 'ok',
      structured_content: structuredContent,
      counters,
      result_scope_postcheck_passed: true
    };
  };
}

function createR4GovernanceRuntime({
  expectedIssuer,
  expectedAudience,
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  registryState,
  mappingState,
  selectedProjectAlias,
  resolveDiaryRead,
  contextSigning,
  callGovernedTool,
  activationController = null,
  dogfoodObserver = null,
  counterMode = R4_LIVE_READ_MODE,
  clock = () => new Date(),
  monotonicClock = () => Math.floor(performance.now()),
  randomBytes
} = {}) {
  if ((counterMode === R4_SESSION_SCOPED_LIVE_READ_MODE) !== Boolean(activationController)) {
    reject('r4_session_activation_mode_mismatch');
  }
  if (![R4_LIVE_READ_MODE, R4_SESSION_SCOPED_LIVE_READ_MODE].includes(counterMode)) {
    reject('r4_live_read_counter_mode_invalid');
  }
  if ((dogfoodObserver !== null && !activationController) ||
      (dogfoodObserver !== null &&
       (typeof dogfoodObserver.observeToolResult !== 'function' ||
        typeof dogfoodObserver.observeToolError !== 'function' ||
        typeof dogfoodObserver.beginToolAttempt !== 'function' ||
        typeof dogfoodObserver.markEmergencyStop !== 'function' ||
        typeof dogfoodObserver.snapshot !== 'function')) ||
      typeof monotonicClock !== 'function') {
    reject('r5a_dogfood_runtime_observer_invalid');
  }
  const maxAuthorizedToolCalls = dogfoodObserver
    ? MAX_R5A_AUTHORIZED_TOOL_CALLS
    : MAX_AUTHORIZED_TOOL_CALLS;
  const observations = {
    request_attempts: 0,
    authorized_request_attempts: 0,
    inactive_request_attempts: 0,
    completed_requests: 0,
    denied_requests: 0,
    unavailable_requests: 0,
    successful_read_calls: 0,
    non_empty_read_calls: 0,
    receipt_chains: [],
    counters: { ...ZERO_MEMORY_COUNTERS }
  };
  const nativeEvidenceByContext = new Map();
  const contextAuthority = createContextAuthority({
    registryState,
    mappingState,
    selectedProjectAlias,
    signing: contextSigning,
    activationController,
    clock,
    randomBytes
  });
  const adapter = createGovernanceAdapter({
    expectedIssuer,
    expectedAudience,
    resolveRequestPublicKey,
    resolvePrincipalPublicKey,
    resolveContextPublicKey: contextAuthority.resolvePublicKey,
    issueProjectContext: input => contextAuthority.issue(input),
    resolveProjectContext: reference => contextAuthority.resolve(reference),
    contextReplayGuard: new InMemoryReplayGuard({ clock }),
    invokeGovernance: createGovernedLiveReadInvoker({
      mappingState,
      resolveDiaryRead,
      callGovernedTool,
      observeNativeEvidence(evidence) {
        nativeEvidenceByContext.set(evidence.project_context_ref_digest, evidence);
      }
    }),
    preauthorizeContextUse: activationController
      ? input => activationController.checkReadAuthorization(input)
      : null,
    authorizeContextUse: activationController
      ? input => activationController.authorizeRead(input)
      : null,
    finalizeContextUse: activationController
      ? input => activationController.completeRead(input)
      : null,
    counterMode,
    clock
  });
  return Object.freeze({
    async handle(payload) {
      const toolName = payload?.request?.tool_request?.name;
      const startedAt = dogfoodObserver ? Number(monotonicClock()) : 0;
      if (dogfoodObserver && !Number.isFinite(startedAt)) {
        reject('r5a_dogfood_monotonic_clock_invalid');
      }
      let observationAttempted = false;
      let observationSessionOrdinal = null;
      let observedNativeEvidence = null;
      try {
        if (dogfoodObserver && R5A_OBSERVED_TOOL_NAMES.has(toolName)) {
          observationSessionOrdinal = dogfoodObserver.beginToolAttempt({ toolName });
        }
        const inactiveSessionRequest = activationController &&
          activationController.snapshot().active !== true;
        if (inactiveSessionRequest) {
          if (observations.inactive_request_attempts >= MAX_INACTIVE_REQUEST_ATTEMPTS) {
            reject('r4_governance_inactive_request_budget_exhausted');
          }
          observations.inactive_request_attempts += 1;
        } else {
          if (observations.authorized_request_attempts >= maxAuthorizedToolCalls) {
            reject('r4_governance_authorized_call_budget_exhausted');
          }
          observations.authorized_request_attempts += 1;
        }
        observations.request_attempts += 1;
        const result = await adapter.handle(payload);
        observations.completed_requests += 1;
        if (result.status === 'denied') observations.denied_requests += 1;
        if (result.status === 'unavailable') observations.unavailable_requests += 1;
        if (toolName !== 'resolve_memory_context' && result.counters.native_invocations > 0) {
          if (result.status === 'ok') observations.successful_read_calls += 1;
          const resultCount = Number(result.structured_content?.result_count ??
            result.structured_content?.item_count ?? 0);
          if (Number.isInteger(resultCount) && resultCount > 0) {
            observations.non_empty_read_calls += 1;
          }
          for (const [key, value] of Object.entries(result.counters)) {
            observations.counters[key] += value;
          }
          const contextRef = payload.request.tool_request.arguments.project_context_ref;
          const contextDigest = digestObject(contextRef);
          const nativeEvidence = nativeEvidenceByContext.get(contextDigest);
          if (!nativeEvidence) reject('r4_live_read_native_evidence_missing');
          observedNativeEvidence = nativeEvidence;
          nativeEvidenceByContext.delete(contextDigest);
          observations.receipt_chains.push(Object.freeze({
            tool_name: toolName,
            native_runtime: nativeEvidence.native_runtime_receipt_digest,
            native_invocation: nativeEvidence.native_invocation_receipt_digest,
            bridge: nativeEvidence.bridge_receipt_digest,
            governance: result.receipt_digests.governance,
            context: result.receipt_digests.context,
            ...(nativeEvidence.activation_receipt_digest
              ? { activation: nativeEvidence.activation_receipt_digest }
              : {}),
            allowed_diary_count: nativeEvidence.allowed_diary_count,
            result_count: nativeEvidence.result_count
          }));
        }
        if (dogfoodObserver) {
          const endedAt = Number(monotonicClock());
          const latencyMs = Math.max(0, Math.min(60_000, Math.round(endedAt - startedAt)));
          const relevanceValues = Array.isArray(result.structured_content?.results)
            ? result.structured_content.results
              .map(item => Number(item?.relevance))
              .filter(value => Number.isFinite(value) && value >= 0 && value <= 1)
            : [];
          observationAttempted = true;
          try {
            dogfoodObserver.observeToolResult({
              toolName,
              latencyMs,
              status: String(result.structured_content?.status ||
                result.structured_content?.context_status || result.status),
              resultCount: Number(result.structured_content?.result_count ??
                result.structured_content?.item_count ?? 0),
              relevance: relevanceValues.length > 0 ? Math.max(...relevanceValues) : null,
              counters: result.counters,
              derivedRuntimeMutationEvidence:
                observedNativeEvidence?.derived_runtime_mutation || null,
              activationSnapshot: activationController.snapshot(),
              sessionOrdinal: observationSessionOrdinal
            });
          } catch (error) {
            const errorCode = typeof error?.code === 'string' &&
              /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
              ? error.code
              : 'r5a_dogfood_runtime_error';
            dogfoodObserver.markEmergencyStop({ errorCode });
            activationController.kill({ reason: 'emergency_stop' });
            throw error;
          }
        }
        return result;
      } catch (error) {
        if (dogfoodObserver && !observationAttempted &&
            R5A_OBSERVED_TOOL_NAMES.has(toolName)) {
          const endedAt = Number(monotonicClock());
          const latencyMs = Number.isFinite(endedAt)
            ? Math.max(0, Math.min(60_000, Math.round(endedAt - startedAt)))
            : 0;
          const errorCode = typeof error?.code === 'string' &&
            /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
            ? error.code
            : 'r5a_dogfood_runtime_error';
          dogfoodObserver.observeToolError({
            toolName,
            latencyMs,
            errorCode,
            activationSnapshot: activationController.snapshot(),
            sessionOrdinal: observationSessionOrdinal
          });
          if (R5A_POST_CALL_SAFETY_ERROR_CODES.has(errorCode)) {
            dogfoodObserver.markEmergencyStop({ errorCode });
            activationController.kill({ reason: 'emergency_stop' });
          }
        }
        throw error;
      }
    },
    snapshot: () => Object.freeze({
      ...contextAuthority.snapshot(),
      request_attempts: observations.request_attempts,
      authorized_request_attempts: observations.authorized_request_attempts,
      inactive_request_attempts: observations.inactive_request_attempts,
      max_authorized_tool_calls: maxAuthorizedToolCalls,
      max_inactive_request_attempts: MAX_INACTIVE_REQUEST_ATTEMPTS,
      completed_requests: observations.completed_requests,
      denied_requests: observations.denied_requests,
      unavailable_requests: observations.unavailable_requests,
      successful_read_calls: observations.successful_read_calls,
      non_empty_read_calls: observations.non_empty_read_calls,
      counters: Object.freeze({ ...observations.counters }),
      receipt_chains: Object.freeze(observations.receipt_chains.map(item => Object.freeze({ ...item }))),
      request_bodies_logged: 0,
      response_bodies_logged: 0,
      raw_memory_persisted: false,
      ...(dogfoodObserver ? {
        private_dogfood_observation: dogfoodObserver.snapshot(activationController.snapshot())
      } : {}),
      ...(activationController ? { session_activation: activationController.snapshot() } : {})
    }),
    counterMode
  });
}

module.exports = {
  R4_LIVE_READ_MODE,
  R4_SESSION_SCOPED_LIVE_READ_MODE,
  NATIVE_SHARED_READ_CLIENT_ID,
  MAX_AUTHORIZED_TOOL_CALLS,
  MAX_R5A_AUTHORIZED_TOOL_CALLS,
  MAX_INACTIVE_REQUEST_ATTEMPTS,
  R5A_POST_CALL_SAFETY_ERROR_CODES,
  R5A_OBSERVED_TOOL_NAMES,
  buildNativeRequest,
  countersFromEvidence,
  createContextAuthority,
  createGovernedLiveReadInvoker,
  createR4GovernanceRuntime,
  effectiveVisibility,
  receiptBackedNativePreflightFailure,
  searchProjection,
  visibilityLabels
};
