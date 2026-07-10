'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const artifact = require('../docs/near-model-memory-plan-pack/phase9_machine_observation_artifact.json');
const phase2Manifest = require('../docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json');
const phase2Path = require.resolve('../docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json');
const {
  hash,
  evaluatePhase9MachineObservationArtifactContract
} = require('../src/core/Phase9MachineObservationArtifactContract');
const {
  PHASE_REQUIREMENTS, OBJECTIVE_INVARIANTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

const phase2Raw = fs.readFileSync(phase2Path, 'utf8');
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function allEvidence() {
  const evidence = {};
  for (const group of [...PHASE_REQUIREMENTS, ...OBJECTIVE_INVARIANTS]) {
    for (const field of group.requiredEvidence) evidence[field] = true;
  }
  return evidence;
}

test('CM2079 accepts current clean frozen runtime-matched Phase 9 replay', () => {
  const result = evaluatePhase9MachineObservationArtifactContract(artifact, phase2Manifest, phase2Raw);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase9MachineObservationArtifactPassed, true);
  assert.equal(result.replayRequired, false);
  assert.equal(result.toolsListHashVerified, true);
  assert.equal(result.gateSummaryHashVerified, true);
  assert.equal(result.phase2ManifestHashVerified, true);
  assert.equal(result.validationExecutionRecordsPassed, true);
});

test('CM2078 requires matching clean heads, eligible Phase 2, and command records', () => {
  const candidate = clone(artifact);
  const p2 = clone(phase2Manifest);
  candidate.worktreeClean = true;
  candidate.loadedRuntimeHead = candidate.sourceCommit;
  candidate.runtimeHeadMatchesSourceCommit = true;
  for (const name of ['testAll', 'gateCi']) {
    candidate.validationExecutionRecords[name] = {
      commandCategory: name === 'testAll' ? 'npm_test_all' : 'npm_gate_ci_json',
      executedAt: '2026-07-11T00:00:00Z', exitStatusCategory: 'zero',
      passed: true, recordRef: `CMV-TEST-${name}`
    };
  }
  p2.worktreeClean = true;
  p2.loadedRuntimeHead = p2.sourceCommit;
  p2.runtimeHeadMatchesSourceCommit = true;
  p2.phase2CompletionDerivation.eligible = true;
  p2.phase2CompletionDerivation.phase2AcceptedFromThisManifest = true;
  const raw = `${JSON.stringify(p2, null, 2)}\n`;
  candidate.boundedDogfoodWorkflow.phase2ManifestSha256 = hash(raw);
  candidate.observationCompletionDerivation.eligible = true;
  candidate.observationCompletionDerivation.phase9ObservationAcceptedFromThisArtifact = true;
  const result = evaluatePhase9MachineObservationArtifactContract(candidate, p2, raw);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase9MachineObservationArtifactPassed, true);
  assert.equal(result.replayRequired, false);
});

test('CM2079 completion audit accepts current machine Phase 9 evidence without completing the full plan', () => {
  const result = evaluatePhase9MachineObservationArtifactContract(artifact, phase2Manifest, phase2Raw);
  const evidence = allEvidence();
  evidence.phase9MachineObservationArtifactPassed = result.phase9MachineObservationArtifactPassed;
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  assert.equal(audit.incompletePhaseIds.includes('phase9_default_runtime_policy'), false);
  assert.equal(audit.blockers.includes('missing_phase9_default_runtime_policy_phase9MachineObservationArtifactPassed'), false);
});

test('CM2078 rejects tools/list hash drift', () => {
  const input = clone(artifact);
  input.actualToolsList.tools.push('record_memory');
  const result = evaluatePhase9MachineObservationArtifactContract(input, phase2Manifest, phase2Raw);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('artifact.actualToolsList.tools'));
});

test('CM2078 rejects gate summary hash drift', () => {
  const input = clone(artifact);
  input.defaultRuntimePolicyGateSummary.accepted = false;
  const result = evaluatePhase9MachineObservationArtifactContract(input, phase2Manifest, phase2Raw);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('artifact.defaultRuntimePolicyGateSummary.sha256'));
});

test('CM2078 rejects Phase 2 manifest file drift', () => {
  const result = evaluatePhase9MachineObservationArtifactContract(artifact, phase2Manifest, `${phase2Raw}\n`);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('artifact.boundedDogfoodWorkflow.phase2ManifestSha256'));
});

test('CM2078 does not accept asserted command booleans without execution records', () => {
  const input = clone(artifact);
  input.validationExecutionRecords.testAll.executedAt = null;
  input.validationExecutionRecords.testAll.recordRef = null;
  input.validationExecutionRecords.gateCi.executedAt = null;
  input.validationExecutionRecords.gateCi.recordRef = null;
  const result = evaluatePhase9MachineObservationArtifactContract(input, phase2Manifest, phase2Raw);
  assert.equal(result.accepted, false);
  assert.equal(result.phase9MachineObservationArtifactPassed, false);
});

test('CM2078 rejects raw or readiness evidence', () => {
  const input = clone(artifact);
  input.rawOutputCaptured = true;
  input.readinessClaimed = true;
  const result = evaluatePhase9MachineObservationArtifactContract(input, phase2Manifest, phase2Raw);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('artifact.rawOutputCaptured'));
  assert.ok(result.blockers.includes('artifact.readinessClaimed'));
});
