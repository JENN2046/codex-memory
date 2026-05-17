const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_LIFECYCLE_CASES,
  REQUIRED_SURFACES,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceLifecycleContract,
  summarizeMemoryGovernanceLifecycleContract
} = require('../src/core/MemoryGovernanceLifecycleContract');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-lifecycle-contract-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('P31.3 helper summarizes explicit governance lifecycle fixture input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeMemoryGovernanceLifecycleContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'memory-governance-lifecycle-contract-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, true);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, []);
  assert.equal(summary.surfaces.requiredPresent, true);
  assert.deepEqual(summary.surfaces.missingRequired, []);
  assert.equal(summary.lifecycleCases.requiredPresent, true);
  assert.deepEqual(summary.lifecycleCases.missingRequired, []);
  assert.equal(summary.blockers.requiredPresent, true);
  assert.deepEqual(summary.blockers.missingRequired, []);
  assert.equal(summary.requiredApprovals.requiredPresent, true);
  assert.deepEqual(summary.requiredApprovals.missingRequired, []);
  assert.deepEqual(summary.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(summary.safety.scansRealMemory, false);
  assert.equal(summary.safety.rawSecretExposed, false);
  assert.equal(summary.safety.rawWorkspaceIdExposed, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P31.3 helper normalizes expected governance lifecycle contract fields', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeMemoryGovernanceLifecycleContract(fixture);

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.reviewOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.mutated, false);
  assert.equal(normalized.runtimeIntegrated, false);
  assert.equal(normalized.publicMcpExpanded, false);
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.surfaces.map(surface => surface.id), REQUIRED_SURFACES);
  assert.deepEqual(normalized.lifecycleCases.map(lifecycleCase => lifecycleCase.id), REQUIRED_LIFECYCLE_CASES);
  assert.deepEqual(REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker)), []);
  assert.deepEqual(REQUIRED_APPROVALS.filter(approval => !normalized.requiredApprovals.includes(approval)), []);
  assert.equal(JSON.stringify(fixture), before);
});

test('P31.3 helper does not perform implicit fixture reads', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during governance lifecycle helper evaluation');
  };

  try {
    const summary = summarizeMemoryGovernanceLifecycleContract(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('P31.3 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeMemoryGovernanceLifecycleContract(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.surfaces.requiredPresent, false);
    assert.deepEqual(summary.surfaces.missingRequired, REQUIRED_SURFACES);
    assert.equal(summary.lifecycleCases.requiredPresent, false);
    assert.deepEqual(summary.lifecycleCases.missingRequired, REQUIRED_LIFECYCLE_CASES);
    assert.equal(summary.blockers.requiredPresent, false);
    assert.equal(summary.requiredApprovals.requiredPresent, false);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P31.3 helper rejects unsupported source types', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceLifecycleContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'live_service'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, ['live_service']);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
});

test('P31.3 helper does not allow input to redefine the source type whitelist', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceLifecycleContract({
    ...fixture,
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'live_service'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, ['live_service']);
});

test('P31.3 helper rejects runtime or public MCP readiness claims', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, decision: 'READY' },
    { ...fixture, mutated: true },
    { ...fixture, runtimeIntegrated: true },
    { ...fixture, publicMcpExpanded: true },
    { ...fixture, publicTools: ['record_memory', 'search_memory'] }
  ]) {
    const summary = summarizeMemoryGovernanceLifecycleContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision || 'NOT_READY_BLOCKED', unsafeContract.decision || 'NOT_READY_BLOCKED');
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P31.3 helper requires all governance surfaces and lifecycle cases', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceLifecycleContract({
    ...fixture,
    surfaces: fixture.surfaces.filter(surface => surface.id !== 'public_mcp_freeze'),
    lifecycleCases: fixture.lifecycleCases.filter(lifecycleCase => lifecycleCase.id !== 'tombstone_deferred')
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.surfaces.requiredPresent, false);
  assert.deepEqual(summary.surfaces.missingRequired, ['public_mcp_freeze']);
  assert.equal(summary.lifecycleCases.requiredPresent, false);
  assert.deepEqual(summary.lifecycleCases.missingRequired, ['tombstone_deferred']);
});

test('P31.3 helper rejects schema/version drift and non-exact required sets', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, schemaVersion: 'unsupported-schema' },
    { ...fixture, version: 'v2' },
    { ...fixture, surfaces: [...fixture.surfaces, fixture.surfaces[0]] },
    { ...fixture, lifecycleCases: [...fixture.lifecycleCases, fixture.lifecycleCases[0]] },
    { ...fixture, blockers: [...fixture.blockers, 'unexpected_blocker'] },
    { ...fixture, requiredApprovals: [...fixture.requiredApprovals, 'unexpected_approval'] }
  ]) {
    const summary = summarizeMemoryGovernanceLifecycleContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P31.3 helper redacts sensitive normalized output and unsupported source types', () => {
  const fixture = loadFixture();
  const normalized = normalizeMemoryGovernanceLifecycleContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'authorization: Bearer LIFECYCLE_TOKEN_1234567890'
    ],
    unsupportedSourceTypes: [
      'api_key=LIFECYCLE_API_KEY_1234567890',
      'providerapikey=LIFECYCLE_PROVIDER_API_KEY_1234567890',
      'password=LIFECYCLE_PASSWORD_1234567890',
      'token=LIFECYCLE_SUMMARY_TOKEN_1234567890',
      'set-cookie=session=LIFECYCLE_COOKIE_1234567890',
      'workspace_id=workspace-lifecycle-public',
      'https://example.test/lifecycle',
      'C:\\secret\\.env'
    ],
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'raw_workspace_id=workspace-lifecycle-raw'
    ],
    surfaces: fixture.surfaces.map((surface, index) => index === 0
      ? {
          ...surface,
          authorization: 'authorization: Bearer SURFACE_TOKEN_1234567890',
          bearer: 'Bearer SURFACE_BEARER_1234567890',
          api_key: 'api_key=SURFACE_API_KEY_1234567890',
          raw_workspace_id: 'raw_workspace_id=workspace-surface-raw',
          sourceArtifacts: [
            ...surface.sourceArtifacts,
            'artifact authorization: Bearer ARTIFACT_TOKEN_1234567890 api_key=ARTIFACT_API_KEY_1234567890 /home/user/.env'
          ]
        }
      : surface
    ),
    lifecycleCases: fixture.lifecycleCases.map((lifecycleCase, index) => index === 0
      ? {
          ...lifecycleCase,
          raw_workspace_id: 'raw_workspace_id=workspace-case-raw',
          from: `${lifecycleCase.from} bearer CASE_TOKEN_1234567890`,
          to: `${lifecycleCase.to} api_key=CASE_API_KEY_1234567890`
        }
      : lifecycleCase
    )
  });
  const summary = summarizeMemoryGovernanceLifecycleContract(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'raw_workspace_id',
    'lifecycle_token_1234567890',
    'surface_token_1234567890',
    'artifact_api_key_1234567890',
    'lifecycle_password_1234567890',
    'lifecycle_summary_token_1234567890',
    'lifecycle_cookie_1234567890',
    'lifecycle_provider_api_key_1234567890',
    'workspace_id',
    'workspace-lifecycle-public',
    'https://example.test',
    'c:\\',
    '.env',
    'workspace-surface-raw'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }

  assert.equal(Object.hasOwn(normalized.surfaces[0], 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.surfaces[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.lifecycleCases[0], 'raw_workspace_id'), false);
  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.unsupportedSourceTypes.every(sourceType =>
    sourceType === '<redacted>' || sourceType.includes('<redacted>')
  ), true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.acceptedForPlanning, false);
});
