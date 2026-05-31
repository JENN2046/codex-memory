const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const A5_APPROVAL_LINE_UNITS = Object.freeze({
  'A5-GAP-1': {
    action: 'governance_runtime_loop',
    pattern: /^I approve A5-GAP-1 for codex-memory on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), limited to (?<subject>.+), with durable write (?<durableWrite>yes|no)(?:, (?<readOnlyGovernanceReport>running read-only governance report only))?\.$/
  },
  'A5-GAP-2': {
    action: 'recall_isolation_no_mutation',
    pattern: /^I approve A5-GAP-2 for codex-memory on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), limited to stores (?<stores>.+?), no mutation(?:, (?<classifiedIsolationReadonly>read-only classified isolation positive-sample presence and projection proof only, no backfill, no migration, no durable write))?\.$/
  },
  'A5-GAP-3': {
    action: 'migration_boundary',
    pattern: /^I approve A5-GAP-3 for codex-memory on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), action (?<action>dry-run|apply|backup|restore|import|export), target (?<target>.+?)(?:, (?<noApplyBoundary>no apply, no import, no export, no backup, no restore, no durable write))?\.$/
  },
  'A5-GAP-4': {
    action: 'live_http_operation',
    pattern: /^(?:I approve A5-GAP-4 for codex-memory|I approve A5-GAP-4 (?<authenticatedMcpToolList>authenticated MCP initialize\/tools-list evidence) for codex-memory) on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), endpoint (?<endpoint>\S+), (?:no config\/watchdog\/startup change|using current-session bearer token if already present, without printing or persisting token material, no config\/watchdog\/startup change, no tools\/call)\.$/
  },
  'A5-GAP-5': {
    action: 'cutover_context_strict_gate',
    command: 'npm run gate:mainline:strict',
    pattern: /^I approve A5-GAP-5 for codex-memory on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), running cutover-context strict gate only, no remote write\.$/
  },
  'A5-GAP-6': {
    action: 'validation_aggregator_evidence_only',
    pattern: /^I approve A5-GAP-6 for codex-memory on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), using only evidence from approved A5-GAP units (?<units>A5-GAP-\d(?:, ?A5-GAP-\d)*)(?:, including (?<includedEvidence>[A-Za-z0-9_.-]+), (?<noNewRuntimeAction>no new runtime action))?\.$/
  },
  'A5-GAP-7': {
    action: 'rc_cutover',
    pattern: /^I approve A5-GAP-7 for codex-memory on branch (?<branch>\S+) at commit (?<commit>[0-9a-f]{7,40}), exact remote\/release actions (?<actions>.+)\.$/
  }
});

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function containsPlaceholder(value) {
  return /<[^>]+>/.test(value);
}

function normalizeCommaSeparatedList(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildParsedApprovalScope(unit, parsed = {}) {
  if (unit !== 'A5-GAP-6') return {};
  const approvedEvidenceUnits = normalizeCommaSeparatedList(parsed.units);
  return {
    approvedEvidenceUnits,
    approvedEvidenceUnitCount: approvedEvidenceUnits.length,
    includedEvidenceFile: parsed.includedEvidence || '',
    noNewRuntimeAction: parsed.noNewRuntimeAction === 'no new runtime action'
  };
}

function evaluateA5ApprovalLine({
  approvalLine,
  expectedUnit,
  expectedBranch,
  expectedCommit
} = {}) {
  const line = normalizeText(approvalLine);
  const unit = normalizeText(expectedUnit);
  const branch = normalizeText(expectedBranch);
  const commit = normalizeText(expectedCommit);
  const unitDefinition = A5_APPROVAL_LINE_UNITS[unit];
  const failClosedReasons = [];

  if (!line) failClosedReasons.push('missing_approval_line');
  if (!unitDefinition) failClosedReasons.push('unsupported_a5_unit');
  if (!branch) failClosedReasons.push('missing_expected_branch');
  if (!commit) failClosedReasons.push('missing_expected_commit');
  if (containsPlaceholder(line)) failClosedReasons.push('placeholder_present');

  let match = null;
  if (unitDefinition && line && !containsPlaceholder(line)) {
    match = line.match(unitDefinition.pattern);
    if (!match) failClosedReasons.push('approval_line_not_exact');
  }

  const parsed = match && match.groups ? { ...match.groups } : {};
  if (parsed.branch && branch && parsed.branch !== branch) {
    failClosedReasons.push('branch_mismatch');
  }
  if (parsed.commit && commit && parsed.commit !== commit) {
    failClosedReasons.push('commit_mismatch');
  }
  if (unit === 'A5-GAP-3' && /, no apply/.test(line) && !parsed.noApplyBoundary) {
    failClosedReasons.push('incomplete_no_apply_boundary');
  }
  const parsedApprovalScope = buildParsedApprovalScope(unit, parsed);

  const approvalAccepted = failClosedReasons.length === 0;

  return {
    status: approvalAccepted
      ? 'approval_line_exact_match'
      : 'approval_line_rejected_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    approvalAccepted,
    authorizationGranted: approvalAccepted,
    expectedUnit: unit,
    expectedBranch: branch,
    expectedCommit: commit,
    parsedUnit: unitDefinition ? unit : '',
    parsedBranch: parsed.branch || '',
    parsedCommit: parsed.commit || '',
    action: unitDefinition ? unitDefinition.action : '',
    command: unitDefinition && unitDefinition.command ? unitDefinition.command : '',
    parsed,
    parsedApprovalScope,
    failClosedReasons,
    sanitizedApprovalLine: redactSensitiveFragments(line),
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      changesConfig: false,
      changesWatchdogStartup: false,
      remoteWrite: false,
      claimsReadiness: false
    },
    runtimeReady: false,
    finalRcMatrixReady: false,
    rcReady: false
  };
}

module.exports = {
  A5_APPROVAL_LINE_UNITS,
  evaluateA5ApprovalLine
};
