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
  buildRuntimeEvidenceSummaryNormalizationProofInput,
  buildSourceRegistryProofInput,
  collectValidationAggregatorRuntimeProofUnits
};
