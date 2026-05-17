const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_ACTION_IDS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_PACKET_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceApprovalPacketContract,
  summarizeMemoryGovernanceApprovalPacketContract
} = require('../src/core/MemoryGovernanceApprovalPacketContract');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-approval-packet-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('P32.2 helper summarizes explicit approval packet fixture input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeMemoryGovernanceApprovalPacketContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'memory-governance-approval-packet-v1');
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
  assert.equal(summary.governedActions.requiredPresent, true);
  assert.equal(summary.governedActions.blocked, true);
  assert.deepEqual(summary.governedActions.missingRequired, []);
  assert.equal(summary.publicMcpTools.frozen, true);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.publicMcpTools.validateMemoryInternalOnly, true);
  assert.equal(summary.blockers.requiredPresent, true);
  assert.deepEqual(summary.blockers.missingRequired, []);
  assert.equal(summary.requiredApprovals.requiredPresent, true);
  assert.deepEqual(summary.requiredApprovals.missingRequired, []);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(summary.safety.scansRealMemory, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P32.2 helper normalizes expected approval packet fields', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeMemoryGovernanceApprovalPacketContract(fixture);

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
  assert.deepEqual(normalized.governedActions.map(action => action.id), REQUIRED_ACTION_IDS);
  assert.deepEqual(REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker)), []);
  assert.deepEqual(REQUIRED_APPROVALS.filter(approval => !normalized.requiredApprovals.includes(approval)), []);
  assert.equal(JSON.stringify(fixture), before);
});

test('P32.2 helper does not perform implicit fixture reads', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during approval packet helper evaluation');
  };

  try {
    const summary = summarizeMemoryGovernanceApprovalPacketContract(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('P32.2 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeMemoryGovernanceApprovalPacketContract(malformedInput);

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
    assert.equal(summary.governedActions.requiredPresent, false);
    assert.deepEqual(summary.governedActions.missingRequired, REQUIRED_ACTION_IDS);
    assert.equal(summary.governedActions.blocked, true);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.blockers.requiredPresent, false);
    assert.equal(summary.requiredApprovals.requiredPresent, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P32.2 helper rejects unsupported source types', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceApprovalPacketContract({
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

test('P32.2 helper does not allow input to redefine the source type whitelist', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceApprovalPacketContract({
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

test('P32.2 helper rejects execution, readiness, and runtime claims', () => {
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
    const summary = summarizeMemoryGovernanceApprovalPacketContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
  }
});

test('P32.2 helper requires all governed actions and packet fields', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceApprovalPacketContract({
    ...fixture,
    requiredPacketFields: fixture.requiredPacketFields.filter(field => field !== 'rollbackPath'),
    governedActions: fixture.governedActions.filter(action => action.id !== 'tombstone_apply')
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.requiredPacketFields.requiredPresent, false);
  assert.deepEqual(summary.requiredPacketFields.missingRequired, ['rollbackPath']);
  assert.equal(summary.governedActions.requiredPresent, false);
  assert.deepEqual(summary.governedActions.missingRequired, ['tombstone_apply']);
});

test('P32.2 helper rejects unblocked governed action records', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceApprovalPacketContract({
    ...fixture,
    governedActions: fixture.governedActions.map(action =>
      action.id === 'proposal_accept'
        ? { ...action, status: 'APPROVED', executionApproved: true }
        : action
    )
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.governedActions.requiredPresent, true);
  assert.equal(summary.governedActions.blocked, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
});

test('P32.2 helper rejects schema/version drift and non-exact required sets', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, schemaVersion: 'unsupported-schema' },
    { ...fixture, version: 'v2' },
    { ...fixture, requiredPacketFields: [...fixture.requiredPacketFields, fixture.requiredPacketFields[0]] },
    { ...fixture, governedActions: [...fixture.governedActions, fixture.governedActions[0]] },
    { ...fixture, blockers: [...fixture.blockers, 'unexpected_blocker'] },
    { ...fixture, requiredApprovals: [...fixture.requiredApprovals, 'unexpected_approval'] }
  ]) {
    const summary = summarizeMemoryGovernanceApprovalPacketContract(unsafeContract);

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

test('P32.2 helper redacts sensitive normalized output and unsupported source types', () => {
  const fixture = loadFixture();
  const normalized = normalizeMemoryGovernanceApprovalPacketContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'authorization: Bearer APPROVAL_TOKEN_1234567890'
    ],
    unsupportedSourceTypes: [
      'api_key=APPROVAL_API_KEY_1234567890',
      'providerapikey=APPROVAL_PROVIDER_API_KEY_1234567890',
      'password=APPROVAL_PASSWORD_1234567890',
      'token=APPROVAL_SUMMARY_TOKEN_1234567890',
      'set-cookie=session=APPROVAL_COOKIE_1234567890',
      'workspace_id=workspace-approval-public',
      'https://example.test/approval',
      'C:\\secret\\.env'
    ],
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'raw_workspace_id=workspace-approval-raw'
    ],
    requiredWording: [
      ...fixture.requiredWording,
      'password=APPROVAL_WORDING_PASSWORD_1234567890',
      'token=APPROVAL_WORDING_TOKEN_1234567890',
      'set-cookie=session=APPROVAL_WORDING_COOKIE_1234567890'
    ],
    governedActions: fixture.governedActions.map((action, index) => index === 0
      ? {
          ...action,
          authorization: 'authorization: Bearer ACTION_TOKEN_1234567890',
          bearer: 'Bearer ACTION_BEARER_1234567890',
          api_key: 'api_key=ACTION_API_KEY_1234567890',
          raw_workspace_id: 'raw_workspace_id=workspace-action-raw',
          requiredFields: [
            ...action.requiredFields,
            'source authorization: Bearer FIELD_TOKEN_1234567890 api_key=FIELD_API_KEY_1234567890 /Users/example/.env'
          ]
        }
      : action
    )
  });
  const summary = summarizeMemoryGovernanceApprovalPacketContract(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'raw_workspace_id',
    'approval_token_1234567890',
    'action_token_1234567890',
    'field_api_key_1234567890',
    'approval_password_1234567890',
    'approval_summary_token_1234567890',
    'approval_cookie_1234567890',
    'approval_provider_api_key_1234567890',
    'approval_wording_password_1234567890',
    'approval_wording_token_1234567890',
    'approval_wording_cookie_1234567890',
    'workspace_id',
    'workspace-approval-public',
    'https://example.test',
    'c:\\',
    '.env',
    'workspace-action-raw'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }

  assert.equal(Object.hasOwn(normalized.governedActions[0], 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.governedActions[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.governedActions[0], 'raw_workspace_id'), false);
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
