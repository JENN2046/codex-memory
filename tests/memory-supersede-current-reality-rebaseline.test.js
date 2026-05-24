const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  IMPLEMENTED_SURFACES,
  normalizeMemorySupersedeCurrentRealityRebaselineInput,
  summarizeMemorySupersedeCurrentRealityRebaseline
} = require('../src/core/MemorySupersedeCurrentRealityRebaseline');

function buildInput(overrides = {}) {
  return {
    schemaVersion: 'memory-supersede-current-reality-rebaseline-v1',
    version: 'v1',
    sourceMode: 'explicit_input',
    observedHead: 'ccfbabc',
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
      'internal_supersede_service_not_implemented',
      'supersede_runtime_prep_not_implemented',
      'public_mcp_governance_expansion_not_approved'
    ],
    publicTools: [
      'record_memory',
      'search_memory',
      'memory_overview'
    ],
    deniedActions: [
      'public_mcp_expansion',
      'true_record_memory',
      'true_search_memory',
      'provider_call',
      'raw_memory_read',
      'durable_real_memory_write',
      'durable_real_audit_write',
      'config_watchdog_startup_change',
      'push',
      'readiness_claim',
      'reliability_claim'
    ],
    evidenceRefs: [
      '5923880 feat: add supersede shadow seam',
      '5872f80 feat: add supersede mutation service',
      'bae33d2 test: add supersede temp-local evidence'
    ],
    ...overrides
  };
}

test('CM-0964 accepts current supersede reality without claiming readiness', () => {
  const summary = summarizeMemorySupersedeCurrentRealityRebaseline(buildInput());

  assert.equal(summary.acceptedForRebaseline, true);
  assert.equal(summary.decision, 'SUPERSEDE_CURRENT_REALITY_REBASELINE_ACCEPTED_NOT_READY');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.implementedSurfaces.allRequiredPresent, true);
  assert.deepEqual(summary.implementedSurfaces.missing, []);
  assert.deepEqual(summary.stalePriorBlockers, [
    'two_record_shadow_seam_not_implemented',
    'internal_supersede_service_not_implemented'
  ]);
  assert.deepEqual(summary.remainingBlockers, [
    'appServiceWiring_not_committed_or_not_proven',
    'internalCliEntry_not_committed_or_not_proven',
    'internalRuntimeEntry_not_committed_or_not_proven',
    'sharedGateAdoption_not_committed_or_not_proven',
    'liveGovernanceProof_not_committed_or_not_proven'
  ]);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
});

test('CM-0964 locks the implemented supersede surface list', () => {
  assert.deepEqual(IMPLEMENTED_SURFACES, [
    'twoRecordShadowSeam',
    'internalSupersedeMutationService',
    'supersedeTempLocalEvidence'
  ]);
});

test('CM-0964 fails closed when an implemented surface is missing', () => {
  const summary = summarizeMemorySupersedeCurrentRealityRebaseline(buildInput({
    implementedSurfaces: {
      twoRecordShadowSeam: true,
      internalSupersedeMutationService: false,
      supersedeTempLocalEvidence: true
    }
  }));

  assert.equal(summary.acceptedForRebaseline, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(summary.implementedSurfaces.missing, [
    'internalSupersedeMutationService'
  ]);
});

test('CM-0964 fails closed on public MCP drift', () => {
  const summary = summarizeMemorySupersedeCurrentRealityRebaseline(buildInput({
    publicTools: [
      'record_memory',
      'search_memory',
      'memory_overview',
      'memory_supersede'
    ]
  }));

  assert.equal(summary.acceptedForRebaseline, false);
  assert.equal(summary.publicMcpTools.frozen, false);
  assert.equal(summary.publicMcpExpanded, false);
});

test('CM-0964 redacts sensitive explicit input', () => {
  const normalized = normalizeMemorySupersedeCurrentRealityRebaselineInput(buildInput({
    observedHead: 'authorization: Bearer SUPERSEDE_REALITY_TOKEN_1234567890',
    evidenceRefs: [
      'api_key=SUPERSEDE_REALITY_API_KEY_1234567890',
      'C:\\secret\\.env'
    ]
  }));
  const summary = summarizeMemorySupersedeCurrentRealityRebaseline(normalized);
  const text = JSON.stringify({ normalized, summary }).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'supersede_reality_token_1234567890',
    'supersede_reality_api_key_1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(text.includes(forbidden), false);
  }
});
