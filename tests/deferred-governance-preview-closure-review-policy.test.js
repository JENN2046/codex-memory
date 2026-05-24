const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DENIED_ACTIONS: BOUNDARY_DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION: BOUNDARY_SCHEMA_VERSION,
  EXPECTED_VERSION: BOUNDARY_VERSION
} = require('../src/core/DeferredGovernanceClosureEvidenceBoundaryPolicy');

const {
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_PREVIEW_CLOSURE_UNITS,
  REQUIRED_UNIT_EVIDENCE,
  REQUIRED_VALIDATION_COMMANDS,
  summarizeDeferredGovernancePreviewClosureReviewPolicy
} = require('../src/core/DeferredGovernancePreviewClosureReviewPolicy');

function previewClosureUnit(id, overrides = {}) {
  const required = REQUIRED_UNIT_EVIDENCE[id] || {};

  return {
    id,
    evidenceRef: required.ref || '',
    validationRef: required.validationRef || '',
    accepted: true,
    internalOnly: true,
    previewOnly: true,
    defaultDisabled: true,
    approvedContextRequired: true,
    publicMcpFrozen: true,
    callToolWidened: false,
    executionApproved: false,
    runtimeApplied: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    candidateCacheCleared: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    ...overrides
  };
}

function closureEvidenceBoundary(overrides = {}) {
  return {
    schemaVersion: BOUNDARY_SCHEMA_VERSION,
    version: BOUNDARY_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    dirtyBaselineBlocksClosure: true,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    governedFamilies: GOVERNANCE_FAMILIES,
    deniedActions: BOUNDARY_DENIED_ACTIONS,
    publicMcpExpanded: false,
    callToolWidened: false,
    runtimeReady: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    evidenceUnits: [
      {
        id: 'CM-0931-app-preview-entry',
        kind: 'app_apply_plan_preview_entry',
        evidenceRef: 'CM-0931',
        validationRef: 'CMV-1049',
        committed: true,
        validationPassed: true,
        internalOnly: true,
        defaultDisabled: true,
        publicMcpFrozen: true,
        runtimeApplied: false,
        readinessClaimed: false,
        reliabilityClaimed: false
      },
      {
        id: 'CM-0932-app-preview-readiness-review',
        kind: 'app_apply_plan_preview_readiness_review',
        evidenceRef: 'CM-0932',
        validationRef: 'CMV-1050',
        committed: true,
        validationPassed: true,
        internalOnly: true,
        defaultDisabled: true,
        publicMcpFrozen: true,
        runtimeApplied: false,
        readinessClaimed: false,
        reliabilityClaimed: false
      }
    ],
    ...overrides
  };
}

function basePacket(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    internalOnly: true,
    previewClosureOnly: true,
    dirtyBaselineBlocksLiveProof: true,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    evidenceRefs: REQUIRED_EVIDENCE_REFS,
    validationCommands: REQUIRED_VALIDATION_COMMANDS,
    deniedActions: DENIED_ACTIONS,
    governedFamilies: GOVERNANCE_FAMILIES,
    publicMcpExpanded: false,
    callToolWidened: false,
    executionApproved: false,
    runtimeReady: false,
    runtimeApplied: false,
    serviceStarted: false,
    runtimeProbeExecuted: false,
    liveProofExecuted: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    candidateCacheCleared: false,
    providerCalled: false,
    configMutated: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    closureEvidenceBoundary: closureEvidenceBoundary(),
    previewClosureUnits: REQUIRED_PREVIEW_CLOSURE_UNITS.map(previewClosureUnit),
    ...overrides
  };
}

test('CM-0933 accepts the preview-only closure packet without claiming runtime readiness', () => {
  const report = summarizeDeferredGovernancePreviewClosureReviewPolicy(basePacket());

  assert.equal(report.previewClosureReviewAccepted, true);
  assert.equal(report.previewClosureLocallyClosed, true);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.callToolWidened, false);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeApplied, false);
  assert.equal(report.governedFamilies.exact, true);
  assert.equal(report.previewClosureUnits.exact, true);
  assert.equal(report.evidenceRefs.complete, true);
  assert.equal(report.validationCommands.complete, true);
  assert.equal(report.deniedActions.exact, true);
  assert.equal(report.closureEvidenceBoundary.accepted, true);
  assert.equal(report.closureEvidenceBoundary.appRuntimeEvidenceClosureAllowed, true);
  assert.ok(report.unitReports.every(unit => unit.accepted));
  assert.equal(report.safety.noSideEffects, true);
  assert.equal(report.safety.durableAuditWritten, false);
  assert.equal(report.safety.durableProjectionApplied, false);
  assert.equal(report.safety.candidateCacheCleared, false);
});

test('CM-0993 rejects preview closure when app/runtime evidence is uncommitted', () => {
  const report = summarizeDeferredGovernancePreviewClosureReviewPolicy(basePacket({
    closureEvidenceBoundary: closureEvidenceBoundary({
      evidenceUnits: [
        {
          id: 'dirty-CM-0931-app-preview-entry',
          kind: 'app_apply_plan_preview_entry',
          evidenceRef: 'CM-0931',
          validationRef: 'CMV-1049',
          committed: false,
          validationPassed: true,
          internalOnly: true,
          defaultDisabled: true,
          publicMcpFrozen: true,
          runtimeApplied: false,
          readinessClaimed: false,
          reliabilityClaimed: false
        }
      ]
    })
  }));

  assert.equal(report.previewClosureReviewAccepted, false);
  assert.equal(report.previewClosureLocallyClosed, false);
  assert.equal(report.closureEvidenceBoundary.accepted, true);
  assert.equal(report.closureEvidenceBoundary.appRuntimeEvidenceClosureAllowed, false);
  assert.deepEqual(report.closureEvidenceBoundary.uncommittedAppEvidence, [
    'dirty-CM-0931-app-preview-entry'
  ]);
  assert.equal(
    report.closureEvidenceBoundary.blockingFindings.includes('uncommitted_app_runtime_evidence'),
    true
  );
});

test('CM-0933 rejects missing CM-0932 and CMV-1050 evidence', () => {
  const report = summarizeDeferredGovernancePreviewClosureReviewPolicy(basePacket({
    evidenceRefs: REQUIRED_EVIDENCE_REFS.filter(ref => ref !== 'CM-0932' && ref !== 'CMV-1050')
  }));

  assert.equal(report.previewClosureReviewAccepted, false);
  assert.deepEqual(report.evidenceRefs.missing, ['CM-0932', 'CMV-1050']);
});

test('CM-0933 rejects missing app-preview readiness validation command', () => {
  const missingCommand = 'node --test tests\\deferred-governance-app-apply-plan-preview-readiness-review-policy.test.js';
  const report = summarizeDeferredGovernancePreviewClosureReviewPolicy(basePacket({
    validationCommands: REQUIRED_VALIDATION_COMMANDS.filter(command => command !== missingCommand)
  }));

  assert.equal(report.previewClosureReviewAccepted, false);
  assert.deepEqual(report.validationCommands.missing, [missingCommand]);
});

test('CM-0933 rejects preview closure unit substitution and validation drift', () => {
  const report = summarizeDeferredGovernancePreviewClosureReviewPolicy(basePacket({
    previewClosureUnits: [
      previewClosureUnit('bounded_apply_plan_preview'),
      previewClosureUnit('adapter_apply_plan_preview'),
      previewClosureUnit('app_apply_plan_preview_entry', { validationRef: 'CMV-1048' }),
      previewClosureUnit('runtime_apply_preview')
    ]
  }));

  assert.equal(report.previewClosureReviewAccepted, false);
  assert.deepEqual(report.previewClosureUnits.missing, ['app_apply_plan_preview_readiness_review']);
  assert.deepEqual(report.previewClosureUnits.unexpected, ['runtime_apply_preview']);
  assert.equal(report.unitReports[2].accepted, false);
  assert.equal(report.unitReports[2].requiredValidationRef, 'CMV-1049');
});

test('CM-0933 rejects execution, durable mutation, public MCP drift, and readiness overclaim', () => {
  const report = summarizeDeferredGovernancePreviewClosureReviewPolicy(basePacket({
    publicTools: [...PUBLIC_MCP_TOOLS, 'memory_exclude'],
    deniedActions: DENIED_ACTIONS.filter(action => action !== 'readinessClaim'),
    publicMcpExpanded: true,
    callToolWidened: true,
    executionApproved: true,
    runtimeReady: true,
    runtimeApplied: true,
    serviceStarted: true,
    runtimeProbeExecuted: true,
    liveProofExecuted: true,
    durableAuditWritten: true,
    durableProjectionApplied: true,
    candidateCacheCleared: true,
    providerCalled: true,
    configMutated: true,
    readinessClaimed: true,
    reliabilityClaimed: true,
    previewClosureUnits: [
      previewClosureUnit('bounded_apply_plan_preview', {
        executionApproved: true,
        runtimeApplied: true,
        durableAuditWritten: true
      }),
      previewClosureUnit('adapter_apply_plan_preview'),
      previewClosureUnit('app_apply_plan_preview_entry', {
        callToolWidened: true,
        candidateCacheCleared: true
      }),
      previewClosureUnit('app_apply_plan_preview_readiness_review', {
        readinessClaimed: true,
        reliabilityClaimed: true
      })
    ]
  }));

  assert.equal(report.previewClosureReviewAccepted, false);
  assert.equal(report.publicMcpTools.frozen, false);
  assert.deepEqual(report.deniedActions.missing, ['readinessClaim']);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.unitReports[0].accepted, false);
  assert.equal(report.unitReports[2].accepted, false);
  assert.equal(report.unitReports[3].accepted, false);
});
