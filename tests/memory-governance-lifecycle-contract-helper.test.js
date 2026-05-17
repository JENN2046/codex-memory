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
