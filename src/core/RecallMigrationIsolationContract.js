const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const EXPECTED_SCHEMA_VERSION = 'p43-recall-migration-isolation-contract-v1';

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_fixture',
  'committed_test',
  'committed_doc',
  'synthetic_fixture',
  'sanitized_metadata',
  'explicit_input'
]);

const REQUIRED_ISOLATED_RECORD_KINDS = Object.freeze([
  'governance_record',
  'validation_transcript',
  'redaction_sample',
  'policy_decision',
  'blocked_memory',
  'tombstoned_memory',
  'out_of_scope_memory',
  'readiness_report',
  'synthetic_migration_metadata'
]);

const REQUIRED_MIGRATION_ALLOWED_SOURCES = Object.freeze([
  'synthetic_fixture',
  'sanitized_metadata'
]);

const REQUIRED_MIGRATION_DENIED_SOURCES = Object.freeze([
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'provider_output'
]);

const BLOCKED_ACTIONS = Object.freeze([
  'real_memory_content_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'diary_scan',
  'sqlite_scan',
  'vector_index_scan',
  'candidate_cache_scan',
  'recall_audit_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore',
  'provider_call',
  'service_start',
  'config_switch',
  'watchdog_install',
  'public_mcp_expansion',
  'dependency_change',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeRecallIntegration',
  'noMigrationRuntimeIntegration',
  'noVectorIndexIntegration',
  'noCandidateCacheIntegration',
  'noRankingIntegration',
  'noProjectionIntegration',
  'noAuditSummaryIntegration',
  'noCommandExecution',
  'noDurableMemoryWrite',
  'noDurableAuditWrite',
  'noPublicMcpExpansion',
  'noRealMemoryContentRead',
  'noRealMemoryPreview',
  'noRealMemoryExport',
  'noRealMemoryImport',
  'noRealMemoryScan',
  'noRuntimeStoreScan',
  'noMigrationApply',
  'noBackupRestore',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noDependencyChange',
  'noRemoteWrite'
]);

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

function redactIsolationString(value) {
  return redactSensitiveFragments(value)
    .replace(/[A-Z]:[\\/][^"',;\s]+/gi, '<redacted>')
    .replace(/https?:\/\/[^"',;\s]+/gi, '<redacted>')
    .replace(/\.env\b/gi, '<redacted>')
    .replace(/\bworkspace_id\s*[:=]\s*["']?[^"',;\s]+["']?/gi, '<redacted>')
    .replace(/\bworkspace_id\b/gi, '<redacted>');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactIsolationString(value.trim()) : '';
}

function normalizeStringArray(values) {
  return cloneArray(values)
    .map(normalizeString)
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeIsolationRule(rule = {}) {
  const safeRule = isPlainObject(rule) ? rule : {};

  return {
    id: normalizeString(safeRule.id),
    recordKind: normalizeString(safeRule.recordKind),
    namespace: normalizeString(safeRule.namespace),
    sourceType: normalizeString(safeRule.sourceType),
    acceptedForPlanning: normalizeBoolean(safeRule.acceptedForPlanning),
    entersNormalRecall: normalizeBoolean(safeRule.entersNormalRecall),
    entersVectorIndex: normalizeBoolean(safeRule.entersVectorIndex),
    entersCandidateCache: normalizeBoolean(safeRule.entersCandidateCache),
    entersRanking: normalizeBoolean(safeRule.entersRanking),
    entersProjection: normalizeBoolean(safeRule.entersProjection),
    entersUserVisibleAuditSummary: normalizeBoolean(safeRule.entersUserVisibleAuditSummary),
    runtimeIntegrated: normalizeBoolean(safeRule.runtimeIntegrated),
    reasonCode: normalizeString(safeRule.reasonCode)
  };
}

function normalizeMigrationDryRun(dryRun = {}) {
  const safeDryRun = isPlainObject(dryRun) ? dryRun : {};

  return {
    sourceType: normalizeString(safeDryRun.sourceType),
    allowedSources: normalizeStringArray(safeDryRun.allowedSources),
    deniedSources: normalizeStringArray(safeDryRun.deniedSources),
    acceptedForPlanning: normalizeBoolean(safeDryRun.acceptedForPlanning),
    dryRunRepresentsRealMemory: normalizeBoolean(safeDryRun.dryRunRepresentsRealMemory),
    dryRunAuthorizesApply: normalizeBoolean(safeDryRun.dryRunAuthorizesApply),
    realMemoryContentRead: normalizeBoolean(safeDryRun.realMemoryContentRead),
    realMemoryPreviewed: normalizeBoolean(safeDryRun.realMemoryPreviewed),
    migrationApplied: normalizeBoolean(safeDryRun.migrationApplied),
    importApplied: normalizeBoolean(safeDryRun.importApplied),
    exportApplied: normalizeBoolean(safeDryRun.exportApplied),
    backupCreated: normalizeBoolean(safeDryRun.backupCreated),
    restorePerformed: normalizeBoolean(safeDryRun.restorePerformed),
    failurePathExitCode: normalizeNumber(safeDryRun.failurePathExitCode),
    criticalUnknownEqualsFailure: normalizeBoolean(safeDryRun.criticalUnknownEqualsFailure),
    criticalSkippedEqualsFailure: normalizeBoolean(safeDryRun.criticalSkippedEqualsFailure),
    warningOnlyEqualsFailure: normalizeBoolean(safeDryRun.warningOnlyEqualsFailure)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};

  for (const flag of NO_SIDE_EFFECT_SAFETY_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawWorkspaceIdExposed = normalizeBoolean(safeSafety.rawWorkspaceIdExposed);
  normalized.authorizationHeaderExposed = normalizeBoolean(safeSafety.authorizationHeaderExposed);
  normalized.apiKeyExposed = normalizeBoolean(safeSafety.apiKeyExposed);
  normalized.structureLeakageApproved = normalizeBoolean(safeSafety.structureLeakageApproved);

  return normalized;
}

function normalizeRecallMigrationIsolationContract(contract = {}) {
  const safeContract = isPlainObject(contract) ? contract : {};

  return {
    schemaVersion: normalizeString(safeContract.schemaVersion),
    phase: normalizeString(safeContract.phase),
    fixtureOnly: normalizeBoolean(safeContract.fixtureOnly),
    synthetic: normalizeBoolean(safeContract.synthetic),
    explicitInputOnly: normalizeBoolean(safeContract.explicitInputOnly),
    status: normalizeString(safeContract.status),
    decision: normalizeString(safeContract.decision),
    acceptedForPlanning: normalizeBoolean(safeContract.acceptedForPlanning),
    runtimeIntegrated: normalizeBoolean(safeContract.runtimeIntegrated),
    recallRuntimeIntegrated: normalizeBoolean(safeContract.recallRuntimeIntegrated),
    migrationRuntimeIntegrated: normalizeBoolean(safeContract.migrationRuntimeIntegrated),
    vectorIndexIntegrated: normalizeBoolean(safeContract.vectorIndexIntegrated),
    candidateCacheIntegrated: normalizeBoolean(safeContract.candidateCacheIntegrated),
    rankingIntegrated: normalizeBoolean(safeContract.rankingIntegrated),
    projectionIntegrated: normalizeBoolean(safeContract.projectionIntegrated),
    auditSummaryIntegrated: normalizeBoolean(safeContract.auditSummaryIntegrated),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    durableMemoryTouched: normalizeBoolean(safeContract.durableMemoryTouched),
    durableAuditWritten: normalizeBoolean(safeContract.durableAuditWritten),
    realMemoryScanned: normalizeBoolean(safeContract.realMemoryScanned),
    providerCalls: normalizeNumber(safeContract.providerCalls),
    serviceStarted: normalizeBoolean(safeContract.serviceStarted),
    configChanged: normalizeBoolean(safeContract.configChanged),
    dependencyChanged: normalizeBoolean(safeContract.dependencyChanged),
    remoteWritten: normalizeBoolean(safeContract.remoteWritten),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    safeSourceTypes: normalizeStringArray(safeContract.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeContract.unsupportedSourceTypes),
    normalRecallNamespaces: normalizeStringArray(safeContract.normalRecallNamespaces),
    isolatedNamespaces: normalizeStringArray(safeContract.isolatedNamespaces),
    isolationRules: cloneArray(safeContract.isolationRules).map(normalizeIsolationRule),
    migrationDryRun: normalizeMigrationDryRun(safeContract.migrationDryRun),
    blockedActions: normalizeStringArray(safeContract.blockedActions),
    safety: normalizeSafety(safeContract.safety),
    requiredWording: normalizeStringArray(safeContract.requiredWording),
    forbiddenClaims: normalizeStringArray(safeContract.forbiddenClaims)
  };
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    hasEveryValue(values, requiredValues);
}

function summarizeRecallMigrationIsolationContract(contract = {}) {
  const normalized = normalizeRecallMigrationIsolationContract(contract);
  const schemaVersionSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const unsupportedAcceptedSourceTypes = normalized.acceptedSourceTypes
    .filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const unsupportedDeclaredSafeSourceTypes = normalized.safeSourceTypes
    .filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const sourceTypesWhitelisted =
    hasExactSet(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES) &&
    hasExactSet(normalized.safeSourceTypes, SAFE_SOURCE_TYPES) &&
    unsupportedAcceptedSourceTypes.length === 0 &&
    unsupportedDeclaredSafeSourceTypes.length === 0 &&
    normalized.unsupportedSourceTypes.length === 0;
  const ruleKinds = normalized.isolationRules.map(rule => rule.recordKind).filter(Boolean);
  const requiredIsolationRulesPresent = hasEveryValue(ruleKinds, REQUIRED_ISOLATED_RECORD_KINDS);
  const isolationRulesExact = hasExactSet(ruleKinds, REQUIRED_ISOLATED_RECORD_KINDS);
  const duplicateIsolationRuleKinds = uniqueValues(ruleKinds)
    .filter(kind => ruleKinds.filter(ruleKind => ruleKind === kind).length > 1);
  const isolatedNamespaceSet = new Set(normalized.isolatedNamespaces);
  const normalNamespaceSet = new Set(normalized.normalRecallNamespaces);
  const namespacesSeparated = normalized.isolatedNamespaces.length > 0 &&
    normalized.isolatedNamespaces.every(namespace => !normalNamespaceSet.has(namespace));
  const isolationRulesSafe = normalized.isolationRules.length > 0 &&
    normalized.isolationRules.every(rule =>
      REQUIRED_ISOLATED_RECORD_KINDS.includes(rule.recordKind) &&
      SAFE_SOURCE_TYPES.includes(rule.sourceType) &&
      rule.acceptedForPlanning === true &&
      isolatedNamespaceSet.has(rule.namespace) &&
      rule.entersNormalRecall === false &&
      rule.entersVectorIndex === false &&
      rule.entersCandidateCache === false &&
      rule.entersRanking === false &&
      rule.entersProjection === false &&
      rule.entersUserVisibleAuditSummary === false &&
      rule.runtimeIntegrated === false &&
      rule.reasonCode.startsWith('P43_')
    );
  const migrationAllowedSourcesPresent = hasEveryValue(
    normalized.migrationDryRun.allowedSources,
    REQUIRED_MIGRATION_ALLOWED_SOURCES
  );
  const migrationAllowedSourcesExact = hasExactSet(
    normalized.migrationDryRun.allowedSources,
    REQUIRED_MIGRATION_ALLOWED_SOURCES
  );
  const migrationDeniedSourcesPresent = hasEveryValue(
    normalized.migrationDryRun.deniedSources,
    REQUIRED_MIGRATION_DENIED_SOURCES
  );
  const migrationDeniedSourcesExact = hasExactSet(
    normalized.migrationDryRun.deniedSources,
    REQUIRED_MIGRATION_DENIED_SOURCES
  );
  const migrationSourceTypesSafe =
    normalized.migrationDryRun.allowedSources.every(sourceType =>
      REQUIRED_MIGRATION_ALLOWED_SOURCES.includes(sourceType)
    ) &&
    SAFE_SOURCE_TYPES.includes(normalized.migrationDryRun.sourceType);
  const migrationDryRunSafe =
    normalized.migrationDryRun.acceptedForPlanning === true &&
    migrationAllowedSourcesExact &&
    migrationDeniedSourcesExact &&
    migrationSourceTypesSafe &&
    normalized.migrationDryRun.dryRunRepresentsRealMemory === false &&
    normalized.migrationDryRun.dryRunAuthorizesApply === false &&
    normalized.migrationDryRun.realMemoryContentRead === false &&
    normalized.migrationDryRun.realMemoryPreviewed === false &&
    normalized.migrationDryRun.migrationApplied === false &&
    normalized.migrationDryRun.importApplied === false &&
    normalized.migrationDryRun.exportApplied === false &&
    normalized.migrationDryRun.backupCreated === false &&
    normalized.migrationDryRun.restorePerformed === false &&
    normalized.migrationDryRun.failurePathExitCode === 1 &&
    normalized.migrationDryRun.criticalUnknownEqualsFailure === true &&
    normalized.migrationDryRun.criticalSkippedEqualsFailure === true &&
    normalized.migrationDryRun.warningOnlyEqualsFailure === true;
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const blockedActionsPresent = hasEveryValue(normalized.blockedActions, BLOCKED_ACTIONS);
  const blockedActionsExact = hasExactSet(normalized.blockedActions, BLOCKED_ACTIONS);
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.authorizationHeaderExposed === false &&
    normalized.safety.apiKeyExposed === false &&
    normalized.safety.structureLeakageApproved === false;
  const noRuntimeClaims =
    normalized.runtimeIntegrated === false &&
    normalized.recallRuntimeIntegrated === false &&
    normalized.migrationRuntimeIntegrated === false &&
    normalized.vectorIndexIntegrated === false &&
    normalized.candidateCacheIntegrated === false &&
    normalized.rankingIntegrated === false &&
    normalized.projectionIntegrated === false &&
    normalized.auditSummaryIntegrated === false &&
    normalized.publicMcpExpanded === false &&
    normalized.durableMemoryTouched === false &&
    normalized.durableAuditWritten === false &&
    normalized.realMemoryScanned === false &&
    normalized.providerCalls === 0 &&
    normalized.serviceStarted === false &&
    normalized.configChanged === false &&
    normalized.dependencyChanged === false &&
    normalized.remoteWritten === false;
  const decisionBlocked =
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED';
  const acceptedForPlanning =
    schemaVersionSafe &&
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.explicitInputOnly === true &&
    normalized.acceptedForPlanning === true &&
    decisionBlocked &&
    noRuntimeClaims &&
    sourceTypesWhitelisted &&
    namespacesSeparated &&
    isolationRulesExact &&
    isolationRulesSafe &&
    migrationDryRunSafe &&
    publicMcpFrozen &&
    blockedActionsExact &&
    safetyFlagsClear;

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    phase: normalized.phase,
    acceptedForPlanning,
    decision: normalized.decision || 'NOT_READY_BLOCKED',
    status: normalized.status || 'blocked',
    runtimeReady: false,
    recallRuntimeReady: false,
    migrationRuntimeReady: false,
    finalRcMatrixReady: false,
    rcReady: false,
    publicMcpExpanded: false,
    durableMemoryTouched: false,
    durableAuditWritten: false,
    realMemoryScanned: false,
    providerCalls: 0,
    serviceStarted: false,
    configChanged: false,
    dependencyChanged: false,
    remoteWritten: false,
    sourceContract: {
      safe: sourceTypesWhitelisted,
      safeSourceTypes: SAFE_SOURCE_TYPES,
      acceptedSourceTypes: normalized.acceptedSourceTypes,
      unsupportedSourceTypes: [
        ...new Set([
          ...normalized.unsupportedSourceTypes,
          ...unsupportedAcceptedSourceTypes,
          ...unsupportedDeclaredSafeSourceTypes
        ])
      ]
    },
    namespaces: {
      normalRecallNamespaces: normalized.normalRecallNamespaces,
      isolatedNamespaces: normalized.isolatedNamespaces,
      separated: namespacesSeparated
    },
    isolationRules: {
      count: ruleKinds.length,
      recordKinds: ruleKinds,
      requiredPresent: requiredIsolationRulesPresent,
      exact: isolationRulesExact,
      safe: isolationRulesSafe,
      duplicateRecordKinds: duplicateIsolationRuleKinds,
      missingRequired: REQUIRED_ISOLATED_RECORD_KINDS.filter(kind => !ruleKinds.includes(kind))
    },
    migrationDryRun: {
      safe: migrationDryRunSafe,
      allowedSources: normalized.migrationDryRun.allowedSources,
      deniedSources: normalized.migrationDryRun.deniedSources,
      allowedSourcesPresent: migrationAllowedSourcesPresent,
      deniedSourcesPresent: migrationDeniedSourcesPresent,
      allowedSourcesExact: migrationAllowedSourcesExact,
      deniedSourcesExact: migrationDeniedSourcesExact,
      sourceTypesSafe: migrationSourceTypesSafe,
      dryRunRepresentsRealMemory: false,
      dryRunAuthorizesApply: false,
      migrationApplied: false,
      backupCreated: false,
      restorePerformed: false
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    blockedActions: {
      count: normalized.blockedActions.length,
      ids: normalized.blockedActions,
      requiredPresent: blockedActionsPresent,
      exact: blockedActionsExact,
      missingRequired: BLOCKED_ACTIONS.filter(action => !normalized.blockedActions.includes(action))
    },
    safety: {
      noSideEffects: safetyFlagsClear,
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      mutatesInput: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      touchesRecallRuntime: false,
      touchesVectorIndex: false,
      touchesCandidateCache: false,
      touchesRanking: false,
      touchesProjection: false,
      touchesAuditSummary: false,
      appliesMigration: false,
      performsBackupRestore: false,
      remoteWrites: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed,
      authorizationHeaderExposed: normalized.safety.authorizationHeaderExposed,
      apiKeyExposed: normalized.safety.apiKeyExposed,
      structureLeakageApproved: normalized.safety.structureLeakageApproved
    }
  };
}

module.exports = {
  BLOCKED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  NO_SIDE_EFFECT_SAFETY_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_ISOLATED_RECORD_KINDS,
  REQUIRED_MIGRATION_ALLOWED_SOURCES,
  REQUIRED_MIGRATION_DENIED_SOURCES,
  SAFE_SOURCE_TYPES,
  normalizeRecallMigrationIsolationContract,
  summarizeRecallMigrationIsolationContract
};
