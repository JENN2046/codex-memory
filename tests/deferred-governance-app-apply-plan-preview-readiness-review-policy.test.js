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
  REQUIRED_ADAPTER_PREVIEW_METHODS,
  REQUIRED_APP_PREVIEW_METHODS,
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_VALIDATION_COMMANDS,
  summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy
} = require('../src/core/DeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy');

function familyPreviewEntry(family, overrides = {}) {
  return {
    family,
    appPreviewMethod: REQUIRED_APP_PREVIEW_METHODS[family] || '',
    adapterPreviewMethod: REQUIRED_ADAPTER_PREVIEW_METHODS[family] || '',
    appMethodRoutesToAdapter: true,
    adapterPreviewEnabledBySeparateFlag: true,
    defaultDisabled: true,
    approvedContextRequired: true,
    runtimeSurfaceEvidenceRequired: true,
    previewOnly: true,
    applyPlanPreviewAccepted: true,
    executionApproved: false,
    runtimeApplyBlocked: true,
    runtimeEntryMounted: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    candidateCacheCleared: false,
    publicCallToolUnknown: true,
    publicMcpExpanded: false,
    readinessClaimed: false,
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
    appLevelInternalOnly: true,
    previewOnly: true,
    publicMcpExpanded: false,
    callToolWidened: false,
    runtimeReady: false,
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    evidenceRefs: REQUIRED_EVIDENCE_REFS,
    validationCommands: REQUIRED_VALIDATION_COMMANDS,
    deniedActions: DENIED_ACTIONS,
    dirtyBaselineBlocksLiveProof: true,
    closureEvidenceBoundary: closureEvidenceBoundary(),
    familyPreviewEntries: [
      familyPreviewEntry('memory_exclude'),
      familyPreviewEntry('memory_forget')
    ],
    ...overrides
  };
}

test('CM-0932 accepts app apply-plan preview readiness review without claiming runtime readiness', () => {
  const report = summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(basePacket());

  assert.equal(report.appApplyPlanPreviewReadinessReviewAccepted, true);
  assert.equal(report.appPreviewEntriesReadyForReview, true);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.callToolWidened, false);
  assert.equal(report.previewOnly, true);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.equal(report.evidenceRefs.complete, true);
  assert.equal(report.validationCommands.complete, true);
  assert.equal(report.deniedActions.exact, true);
  assert.equal(report.closureEvidenceBoundary.accepted, true);
  assert.equal(report.closureEvidenceBoundary.appRuntimeEvidenceClosureAllowed, true);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.equal(report.safety.durableAuditWritten, false);
  assert.equal(report.safety.durableProjectionApplied, false);
  assert.equal(report.safety.candidateCacheCleared, false);
});

test('CM-0994 rejects app preview readiness review when preview evidence is uncommitted', () => {
  const report = summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(basePacket({
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

  assert.equal(report.appApplyPlanPreviewReadinessReviewAccepted, false);
  assert.equal(report.appPreviewEntriesReadyForReview, false);
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

test('CM-0932 rejects missing CM-0931 evidence and app validation command', () => {
  const report = summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(basePacket({
    evidenceRefs: REQUIRED_EVIDENCE_REFS.filter(ref => ref !== 'CM-0931'),
    validationCommands: REQUIRED_VALIDATION_COMMANDS
      .filter(command => command !== 'node --test tests\\deferred-governance-app-runtime-entry.test.js')
  }));

  assert.equal(report.appApplyPlanPreviewReadinessReviewAccepted, false);
  assert.deepEqual(report.evidenceRefs.missing, ['CM-0931']);
  assert.deepEqual(report.validationCommands.missing, [
    'node --test tests\\deferred-governance-app-runtime-entry.test.js'
  ]);
});

test('CM-0932 rejects preview family surface drift and family substitution', () => {
  const report = summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(basePacket({
    familyPreviewEntries: [
      familyPreviewEntry('memory_exclude', {
        appPreviewMethod: 'previewInternalMemoryForgetApplyPlan',
        adapterPreviewMethod: 'previewInternalMemoryForgetApplyPlan'
      }),
      familyPreviewEntry('memory_validate')
    ]
  }));

  assert.equal(report.appApplyPlanPreviewReadinessReviewAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
  assert.equal(report.familyReports[0].requiredAppPreviewMethod, 'previewInternalMemoryExcludeApplyPlan');
  assert.equal(report.familyReports[0].requiredAdapterPreviewMethod, 'previewInternalMemoryExcludeApplyPlan');
});

test('CM-0932 rejects durable apply, public MCP drift, and readiness claims', () => {
  const report = summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(basePacket({
    publicMcpExpanded: true,
    callToolWidened: true,
    runtimeReady: true,
    readinessClaimed: true,
    publicTools: [...PUBLIC_MCP_TOOLS, 'memory_exclude'],
    deniedActions: DENIED_ACTIONS.filter(action => action !== 'readinessClaim'),
    familyPreviewEntries: [
      familyPreviewEntry('memory_exclude', {
        executionApproved: true,
        runtimeApplyBlocked: false,
        mutated: true,
        durableAuditWritten: true,
        durableProjectionApplied: true,
        candidateCacheCleared: true
      }),
      familyPreviewEntry('memory_forget', {
        publicCallToolUnknown: false,
        publicMcpExpanded: true,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.appApplyPlanPreviewReadinessReviewAccepted, false);
  assert.equal(report.publicMcpTools.frozen, false);
  assert.equal(report.deniedActions.exact, false);
  assert.deepEqual(report.deniedActions.missing, ['readinessClaim']);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
});

test('CM-0932 rejects missing preview-only and dirty-baseline live-proof blocks', () => {
  const report = summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(basePacket({
    previewOnly: false,
    dirtyBaselineBlocksLiveProof: false,
    familyPreviewEntries: [
      familyPreviewEntry('memory_exclude', {
        previewOnly: false,
        applyPlanPreviewAccepted: false
      }),
      familyPreviewEntry('memory_forget')
    ]
  }));

  assert.equal(report.appApplyPlanPreviewReadinessReviewAccepted, false);
  assert.equal(report.previewOnly, false);
  assert.equal(report.dirtyBaselineBlocksLiveProof, false);
  assert.equal(report.familyReports[0].accepted, false);
});
