'use strict';

const { evaluateA5ApprovalLine } = require('./A5ApprovalLineVerifier');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const REQUIRED_PUBLIC_TOOLS = Object.freeze([
  'memory_overview',
  'record_memory',
  'search_memory'
]);

function normalizeBoolean(value) {
  return value === true;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sortStrings(values = []) {
  return [...values].map(String).sort();
}

function buildJsonRpcRequest(id, method, params = {}) {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params
  };
}

function resolveMcpUrl(endpoint) {
  const normalized = normalizeString(endpoint).replace(/\/+$/, '');
  if (/\/mcp\/codex-memory$/i.test(normalized)) return normalized;
  return `${normalized}/mcp/codex-memory`;
}

function resolveHealthUrl(endpoint) {
  const normalized = normalizeString(endpoint).replace(/\/+$/, '');
  return normalized.replace(/\/mcp\/codex-memory$/i, '') + '/health';
}

function summarizeHealth(payload = {}) {
  return {
    ok: payload.ok === true,
    service: normalizeString(payload.service || payload.name),
    authRequired: payload.auth?.required === true,
    hasRuntime: Boolean(payload.runtime && typeof payload.runtime === 'object')
  };
}

function summarizeInitialize(payload = {}) {
  const result = payload.result || {};
  return {
    ok: Boolean(result.serverInfo?.name),
    serverName: normalizeString(result.serverInfo?.name),
    serverVersion: normalizeString(result.serverInfo?.version),
    protocolVersion: normalizeString(result.protocolVersion)
  };
}

function summarizeToolsList(payload = {}) {
  const tools = Array.isArray(payload.result?.tools) ? payload.result.tools : [];
  const toolNames = sortStrings(tools.map(tool => tool && tool.name).filter(Boolean));
  return {
    ok: toolNames.length === REQUIRED_PUBLIC_TOOLS.length &&
      JSON.stringify(toolNames) === JSON.stringify(REQUIRED_PUBLIC_TOOLS),
    publicToolCount: toolNames.length,
    publicTools: toolNames,
    publicToolsFrozen: JSON.stringify(toolNames) === JSON.stringify(REQUIRED_PUBLIC_TOOLS)
  };
}

function summarizeAuthorizedOverview(payload = {}) {
  const structured = payload.result?.structuredContent || {};
  return {
    ok: payload.result?.isError !== true && Boolean(payload.result),
    isError: payload.result?.isError === true,
    topLevelKeys: sortStrings(Object.keys(structured)),
    accessMode: normalizeString(structured.access?.mode),
    selectedProjection: normalizeBoolean(structured.access?.selectedProjection),
    rawContentReturned: /"content"\s*:|"rawText"\s*:|"snippet"\s*:/.test(JSON.stringify(structured))
  };
}

function summarizeNoTokenOverview(payload = {}) {
  const structured = payload.result?.structuredContent || {};
  const access = structured.access || {};
  return {
    ok: payload.result?.isError !== true &&
      access.mode === 'public_selected_overview' &&
      access.selectedProjection === true &&
      access.selectedProjectionVersion === 2,
    mode: normalizeString(access.mode),
    selectedProjection: access.selectedProjection === true,
    selectedProjectionVersion: access.selectedProjectionVersion || null,
    pathsReturned: access.pathsReturned === true,
    recentAuditReturned: access.recentAuditReturned === true,
    memoryLinksReturned: access.memoryLinksReturned === true,
    recallRecentReturned: access.recallRecentReturned === true,
    detailFieldsReturned: access.detailFieldsReturned === true
  };
}

function summarizeRejectedToolCall(payload = {}, expectedCode) {
  return {
    rejected: Boolean(payload.error),
    jsonRpcCode: payload.error?.code ?? null,
    reasonCode: normalizeString(payload.error?.data?.code),
    expectedReasonCode: expectedCode,
    rawContentReturned: /"content"\s*:|"rawText"\s*:|"snippet"\s*:|"sourceFile"\s*:/.test(JSON.stringify(payload))
  };
}

function buildSafetyCounters(overrides = {}) {
  return {
    providerCalls: 0,
    durableMemoryWrites: 0,
    durableAuditWrites: 0,
    configWatchdogStartupChanges: 0,
    publicMcpExpansion: false,
    remoteActions: 0,
    readinessClaimed: false,
    reliabilityClaimed: false,
    ...overrides
  };
}

function evaluateCurrentFacts({
  expectedBranch = '',
  expectedCommit = '',
  currentBranch = '',
  currentHead = '',
  originHead = '',
  dirtyStatusLineCount = null,
  required = false
} = {}) {
  const normalized = {
    currentBranch: normalizeString(currentBranch),
    currentHead: normalizeString(currentHead),
    originHead: normalizeString(originHead),
    dirtyStatusLineCount: Number.isInteger(dirtyStatusLineCount)
      ? dirtyStatusLineCount
      : Number.parseInt(String(dirtyStatusLineCount ?? ''), 10)
  };
  const failClosedReasons = [];

  if (!required && !normalized.currentBranch && !normalized.currentHead && !normalized.originHead) {
    return {
      required: false,
      accepted: true,
      ...normalized,
      failClosedReasons
    };
  }

  if (!normalized.currentBranch) failClosedReasons.push('missing_current_branch');
  if (!normalized.currentHead) failClosedReasons.push('missing_current_head');
  if (!normalized.originHead) failClosedReasons.push('missing_origin_head');
  if (!Number.isInteger(normalized.dirtyStatusLineCount)) {
    failClosedReasons.push('missing_dirty_status_line_count');
  }
  if (normalized.currentBranch && normalized.currentBranch !== normalizeString(expectedBranch)) {
    failClosedReasons.push('current_branch_mismatch');
  }
  if (normalized.currentHead && normalized.currentHead !== normalizeString(expectedCommit)) {
    failClosedReasons.push('current_head_mismatch');
  }
  if (normalized.originHead && normalized.currentHead && normalized.originHead !== normalized.currentHead) {
    failClosedReasons.push('local_origin_head_mismatch');
  }
  if (Number.isInteger(normalized.dirtyStatusLineCount) && normalized.dirtyStatusLineCount !== 0) {
    failClosedReasons.push('dirty_worktree');
  }

  return {
    required,
    accepted: failClosedReasons.length === 0,
    ...normalized,
    failClosedReasons
  };
}

function buildPhaseF1Plan({
  branch = '',
  commit = '',
  endpoint = 'http://127.0.0.1:7605',
  approvalLine = '',
  currentFacts = {},
  requireCurrentFacts = false
} = {}) {
  const approval = evaluateA5ApprovalLine({
    approvalLine,
    expectedUnit: 'A5-GAP-4',
    expectedBranch: branch,
    expectedCommit: commit
  });
  const expectedEndpoint = normalizeString(endpoint);
  const endpointMatches = approval.parsedApprovalScope?.endpoint === expectedEndpoint;
  const approvalAccepted = approval.approvalAccepted === true && endpointMatches;
  const failClosedReasons = [
    ...approval.failClosedReasons,
    ...endpointMatches ? [] : ['endpoint_mismatch']
  ];
  const currentFactsCheck = evaluateCurrentFacts({
    expectedBranch: branch,
    expectedCommit: commit,
    required: requireCurrentFacts,
    ...currentFacts
  });
  failClosedReasons.push(...currentFactsCheck.failClosedReasons);

  const accepted = approvalAccepted && currentFactsCheck.accepted;

  return {
    status: accepted
      ? 'PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_READY_NOT_EXECUTED'
      : 'PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_REJECTED_FAIL_CLOSED',
    decision: 'NOT_READY_BLOCKED',
    branch: normalizeString(branch),
    commit: normalizeString(commit),
    endpoint: expectedEndpoint,
    approvalAccepted: accepted,
    authorizationGranted: accepted,
    approvalSelfCheck: {
      approvalAccepted: approval.approvalAccepted === true,
      authorizationGranted: approval.authorizationGranted === true,
      parsedApprovalScope: approval.parsedApprovalScope,
      sanitizedApprovalLine: approval.sanitizedApprovalLine
    },
    currentFactsCheck,
    failClosedReasons,
    plannedRequests: [
      'health',
      'authenticated_initialize',
      'authenticated_tools_list',
      'authenticated_memory_overview',
      'no_token_memory_overview',
      'no_token_record_memory_rejection',
      'no_token_search_memory_rejection'
    ],
    forbiddenActions: [
      'successful_record_memory',
      'authenticated_search_memory',
      'raw_memory_read',
      'raw_audit_read',
      'provider_call',
      'durable_memory_write',
      'durable_audit_write',
      'config_watchdog_startup_change',
      'public_mcp_expansion',
      'remote_action',
      'readiness_claim'
    ],
    safetyCounters: buildSafetyCounters(),
    liveClientRefreshExecuted: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    rcReady: false
  };
}

async function defaultHttpJsonClient({ url, bearerToken = '', body }) {
  const headers = { 'Content-Type': 'application/json' };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return {
    status: response.status,
    payload
  };
}

async function defaultHealthClient({ endpoint }) {
  const url = resolveHealthUrl(endpoint);
  const response = await fetch(url);
  return {
    status: response.status,
    payload: await response.json()
  };
}

async function runPhaseF1LiveClientNoWriteEvidence({
  branch = '',
  commit = '',
  endpoint = 'http://127.0.0.1:7605',
  approvalLine = '',
  execute = false,
  currentFacts = {},
  bearerToken = '',
  httpJsonClient = defaultHttpJsonClient,
  healthClient = defaultHealthClient
} = {}) {
  const plan = buildPhaseF1Plan({
    branch,
    commit,
    endpoint,
    approvalLine,
    currentFacts,
    requireCurrentFacts: execute
  });
  if (!execute) {
    return {
      ...plan,
      executionMode: 'plan_only',
      liveClientRefreshExecuted: false
    };
  }
  if (!plan.approvalAccepted) {
    return {
      ...plan,
      executionMode: 'rejected_before_execution',
      liveClientRefreshExecuted: false
    };
  }
  if (!bearerToken) {
    return {
      ...plan,
      status: 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EXECUTION_BLOCKED_FAIL_CLOSED',
      executionMode: 'blocked_before_execution',
      liveClientRefreshExecuted: false,
      failClosedReasons: [...plan.failClosedReasons, 'missing_current_session_bearer_token']
    };
  }

  const health = await healthClient({ endpoint });
  const mcpUrl = resolveMcpUrl(endpoint);
  const initialize = await httpJsonClient({
    url: mcpUrl,
    bearerToken,
    body: buildJsonRpcRequest(1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'codex-memory-phase-f1', version: '1.0' }
    })
  });
  const toolsList = await httpJsonClient({
    url: mcpUrl,
    bearerToken,
    body: buildJsonRpcRequest(2, 'tools/list', {})
  });
  const authorizedOverview = await httpJsonClient({
    url: mcpUrl,
    bearerToken,
    body: buildJsonRpcRequest(3, 'tools/call', {
      name: 'memory_overview',
      arguments: {}
    })
  });
  const noTokenOverview = await httpJsonClient({
    url: mcpUrl,
    bearerToken: '',
    body: buildJsonRpcRequest(4, 'tools/call', {
      name: 'memory_overview',
      arguments: {}
    })
  });
  const noTokenRecord = await httpJsonClient({
    url: mcpUrl,
    bearerToken: '',
    body: buildJsonRpcRequest(5, 'tools/call', {
      name: 'record_memory',
      arguments: {
        target: 'process',
        title: 'phase-f1-no-token-rejection-check',
        content: 'must be rejected before durable write',
        evidence: 'phase f1 no-write rejection check',
        validated: false,
        reusable: false,
        sensitivity: 'test'
      }
    })
  });
  const noTokenSearch = await httpJsonClient({
    url: mcpUrl,
    bearerToken: '',
    body: buildJsonRpcRequest(6, 'tools/call', {
      name: 'search_memory',
      arguments: {
        query: 'phase-f1-no-token-rejection-check',
        target: 'process',
        limit: 1,
        include_content: true
      }
    })
  });

  const evidence = {
    health: summarizeHealth(health.payload),
    initialize: summarizeInitialize(initialize.payload),
    toolsList: summarizeToolsList(toolsList.payload),
    authorizedOverview: summarizeAuthorizedOverview(authorizedOverview.payload),
    noTokenOverview: summarizeNoTokenOverview(noTokenOverview.payload),
    noTokenRecordMemory: summarizeRejectedToolCall(noTokenRecord.payload, 'PUBLIC_REQUEST_BLOCKED'),
    noTokenSearchMemory: summarizeRejectedToolCall(noTokenSearch.payload, 'PUBLIC_REQUEST_BLOCKED')
  };

  const evidenceAccepted = evidence.health.ok &&
    evidence.initialize.ok &&
    evidence.toolsList.ok &&
    evidence.authorizedOverview.ok &&
    evidence.authorizedOverview.rawContentReturned === false &&
    evidence.noTokenOverview.ok &&
    evidence.noTokenOverview.pathsReturned === false &&
    evidence.noTokenOverview.recentAuditReturned === false &&
    evidence.noTokenOverview.memoryLinksReturned === false &&
    evidence.noTokenOverview.recallRecentReturned === false &&
    evidence.noTokenOverview.detailFieldsReturned === false &&
    evidence.noTokenRecordMemory.rejected &&
    evidence.noTokenRecordMemory.reasonCode === 'PUBLIC_REQUEST_BLOCKED' &&
    evidence.noTokenRecordMemory.rawContentReturned === false &&
    evidence.noTokenSearchMemory.rejected &&
    evidence.noTokenSearchMemory.reasonCode === 'PUBLIC_REQUEST_BLOCKED' &&
    evidence.noTokenSearchMemory.rawContentReturned === false;

  return {
    ...plan,
    status: evidenceAccepted
      ? 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY'
      : 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_REJECTED_FAIL_CLOSED',
    executionMode: 'executed_bounded_no_write',
    liveClientRefreshExecuted: true,
    tokenMaterialPrinted: false,
    tokenMaterialPersisted: false,
    sanitizedEndpoint: redactSensitiveFragments(endpoint),
    evidence,
    evidenceAccepted,
    safetyCounters: buildSafetyCounters(),
    runtimeReady: false,
    finalRcMatrixReady: false,
    rcReady: false
  };
}

module.exports = {
  REQUIRED_PUBLIC_TOOLS,
  buildJsonRpcRequest,
  evaluateCurrentFacts,
  buildPhaseF1Plan,
  resolveHealthUrl,
  resolveMcpUrl,
  runPhaseF1LiveClientNoWriteEvidence
};
