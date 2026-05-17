const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p36-task-risk-labels-contract-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_LABELS = [
  'A4-local-safe',
  'A4.8-guarded',
  'A5-hard-stop'
];

const REQUIRED_A5_DENIED_ACTIONS = [
  'real_memory_content_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'sqlite_migration_apply',
  'backup',
  'restore',
  'provider_call',
  'model_call',
  'public_mcp_expansion',
  'env_or_secret_edit',
  'dependency_change',
  'watchdog_or_config_switch',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
];

test('P36-T2 task risk fixture parses and locks top-level blocked state', () => {
  assert.equal(fixture.schemaVersion, 'p36-task-risk-labels-contract-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P36-T2-task-risk-labels-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.sourceMode, 'committed_fixture');
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P36-T2 fixture does not claim runtime, policy kernel, MCP, real data, or mutation authority', () => {
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.policyKernelImplemented, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryContentRead, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.safety.noRuntimePolicyKernel, true);
  assert.equal(fixture.safety.noCommandExecution, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
});

test('P36-T2 labels define machine-readable A4, A4.8, and A5 semantics', () => {
  const labels = new Map(fixture.labels.map(label => [label.id, label]));

  for (const label of REQUIRED_LABELS) {
    assert.ok(labels.has(label), label);
  }

  assert.equal(labels.get('A4-local-safe').machineStatus, 'allow_local_fixture_only');
  assert.equal(labels.get('A4.8-guarded').machineStatus, 'allow_guarded_local_after_validation');
  assert.equal(labels.get('A5-hard-stop').machineStatus, 'blocked_requires_separate_explicit_human_approval');
  assert.equal(labels.get('A5-hard-stop').requiresHumanApproval, true);
  assert.deepEqual(labels.get('A5-hard-stop').allowedActions, []);
});

test('P36-T2 unknown, missing, ambiguous, and unparsable risk labels map to A5', () => {
  assert.equal(fixture.labelContract.unknownRiskLabelDisposition, 'A5-hard-stop');
  assert.equal(fixture.labelContract.missingRiskLabelDisposition, 'A5-hard-stop');
  assert.equal(fixture.labelContract.ambiguousRiskLabelDisposition, 'A5-hard-stop');
  assert.equal(fixture.labelContract.unparsableRiskLabelDisposition, 'A5-hard-stop');
  assert.equal(fixture.labelContract.defaultAllow, false);
});

test('P36-T2 A5 denied actions are blocked even under A4/A4.8 labels', () => {
  const labels = new Map(fixture.labels.map(label => [label.id, label]));

  for (const deniedAction of REQUIRED_A5_DENIED_ACTIONS) {
    assert.ok(labels.get('A5-hard-stop').deniedActions.includes(deniedAction), deniedAction);
  }

  assert.ok(labels.get('A4-local-safe').deniedActions.includes('real_memory_scan'));
  assert.ok(labels.get('A4.8-guarded').deniedActions.includes('public_mcp_expansion'));
  assert.ok(labels.get('A4.8-guarded').allowedActions.includes('guarded_local_commit'));
  assert.ok(!labels.get('A4.8-guarded').allowedActions.includes('push_tag_release_deploy'));
});

test('P36-T2 critical gate unknown, skipped, failed, or warning-only is a nonzero failure path', () => {
  assert.equal(fixture.labelContract.warningOnlyGateAllowed, false);
  assert.equal(fixture.labelContract.criticalSkippedUnknownEqualsFailure, true);
  assert.equal(fixture.labelContract.failurePathExitCode, 1);

  for (const outcome of ['fail', 'unknown', 'skipped', 'warning_only']) {
    assert.equal(fixture.gateOutcomeSemantics[outcome].acceptedForPlanning, false, outcome);
    assert.equal(fixture.gateOutcomeSemantics[outcome].exitCode, 1, outcome);
  }
});

test('P36-T2 decision cases cover allow, guarded local, unknown, malformed, and A5 escalation', () => {
  const casesById = new Map(fixture.decisionCases.map(entry => [entry.id, entry]));

  assert.equal(casesById.get('a4_local_safe_fixture_docs').machineDecision, 'allow_local_fixture_only');
  assert.equal(casesById.get('a48_guarded_local_commit').machineDecision, 'allow_guarded_local_after_validation');
  assert.equal(casesById.get('unknown_risk_label').machineDecision, 'A5-hard-stop');
  assert.equal(casesById.get('missing_risk_label').machineDecision, 'A5-hard-stop');
  assert.equal(casesById.get('critical_gate_unknown').machineDecision, 'deny');
  assert.equal(casesById.get('critical_gate_skipped').machineDecision, 'deny');
  assert.equal(casesById.get('warning_only_critical_gate').machineDecision, 'deny');
  assert.equal(casesById.get('a4_requests_real_memory_scan').machineDecision, 'A5-hard-stop');
  assert.equal(casesById.get('a48_requests_public_mcp_expansion').machineDecision, 'A5-hard-stop');
  assert.equal(casesById.get('malformed_envelope').machineDecision, 'deny');
});

test('P36-T2 failing decision cases are not accepted for planning and carry P36 reason codes', () => {
  for (const entry of fixture.decisionCases.filter(item => !item.acceptedForPlanning)) {
    assert.equal(entry.acceptedForPlanning, false, entry.id);
    assert.ok(entry.reasonCodes.length > 0, entry.id);
    for (const reasonCode of entry.reasonCodes) {
      assert.match(reasonCode, /^P36_/, `${entry.id}:${reasonCode}`);
    }
  }
});

test('P36-T2 required wording prevents runtime-ready, warning-only, and A4.8 overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic task risk label contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('map to A5-hard-stop')));
  assert.ok(fixture.requiredWording.some(line => line.includes('warning-only equals failure')));
  assert.ok(fixture.requiredWording.some(line => line.includes('A4.8 guarded local work is not authorization')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not mean runtime policy enforcement')));
  assert.ok(fixture.forbiddenClaims.includes('unknown risk defaults to A4'));
  assert.ok(fixture.forbiddenClaims.includes('A4.8 authorizes push'));
  assert.ok(fixture.forbiddenClaims.includes('task risk labels make v1.0 RC ready'));
});

test('P36-T2 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /password\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /token\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /set-cookie/i);
  assert.doesNotMatch(fixtureText, /(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
  assert.doesNotMatch(fixtureText, /https?:\/\//i);
});

test('P36-T2 reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
