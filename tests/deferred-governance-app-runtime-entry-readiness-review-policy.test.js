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
  REQUIRED_APP_ENTRY_METHODS,
  REQUIRED_CONTEXT_SURFACES,
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_VALIDATION_COMMANDS,
  summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy
} = require('../src/core/DeferredGovernanceAppRuntimeEntryReadinessReviewPolicy');

function familyEntry(family, overrides = {}) {
  const context = REQUIRED_CONTEXT_SURFACES[family] || {};
  return {
    family,
    appMethod: REQUIRED_APP_ENTRY_METHODS[family] || '',
    adapterServiceExposed: true,
    defaultDisabled: true,
    approvedContextRequired: true,
    requestSource: context.requestSource || '',
    contextFlag: context.contextFlag || '',
    dryRunPlanningOnly: true,
    runtimeApplyBlocked: true,
    publicCallToolUnknown: true,
    mutatesDurableState: false,
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
        id: 'CM-0927-app-runtime-entry',
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
    familyEntries: [
      familyEntry('memory_exclude'),
      familyEntry('memory_forget')
    ],
    ...overrides
  };
}

test('CM-0928 accepts app runtime-entry readiness review without claiming runtime readiness', () => {
  const report = summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(basePacket());

  assert.equal(report.appRuntimeEntryReadinessReviewAccepted, true);
  assert.equal(report.appLevelDryRunEntriesReadyForReview, true);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.callToolWidened, false);
  assert.equal(report.dirtyBaselineBlocksLiveProof, true);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.equal(report.evidenceRefs.complete, true);
  assert.equal(report.validationCommands.complete, true);
  assert.equal(report.deniedActions.exact, true);
  assert.equal(report.closureEvidenceBoundary.accepted, true);
  assert.equal(report.closureEvidenceBoundary.appRuntimeEvidenceClosureAllowed, true);
  assert.ok(report.familyReports.every(item => item.accepted));
});

test('CM-0995 rejects app runtime-entry readiness review when app runtime evidence is uncommitted', () => {
  const report = summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(basePacket({
    closureEvidenceBoundary: closureEvidenceBoundary({
      evidenceUnits: [
        {
          id: 'dirty-CM-0927-app-runtime-entry',
          kind: 'app_runtime_entry',
          evidenceRef: 'CM-0927',
          validationRef: 'CMV-1045',
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

  assert.equal(report.appRuntimeEntryReadinessReviewAccepted, false);
  assert.equal(report.appLevelDryRunEntriesReadyForReview, false);
  assert.equal(report.closureEvidenceBoundary.accepted, true);
  assert.equal(report.closureEvidenceBoundary.appRuntimeEvidenceClosureAllowed, false);
  assert.deepEqual(report.closureEvidenceBoundary.uncommittedAppEvidence, [
    'dirty-CM-0927-app-runtime-entry'
  ]);
  assert.equal(
    report.closureEvidenceBoundary.blockingFindings.includes('uncommitted_app_runtime_evidence'),
    true
  );
});

test('CM-0928 rejects missing evidence refs and validation commands', () => {
  const report = summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(basePacket({
    evidenceRefs: REQUIRED_EVIDENCE_REFS.filter(ref => ref !== 'CM-0927'),
    validationCommands: REQUIRED_VALIDATION_COMMANDS
      .filter(command => command !== 'node --test tests\\deferred-governance-app-runtime-entry.test.js')
  }));

  assert.equal(report.appRuntimeEntryReadinessReviewAccepted, false);
  assert.deepEqual(report.evidenceRefs.missing, ['CM-0927']);
  assert.deepEqual(report.validationCommands.missing, [
    'node --test tests\\deferred-governance-app-runtime-entry.test.js'
  ]);
});

test('CM-0928 rejects family surface drift and family substitution', () => {
  const report = summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(basePacket({
    familyEntries: [
      familyEntry('memory_exclude', {
        appMethod: 'executeInternalMemoryForget',
        requestSource: REQUIRED_CONTEXT_SURFACES.memory_forget.requestSource,
        contextFlag: REQUIRED_CONTEXT_SURFACES.memory_forget.contextFlag
      }),
      familyEntry('memory_validate')
    ]
  }));

  assert.equal(report.appRuntimeEntryReadinessReviewAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
  assert.equal(report.familyReports[0].requiredAppMethod, 'executeInternalMemoryExclude');
  assert.equal(report.familyReports[0].requiredRequestSource, 'internal-memory-exclude-runtime-entry');
  assert.equal(report.familyReports[0].requiredContextFlag, 'internalMemoryExcludeRuntimeEntry');
});

test('CM-0928 rejects public MCP expansion, callTool widening, runtime apply, and readiness claims', () => {
  const report = summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(basePacket({
    publicMcpExpanded: true,
    callToolWidened: true,
    runtimeReady: true,
    readinessClaimed: true,
    publicTools: [...PUBLIC_MCP_TOOLS, 'memory_exclude'],
    deniedActions: DENIED_ACTIONS.filter(action => action !== 'readinessClaim'),
    familyEntries: [
      familyEntry('memory_exclude', {
        defaultDisabled: false,
        runtimeApplyBlocked: false,
        publicCallToolUnknown: false,
        mutatesDurableState: true
      }),
      familyEntry('memory_forget', {
        dryRunPlanningOnly: false,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.appRuntimeEntryReadinessReviewAccepted, false);
  assert.equal(report.publicMcpTools.frozen, false);
  assert.equal(report.deniedActions.exact, false);
  assert.deepEqual(report.deniedActions.missing, ['readinessClaim']);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.readinessClaimed, false);
});

test('CM-0928 rejects missing dirty-baseline live-proof block', () => {
  const report = summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(basePacket({
    dirtyBaselineBlocksLiveProof: false
  }));

  assert.equal(report.appRuntimeEntryReadinessReviewAccepted, false);
  assert.equal(report.dirtyBaselineBlocksLiveProof, false);
  assert.equal(report.runtimeReady, false);
});
