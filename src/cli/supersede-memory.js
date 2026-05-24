#!/usr/bin/env node
const { createCodexMemoryApplication } = require('../app');

const VALUE_FLAGS = new Set([
  '--old-memory-id',
  '--new-memory-id',
  '--reason',
  '--evidence',
  '--supersedes-link',
  '--superseded-by-link',
  '--actor-client-id',
  '--request-source',
  '--tool',
  '--mode',
  '--workspace-id'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    apply: false,
    confirm: false,
    oldMemoryId: '',
    newMemoryId: '',
    reason: '',
    evidence: '',
    supersedesLink: '',
    supersededByLink: '',
    actorClientId: '',
    requestSource: '',
    tool: '',
    mode: '',
    workspaceId: '',
    error: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--apply') {
      options.apply = true;
      continue;
    }
    if (token === '--confirm') {
      options.confirm = true;
      continue;
    }
    if (VALUE_FLAGS.has(token)) {
      const value = argv[index + 1] || '';
      index += 1;
      if (token === '--old-memory-id') options.oldMemoryId = value;
      if (token === '--new-memory-id') options.newMemoryId = value;
      if (token === '--reason') options.reason = value;
      if (token === '--evidence') options.evidence = value;
      if (token === '--supersedes-link') options.supersedesLink = value;
      if (token === '--superseded-by-link') options.supersededByLink = value;
      if (token === '--actor-client-id') options.actorClientId = value;
      if (token === '--request-source') options.requestSource = value;
      if (token === '--tool') options.tool = value;
      if (token === '--mode') options.mode = value;
      if (token === '--workspace-id') options.workspaceId = value;
      continue;
    }

    options.error = `Unknown option: ${token}`;
    break;
  }

  return options;
}

function buildCliRejection(reason, options = {}) {
  const dryRun = !(options.apply && options.confirm);
  return {
    status: 'error',
    decision: 'rejected',
    dryRun,
    mutated: false,
    oldMemoryId: options.oldMemoryId || null,
    newMemoryId: options.newMemoryId || null,
    oldFromStatus: null,
    oldToStatus: 'superseded',
    newFromStatus: null,
    newToStatus: 'active',
    pairCorrelationId: null,
    reason,
    auditPreview: null,
    auditEvent: null,
    lifecyclePolicyApplied: true,
    scopePolicyApplied: true,
    redactionApplied: true,
    rawWorkspaceIdExposed: false
  };
}

function validateCliOptions(options) {
  if (options.error) return options.error;
  if (options.tool && options.tool !== 'supersede_memory') {
    return `Unknown tool: ${options.tool}`;
  }
  if (options.mode && !['dry-run', 'apply'].includes(options.mode)) {
    return `Unknown mode: ${options.mode}`;
  }
  if (options.workspaceId) {
    return 'raw workspace_id is not accepted by supersede-memory CLI output.';
  }
  if (options.apply && !options.confirm) {
    return '--apply requires --confirm.';
  }
  if (options.confirm && !options.apply) {
    return '--confirm requires --apply.';
  }
  if (options.apply && !options.json) {
    return '--apply requires --json.';
  }
  if (!options.oldMemoryId) return 'missing old-memory-id.';
  if (!options.newMemoryId) return 'missing new-memory-id.';
  if (!options.reason) return 'missing reason.';
  if (!options.evidence) return 'missing evidence.';
  if (!options.supersedesLink) return 'missing supersedes-link.';
  if (!options.supersededByLink) return 'missing superseded-by-link.';
  if (!options.actorClientId) return 'missing actor-client-id.';
  if (!options.requestSource) return 'missing request-source.';
  return '';
}

function summarizeAuditEvent(event) {
  if (!event) return null;
  return {
    event_id: event.event_id || null,
    event_type: event.event_type || null,
    tool_name: event.tool_name || null,
    memory_id: event.memory_id || null,
    replacement_memory_id: event.replacement_memory_id || null,
    pair_correlation_id: event.pair_correlation_id || event.correlation_id || null,
    actor_client_id: event.actor_client_id || null,
    request_source: event.request_source || null,
    old_from_status: event.old_from_status || null,
    old_to_status: event.old_to_status || null,
    new_from_status: event.new_from_status || null,
    new_to_status: event.new_to_status || null,
    created_at: event.created_at || event.committed_at || event.cancelled_at || null,
    reversible: event.reversible === true,
    old_previous_snapshot_ref: event.old_previous_snapshot_ref || null,
    new_previous_snapshot_ref: event.new_previous_snapshot_ref || null,
    redaction_applied: event.redaction_applied === true,
    lifecycle_policy_applied: event.lifecycle_policy_applied === true,
    scope_policy_applied: event.scope_policy_applied === true
  };
}

function buildServicePayload(options) {
  return {
    old_memory_id: options.oldMemoryId,
    new_memory_id: options.newMemoryId,
    reason: options.reason,
    evidence: options.evidence,
    supersedes_link: options.supersedesLink,
    superseded_by_link: options.supersededByLink,
    actor_client_id: options.actorClientId,
    request_source: options.requestSource,
    dry_run: !(options.apply && options.confirm),
    ...(options.apply && options.confirm ? { confirm: true } : {})
  };
}

function buildFallbackAuditPreview(result, options) {
  return {
    event_id: null,
    event_type: 'memory_supersede',
    tool_name: 'supersede_memory',
    memory_id: result.oldMemoryId || options.oldMemoryId || null,
    replacement_memory_id: result.newMemoryId || options.newMemoryId || null,
    pair_correlation_id: result.pairCorrelationId || null,
    actor_client_id: options.actorClientId || null,
    request_source: options.requestSource || null,
    old_from_status: result.oldFromStatus || null,
    old_to_status: result.oldToStatus || 'superseded',
    new_from_status: result.newFromStatus || null,
    new_to_status: result.newToStatus || 'active',
    created_at: null,
    reversible: true,
    old_previous_snapshot_ref: result.oldFromStatus
      ? {
          memory_id: result.oldMemoryId || options.oldMemoryId || null,
          status: result.oldFromStatus,
          updated_at: null
        }
      : null,
    new_previous_snapshot_ref: result.newFromStatus
      ? {
          memory_id: result.newMemoryId || options.newMemoryId || null,
          status: result.newFromStatus,
          updated_at: null
        }
      : null,
    redaction_applied: true,
    lifecycle_policy_applied: true,
    scope_policy_applied: true
  };
}

function buildReportFromResult(result, options) {
  const auditPreview = summarizeAuditEvent(
    result.auditPlanPreview?.pendingEvent || result.auditEventIntent || null
  ) || buildFallbackAuditPreview(result, options);
  const auditEvent = summarizeAuditEvent(result.auditEvent || null);
  const status = result.success
    ? 'ok'
    : (options.apply ? 'rejected' : 'dry-run-rejected');

  return {
    status,
    decision: result.decision || 'rejected',
    dryRun: result.dryRun !== false,
    mutated: result.mutated === true,
    oldMemoryId: result.oldMemoryId || options.oldMemoryId || null,
    newMemoryId: result.newMemoryId || options.newMemoryId || null,
    oldFromStatus: result.oldFromStatus || null,
    oldToStatus: result.oldToStatus || 'superseded',
    newFromStatus: result.newFromStatus || null,
    newToStatus: result.newToStatus || 'active',
    pairCorrelationId: result.pairCorrelationId || null,
    reason: result.reason || options.reason,
    auditPreview,
    auditEvent,
    lifecyclePolicyApplied: result.policy?.lifecycle_policy_applied === true,
    scopePolicyApplied: result.policy?.scope_policy_applied === true,
    redactionApplied: result.policy?.redaction_applied === true,
    rawWorkspaceIdExposed: false
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `dryRun: ${report.dryRun}`,
    `mutated: ${report.mutated}`,
    `oldMemoryId: ${report.oldMemoryId || ''}`,
    `newMemoryId: ${report.newMemoryId || ''}`,
    `oldFromStatus: ${report.oldFromStatus || ''}`,
    `oldToStatus: ${report.oldToStatus || ''}`,
    `newFromStatus: ${report.newFromStatus || ''}`,
    `newToStatus: ${report.newToStatus || ''}`,
    `pairCorrelationId: ${report.pairCorrelationId || ''}`,
    `reason: ${report.reason || ''}`,
    `lifecyclePolicyApplied: ${report.lifecyclePolicyApplied}`,
    `scopePolicyApplied: ${report.scopePolicyApplied}`,
    `redactionApplied: ${report.redactionApplied}`,
    `rawWorkspaceIdExposed: ${report.rawWorkspaceIdExposed}`
  ];
  if (report.auditPreview) {
    lines.push(`auditPreview: ${report.auditPreview.event_type}/${report.auditPreview.tool_name}`);
  }
  if (report.auditEvent) {
    lines.push(`auditEvent: ${report.auditEvent.event_type}/${report.auditEvent.tool_name}`);
  }
  return `${lines.join('\n')}\n`;
}

async function buildReport(options, appFactory = createCodexMemoryApplication) {
  const cliError = validateCliOptions(options);
  if (cliError) {
    return {
      report: buildCliRejection(cliError, options),
      exitCode: 1
    };
  }

  const app = appFactory();
  try {
    const result = await app.services.supersedeMemoryService.supersede(buildServicePayload(options));
    const report = buildReportFromResult(result, options);
    return {
      report,
      exitCode: report.status === 'rejected' ? 1 : 0
    };
  } finally {
    if (typeof app.close === 'function') {
      await app.close();
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let output;
  try {
    output = await buildReport(options);
  } catch (error) {
    output = {
      report: buildCliRejection(error.message || 'supersede-memory CLI failed.', options),
      exitCode: 1
    };
  }

  process.stdout.write(options.json
    ? `${JSON.stringify(output.report, null, 2)}\n`
    : renderText(output.report));
  process.exitCode = output.exitCode;
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  validateCliOptions,
  summarizeAuditEvent,
  buildReportFromResult,
  buildReport,
  renderText
};
