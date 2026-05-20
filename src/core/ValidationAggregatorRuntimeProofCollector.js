const {
  EXPECTED_MANIFEST_VERSION: SOURCE_REGISTRY_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: SOURCE_REGISTRY_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: SOURCE_REGISTRY_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_SOURCE_REGISTRY_IDS,
  evaluateValidationAggregatorSourceRegistryProof
} = require('./ValidationAggregatorSourceRegistryProofContract');
const {
  EXPECTED_MANIFEST_VERSION: EVIDENCE_FRESHNESS_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: EVIDENCE_FRESHNESS_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: EVIDENCE_FRESHNESS_SCHEMA_VERSION,
  evaluateValidationAggregatorEvidenceFreshnessProof
} = require('./ValidationAggregatorEvidenceFreshnessProofContract');
const {
  EXPECTED_MANIFEST_VERSION: BASELINE_BINDING_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: BASELINE_BINDING_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: BASELINE_BINDING_SCHEMA_VERSION,
  evaluateValidationAggregatorBaselineBindingProof
} = require('./ValidationAggregatorBaselineBindingProofContract');
const {
  EXPECTED_MANIFEST_VERSION: RUNTIME_SUMMARY_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: RUNTIME_SUMMARY_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: RUNTIME_SUMMARY_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: RUNTIME_SUMMARY_PUBLIC_MCP_TOOLS,
  evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof
} = require('./ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofContract');
const {
  EXPECTED_MANIFEST_VERSION: MISSING_STALE_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: MISSING_STALE_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: MISSING_STALE_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: MISSING_STALE_PUBLIC_MCP_TOOLS,
  REQUIRED_EVIDENCE_GROUPS,
  evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof
} = require('./ValidationAggregatorMissingStaleEvidenceFailClosedProofContract');
const {
  EXPECTED_MANIFEST_VERSION: UNSUPPORTED_SOURCE_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: UNSUPPORTED_SOURCE_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: UNSUPPORTED_SOURCE_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: UNSUPPORTED_SOURCE_PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_CASES: UNSUPPORTED_SOURCE_REQUIRED_FAIL_CLOSED_CASES,
  SUPPORTED_SOURCE_CLASSES,
  SUPPORTED_SOURCE_TYPES,
  evaluateValidationAggregatorUnsupportedSourceFailClosedProof
} = require('./ValidationAggregatorUnsupportedSourceFailClosedProofContract');
const {
  EXPECTED_MANIFEST_VERSION: NO_TOUCH_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: NO_TOUCH_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: NO_TOUCH_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: NO_TOUCH_PUBLIC_MCP_TOOLS,
  REQUIRED_DISALLOWED_IMPORTS,
  REQUIRED_DISALLOWED_RUNTIME_CALLS,
  REQUIRED_FAIL_CLOSED_CASES: NO_TOUCH_REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_TARGET_FAMILIES,
  evaluateValidationAggregatorNoTouchBoundaryProof
} = require('./ValidationAggregatorNoTouchBoundaryProofContract');
const {
  EXPECTED_MANIFEST_VERSION: READINESS_OVERCLAIM_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: READINESS_OVERCLAIM_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: READINESS_OVERCLAIM_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: READINESS_OVERCLAIM_PUBLIC_MCP_TOOLS,
  REQUIRED_ALLOWED_EVIDENCE_POSTURE,
  REQUIRED_DISALLOWED_READINESS_POSTURE,
  REQUIRED_FAIL_CLOSED_CASES: READINESS_OVERCLAIM_REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_READINESS_CLAIMS,
  evaluateValidationAggregatorReadinessOverclaimRejectionProof
} = require('./ValidationAggregatorReadinessOverclaimRejectionProofContract');
const {
  EXPECTED_MANIFEST_VERSION: GOVERNANCE_LOOP_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: GOVERNANCE_LOOP_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: GOVERNANCE_LOOP_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: GOVERNANCE_LOOP_PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_STATES,
  REQUIRED_DISALLOWED_WORK,
  REQUIRED_FAIL_CLOSED_CASES: GOVERNANCE_LOOP_REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_RUNTIME_EVIDENCE_GROUPS,
  REQUIRED_STAGE_IDS,
  evaluateValidationAggregatorGovernanceRuntimeLoopGap
} = require('./ValidationAggregatorGovernanceRuntimeLoopGapContract');
const {
  EXPECTED_MANIFEST_VERSION: RECALL_ISOLATION_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: RECALL_ISOLATION_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: RECALL_ISOLATION_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: RECALL_ISOLATION_PUBLIC_MCP_TOOLS,
  REQUIRED_DISALLOWED_WORK: RECALL_ISOLATION_REQUIRED_DISALLOWED_WORK,
  REQUIRED_FAIL_CLOSED_CASES: RECALL_ISOLATION_REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_ISOLATED_RECORD_FAMILIES,
  REQUIRED_PROOF_SURFACES,
  REQUIRED_RUNTIME_EVIDENCE_GROUPS: RECALL_ISOLATION_REQUIRED_RUNTIME_EVIDENCE_GROUPS,
  evaluateValidationAggregatorRecallIsolationRuntimeProof
} = require('./ValidationAggregatorRecallIsolationRuntimeProofContract');
const {
  DENIED_SOURCE_TYPES: MIGRATION_APPROVAL_DENIED_SOURCE_TYPES,
  EXPECTED_MANIFEST_VERSION: MIGRATION_APPROVAL_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: MIGRATION_APPROVAL_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: MIGRATION_APPROVAL_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS: MIGRATION_APPROVAL_PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_EVIDENCE: MIGRATION_APPROVAL_REQUIRED_APPROVAL_EVIDENCE,
  REQUIRED_APPROVAL_STATE_IDS: MIGRATION_APPROVAL_REQUIRED_APPROVAL_STATE_IDS,
  REQUIRED_BLOCKED_ACTIONS: MIGRATION_APPROVAL_REQUIRED_BLOCKED_ACTIONS,
  REQUIRED_FAIL_CLOSED_STATES: MIGRATION_APPROVAL_REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_FRAMEWORK_STAGE_IDS: MIGRATION_APPROVAL_REQUIRED_FRAMEWORK_STAGE_IDS,
  REQUIRED_SOURCE_EVIDENCE_IDS: MIGRATION_APPROVAL_REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES: MIGRATION_APPROVAL_SAFE_SOURCE_TYPES,
  evaluateMigrationImportExportBackupRestoreApproval
} = require('./MigrationImportExportBackupRestoreApprovalContract');

const COLLECTOR_SCHEMA_VERSION = 'validation-aggregator-runtime-proof-collector-v1';

function hasOwnObject(value, key) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.hasOwn(value, key);
}

function buildSourceRegistryProofInput(patch = {}) {
  return {
    schemaVersion: SOURCE_REGISTRY_SCHEMA_VERSION,
    policyVersion: SOURCE_REGISTRY_POLICY_VERSION,
    manifestVersion: SOURCE_REGISTRY_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_input',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    sourceRegistry: REQUIRED_SOURCE_REGISTRY_IDS.map(id => ({
      id,
      sourceType: 'local_safe_evidence',
      sourceClass: id.endsWith('_evidence') ? id.replace(/_evidence$/, '') : id,
      evidenceRef: `validation-aggregator:${id}`,
      freshnessBound: true,
      baselineBound: true,
      runtimeAuthority: false,
      readinessAuthority: false
    })),
    failClosedReasons: [],
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      sourceRegistryProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildEvidenceFreshnessProofInput(patch = {}) {
  const asOf = patch.asOf || '2026-05-20T00:00:00.000Z';
  const baselineCommit = patch.expectedBaselineCommit ||
    '0000000000000000000000000000000000000000';
  const sourceRegistryVersion = patch.expectedSourceRegistryVersion ||
    'validation-aggregator-source-registry-v1';

  return {
    schemaVersion: EVIDENCE_FRESHNESS_SCHEMA_VERSION,
    policyVersion: EVIDENCE_FRESHNESS_POLICY_VERSION,
    manifestVersion: EVIDENCE_FRESHNESS_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_input',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    asOf,
    expectedBaselineCommit: baselineCommit,
    expectedSourceRegistryVersion: sourceRegistryVersion,
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    evidenceRecords: [
      {
        evidence_id: 'validation-aggregator-source-registry-proof',
        source_id: 'source_registry_proof',
        source_kind: 'local_safe_collector_unit',
        source_registry_version: sourceRegistryVersion,
        baseline_commit: baselineCommit,
        evidence_generated_at: '2026-05-20T00:00:00.000Z',
        evidence_validated_at: '2026-05-20T00:00:00.000Z',
        evidence_observed_hash:
          '0000000000000000000000000000000000000000000000000000000000000000',
        validation_status: 'passed',
        validation_ref: 'tests/validation-aggregator-runtime-proof-collector.test.js'
      }
    ],
    freshnessWindows: [
      {
        source_kind: 'local_safe_collector_unit',
        max_age_ms: 604800000
      }
    ],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      evidenceFreshnessProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildBaselineBindingProofInput(patch = {}) {
  const targetCommit = patch.expectedTargetCommit ||
    '0000000000000000000000000000000000000000';

  return {
    schemaVersion: BASELINE_BINDING_SCHEMA_VERSION,
    policyVersion: BASELINE_BINDING_POLICY_VERSION,
    manifestVersion: BASELINE_BINDING_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_input',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    expectedTargetCommit: targetCommit,
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    baselineBindings: [
      {
        evidence_id: 'validation-aggregator-baseline-binding-proof',
        baseline_binding_id: 'validation-aggregator-baseline-binding-local',
        target_commit: targetCommit,
        target_commit_source: 'explicit_target_commit',
        baseline_kind: 'local_validation_target_commit',
        baseline_ref: 'validation-aggregator-runtime-proof-collector',
        evidence_subject_commit: targetCommit,
        validation_scope: 'validation-aggregator-runtime-proof-collector',
        binding_observed_at: '2026-05-20T00:00:00.000Z',
        binding_status: 'bound',
        approval_request_commit: '',
        current_main_head: '',
        execution_checkout_commit: ''
      }
    ],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      gitCheckout: false,
      gitReset: false,
      gitDetachHead: false,
      gitRemoteLookup: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      baselineBindingProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildRuntimeEvidenceSummaryNormalizationProofInput(patch = {}) {
  return {
    schemaVersion: RUNTIME_SUMMARY_SCHEMA_VERSION,
    policyVersion: RUNTIME_SUMMARY_POLICY_VERSION,
    manifestVersion: RUNTIME_SUMMARY_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_sanitized_summary_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...RUNTIME_SUMMARY_PUBLIC_MCP_TOOLS],
    runtimeEvidenceSummary: {
      status: 'passed',
      decision: 'NOT_READY_BLOCKED',
      runnerExecuted: true,
      commandsExecuted: true,
      localRuntimeEvidenceMatrixExecuted: true,
      allowlistedFinalRcEvidenceRunnerExecuted: true,
      runtimeReady: false,
      finalRcMatrixReady: false,
      fullFinalRcMatrixExecuted: false,
      v1RcReady: false,
      rcReady: false,
      criticalGates: {
        total: 12,
        passed: 12,
        failed: 0,
        allCriticalCommandsPassed: true
      },
      locallyEvidencedRuntimeGaps: [
        'runtime_schema_version_enforcement_not_fully_proven',
        'final_rc_matrix_runner_not_executed_as_real_matrix'
      ],
      remainingRuntimeGaps: [
        'validation_aggregator_full_implementation_incomplete',
        'governance_review_runtime_loop_not_executed',
        'recall_isolation_runtime_proof_not_executed',
        'migration_import_export_apply_not_approved',
        'http_operation_readiness_not_refreshed',
        'cutover_context_mainline_gate_not_executed',
        'tag_release_deploy_not_approved'
      ],
      safety: {
        mutated: false,
        providerCalls: 0,
        serviceStarted: false,
        writesDurableMemory: false,
        realMemoryPreview: false,
        remoteWrites: false,
        migrationApplied: false,
        importExportApplied: false,
        configChanged: false,
        watchdogStartupInstalled: false
      }
    },
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      runtimeEvidenceSummaryNormalizationProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildMissingStaleEvidenceFailClosedProofInput(patch = {}) {
  const providedEvidenceGroups = patch.providedEvidenceGroups ||
    [...REQUIRED_EVIDENCE_GROUPS];

  return {
    schemaVersion: MISSING_STALE_SCHEMA_VERSION,
    policyVersion: MISSING_STALE_POLICY_VERSION,
    manifestVersion: MISSING_STALE_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...MISSING_STALE_PUBLIC_MCP_TOOLS],
    asOf: '2026-05-20T00:00:00.000Z',
    freshnessWindowSeconds: 86400,
    providedEvidenceGroups,
    evidence: providedEvidenceGroups.map(group => ({
      id: `${group}-evidence`,
      group,
      status: 'passed',
      createdAt: '2026-05-19T23:55:00.000Z',
      ageSeconds: 300,
      stale: false
    })),
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawEvidencePayloadExposed: false
    },
    safety: {
      readsFiles: false,
      refreshesEvidenceImplicitly: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      missingOrStaleEvidenceFailClosedProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildUnsupportedSourceFailClosedProofInput(patch = {}) {
  const failClosedCases = patch.failClosedCases ||
    UNSUPPORTED_SOURCE_REQUIRED_FAIL_CLOSED_CASES.map(caseId => ({
      id: caseId,
      sourceType: caseId.includes('provider')
        ? 'provider_smoke_result'
        : 'unexpected_evidence_feed',
      sourceClass: caseId.includes('runtime') || caseId.includes('provider')
        ? 'runtime_evidence'
        : 'unexpected_runtime_authority',
      sourceKind: 'unsupported',
      status: 'blocked',
      decision: 'NOT_READY_BLOCKED',
      blockedReason: `${caseId}_blocked`,
      failClosed: true,
      accepted: false,
      downgradedToStatic: false,
      a5Approved: false,
      readinessAuthority: false
    }));

  return {
    schemaVersion: UNSUPPORTED_SOURCE_SCHEMA_VERSION,
    policyVersion: UNSUPPORTED_SOURCE_POLICY_VERSION,
    manifestVersion: UNSUPPORTED_SOURCE_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...UNSUPPORTED_SOURCE_PUBLIC_MCP_TOOLS],
    supportedSourceTypes: [...SUPPORTED_SOURCE_TYPES],
    supportedSourceClasses: [...SUPPORTED_SOURCE_CLASSES],
    failClosedCases,
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawSourcePayloadExposed: false
    },
    safety: {
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      unsupportedSourceFailClosedProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildNoTouchBoundaryProofInput(patch = {}) {
  const failClosedCases = patch.failClosedCases ||
    NO_TOUCH_REQUIRED_FAIL_CLOSED_CASES.map(caseId => ({
      id: caseId,
      status: 'blocked',
      decision: 'NOT_READY_BLOCKED',
      blockedReason: `${caseId}_blocked`,
      failClosed: true,
      detected: true,
      accepted: false,
      readinessAuthority: false
    }));

  return {
    schemaVersion: NO_TOUCH_SCHEMA_VERSION,
    policyVersion: NO_TOUCH_POLICY_VERSION,
    manifestVersion: NO_TOUCH_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...NO_TOUCH_PUBLIC_MCP_TOOLS],
    targetFamilies: [...REQUIRED_TARGET_FAMILIES],
    disallowedImports: [...REQUIRED_DISALLOWED_IMPORTS],
    disallowedRuntimeCalls: [...REQUIRED_DISALLOWED_RUNTIME_CALLS],
    failClosedCases,
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawSourcePayloadExposed: false
    },
    safety: {
      scansSourceAtRuntime: false,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      noTouchBoundaryProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
  };
}

function buildReadinessOverclaimRejectionProofInput(patch = {}) {
  const readinessClaims = patch.readinessClaims ||
    REQUIRED_READINESS_CLAIMS.map(claimId => ({
      id: claimId,
      claim: `${claimId}=true`,
      allowed: false,
      expectedStatus: claimId === 'rc-ready'
        ? 'blocked_rc_ready_overclaim'
        : claimId === 'cutover-ready'
          ? 'blocked_cutover_overclaim'
          : 'blocked_readiness_overclaim',
      expectedDecision: 'NOT_READY_BLOCKED',
      failClosed: true,
      readinessAuthority: false,
      requiredMissingEvidence: [`${claimId}_missing_evidence`]
    }));

  return {
    schemaVersion: READINESS_OVERCLAIM_SCHEMA_VERSION,
    policyVersion: READINESS_OVERCLAIM_POLICY_VERSION,
    manifestVersion: READINESS_OVERCLAIM_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...READINESS_OVERCLAIM_PUBLIC_MCP_TOOLS],
    readinessClaims,
    runtimeGapStatus: {
      remainingRuntimeGapCount: 7,
      allRuntimeGapsClosed: false,
      closedByThisPhase: 0,
      mustRemainBlockedWhenGapCountNonZero: true
    },
    a5HardStopStatus: {
      remainingA5HardStopCount: 16,
      allA5HardStopsCleared: false,
      clearedByThisPhase: 0,
      mustRemainBlockedWhenHardStopCountNonZero: true
    },
    failClosedCases: [...READINESS_OVERCLAIM_REQUIRED_FAIL_CLOSED_CASES],
    allowedEvidencePosture: [...REQUIRED_ALLOWED_EVIDENCE_POSTURE],
    disallowedReadinessPosture: [...REQUIRED_DISALLOWED_READINESS_POSTURE],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawSourcePayloadExposed: false
    },
    safety: {
      readsEvidenceFiles: false,
      executesCommands: false,
      runsGates: false,
      runsRunners: false,
      startsServices: false,
      callsProviders: false,
      mutatesConfig: false,
      operatesStartupWatchdog: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      exposesValidateMemoryPublicly: false,
      remoteWrites: false,
      tagReleaseDeploy: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      readinessOverclaimRejectionProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    },
    ...patch
  };
}

function buildGovernanceRuntimeLoopGapProofInput(patch = {}) {
  const stageAcceptanceCases = patch.stageAcceptanceCases ||
    REQUIRED_STAGE_IDS.map(stageId => ({
      id: stageId,
      required: true,
      inputMode: 'explicit_input',
      expectedStatus: `blocked_${stageId}`,
      canExecute: false,
      requiresA5Approval: stageId !== 'review_packet_intake',
      durableWriteAllowed: false
    }));
  const requiredRuntimeEvidenceGroups = patch.requiredRuntimeEvidenceGroups ||
    REQUIRED_RUNTIME_EVIDENCE_GROUPS.map(groupId => ({
      id: groupId,
      required: true,
      currentStatus: 'missing',
      mustFailClosedWhenMissing: true
    }));
  const approvalStates = patch.approvalStates ||
    REQUIRED_APPROVAL_STATES.map(stateId => ({
      id: stateId,
      acceptedForPlanning: stateId === 'reviewed_not_approved',
      executionAllowed: false
    }));

  return {
    schemaVersion: GOVERNANCE_LOOP_SCHEMA_VERSION,
    policyVersion: GOVERNANCE_LOOP_POLICY_VERSION,
    manifestVersion: GOVERNANCE_LOOP_MANIFEST_VERSION,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    selectedGap: {
      id: 'governance_review_approval_audit_runtime_loop_not_executed',
      priority: 2,
      currentStatus: 'open',
      remainsOpenAfterThisPhase: true,
      readinessAuthority: false,
      requiresA5ApprovalBeforeRuntime: true
    },
    evidenceGroup: {
      id: 'governance_runtime_loop_acceptance_contract',
      currentStatus: 'acceptance_defined',
      required: true,
      remainsNonRuntime: true,
      readinessAuthority: false,
      mustFailClosedWhenMissing: true,
      mustFailClosedWhenScopeMismatch: true,
      mustFailClosedWhenApprovalMissing: true,
      mustFailClosedWhenAuditRefsMissing: true,
      mustFailClosedWhenDurableWriteClaimed: true,
      mustFailClosedWhenRuntimeReadyClaimed: true
    },
    publicMcpTools: [...GOVERNANCE_LOOP_PUBLIC_MCP_TOOLS],
    loopIdentityContract: {
      loop_id: 'governance_loop_fixture_001',
      action_id: 'governed_action_fixture_001',
      review_packet_id: 'review_packet_fixture_001',
      approval_packet_id: 'approval_packet_fixture_001',
      pre_action_audit_event_id: 'audit_event_fixture_pre_001',
      decision_audit_event_id: 'audit_event_fixture_decision_001',
      post_action_audit_event_id: 'audit_event_fixture_post_001',
      correlation_id: 'governance_correlation_fixture_001',
      allRequired: true,
      mustRemainStableAcrossStages: true,
      mustFailClosedWhenMissingOrMismatched: true
    },
    scopeContract: {
      project_ref: 'project_ref_fixture_alpha',
      workspace_ref: 'workspace_ref_fixture_alpha',
      client_ref: 'client_ref_fixture_alpha',
      agent_ref: 'agent_ref_fixture_alpha',
      task_ref: 'task_ref_fixture_alpha',
      visibility: 'private',
      scopeMustMatchAcrossReviewApprovalAuditAndExecution: true,
      rawWorkspaceIdExposedInLowRiskSummary: false,
      mustFailClosedWhenScopeMissingOrMismatched: true
    },
    authorityContract: {
      approvalRequired: true,
      approvalCurrentlyGranted: false,
      approvalStatus: 'NOT_APPROVED',
      a5ApprovalRequiredBeforeRuntime: true,
      approvalMustNameActionId: true,
      approvalMustMatchScope: true,
      approvalMustNameDurableWriteIntent: true,
      warningOnlyApprovalAllowed: false,
      staleApprovalAllowed: false,
      executionAllowedByFixture: false
    },
    auditRefContract: {
      preActionAuditRefRequired: true,
      decisionAuditRefRequired: true,
      postActionAuditRefRequired: true,
      auditRefsMustPreserveEventIdentity: true,
      durableAuditWriteAllowedInFixture: false,
      rawAuditPayloadAllowedInLowRiskSummary: false,
      mustFailClosedWhenAuditRefsMissingOrMismatched: true
    },
    stageAcceptanceCases,
    requiredRuntimeEvidenceGroups,
    approvalStates,
    failClosedCases: [...GOVERNANCE_LOOP_REQUIRED_FAIL_CLOSED_CASES],
    disallowedWork: [...REQUIRED_DISALLOWED_WORK],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawGovernancePayloadExposed: false
    },
    safety: {
      noRuntimeImplementation: true,
      noGovernanceLoopExecution: true,
      noGovernedActionExecution: true,
      noApprovalExecution: true,
      noCommandExecution: true,
      noGateExecution: true,
      noRunnerExecution: true,
      noServiceStart: true,
      noProviderCall: true,
      noConfigMutation: true,
      noStartupWatchdogOperation: true,
      noRealMemoryPreview: true,
      noRealGovernancePacketRead: true,
      noRealAuditLogRead: true,
      noRuntimeStoreScan: true,
      noDurableMemoryWrite: true,
      noDurableAuditWrite: true,
      noMigrationApply: true,
      noImportExportApply: true,
      noPublicMcpExpansion: true,
      noPackageChange: true,
      noSecretChange: true,
      noRemoteWrite: true,
      noTagReleaseDeploy: true
    },
    readiness: {
      validationAggregatorFullImplementationReady: false,
      governanceRuntimeLoopReady: false,
      governanceRuntimeLoopExecuted: false,
      approvalExecutionReady: false,
      auditWriterReady: false,
      durableWriteReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    },
    ...patch
  };
}

function buildRecallIsolationRecordFamilyCases(overrides = {}) {
  return REQUIRED_ISOLATED_RECORD_FAMILIES.map(id => ({
    id,
    required: true,
    currentStatus: 'acceptance_defined_not_runtime_executed',
    mustBeExcludedFromAllProofSurfaces: true,
    mustFailClosedWhenObserved: true,
    ...overrides[id]
  }));
}

function buildRecallIsolationProofSurfaceCases(overrides = {}) {
  return REQUIRED_PROOF_SURFACES.map(id => ({
    id,
    required: true,
    runtimeStoreReadAllowed: false,
    contaminationAllowed: false,
    syntheticEvidenceAllowed: true,
    realDataEvidenceAllowed: false,
    futureEvidenceRequired: true,
    ...overrides[id]
  }));
}

function buildRecallIsolationRuntimeEvidenceGroups(overrides = {}) {
  return RECALL_ISOLATION_REQUIRED_RUNTIME_EVIDENCE_GROUPS.map(id => ({
    id,
    required: true,
    currentStatus: 'missing',
    mustFailClosedWhenMissing: true,
    ...overrides[id]
  }));
}

function buildRecallIsolationControlCases(overrides = {}) {
  return [
    {
      id: 'active_in_scope_user_memory_positive_control',
      recordFamily: 'active_in_scope_user_memory',
      required: true,
      mayEnterNormalRecall: true,
      mayEnterVectorIndex: true,
      mayEnterCandidateCache: true,
      mayEnterRanking: true,
      mayEnterProjection: true,
      mayEnterUserVisibleAuditSummary: true,
      mayEnterRecallAuditSummary: true,
      ...overrides.positive
    },
    {
      id: 'isolated_record_negative_controls',
      recordFamilies: [...REQUIRED_ISOLATED_RECORD_FAMILIES],
      required: true,
      mayEnterNormalRecall: false,
      mayEnterVectorIndex: false,
      mayEnterCandidateCache: false,
      mayEnterRanking: false,
      mayEnterProjection: false,
      mayEnterUserVisibleAuditSummary: false,
      mayEnterRecallAuditSummary: false,
      ...overrides.negative
    }
  ];
}

function buildRecallIsolationRuntimeProofInput(patch = {}) {
  return {
    schemaVersion: RECALL_ISOLATION_SCHEMA_VERSION,
    policyVersion: RECALL_ISOLATION_POLICY_VERSION,
    manifestVersion: RECALL_ISOLATION_MANIFEST_VERSION,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    selectedGap: {
      id: 'recall_isolation_runtime_proof_not_executed',
      priority: 3,
      currentStatus: 'open',
      requiresA5ApprovalBeforeRuntime: true,
      remainsOpenAfterThisPhase: true,
      readinessAuthority: false
    },
    sourcePlan: {
      phase: 'P66.42-validation-aggregator-recall-isolation-runtime-proof-gap-planning',
      fixture: 'tests/fixtures/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-v1.json',
      test: 'tests/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-fixture.test.js',
      runtimeAuthority: false,
      readinessAuthority: false
    },
    validationAggregatorFullImplementation: false,
    recallIsolationRuntimeProofReady: false,
    recallIsolationRuntimeProofExecuted: false,
    contaminationReportReady: false,
    contaminationReportProduced: false,
    realMemoryScanned: false,
    runtimeStoreScanned: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    cutoverReady: false,
    publicToolsFrozen: true,
    publicTools: [...RECALL_ISOLATION_PUBLIC_MCP_TOOLS],
    internalOnlyTools: ['validate_memory'],
    isolatedRecordFamilyAcceptanceCases: buildRecallIsolationRecordFamilyCases(),
    proofSurfaceAcceptanceCases: buildRecallIsolationProofSurfaceCases(),
    controlCases: buildRecallIsolationControlCases(),
    requiredRuntimeEvidenceGroups: buildRecallIsolationRuntimeEvidenceGroups(),
    failClosedCases: [...RECALL_ISOLATION_REQUIRED_FAIL_CLOSED_CASES],
    disallowedWork: [...RECALL_ISOLATION_REQUIRED_DISALLOWED_WORK],
    safety: {
      mutated: false,
      fixtureOnly: true,
      acceptanceContractOnly: true,
      noRuntimeImplementation: true,
      noRuntimeProofExecution: true,
      noRecallExecution: true,
      noRealMemoryRead: true,
      noRealMemoryScan: true,
      noDiaryScan: true,
      noSqliteScan: true,
      noVectorIndexScan: true,
      noCandidateCacheScan: true,
      noRecallAuditScan: true,
      noRuntimeStoreScan: true,
      noContaminationReportFromRealData: true,
      noCommandExecution: true,
      noGateExecution: true,
      noRunnerExecution: true,
      noServiceStart: true,
      noProviderCall: true,
      noConfigMutation: true,
      noStartupWatchdogOperation: true,
      noDurableMemoryWrite: true,
      noDurableAuditWrite: true,
      noMigrationApply: true,
      noImportExportApply: true,
      noBackupRestoreApply: true,
      noPublicMcpExpansion: true,
      noPackageChange: true,
      noSecretChange: true,
      noRemoteWrite: true,
      noTagReleaseDeploy: true
    },
    readiness: {
      validationAggregatorFullImplementationReady: false,
      recallIsolationRuntimeProofReady: false,
      recallIsolationRuntimeProofExecuted: false,
      contaminationReportReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    },
    ...patch
  };
}

function buildMigrationApprovalSourceEvidence(overrides = {}) {
  return MIGRATION_APPROVAL_REQUIRED_SOURCE_EVIDENCE_IDS.map(id => ({
    id,
    sourceType: 'synthetic_fixture',
    artifactRefs: [`validation-aggregator:${id}`],
    runtimeAuthority: false,
    readinessAuthority: false,
    executionAuthority: false,
    ...overrides[id]
  }));
}

function buildMigrationApprovalFrameworkStages(overrides = {}) {
  return MIGRATION_APPROVAL_REQUIRED_FRAMEWORK_STAGE_IDS.map(id => ({
    id,
    operationFamily: id.replace(/_review$|_gate$/g, ''),
    inputMode: 'explicit_input',
    acceptedSources: id === 'source_scope_review'
      ? [...MIGRATION_APPROVAL_SAFE_SOURCE_TYPES]
      : [],
    executionAllowed: false,
    durableWriteAllowed: false,
    requiresExplicitA5Approval: true,
    ...overrides[id]
  }));
}

function buildMigrationApprovalStates(overrides = {}) {
  const planningStates = new Set([
    'not_requested',
    'reviewed_not_executable',
    'approved_but_a5_blocked'
  ]);

  return MIGRATION_APPROVAL_REQUIRED_APPROVAL_STATE_IDS.map(id => ({
    id,
    acceptedForPlanning: planningStates.has(id),
    executionAllowed: false,
    ...overrides[id]
  }));
}

function buildMigrationImportExportBackupRestoreApprovalProofInput(patch = {}) {
  return {
    schemaVersion: MIGRATION_APPROVAL_SCHEMA_VERSION,
    policyVersion: MIGRATION_APPROVAL_POLICY_VERSION,
    manifestVersion: MIGRATION_APPROVAL_MANIFEST_VERSION,
    fixtureOnly: true,
    synthetic: true,
    localOnly: true,
    dryRunOnly: true,
    boundaryInventoryOnly: true,
    runtimeIntegrated: false,
    approvalFrameworkImplemented: false,
    approvalExecutionReady: false,
    approvalExecuted: false,
    migrationFrameworkReady: false,
    migrationApplyReady: false,
    importExportFrameworkReady: false,
    importExportApplyReady: false,
    backupRestoreFrameworkReady: false,
    backupRestoreApplyReady: false,
    migrationApplied: false,
    importApplied: false,
    exportApplied: false,
    backupCreated: false,
    restorePerformed: false,
    realMemoryScanned: false,
    runtimeStoreScanned: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    publicMcpExpanded: false,
    providerCalls: 0,
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: true,
    publicMcpTools: [...MIGRATION_APPROVAL_PUBLIC_MCP_TOOLS],
    allowedSourceTypes: [...MIGRATION_APPROVAL_SAFE_SOURCE_TYPES],
    deniedSourceTypes: [...MIGRATION_APPROVAL_DENIED_SOURCE_TYPES],
    sourceEvidence: buildMigrationApprovalSourceEvidence(),
    frameworkStages: buildMigrationApprovalFrameworkStages(),
    approvalStates: buildMigrationApprovalStates(),
    requiredApprovalEvidence: [...MIGRATION_APPROVAL_REQUIRED_APPROVAL_EVIDENCE],
    unsatisfiedApprovalEvidence: [...MIGRATION_APPROVAL_REQUIRED_APPROVAL_EVIDENCE],
    failClosedStates: [...MIGRATION_APPROVAL_REQUIRED_FAIL_CLOSED_STATES],
    blockedActions: [...MIGRATION_APPROVAL_REQUIRED_BLOCKED_ACTIONS],
    forbiddenClaims: [
      'migration-ready',
      'import-export-ready',
      'backup-restore-ready',
      'runtime-ready',
      'v1-rc-ready'
    ],
    safety: {
      readsFilesImplicitly: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      localBoundaryInventoryReady: true,
      approvalFrameworkReady: false,
      approvalExecutionReady: false,
      migrationFrameworkReady: false,
      importExportFrameworkReady: false,
      backupRestoreFrameworkReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false
    },
    ...patch
  };
}

function buildNotSuppliedUnit(id) {
  return {
    id,
    status: 'not_supplied',
    executed: false,
    accepted: false,
    failClosedReasons: ['missing_explicit_input'],
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false
  };
}

function collectValidationAggregatorRuntimeProofUnits(inputs = {}) {
  const safeInputs = inputs && typeof inputs === 'object' && !Array.isArray(inputs)
    ? inputs
    : {};
  const units = {};

  if (hasOwnObject(safeInputs, 'sourceRegistryProof')) {
    const result = evaluateValidationAggregatorSourceRegistryProof(
      safeInputs.sourceRegistryProof
    );
    units.sourceRegistryProof = {
      id: 'source_registry_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      sourceRegistry: result.sourceRegistry,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.sourceRegistryProof = buildNotSuppliedUnit('source_registry_proof');
  }

  if (hasOwnObject(safeInputs, 'evidenceFreshnessProof')) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(
      safeInputs.evidenceFreshnessProof
    );
    units.evidenceFreshnessProof = {
      id: 'evidence_freshness_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      evidenceFreshness: result.evidenceFreshness,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.evidenceFreshnessProof = buildNotSuppliedUnit('evidence_freshness_proof');
  }

  if (hasOwnObject(safeInputs, 'baselineBindingProof')) {
    const result = evaluateValidationAggregatorBaselineBindingProof(
      safeInputs.baselineBindingProof
    );
    units.baselineBindingProof = {
      id: 'baseline_binding_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      baselineBinding: result.baselineBinding,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.baselineBindingProof = buildNotSuppliedUnit('baseline_binding_proof');
  }

  if (hasOwnObject(safeInputs, 'runtimeEvidenceSummaryNormalizationProof')) {
    const result = evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(
      safeInputs.runtimeEvidenceSummaryNormalizationProof
    );
    units.runtimeEvidenceSummaryNormalizationProof = {
      id: 'runtime_evidence_summary_normalization_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      runtimeEvidenceSummary: result.runtimeEvidenceSummary,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.runtimeEvidenceSummaryNormalizationProof = buildNotSuppliedUnit(
      'runtime_evidence_summary_normalization_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'missingStaleEvidenceFailClosedProof')) {
    const result = evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(
      safeInputs.missingStaleEvidenceFailClosedProof
    );
    units.missingStaleEvidenceFailClosedProof = {
      id: 'missing_or_stale_evidence_fail_closed_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      summary: result.summary,
      missingRequiredEvidenceGroups: result.missingRequiredEvidenceGroups,
      staleRequiredEvidenceGroups: result.staleRequiredEvidenceGroups,
      duplicateEvidenceGroups: result.duplicateEvidenceGroups,
      unknownEvidenceGroups: result.unknownEvidenceGroups,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.missingStaleEvidenceFailClosedProof = buildNotSuppliedUnit(
      'missing_or_stale_evidence_fail_closed_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'unsupportedSourceFailClosedProof')) {
    const result = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(
      safeInputs.unsupportedSourceFailClosedProof
    );
    units.unsupportedSourceFailClosedProof = {
      id: 'unsupported_source_fail_closed_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      summary: result.summary,
      missingRequiredFailClosedCases: result.missingRequiredFailClosedCases,
      duplicateFailClosedCases: result.duplicateFailClosedCases,
      unknownFailClosedCases: result.unknownFailClosedCases,
      acceptedUnsupportedCases: result.acceptedUnsupportedCases,
      downgradedUnsupportedCases: result.downgradedUnsupportedCases,
      unblockedRuntimeCases: result.unblockedRuntimeCases,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.unsupportedSourceFailClosedProof = buildNotSuppliedUnit(
      'unsupported_source_fail_closed_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'noTouchBoundaryProof')) {
    const result = evaluateValidationAggregatorNoTouchBoundaryProof(
      safeInputs.noTouchBoundaryProof
    );
    units.noTouchBoundaryProof = {
      id: 'no_touch_boundary_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      summary: result.summary,
      missingRequiredFailClosedCases: result.missingRequiredFailClosedCases,
      duplicateFailClosedCases: result.duplicateFailClosedCases,
      unknownFailClosedCases: result.unknownFailClosedCases,
      unsafeCasesNotBlocked: result.unsafeCasesNotBlocked,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.noTouchBoundaryProof = buildNotSuppliedUnit(
      'no_touch_boundary_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'readinessOverclaimRejectionProof')) {
    const result = evaluateValidationAggregatorReadinessOverclaimRejectionProof(
      safeInputs.readinessOverclaimRejectionProof
    );
    units.readinessOverclaimRejectionProof = {
      id: 'readiness_overclaim_rejection_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      summary: result.summary,
      missingRequiredReadinessClaims: result.missingRequiredReadinessClaims,
      duplicateReadinessClaims: result.duplicateReadinessClaims,
      unknownReadinessClaims: result.unknownReadinessClaims,
      readinessClaimsNotRejected: result.readinessClaimsNotRejected,
      missingRequiredFailClosedCases: result.missingRequiredFailClosedCases,
      duplicateFailClosedCases: result.duplicateFailClosedCases,
      unknownFailClosedCases: result.unknownFailClosedCases,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.readinessOverclaimRejectionProof = buildNotSuppliedUnit(
      'readiness_overclaim_rejection_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'governanceRuntimeLoopGapProof')) {
    const result = evaluateValidationAggregatorGovernanceRuntimeLoopGap(
      safeInputs.governanceRuntimeLoopGapProof
    );
    units.governanceRuntimeLoopGapProof = {
      id: 'governance_runtime_loop_gap_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      summary: result.summary,
      missingRequiredStages: result.missingRequiredStages,
      stagesAllowingExecution: result.stagesAllowingExecution,
      missingRequiredRuntimeEvidenceGroups: result.missingRequiredRuntimeEvidenceGroups,
      runtimeEvidenceGroupsNotMissing: result.runtimeEvidenceGroupsNotMissing,
      missingRequiredApprovalStates: result.missingRequiredApprovalStates,
      approvalStatesAllowingExecution: result.approvalStatesAllowingExecution,
      missingRequiredFailClosedCases: result.missingRequiredFailClosedCases,
      missingRequiredDisallowedWork: result.missingRequiredDisallowedWork,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.governanceRuntimeLoopGapProof = buildNotSuppliedUnit(
      'governance_runtime_loop_gap_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'recallIsolationRuntimeProof')) {
    const result = evaluateValidationAggregatorRecallIsolationRuntimeProof(
      safeInputs.recallIsolationRuntimeProof
    );
    units.recallIsolationRuntimeProof = {
      id: 'recall_isolation_runtime_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      summary: result.summary,
      missingIsolatedRecordFamilies: result.missingIsolatedRecordFamilies,
      duplicateIsolatedRecordFamilies: result.duplicateIsolatedRecordFamilies,
      unknownIsolatedRecordFamilies: result.unknownIsolatedRecordFamilies,
      unsafeIsolatedRecordFamilies: result.unsafeIsolatedRecordFamilies,
      missingProofSurfaces: result.missingProofSurfaces,
      duplicateProofSurfaces: result.duplicateProofSurfaces,
      unknownProofSurfaces: result.unknownProofSurfaces,
      unsafeProofSurfaces: result.unsafeProofSurfaces,
      missingRequiredRuntimeEvidence: result.missingRequiredRuntimeEvidence,
      duplicateRuntimeEvidence: result.duplicateRuntimeEvidence,
      unknownRuntimeEvidence: result.unknownRuntimeEvidence,
      runtimeEvidenceNotMissing: result.runtimeEvidenceNotMissing,
      missingRequiredFailClosedCases: result.missingRequiredFailClosedCases,
      missingRequiredDisallowedWork: result.missingRequiredDisallowedWork,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.recallIsolationRuntimeProof = buildNotSuppliedUnit(
      'recall_isolation_runtime_proof'
    );
  }

  if (hasOwnObject(safeInputs, 'migrationImportExportBackupRestoreApprovalProof')) {
    const result = evaluateMigrationImportExportBackupRestoreApproval(
      safeInputs.migrationImportExportBackupRestoreApprovalProof
    );
    units.migrationImportExportBackupRestoreApprovalProof = {
      id: 'migration_import_export_backup_restore_approval_proof',
      status: result.status,
      executed: true,
      accepted: result.acceptedForPlanning === true,
      failClosedReasons: result.failClosedReasons,
      sourceTypes: result.sourceTypes,
      sourceEvidence: result.sourceEvidence,
      frameworkStages: result.frameworkStages,
      approvalStates: result.approvalStates,
      approvalEvidence: result.approvalEvidence,
      safety: result.safety,
      readiness: result.readiness,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    };
  } else {
    units.migrationImportExportBackupRestoreApprovalProof = buildNotSuppliedUnit(
      'migration_import_export_backup_restore_approval_proof'
    );
  }

  const unitValues = Object.values(units);
  const executedUnitCount = unitValues.filter(unit => unit.executed).length;
  const acceptedUnitCount = unitValues.filter(unit => unit.accepted).length;
  const rejectedUnitCount = unitValues.filter(unit => unit.executed && !unit.accepted).length;
  const missingUnitCount = unitValues.filter(unit => !unit.executed).length;

  return {
    schemaVersion: COLLECTOR_SCHEMA_VERSION,
    mode: 'read-only',
    sourceMode: 'explicit_input_only',
    implemented: true,
    fullImplementationComplete: false,
    status: acceptedUnitCount > 0
      ? 'runtime_proof_collector_partial_evidence_accepted_not_ready'
      : 'runtime_proof_collector_waiting_for_explicit_evidence',
    decision: 'NOT_READY_BLOCKED',
    summary: {
      availableUnitCount: unitValues.length,
      executedUnitCount,
      acceptedUnitCount,
      rejectedUnitCount,
      missingUnitCount,
      sourceRegistryProofAccepted: units.sourceRegistryProof.accepted,
      evidenceFreshnessProofAccepted: units.evidenceFreshnessProof.accepted,
      baselineBindingProofAccepted: units.baselineBindingProof.accepted,
      runtimeEvidenceSummaryNormalizationProofAccepted:
        units.runtimeEvidenceSummaryNormalizationProof.accepted,
      missingStaleEvidenceFailClosedProofAccepted:
        units.missingStaleEvidenceFailClosedProof.accepted,
      unsupportedSourceFailClosedProofAccepted:
        units.unsupportedSourceFailClosedProof.accepted,
      noTouchBoundaryProofAccepted:
        units.noTouchBoundaryProof.accepted,
      readinessOverclaimRejectionProofAccepted:
        units.readinessOverclaimRejectionProof.accepted,
      governanceRuntimeLoopGapProofAccepted:
        units.governanceRuntimeLoopGapProof.accepted,
      recallIsolationRuntimeProofAccepted:
        units.recallIsolationRuntimeProof.accepted,
      migrationImportExportBackupRestoreApprovalProofAccepted:
        units.migrationImportExportBackupRestoreApprovalProof.accepted,
      validationAggregatorFullImplementation: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    units,
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false
  };
}

module.exports = {
  COLLECTOR_SCHEMA_VERSION,
  buildBaselineBindingProofInput,
  buildEvidenceFreshnessProofInput,
  buildGovernanceRuntimeLoopGapProofInput,
  buildMigrationImportExportBackupRestoreApprovalProofInput,
  buildMissingStaleEvidenceFailClosedProofInput,
  buildNoTouchBoundaryProofInput,
  buildRecallIsolationRuntimeProofInput,
  buildReadinessOverclaimRejectionProofInput,
  buildRuntimeEvidenceSummaryNormalizationProofInput,
  buildSourceRegistryProofInput,
  buildUnsupportedSourceFailClosedProofInput,
  collectValidationAggregatorRuntimeProofUnits
};
