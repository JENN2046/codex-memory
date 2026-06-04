const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_DISALLOWED_IMPORTS,
  REQUIRED_DISALLOWED_RUNTIME_CALLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_TARGET_FAMILIES,
  evaluateValidationAggregatorNoTouchBoundaryProof,
  normalizeValidationAggregatorNoTouchBoundaryProofInput
} = require('../src/core/ValidationAggregatorNoTouchBoundaryProofContract');

function buildFailClosedCases(overrides = {}) {
  return REQUIRED_FAIL_CLOSED_CASES.map(caseId => ({
    id: caseId,
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    blockedReason: `${caseId}_blocked`,
    failClosed: true,
    detected: true,
    accepted: false,
    readinessAuthority: false,
    ...overrides[caseId]
  }));
}

function buildValidInput(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    targetFamilies: [...REQUIRED_TARGET_FAMILIES],
    disallowedImports: [...REQUIRED_DISALLOWED_IMPORTS],
    disallowedRuntimeCalls: [...REQUIRED_DISALLOWED_RUNTIME_CALLS],
    failClosedCases: buildFailClosedCases(),
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
    ...overrides
  };
}

test('P66.29 helper accepts explicit no-touch metadata while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput());

  assert.equal(result.status, 'no_touch_boundary_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.summary.requiredFailClosedCaseCount, REQUIRED_FAIL_CLOSED_CASES.length);
  assert.equal(result.summary.missingRequiredFailClosedCaseCount, 0);
  assert.equal(result.summary.sourceScannedAtRuntime, false);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
});

test('P66.29 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorNoTouchBoundaryProofInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.targetFamilies, REQUIRED_TARGET_FAMILIES);
  assert.deepEqual(normalized.disallowedImports, REQUIRED_DISALLOWED_IMPORTS);
  assert.deepEqual(normalized.disallowedRuntimeCalls, REQUIRED_DISALLOWED_RUNTIME_CALLS);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.failClosedCases[0].extra, undefined);
});

test('P66.29 helper does not perform fs reads or command execution', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorNoTouchBoundaryProofContract.js'
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

test('P66.29 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.29 helper fails closed for public MCP target import or runtime call drift', () => {
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      publicMcpTools: ['record_memory']
    })).failClosedReasons.includes('public_mcp_tools_drift')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      targetFamilies: ['validation_aggregator_service']
    })).failClosedReasons.includes('target_family_drift')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      disallowedImports: ['fs']
    })).failClosedReasons.includes('disallowed_import_set_drift')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      disallowedRuntimeCalls: ['readFileSync']
    })).failClosedReasons.includes('disallowed_runtime_call_set_drift')
  );
});

test('P66.29 helper fails closed for missing duplicate or unknown fail-closed cases', () => {
  const missingResult = evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
    failClosedCases: buildFailClosedCases().filter(item => item.id !== 'network_call_detected')
  }));

  assert.ok(missingResult.failClosedReasons.includes('missing_required_fail_closed_case'));
  assert.deepEqual(missingResult.missingRequiredFailClosedCases, ['network_call_detected']);

  const duplicateResult = evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
    failClosedCases: [
      ...buildFailClosedCases(),
      buildFailClosedCases()[0]
    ]
  }));

  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_fail_closed_case'));
  assert.deepEqual(duplicateResult.duplicateFailClosedCases, ['missing_no_touch_proof']);

  const unknownResult = evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
    failClosedCases: [
      ...buildFailClosedCases(),
      {
        id: 'unexpected_live_scan_case',
        failClosed: true,
        accepted: false,
        decision: 'NOT_READY_BLOCKED'
      }
    ]
  }));

  assert.ok(unknownResult.failClosedReasons.includes('unknown_fail_closed_case'));
  assert.deepEqual(unknownResult.unknownFailClosedCases, ['unexpected_live_scan_case']);
});

test('P66.29 helper fails closed when unsafe cases are not blocked', () => {
  const acceptedResult = evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
    failClosedCases: buildFailClosedCases({
      unsafe_import_detected: {
        accepted: true
      }
    })
  }));

  assert.ok(acceptedResult.failClosedReasons.includes('unsafe_case_not_blocked'));
  assert.deepEqual(acceptedResult.unsafeCasesNotBlocked, ['unsafe_import_detected']);

  const openResult = evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
    failClosedCases: buildFailClosedCases({
      command_execution_detected: {
        failClosed: false
      }
    })
  }));

  assert.ok(openResult.failClosedReasons.includes('unsafe_case_not_blocked'));
  assert.deepEqual(openResult.unsafeCasesNotBlocked, ['command_execution_detected']);
});

test('P66.29 helper fails closed for unsafe low-risk summary and safety flags', () => {
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      lowRiskSummary: {
        rawWorkspaceIdExposed: true,
        rawSecretExposed: false,
        rawSourcePayloadExposed: false
      }
    })).failClosedReasons.includes('unsafe_low_risk_summary')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      safety: {
        scansSourceAtRuntime: true
      }
    })).failClosedReasons.includes('unsafe_safety_flag')
  );
});

test('P66.29 helper fails closed for readiness overclaims', () => {
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      readiness: {
        v1RcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      validationAggregatorFullImplementation: true
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.29 helper redacts or rejects sensitive normalized output and source metadata', () => {
  const normalized = normalizeValidationAggregatorNoTouchBoundaryProofInput(buildValidInput({
    status: 'Bearer sk-test-value'
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
  assert.ok(
    evaluateValidationAggregatorNoTouchBoundaryProof(buildValidInput({
      failClosedCases: buildFailClosedCases({
        missing_no_touch_proof: {
          blockedReason: 'workspace-abcdefghi'
        }
      })
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
});

test('P66.29 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.deepEqual(REQUIRED_TARGET_FAMILIES, [
    'validation_aggregator_service',
    'validation_aggregator_proof_helpers',
    'final_rc_runner_helpers',
    'governance_contract_helpers',
    'evidence_contract_helpers'
  ]);
  assert.ok(REQUIRED_DISALLOWED_IMPORTS.includes('node:sqlite'));
  assert.ok(REQUIRED_DISALLOWED_IMPORTS.includes('src/storage'));
  assert.ok(REQUIRED_DISALLOWED_RUNTIME_CALLS.includes('readFileSync'));
  assert.ok(REQUIRED_DISALLOWED_RUNTIME_CALLS.includes('spawn'));
  assert.deepEqual(REQUIRED_FAIL_CLOSED_CASES, [
    'missing_no_touch_proof',
    'unsafe_import_detected',
    'unsafe_runtime_call_detected',
    'fs_read_detected',
    'fs_write_detected',
    'command_execution_detected',
    'network_call_detected',
    'runtime_store_import_detected',
    'storage_recall_adapter_import_detected',
    'provider_call_claim',
    'service_start_claim',
    'real_memory_scan_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority',
    'a5_action_without_approval'
  ]);
  for (const reason of [
    'malformed_input',
    'target_family_drift',
    'disallowed_import_set_drift',
    'disallowed_runtime_call_set_drift',
    'unsafe_case_not_blocked',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
