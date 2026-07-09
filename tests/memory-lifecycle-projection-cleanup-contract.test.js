'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_FLAGS,
  REQUIRED_GENERAL_PROJECTION_FLAGS,
  REQUIRED_HANDLING_BY_PROJECTION,
  REQUIRED_LIFECYCLE_FAMILIES,
  REQUIRED_PROJECTION_FAMILIES,
  REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION,
  summarizeMemoryLifecycleProjectionCleanupContract
} = require('../src/core/MemoryLifecycleProjectionCleanupContract');

function baseSafety(overrides = {}) {
  return {
    ...Object.fromEntries(NO_SIDE_EFFECT_FLAGS.map(flag => [flag, true])),
    rawSecretExposed: false,
    rawPrivateMemoryExposed: false,
    rawLogExposed: false,
    ...overrides
  };
}

function projectionPolicy(projectionFamily, overrides = {}) {
  const [handlingMode] = REQUIRED_HANDLING_BY_PROJECTION[projectionFamily] || ['unknown'];

  return {
    projectionFamily,
    handlingMode,
    generalFlags: [...REQUIRED_GENERAL_PROJECTION_FLAGS],
    specificFlags: [...(REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION[projectionFamily] || [])],
    evidenceKind: 'fixture_or_contract_evidence_only',
    exactMemoryIdScoped: true,
    targetFamilyScoped: true,
    changedMemoryIdsEmitted: true,
    governanceRevisionEmitted: true,
    suppressesBeforeRecall: true,
    searchProjectionRechecked: true,
    requiresSeparateApplyApproval: true,
    requiresRuntimeValidationBeforeApply: true,
    rawContentOutput: false,
    rawPathOutput: false,
    rawIdOutput: false,
    appliesNow: false,
    mutatesDurableStateNow: false,
    providerCalls: 0,
    readinessClaimed: false,
    ...overrides
  };
}

function lifecyclePolicy(lifecycleFamily, overrides = {}) {
  return {
    lifecycleFamily,
    projectionPolicies: REQUIRED_PROJECTION_FAMILIES.map(projectionPolicy),
    familyFlags: [...REQUIRED_FAMILY_FLAGS],
    publicMcpTool: PUBLIC_MCP_TOOLS.includes(lifecycleFamily),
    publicMcpExpansion: false,
    executionApproved: false,
    runtimeIntegrated: false,
    mutatesDurableStateNow: false,
    providerCalls: 0,
    readinessClaimed: false,
    ...overrides
  };
}

function baseContract(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    contractOnly: true,
    fixtureOnly: true,
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    publicToolsFrozen: true,
    publicTools: [...PUBLIC_MCP_TOOLS],
    lifecycleFamilyPolicies: REQUIRED_LIFECYCLE_FAMILIES.map(lifecyclePolicy),
    safety: baseSafety(),
    ...overrides
  };
}

test('accepts all-projection lifecycle cleanup contract without execution', () => {
  const report = summarizeMemoryLifecycleProjectionCleanupContract(baseContract());

  assert.equal(report.contractAccepted, true);
  assert.equal(
    report.decision,
    'ALL_PROJECTION_LIFECYCLE_CLEANUP_CONTRACT_ACCEPTED_NOT_EXECUTED_NOT_READY'
  );
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.lifecycleFamilies.required, REQUIRED_LIFECYCLE_FAMILIES);
  assert.deepEqual(report.projectionFamilies.required, REQUIRED_PROJECTION_FAMILIES);
  assert.equal(report.publicMcpTools.frozen, true);
  assert.ok(report.familyReports.every(family => family.accepted));
  assert.ok(report.familyReports.every(family => family.projectionReports.length === 10));
  assert.ok(report.familyReports.every(family =>
    family.projectionReports.every(projection => projection.accepted)
  ));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects a lifecycle family when any required projection family is missing', () => {
  const tombstonePolicy = lifecyclePolicy('tombstone_memory', {
    projectionPolicies: REQUIRED_PROJECTION_FAMILIES
      .filter(projectionFamily => projectionFamily !== 'degraded_payload')
      .map(projectionPolicy)
  });
  const report = summarizeMemoryLifecycleProjectionCleanupContract(baseContract({
    lifecycleFamilyPolicies: [
      lifecyclePolicy('validate_memory'),
      tombstonePolicy,
      lifecyclePolicy('supersede_memory'),
      lifecyclePolicy('memory_exclude'),
      lifecyclePolicy('memory_forget')
    ]
  }));

  assert.equal(report.contractAccepted, false);
  const tombstoneReport = report.familyReports.find(item => item.lifecycleFamily === 'tombstone_memory');
  assert.equal(tombstoneReport.accepted, false);
  assert.deepEqual(tombstoneReport.projectionFamilies.missing, ['degraded_payload']);
});

test('rejects candidate-cache handling that would allow stale suppressed cache reuse', () => {
  const report = summarizeMemoryLifecycleProjectionCleanupContract(baseContract({
    lifecycleFamilyPolicies: [
      lifecyclePolicy('validate_memory'),
      lifecyclePolicy('tombstone_memory', {
        projectionPolicies: REQUIRED_PROJECTION_FAMILIES.map(projectionFamily => {
          if (projectionFamily !== 'candidate_cache') return projectionPolicy(projectionFamily);
          return projectionPolicy('candidate_cache', {
            specificFlags: [
              'dependent_candidate_entries_cleared',
              'cache_hit_projection_rechecked'
            ],
            searchProjectionRechecked: false
          });
        })
      }),
      lifecyclePolicy('supersede_memory'),
      lifecyclePolicy('memory_exclude'),
      lifecyclePolicy('memory_forget')
    ]
  }));

  assert.equal(report.contractAccepted, false);
  const candidateReport = report.familyReports
    .find(item => item.lifecycleFamily === 'tombstone_memory')
    .projectionReports
    .find(item => item.projectionFamily === 'candidate_cache');
  assert.equal(candidateReport.accepted, false);
  assert.deepEqual(candidateReport.missingSpecificFlags, ['stale_suppressed_cache_reuse_blocked']);
  assert.equal(candidateReport.searchProjectionRechecked, false);
});

test('rejects raw exposure, public MCP expansion, readiness claims, and side effects', () => {
  const report = summarizeMemoryLifecycleProjectionCleanupContract(baseContract({
    publicMcpExpanded: true,
    readinessClaimed: true,
    publicTools: [...PUBLIC_MCP_TOOLS, 'forget_memory'],
    safety: baseSafety({
      noRawMemoryRead: false,
      noSecretRead: false,
      rawSecretExposed: true,
      rawPrivateMemoryExposed: true
    }),
    lifecycleFamilyPolicies: [
      lifecyclePolicy('validate_memory'),
      lifecyclePolicy('tombstone_memory', {
        publicMcpExpansion: true,
        readinessClaimed: true,
        projectionPolicies: REQUIRED_PROJECTION_FAMILIES.map(projectionFamily => {
          if (projectionFamily !== 'write_audit') return projectionPolicy(projectionFamily);
          return projectionPolicy('write_audit', {
            rawContentOutput: true,
            appliesNow: true,
            readinessClaimed: true
          });
        })
      }),
      lifecyclePolicy('supersede_memory'),
      lifecyclePolicy('memory_exclude'),
      lifecyclePolicy('memory_forget')
    ]
  }));

  assert.equal(report.contractAccepted, false);
  assert.equal(report.publicMcpTools.frozen, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawSecretExposed, true);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  const writeAuditReport = report.familyReports
    .find(item => item.lifecycleFamily === 'tombstone_memory')
    .projectionReports
    .find(item => item.projectionFamily === 'write_audit');
  assert.equal(writeAuditReport.accepted, false);
  assert.equal(writeAuditReport.rawContentOutput, true);
  assert.equal(writeAuditReport.appliesNow, true);
});

test('rejects lifecycle family drift and invalid projection handling mode', () => {
  const report = summarizeMemoryLifecycleProjectionCleanupContract(baseContract({
    lifecycleFamilyPolicies: [
      lifecyclePolicy('validate_memory'),
      lifecyclePolicy('tombstone_memory'),
      lifecyclePolicy('supersede_memory', {
        projectionPolicies: REQUIRED_PROJECTION_FAMILIES.map(projectionFamily => {
          if (projectionFamily !== 'vector_index') return projectionPolicy(projectionFamily);
          return projectionPolicy('vector_index', {
            handlingMode: 'leave_projection_unchanged'
          });
        })
      }),
      lifecyclePolicy('memory_exclude'),
      lifecyclePolicy('memory_validate_experimental')
    ]
  }));

  assert.equal(report.contractAccepted, false);
  assert.deepEqual(report.lifecycleFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.lifecycleFamilies.unexpected, ['memory_validate_experimental']);
  const vectorReport = report.familyReports
    .find(item => item.lifecycleFamily === 'supersede_memory')
    .projectionReports
    .find(item => item.projectionFamily === 'vector_index');
  assert.equal(vectorReport.accepted, false);
  assert.deepEqual(vectorReport.requiredHandlingModes, ['suppress_or_rebuild_filtered_projection']);
});
