'use strict';

const crypto = require('node:crypto');

const CONTRACT_NAME = 'Phase9MachineObservationArtifactContract';
const CONTRACT_MODE = 'machine_generated_replayable_phase9_observation_artifact';
const EXPECTED_TOOLS = Object.freeze([
  'audit_memory', 'memory_overview', 'prepare_memory_context',
  'propose_memory_delta', 'search_memory'
]);

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function hashJson(value) {
  return hash(JSON.stringify(value));
}
function failure(reasonCode, extras = {}) {
  return {
    accepted: false, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode, blockers: [], phase9MachineObservationArtifactPassed: false,
    completionEligible: false, replayRequired: true,
    defaultRuntimeExpanded: false, memoryWritten: false,
    externalReviewPassed: false, readinessClaimed: false, ...extras
  };
}

function evaluatePhase9MachineObservationArtifactContract(artifact, phase2Manifest, phase2ManifestRaw) {
  if (!artifact || typeof artifact !== 'object' || !phase2Manifest || typeof phase2Manifest !== 'object' || typeof phase2ManifestRaw !== 'string') {
    return failure('invalid_input');
  }
  const blockers = [];
  if (artifact.schemaVersion !== 1 || artifact.taskId !== 'CM-2078') blockers.push('artifact.identity');
  if (!/^[0-9a-f]{40}$/.test(String(artifact.sourceCommit || ''))) blockers.push('artifact.sourceCommit');
  if (!/^[0-9a-f]{40}$/.test(String(artifact.loadedRuntimeHead || ''))) blockers.push('artifact.loadedRuntimeHead');
  const list = artifact.actualToolsList || {};
  if (!Array.isArray(list.tools) || list.tools.length !== EXPECTED_TOOLS.length || list.tools.some((tool, index) => tool !== EXPECTED_TOOLS[index])) blockers.push('artifact.actualToolsList.tools');
  if (list.sha256 !== hashJson(EXPECTED_TOOLS)) blockers.push('artifact.actualToolsList.sha256');
  const gate = artifact.defaultRuntimePolicyGateSummary || {};
  const gateCopy = { ...gate };
  delete gateCopy.sha256;
  if (gate.sha256 !== hashJson(gateCopy)) blockers.push('artifact.defaultRuntimePolicyGateSummary.sha256');
  for (const field of ['accepted', 'observationComplete', 'equivalentDogfoodReviewAccepted']) {
    if (gate[field] !== true) blockers.push(`artifact.defaultRuntimePolicyGateSummary.${field}`);
  }
  for (const field of ['commitMemoryDeltaPublicRegistered', 'externalReviewAccepted', 'defaultExpansionAllowed', 'productionWriteDefaultAllowed', 'durableMutationPerformed', 'providerApiCalled', 'readinessClaimed']) {
    if (gate[field] !== false) blockers.push(`artifact.defaultRuntimePolicyGateSummary.${field}`);
  }
  const workflow = artifact.boundedDogfoodWorkflow || {};
  if (workflow.phase2ManifestRef !== 'docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json') blockers.push('artifact.boundedDogfoodWorkflow.phase2ManifestRef');
  if (workflow.phase2ManifestSha256 !== hash(phase2ManifestRaw)) blockers.push('artifact.boundedDogfoodWorkflow.phase2ManifestSha256');
  if (!Array.isArray(workflow.safeCallRefs) || workflow.safeCallRefs.length !== 3) blockers.push('artifact.boundedDogfoodWorkflow.safeCallRefs');
  if (workflow.actualRuntimeCallsObserved !== true || workflow.lowDisclosureOnly !== true) blockers.push('artifact.boundedDogfoodWorkflow.runtimeEvidence');
  for (const field of ['memoryWrites', 'primaryMemoryStoreWrites', 'defaultRuntimeExpansions']) {
    if (workflow[field] !== 0) blockers.push(`artifact.boundedDogfoodWorkflow.${field}`);
  }
  const records = artifact.validationExecutionRecords || {};
  const validationPassed = ['testAll', 'gateCi'].every(name => {
    const record = records[name] || {};
    return record.passed === true && record.exitStatusCategory === 'zero' &&
      typeof record.executedAt === 'string' && record.executedAt.length > 0 &&
      typeof record.recordRef === 'string' && record.recordRef.length > 0;
  });
  const phase2Eligible = phase2Manifest.phase2CompletionDerivation &&
    phase2Manifest.phase2CompletionDerivation.eligible === true &&
    phase2Manifest.phase2CompletionDerivation.phase2AcceptedFromThisManifest === true;
  const expectedEligible = artifact.worktreeClean === true &&
    artifact.runtimeHeadMatchesSourceCommit === true &&
    artifact.loadedRuntimeHead === artifact.sourceCommit &&
    phase2Eligible && validationPassed;
  const derivation = artifact.observationCompletionDerivation || {};
  if (derivation.eligible !== expectedEligible) blockers.push('artifact.observationCompletionDerivation.eligible');
  if (derivation.phase9ObservationAcceptedFromThisArtifact !== expectedEligible) blockers.push('artifact.observationCompletionDerivation.phase9ObservationAcceptedFromThisArtifact');
  for (const field of ['rawOutputCaptured', 'privateMemoryCaptured', 'readinessClaimed']) {
    if (artifact[field] !== false) blockers.push(`artifact.${field}`);
  }
  if (blockers.length) return failure('artifact_blocked', { blockers });
  return {
    accepted: true, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode: expectedEligible ? 'phase9_machine_observation_completion_eligible' : 'phase9_machine_observation_replay_required',
    blockers: expectedEligible ? [] : [
      'worktree_runtime_phase2_or_validation_replay_not_frozen'
    ],
    phase9MachineObservationArtifactPassed: expectedEligible,
    completionEligible: expectedEligible,
    replayRequired: !expectedEligible,
    toolsListHashVerified: true,
    gateSummaryHashVerified: true,
    phase2ManifestHashVerified: true,
    validationExecutionRecordsPassed: validationPassed,
    defaultRuntimeExpanded: false, memoryWritten: false,
    externalReviewPassed: false, readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE, CONTRACT_NAME, EXPECTED_TOOLS, hash, hashJson,
  evaluatePhase9MachineObservationArtifactContract
};
