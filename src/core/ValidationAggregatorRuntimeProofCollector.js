const {
  EXPECTED_MANIFEST_VERSION: SOURCE_REGISTRY_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION: SOURCE_REGISTRY_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION: SOURCE_REGISTRY_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_SOURCE_REGISTRY_IDS,
  evaluateValidationAggregatorSourceRegistryProof
} = require('./ValidationAggregatorSourceRegistryProofContract');

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
  buildSourceRegistryProofInput,
  collectValidationAggregatorRuntimeProofUnits
};
