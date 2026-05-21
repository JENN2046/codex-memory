const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const REPO_ASSERTION_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'external-token-material-assertion-record-v1.json'
);
const REPO_WIDENING_REVIEW_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'authorized-write-path-widening-review-v1.json'
);
const REPO_ROUTING_OUTCOME_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0605-routing-outcome-record-v1.md'
);
const REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0616-widening-review-outcome-record-v1.md'
);
const REPO_WIDENING_ADOPTION_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0607-widening-adoption-record-v1.md'
);
const REPO_CM0595_ISSUANCE_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0649-cm0595-approval-issuance-record-v1.md'
);
const REPO_CM0595_EXECUTION_EVIDENCE_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0650-cm0595-execution-evidence-record-v1.md'
);
const REPO_V3_RECEIPT_VALIDATION_LOG_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'smart-standing-authorization-v3-validation-log-sample.md'
);

function mainlineGateFixtureEnv() {
  const comparePayload = {
    summary: {
      ok: true,
      totalCaseCount: 43,
      matchedCaseCount: 43,
      coreMismatchCountTotal: 0,
      extendedMismatchCountTotal: 0
    }
  };
  const rollbackPayload = {
    summary: {
      ok: true,
      totalCaseCount: 43,
      readyCaseCount: 43,
      coreMismatchCountTotal: 0,
      extendedMismatchCountTotal: 0
    }
  };
  return {
    CODEX_MEMORY_GATE_COMPARE_COMMAND_JSON: JSON.stringify([
      process.execPath,
      '-e',
      `console.log(${JSON.stringify(JSON.stringify(comparePayload))})`
    ]),
    CODEX_MEMORY_GATE_ROLLBACK_COMMAND_JSON: JSON.stringify([
      process.execPath,
      '-e',
      `console.log(${JSON.stringify(JSON.stringify(rollbackPayload))})`
    ])
  };
}

function runDashboard({ args = [], env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/dashboard.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...mainlineGateFixtureEnv(), ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', code => { resolve({ code, stdout, stderr }); });
  });
}

function parseJsonOutput(text) {
  return JSON.parse(text);
}

function formatFailure(result) {
  return [
    `exit=${result.code}`,
    '--- stdout ---',
    result.stdout || '<empty>',
    '--- stderr ---',
    result.stderr || '<empty>'
  ].join('\n');
}

function assertKeySet(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), expected, `${label} keys`);
}

test('dashboard CLI should report all sections in json mode', async () => {
  const result = await runDashboard({ args: ['--json'] });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assertKeySet(payload, [
    'audits',
    'autopilotAdapters',
    'autopilotController',
    'autopilotGreenEntry',
    'autopilotGreenExecutor',
    'autopilotGreenFileBoundary',
    'autopilotGreenFileExecutorContract',
    'autopilotKernel',
    'autopilotLoop',
    'autopilotOperator',
    'autopilotReplay',
    'autopilotStateStore',
    'autopilotValidation',
    'checks',
    'destructive',
    'gate',
    'generatedAt',
    'governance',
    'mode',
    'operationalSummary',
    'profile',
    'readPolicy',
    'readinessSummary',
    'recommendations',
    'runtime',
    'service',
    'smartStandingAuthorizationV3',
    'store',
    'summary'
  ], 'dashboard top-level');
  assertKeySet(payload.summary, ['message', 'status'], 'dashboard summary');
  assertKeySet(payload.operationalSummary, [
    'gateStatus',
    'message',
    'profileStatus',
    'readinessClaimAllowed',
    'runtimeStatus',
    'scope',
    'serviceStatus',
    'status',
    'storeStatus'
  ], 'dashboard operational summary');
  assertKeySet(payload.readinessSummary, [
    'autopilotDecision',
    'blockerCodes',
    'blockerCount',
    'blockerSources',
    'decision',
    'governanceBlockerDetails',
    'governanceDecision',
    'governanceNextAction',
    'latestTask',
    'nextAction',
    'operationalStatus',
    'readPolicyEvidenceState',
    'readPolicyNextEvidenceAction',
    'readPolicyStatus',
    'readinessClaimAllowed',
    'recallScopeEvidenceState',
    'recallScopeNextAction',
    'recallScopeReadinessClaimAllowed',
    'recallScopeStatus',
    'status'
  ], 'dashboard readiness summary');
  assert.equal(payload.mode, 'memory-dashboard');
  assert.equal(payload.destructive, false);
  assert.equal(typeof payload.summary.status, 'string');
  assert.equal(typeof payload.operationalSummary.status, 'string');
  assert.equal(payload.operationalSummary.scope, 'service_store_profile_runtime_gate');
  assert.equal(payload.operationalSummary.readinessClaimAllowed, false);
  assert.equal(payload.readinessSummary.status, 'blocked');
  assert.equal(payload.readinessSummary.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.readinessSummary.readinessClaimAllowed, false);
  assert.equal(typeof payload.readinessSummary.recallScopeStatus, 'string');
  assert.equal(typeof payload.readinessSummary.recallScopeEvidenceState, 'string');
  assert.equal(typeof payload.readinessSummary.recallScopeNextAction, 'string');
  assert.equal(payload.readinessSummary.recallScopeReadinessClaimAllowed, false);
  assert.ok(Array.isArray(payload.readinessSummary.blockerCodes));
  assert.ok(Array.isArray(payload.readinessSummary.governanceBlockerDetails));
  assert.equal(
    payload.readinessSummary.governanceBlockerDetails.length,
    payload.readinessSummary.blockerCodes.filter(code => code.startsWith('authorized-write-path-')).length
  );
  assertKeySet(payload.readinessSummary.governanceBlockerDetails[0], [
    'artifactBundleKind',
    'blocker',
    'code',
    'commandBundleKind',
    'decision',
    'nextStepRef',
    'nextStepRefs',
    'operatorPacketKind',
    'primaryCommandId',
    'readinessClaimAllowed',
    'reason',
    'source',
    'stage',
    'status'
  ], 'dashboard readiness governance blocker detail');
  assert.deepEqual(payload.readinessSummary.governanceNextAction, payload.readinessSummary.governanceBlockerDetails[0]);
  assert.deepEqual(
    payload.readinessSummary.governanceBlockerDetails.map(detail => detail.code),
    [
      'authorized-write-path-auto-auth',
      'authorized-write-path-widening-review',
      'authorized-write-path-widening-adoption',
      'authorized-write-path-bounded-recall-preparation',
      'authorized-write-path-bounded-recall-closeout'
    ]
  );
  assertKeySet(payload.readinessSummary.governanceNextAction, [
    'artifactBundleKind',
    'blocker',
    'code',
    'commandBundleKind',
    'decision',
    'nextStepRef',
    'nextStepRefs',
    'operatorPacketKind',
    'primaryCommandId',
    'readinessClaimAllowed',
    'reason',
    'source',
    'stage',
    'status'
  ], 'dashboard readiness governance next action');
  assert.equal(payload.readinessSummary.governanceNextAction.status, 'blocked');
  assert.equal(payload.readinessSummary.governanceNextAction.code, 'authorized-write-path-auto-auth');
  assert.equal(payload.readinessSummary.governanceNextAction.blocker, 'external_token_assertion_not_accepted');
  assert.equal(payload.readinessSummary.governanceNextAction.stage, 'await_cm0611_assertion_record');
  assert.equal(payload.readinessSummary.governanceNextAction.nextStepRef, 'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md');
  assert.equal(payload.readinessSummary.governanceNextAction.commandBundleKind, 'assertion_record_command_bundle');
  assert.equal(payload.readinessSummary.governanceNextAction.primaryCommandId, 'helper_assertion_record_review');
  assert.equal(payload.readinessSummary.governanceNextAction.readinessClaimAllowed, false);
  assert.equal(payload.readinessSummary.governanceBlockerDetails[1].stage, 'widening_review');
  assert.equal(payload.readinessSummary.governanceBlockerDetails[2].stage, 'widening_adoption');
  assert.equal(payload.readinessSummary.governanceBlockerDetails[3].stage, 'bounded_recall_preparation');
  assert.equal(payload.readinessSummary.governanceBlockerDetails[4].stage, 'bounded_recall_closeout');

  // Service section
  assert.ok(payload.service, 'should have service section');
  assert.equal(typeof payload.service.status, 'string');
  assert.ok(payload.service.url);

  // Store section
  assert.ok(payload.store, 'should have store section');
  assert.equal(typeof payload.store.records, 'number');
  assert.ok(payload.store.records >= 0, 'records should be non-negative');
  assert.ok(['ok', 'warn'].includes(payload.store.status), 'store status should be ok or warn');
  if (payload.store.records === 0) {
    assert.equal(payload.store.status, 'warn', 'empty clean runner store should warn');
  }

  // Profile section
  assert.ok(payload.profile, 'should have profile section');
  assert.equal(typeof payload.profile.fingerprint, 'string');

  // Runtime section
  assert.ok(payload.runtime, 'should have runtime section');
  assert.equal(typeof payload.runtime.httpLogErrorCount, 'number');

  // Audits section
  assert.ok(payload.audits, 'should have audits section');
  assertKeySet(payload.audits, ['bridge', 'readPolicy', 'recall'], 'dashboard audits');
  assert.ok(payload.audits.bridge);
  assert.ok(payload.audits.recall);
  assertKeySet(payload.audits.recall, [
    'clientBreakdown',
    'lastRecallAt',
    'latestScopedHitAt',
    'projectBreakdown',
    'recallTypeBreakdown',
    'recentCount',
    'scopeDimensionBreakdown',
    'scopeEvidenceState',
    'scopeModeBreakdown',
    'scopeNextAction',
    'scopeReadinessClaimAllowed',
    'scopeStatus',
    'scopedRecallCount',
    'status',
    'strictScopedRecallCount',
    'visibilityBreakdown'
  ], 'dashboard recall audit');
  assert.equal(typeof payload.audits.recall.scopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.strictScopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.scopeModeBreakdown, 'object');
  assert.equal(typeof payload.audits.recall.scopeDimensionBreakdown, 'object');
  assert.equal(typeof payload.audits.recall.scopeStatus, 'string');
  assert.equal(typeof payload.audits.recall.scopeEvidenceState, 'string');
  assert.equal(typeof payload.audits.recall.scopeNextAction, 'string');
  assert.equal(payload.audits.recall.scopeReadinessClaimAllowed, false);
  assert.equal(payload.audits.recall.rawWorkspaceId, undefined);

  assertKeySet(payload.readPolicy, [
    'auditEvidenceAvailable',
    'auditTailLimit',
    'auditedEntryCount',
    'configEvidenceAvailable',
    'evidenceState',
    'latestReadPolicyAuditAt',
    'lifecycleColumnAvailable',
    'lifecycleExcludedStatuses',
    'lifecycleIncludedStatuses',
    'lifecyclePolicyEnabled',
    'migrationApplied',
    'mutated',
    'nextEvidenceAction',
    'noProvider',
    'rawWorkspaceIdExposed',
    'readPolicyConfigured',
    'recentHiddenByLifecycleCount',
    'recentLifecyclePolicyAppliedCount',
    'recentReadPolicyAppliedCount',
    'recentReadPolicyAuditCount',
    'recentStaleResultCount',
    'scopeWorkspacePresent',
    'softReadPolicyEnabled',
    'source',
    'status'
  ], 'dashboard read policy');
  assert.equal(typeof payload.readPolicy.lifecyclePolicyEnabled, 'boolean');
  assert.equal(typeof payload.readPolicy.softReadPolicyEnabled, 'boolean');
  assert.equal(payload.readPolicy.configEvidenceAvailable, true);
  assert.equal(typeof payload.readPolicy.auditEvidenceAvailable, 'boolean');
  assert.equal(typeof payload.readPolicy.readPolicyConfigured, 'boolean');
  assert.deepEqual(payload.readPolicy.lifecycleIncludedStatuses, ['active', 'stale']);
  assert.deepEqual(payload.readPolicy.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
  assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
  assert.equal(payload.readPolicy.noProvider, true);
  assert.equal(payload.readPolicy.mutated, false);
  assert.equal(payload.readPolicy.migrationApplied, false);
  assert.equal(typeof payload.readPolicy.auditedEntryCount, 'number');
  assert.equal(payload.readPolicy.auditTailLimit, 20);
  assert.match(payload.readPolicy.evidenceState, /config_/);
  assert.equal(typeof payload.readPolicy.nextEvidenceAction, 'string');
  assert.equal(JSON.stringify(payload).includes('workspace_id'), false);

  assert.equal(payload.smartStandingAuthorizationV3.mode, 'smart-standing-authorization-v3-receipt-parser');
  assert.equal(payload.smartStandingAuthorizationV3.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.provider, 0);
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.memory_writes, 0);
  assert.equal(payload.autopilotKernel.status, 'ok');
  assert.equal(payload.autopilotKernel.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotKernel.evidenceClass, 'read_only_local_filesystem_summary');
  assert.equal(payload.autopilotKernel.schema_count >= 14, true);
  assert.equal(payload.autopilotKernel.example_count >= 14, true);
  assert.equal(payload.autopilotKernel.validators.governance_kernel, true);
  assert.equal(payload.autopilotKernel.validators.goal_compiler, true);
  assert.equal(payload.autopilotKernel.validators.state_store_draft, true);
  assert.equal(payload.autopilotKernel.validators.action_adapter_contract, true);
  assert.equal(payload.autopilotKernel.validators.validation_planner, true);
  assert.equal(payload.autopilotKernel.validators.replay_harness, true);
  assert.equal(payload.autopilotKernel.validators.operator_console, true);
  assert.equal(payload.autopilotKernel.validators.controlled_green_entry, true);
  assert.equal(payload.autopilotKernel.validators.fixture_green_executor, true);
  assert.equal(payload.autopilotKernel.validators.green_file_write_boundary, true);
  assert.equal(payload.autopilotKernel.validators.green_file_write_executor_contract, true);
  assert.match(payload.autopilotKernel.latest_ledger_goal, /^CM-\d{4}$/);
  assert.equal(payload.autopilotKernel.latest_ledger_result, 'completed_validated');
  assert.match(payload.autopilotKernel.latest_validation_id, /^CMV-\d{4}$/);
  assert.equal(payload.autopilotKernel.readiness_claim_allowed, false);
  assert.equal(payload.autopilotLoop.status, 'ok');
  assert.equal(payload.autopilotLoop.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotLoop.evidenceClass, 'read_only_local_filesystem_summary');
  assert.equal(payload.autopilotLoop.readiness_claim_allowed, false);
  assert.equal(payload.autopilotLoop.dry_run_only, true);
  assert.equal(payload.autopilotLoop.writes_performed, false);
  assert.equal(payload.autopilotLoop.provider_calls_performed, false);
  assert.equal(payload.autopilotController.status, 'ok');
  assert.equal(payload.autopilotController.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotController.evidenceClass, 'read_only_local_filesystem_summary');
  assert.equal(payload.autopilotController.execution_boundary.mode, 'read_only_noop_executor');
  assert.equal(payload.autopilotController.execution_boundary.executes_tasks, false);
  assert.equal(payload.autopilotController.readiness_claim_allowed, false);
  assert.equal(payload.autopilotStateStore.status, 'ok');
  assert.equal(payload.autopilotStateStore.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotStateStore.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(payload.autopilotStateStore.append_only, true);
  assert.equal(payload.autopilotStateStore.no_migration, true);
  assert.equal(payload.autopilotStateStore.record_type_count, 15);
  assert.equal(payload.autopilotStateStore.required_record_type_count, 15);
  assert.equal(payload.autopilotStateStore.readiness_claim_allowed, false);
  assert.equal(payload.autopilotStateStore.mutated, false);
  assert.equal(payload.autopilotAdapters.status, 'ok');
  assert.equal(payload.autopilotAdapters.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotAdapters.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(payload.autopilotAdapters.adapter_count, 10);
  assert.equal(payload.autopilotAdapters.required_adapter_count, 10);
  assert.equal(payload.autopilotAdapters.fail_closed_fixture_count, 8);
  assert.equal(payload.autopilotAdapters.required_fail_closed_fixture_count, 8);
  assert.equal(payload.autopilotAdapters.executes_adapters, false);
  assert.equal(payload.autopilotAdapters.readiness_claim_allowed, false);
  assert.equal(payload.autopilotValidation.status, 'ok');
  assert.equal(payload.autopilotValidation.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotValidation.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(payload.autopilotValidation.validation_case_count, 7);
  assert.equal(payload.autopilotValidation.required_validation_case_count, 7);
  assert.equal(payload.autopilotValidation.repair_rule_count, 6);
  assert.equal(payload.autopilotValidation.required_repair_rule_count, 6);
  assert.equal(payload.autopilotValidation.executes_validation, false);
  assert.equal(payload.autopilotValidation.applies_repair, false);
  assert.equal(payload.autopilotValidation.readiness_claim_allowed, false);
  assert.equal(payload.autopilotReplay.status, 'ok');
  assert.equal(payload.autopilotReplay.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotReplay.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(payload.autopilotReplay.scenario_count, 9);
  assert.equal(payload.autopilotReplay.required_scenario_count, 8);
  assert.equal(payload.autopilotReplay.fail_closed_scenario_count, 5);
  assert.equal(payload.autopilotReplay.recovery_scenario_count, 1);
  assert.equal(payload.autopilotReplay.read_only, true);
  assert.equal(payload.autopilotReplay.replays_real_actions, false);
  assert.equal(payload.autopilotReplay.writes_state, false);
  assert.equal(payload.autopilotReplay.readiness_claim_allowed, false);
  assert.equal(payload.autopilotOperator.status, 'ok');
  assert.equal(payload.autopilotOperator.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotOperator.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(payload.autopilotOperator.surface_count, 8);
  assert.equal(payload.autopilotOperator.required_surface_count, 8);
  assert.equal(payload.autopilotOperator.eval_case_count, 10);
  assert.equal(payload.autopilotOperator.required_eval_case_count, 10);
  assert.equal(payload.autopilotOperator.rejection_eval_count, 9);
  assert.equal(payload.autopilotOperator.next_safe_action, 'review_controlled_green_executor_entry_packet_before_separate_skeleton_task');
  assert.equal(payload.autopilotOperator.read_only, true);
  assert.equal(payload.autopilotOperator.executes_eval, false);
  assert.equal(payload.autopilotOperator.writes_state, false);
  assert.equal(payload.autopilotOperator.readiness_claim_allowed, false);
  assert.equal(payload.autopilotGreenEntry.status, 'ok');
  assert.equal(payload.autopilotGreenEntry.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenEntry.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(payload.autopilotGreenEntry.entry_decision, 'GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED');
  assert.equal(payload.autopilotGreenEntry.met_admission_condition_count, 12);
  assert.equal(payload.autopilotGreenEntry.required_admission_condition_count, 12);
  assert.equal(payload.autopilotGreenEntry.allowed_scope_count, 7);
  assert.equal(payload.autopilotGreenEntry.required_allowed_scope_count, 7);
  assert.equal(payload.autopilotGreenEntry.fail_closed_stop_reason_count, 11);
  assert.equal(payload.autopilotGreenEntry.required_stop_reason_count, 11);
  assert.equal(payload.autopilotGreenEntry.read_only, true);
  assert.equal(payload.autopilotGreenEntry.executor_activated, false);
  assert.equal(payload.autopilotGreenEntry.executes_tasks, false);
  assert.equal(payload.autopilotGreenEntry.writes_runtime_state, false);
  assert.equal(payload.autopilotGreenEntry.readiness_claim_allowed, false);
  assert.equal(payload.autopilotGreenExecutor.status, 'ok');
  assert.equal(payload.autopilotGreenExecutor.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenExecutor.evidenceClass, 'fixture_only_read_only_noop_local_filesystem_summary');
  assert.equal(payload.autopilotGreenExecutor.skeleton_decision, 'GREEN_EXECUTOR_SKELETON_NOOP_READY');
  assert.equal(payload.autopilotGreenExecutor.allowed_task_kind_count, 6);
  assert.equal(payload.autopilotGreenExecutor.required_task_kind_count, 6);
  assert.equal(payload.autopilotGreenExecutor.allowed_adapter_kind_count, 4);
  assert.equal(payload.autopilotGreenExecutor.required_adapter_kind_count, 4);
  assert.equal(payload.autopilotGreenExecutor.executable_task_fixture_count, 2);
  assert.equal(payload.autopilotGreenExecutor.noop_execution_plan_count, 2);
  assert.equal(payload.autopilotGreenExecutor.fail_closed_fixture_count, 14);
  assert.equal(payload.autopilotGreenExecutor.required_fail_closed_fixture_count, 14);
  assert.equal(payload.autopilotGreenExecutor.fixture_backed, true);
  assert.equal(payload.autopilotGreenExecutor.noop_only, true);
  assert.equal(payload.autopilotGreenExecutor.executor_activated, false);
  assert.equal(payload.autopilotGreenExecutor.executes_tasks, false);
  assert.equal(payload.autopilotGreenExecutor.writes_files, false);
  assert.equal(payload.autopilotGreenExecutor.writes_runtime_state, false);
  assert.equal(payload.autopilotGreenExecutor.readiness_claim_allowed, false);
  assert.equal(payload.autopilotGreenFileBoundary.status, 'ok');
  assert.equal(payload.autopilotGreenFileBoundary.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenFileBoundary.evidenceClass, 'design_boundary_fixture_only_read_only_summary');
  assert.equal(payload.autopilotGreenFileBoundary.boundary_decision, 'GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED');
  assert.equal(payload.autopilotGreenFileBoundary.design_allowed, true);
  assert.equal(payload.autopilotGreenFileBoundary.implementation_allowed, false);
  assert.equal(payload.autopilotGreenFileBoundary.executor_activation_allowed, false);
  assert.equal(payload.autopilotGreenFileBoundary.read_only, true);
  assert.equal(payload.autopilotGreenFileBoundary.writes_files, false);
  assert.equal(payload.autopilotGreenFileBoundary.executes_tasks, false);
  assert.equal(payload.autopilotGreenFileBoundary.readiness_claim_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.status, 'ok');
  assert.equal(payload.autopilotGreenFileExecutorContract.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenFileExecutorContract.evidenceClass, 'design_contract_fixture_only_read_only_summary');
  assert.equal(payload.autopilotGreenFileExecutorContract.contract_decision, 'GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED');
  assert.equal(payload.autopilotGreenFileExecutorContract.implementation_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.executor_activation_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.real_writes_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.read_only, true);
  assert.equal(payload.autopilotGreenFileExecutorContract.writes_files, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.executes_tasks, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.readiness_claim_allowed, false);

  // Gate section
  assert.ok(payload.gate, 'should have gate section');
  assert.ok(payload.gate.compare);
  assert.ok(payload.gate.rollback);

  // Governance section
  assert.ok(payload.governance, 'should have governance section');
  assertKeySet(payload.governance, [
    'autoAuthorization',
    'boundedRecallCloseout',
    'boundedRecallPreparation',
    'counts',
    'hints',
    'message',
    'paths',
    'rawSummary',
    'readPolicy',
    'retention',
    'reviewLevel',
    'sourceStatus',
    'status',
    'statusDistribution',
    'wideningAdoption',
    'wideningReview'
  ], 'dashboard governance');
  assertKeySet(payload.governance.autoAuthorization, [
    'allowedGovernanceOutput',
    'approvalLinePreview',
    'artifactBundleDraft',
    'assertionRecordInputTrace',
    'assertionRecordPreview',
    'canAutoAuthorizeCm0595',
    'checklistFailures',
    'checklistPassed',
    'commandPreviewBundle',
    'currentBlockedOn',
    'decision',
    'exactCm0601LineReusable',
    'externalAssertionAccepted',
    'issuanceRecordPreview',
    'mutated',
    'nextStep',
    'operatorActionPlan',
    'operatorPacketDraft',
    'publicMcpExpanded',
    'readsRealMemory',
    'recordDrafts',
    'renderedArtifactTextSurface',
    'renderedOperatorBriefTextSurface',
    'renderedOperatorPacketTextSurface',
    'routingOutcomePreview',
    'source',
    'status',
    'wideningReviewPreview',
    'writesDurableState'
  ].sort(), 'dashboard governance auto-authorization');
  assertKeySet(payload.governance.counts, [
    'proposalCount',
    'stale30d',
    'stale90d',
    'supersededCount',
    'supersessionInitiated',
    'tombstonedCount',
    'totalRecords'
  ], 'dashboard governance counts');
  assert.equal(typeof payload.governance.status, 'string');
  assert.equal(typeof payload.governance.reviewLevel, 'string');
  assert.equal(typeof payload.governance.counts.proposalCount, 'number');
  assert.equal(typeof payload.governance.counts.stale30d, 'number');
  assert.equal(typeof payload.governance.counts.stale90d, 'number');
  assert.ok(Array.isArray(payload.governance.hints));
  assert.equal(payload.governance.readPolicy.rawWorkspaceIdExposed, false);
  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace, null);
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
  assert.equal(payload.governance.autoAuthorization.exactCm0601LineReusable, false);
  assert.equal(payload.governance.autoAuthorization.canAutoAuthorizeCm0595, false);
  assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
  assert.equal(payload.governance.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
  assert.equal(payload.governance.wideningReview.renderedReviewTextSurface.previewAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, false);
  assert.equal(payload.governance.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_operator_packet_blocked');
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, false);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, false);
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace, null);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace, null);
  assert.equal(payload.governance.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
  assert.equal(payload.governance.boundedRecallPreparation.renderedBoundedRecallTextSurface.previewAvailable, true);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalPrepared, false);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_review_command_bundle_blocked');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft.draftKind, 'bounded_recall_approval_issuance_record_draft_blocked');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft.draftKind, 'bounded_recall_execution_evidence_draft_blocked');
  assert.equal(payload.governance.boundedRecallPreparation.cm0595IssuanceRecordInputTrace, null);
  assert.equal(payload.governance.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace, null);
  assert.equal(payload.governance.boundedRecallCloseout.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(payload.governance.boundedRecallCloseout.renderedCloseoutTextSurface.previewAvailable, true);
  assert.equal(payload.governance.boundedRecallCloseout.boundedRecallCloseoutReady, false);
  assert.equal(payload.governance.boundedRecallCloseout.closeoutRecordDraft.draftUsableNow, false);
  assert.equal(
    payload.governance.boundedRecallCloseout.boundedRecallPreparationCommandPreviewBundle.bundleKind,
    'bounded_recall_preparation_command_bundle_blocked'
  );
  assert.equal(
    payload.governance.boundedRecallCloseout.boundedRecallPreparationOperatorPacketDraft.draftUsableNow,
    false
  );
  assert.equal(
    payload.governance.boundedRecallCloseout.renderedBoundedRecallPreparationPacketTextSurface.previewAvailable,
    true
  );
  assert.equal(payload.governance.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace, null);
  assert.equal(payload.governance.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace, null);

  // Checks and recommendations
  assert.ok(Array.isArray(payload.checks));
  assert.ok(payload.checks.some(check => check.code === 'authorized-write-path-auto-auth'));
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-auto-auth'
        && check.message.includes('bundle=assertion_record_only')
        && check.message.includes('cmd=assertion_record_command_bundle')
        && check.message.includes('packet=assertion_record_operator_packet')
        && check.message.includes('input=default_fixture_only')
        && check.message.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md')
    ),
    'auto-auth check should include current bundle and next artifact'
  );
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-review'
        && check.message.includes('WIDENING_REVIEW_NOT_READY')
    ),
    'widening-review check should expose current blocked state'
  );
  assert.ok(Array.isArray(payload.recommendations));
  assert.ok(payload.recommendations.some(line => line.includes('Authorized write-path auto-authorization remains fail-closed')));
  assert.ok(
    payload.recommendations.some(
      line => line.includes('bundle=assertion_record_only')
        && line.includes('cmd=assertion_record_command_bundle')
        && line.includes('packet=assertion_record_operator_packet')
        && line.includes('input=default_fixture_only')
        && line.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md')
    ),
    'auto-auth recommendation should include current bundle and next artifact'
  );
});

test('dashboard CLI should support --json --summary-only', async (t) => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-summary-'));
  const logsDir = path.join(tempBasePath, 'logs');
  t.after(() => fs.rm(tempBasePath, { recursive: true, force: true }));
  await fs.mkdir(logsDir, { recursive: true });

  const result = await runDashboard({
    args: ['--json', '--summary-only'],
    env: { CODEX_MEMORY_LOGS_DIR: logsDir }
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.mode, 'memory-dashboard');
  assertKeySet(payload.governance, ['autoAuthorization', 'boundedRecallCloseout', 'boundedRecallPreparation', 'counts', 'reviewLevel', 'status', 'wideningAdoption', 'wideningReview'], 'dashboard summary-only governance');
  assertKeySet(payload.autopilotKernel, [
    'blocked_red_count',
    'decision',
    'evidenceClass',
    'example_count',
    'latest_ledger_goal',
    'latest_ledger_result',
    'latest_validation_id',
    'readiness_claim_allowed',
    'schema_count',
    'status',
    'stop_reason',
    'validation_status',
    'validators'
  ], 'dashboard summary-only autopilot kernel');
  assert.equal(payload.autopilotKernel.status, 'ok');
  assert.equal(payload.autopilotKernel.schema_count >= 14, true);
  assert.equal(payload.autopilotKernel.example_count >= 14, true);
  assert.equal(payload.autopilotKernel.blocked_red_count >= 1, true);
  assert.match(payload.autopilotKernel.latest_validation_id, /^CMV-\d{4}$/);
  assert.equal(payload.autopilotKernel.validation_status, 'completed_validated');
  assert.equal(payload.autopilotKernel.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotLoop, [
    'blocked_red_count',
    'decision',
    'evidenceClass',
    'latest_goal',
    'latest_task',
    'next_safe_task',
    'readiness_claim_allowed',
    'receipt_coverage',
    'repair_once_remaining',
    'status',
    'stop_reason',
    'validation_coverage'
  ], 'dashboard summary-only autopilot loop');
  assert.equal(payload.autopilotLoop.status, 'ok');
  assert.equal(payload.autopilotLoop.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotLoop.readiness_claim_allowed, false);
  assert.equal(typeof payload.autopilotLoop.latest_task, 'string');
  assert.equal(typeof payload.autopilotLoop.next_safe_task, 'string');
  assert.equal(typeof payload.autopilotLoop.receipt_coverage.covered_tasks, 'number');
  assert.equal(typeof payload.autopilotLoop.validation_coverage.covered_tasks, 'number');
  assert.deepEqual(payload.autopilotLoop.receipt_coverage.missing_tasks, []);
  assert.deepEqual(payload.autopilotLoop.validation_coverage.missing_tasks, []);
  assert.equal(payload.summary.status, 'warn');
  assert.equal(payload.operationalSummary.status, 'ok');
  assert.equal(payload.operationalSummary.serviceStatus, 'ok');
  assert.equal(payload.operationalSummary.storeStatus, 'ok');
  assert.equal(payload.operationalSummary.profileStatus, 'ok');
  assert.equal(payload.operationalSummary.runtimeStatus, 'ok');
  assert.equal(payload.operationalSummary.gateStatus, 'ok');
  assert.equal(payload.operationalSummary.readinessClaimAllowed, false);
  assert.match(payload.operationalSummary.message, /governance readiness remains separate/);
  assert.equal(payload.readinessSummary.status, 'blocked');
  assert.equal(payload.readinessSummary.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.readinessSummary.operationalStatus, 'ok');
  assert.equal(payload.readinessSummary.governanceDecision, 'RC_NOT_READY_BLOCKED');
  assert.equal(payload.readinessSummary.readPolicyStatus, 'config_only_no_recent_audit');
  assert.equal(payload.readinessSummary.readPolicyEvidenceState, 'config_only_missing_recent_audit');
  assert.equal(payload.readinessSummary.readPolicyNextEvidenceAction, 'collect_recent_read_policy_audit_evidence_before_readiness_claim');
  assert.equal(payload.readinessSummary.autopilotDecision, 'NOT_READY_BLOCKED');
  assert.equal(payload.readinessSummary.readinessClaimAllowed, false);
  assert.ok(payload.readinessSummary.blockerCount >= 1);
  assert.ok(payload.readinessSummary.blockerSources.includes('governance'));
  assert.ok(payload.readinessSummary.blockerCodes.includes('authorized-write-path-auto-auth'));
  assert.equal(payload.readinessSummary.nextAction, 'resolve_read_policy_and_governance_fail_closed_evidence_before_readiness_claim');
  assert.equal(payload.readinessSummary.governanceNextAction.code, 'authorized-write-path-auto-auth');
  assert.equal(payload.readinessSummary.governanceNextAction.blocker, 'external_token_assertion_not_accepted');
  assert.equal(payload.readinessSummary.governanceNextAction.stage, 'await_cm0611_assertion_record');
  assert.equal(payload.readinessSummary.governanceNextAction.nextStepRef, 'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md');
  assert.equal(payload.readinessSummary.governanceNextAction.readinessClaimAllowed, false);
  assert.equal(payload.checks.some(check =>
    check.code === 'autopilot-closed-loop-summary'
    && /coverage incomplete/.test(check.message)
  ), false, 'summary-only should not warn about autopilot loop coverage when receipt and validation coverage have no missing tasks');
  assert.equal(payload.recommendations.some(text =>
    /Autopilot closed-loop coverage is incomplete/.test(text)
  ), false, 'summary-only should not recommend reconciling complete autopilot loop coverage');
  assertKeySet(payload.autopilotController, [
    'checkpoint_requirement',
    'controller_cycle_id',
    'current_state',
    'decision',
    'evidenceClass',
    'execution_boundary',
    'goal_id',
    'lane_decision',
    'next_safe_task',
    'readiness_claim_allowed',
    'receipt_requirement',
    'red_gate_status',
    'repair_once_available',
    'status',
    'stop_reason',
    'validation_plan'
  ], 'dashboard summary-only autopilot controller');
  assert.equal(payload.autopilotController.status, 'ok');
  assert.equal(payload.autopilotController.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotController.execution_boundary.mode, 'read_only_noop_executor');
  assert.equal(payload.autopilotController.execution_boundary.executes_tasks, false);
  assert.equal(payload.autopilotController.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotStateStore, [
    'append_only',
    'decision',
    'evidenceClass',
    'missing_record_types',
    'model_id',
    'no_migration',
    'readiness_claim_allowed',
    'record_count',
    'record_type_count',
    'required_record_type_count',
    'status',
    'stop_reason'
  ], 'dashboard summary-only autopilot state store');
  assert.equal(payload.autopilotStateStore.status, 'ok');
  assert.equal(payload.autopilotStateStore.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotStateStore.append_only, true);
  assert.equal(payload.autopilotStateStore.no_migration, true);
  assert.equal(payload.autopilotStateStore.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotAdapters, [
    'adapter_count',
    'complete_adapter_count',
    'contract_id',
    'decision',
    'evidenceClass',
    'executes_adapters',
    'fail_closed_fixture_count',
    'missing_adapters',
    'missing_fail_closed_fixtures',
    'readiness_claim_allowed',
    'required_adapter_count',
    'required_fail_closed_fixture_count',
    'status',
    'stop_reason'
  ], 'dashboard summary-only autopilot adapters');
  assert.equal(payload.autopilotAdapters.status, 'ok');
  assert.equal(payload.autopilotAdapters.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotAdapters.adapter_count, 10);
  assert.equal(payload.autopilotAdapters.fail_closed_fixture_count, 8);
  assert.equal(payload.autopilotAdapters.executes_adapters, false);
  assert.equal(payload.autopilotAdapters.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotValidation, [
    'applies_repair',
    'blocked_case_count',
    'decision',
    'evidenceClass',
    'executes_validation',
    'missing_repair_rules',
    'missing_validation_cases',
    'planner_id',
    'readiness_claim_allowed',
    'repair_attempt_limit',
    'repair_rule_count',
    'required_repair_rule_count',
    'required_validation_case_count',
    'status',
    'stop_reason',
    'validation_case_count'
  ], 'dashboard summary-only autopilot validation');
  assert.equal(payload.autopilotValidation.status, 'ok');
  assert.equal(payload.autopilotValidation.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotValidation.validation_case_count, 7);
  assert.equal(payload.autopilotValidation.repair_rule_count, 6);
  assert.equal(payload.autopilotValidation.executes_validation, false);
  assert.equal(payload.autopilotValidation.applies_repair, false);
  assert.equal(payload.autopilotValidation.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotReplay, [
    'decision',
    'dirty_worktree_protection_supported',
    'evidenceClass',
    'fail_closed_scenario_count',
    'harness_id',
    'missing_fail_closed_reasons',
    'missing_scenarios',
    'read_only',
    'readiness_claim_allowed',
    'receipt_reconciliation_supported',
    'recovery_scenario_count',
    'replays_real_actions',
    'required_fail_closed_reason_count',
    'required_scenario_count',
    'resume_token_supported',
    'scenario_count',
    'status',
    'stop_reason',
    'writes_state'
  ], 'dashboard summary-only autopilot replay');
  assert.equal(payload.autopilotReplay.status, 'ok');
  assert.equal(payload.autopilotReplay.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotReplay.scenario_count, 9);
  assert.equal(payload.autopilotReplay.required_scenario_count, 8);
  assert.equal(payload.autopilotReplay.fail_closed_scenario_count, 5);
  assert.equal(payload.autopilotReplay.read_only, true);
  assert.equal(payload.autopilotReplay.replays_real_actions, false);
  assert.equal(payload.autopilotReplay.writes_state, false);
  assert.equal(payload.autopilotReplay.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotOperator, [
    'approval_packet_template_ready',
    'console_id',
    'controlled_green_executor_entry_conditions_count',
    'coverage_gap_count',
    'decision',
    'eval_case_count',
    'evidenceClass',
    'executes_eval',
    'missing_eval_cases',
    'missing_surfaces',
    'next_safe_action',
    'read_only',
    'readiness_claim_allowed',
    'red_gate_inbox_count',
    'rejection_eval_count',
    'required_eval_case_count',
    'required_surface_count',
    'status',
    'stop_reason',
    'surface_count',
    'writes_state'
  ], 'dashboard summary-only autopilot operator');
  assert.equal(payload.autopilotOperator.status, 'ok');
  assert.equal(payload.autopilotOperator.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotOperator.surface_count, 8);
  assert.equal(payload.autopilotOperator.eval_case_count, 10);
  assert.equal(payload.autopilotOperator.rejection_eval_count, 9);
  assert.equal(payload.autopilotOperator.approval_packet_template_ready, true);
  assert.equal(payload.autopilotOperator.executes_eval, false);
  assert.equal(payload.autopilotOperator.writes_state, false);
  assert.equal(payload.autopilotOperator.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotGreenEntry, [
    'admission_condition_count',
    'allowed_scope_count',
    'decision',
    'entry_decision',
    'evidenceClass',
    'executes_tasks',
    'executor_activated',
    'fail_closed_stop_reason_count',
    'met_admission_condition_count',
    'missing_admission_conditions',
    'missing_allowed_scope',
    'missing_stop_reasons',
    'next_safe_action',
    'packet_id',
    'read_only',
    'readiness_claim_allowed',
    'required_admission_condition_count',
    'required_allowed_scope_count',
    'required_stop_reason_count',
    'status',
    'stop_reason',
    'writes_runtime_state'
  ], 'dashboard summary-only autopilot green entry');
  assert.equal(payload.autopilotGreenEntry.status, 'ok');
  assert.equal(payload.autopilotGreenEntry.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenEntry.entry_decision, 'GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED');
  assert.equal(payload.autopilotGreenEntry.met_admission_condition_count, 12);
  assert.equal(payload.autopilotGreenEntry.allowed_scope_count, 7);
  assert.equal(payload.autopilotGreenEntry.fail_closed_stop_reason_count, 11);
  assert.equal(payload.autopilotGreenEntry.executor_activated, false);
  assert.equal(payload.autopilotGreenEntry.executes_tasks, false);
  assert.equal(payload.autopilotGreenEntry.writes_runtime_state, false);
  assert.equal(payload.autopilotGreenEntry.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotGreenExecutor, [
    'allowed_adapter_kind_count',
    'allowed_task_kind_count',
    'decision',
    'evidenceClass',
    'executable_task_fixture_count',
    'executes_tasks',
    'executor_activated',
    'executor_id',
    'fail_closed_coverage_count',
    'fail_closed_fixture_count',
    'fixture_backed',
    'missing_adapter_kinds',
    'missing_fail_closed_cases',
    'missing_task_kinds',
    'next_safe_action',
    'noop_execution_plan_count',
    'noop_only',
    'readiness_claim_allowed',
    'required_adapter_kind_count',
    'required_fail_closed_fixture_count',
    'required_task_kind_count',
    'skeleton_decision',
    'status',
    'stop_reason',
    'writes_files',
    'writes_runtime_state'
  ], 'dashboard summary-only autopilot green executor');
  assert.equal(payload.autopilotGreenExecutor.status, 'ok');
  assert.equal(payload.autopilotGreenExecutor.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenExecutor.skeleton_decision, 'GREEN_EXECUTOR_SKELETON_NOOP_READY');
  assert.equal(payload.autopilotGreenExecutor.noop_execution_plan_count, 2);
  assert.equal(payload.autopilotGreenExecutor.fail_closed_fixture_count, 14);
  assert.equal(payload.autopilotGreenExecutor.fixture_backed, true);
  assert.equal(payload.autopilotGreenExecutor.noop_only, true);
  assert.equal(payload.autopilotGreenExecutor.executor_activated, false);
  assert.equal(payload.autopilotGreenExecutor.executes_tasks, false);
  assert.equal(payload.autopilotGreenExecutor.writes_files, false);
  assert.equal(payload.autopilotGreenExecutor.writes_runtime_state, false);
  assert.equal(payload.autopilotGreenExecutor.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotGreenFileBoundary, [
    'allowed_path_class_count',
    'boundary_decision',
    'boundary_id',
    'decision',
    'design_allowed',
    'evidenceClass',
    'executes_tasks',
    'executor_activation_allowed',
    'forbidden_path_class_count',
    'hard_stop_count',
    'implementation_allowed',
    'missing_allowed_path_classes',
    'missing_design_gates',
    'missing_hard_stops',
    'next_safe_action',
    'read_only',
    'readiness_claim_allowed',
    'required_design_gate_count',
    'status',
    'stop_reason',
    'writes_files'
  ], 'dashboard summary-only autopilot green file boundary');
  assert.equal(payload.autopilotGreenFileBoundary.status, 'ok');
  assert.equal(payload.autopilotGreenFileBoundary.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenFileBoundary.boundary_decision, 'GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED');
  assert.equal(payload.autopilotGreenFileBoundary.design_allowed, true);
  assert.equal(payload.autopilotGreenFileBoundary.implementation_allowed, false);
  assert.equal(payload.autopilotGreenFileBoundary.executor_activation_allowed, false);
  assert.equal(payload.autopilotGreenFileBoundary.read_only, true);
  assert.equal(payload.autopilotGreenFileBoundary.writes_files, false);
  assert.equal(payload.autopilotGreenFileBoundary.executes_tasks, false);
  assert.equal(payload.autopilotGreenFileBoundary.readiness_claim_allowed, false);
  assertKeySet(payload.autopilotGreenFileExecutorContract, [
    'allowed_write_operation_count',
    'contract_decision',
    'contract_id',
    'decision',
    'evidenceClass',
    'executes_tasks',
    'execution_cycle_count',
    'executor_activation_allowed',
    'fail_closed_case_count',
    'implementation_allowed',
    'missing_execution_cycle',
    'missing_fail_closed_cases',
    'missing_post_write_gates',
    'missing_preflight_gates',
    'missing_task_fields',
    'missing_write_operations',
    'next_safe_action',
    'post_write_gate_count',
    'preflight_gate_count',
    'read_only',
    'readiness_claim_allowed',
    'real_writes_allowed',
    'required_task_field_count',
    'status',
    'stop_reason',
    'writes_files'
  ], 'dashboard summary-only autopilot green file executor contract');
  assert.equal(payload.autopilotGreenFileExecutorContract.status, 'ok');
  assert.equal(payload.autopilotGreenFileExecutorContract.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.autopilotGreenFileExecutorContract.contract_decision, 'GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED');
  assert.equal(payload.autopilotGreenFileExecutorContract.implementation_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.executor_activation_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.real_writes_allowed, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.read_only, true);
  assert.equal(payload.autopilotGreenFileExecutorContract.writes_files, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.executes_tasks, false);
  assert.equal(payload.autopilotGreenFileExecutorContract.readiness_claim_allowed, false);
  assertKeySet(payload.smartStandingAuthorizationV3, [
    'budget_used',
    'decision',
    'evidenceClass',
    'latest_parser_status',
    'latest_receipt_status',
    'latest_v3_task_id',
    'latest_validation_id',
    'latest_validation_result',
    'next_auto_step_allowed',
    'red_stop_count',
    'source_surface',
    'status',
    'stop_reason'
  ], 'dashboard summary-only v3 receipt summary');
  assert.equal(payload.smartStandingAuthorizationV3.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.smartStandingAuthorizationV3.evidenceClass, 'read_only_local_markdown_parse');
  assert.equal(payload.smartStandingAuthorizationV3.latest_parser_status, 'parser_ok');
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.provider, 0);
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.api, 0);
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.mcp_tool, 0);
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.memory_writes, 0);
  assert.equal(payload.smartStandingAuthorizationV3.red_stop_count, 0);
  // Summary-only should have compact store/profile
  assert.equal(typeof payload.store.records, 'number');
  assert.ok(payload.store.records >= 0, 'records should be non-negative');
  assert.ok(['ok', 'warn'].includes(payload.store.status), 'store status should be ok or warn');
  if (payload.store.records === 0) {
    assert.equal(payload.store.status, 'warn', 'empty clean runner store should warn');
  }
  assert.ok(!payload.store.ageBreakdown, 'summary-only should omit age breakdown');
  assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
  assert.ok(payload.governance, 'summary-only should keep governance compact section');
  assert.equal(typeof payload.governance.counts.proposalCount, 'number');
  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace, null);
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorBriefTextSurface.briefKind, 'assertion_record_only__assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
  assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
  assert.equal(payload.governance.boundedRecallCloseout.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(payload.governance.hints, undefined);
});

test('dashboard readiness nextAction narrows to governance after read-policy evidence is present', async (t) => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-read-policy-ok-'));
  const logsDir = path.join(tempBasePath, 'logs');
  const recallLogPath = path.join(logsDir, 'codex-memory-recall.jsonl');
  t.after(() => fs.rm(tempBasePath, { recursive: true, force: true }));
  await fs.mkdir(logsDir, { recursive: true });
  await fs.writeFile(recallLogPath, `${JSON.stringify({
    timestamp: new Date().toISOString(),
    recallType: 'read-policy',
    readPolicyApplied: true,
    lifecyclePolicyApplied: true,
    hiddenByLifecycleCount: 1,
    staleResultCount: 0,
    lifecycleColumnAvailable: false,
    scopeWorkspacePresent: false,
    resultCount: 0
  })}\n`, 'utf8');

  const result = await runDashboard({
    args: ['--json', '--summary-only'],
    env: { CODEX_MEMORY_LOGS_DIR: logsDir }
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.readinessSummary.status, 'blocked');
  assert.equal(payload.readinessSummary.readPolicyStatus, 'ok');
  assert.equal(payload.readinessSummary.readPolicyEvidenceState, 'config_and_recent_audit');
  assert.equal(payload.readinessSummary.readPolicyNextEvidenceAction, 'none');
  assert.equal(payload.readinessSummary.recallScopeStatus, payload.audits.recall.scopeStatus);
  assert.equal(payload.readinessSummary.recallScopeEvidenceState, payload.audits.recall.scopeEvidenceState);
  assert.equal(payload.readinessSummary.recallScopeNextAction, payload.audits.recall.scopeNextAction);
  assert.equal(payload.readinessSummary.recallScopeReadinessClaimAllowed, false);
  assert.equal(payload.readinessSummary.blockerSources.includes('read-policy'), false);
  assert.ok(payload.readinessSummary.blockerSources.includes('governance'));
  assert.equal(payload.readinessSummary.nextAction, 'resolve_governance_fail_closed_evidence_before_readiness_claim');
  assert.equal(payload.readinessSummary.governanceNextAction.code, 'authorized-write-path-auto-auth');
  assert.equal(payload.readinessSummary.governanceNextAction.stage, 'await_cm0611_assertion_record');
  assert.equal(payload.readinessSummary.governanceNextAction.nextStepRef, 'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md');
  assert.equal(payload.readinessSummary.governanceNextAction.readinessClaimAllowed, false);
  assert.equal(payload.readinessSummary.readinessClaimAllowed, false);
});

test('dashboard CLI should include v3 receipt summary from explicit validation log', async () => {
  const result = await runDashboard({
    args: ['--json', '--v3-receipts-validation-log', REPO_V3_RECEIPT_VALIDATION_LOG_PATH]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(
    payload.smartStandingAuthorizationV3.source_surface,
    'tests/fixtures/smart-standing-authorization-v3-validation-log-sample.md'
  );
  assert.equal(payload.smartStandingAuthorizationV3.latest_v3_task_id, 'CM-0677');
  assert.equal(payload.smartStandingAuthorizationV3.latest_validation_id, 'CMV-0801');
  assert.equal(payload.smartStandingAuthorizationV3.latest_receipt_status, 'receipt_rollup_only');
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.provider, 0);
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.mcp_tool, 0);
  assert.equal(payload.smartStandingAuthorizationV3.budget_used.memory_writes, 0);
  assert.ok(
    payload.checks.some(check => check.code === 'v3-receipt-summary'
      && check.message.includes('CM-0677 / CMV-0801')),
    'dashboard checks should include v3 receipt summary'
  );
});

test('dashboard CLI should emit text output by default', async () => {
  const result = await runDashboard({
    args: ['--v3-receipts-validation-log', REPO_V3_RECEIPT_VALIDATION_LOG_PATH]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('Memory Dashboard'), 'should include title');
  assert.ok(text.includes('Service'), 'should include Service section');
  assert.ok(text.includes('Store'), 'should include Store section');
  assert.ok(text.includes('Profile'), 'should include Profile section');
  assert.ok(text.includes('Runtime'), 'should include Runtime section');
  assert.ok(text.includes('ReadPolicy'), 'should include ReadPolicy section');
  assert.ok(text.includes('RecallScope'), 'should include recall scope section');
  assert.ok(text.includes('Governance'), 'should include Governance section');
  assert.ok(text.includes('auto-auth'), 'should include governance auto-auth summary');
  assert.ok(text.includes('GovBundle'), 'should include governance bundle line');
  assert.ok(text.includes('GovCmd'), 'should include governance command line');
  assert.ok(text.includes('GovPacket'), 'should include governance packet line');
  assert.ok(text.includes('GovDraft'), 'should include governance draft line');
  assert.ok(text.includes('GovPktTxt'), 'should include governance rendered packet text line');
  assert.ok(text.includes('GovBrief'), 'should include governance rendered brief line');
  assert.ok(text.includes('GovInput'), 'should include governance input line');
  assert.ok(text.includes('GovWiden'), 'should include governance widening review line');
  assert.ok(text.includes('GovWNext'), 'should include governance widening review next step line');
  assert.ok(text.includes('GovWText'), 'should include governance widening review text line');
  assert.ok(text.includes('GovRClose'), 'should include governance bounded recall closeout line');
  assert.ok(text.includes('GovRCNext'), 'should include governance bounded recall closeout next step line');
  assert.ok(text.includes('GovRCText'), 'should include governance bounded recall closeout text line');
  assert.ok(text.includes('V3Receipt'), 'should include v3 receipt line');
  assert.ok(text.includes('Autopilot'), 'should include autopilot kernel line');
  assert.ok(text.includes('AutoLoop'), 'should include autopilot loop line');
  assert.ok(text.includes('AutoCtrl'), 'should include autopilot controller line');
  assert.ok(text.includes('GovNext'), 'should include structured next governance action line');
  assert.ok(text.includes('stage=await_cm0611_assertion_record'), 'should include current next governance stage');
  assert.ok(text.includes('CM-0677 / CMV-0801'), 'should include parsed v3 receipt identity');
  assert.ok(text.includes('bundle=assertion_record_only'), 'should include current bundle kind');
  assert.ok(text.includes('draft=cm0611AssertionRecord'), 'should include current rendered draft id');
  assert.ok(text.includes('cmd=assertion_record_command_bundle'), 'should include current command bundle kind');
  assert.ok(text.includes('packet=assertion_record_operator_packet'), 'should include current packet kind');
  assert.ok(text.includes('input=default_fixture_only'), 'should include default governance input summary');
  assert.ok(text.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md'), 'should include next artifact ref');
  assert.ok(text.includes('Checks'), 'should include Checks section');
  assert.ok(text.includes('Recommendations'), 'should include Recommendations');
  assert.equal(text.includes('workspace_id'), false);
});

test('dashboard CLI should render current operator packet text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-operator-packet-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-operator-packet-text]'), 'should include rendered packet section');
  assert.match(text, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(text, /## Command Preview/);
  assert.match(text, /Current stage: await_cm0611_assertion_record/);
});

test('dashboard CLI should render current operator artifact text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-operator-artifact-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-operator-artifact-text]'), 'should include rendered artifact section');
  assert.match(text, /^Status: DRAFT_ASSERTION_NOT_RECORDED/m);
  assert.match(text, /## Assertion Summary/);
  assert.match(text, /## Command Preview/);
  assert.match(text, /assertionClass: <fill>/);
});

test('dashboard CLI should render current operator brief text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-operator-brief-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-operator-brief-text]'), 'should include rendered brief section');
  assert.match(text, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(text, /## Current Operator Packet/);
  assert.match(text, /## Selected Artifact Draft/);
});

test('dashboard CLI should render widening review text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-widening-review-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-widening-review-text]'), 'should include rendered widening review section');
  assert.match(text, /^Status: DRAFT_REVIEW_NOT_READY/m);
  assert.match(text, /## CM-0604 gate review/);
  assert.match(text, /## Review Checklist/);
});

test('dashboard CLI should render bounded recall text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-bounded-recall-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-bounded-recall-text]'), 'should include rendered bounded recall section');
  assert.match(text, /^Status: DRAFT_BOUNDED_RECALL_APPROVAL_NOT_READY/m);
  assert.match(text, /## Preparation snapshot/);
  assert.match(text, /## Bounded Recall Checklist/);
});

test('dashboard CLI should render bounded recall closeout text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-bounded-recall-closeout-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-bounded-recall-closeout-text]'), 'should include rendered bounded recall closeout section');
  assert.match(text, /^Status: DRAFT_BOUNDED_RECALL_CLOSEOUT_NOT_READY/m);
  assert.match(text, /## Closeout snapshot/);
  assert.match(text, /## Closeout Checklist/);
});

test('dashboard CLI should tolerate clean CI runner warnings', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-ci-'));
  const missingDataDir = path.join(tempBasePath, 'missing-data');
  const result = await runDashboard({
    args: ['--json'],
    env: {
      CODEX_MEMORY_HTTP_PORT: '1',
      CODEX_MEMORY_DATA_DIR: missingDataDir,
      CODEX_MEMORY_DB_PATH: path.join(missingDataDir, 'codex-memory.sqlite'),
      CODEX_MEMORY_LOGS_DIR: path.join(tempBasePath, 'logs')
    }
  });

  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.summary.status, 'warn');
  assert.equal(payload.service.status, 'warn');
  assert.equal(payload.store.status, 'warn');
  assert.match(payload.store.message, /Database not found/);
  assert.equal(typeof payload.governance.status, 'string');
  assert.equal(typeof payload.governance.reviewLevel, 'string');
  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace, null);
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorBriefTextSurface.briefKind, 'assertion_record_only__assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
  assert.notEqual(payload.gate.status, 'error', formatFailure(result));
  assert.equal(typeof payload.audits.recall.scopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.scopeEvidenceState, 'string');
  assert.equal(payload.audits.recall.scopeReadinessClaimAllowed, false);
  assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
});

test('dashboard CLI should pass explicit assertion-record input through governance surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--summary-only',
      '--auto-auth-assertion-record',
      REPO_ASSERTION_RECORD_PATH,
      '--auto-auth-latest-rebound-outcome-class',
      'token_present'
    ]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceFormat, 'json_assertion_record_v1');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.usedLatestReboundOutcomeOverride, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.latestReboundOutcomeOverride, 'token_present');
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'cm0604_widening_review_ready');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0616WideningReview.draftUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0616WideningReview');
  assert.match(
    payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
    /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
  assert.match(
    payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
    /dashboard command: `node \.\\src\\cli\\dashboard\.js --json --summary-only --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present`/
  );
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'widening_review_operator_packet');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'widening_review_ready_bundle');
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'widening_review_review_command_bundle');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'widening_review_operator_packet');
  assert.equal(payload.governance.autoAuthorization.exactCm0601LineReusable, false);
  assert.equal(payload.governance.autoAuthorization.externalAssertionAccepted, true);
  assert.equal(payload.governance.autoAuthorization.canAutoAuthorizeCm0595, false);
  assert.equal(payload.governance.autoAuthorization.source, 'cm0622_explicit_input_fixture_plus_assertion_record_v1');
  assert.equal(payload.governance.wideningReview.source, 'cm0662_explicit_input_fixture_plus_auto_authorization_escalation_bridge_v1');
  assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
  assert.equal(payload.governance.wideningReview.status, 'passed_adoption_not_granted');
  assert.equal(payload.governance.wideningReview.cm0604Satisfied, true);
  assert.equal(payload.governance.wideningReview.cm0606BridgeActivated, false);
  assert.equal(payload.governance.wideningReview.proceedToCm0607AdoptionRecord, false);
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.sourceFormat, 'cm0662_auto_authorization_escalation_bridge_v1');
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
  assert.equal(payload.governance.wideningReview.reviewChecklist.W4.passed, true);
  assert.equal(payload.governance.wideningReview.reviewChecklist.W6.passed, true);
  assert.equal(payload.governance.wideningReview.reviewChecklist.W10.passed, false);
  assert.ok(payload.governance.wideningReview.failClosedReasons.includes('bounded_durable_write_crossing_not_granted'));
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-auto-auth' && check.message.includes('ESCALATE_FOR_FUTURE_WIDENING_REVIEW')
    ),
    'should expose escalated governance state in checks'
  );
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-review'
        && check.message.includes('WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED')
    ),
    'should expose bridged widening-review state in checks'
  );
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
  assert.equal(
    payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPath,
    '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
  );
  assert.match(
    payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present`/
  );
});

test('dashboard CLI should pass explicit widening-review fixture through governance surfaces', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-widening-'));
  const wideningFixturePath = path.join(tempBasePath, 'authorized-write-path-widening-review-pass.json');

  try {
    const fixture = JSON.parse(await fs.readFile(REPO_WIDENING_REVIEW_FIXTURE_PATH, 'utf8'));
    Object.assign(fixture, {
      routingOutcomeRecordAvailable: true,
      routingOutcomeDecision: 'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
      routingOutcomeRecordId: 'docs/CM-0615_CM0605_ROUTING_OUTCOME_RECORD_TEMPLATE.md',
      sameBaselineEndpointStartupEvidenceAvailable: true,
      endpointStartupEvidenceId: 'docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md',
      sameBaselineTokenPresentEvidenceAvailable: true,
      tokenPresentEvidenceSameBaseline: true,
      latestTokenPresentEvidenceId: 'docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md',
      noProviderConfigStartupPersistenceDriftSinceEvidence: true,
      packetFamilyDriftDetected: false,
      noBroadScanJsonlReadOrAdditionalWriteNeeded: true,
      currentWritePathStillNotValidated: true,
      narrowestNextProofStillOneSanitizedWriteValidation: true,
      governanceMayCrossIntoOneBoundedDurableWriteProof: true
    });
    await fs.writeFile(wideningFixturePath, JSON.stringify(fixture), 'utf8');

    const result = await runDashboard({
      args: ['--json', '--widening-review-fixture', wideningFixturePath]
    });
    assert.equal(result.code, 0, formatFailure(result));
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
    assert.equal(payload.governance.wideningReview.cm0604Satisfied, true);
    assert.equal(payload.governance.wideningReview.cm0606BridgeActivated, true);
    assert.ok(
      payload.checks.some(
        check => check.code === 'authorized-write-path-widening-review'
          && check.message.includes('WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607')
      )
    );
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('dashboard CLI should pass explicit widening-review routing-outcome record through governance surfaces', async () => {
  const result = await runDashboard({
    args: ['--json', '--widening-review-routing-outcome-record', REPO_ROUTING_OUTCOME_RECORD_PATH]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);
  assert.equal(payload.governance.wideningReview.source, 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1');
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.sourceFileName, 'cm0605-routing-outcome-record-v1.md');
  assert.equal(payload.governance.wideningReview.reviewChecklist.W4.passed, true);
  assert.equal(payload.governance.wideningReview.reviewChecklist.W6.passed, false);
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-review'
        && check.message.includes('WIDENING_REVIEW_NOT_READY')
    )
  );
});

test('dashboard CLI should pass explicit widening-review outcome record through widening-adoption surfaces', async () => {
  const result = await runDashboard({
    args: ['--json', '--widening-adoption-review-record', REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);
  assert.equal(payload.governance.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
  assert.equal(payload.governance.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A4.passed, true);
  assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A6.passed, false);
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-adoption'
        && check.message.includes('WIDENING_ADOPTION_NOT_READY')
    )
  );
});

test('dashboard CLI should pass explicit widening-adoption record through governance surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--widening-adoption-review-record',
      REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
      '--widening-adoption-record',
      REPO_WIDENING_ADOPTION_RECORD_PATH
    ]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);
  assert.equal(payload.governance.wideningAdoption.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
  assert.equal(payload.governance.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.wideningAdoptionRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A10.passed, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, true);
  assert.equal(payload.governance.wideningAdoption.cm0595CommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_pair');
  assert.equal(payload.governance.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_auto_authorization_operator_packet');
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, true);
  assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /授权执行 CM-0595/);
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-adoption'
        && check.message.includes('WIDENING_ADOPTION_GRANTED_CM0595_ONLY')
        && check.message.includes('cm0595=ready')
    )
  );
});

test('dashboard CLI should pass explicit CM-0649 issuance record through widening-adoption surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--summary-only',
      '--widening-adoption-review-record',
      REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
      '--widening-adoption-record',
      REPO_WIDENING_ADOPTION_RECORD_PATH,
      '--cm0595-issuance-record',
      REPO_CM0595_ISSUANCE_RECORD_PATH
    ]
  });

  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName, 'cm0649-cm0595-approval-issuance-record-v1.md');
  assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /issued CM-0595 record path: `\.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1\.md`/);
});

test('dashboard CLI should pass explicit CM-0650 execution evidence record through widening-adoption surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--summary-only',
      '--widening-adoption-review-record',
      REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
      '--widening-adoption-record',
      REPO_WIDENING_ADOPTION_RECORD_PATH,
      '--cm0595-issuance-record',
      REPO_CM0595_ISSUANCE_RECORD_PATH,
      '--cm0595-execution-evidence-record',
      REPO_CM0595_EXECUTION_EVIDENCE_RECORD_PATH
    ]
  });

  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName, 'cm0650-cm0595-execution-evidence-record-v1.md');
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.durableMemoryWriteCount, 1);
  assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /CM-0595 execution evidence path: `\.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1\.md`/);
  assert.equal(payload.governance.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalPrepared, true);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_exact_approval_review_command_bundle');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallCommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_triple');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft.draftUsableNow, true);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft.draftUsableNow, true);
  assert.equal(payload.governance.boundedRecallPreparation.cm0595IssuanceRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
  assert.match(payload.governance.boundedRecallPreparation.renderedBoundedRecallTextSurface.markdown, /## Next Record Drafts/);
});
