const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFERRED_FAMILIES,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_REENTRY_EVIDENCE,
  summarizeDeferredGovernanceFamilyReentryContract
} = require('../src/core/DeferredGovernanceFamilyReentryContract');

function baseSafety(overrides = {}) {
  const safety = {};
  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    safety[flag] = true;
  }
  return {
    ...safety,
    rawSecretExposed: false,
    rawWorkspaceIdExposed: false,
    ...overrides
  };
}

function baseContract(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    internalOnly: true,
    publicMcpExpanded: false,
    executionApproved: false,
    runtimeIntegrated: false,
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    safety: baseSafety(),
    families: DEFERRED_FAMILIES.map(id => ({
      id,
      status: 'DEFERRED_PENDING_EVIDENCE',
      evidence: [],
      blockers: [
        'runtime_service_absent',
        'runtime_entry_absent',
        'bounded_apply_seam_absent'
      ],
      internalOnly: true,
      executionApproved: false,
      publicMcpTool: false,
      runtimeEntryEnabledByDefault: false,
      mutatesDurableState: false,
      hardDeleteAllowed: false,
      realMemoryScanned: false,
      providerCalls: 0,
      readinessClaimed: false
    })),
    ...overrides
  };
}

test('accepts current deferred exclude/forget state for review but keeps re-entry blocked', () => {
  const report = summarizeDeferredGovernanceFamilyReentryContract(baseContract());

  assert.equal(report.acceptedForGovernanceReview, true);
  assert.equal(report.readyForInternalReentryReview, false);
  assert.deepEqual(report.deferredFamilies.missing, []);
  assert.deepEqual(report.deferredFamilies.unexpected, []);
  assert.equal(report.publicMcpTools.frozen, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.safety.noSideEffects, true);
  assert.equal(report.familyReports.length, 2);
  assert.ok(report.familyReports.every(family => family.missingEvidence.length === REQUIRED_REENTRY_EVIDENCE.length));
});

test('reports ready for internal re-entry review only with exact evidence and no execution', () => {
  const report = summarizeDeferredGovernanceFamilyReentryContract(baseContract({
    families: DEFERRED_FAMILIES.map(id => ({
      id,
      status: 'READY_FOR_INTERNAL_REENTRY_REVIEW_NOT_EXECUTED',
      evidence: REQUIRED_REENTRY_EVIDENCE,
      blockers: [],
      internalOnly: true,
      executionApproved: false,
      publicMcpTool: false,
      runtimeEntryEnabledByDefault: false,
      mutatesDurableState: false,
      hardDeleteAllowed: false,
      realMemoryScanned: false,
      providerCalls: 0,
      readinessClaimed: false
    }))
  }));

  assert.equal(report.acceptedForGovernanceReview, true);
  assert.equal(report.readyForInternalReentryReview, true);
  assert.ok(report.familyReports.every(family => family.readyForInternalReentryReview));
  assert.ok(report.familyReports.every(family => family.missingEvidence.length === 0));
});

test('fails review when public MCP expansion or runtime execution is claimed', () => {
  const report = summarizeDeferredGovernanceFamilyReentryContract(baseContract({
    publicMcpExpanded: true,
    executionApproved: true,
    families: [
      {
        id: 'memory_exclude',
        status: 'READY_FOR_INTERNAL_REENTRY_REVIEW_NOT_EXECUTED',
        evidence: REQUIRED_REENTRY_EVIDENCE,
        blockers: [],
        internalOnly: true,
        executionApproved: true,
        publicMcpTool: true,
        runtimeEntryEnabledByDefault: false,
        mutatesDurableState: false,
        hardDeleteAllowed: false,
        realMemoryScanned: false,
        providerCalls: 0,
        readinessClaimed: false
      },
      ...baseContract().families.slice(1)
    ]
  }));

  assert.equal(report.acceptedForGovernanceReview, false);
  assert.equal(report.readyForInternalReentryReview, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.executionApproved, false);
});

test('requires the exact deferred family set', () => {
  const report = summarizeDeferredGovernanceFamilyReentryContract(baseContract({
    families: [
      baseContract().families[0],
      {
        ...baseContract().families[0],
        id: 'memory_validate'
      }
    ]
  }));

  assert.equal(report.acceptedForGovernanceReview, false);
  assert.equal(report.deferredFamilies.exact, false);
  assert.deepEqual(report.deferredFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.deferredFamilies.unexpected, ['memory_validate']);
});

test('unused secret-like metadata does not affect safe review shape', () => {
  const report = summarizeDeferredGovernanceFamilyReentryContract(baseContract({
    next: 'token sk-test-example should be redacted'
  }));

  assert.equal(report.acceptedForGovernanceReview, true);
  assert.equal(report.safety.rawSecretExposed, false);
});
