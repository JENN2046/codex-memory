const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_DENIED_ACTIONS,
  summarizeMemorySupersedeCurrentRealityRebaseline
} = require('../src/core/MemorySupersedeCurrentRealityRebaseline');
const {
  REQUIRED_PRESERVED_BLOCKERS,
  STALE_BLOCKERS,
  normalizeMemorySupersedeRuntimePrepRebaseReviewInput,
  summarizeMemorySupersedeRuntimePrepRebaseReview
} = require('../src/core/MemorySupersedeRuntimePrepRebaseReview');

function buildRebaselineSummary(overrides = {}) {
  return summarizeMemorySupersedeCurrentRealityRebaseline({
    schemaVersion: 'memory-supersede-current-reality-rebaseline-v1',
    version: 'v1',
    sourceMode: 'explicit_input',
    observedHead: 'e613dce',
    implementedSurfaces: {
      twoRecordShadowSeam: true,
      internalSupersedeMutationService: true,
      supersedeTempLocalEvidence: true
    },
    remainingSurfaces: {
      appServiceWiring: false,
      internalCliEntry: false,
      internalRuntimeEntry: false,
      sharedGateAdoption: false,
      liveGovernanceProof: false
    },
    priorBlockers: [
      'two_record_shadow_seam_not_implemented',
      'internal_supersede_service_not_implemented'
    ],
    publicTools: [
      'record_memory',
      'search_memory',
      'memory_overview'
    ],
    deniedActions: REQUIRED_DENIED_ACTIONS,
    evidenceRefs: [
      '5923880 feat: add supersede shadow seam',
      '5872f80 feat: add supersede mutation service',
      'bae33d2 test: add supersede temp-local evidence',
      'e613dce test: add supersede reality rebaseline'
    ],
    ...overrides
  });
}

function buildInput(overrides = {}) {
  return {
    schemaVersion: 'memory-supersede-runtime-prep-rebase-review-v1',
    version: 'v1',
    sourceMode: 'explicit_input',
    candidateName: 'MemorySupersedeRuntimePrepHelper',
    candidateDecision: 'BOUNDED_INTERNAL_RUNTIME_PREP_READY_NOT_APPROVED',
    candidateBlockers: [
      'appServiceWiring_not_committed_or_not_proven',
      'internalRuntimeEntry_not_committed_or_not_proven',
      'liveGovernanceProof_not_committed_or_not_proven'
    ],
    rebaselineSummary: buildRebaselineSummary(),
    publicTools: [
      'record_memory',
      'search_memory',
      'memory_overview'
    ],
    deniedActions: REQUIRED_DENIED_ACTIONS,
    candidateRefs: [
      'src/core/MemorySupersedeRuntimePrepHelper.js',
      'tests/memory-supersede-runtime-prep-helper.test.js'
    ],
    plannedNextActions: [
      'remove stale blocker wording before any supersede runtime-prep commit',
      'keep public MCP frozen',
      'keep live governance proof blocked'
    ],
    ...overrides
  };
}

test('CM-0965 accepts a supersede runtime-prep candidate rebase review without claiming readiness', () => {
  const summary = summarizeMemorySupersedeRuntimePrepRebaseReview(buildInput());

  assert.equal(summary.acceptedForRuntimePrepRebase, true);
  assert.equal(summary.decision, 'SUPERSEDE_RUNTIME_PREP_REBASE_REVIEW_ACCEPTED_NOT_READY');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.rebaselineAccepted, true);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.publicMcpTools.frozen, true);
  assert.deepEqual(summary.staleBlockers.stillPresent, []);
  assert.equal(summary.staleBlockers.removed, true);
  assert.deepEqual(summary.preservedRemainingBlockers.missing, []);
  assert.deepEqual(summary.preservedRemainingBlockers.required, REQUIRED_PRESERVED_BLOCKERS);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(summary.safety.stagesOrCommits, false);
  assert.equal(summary.safety.pushes, false);
});

test('CM-0965 fails closed when stale supersede blockers remain in the candidate', () => {
  const summary = summarizeMemorySupersedeRuntimePrepRebaseReview(buildInput({
    candidateBlockers: [
      'two_record_shadow_seam_not_implemented',
      'internal_supersede_service_not_implemented',
      'appServiceWiring_not_committed_or_not_proven'
    ]
  }));

  assert.equal(summary.acceptedForRuntimePrepRebase, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(summary.staleBlockers.stillPresent, [
    'internal_supersede_service_not_implemented',
    'two_record_shadow_seam_not_implemented'
  ]);
  assert.deepEqual(summary.staleBlockers.expectedRemoved, STALE_BLOCKERS);
});

test('CM-0965 fails closed when current-reality rebaseline is not accepted', () => {
  const summary = summarizeMemorySupersedeRuntimePrepRebaseReview(buildInput({
    rebaselineSummary: buildRebaselineSummary({
      implementedSurfaces: {
        twoRecordShadowSeam: true,
        internalSupersedeMutationService: false,
        supersedeTempLocalEvidence: true
      }
    })
  }));

  assert.equal(summary.acceptedForRuntimePrepRebase, false);
  assert.equal(summary.rebaselineAccepted, false);
});

test('CM-0965 fails closed on public MCP drift', () => {
  const summary = summarizeMemorySupersedeRuntimePrepRebaseReview(buildInput({
    publicTools: [
      'record_memory',
      'search_memory',
      'memory_overview',
      'memory_supersede'
    ]
  }));

  assert.equal(summary.acceptedForRuntimePrepRebase, false);
  assert.equal(summary.publicMcpTools.frozen, false);
  assert.equal(summary.publicMcpExpanded, false);
});

test('CM-0965 redacts sensitive explicit input', () => {
  const normalized = normalizeMemorySupersedeRuntimePrepRebaseReviewInput(buildInput({
    candidateName: 'authorization: Bearer SUPERSEDE_RUNTIME_TOKEN_1234567890',
    candidateRefs: [
      'api_key=SUPERSEDE_RUNTIME_API_KEY_1234567890',
      'C:\\secret\\.env'
    ]
  }));
  const summary = summarizeMemorySupersedeRuntimePrepRebaseReview(normalized);
  const text = JSON.stringify({ normalized, summary }).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'supersede_runtime_token_1234567890',
    'supersede_runtime_api_key_1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(text.includes(forbidden), false);
  }
});
