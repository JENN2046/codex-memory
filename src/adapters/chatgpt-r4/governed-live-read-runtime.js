'use strict';

const {
  COUNTER_MODES,
  InMemoryReplayGuard,
  createOpaqueId,
  createProjectContextClaim,
  digestObject,
  validatePublicStructuredContent,
  reject
} = require('../../../packages/chatgpt-r4-contracts');
const { createGovernanceAdapter } = require('./governance-adapter');
const { resolveRegisteredProject, visibilityScope } = require('./project-registry');

const R4_LIVE_READ_MODE = COUNTER_MODES.governedLiveReadV1;
const NATIVE_SHARED_READ_CLIENT_ID = 'Codex';
const MAX_CONTEXTS = 1024;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createContextAuthority({
  registryState,
  mappingState,
  selectedProjectAlias,
  signing,
  clock = () => new Date(),
  randomBytes
}) {
  if (!registryState?.accepted || !mappingState?.accepted ||
      typeof selectedProjectAlias !== 'string' ||
      !signing?.privateKey || typeof signing.keyId !== 'string') {
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
      const project = resolveRegisteredProject(
        registryState,
        safeProjectAlias,
        requestedVisibility
      );
      if (!project || project.projectId !== selectedProject.projectId) return { status: 'denied' };
      prune(now.getTime());
      if (contexts.size >= MAX_CONTEXTS) return { status: 'unavailable' };
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
        nonce: createOpaqueId('cn_', randomBytes, 18),
        signing
      });
      contexts.set(projectContextRef, claim);
      return { claim, safe_project_alias: project.safeProjectAlias };
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

function nativeEvidence(result, expectedAllowedDiaryCount) {
  const receipt = result?.receipt;
  const invocation = receipt?.nativeInvocationReceipt;
  const runtime = invocation?.nativeRuntimeReceipt;
  if (!isPlainObject(receipt) || !isPlainObject(invocation) || !isPlainObject(runtime) ||
      result?.access?.localMemoryFallbackUsed === true ||
      invocation.invocationBindingMatched !== true ||
      invocation.governanceMetadataSent !== true ||
      runtime.present !== true ||
      runtime.nativeRuntimeCalled !== true ||
      runtime.memoryReadPerformed !== true ||
      runtime.memoryWritePerformed === true ||
      runtime.primaryMemoryStoreWritePerformed === true ||
      runtime.authorizationResolvedBeforeProvider !== true ||
      runtime.diaryAllowlistEnforcedBeforeIndexLoad !== true ||
      runtime.diaryAllowlistEnforcedBeforeVectorSearch !== true ||
      runtime.resultScopePostcheckPassed !== true ||
      runtime.unscopedNativeSearchUsed !== false ||
      runtime.mappingReferenceBound !== true ||
      runtime.mappingDigestBound !== true ||
      runtime.allowedDiaryCount !== expectedAllowedDiaryCount ||
      runtime.rawDiaryNamesReturned !== false ||
      runtime.rawMemoryContentDisclosed === true ||
      invocation.rawRequestBodyDisclosed === true ||
      invocation.rawResponseBodyDisclosed === true ||
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
    derived_index_writes: evidence.runtime.derivedIndexWritePerformed === true ? 1 : 0,
    other_durable_mutations: evidence.receipt.localAuditReceipt.appended === true ? 1 : 0,
    unrestricted_native_searches: 0
  };
}

function assertNoMappingDisclosure(value, mappingState) {
  const forbidden = mappingState.mapping.entries.flatMap(entry => [
    entry.diaryName,
    entry.partitionReference
  ]).filter(Boolean).map(item => item.normalize('NFKC').toLocaleLowerCase('en-US'));
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
    const numeric = Number(item.score);
    const relevance = Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0.5;
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

function createGovernedLiveReadInvoker({ mappingState, resolveDiaryRead, callGovernedTool }) {
  if (!mappingState?.accepted || typeof resolveDiaryRead !== 'function' ||
      typeof callGovernedTool !== 'function') {
    reject('r4_live_read_invoker_invalid');
  }
  return async function invoke({ toolName, arguments: args, trustedScope, projectContextRef }) {
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
      reject('r4_live_read_native_delegation_rejected');
    }
    const evidence = nativeEvidence(result, resolution.allowedDiaryCount);
    const structuredContent = structuredProjection(toolName, result, projectContextRef);
    assertNoMappingDisclosure(structuredContent, mappingState);
    validatePublicStructuredContent(structuredContent);
    return {
      status: 'ok',
      structured_content: structuredContent,
      counters: countersFromEvidence(evidence),
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
  clock = () => new Date(),
  randomBytes
} = {}) {
  const contextAuthority = createContextAuthority({
    registryState,
    mappingState,
    selectedProjectAlias,
    signing: contextSigning,
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
      callGovernedTool
    }),
    counterMode: R4_LIVE_READ_MODE,
    clock
  });
  return Object.freeze({
    handle: payload => adapter.handle(payload),
    snapshot: () => contextAuthority.snapshot(),
    counterMode: R4_LIVE_READ_MODE
  });
}

module.exports = {
  R4_LIVE_READ_MODE,
  NATIVE_SHARED_READ_CLIENT_ID,
  buildNativeRequest,
  countersFromEvidence,
  createContextAuthority,
  createGovernedLiveReadInvoker,
  createR4GovernanceRuntime,
  effectiveVisibility,
  searchProjection,
  visibilityLabels
};
