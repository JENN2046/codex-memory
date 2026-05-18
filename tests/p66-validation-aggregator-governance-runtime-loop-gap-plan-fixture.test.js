const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-governance-runtime-loop-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const GOVERNANCE_LOOP_STAGES = [
  'review_packet_intake',
  'approval_packet_evaluation',
  'audit_evidence_shape_evaluation',
  'execution_gate_evaluation',
  'durable_write_gate',
  'post_action_evidence_gate'
];

const REQUIRED_RUNTIME_EVIDENCE = [
  'governance_review_runtime_path',
  'approval_execution_runtime_path',
  'audit_evidence_runtime_path',
  'durable_audit_writer',
  'durable_memory_mutation_policy',
  'post_action_audit_ref_runtime_path',
  'governance_loop_no_touch_boundary_proof',
  'governance_loop_readiness_overclaim_rejection_proof'
];

const P56_SOURCE_EVIDENCE = [
  'p31_lifecycle_contract_helper',
  'p32_approval_packet_helper',
  'p33_audit_evidence_helper',
  'p34_review_surface_helper',
  'p55_evidence_runtime_trace_helper'
];

const A5_HARD_STOPS = [
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
  'startup_install',
  'provider_call',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'rc_ready_claim'
];

test('P66.37 governance runtime loop gap plan parses as planning-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-governance-runtime-loop-gap-plan-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-governance-runtime-loop-gap-plan-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-governance-runtime-loop-gap-plan-manifest-v1');
  assert.equal(fixture.phase, 'P66.37-validation-aggregator-governance-runtime-loop-gap-planning');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.37 selects only the governance runtime loop gap', () => {
  assert.equal(fixture.selectedGap.id, 'governance_review_approval_audit_runtime_loop_not_executed');
  assert.equal(fixture.selectedGap.priority, 2);
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.37 keeps first-gap local proof complete while runtime gap remains open', () => {
  assert.equal(fixture.priorGapLocalProofReview.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.priorGapLocalProofReview.localProofSlicesComplete, true);
  assert.equal(fixture.priorGapLocalProofReview.runtimeGapStillOpen, true);
  assert.equal(fixture.priorGapLocalProofReview.readinessAuthority, false);
});

test('P66.37 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.37 keeps governance, runtime, final RC, and cutover readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'governanceRuntimeLoopReady',
    'governanceRuntimeLoopExecuted',
    'approvalExecutionReady',
    'auditWriterReady',
    'durableAuditWritten',
    'durableMemoryWritten',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady',
    'cutoverReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P66.37 references the exact P56 source evidence without granting runtime authority', () => {
  assert.deepEqual(fixture.p56SourceEvidence, P56_SOURCE_EVIDENCE);
  assert.equal(fixture.governanceRuntimeLoopReady, false);
  assert.equal(fixture.governanceRuntimeLoopExecuted, false);
});

test('P66.37 governance loop stages are exact, required, and non-executable', () => {
  assert.deepEqual(fixture.requiredGovernanceLoopStages.map(stage => stage.id), GOVERNANCE_LOOP_STAGES);

  for (const stage of fixture.requiredGovernanceLoopStages) {
    assert.equal(stage.required, true, stage.id);
    assert.equal(stage.currentStatus, 'boundary_defined_not_runtime_executed', stage.id);
    assert.equal(stage.canExecute, false, stage.id);
    assert.equal(stage.durableWriteAllowed, false, stage.id);
    assert.equal(stage.mustFailClosedWhenMissing, true, stage.id);
  }
});

test('P66.37 required runtime evidence is exact and missing by default', () => {
  assert.deepEqual(fixture.requiredRuntimeEvidence.map(evidence => evidence.id), REQUIRED_RUNTIME_EVIDENCE);

  for (const evidence of fixture.requiredRuntimeEvidence) {
    assert.equal(evidence.required, true, evidence.id);
    assert.equal(evidence.currentStatus, 'missing', evidence.id);
    assert.equal(evidence.mustFailClosedWhenMissing, true, evidence.id);
  }
});

test('P66.37 accepted future local work excludes runtime and side-effect actions', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test',
    'pure_explicit_input_helper',
    'static_report_shape_bridge'
  ]);

  for (const disallowed of ['runtime_governance_loop', 'approval_execution', 'durable_audit_writer', 'service_start']) {
    assert.ok(!fixture.acceptedFutureLocalWork.includes(disallowed), disallowed);
  }
});

test('P66.37 disallowed work covers runtime loop, durable writes, provider, config, MCP, and release actions', () => {
  for (const disallowed of [
    'runtime_governance_loop',
    'governed_action_execution',
    'approval_execution',
    'durable_audit_writer',
    'durable_memory_writer',
    'real_review_packet_read',
    'real_approval_packet_read',
    'real_audit_log_read',
    'real_memory_scan',
    'runtime_store_scan',
    'command_execution',
    'gate_execution',
    'runner_execution',
    'service_start',
    'provider_call',
    'config_mutation',
    'startup_watchdog_operation',
    'migration_apply',
    'import_export_apply',
    'public_mcp_expansion',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.37 fail-closed cases cover review, approval, audit, execution, durable write, and readiness failures', () => {
  for (const failClosedCase of [
    'missing_review_packet',
    'missing_approval_packet',
    'missing_audit_evidence',
    'missing_execution_gate',
    'missing_durable_write_gate',
    'missing_post_action_evidence',
    'stale_governance_evidence',
    'scope_mismatch_between_review_approval_and_audit',
    'approval_without_authority',
    'execution_without_a5_approval',
    'durable_audit_write_claim',
    'durable_memory_write_claim',
    'unsupported_governance_source',
    'unsafe_summary_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.37 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.37 safety flags forbid runtime, provider, data, config, MCP, package, secret, remote, and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.37 forbidden claims keep governance runtime loop and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.37 executes governance runtime loop'));
  assert.ok(fixture.forbiddenClaims.includes('P66.37 closes governance_review_approval_audit_runtime_loop_not_executed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.37 enables durable audit writer'));
  assert.ok(fixture.forbiddenClaims.includes('P66.37 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.37 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.37 authorizes push tag release deploy'));
});

test('P66.37 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.37 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
