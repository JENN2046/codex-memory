'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const application = require('../src/core/Cm2121FullPlanStatusSyncApplication');
const generator = require('../scripts/generate-cm2121-full-plan-status-sync-application');
const { resolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { STATUS_SYNC_PATHS } = require('../src/core/Cm2118FullPlanApplicationExecution');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const { validateCurrentFactsDrift } = require('../scripts/validate_current_facts_drift');
const { validateAutopilotLedgerConsistency } = require('../scripts/validate_autopilot_ledger_consistency');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function prepared() {
  const options = resolverOptions();
  const artifact = application.buildApplication(options);
  return { options, artifact };
}

test('exact nine-path status-sync application is prepared but non-executing', () => {
  const { options, artifact } = prepared();
  const evaluation = application.evaluateApplication(artifact, options);
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(artifact.payload.patchPlan.targets.length, 9);
  assert.deepEqual(artifact.payload.patchPlan.exactPaths, STATUS_SYNC_PATHS);
  assert.equal(evaluation.statusSyncAuthorized, false);
  assert.equal(evaluation.statusSyncPerformed, false);
  assert.equal(evaluation.currentBranchStatusSynchronized, false);
  assert.equal(evaluation.readinessClaimed, false);
});

test('projected status surfaces pass current-facts and ledger validators in isolation', () => {
  const { options } = prepared();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2121-status-projection-'));
  try {
    for (const sourcePath of STATUS_SYNC_PATHS) {
      const before = options.resolveGitFile(application.BASELINE_COMMIT, sourcePath);
      const after = application.projectStatusFile(sourcePath, before.content);
      const target = path.join(root, sourcePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, after);
    }
    for (const sourcePath of ['README.md', 'DOCS_GOVERNANCE.md']) {
      const target = path.join(root, sourcePath);
      fs.writeFileSync(target, options.resolveGitFile(application.BASELINE_COMMIT, sourcePath).content);
    }
    const drift = validateCurrentFactsDrift(root);
    assert.equal(drift.ok, true, drift.failures.join('\n'));
    const ledger = validateAutopilotLedgerConsistency(root);
    assert.equal(ledger.ok, true, ledger.failures.join('\n'));
    assert.equal(ledger.latestTask, application.TASK_ID);
    assert.equal(ledger.latestLedgerValidationId, application.VALIDATION_ID);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CURRENT_FACTS projection preserves historical CM-2121 evidence without re-closing current status sync', () => {
  const { options } = prepared();
  const before = options.resolveGitFile(application.BASELINE_COMMIT, application.CURRENT_FACTS_PATH);
  const projected = JSON.parse(application.projectStatusFile(application.CURRENT_FACTS_PATH, before.content));
  assert.equal(projected.evidenceBaseline.cm2121StatusSyncPerformed, true);
  assert.equal(projected.planPackCompletion.fullPlanStatusSyncPerformed, false);
  assert.equal(projected.planPackCompletion.fullPlanPackCompleted, false);
  assert.equal(projected.status.scope, 'near_model_memory_plan_pack_reopened_needs_revalidation_no_readiness_claim');
  assert.equal(
    projected.validationSummary.find(item => item.id === application.VALIDATION_ID).status,
    'COMPLETED_STATUS_REOPENED_FULL_PLAN_NEEDS_REVALIDATION_READINESS_FALSE'
  );
});

test('active Markdown projection describes revalidation while historical projection stays frozen', () => {
  const { options } = prepared();
  for (const sourcePath of STATUS_SYNC_PATHS.filter(item => item !== application.CURRENT_FACTS_PATH)) {
    const before = options.resolveGitFile(application.BASELINE_COMMIT, sourcePath);
    const active = application.projectStatusFile(sourcePath, before.content).toString('utf8');
    if (active.includes('<!-- CURRENT-FACTS-ACTIVE-START -->')) {
      const block = active.split('<!-- CURRENT-FACTS-ACTIVE-START -->')[1]
        .split('<!-- CURRENT-FACTS-ACTIVE-END -->')[0];
      assert.doesNotMatch(block, /fullPlanPackCompleted=true/);
      assert.match(block, /pending revalidation/);
    }
    if (sourcePath === 'STATUS.md') {
      assert.match(active, /durable claim reached `CONSUMED_SUCCESS`/);
      assert.match(active, /historical executor is inactive and non-replayable/);
      assert.doesNotMatch(active, /no claim or application occurred/);
      assert.doesNotMatch(active, /execution remains unclaimed/);
    }
  }
  const frozen = options.resolveGitFile('096eaf0c42f8e76180177eef7d16bf6edd605858', application.APPLICATION_PATH);
  const historical = application.evaluateHistoricalFrozenApplication(JSON.parse(frozen.content), options);
  assert.equal(historical.accepted, true, historical.blockers.join(','));
  assert.equal(application.evaluateApplication(JSON.parse(frozen.content), options).accepted, false);
});

test('active application generation no longer reproduces the historical frozen patch hash', () => {
  const { artifact } = prepared();
  assert.notEqual(
    artifact.payload.patchPlan.patchPayloadSha256,
    '2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92'
  );
});

test('review identity, target, readiness, authority, and side-effect drift fail closed', () => {
  const { options, artifact } = prepared();
  for (const mutate of [
    value => { value.payload.baseline.receiptReviewDecision.json.sha256 = '0'.repeat(64); },
    value => { value.payload.patchPlan.targets[0].after.sha256 = '0'.repeat(64); },
    value => { value.payload.patchPlan.exactPaths.pop(); },
    value => { value.payload.currentAuthority.statusSyncAuthorized = true; },
    value => { value.payload.currentAuthority.branchRefUpdateAuthorized = true; },
    value => { value.payload.currentState.statusSyncPerformed = true; },
    value => { value.payload.nonClaims.productionReady = true; },
    value => { value.payload.currentSideEffects.nativeWrites = 1; }
  ]) {
    const changed = clone(artifact);
    mutate(changed);
    changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
    assert.equal(application.evaluateApplication(changed, options).accepted, false);
  }
});

test('projection refuses paths outside the exact status allowlist', () => {
  assert.throws(() => application.projectStatusFile('README.md', Buffer.from('x')), /not_allowed/);
});

test('application generator accepts no output or execution arguments', () => {
  assert.deepEqual(generator.parseArgs([]), {});
  assert.throws(() => generator.parseArgs(['--execute']), /no_arguments/);
  assert.throws(() => generator.parseArgs(['--output', '/tmp/x']), /no_arguments/);
});

test('application generator rejects unsafe Git context before repository reads or writes', () => {
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = '/tmp/cm2121-forbidden-git-dir';
  try {
    assert.throws(() => generator.main([]), /cm2122_unsafe_git_environment:GIT_DIR/);
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});
