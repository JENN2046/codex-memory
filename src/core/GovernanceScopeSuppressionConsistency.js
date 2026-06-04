'use strict';

const {
  summarizeDeferredGovernanceScopePollutionReadPolicy
} = require('./DeferredGovernanceScopePollutionReadPolicy');
const {
  summarizeGovernanceLifecycleReadPolicyIsolation
} = require('./GovernanceLifecycleReadPolicyIsolation');

const GOVERNANCE_SCOPE_SUPPRESSION_CONSISTENCY_VERSION =
  'phase-h-governance-scope-suppression-consistency-v1';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSourceMode(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/-/g, '_') : '';
}

function rawSuppressedMetadataExposed(deferredReport = {}, lifecycleReport = {}) {
  return deferredReport?.safety?.rawPrivateMemoryExposed === true ||
    lifecycleReport.rawSuppressedMetadataExposed === true ||
    lifecycleReport?.safety?.rawPrivateMemoryExposed === true;
}

function noSideEffectsProven(deferredReport = {}, lifecycleReport = {}) {
  return deferredReport?.safety?.noSideEffects === true &&
    deferredReport.executionApproved === false &&
    deferredReport.runtimeIntegrated === false &&
    deferredReport.publicMcpExpanded === false &&
    deferredReport.readinessClaimed === false &&
    lifecycleReport?.safety?.noSideEffects === true &&
    lifecycleReport.durableMutationExecuted === false &&
    lifecycleReport.publicMcpExpanded === false &&
    lifecycleReport.readinessClaimed === false;
}

function summarizeGovernanceScopeSuppressionConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeSourceMode(safeInput.sourceMode || 'explicit_input');
  const deferredReport = summarizeDeferredGovernanceScopePollutionReadPolicy(
    safeInput.deferredPolicy
  );
  const lifecycleReport = summarizeGovernanceLifecycleReadPolicyIsolation(
    safeInput.lifecycleIsolation
  );

  const deferredPolicyAccepted = deferredReport.scopePollutionReadPolicyAccepted === true;
  const lifecycleIsolationAccepted = lifecycleReport.acceptedForReadPolicyIsolation === true;
  const publicMcpFrozen = deferredReport.publicMcpTools.frozen === true;
  const rawMetadataExposed = rawSuppressedMetadataExposed(deferredReport, lifecycleReport);
  const sideEffectsClear = noSideEffectsProven(deferredReport, lifecycleReport);

  const acceptedForGovernanceScopeSuppressionConsistency =
    sourceMode === 'explicit_input' &&
    deferredPolicyAccepted &&
    lifecycleIsolationAccepted &&
    publicMcpFrozen &&
    rawMetadataExposed === false &&
    sideEffectsClear === true;

  return {
    consistencyVersion: GOVERNANCE_SCOPE_SUPPRESSION_CONSISTENCY_VERSION,
    sourceMode,
    acceptedForGovernanceScopeSuppressionConsistency,
    decision: acceptedForGovernanceScopeSuppressionConsistency
      ? 'NO_APPLY_GOVERNANCE_SCOPE_SUPPRESSION_CONSISTENCY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    deferredPolicy: {
      accepted: deferredPolicyAccepted,
      governedFamiliesExact: deferredReport.governedFamilies.exact,
      governedFamiliesMissing: deferredReport.governedFamilies.missing,
      governedFamiliesUnexpected: deferredReport.governedFamilies.unexpected,
      publicMcpFrozen,
      requiredBlockedRecordStates: deferredReport.requiredBlockedRecordStates,
      requiredBlockedReadContexts: deferredReport.requiredBlockedReadContexts,
      familyReports: deferredReport.familyReports.map(report => ({
        family: report.family,
        accepted: report.accepted,
        missingBlockedRecordStates: report.missingBlockedRecordStates,
        missingBlockedReadContexts: report.missingBlockedReadContexts,
        rawContentExposed: report.rawContentExposed,
        normalRecallBlocked: report.normalRecallBlocked,
        candidateGenerationBlocked: report.candidateGenerationBlocked,
        cacheHitProjectionBlocked: report.cacheHitProjectionBlocked
      }))
    },
    lifecycleIsolation: {
      accepted: lifecycleIsolationAccepted,
      acceptedCount: lifecycleReport.acceptedCount,
      suppressedCount: lifecycleReport.suppressedCount,
      requiredUnsafeStatuses: lifecycleReport.requiredUnsafeStatuses,
      missingUnsafeStatuses: lifecycleReport.missingUnsafeStatuses,
      unsafeStatusAccepted: lifecycleReport.unsafeStatusAccepted,
      rawSuppressedMetadataExposed: lifecycleReport.rawSuppressedMetadataExposed
    },
    rawSuppressedMetadataExposed: rawMetadataExposed,
    noApplyInvariant: sideEffectsClear,
    runtimeApplied: false,
    memoryToolsExecuted: false,
    providerCalls: 0,
    realMemoryScanned: false,
    durableMutationExecuted: false,
    durableAuditWritten: false,
    configChanged: false,
    watchdogStartupChanged: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    blockers: {
      blockingFindings: [
        sourceMode !== 'explicit_input' ? 'source_mode_not_explicit_input' : null,
        !deferredPolicyAccepted ? 'deferred_scope_pollution_policy_not_accepted' : null,
        !lifecycleIsolationAccepted ? 'lifecycle_read_policy_isolation_not_accepted' : null,
        !publicMcpFrozen ? 'public_mcp_tools_not_frozen' : null,
        rawMetadataExposed ? 'raw_suppressed_metadata_exposed' : null,
        !sideEffectsClear ? 'no_apply_invariant_failed' : null
      ].filter(Boolean)
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsMcpTools: false,
      callsMemoryTools: false,
      callsProviders: false,
      usesBearerToken: false,
      mutatesClientConfig: false,
      mutatesWatchdogStartup: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawPrivateMemoryExposed: rawMetadataExposed
    }
  };
}

module.exports = {
  GOVERNANCE_SCOPE_SUPPRESSION_CONSISTENCY_VERSION,
  summarizeGovernanceScopeSuppressionConsistency
};
