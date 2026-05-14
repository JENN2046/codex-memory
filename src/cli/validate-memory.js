#!/usr/bin/env node
const { createCodexMemoryApplication } = require('../app');

const VALUE_FLAGS = new Set([
  '--memory-id',
  '--reason',
  '--evidence',
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
    memoryId: '',
    reason: '',
    evidence: '',
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
      if (token === '--memory-id') options.memoryId = value;
      if (token === '--reason') options.reason = value;
      if (token === '--evidence') options.evidence = value;
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
    memoryId: options.memoryId || null,
    fromStatus: null,
    toStatus: 'active',
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
  if (options.tool && options.tool !== 'validate_memory') {
    return `Unknown tool: ${options.tool}`;
  }
  if (options.mode && !['dry-run', 'apply'].includes(options.mode)) {
    return `Unknown mode: ${options.mode}`;
  }
  if (options.workspaceId) {
    return 'raw workspace_id is not accepted by validate-memory CLI output.';
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
  if (!options.memoryId) return 'missing memory-id.';
  if (!options.reason) return 'missing reason.';
  if (!options.evidence) return 'missing evidence.';
  if (!options.actorClientId) return 'missing actor-client-id.';
  if (!options.requestSource) return 'missing request-source.';
  return '';
}

function summarizeAuditEvent(event) {
  if (!event) return null;
  return {
    event_id: event.event_id || null,
    memory_id: event.memory_id || null,
    event_type: event.event_type || null,
    tool_name: event.tool_name || null,
    actor_client_id: event.actor_client_id || null,
    request_source: event.request_source || null,
    from_status: event.from_status || null,
    to_status: event.to_status || null,
    created_at: event.created_at || null,
    reversible: event.reversible === true,
    previous_snapshot_ref: event.previous_snapshot_ref || null,
    redaction_applied: event.redaction_applied === true,
    lifecycle_policy_applied: event.lifecycle_policy_applied === true,
    scope_policy_applied: event.scope_policy_applied === true
  };
}

function buildServicePayload(options) {
  return {
    memory_id: options.memoryId,
    reason: options.reason,
    evidence: options.evidence,
    actor_client_id: options.actorClientId,
    request_source: options.requestSource,
    dry_run: !(options.apply && options.confirm),
    ...(options.apply && options.confirm ? { confirm: true } : {})
  };
}

function buildFallbackAuditPreview(result, options) {
  return {
    event_id: null,
    memory_id: result.memoryId || options.memoryId || null,
    event_type: 'memory_validate',
    tool_name: 'validate_memory',
    actor_client_id: options.actorClientId || null,
    request_source: options.requestSource || null,
    from_status: result.fromStatus || null,
    to_status: result.toStatus || 'active',
    created_at: null,
    reversible: true,
    previous_snapshot_ref: result.fromStatus
      ? {
          memory_id: result.memoryId || options.memoryId || null,
          status: result.fromStatus,
          updated_at: null
        }
      : null,
    redaction_applied: true,
    lifecycle_policy_applied: true,
    scope_policy_applied: true
  };
}

function buildReportFromResult(result, options) {
  const auditPreview = summarizeAuditEvent(result.auditEventPreview || null)
    || buildFallbackAuditPreview(result, options);
  const auditEvent = summarizeAuditEvent(result.auditEvent || null);
  const status = result.success
    ? 'ok'
    : (options.apply ? 'rejected' : 'dry-run-rejected');

  return {
    status,
    decision: result.decision || 'rejected',
    dryRun: result.dryRun !== false,
    mutated: result.mutated === true,
    memoryId: result.memoryId || options.memoryId || null,
    fromStatus: result.fromStatus || null,
    toStatus: result.toStatus || 'active',
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
    `memoryId: ${report.memoryId || ''}`,
    `fromStatus: ${report.fromStatus || ''}`,
    `toStatus: ${report.toStatus || ''}`,
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
    const result = await app.services.validateMemoryService.validate(buildServicePayload(options));
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
      report: buildCliRejection(error.message || 'validate-memory CLI failed.', options),
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
