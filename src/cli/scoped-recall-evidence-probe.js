#!/usr/bin/env node
const crypto = require('node:crypto');
const { createConfig } = require('../config/createConfig');
const { createCodexMemoryApplication } = require('../app');
const { AuditLogStore } = require('../storage/AuditLogStore');

const RECALL_AUDIT_TAIL = 20;
const DEFAULT_SCOPE_CLIENT_ID = 'codex-desktop';
const DEFAULT_SCOPE_VISIBILITY = 'private';
const REJECTED_SIDE_EFFECT_FLAGS = new Set([
  '--include-content',
  '--record-memory',
  '--search-all',
  '--provider',
  '--allow-provider',
  '--readiness-claim',
  '--push',
  '--config-write',
  '--watchdog',
  '--startup',
  '--workspace-id'
]);

function parsePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function rejectFlag(flag, reason) {
  return {
    status: 'error',
    mode: 'scoped-recall-evidence-probe',
    destructive: false,
    rejectedFlag: flag,
    reason,
    readinessClaimAllowed: false,
    mutated: false,
    providerCallsPerformed: false,
    publicMcpExpanded: false
  };
}

function parseArgs(argv = []) {
  const options = {
    json: false,
    help: false,
    execute: false,
    allowLocalStateWrites: false,
    query: 'scoped recall evidence probe',
    target: 'both',
    limit: 1,
    clientId: DEFAULT_SCOPE_CLIENT_ID,
    projectId: '',
    visibility: DEFAULT_SCOPE_VISIBILITY,
    strict: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (arg === '--execute') { options.execute = true; continue; }
    if (arg === '--allow-local-state-writes') { options.allowLocalStateWrites = true; continue; }
    if (arg === '--query') {
      options.query = String(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--target') {
      options.target = String(argv[index + 1] || 'both').trim() || 'both';
      index += 1;
      continue;
    }
    if (arg === '--limit') {
      options.limit = parsePositiveInteger(argv[index + 1], 1, 5);
      index += 1;
      continue;
    }
    if (arg === '--client-id') {
      options.clientId = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--project-id') {
      options.projectId = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--visibility') {
      options.visibility = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (REJECTED_SIDE_EFFECT_FLAGS.has(arg)) {
      return { error: rejectFlag(arg, 'red_or_side_effect_flag_rejected_by_scoped_recall_evidence_probe') };
    }
    if (arg.startsWith('--')) {
      return { error: rejectFlag(arg, 'unknown_flag_rejected_by_scoped_recall_evidence_probe') };
    }
  }

  if (!['process', 'product', 'both'].includes(options.target)) {
    return { error: rejectFlag('--target', 'invalid_target_rejected_by_scoped_recall_evidence_probe') };
  }

  if (!options.clientId && !options.projectId && !options.visibility) {
    return { error: rejectFlag('--client-id', 'at_least_one_non_workspace_scope_dimension_required') };
  }

  return { options };
}

function normalizeScope(options = {}) {
  return {
    ...(options.projectId ? { project_id: options.projectId } : {}),
    ...(options.clientId ? { client_id: options.clientId } : {}),
    ...(options.visibility ? { visibility: options.visibility } : {}),
    strict: options.strict === true
  };
}

function buildScopeDimensions(scope = {}) {
  return [
    scope.project_id ? 'project_id' : null,
    scope.client_id ? 'client_id' : null,
    scope.visibility ? 'visibility' : null
  ].filter(Boolean);
}

function buildScopedRecallSurface(recallEntries = [], auditTailLimit = RECALL_AUDIT_TAIL) {
  const summary = {
    status: 'warn',
    evidenceState: 'no_recent_recall_audit',
    auditedEntryCount: recallEntries.length,
    auditTailLimit,
    latestScopedRecallAuditAt: null,
    recentScopedRecallCount: 0,
    recentStrictScopedRecallCount: 0,
    recentWorkspaceScopedRecallCount: 0,
    scopeModeBreakdown: {},
    scopeDimensionBreakdown: {},
    rawWorkspaceIdExposed: false,
    nextEvidenceAction: 'collect_recent_scoped_recall_audit_evidence_before_client_scope_claim',
    readinessClaimAllowed: false,
    noProvider: true,
    mutated: false
  };

  for (const entry of recallEntries) {
    if (!entry || typeof entry !== 'object') continue;
    summary.rawWorkspaceIdExposed = summary.rawWorkspaceIdExposed
      || Object.prototype.hasOwnProperty.call(entry, 'workspaceId')
      || Object.prototype.hasOwnProperty.call(entry, 'workspace_id')
      || Object.prototype.hasOwnProperty.call(entry, 'scopeWorkspaceId');

    if (!entry.scopeApplied) continue;
    summary.recentScopedRecallCount += 1;
    if (entry.scopeStrict) summary.recentStrictScopedRecallCount += 1;
    if (entry.scopeWorkspacePresent) summary.recentWorkspaceScopedRecallCount += 1;
    summary.latestScopedRecallAuditAt = pickLaterTimestamp(summary.latestScopedRecallAuditAt, entry.timestamp || null);
    incrementBreakdown(summary.scopeModeBreakdown, typeof entry.scopeMode === 'string' ? entry.scopeMode : 'unknown');
    for (const dimension of Array.isArray(entry.scopeDimensions) ? entry.scopeDimensions : []) {
      if (dimension !== 'workspace_id') incrementBreakdown(summary.scopeDimensionBreakdown, dimension);
    }
  }

  if (summary.recentStrictScopedRecallCount > 0) {
    summary.status = 'ok';
    summary.evidenceState = 'recent_strict_scoped_recall';
    summary.nextEvidenceAction = 'none';
  } else if (summary.recentScopedRecallCount > 0) {
    summary.evidenceState = 'scoped_recall_without_strict_scope';
    summary.nextEvidenceAction = 'collect_recent_strict_scoped_recall_audit_evidence_before_client_scope_claim';
  } else if (recallEntries.length > 0) {
    summary.evidenceState = 'recent_recall_without_scope';
  }

  return summary;
}

function incrementBreakdown(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function pickLaterTimestamp(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  const currentTime = new Date(current).getTime();
  const candidateTime = new Date(candidate).getTime();
  if (Number.isNaN(currentTime)) return candidate;
  if (Number.isNaN(candidateTime)) return current;
  return candidateTime > currentTime ? candidate : current;
}

function buildBoundedPlan(options, config = createConfig()) {
  const externalEmbeddingConfigured = Array.isArray(config.embeddingEndpoints) && config.embeddingEndpoints.length > 0;
  const externalRerankConfigured = !!(config.rerankUrl && config.rerankModel);
  const scope = normalizeScope(options);

  return {
    target: options.target,
    queryProvided: !!String(options.query || '').trim(),
    queryLength: String(options.query || '').length,
    querySha256: hashValue(options.query),
    limit: options.limit,
    includeContent: false,
    scopeDimensions: buildScopeDimensions(scope),
    scopeStrict: scope.strict === true,
    scopeClientIdProvided: !!scope.client_id,
    scopeClientIdSha256: scope.client_id ? hashValue(scope.client_id) : null,
    scopeProjectIdProvided: !!scope.project_id,
    scopeProjectIdSha256: scope.project_id ? hashValue(scope.project_id) : null,
    scopeVisibilityProvided: !!scope.visibility,
    workspaceScopeAllowed: false,
    executeRequiresAllowLocalStateWrites: true,
    durableRecallAuditWriteOnExecute: true,
    realMemoryReadQueryCountOnExecute: 1,
    providerCallsAllowed: false,
    externalEmbeddingConfigured,
    externalRerankConfigured,
    publicMcpExpansionAllowed: false,
    readinessClaimAllowed: false
  };
}

async function collectDryRun(options) {
  const config = createConfig();
  const auditLogStore = new AuditLogStore(config);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'scoped-recall-evidence-probe',
    destructive: false,
    status: 'dry_run',
    decision: 'DRY_RUN_ONLY',
    execute: false,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    memoryWrites: 0,
    providerCallsPerformed: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false,
    scopedRecallBefore: buildScopedRecallSurface(
      await auditLogStore.readRecentRecallAudit(RECALL_AUDIT_TAIL),
      RECALL_AUDIT_TAIL
    ),
    boundedPlan: buildBoundedPlan(options, config),
    nextAction: 'rerun_with_execute_and_allow_local_state_writes_only_under_exact_amber_receipt'
  };
}

async function collectScopedRecallSurfaceForApp(app) {
  return buildScopedRecallSurface(
    await app.stores.auditLogStore.readRecentRecallAudit(RECALL_AUDIT_TAIL),
    RECALL_AUDIT_TAIL
  );
}

async function executeProbe(options) {
  const probeConfig = createConfig({
    enableLifecycleReadPolicy: true,
    enableCandidateCache: false,
    enableEmbeddingCache: false
  });
  const boundedPlan = buildBoundedPlan(options, probeConfig);

  if (!options.allowLocalStateWrites) {
    return {
      status: 'error',
      mode: 'scoped-recall-evidence-probe',
      destructive: false,
      reason: 'execute_requires_allow_local_state_writes',
      execute: true,
      mutated: false,
      boundedPlan,
      readinessClaimAllowed: false
    };
  }

  if (boundedPlan.externalEmbeddingConfigured || boundedPlan.externalRerankConfigured) {
    return {
      status: 'error',
      mode: 'scoped-recall-evidence-probe',
      destructive: false,
      reason: 'external_provider_configuration_detected_fail_closed',
      execute: true,
      mutated: false,
      boundedPlan,
      readinessClaimAllowed: false
    };
  }

  const app = createCodexMemoryApplication({
    enableLifecycleReadPolicy: true,
    enableCandidateCache: false,
    enableEmbeddingCache: false
  });
  await app.initialize();
  try {
    const before = await collectScopedRecallSurfaceForApp(app);
    const result = await app.callTool('search_memory', {
      query: options.query,
      target: options.target,
      limit: options.limit,
      include_content: false,
      scope: normalizeScope(options)
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'scoped-recall-evidence-probe'
      }
    });
    const after = await collectScopedRecallSurfaceForApp(app);

    return {
      generatedAt: new Date().toISOString(),
      mode: 'scoped-recall-evidence-probe',
      destructive: false,
      status: 'executed',
      decision: 'LOCAL_SCOPED_RECALL_AUDIT_EVIDENCE_COLLECTED_NOT_READY',
      execute: true,
      mutated: true,
      readsRealMemory: true,
      writesDurableState: true,
      durableRecallAuditWrite: true,
      memoryWrites: 0,
      realMemoryReadQueryCount: 1,
      providerCallsPerformed: false,
      publicMcpExpanded: false,
      readinessClaimAllowed: false,
      searchSummary: {
        resultCount: Array.isArray(result?.results) ? result.results.length : 0,
        contentReturned: false,
        rawQueryReturned: false,
        rawMemoryContentReturned: false,
        rawScopeValuesReturned: false
      },
      scopedRecallBefore: before,
      scopedRecallAfter: after,
      boundedPlan,
      nextAction: 'review_receipt_and_dashboard_before_any_client_scope_or_readiness_claim'
    };
  } finally {
    await app.close();
  }
}

function renderText(payload) {
  if (payload.status === 'error') {
    return [
      '[scoped-recall-evidence-probe]',
      `status: ${payload.status}`,
      `reason: ${payload.reason}`,
      `readiness_claim_allowed: ${payload.readinessClaimAllowed}`
    ].join('\n') + '\n';
  }

  return [
    '[scoped-recall-evidence-probe]',
    `status: ${payload.status}`,
    `decision: ${payload.decision}`,
    `execute: ${payload.execute}`,
    `mutated: ${payload.mutated}`,
    `scope_evidence_state: ${payload.scopedRecallAfter?.evidenceState || payload.scopedRecallBefore?.evidenceState}`,
    `next_action: ${payload.nextAction}`,
    `readiness_claim_allowed: ${payload.readinessClaimAllowed}`
  ].join('\n') + '\n';
}

function renderHelp() {
  return [
    'Usage: node src/cli/scoped-recall-evidence-probe.js [--json] [--execute --allow-local-state-writes] [--query <text>] [--target process|product|both] [--limit <1-5>] [--client-id <id>] [--project-id <id>] [--visibility <value>]',
    '',
    'Default mode is dry-run only. Execute mode performs one bounded local search_memory call with include_content=false and a non-workspace strict scope, writing sanitized scoped recall audit evidence.'
  ].join('\n') + '\n';
}

async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stdout.write(JSON.stringify(parsed.error) + '\n');
    process.exitCode = 2;
    return parsed.error;
  }

  const { options } = parsed;
  if (options.help) {
    process.stdout.write(renderHelp());
    return null;
  }

  const payload = options.execute
    ? await executeProbe(options)
    : await collectDryRun(options);

  if (options.json) {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } else {
    process.stdout.write(renderText(payload));
  }
  if (payload.status === 'error') process.exitCode = 2;
  return payload;
}

if (require.main === module) {
  main().catch(error => {
    const payload = {
      status: 'error',
      mode: 'scoped-recall-evidence-probe',
      destructive: false,
      reason: 'unexpected_probe_failure',
      message: error?.message || String(error),
      readinessClaimAllowed: false,
      mutated: false,
      providerCallsPerformed: false,
      publicMcpExpanded: false
    };
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
  });
}

module.exports = {
  buildBoundedPlan,
  buildScopedRecallSurface,
  collectDryRun,
  executeProbe,
  parseArgs,
  renderText
};
