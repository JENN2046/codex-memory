const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_AUDIT_EVENT_FIELDS,
  REQUIRED_AUDIT_PHASES,
  REQUIRED_AUDIT_PLAN_FLAGS,
  REQUIRED_AUDIT_PLAN_OUTPUTS,
  REQUIRED_FAMILY_AUDIT_SURFACES,
  summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy
} = require('../src/core/DeferredGovernanceAppendOnlyAuditPlanPolicy');

function baseSafety(overrides = {}) {
  const safety = {};
  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    safety[flag] = true;
  }
  return {
    ...safety,
    rawSecretExposed: false,
    rawWorkspaceIdExposed: false,
    rawPrivateMemoryExposed: false,
    ...overrides
  };
}

function familyPlan(family, overrides = {}) {
  const surface = REQUIRED_FAMILY_AUDIT_SURFACES[family] || {};
  return {
    family,
    eventType: surface.eventType || '',
    toolName: surface.toolName || '',
    requestSource: surface.requestSource || '',
    contextFlag: surface.contextFlag || '',
    auditPhases: REQUIRED_AUDIT_PHASES,
    requiredAuditEventFields: REQUIRED_AUDIT_EVENT_FIELDS,
    requiredAuditPlanOutputs: REQUIRED_AUDIT_PLAN_OUTPUTS,
    auditPlanFlags: REQUIRED_AUDIT_PLAN_FLAGS,
    appendOnlyRequired: true,
    pendingBeforeMutationRequired: true,
    committedAfterMutationRequired: true,
    cancelledOnFailureRequired: true,
    sharedCorrelationRequired: true,
    redactionRequired: true,
    noOverwriteOrDelete: true,
    noRawPayload: true,
    publicMcpTool: false,
    executionApproved: false,
    runtimeIntegrated: false,
    auditWriterImplemented: false,
    mutatesDurableState: false,
    providerCalls: 0,
    readinessClaimed: false,
    ...overrides
  };
}

function basePolicy(overrides = {}) {
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
    familyPlans: [
      familyPlan('memory_exclude'),
      familyPlan('memory_forget')
    ],
    ...overrides
  };
}

test('accepts append-only audit plan policy for exclude and forget without writing audit', () => {
  const report = summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy(basePolicy());

  assert.equal(report.appendOnlyAuditPlanPolicyAccepted, true);
  assert.equal(report.executionApproved, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.readinessClaimed, false);
  assert.deepEqual(report.governedFamilies.present, GOVERNANCE_FAMILIES);
  assert.deepEqual(report.requiredAuditPhases, REQUIRED_AUDIT_PHASES);
  assert.deepEqual(report.requiredAuditPlanOutputs, REQUIRED_AUDIT_PLAN_OUTPUTS);
  assert.ok(report.familyReports.every(item => item.accepted));
  assert.ok(report.familyReports.every(item => item.appendOnlyRequired === true));
  assert.ok(report.familyReports.every(item => item.auditWriterImplemented === false));
  assert.equal(report.safety.noSideEffects, true);
});

test('rejects missing audit phases, event fields, outputs, or flags', () => {
  const report = summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        auditPhases: REQUIRED_AUDIT_PHASES.filter(phase => phase !== 'cancelled'),
        requiredAuditEventFields: REQUIRED_AUDIT_EVENT_FIELDS.filter(field => field !== 'rollback_ref')
      }),
      familyPlan('memory_forget', {
        requiredAuditPlanOutputs: REQUIRED_AUDIT_PLAN_OUTPUTS.filter(output => output !== 'previousSnapshotRefs'),
        auditPlanFlags: REQUIRED_AUDIT_PLAN_FLAGS.filter(flag => flag !== 'noOverwriteOrDelete')
      })
    ]
  }));

  assert.equal(report.appendOnlyAuditPlanPolicyAccepted, false);
  assert.deepEqual(report.familyReports[0].missingAuditPhases, ['cancelled']);
  assert.deepEqual(report.familyReports[0].missingAuditEventFields, ['rollback_ref']);
  assert.deepEqual(report.familyReports[1].missingAuditPlanOutputs, ['previousSnapshotRefs']);
  assert.deepEqual(report.familyReports[1].missingAuditPlanFlags, ['noOverwriteOrDelete']);
});

test('rejects family audit surface or approved-context drift', () => {
  const report = summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude', {
        eventType: 'memory_forget',
        toolName: 'internal_memory_forget'
      }),
      familyPlan('memory_forget', {
        requestSource: 'internal-memory-exclude-runtime-entry',
        contextFlag: 'internalMemoryExcludeRuntimeEntry'
      })
    ]
  }));

  assert.equal(report.appendOnlyAuditPlanPolicyAccepted, false);
  assert.equal(report.familyReports[0].requiredEventType, 'memory_exclude');
  assert.equal(report.familyReports[0].requiredToolName, 'internal_memory_exclude');
  assert.equal(report.familyReports[1].requiredRequestSource, 'internal-memory-forget-runtime-entry');
  assert.equal(report.familyReports[1].requiredContextFlag, 'internalMemoryForgetRuntimeEntry');
});

test('requires exact deferred family set', () => {
  const report = summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy(basePolicy({
    familyPlans: [
      familyPlan('memory_exclude'),
      familyPlan('memory_validate')
    ]
  }));

  assert.equal(report.appendOnlyAuditPlanPolicyAccepted, false);
  assert.deepEqual(report.governedFamilies.missing, ['memory_forget']);
  assert.deepEqual(report.governedFamilies.unexpected, ['memory_validate']);
});

test('rejects audit writer implementation, execution, durable mutation, and side-effect drift', () => {
  const report = summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy(basePolicy({
    publicMcpExpanded: true,
    runtimeIntegrated: true,
    safety: baseSafety({ noDurableAuditWrite: false, rawPrivateMemoryExposed: true }),
    familyPlans: [
      familyPlan('memory_exclude', {
        publicMcpTool: true,
        executionApproved: true,
        auditWriterImplemented: true
      }),
      familyPlan('memory_forget', {
        mutatesDurableState: true,
        providerCalls: 1,
        readinessClaimed: true
      })
    ]
  }));

  assert.equal(report.appendOnlyAuditPlanPolicyAccepted, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.safety.noSideEffects, false);
  assert.equal(report.safety.rawPrivateMemoryExposed, true);
  assert.equal(report.familyReports[0].accepted, false);
  assert.equal(report.familyReports[1].accepted, false);
});
