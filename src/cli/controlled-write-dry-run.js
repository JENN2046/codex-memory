#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'controlled-write-dry-run-v1.json'
);

const REJECTED_FLAGS = new Set(['--confirm', '--apply', '--write', '--mutate']);

function parseArgs(argv = []) {
  const options = {
    json: false,
    toolName: null,
    fixturePath: DEFAULT_FIXTURE_PATH,
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--tool') {
      options.toolName = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildAuditPreview(operation, requiredFields) {
  const preview = {};
  for (const field of requiredFields) {
    preview[field] = `<dry-run-${field}>`;
  }

  preview.event_type = operation.eventType;
  preview.tool_name = operation.toolName;
  preview.reversible = true;
  preview.redaction_applied = true;
  preview.lifecycle_policy_applied = true;
  preview.scope_policy_applied = true;
  preview.diff_summary = operation.requiresDiffSummary ? '<required-diff-summary>' : '<dry-run-diff-summary>';
  preview.previous_snapshot_ref = operation.requiresPreviousSnapshotRef
    ? '<required-previous-snapshot-ref>'
    : '<dry-run-previous-snapshot-ref>';

  return preview;
}

function buildOperationPlan(operation, fixture) {
  const requiresAuditEvent = operation.requiresAuditEvent !== false;
  const allowedTransitions = operation.allowedLifecycleTransitions || [];
  const forbiddenActions = operation.forbiddenActions || [];

  return {
    operation: operation.eventType,
    toolCandidate: operation.toolName,
    dryRun: true,
    mutated: false,
    toolName: operation.toolName,
    eventType: operation.eventType,
    riskLevel: operation.riskLevel,
    mutationCapable: operation.mutationCapable,
    wouldMutate: false,
    wouldRequireAuditEvent: requiresAuditEvent,
    wouldRequireReason: operation.requiresReason === true,
    wouldRequireEvidence: operation.requiresEvidence === true,
    wouldRequirePreviousSnapshot: operation.requiresPreviousSnapshotRef === true,
    wouldRequireDiffSummary: operation.requiresDiffSummary === true,
    wouldRequireLifecycleTransition: allowedTransitions.length > 0,
    wouldRequireScopePolicy: operation.requiresScopePolicy === true,
    redactionRequired: true,
    allowedTransitions,
    forbiddenActions,
    nextStep: operation.readOnly === true
      ? 'Review scoped audit output only; no mutation path is available.'
      : 'Review dry-run output and require explicit approval before any future mutation.',
    requiresExplicitApproval: operation.requiresExplicitApproval === true,
    requiresDryRunFirst: operation.requiresDryRunFirst === true,
    requiresReason: operation.requiresReason === true,
    requiresEvidence: operation.requiresEvidence === true,
    noSilentOverwrite: operation.noSilentOverwrite === true,
    requiresBidirectionalLinks: operation.requiresBidirectionalLinks === true,
    defaultAction: operation.defaultAction || null,
    hardDeleteAllowed: operation.hardDeleteAllowed === true,
    readOnly: operation.readOnly === true,
    allowedLifecycleTransitions: allowedTransitions,
    forbiddenLifecycleTransitions: operation.forbiddenLifecycleTransitions || [],
    forbiddenActions,
    requiredAuditFields: fixture.requiredAuditFields,
    auditEventPreview: requiresAuditEvent ? buildAuditPreview(operation, fixture.requiredAuditFields) : null,
    safety: {
      fixtureOnly: fixture.fixtureOnly === true,
      dryRun: true,
      mutated: false,
      noDatabase: fixture.noDatabase === true,
      noDiaryWrite: fixture.noDiaryWrite === true,
      noVectorWrite: fixture.noVectorWrite === true,
      noAuditLogWrite: fixture.noAuditLogWrite === true,
      noDurableMemoryWrite: fixture.noDurableMemoryWrite === true,
      noMcpPublicToolExpansion: fixture.noMcpPublicToolExpansion === true,
      publicToolsFrozen: fixture.publicToolsFrozen === true,
      permitsRawSecretOutput: false,
      lowRiskSummaryAllowsRawWorkspaceId: false
    }
  };
}

function buildReport({ fixture, toolName = null, rejectedFlag = null } = {}) {
  if (rejectedFlag) {
    return {
      status: 'error',
      phase: 'P12.3-controlled-write-dry-run-cli-prototypes',
      mutated: false,
      fixtureOnly: true,
      rejectedFlag,
      error: `${rejectedFlag} is not supported by controlled write dry-run.`,
      nextStep: 'Re-run without confirm/apply/write/mutate flags.'
    };
  }

  const selectedOperations = toolName
    ? fixture.operations.filter(operation => operation.toolName === toolName)
    : fixture.operations;

  if (toolName && selectedOperations.length === 0) {
    return {
      status: 'error',
      phase: fixture.phase,
      mutated: false,
      fixtureOnly: true,
      requestedTool: toolName,
      knownTools: fixture.operations.map(operation => operation.toolName),
      error: `Unknown controlled write candidate: ${toolName}`,
      nextStep: 'Select one of the known candidate tool names.'
    };
  }

  return {
    status: 'ok',
    phase: fixture.phase,
    schemaVersion: fixture.schemaVersion,
    version: fixture.version,
    mutated: false,
    fixtureOnly: fixture.fixtureOnly === true,
    noDatabase: fixture.noDatabase === true,
    noDiaryWrite: fixture.noDiaryWrite === true,
    noVectorWrite: fixture.noVectorWrite === true,
    noAuditLogWrite: fixture.noAuditLogWrite === true,
    noDurableMemoryWrite: fixture.noDurableMemoryWrite === true,
    noMcpPublicToolExpansion: fixture.noMcpPublicToolExpansion === true,
    publicToolsFrozen: fixture.publicToolsFrozen === true,
    publicTools: fixture.publicTools,
    operationCount: selectedOperations.length,
    operations: selectedOperations.map(operation => buildOperationPlan(operation, fixture)),
    nextStep: 'Review dry-run output; P12.4 MCP tool proposal review is required before any public tool expansion.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `phase: ${report.phase}`,
    `mutated: ${report.mutated}`,
    `fixtureOnly: ${report.fixtureOnly}`
  ];

  if (report.status === 'error') {
    if (report.rejectedFlag) lines.push(`rejectedFlag: ${report.rejectedFlag}`);
    if (report.requestedTool) lines.push(`requestedTool: ${report.requestedTool}`);
    lines.push(`error: ${report.error}`);
    lines.push(`nextStep: ${report.nextStep}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(`noDatabase: ${report.noDatabase}`);
  lines.push(`noDiaryWrite: ${report.noDiaryWrite}`);
  lines.push(`noVectorWrite: ${report.noVectorWrite}`);
  lines.push(`noAuditLogWrite: ${report.noAuditLogWrite}`);
  lines.push(`noDurableMemoryWrite: ${report.noDurableMemoryWrite}`);
  lines.push(`noMcpPublicToolExpansion: ${report.noMcpPublicToolExpansion}`);
  lines.push(`publicToolsFrozen: ${report.publicToolsFrozen}`);
  lines.push(`operationCount: ${report.operationCount}`);
  for (const operation of report.operations) {
    lines.push(
      `operation: ${operation.toolCandidate} eventType=${operation.operation} dryRun=${operation.dryRun} mutated=${operation.mutated} risk=${operation.riskLevel}`
    );
  }
  lines.push(`nextStep: ${report.nextStep}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;
  try {
    const fixture = loadFixture(options.fixturePath);
    report = buildReport({
      fixture,
      toolName: options.toolName,
      rejectedFlag: options.rejectedFlag
    });
  } catch (error) {
    report = {
      status: 'error',
      phase: 'P12.3-controlled-write-dry-run-cli-prototypes',
      mutated: false,
      fixtureOnly: true,
      error: error.message || 'failed to load controlled write dry-run fixture',
      nextStep: 'Check the fixture path and rerun.'
    };
  }

  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  parseArgs,
  loadFixture,
  buildReport,
  renderText
};
