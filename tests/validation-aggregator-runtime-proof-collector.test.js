const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

const {
  buildV1RcValidationAggregatorReport
} = require('../src/core/ValidationAggregatorService');
const {
  COLLECTOR_SCHEMA_VERSION,
  buildSourceRegistryProofInput,
  collectValidationAggregatorRuntimeProofUnits
} = require('../src/core/ValidationAggregatorRuntimeProofCollector');

test('runtime proof collector waits for explicit inputs without claiming readiness', () => {
  const report = collectValidationAggregatorRuntimeProofUnits();

  assert.equal(report.schemaVersion, COLLECTOR_SCHEMA_VERSION);
  assert.equal(report.mode, 'read-only');
  assert.equal(report.sourceMode, 'explicit_input_only');
  assert.equal(report.implemented, true);
  assert.equal(report.fullImplementationComplete, false);
  assert.equal(report.status, 'runtime_proof_collector_waiting_for_explicit_evidence');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.availableUnitCount, 1);
  assert.equal(report.summary.executedUnitCount, 0);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 1);
  assert.equal(report.units.sourceRegistryProof.status, 'not_supplied');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.v1RcReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.safety.readsFiles, false);
  assert.equal(report.safety.executesCommands, false);
  assert.equal(report.safety.startsServices, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.readsRealMemory, false);
  assert.equal(report.safety.writesDurableState, false);
});

test('runtime proof collector executes source registry proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    sourceRegistryProof: buildSourceRegistryProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.sourceRegistryProofAccepted, true);
  assert.equal(report.units.sourceRegistryProof.executed, true);
  assert.equal(report.units.sourceRegistryProof.accepted, true);
  assert.equal(report.units.sourceRegistryProof.status, 'source_registry_proof_accepted_runtime_still_blocked');
  assert.equal(report.units.sourceRegistryProof.sourceRegistry.exact, true);
  assert.deepEqual(report.units.sourceRegistryProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector fails closed for unsafe source registry proof input', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    sourceRegistryProof: buildSourceRegistryProofInput({
      safety: {
        readsFiles: false,
        scansDirectories: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: true,
        readsRealMemory: false,
        scansRuntimeStores: false,
        writesDurableState: false,
        expandsPublicMcp: false,
        remoteWrites: false,
        rawSensitiveOutputExposed: false
      }
    })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.status, 'runtime_proof_collector_waiting_for_explicit_evidence');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.sourceRegistryProof.accepted, false);
  assert.equal(
    report.units.sourceRegistryProof.failClosedReasons.includes('unsafe_no_touch_boundary'),
    true
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('ValidationAggregator report surfaces runtime proof collector without readiness claim', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-20T00:00:00.000Z',
    runtimeProofInputs: {
      sourceRegistryProof: buildSourceRegistryProofInput()
    }
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorImplemented, true);
  assert.equal(
    report.summary.validationAggregatorRuntimeProofCollectorStatus,
    'runtime_proof_collector_partial_evidence_accepted_not_ready'
  );
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorAcceptedUnitCount, 1);
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorExecutedUnitCount, 1);
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorCanClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units.sourceRegistryProof.accepted,
    true
  );
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.durableMemoryTouched, false);
});

test('runtime proof collector does not perform fs, command, provider, or runtime-store actions', () => {
  const originalReadFileSync = fs.readFileSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during runtime proof collector');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during runtime proof collector');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during runtime proof collector');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during runtime proof collector');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during runtime proof collector');
  };

  try {
    const report = collectValidationAggregatorRuntimeProofUnits({
      sourceRegistryProof: buildSourceRegistryProofInput()
    });

    assert.equal(report.summary.acceptedUnitCount, 1);
    assert.equal(report.safety.readsFiles, false);
    assert.equal(report.safety.executesCommands, false);
    assert.equal(report.safety.readsRealMemory, false);
    assert.equal(report.safety.writesDurableState, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});
