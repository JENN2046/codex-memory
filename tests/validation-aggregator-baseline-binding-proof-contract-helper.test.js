const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

const {
  BASELINE_KINDS,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_BASELINE_BINDING_FIELDS,
  evaluateValidationAggregatorBaselineBindingProof,
  normalizeValidationAggregatorBaselineBindingProofInput
} = require('../src/core/ValidationAggregatorBaselineBindingProofContract');

const TARGET_COMMIT = '7a0d190000000000000000000000000000000000';

function buildBinding(patch = {}) {
  return {
    evidence_id: 'p66-baseline-evidence-01',
    baseline_binding_id: 'p66-baseline-binding-01',
    target_commit: TARGET_COMMIT,
    target_commit_source: 'explicit_target_commit',
    baseline_kind: 'local_validation_target_commit',
    baseline_ref: 'p66-local-validation-target',
    evidence_subject_commit: TARGET_COMMIT,
    validation_scope: 'p66-baseline-binding-fixture',
    binding_observed_at: '2026-05-18T02:00:00.000Z',
    binding_status: 'bound',
    approval_request_commit: '644d17c000000000000000000000000000000000',
    current_main_head: TARGET_COMMIT,
    execution_checkout_commit: '',
    ...patch
  };
}

function buildInput(patch = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_input',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    expectedTargetCommit: TARGET_COMMIT,
    validationAggregatorFullImplementation: false,
    publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'],
    baselineBindings: [
      buildBinding()
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

function assertNoSensitiveSurface(value) {
  const text = JSON.stringify(value).toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'providerapikey',
    'set-cookie',
    'token=',
    'password=',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
}

test('P66.13 baseline binding helper accepts explicit bound target while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorBaselineBindingProof(buildInput());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'baseline_binding_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.baselineBinding.count, 1);
  assert.deepEqual(result.baselineBinding.requiredFields, REQUIRED_BASELINE_BINDING_FIELDS);
  assert.deepEqual(result.baselineBinding.allowedBaselineKinds, BASELINE_KINDS);
  assert.equal(result.baselineBinding.summaries[0].bindingStatus, 'bound');
  assert.equal(result.readiness.baselineBindingProofReady, true);
});

test('P66.13 baseline binding helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorBaselineBindingProofInput({
    ...buildInput(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    providerLatency: 123
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(normalized.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assertNoSensitiveSurface(normalized);
});

test('P66.13 baseline binding helper does not perform fs reads command execution or git operations', () => {
  const input = buildInput();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P66.13 baseline binding helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P66.13 baseline binding helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P66.13 baseline binding helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P66.13 baseline binding helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P66.13 baseline binding helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P66.13 baseline binding helper');
  };

  try {
    const result = evaluateValidationAggregatorBaselineBindingProof(input);

    assert.equal(result.acceptedForPlanning, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.executesCommands, false);
    assert.equal(result.safety.gitCheckout, false);
    assert.equal(result.safety.gitRemoteLookup, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P66.13 baseline binding helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', buildInput({ schemaVersion: 'p66-v999' }), 'schema_version_mismatch'],
    ['policy', buildInput({ policyVersion: 'p66-policy-v999' }), 'policy_version_mismatch'],
    ['manifest', buildInput({ manifestVersion: 'p66-manifest-v999' }), 'manifest_version_mismatch']
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P66.13 baseline binding helper fails closed for missing expected target or bindings', () => {
  for (const [label, patch, reason] of [
    ['expected target', { expectedTargetCommit: '' }, 'missing_expected_target_commit'],
    ['binding', { baselineBindings: [] }, 'missing_baseline_binding'],
    ['required field', { baselineBindings: [buildBinding({ baseline_ref: '' })] }, 'missing_required_baseline_field'],
    ['duplicate binding id', { baselineBindings: [buildBinding(), buildBinding()] }, 'duplicate_baseline_binding_id']
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.13 baseline binding helper fails closed for commit mismatch and malformed hashes', () => {
  for (const [label, bindingPatch, reason] of [
    ['target missing', { target_commit: '' }, 'missing_target_commit'],
    ['subject missing', { evidence_subject_commit: '' }, 'missing_evidence_subject_commit'],
    ['malformed target', { target_commit: 'not-a-commit' }, 'malformed_commit_hash'],
    ['target subject mismatch', { evidence_subject_commit: '644d17c000000000000000000000000000000000' }, 'target_commit_mismatch'],
    ['expected target mismatch', { target_commit: '644d17c000000000000000000000000000000000' }, 'target_commit_mismatch']
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(buildInput({
      baselineBindings: [buildBinding(bindingPatch)]
    }));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.13 baseline binding helper fails closed for ambiguous commit roles and gate checkout omissions', () => {
  for (const [label, bindingPatch, reason] of [
    [
      'approval as target',
      { target_commit_source: 'approval_request_commit' },
      'approval_request_commit_used_as_target_without_explicit_binding'
    ],
    [
      'current main as target',
      { target_commit_source: 'current_main_head' },
      'current_main_head_used_as_target_without_explicit_binding'
    ],
    [
      'missing execution checkout',
      { baseline_kind: 'temporary_gate_execution_checkout', execution_checkout_commit: '' },
      'execution_checkout_commit_missing_for_gate_execution'
    ],
    [
      'execution checkout mismatch',
      {
        baseline_kind: 'temporary_gate_execution_checkout',
        execution_checkout_commit: '644d17c000000000000000000000000000000000'
      },
      'execution_checkout_commit_mismatch'
    ],
    [
      'ambiguous role',
      { target_commit_source: 'ambiguous', current_main_head: '644d17c000000000000000000000000000000000' },
      'ambiguous_baseline_role'
    ],
    [
      'unknown kind',
      { baseline_kind: 'unknown_baseline_kind' },
      'unknown_baseline_kind'
    ]
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(buildInput({
      baselineBindings: [buildBinding(bindingPatch)]
    }));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.13 baseline binding helper fails closed for timestamp and binding status drift', () => {
  for (const [label, bindingPatch, reason] of [
    ['non UTC timestamp', { binding_observed_at: '2026-05-18T02:00:00+08:00' }, 'non_utc_binding_timestamp'],
    ['not bound', { binding_status: 'unknown' }, 'binding_status_not_bound']
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(buildInput({
      baselineBindings: [buildBinding(bindingPatch)]
    }));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.13 baseline binding helper fails closed for public MCP drift unsafe summary and no-touch leakage', () => {
  for (const [label, patch, reason] of [
    [
      'public tools',
      { publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'validate_memory'] },
      'public_mcp_tools_drift'
    ],
    [
      'summary raw workspace',
      { lowRiskSummary: { rawWorkspaceIdExposed: true, rawSecretExposed: false } },
      'unsafe_summary_claim'
    ],
    [
      'git checkout',
      { safety: { ...buildInput().safety, gitCheckout: true } },
      'unsafe_no_touch_boundary'
    ],
    [
      'remote lookup',
      { safety: { ...buildInput().safety, gitRemoteLookup: true } },
      'unsafe_no_touch_boundary'
    ],
    [
      'durable write',
      { safety: { ...buildInput().safety, writesDurableState: true } },
      'unsafe_no_touch_boundary'
    ]
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.13 baseline binding helper fails closed for readiness overclaims', () => {
  for (const [label, patch] of [
    ['full implementation', { validationAggregatorFullImplementation: true }],
    ['runtime readiness', { readiness: { ...buildInput().readiness, runtimeReady: true } }],
    ['v1 readiness', { readiness: { ...buildInput().readiness, v1RcReady: true } }]
  ]) {
    const result = evaluateValidationAggregatorBaselineBindingProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes('readiness_overclaim'), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P66.13 baseline binding helper redacts sensitive normalized output and refs', () => {
  const normalized = normalizeValidationAggregatorBaselineBindingProofInput(buildInput({
    baselineBindings: [
      buildBinding({
        baseline_ref: 'authorization: Bearer SHOULD_NOT_LEAK providerApiKey=SHOULD_NOT_LEAK'
      })
    ]
  }));

  assertNoSensitiveSurface(normalized);
});
