const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const REQUIRED_MUTATION_PACKET_IDS = [
  'memory_validate',
  'memory_supersede',
  'memory_tombstone',
  'memory_exclude',
  'memory_forget'
];

function packetById(id) {
  const packet = fixture.mutationPackets.find(candidate => candidate.id === id);
  assert.ok(packet, `missing mutation packet: ${id}`);
  return packet;
}

test('CM-0861 durable governance packet fixture parses and locks top-level state', () => {
  assert.equal(fixture.schemaVersion, 'durable-governance-mutation-packet-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'CM-0861-durable-governance-mutation-packet-fixture-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
});

test('CM-0861 fixture declares no execution or runtime integration', () => {
  assert.equal(fixture.executionApproved, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.providerCalls, 0);
});

test('public MCP tools remain frozen and mutation packets stay internal-only', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);

  for (const id of REQUIRED_MUTATION_PACKET_IDS) {
    const packet = packetById(id);
    assert.equal(packet.publicMcpTool, false, id);
    assert.equal(packet.internalOnly, true, id);
  }
});

test('required packet fields cover audit, projection, and revision emission bridge', () => {
  for (const field of [
    'mutationFamily',
    'targetMemoryIds',
    'scopeTuple',
    'actorClientId',
    'requestSource',
    'reason',
    'evidenceSummary',
    'lifecycleTransition',
    'auditIntentPolicy',
    'auditCommitPolicy',
    'projectionPolicy',
    'revisionEmitter',
    'changedMemoryIdsPolicy',
    'rollbackPath',
    'validationMode'
  ]) {
    assert.ok(fixture.requiredPacketFields.includes(field), field);
  }
});

test('all durable mutation families remain blocked pending explicit approval', () => {
  assert.deepEqual(
    fixture.mutationPackets.map(packet => packet.id),
    REQUIRED_MUTATION_PACKET_IDS
  );

  for (const packet of fixture.mutationPackets) {
    assert.equal(packet.status, 'BLOCKED_PENDING_APPROVAL', packet.id);
    assert.equal(packet.requiresExplicitApproval, true, packet.id);
    assert.equal(packet.executionApproved, false, packet.id);
    assert.equal(packet.appendOnlyAuditRequired, true, packet.id);
    assert.equal(packet.shadowProjectionRequired, true, packet.id);
    assert.equal(packet.revisionEmissionRequired, true, packet.id);
    assert.equal(packet.changedMemoryIdsRequired, true, packet.id);
    assert.equal(packet.mutated, false, packet.id);
  }
});

test('validate packet remains single-target and aligned with internal validate flow', () => {
  const packet = packetById('memory_validate');

  assert.equal(packet.targetCardinality, 'single');
  assert.ok(packet.requiredFields.includes('fromStatus'));
  assert.ok(packet.requiredFields.includes('toStatus'));
  assert.ok(packet.requiredFields.includes('auditIntentPolicy'));
  assert.ok(packet.requiredFields.includes('auditCommitPolicy'));
});

test('supersede packet requires bidirectional links and pair targets', () => {
  const packet = packetById('memory_supersede');

  assert.equal(packet.targetCardinality, 'pair');
  assert.ok(packet.requiredFields.includes('oldMemoryId'));
  assert.ok(packet.requiredFields.includes('newMemoryId'));
  assert.ok(packet.requiredFields.includes('supersedesLink'));
  assert.ok(packet.requiredFields.includes('supersededByLink'));
});

test('tombstone exclude and forget remain logical non-destructive packets', () => {
  for (const id of ['memory_tombstone', 'memory_exclude', 'memory_forget']) {
    const packet = packetById(id);
    assert.equal(packet.hardDeleteAllowed, false, id);
    assert.equal(packet.targetCardinality, 'single', id);
  }

  assert.ok(packetById('memory_tombstone').requiredFields.includes('tombstoneReason'));
  assert.ok(packetById('memory_exclude').requiredFields.includes('logicalExclusionReason'));
  assert.ok(packetById('memory_forget').requiredFields.includes('retentionPolicy'));
});

test('blockers and safety flags preserve no-side-effect planning state', () => {
  for (const blocker of [
    'durable_governance_runtime_apply_not_implemented',
    'append_only_audit_writer_runtime_not_implemented',
    'shadow_projection_runtime_not_implemented',
    'sqlite_schema_apply_not_approved',
    'public_mcp_governance_expansion_not_approved',
    'real_memory_governance_preview_blocked',
    'provider_service_config_action_blocked',
    'push_tag_release_deploy_blocked',
    'v1_rc_not_ready_blocked'
  ]) {
    assert.ok(fixture.blockers.includes(blocker), blocker);
  }

  assert.equal(fixture.safety.noRuntimeGovernanceMutation, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noRealMemoryScan, true);
  assert.equal(fixture.safety.noSqliteSchemaApply, true);
  assert.equal(fixture.safety.noProviderCall, true);
  assert.equal(fixture.safety.noServiceStart, true);
  assert.equal(fixture.safety.noConfigMutation, true);
  assert.equal(fixture.safety.noPackageScriptChange, true);
  assert.equal(fixture.safety.noRemoteWrite, true);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});

test('required wording and forbidden claims prevent readiness overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('does not execute durable governance mutation')));
  assert.ok(fixture.requiredWording.some(line => line.includes('BLOCKED_PENDING_APPROVAL')));
  assert.ok(fixture.requiredWording.some(line => line.includes('internal-only')));
  assert.ok(fixture.forbiddenClaims.includes('durable governance mutation runtime is implemented'));
  assert.ok(fixture.forbiddenClaims.includes('RC readiness is unblocked'));
});

test('fixture text does not expose raw secrets or concrete raw workspace ids', () => {
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
