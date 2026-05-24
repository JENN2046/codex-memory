const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  summarizeDeferredGovernanceClosureEvidenceBoundary
} = require('../src/core/DeferredGovernanceClosureEvidenceBoundaryPolicy');

function evidenceUnit(overrides = {}) {
  return {
    id: 'CM-0992-app-runtime-evidence',
    kind: 'app_runtime_entry',
    evidenceRef: 'CM-0927',
    validationRef: 'CMV-1045',
    committed: true,
    validationPassed: true,
    internalOnly: true,
    defaultDisabled: true,
    publicMcpFrozen: true,
    runtimeApplied: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    ...overrides
  };
}

function basePacket(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    dirtyBaselineBlocksClosure: true,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    governedFamilies: GOVERNANCE_FAMILIES,
    deniedActions: DENIED_ACTIONS,
    publicMcpExpanded: false,
    callToolWidened: false,
    runtimeReady: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    evidenceUnits: [
      evidenceUnit({ id: 'CM-0927-app-runtime-entry' }),
      evidenceUnit({
        id: 'CM-0931-app-apply-plan-preview',
        kind: 'app_apply_plan_preview_entry',
        evidenceRef: 'CM-0931',
        validationRef: 'CMV-1049'
      })
    ],
    ...overrides
  };
}

test('CM-0992 accepts committed internal-only app runtime evidence without readiness', () => {
  const report = summarizeDeferredGovernanceClosureEvidenceBoundary(basePacket());

  assert.equal(report.closureBoundaryAccepted, true);
  assert.equal(report.appRuntimeEvidenceClosureAllowed, true);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.callToolWidened, false);
  assert.equal(report.publicMcpTools.frozen, true);
  assert.deepEqual(report.blockers.blockingFindings, []);
  assert.equal(report.safety.noSideEffects, true);
  assert.equal(report.safety.readsFiles, false);
  assert.equal(report.safety.executesCommands, false);
});

test('CM-0992 blocks uncommitted app/runtime evidence from closure', () => {
  const report = summarizeDeferredGovernanceClosureEvidenceBoundary(basePacket({
    evidenceUnits: [
      evidenceUnit({ id: 'dirty-src-app-js', committed: false }),
      evidenceUnit({
        id: 'dirty-app-runtime-test',
        kind: 'app_runtime_entry_readiness_review',
        committed: false
      })
    ]
  }));

  assert.equal(report.closureBoundaryAccepted, true);
  assert.equal(report.appRuntimeEvidenceClosureAllowed, false);
  assert.deepEqual(report.evidence.uncommittedAppEvidence, [
    'dirty-src-app-js',
    'dirty-app-runtime-test'
  ]);
  assert.equal(report.blockers.blockingFindings.includes('uncommitted_app_runtime_evidence'), true);
});

test('CM-0992 blocks failed validation or unsafe app evidence', () => {
  const report = summarizeDeferredGovernanceClosureEvidenceBoundary(basePacket({
    evidenceUnits: [
      evidenceUnit({ id: 'failed-validation', validationPassed: false }),
      evidenceUnit({
        id: 'unsafe-runtime-apply',
        kind: 'app_apply_plan_preview_readiness_review',
        runtimeApplied: true,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.appRuntimeEvidenceClosureAllowed, false);
  assert.deepEqual(report.evidence.failedAppValidation, ['failed-validation']);
  assert.deepEqual(report.evidence.unsafeAppEvidence, ['unsafe-runtime-apply']);
  assert.equal(report.blockers.blockingFindings.includes('app_runtime_validation_not_passed'), true);
  assert.equal(report.blockers.blockingFindings.includes('unsafe_app_runtime_evidence'), true);
});

test('CM-0992 rejects public MCP drift and readiness overclaim', () => {
  const report = summarizeDeferredGovernanceClosureEvidenceBoundary(basePacket({
    publicTools: [...PUBLIC_MCP_TOOLS, 'memory_exclude'],
    deniedActions: DENIED_ACTIONS.filter(action => action !== 'readinessClaim'),
    publicMcpExpanded: true,
    callToolWidened: true,
    runtimeReady: true,
    readinessClaimed: true,
    reliabilityClaimed: true
  }));

  assert.equal(report.closureBoundaryAccepted, false);
  assert.equal(report.appRuntimeEvidenceClosureAllowed, false);
  assert.equal(report.publicMcpTools.frozen, false);
  assert.deepEqual(report.deniedActions.missing, ['readinessClaim']);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.blockers.blockingFindings.includes('global_runtime_or_readiness_drift'), true);
});

test('CM-0992 requires dirty baseline to block closure by default', () => {
  const report = summarizeDeferredGovernanceClosureEvidenceBoundary(basePacket({
    dirtyBaselineBlocksClosure: false
  }));

  assert.equal(report.closureBoundaryAccepted, false);
  assert.equal(report.appRuntimeEvidenceClosureAllowed, false);
  assert.equal(report.dirtyBaselineBlocksClosure, false);
  assert.equal(report.blockers.blockingFindings.includes('closure_boundary_not_accepted'), true);
});
