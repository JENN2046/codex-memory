const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_MUTATION_PACKET_IDS,
  REQUIRED_PACKET_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeDurableGovernanceMutationPacketContract,
  summarizeDurableGovernanceMutationPacketContract
} = require('../src/core/DurableGovernanceMutationPacketContract');

const fixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('CM-0861 helper summarizes explicit durable governance mutation packet input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeDurableGovernanceMutationPacketContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'durable-governance-mutation-packet-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, true);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, []);
  assert.equal(summary.requiredPacketFields.requiredPresent, true);
  assert.deepEqual(summary.requiredPacketFields.missingRequired, []);
  assert.equal(summary.mutationPackets.requiredPresent, true);
  assert.equal(summary.mutationPackets.blocked, true);
  assert.deepEqual(summary.mutationPackets.missingRequired, []);
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
  assert.equal(JSON.stringify(fixture), before);
});

test('CM-0861 helper normalizes expected durable governance mutation packet fields', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeDurableGovernanceMutationPacketContract(fixture);

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.reviewOnly, true);
  assert.equal(normalized.executionApproved, false);
  assert.equal(normalized.mutated, false);
  assert.equal(normalized.runtimeIntegrated, false);
  assert.equal(normalized.publicMcpExpanded, false);
  assert.equal(normalized.realMemoryScanned, false);
  assert.equal(normalized.providerCalls, 0);
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.requiredPacketFields, REQUIRED_PACKET_FIELDS);
  assert.deepEqual(normalized.mutationPackets.map(packet => packet.id), REQUIRED_MUTATION_PACKET_IDS);
  assert.deepEqual(REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker)), []);
  assert.deepEqual(REQUIRED_APPROVALS.filter(approval => !normalized.requiredApprovals.includes(approval)), []);
  assert.equal(JSON.stringify(fixture), before);
});

test('CM-0861 helper does not perform implicit fixture reads', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during durable governance packet helper evaluation');
  };

  try {
    const summary = summarizeDurableGovernanceMutationPacketContract(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0861 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeDurableGovernanceMutationPacketContract(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.realMemoryScanned, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.requiredPacketFields.requiredPresent, false);
    assert.deepEqual(summary.requiredPacketFields.missingRequired, REQUIRED_PACKET_FIELDS);
    assert.equal(summary.mutationPackets.requiredPresent, false);
    assert.deepEqual(summary.mutationPackets.missingRequired, REQUIRED_MUTATION_PACKET_IDS);
    assert.equal(summary.mutationPackets.blocked, true);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.blockers.requiredPresent, false);
    assert.equal(summary.requiredApprovals.requiredPresent, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('CM-0861 helper rejects unsupported source types', () => {
  const fixture = loadFixture();
  const summary = summarizeDurableGovernanceMutationPacketContract({
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

test('CM-0861 helper rejects execution readiness and runtime claims', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, decision: 'READY' },
    { ...fixture, approvalStatus: 'APPROVED' },
    { ...fixture, executionApproved: true },
    { ...fixture, mutated: true },
    { ...fixture, runtimeIntegrated: true },
    { ...fixture, publicMcpExpanded: true },
    { ...fixture, realMemoryScanned: true },
    { ...fixture, providerCalls: 1 },
    { ...fixture, publicTools: ['record_memory', 'search_memory'] }
  ]) {
    const summary = summarizeDurableGovernanceMutationPacketContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
  }
});

test('CM-0861 helper requires all packet fields and mutation packets', () => {
  const fixture = loadFixture();
  const summary = summarizeDurableGovernanceMutationPacketContract({
    ...fixture,
    requiredPacketFields: fixture.requiredPacketFields.filter(field => field !== 'rollbackPath'),
    mutationPackets: fixture.mutationPackets.filter(packet => packet.id !== 'memory_forget')
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.requiredPacketFields.requiredPresent, false);
  assert.deepEqual(summary.requiredPacketFields.missingRequired, ['rollbackPath']);
  assert.equal(summary.mutationPackets.requiredPresent, false);
  assert.deepEqual(summary.mutationPackets.missingRequired, ['memory_forget']);
});

test('CM-0861 helper rejects unblocked durable mutation packet records', () => {
  const fixture = loadFixture();
  const summary = summarizeDurableGovernanceMutationPacketContract({
    ...fixture,
    mutationPackets: fixture.mutationPackets.map(packet =>
      packet.id === 'memory_validate'
        ? { ...packet, status: 'APPROVED', executionApproved: true }
        : packet
    )
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.mutationPackets.requiredPresent, true);
  assert.equal(summary.mutationPackets.blocked, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
});

test('CM-0861 helper rejects schema version drift and non-exact required sets', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, schemaVersion: 'unsupported-schema' },
    { ...fixture, version: 'v2' },
    { ...fixture, requiredPacketFields: [...fixture.requiredPacketFields, fixture.requiredPacketFields[0]] },
    { ...fixture, mutationPackets: [...fixture.mutationPackets, fixture.mutationPackets[0]] },
    { ...fixture, blockers: [...fixture.blockers, 'unexpected_blocker'] },
    { ...fixture, requiredApprovals: [...fixture.requiredApprovals, 'unexpected_approval'] }
  ]) {
    const summary = summarizeDurableGovernanceMutationPacketContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('CM-0861 helper redacts sensitive normalized output and unsupported source types', () => {
  const fixture = loadFixture();
  const normalized = normalizeDurableGovernanceMutationPacketContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'authorization: Bearer DURABLE_TOKEN_1234567890'
    ],
    unsupportedSourceTypes: [
      'api_key=DURABLE_API_KEY_1234567890',
      'providerapikey=DURABLE_PROVIDER_API_KEY_1234567890',
      'password=DURABLE_PASSWORD_1234567890',
      'token=DURABLE_SUMMARY_TOKEN_1234567890',
      'set-cookie=session=DURABLE_COOKIE_1234567890',
      'workspace_id=workspace-durable-public',
      'https://example.test/durable',
      'C:\\secret\\.env'
    ],
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'raw_workspace_id=workspace-durable-raw'
    ],
    requiredWording: [
      ...fixture.requiredWording,
      'password=DURABLE_WORDING_PASSWORD_1234567890',
      'token=DURABLE_WORDING_TOKEN_1234567890'
    ],
    mutationPackets: fixture.mutationPackets.map((packet, index) => index === 0
      ? {
          ...packet,
          authorization: 'authorization: Bearer PACKET_TOKEN_1234567890',
          api_key: 'api_key=PACKET_API_KEY_1234567890',
          raw_workspace_id: 'raw_workspace_id=workspace-packet-raw',
          requiredFields: [
            ...packet.requiredFields,
            'field authorization: Bearer FIELD_TOKEN_1234567890 api_key=FIELD_API_KEY_1234567890 /Users/example/.env'
          ]
        }
      : packet
    )
  });
  const summary = summarizeDurableGovernanceMutationPacketContract(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'raw_workspace_id',
    'durable_token_1234567890',
    'packet_token_1234567890',
    'field_api_key_1234567890',
    'durable_password_1234567890',
    'durable_summary_token_1234567890',
    'durable_cookie_1234567890',
    'durable_provider_api_key_1234567890',
    'durable_wording_password_1234567890',
    'durable_wording_token_1234567890',
    'workspace_id',
    'workspace-durable-public',
    'https://example.test',
    'c:\\',
    '.env',
    'workspace-packet-raw'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }

  assert.equal(Object.hasOwn(normalized.mutationPackets[0], 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.mutationPackets[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.mutationPackets[0], 'raw_workspace_id'), false);
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
});
