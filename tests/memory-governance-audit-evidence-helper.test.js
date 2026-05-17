const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_EVENT_FAMILY_IDS,
  REQUIRED_EVIDENCE_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceAuditEvidenceContract,
  summarizeMemoryGovernanceAuditEvidenceContract
} = require('../src/core/MemoryGovernanceAuditEvidenceContract');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-audit-evidence-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('P33.2 helper summarizes explicit audit evidence fixture input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeMemoryGovernanceAuditEvidenceContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'memory-governance-audit-evidence-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.auditWriterImplemented, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, []);
  assert.equal(summary.requiredEvidenceFields.requiredPresent, true);
  assert.deepEqual(summary.requiredEvidenceFields.missingRequired, []);
  assert.equal(summary.eventFamilies.requiredPresent, true);
  assert.equal(summary.eventFamilies.blocked, true);
  assert.deepEqual(summary.eventFamilies.missingRequired, []);
  assert.equal(summary.publicMcpTools.frozen, true);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.publicMcpTools.validateMemoryInternalOnly, true);
  assert.equal(summary.blockers.requiredPresent, true);
  assert.equal(summary.requiredApprovals.requiredPresent, true);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.writesDurableAudit, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P33.2 helper normalizes expected audit evidence fields', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeMemoryGovernanceAuditEvidenceContract(fixture);

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.reviewOnly, true);
  assert.equal(normalized.auditWriterImplemented, false);
  assert.equal(normalized.durableAuditWritten, false);
  assert.equal(normalized.executionApproved, false);
  assert.equal(normalized.mutated, false);
  assert.equal(normalized.runtimeIntegrated, false);
  assert.equal(normalized.publicMcpExpanded, false);
  assert.equal(normalized.realMemoryScanned, false);
  assert.equal(normalized.providerCalls, 0);
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.requiredEvidenceFields, REQUIRED_EVIDENCE_FIELDS);
  assert.deepEqual(normalized.eventFamilies.map(eventFamily => eventFamily.id), REQUIRED_EVENT_FAMILY_IDS);
  assert.deepEqual(REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker)), []);
  assert.deepEqual(REQUIRED_APPROVALS.filter(approval => !normalized.requiredApprovals.includes(approval)), []);
  assert.equal(JSON.stringify(fixture), before);
});

test('P33.2 helper does not perform implicit fixture reads', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during audit evidence helper evaluation');
  };

  try {
    const summary = summarizeMemoryGovernanceAuditEvidenceContract(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('P33.2 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeMemoryGovernanceAuditEvidenceContract(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.auditWriterImplemented, false);
    assert.equal(summary.durableAuditWritten, false);
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.realMemoryScanned, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.requiredEvidenceFields.requiredPresent, false);
    assert.deepEqual(summary.requiredEvidenceFields.missingRequired, REQUIRED_EVIDENCE_FIELDS);
    assert.equal(summary.eventFamilies.requiredPresent, false);
    assert.deepEqual(summary.eventFamilies.missingRequired, REQUIRED_EVENT_FAMILY_IDS);
    assert.equal(summary.eventFamilies.blocked, true);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.blockers.requiredPresent, false);
    assert.equal(summary.requiredApprovals.requiredPresent, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P33.2 helper rejects unsupported source types', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceAuditEvidenceContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'live_audit_log'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, ['live_audit_log']);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
});

test('P33.2 helper does not allow input to redefine the source type whitelist', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceAuditEvidenceContract({
    ...fixture,
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'live_audit_log'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, ['live_audit_log']);
});

test('P33.2 helper rejects audit writer, execution, readiness, and runtime claims', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, decision: 'READY' },
    { ...fixture, approvalStatus: 'APPROVED' },
    { ...fixture, auditWriterImplemented: true },
    { ...fixture, durableAuditWritten: true },
    { ...fixture, executionApproved: true },
    { ...fixture, mutated: true },
    { ...fixture, runtimeIntegrated: true },
    { ...fixture, publicMcpExpanded: true },
    { ...fixture, realMemoryScanned: true },
    { ...fixture, providerCalls: 1 },
    { ...fixture, publicTools: ['record_memory', 'search_memory'] }
  ]) {
    const summary = summarizeMemoryGovernanceAuditEvidenceContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
    assert.equal(summary.safety.writesDurableAudit, false);
  }
});

test('P33.2 helper requires all event families and evidence fields', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceAuditEvidenceContract({
    ...fixture,
    requiredEvidenceFields: fixture.requiredEvidenceFields.filter(field => field !== 'validationEvidence'),
    eventFamilies: fixture.eventFamilies.filter(eventFamily => eventFamily.id !== 'memory_tombstone')
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.requiredEvidenceFields.requiredPresent, false);
  assert.deepEqual(summary.requiredEvidenceFields.missingRequired, ['validationEvidence']);
  assert.equal(summary.eventFamilies.requiredPresent, false);
  assert.deepEqual(summary.eventFamilies.missingRequired, ['memory_tombstone']);
});

test('P33.2 helper rejects unblocked event family records', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceAuditEvidenceContract({
    ...fixture,
    eventFamilies: fixture.eventFamilies.map(eventFamily =>
      eventFamily.id === 'memory_proposal_accept'
        ? { ...eventFamily, status: 'APPROVED', executionApproved: true }
        : eventFamily
    )
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.eventFamilies.requiredPresent, true);
  assert.equal(summary.eventFamilies.blocked, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
});
