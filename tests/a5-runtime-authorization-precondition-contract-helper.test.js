const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_AUTHORIZATION_ACTION_IDS,
  REQUIRED_PRE_AUTHORIZATION_EVIDENCE_IDS,
  SAFE_ACCEPTED_EVIDENCE_TYPES,
  evaluateA5RuntimeAuthorizationPrecondition,
  normalizeA5RuntimeAuthorizationPreconditionInput
} = require('../src/core/A5RuntimeAuthorizationPreconditionContract');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p62-a5-runtime-authorization-precondition-matrix-v1.json'
);

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
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

test('P62 authorization helper accepts explicit matrix object while keeping A5 actions blocked', () => {
  const result = evaluateA5RuntimeAuthorizationPrecondition(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'boundary_accepted_authorization_precondition_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.authorizationGranted, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.cutoverReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.publicMcpTools.exact, true);
  assert.deepEqual(result.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(result.preAuthorizationEvidence.count, REQUIRED_PRE_AUTHORIZATION_EVIDENCE_IDS.length);
  assert.equal(result.preAuthorizationEvidence.exact, true);
  assert.equal(result.preAuthorizationEvidence.acceptedEvidenceTypesExact, true);
  assert.equal(result.authorizationActions.count, REQUIRED_AUTHORIZATION_ACTION_IDS.length);
  assert.equal(result.authorizationActions.exact, true);
  assert.equal(result.bundledApprovals.exact, true);
  assert.equal(result.failClosedStates.exact, true);
  assert.equal(result.forbiddenClaims.exact, true);
  assert.equal(result.readiness.authorizationMatrixReady, true);
  assert.equal(result.readiness.authorizationGranted, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.writesDurableMemory, false);
  assert.equal(result.safety.writesDurableAudit, false);
});

test('P62 authorization helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeA5RuntimeAuthorizationPreconditionInput({
    ...loadFixture(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    bearer: 'Bearer SHOULD_NOT_PASS',
    api_key: 'api_key=SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    providerLatency: 123
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(normalized.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'bearer'), false);
  assert.equal(Object.hasOwn(normalized, 'api_key'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assertNoSensitiveSurface(normalized);
});

test('P62 authorization helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P62 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P62 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P62 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P62 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P62 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P62 helper');
  };

  try {
    const result = evaluateA5RuntimeAuthorizationPrecondition(input);

    assert.equal(result.acceptedForPlanning, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.scansDirectories, false);
    assert.equal(result.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P62 authorization helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p62-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p62-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p62-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateA5RuntimeAuthorizationPrecondition(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P62 authorization helper fails closed for missing duplicate or unknown required sets', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'missing evidence',
      { preAuthorizationEvidence: fixture.preAuthorizationEvidence.slice(1) },
      'non_exact_authorization_precondition_contract'
    ],
    [
      'duplicate evidence',
      { preAuthorizationEvidence: [...fixture.preAuthorizationEvidence, fixture.preAuthorizationEvidence[0]] },
      'duplicate_authorization_precondition_id'
    ],
    [
      'missing accepted evidence type',
      {
        preAuthorizationEvidence: fixture.preAuthorizationEvidence.map((item, index) => index === 0
          ? { ...item, acceptedEvidenceTypes: item.acceptedEvidenceTypes.slice(1) }
          : item)
      },
      'non_exact_authorization_precondition_contract'
    ],
    [
      'missing action',
      { authorizationActions: fixture.authorizationActions.slice(1) },
      'non_exact_authorization_precondition_contract'
    ],
    [
      'duplicate action',
      { authorizationActions: [...fixture.authorizationActions, fixture.authorizationActions[0]] },
      'duplicate_authorization_precondition_id'
    ],
    [
      'unknown public mcp',
      { publicMcpTools: [...PUBLIC_MCP_TOOLS.slice(1), 'new_public_tool'] },
      'non_exact_authorization_precondition_contract'
    ],
    [
      'missing bundled approval rule',
      { forbiddenBundledApprovals: fixture.forbiddenBundledApprovals.slice(1) },
      'non_exact_authorization_precondition_contract'
    ]
  ]) {
    const result = evaluateA5RuntimeAuthorizationPrecondition({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P62 authorization helper fails closed for unsupported evidence and authorization grant claims', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'unsupported evidence type',
      {
        preAuthorizationEvidence: fixture.preAuthorizationEvidence.map((item, index) => index === 0
          ? { ...item, acceptedEvidenceTypes: ['operator_free_text'] }
          : item)
      },
      'evidence_satisfied_missing_blocker_or_unsupported_type'
    ],
    [
      'satisfied evidence',
      {
        preAuthorizationEvidence: fixture.preAuthorizationEvidence.map((item, index) => index === 0
          ? { ...item, currentStatus: 'satisfied' }
          : item)
      },
      'evidence_satisfied_missing_blocker_or_unsupported_type'
    ],
    [
      'authorization action granted',
      {
        authorizationActions: fixture.authorizationActions.map((action, index) => index === 0
          ? { ...action, granted: true }
          : action)
      },
      'authorization_action_granted_or_not_separate_a5'
    ],
    [
      'authorization not separate',
      {
        authorizationActions: fixture.authorizationActions.map((action, index) => index === 0
          ? { ...action, requiresSeparateExplicitApproval: false }
          : action)
      },
      'authorization_action_granted_or_not_separate_a5'
    ],
    [
      'top-level authorization grant',
      { authorizationGranted: true },
      'readiness_or_authorization_overclaim'
    ],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          scansRuntimeStores: true
        }
      },
      'safety_boundary_leaked'
    ],
    [
      'readiness claim',
      {
        readiness: {
          ...fixture.readiness,
          v1RcReady: true
        }
      },
      'readiness_or_authorization_overclaim'
    ]
  ]) {
    const result = evaluateA5RuntimeAuthorizationPrecondition({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P62 authorization helper redacts sensitive normalized output and unsupported summaries', () => {
  const fixture = loadFixture();
  const normalized = normalizeA5RuntimeAuthorizationPreconditionInput({
    ...fixture,
    failClosedStates: [
      ...fixture.failClosedStates.slice(1),
      'authorization: Bearer FAIL_CLOSED_TOKEN_1234567890'
    ],
    forbiddenClaims: [
      ...fixture.forbiddenClaims,
      'api_key=CLAIM_API_KEY_1234567890'
    ],
    preAuthorizationEvidence: fixture.preAuthorizationEvidence.map((item, index) => index === 0
      ? {
          ...item,
          id: 'runtime_schema_version_enforcement_proof authorization: Bearer SOURCE_TOKEN_1234567890',
          acceptedEvidenceTypes: [
            ...item.acceptedEvidenceTypes,
            'https://example.test/path?token=SOURCE_TOKEN_1234567890'
          ],
          blockedBy: [
            ...item.blockedBy,
            'A:\\secret\\.env'
          ]
        }
      : item)
  });
  const result = evaluateA5RuntimeAuthorizationPrecondition(normalized);

  assertNoSensitiveSurface(normalized);
  assertNoSensitiveSurface(result);
  assert.equal(result.acceptedForPlanning, false);
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.preAuthorizationEvidence.exact, false);
  assert.deepEqual(result.preAuthorizationEvidence.safeAcceptedEvidenceTypes, SAFE_ACCEPTED_EVIDENCE_TYPES);
});
