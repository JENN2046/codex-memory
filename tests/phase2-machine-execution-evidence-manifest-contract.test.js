'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json');
const windowsReceipt = require('../docs/near-model-memory-plan-pack/windows_wsl_machine_smoke_receipt.json');
const {
  canonicalCallHash,
  evaluatePhase2MachineExecutionEvidenceManifestContract
} = require('../src/core/Phase2MachineExecutionEvidenceManifestContract');
const {
  PHASE_REQUIREMENTS, OBJECTIVE_INVARIANTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function allEvidence() {
  const evidence = {};
  for (const group of [...PHASE_REQUIREMENTS, ...OBJECTIVE_INVARIANTS]) {
    for (const field of group.requiredEvidence) evidence[field] = true;
  }
  return evidence;
}

test('CM2079 accepts current clean frozen runtime-matched Phase 2 replay', () => {
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(manifest, windowsReceipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase2MachineExecutionEvidenceManifestPassed, true);
  assert.equal(result.completionEligible, true);
  assert.equal(result.replayRequired, false);
  assert.equal(result.callReceiptHashesVerified, 3);
  assert.equal(result.windowsSmokeVerified, true);
  assert.equal(result.primaryMemoryStoreWritten, false);
});

test('CM2077 derives Phase 2 completion eligibility only from clean matching heads', () => {
  const cleanManifest = clone(manifest);
  const cleanWindows = clone(windowsReceipt);
  cleanManifest.worktreeClean = true;
  cleanManifest.loadedRuntimeHead = cleanManifest.sourceCommit;
  cleanManifest.runtimeHeadMatchesSourceCommit = true;
  cleanManifest.phase2CompletionDerivation.eligible = true;
  cleanManifest.phase2CompletionDerivation.phase2AcceptedFromThisManifest = true;
  cleanWindows.worktreeClean = true;
  cleanWindows.loadedRuntimeHead = cleanWindows.sourceCommit;
  cleanWindows.runtimeHeadMatchesSourceCommit = true;
  cleanWindows.completionEligible = true;
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(cleanManifest, cleanWindows);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase2MachineExecutionEvidenceManifestPassed, true);
  assert.equal(result.replayRequired, false);
});

test('CM2079 completion audit accepts current machine Phase 2 evidence without completing the full plan', () => {
  const evidence = allEvidence();
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(manifest, windowsReceipt);
  evidence.phase2MachineExecutionEvidenceManifestPassed = result.phase2MachineExecutionEvidenceManifestPassed;
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  assert.equal(audit.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'), false);
  assert.equal(audit.blockers.includes('missing_phase2_readonly_realtime_native_memory_phase2MachineExecutionEvidenceManifestPassed'), false);
});

test('CM2077 rejects receipt summary hash drift', () => {
  const input = clone(manifest);
  input.calls[0].accepted = false;
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(input, windowsReceipt);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('manifest.calls[0].receiptSummarySha256_mismatch'));
});

test('CM2077 canonical hashes cover all safe receipt summary fields', () => {
  for (const call of manifest.calls) assert.equal(canonicalCallHash(call), call.receiptSummarySha256);
});

test('CM2077 rejects raw fields without echo', () => {
  const input = clone(manifest);
  input.calls[0].responseBody = 'DO_NOT_ECHO';
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(input, windowsReceipt);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_or_locator_fields');
  assert.deepEqual(result.forbiddenFields, ['calls[0].responseBody']);
  assert.equal(JSON.stringify(result).includes('DO_NOT_ECHO'), false);
});

test('CM2077 rejects Windows smoke output capture', () => {
  const receipt = clone(windowsReceipt);
  receipt.rawOutputCaptured = true;
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(manifest, receipt);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('windowsReceipt.rawOutputCaptured'));
});

test('CM2077 preserves derived-index versus primary-write distinction', () => {
  const input = clone(manifest);
  input.calls[1].primaryMemoryStoreWritePerformed = true;
  input.calls[1].receiptSummarySha256 = canonicalCallHash(input.calls[1]);
  const result = evaluatePhase2MachineExecutionEvidenceManifestContract(input, windowsReceipt);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('manifest.calls[1].primaryMemoryStoreWritePerformed'));
});
