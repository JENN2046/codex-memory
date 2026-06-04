const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-baseline-binding-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_BASELINE_BINDING_FIELDS = [
  'evidence_id',
  'baseline_binding_id',
  'target_commit',
  'target_commit_source',
  'baseline_kind',
  'baseline_ref',
  'evidence_subject_commit',
  'validation_scope',
  'binding_observed_at',
  'binding_status'
];

test('P66.12 fixture parses as baseline binding acceptance-contract-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-baseline-binding-proof-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-baseline-binding-proof-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-baseline-binding-proof-manifest-v1');
  assert.equal(fixture.phase, 'P66.12-validation-aggregator-baseline-binding-proof-fixture');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.12 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.12 defines the baseline binding group without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'baseline_binding_proof');
  assert.equal(fixture.evidenceGroup.priority, 3);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenAmbiguous, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMismatched, true);
});

test('P66.12 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.12 keeps all full implementation and readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.12 required baseline binding fields are exact and explicit', () => {
  assert.deepEqual(fixture.requiredBaselineBindingFields, REQUIRED_BASELINE_BINDING_FIELDS);
});

test('P66.12 separates target approval execution and current-main commit roles', () => {
  assert.equal(
    fixture.separatedCommitRoles.target_commit,
    'the code or artifact commit being validated'
  );
  assert.equal(
    fixture.separatedCommitRoles.approval_request_commit,
    'the approval document version, not automatically the target'
  );
  assert.equal(
    fixture.separatedCommitRoles.execution_checkout_commit,
    'the temporary checkout or worktree commit used by future approved gates'
  );
  assert.equal(
    fixture.separatedCommitRoles.current_main_head,
    'the active main branch state, not automatically the target'
  );
});

test('P66.12 baseline kinds are explicit and do not imply checkout', () => {
  assert.deepEqual(fixture.baselineKinds, [
    'rc_target_commit',
    'local_validation_target_commit',
    'temporary_gate_execution_checkout',
    'docs_only_approval_state'
  ]);
  assert.equal(fixture.baselinePolicy.noCheckoutRequiredForFixture, true);
  assert.equal(fixture.baselinePolicy.noRemoteLookupRequiredForFixture, true);
});

test('P66.12 baseline policy rejects silent inference and mismatched roles', () => {
  assert.equal(fixture.baselinePolicy.targetCommitRequired, true);
  assert.equal(fixture.baselinePolicy.targetCommitMustEqualEvidenceSubjectCommit, true);
  assert.equal(fixture.baselinePolicy.approvalRequestCommitIsNotTargetByDefault, true);
  assert.equal(fixture.baselinePolicy.currentMainHeadIsNotTargetByDefault, true);
  assert.equal(fixture.baselinePolicy.executionCheckoutCommitRequiredOnlyForApprovedGateExecution, true);
  assert.equal(fixture.baselinePolicy.noSilentInference, true);
  assert.equal(fixture.baselinePolicy.ambiguousBaselineFailsClosed, true);
  assert.equal(fixture.baselinePolicy.mismatchFailsClosed, true);
});

test('P66.12 fail-closed cases cover missing, ambiguous, mismatched, malformed, and overclaim states', () => {
  for (const failClosedCase of [
    'missing_target_commit',
    'missing_evidence_subject_commit',
    'missing_baseline_kind',
    'missing_baseline_ref',
    'target_commit_mismatch',
    'approval_request_commit_used_as_target_without_explicit_binding',
    'current_main_head_used_as_target_without_explicit_binding',
    'execution_checkout_commit_missing_for_gate_execution',
    'ambiguous_baseline_role',
    'unknown_baseline_kind',
    'malformed_commit_hash',
    'missing_binding_observed_at',
    'non_utc_binding_timestamp',
    'unsafe_summary_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.12 low-risk summary excludes raw workspace ids, secrets, paths, and service URLs', () => {
  assert.equal(fixture.baselineSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.baselineSummary.rawSecretExposed, false);
  assert.deepEqual(fixture.baselineSummary.allowedFields, [
    'evidence_id',
    'baseline_binding_id',
    'target_commit_short',
    'baseline_kind',
    'binding_status',
    'mutated'
  ]);
  for (const disallowed of [
    'raw_workspace_id',
    'raw_workspace_path',
    'raw_secret',
    'raw_token',
    'authorization_header',
    'provider_key',
    'absolute_path',
    'live_service_url'
  ]) {
    assert.ok(fixture.baselineSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.12 disallowed work covers git checkout reset detach remote lookup runtime provider data MCP and release actions', () => {
  for (const disallowed of [
    'runtime_collector',
    'evidence_file_read',
    'command_execution',
    'git_checkout',
    'git_reset',
    'git_detach_head',
    'git_remote_lookup',
    'gate_execution',
    'runner_execution',
    'service_start',
    'provider_call',
    'real_memory_scan',
    'runtime_store_scan',
    'durable_memory_write',
    'durable_audit_write',
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

test('P66.12 safety flags preserve no-touch git and no-side-effect boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.12 forbidden claims keep baseline runtime proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.12 implements baseline binding runtime collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.12 checks out the target commit'));
  assert.ok(fixture.forbiddenClaims.includes('P66.12 resets or detaches HEAD'));
  assert.ok(fixture.forbiddenClaims.includes('P66.12 performs remote baseline verification'));
  assert.ok(fixture.forbiddenClaims.includes('P66.12 closes validation_aggregator_full_implementation_incomplete'));
  assert.ok(fixture.forbiddenClaims.includes('P66.12 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.12 authorizes RC_READY'));
});

test('P66.12 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.12 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
