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
const NATIVE_SHARED_READ_CLIENT_ID = 'Codex';
const MAX_CONTEXTS = 1024;
const MAX_AUTHORIZED_TOOL_CALLS = 20;

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
    const counters = countersFromEvidence(evidence);
    observeNativeEvidence(Object.freeze({
      project_context_ref_digest: digestObject(projectContextRef),
      tool_name: toolName,
      native_runtime_receipt_digest: digestObject(evidence.runtime),
      native_invocation_receipt_digest: digestObject(evidence.invocation),
      bridge_receipt_digest: digestObject(evidence.receipt),
      allowed_diary_count: evidence.runtime.allowedDiaryCount,
      result_count: Number.isInteger(structuredContent.result_count)
        ? structuredContent.result_count
        : Number.isInteger(structuredContent.item_count) ? structuredContent.item_count : 0,
      counters: Object.freeze({ ...counters })
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
  clock = () => new Date(),
  randomBytes
} = {}) {
  const observations = {
    request_attempts: 0,
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
    counterMode: R4_LIVE_READ_MODE,
    clock
  });
  return Object.freeze({
    async handle(payload) {
      if (observations.request_attempts >= MAX_AUTHORIZED_TOOL_CALLS) {
        reject('r4_governance_authorized_call_budget_exhausted');
      }
      observations.request_attempts += 1;
      const result = await adapter.handle(payload);
      observations.completed_requests += 1;
      if (result.status === 'denied') observations.denied_requests += 1;
      if (result.status === 'unavailable') observations.unavailable_requests += 1;
      const toolName = payload?.request?.tool_request?.name;
      if (toolName !== 'resolve_memory_context' && result.status === 'ok') {
        observations.successful_read_calls += 1;
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
        nativeEvidenceByContext.delete(contextDigest);
        observations.receipt_chains.push(Object.freeze({
          tool_name: toolName,
          native_runtime: nativeEvidence.native_runtime_receipt_digest,
          native_invocation: nativeEvidence.native_invocation_receipt_digest,
          bridge: nativeEvidence.bridge_receipt_digest,
          governance: result.receipt_digests.governance,
          context: result.receipt_digests.context,
          allowed_diary_count: nativeEvidence.allowed_diary_count,
          result_count: nativeEvidence.result_count
        }));
      }
      return result;
    },
    snapshot: () => Object.freeze({
      ...contextAuthority.snapshot(),
      request_attempts: observations.request_attempts,
      max_authorized_tool_calls: MAX_AUTHORIZED_TOOL_CALLS,
      completed_requests: observations.completed_requests,
      denied_requests: observations.denied_requests,
      unavailable_requests: observations.unavailable_requests,
      successful_read_calls: observations.successful_read_calls,
      non_empty_read_calls: observations.non_empty_read_calls,
      counters: Object.freeze({ ...observations.counters }),
      receipt_chains: Object.freeze(observations.receipt_chains.map(item => Object.freeze({ ...item }))),
      request_bodies_logged: 0,
      response_bodies_logged: 0,
      raw_memory_persisted: false
    }),
    counterMode: R4_LIVE_READ_MODE
  });
}

module.exports = {
  R4_LIVE_READ_MODE,
  NATIVE_SHARED_READ_CLIENT_ID,
  MAX_AUTHORIZED_TOOL_CALLS,
  buildNativeRequest,
  countersFromEvidence,
  createContextAuthority,
  createGovernedLiveReadInvoker,
  createR4GovernanceRuntime,
  effectiveVisibility,
  searchProjection,
  visibilityLabels
};
