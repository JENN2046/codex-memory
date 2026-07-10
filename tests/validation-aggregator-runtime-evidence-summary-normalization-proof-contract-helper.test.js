const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_SUMMARY_FIELDS,
  evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof,
  normalizeValidationAggregatorRuntimeEvidenceSummaryNormalizationProofInput
} = require('../src/core/ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofContract');

function buildValidInput(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_sanitized_summary_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
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
    ...overrides
  };
}

test('P66.17 helper accepts explicit sanitized summary while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput());

  assert.equal(result.status, 'runtime_evidence_summary_normalization_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.runtimeEvidenceSummary.criticalGateCount, 12);
  assert.equal(result.runtimeEvidenceSummary.locallyEvidencedRuntimeGapCount, 2);
  assert.equal(result.runtimeEvidenceSummary.remainingRuntimeGapCount, 7);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
});

test('P66.17 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorRuntimeEvidenceSummaryNormalizationProofInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.runtimeEvidenceSummary.extra, undefined);
});

test('P66.17 helper does not perform fs reads or command execution', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofContract.js'
    ),
    'utf8'
  );

  assert.doesNotMatch(source, /require\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/);
  assert.doesNotMatch(source, /\breadFileSync\s*\(/);
  assert.doesNotMatch(source, /\breaddirSync\s*\(/);
  assert.doesNotMatch(source, /\bspawn(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bexec(?:File)?(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
});

test('P66.17 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.17 helper fails closed for public MCP drift and missing summary fields', () => {
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      publicMcpTools: ['record_memory']
    })).failClosedReasons.includes('public_mcp_tools_drift')
  );
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      runtimeEvidenceSummary: null
    })).failClosedReasons.includes('missing_runtime_evidence_summary')
  );

  const missingSafety = buildValidInput();
  delete missingSafety.runtimeEvidenceSummary.safety;
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(missingSafety)
      .failClosedReasons.includes('missing_required_summary_field')
  );
});

test('P66.17 helper fails closed for invalid critical gate counts', () => {
  const input = buildValidInput();
  input.runtimeEvidenceSummary.criticalGates = {
    total: 2,
    passed: 2,
    failed: 1,
    allCriticalCommandsPassed: true
  };

  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(input)
      .failClosedReasons.includes('invalid_critical_gates')
  );
});

test('P66.17 helper fails closed for unsafe low-risk summary and safety flags', () => {
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      lowRiskSummary: {
        rawWorkspaceIdExposed: true,
        rawSecretExposed: false
      }
    })).failClosedReasons.includes('unsafe_low_risk_summary')
  );
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      safety: {
        executesCommands: true
      }
    })).failClosedReasons.includes('unsafe_summary_rejected')
  );
});

test('P66.17 helper fails closed for unsafe runtime evidence summary side effects', () => {
  for (const [key, value] of [
    ['providerCalls', 1],
    ['mutated', true],
    ['serviceStarted', true],
    ['writesDurableMemory', true],
    ['realMemoryPreview', true],
    ['remoteWrites', true],
    ['migrationApplied', true],
    ['importExportApplied', true],
    ['configChanged', true],
    ['watchdogStartupInstalled', true]
  ]) {
    const input = buildValidInput();
    input.runtimeEvidenceSummary.safety[key] = value;
    assert.ok(
      evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(input)
        .failClosedReasons.includes('unsafe_summary_rejected'),
      key
    );
  }
});

test('P66.17 helper fails closed for readiness overclaims', () => {
  for (const key of [
    'runtimeReady',
    'finalRcMatrixReady',
    'fullFinalRcMatrixExecuted',
    'v1RcReady',
    'rcReady'
  ]) {
    const input = buildValidInput();
    input.runtimeEvidenceSummary[key] = true;
    assert.ok(
      evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(input)
        .failClosedReasons.includes('unsafe_summary_rejected'),
      key
    );
  }

  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      readiness: {
        v1RcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.17 helper redacts or rejects sensitive normalized output and summaries', () => {
  const normalized = normalizeValidationAggregatorRuntimeEvidenceSummaryNormalizationProofInput(buildValidInput({
    status: 'Bearer sk-test-value'
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
  assert.ok(
    evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(buildValidInput({
      runtimeEvidenceSummary: {
        ...buildValidInput().runtimeEvidenceSummary,
        status: 'workspace-abcdefghi'
      }
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
});

test('P66.17 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.deepEqual(REQUIRED_SUMMARY_FIELDS, [
    'status',
    'decision',
    'runnerExecuted',
    'commandsExecuted',
    'localRuntimeEvidenceMatrixExecuted',
    'allowlistedFinalRcEvidenceRunnerExecuted',
    'criticalGates',
    'locallyEvidencedRuntimeGaps',
    'remainingRuntimeGaps',
    'safety'
  ]);
  for (const reason of [
    'malformed_input',
    'schema_version_mismatch',
    'missing_runtime_evidence_summary',
    'unsafe_summary_rejected',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
