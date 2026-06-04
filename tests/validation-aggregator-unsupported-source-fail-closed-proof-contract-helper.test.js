const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  SUPPORTED_SOURCE_CLASSES,
  SUPPORTED_SOURCE_TYPES,
  evaluateValidationAggregatorUnsupportedSourceFailClosedProof,
  normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput
} = require('../src/core/ValidationAggregatorUnsupportedSourceFailClosedProofContract');

function buildFailClosedCases(overrides = {}) {
  return REQUIRED_FAIL_CLOSED_CASES.map(caseId => ({
    id: caseId,
    sourceType: caseId.includes('provider') ? 'provider_smoke_result' : 'unexpected_evidence_feed',
    sourceClass: caseId.includes('runtime') || caseId.includes('provider') ? 'runtime_evidence' : 'unexpected_runtime_authority',
    sourceKind: 'unsupported',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    blockedReason: `${caseId}_blocked`,
    failClosed: true,
    accepted: false,
    downgradedToStatic: false,
    a5Approved: false,
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
    supportedSourceTypes: [...SUPPORTED_SOURCE_TYPES],
    supportedSourceClasses: [...SUPPORTED_SOURCE_CLASSES],
    failClosedCases: buildFailClosedCases(),
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
    ...overrides
  };
}

test('P66.25 helper accepts explicit unsupported source fail-closed metadata while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput());

  assert.equal(result.status, 'unsupported_source_fail_closed_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.summary.requiredFailClosedCaseCount, REQUIRED_FAIL_CLOSED_CASES.length);
  assert.equal(result.summary.missingRequiredFailClosedCaseCount, 0);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
});

test('P66.25 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.supportedSourceTypes, SUPPORTED_SOURCE_TYPES);
  assert.deepEqual(normalized.supportedSourceClasses, SUPPORTED_SOURCE_CLASSES);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.failClosedCases[0].extra, undefined);
});

test('P66.25 helper does not perform fs reads or command execution', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorUnsupportedSourceFailClosedProofContract.js'
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

test('P66.25 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.25 helper fails closed for public MCP supported source type or source class drift', () => {
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      publicMcpTools: ['record_memory']
    })).failClosedReasons.includes('public_mcp_tools_drift')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      supportedSourceTypes: ['committed_fixture']
    })).failClosedReasons.includes('supported_source_type_drift')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      supportedSourceClasses: ['runtime_evidence']
    })).failClosedReasons.includes('supported_source_class_drift')
  );
});

test('P66.25 helper fails closed for missing duplicate or unknown fail-closed cases', () => {
  const missingResult = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
    failClosedCases: buildFailClosedCases().filter(item => item.id !== 'unknown_source_kind')
  }));

  assert.ok(missingResult.failClosedReasons.includes('missing_required_fail_closed_case'));
  assert.deepEqual(missingResult.missingRequiredFailClosedCases, ['unknown_source_kind']);

  const duplicateResult = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
    failClosedCases: [
      ...buildFailClosedCases(),
      buildFailClosedCases()[0]
    ]
  }));

  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_fail_closed_case'));
  assert.deepEqual(duplicateResult.duplicateFailClosedCases, ['unsupported_source_type']);

  const unknownResult = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
    failClosedCases: [
      ...buildFailClosedCases(),
      {
        id: 'unexpected_live_service_case',
        failClosed: true,
        accepted: false,
        downgradedToStatic: false,
        a5Approved: false,
        decision: 'NOT_READY_BLOCKED'
      }
    ]
  }));

  assert.ok(unknownResult.failClosedReasons.includes('unknown_fail_closed_case'));
  assert.deepEqual(unknownResult.unknownFailClosedCases, ['unexpected_live_service_case']);
});

test('P66.25 helper fails closed when unsupported sources are accepted or downgraded', () => {
  const acceptedResult = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
    failClosedCases: buildFailClosedCases({
      unsupported_source_type: {
        accepted: true
      }
    })
  }));

  assert.ok(acceptedResult.failClosedReasons.includes('unsupported_source_accepted'));
  assert.deepEqual(acceptedResult.acceptedUnsupportedCases, ['unsupported_source_type']);

  const downgradedResult = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
    failClosedCases: buildFailClosedCases({
      unsupported_source_class: {
        downgradedToStatic: true
      }
    })
  }));

  assert.ok(downgradedResult.failClosedReasons.includes('unsupported_source_downgraded'));
  assert.deepEqual(downgradedResult.downgradedUnsupportedCases, ['unsupported_source_class']);
});

test('P66.25 helper fails closed when A5-gated runtime sources are not blocked', () => {
  const result = evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
    failClosedCases: buildFailClosedCases({
      provider_source_without_a5_approval: {
        a5Approved: true
      }
    })
  }));

  assert.ok(result.failClosedReasons.includes('runtime_source_without_a5_not_blocked'));
  assert.deepEqual(result.unblockedRuntimeCases, ['provider_source_without_a5_approval']);
});

test('P66.25 helper fails closed for unsafe low-risk summary and safety flags', () => {
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      lowRiskSummary: {
        rawWorkspaceIdExposed: true,
        rawSecretExposed: false,
        rawSourcePayloadExposed: false
      }
    })).failClosedReasons.includes('unsafe_low_risk_summary')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      safety: {
        executesCommands: true
      }
    })).failClosedReasons.includes('unsafe_safety_flag')
  );
});

test('P66.25 helper fails closed for readiness overclaims', () => {
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      readiness: {
        v1RcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      validationAggregatorFullImplementation: true
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.25 helper redacts or rejects sensitive normalized output and source metadata', () => {
  const normalized = normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput(buildValidInput({
    status: 'Bearer sk-test-value'
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
  assert.ok(
    evaluateValidationAggregatorUnsupportedSourceFailClosedProof(buildValidInput({
      failClosedCases: buildFailClosedCases({
        unknown_source_kind: {
          sourceKind: 'workspace-abcdefghi'
        }
      })
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
});

test('P66.25 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.deepEqual(SUPPORTED_SOURCE_TYPES, [
    'committed_fixture',
    'committed_doc',
    'local_validation_summary',
    'static_report_shape'
  ]);
  assert.deepEqual(SUPPORTED_SOURCE_CLASSES, [
    'committed_evidence',
    'local_validation'
  ]);
  assert.deepEqual(REQUIRED_FAIL_CLOSED_CASES, [
    'unsupported_source_type',
    'unsupported_source_class',
    'unknown_source_kind',
    'runtime_source_without_a5_approval',
    'provider_source_without_a5_approval',
    'real_memory_source_without_a5_approval',
    'durable_write_source_without_a5_approval',
    'migration_apply_source_without_a5_approval',
    'public_mcp_expansion_source_without_a5_approval',
    'readiness_claim_without_authority',
    'a5_action_without_approval'
  ]);
  for (const reason of [
    'malformed_input',
    'supported_source_type_drift',
    'unsupported_source_accepted',
    'unsupported_source_downgraded',
    'runtime_source_without_a5_not_blocked',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
