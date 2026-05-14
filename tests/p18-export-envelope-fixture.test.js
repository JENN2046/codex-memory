const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'p18-export-envelope-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

function deterministicFixtureHash(exportEnvelope, importPreview) {
  const recordInput = exportEnvelope.records.map(record => [
    record.memory_id,
    record.lifecycle_status,
    record.supersedes.join(','),
    record.superseded_by || ''
  ].join(':'));
  const input = [
    exportEnvelope.schema_version,
    ...recordInput,
    ...exportEnvelope.chunks.map(chunk => chunk.chunk_id),
    ...exportEnvelope.tags.map(tag => tag.tag_id),
    ...exportEnvelope.audit_events.map(event => event.event_id),
    ...exportEnvelope.tombstones.map(tombstone => tombstone.tombstone_id),
    ...exportEnvelope.proposals.map(proposal => proposal.proposal_id),
    ...exportEnvelope.supersessionRefs.map(ref => `${ref.from}->${ref.to}:${ref.type}`),
    ...importPreview.conflictPreviews.map(conflict => `${conflict.case_id}:${conflict.code}:${conflict.status}`)
  ].join('|');

  return `fixture-sha256:${crypto.createHash('sha256').update(input).digest('hex')}`;
}

test('fixture parses with no side effects enabled', () => {
  assert.equal(fixture.schemaVersion, 'p18-export-envelope-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.runtimeImportExportImplemented, false);
  assert.equal(fixture.fileGenerationImplemented, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.durableMemoryTouched, false);
  assert.equal(fixture.realMemoryPreview, false);
});

test('public MCP tools remain frozen', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('export envelope has required stable sections', () => {
  const envelope = fixture.exportEnvelope;

  assert.equal(envelope.schema_version, 'vNext-export-envelope-p18');
  assert.equal(envelope.mode, 'synthetic-fixture');
  assert.equal(envelope.ordering.deterministic, true);
  assert.deepEqual(envelope.ordering.stableBy, ['memory_id']);
  assert.ok(envelope.records.length >= 6);
  assert.ok(Array.isArray(envelope.chunks));
  assert.ok(Array.isArray(envelope.tags));
  assert.ok(Array.isArray(envelope.audit_events));
  assert.ok(Array.isArray(envelope.tombstones));
  assert.ok(Array.isArray(envelope.proposals));
  assert.ok(Array.isArray(envelope.supersessionRefs));
});

test('records are sorted by memory_id for deterministic export', () => {
  const ids = fixture.exportEnvelope.records.map(record => record.memory_id);
  const sorted = [...ids].sort();

  assert.deepEqual(ids, sorted);
});

test('checksum is deterministic in fixture context', () => {
  const first = deterministicFixtureHash(fixture.exportEnvelope, fixture.importPreview);
  const second = deterministicFixtureHash(fixture.exportEnvelope, fixture.importPreview);

  assert.equal(first, second);
  assert.equal(fixture.exportEnvelope.checksum.algorithm, 'fixture-sha256');
  assert.equal(fixture.exportEnvelope.checksum.value, first);
});

test('lifecycle variants are represented', () => {
  const statuses = new Set(fixture.exportEnvelope.records.map(record => record.lifecycle_status));

  for (const status of ['active', 'stale', 'proposal', 'rejected', 'superseded', 'tombstoned']) {
    assert.equal(statuses.has(status), true, `${status} missing`);
  }
});

test('supersession refs are internally consistent', () => {
  const records = new Map(fixture.exportEnvelope.records.map(record => [record.memory_id, record]));
  const ref = fixture.exportEnvelope.supersessionRefs[0];

  assert.equal(records.has(ref.from), true);
  assert.equal(records.has(ref.to), true);
  assert.equal(records.get(ref.from).superseded_by, ref.to);
  assert.ok(records.get(ref.to).supersedes.includes(ref.from));
});

test('import conflict previews are safe and non-mutating', () => {
  const conflicts = fixture.importPreview.conflictPreviews;
  const codes = new Set(conflicts.map(conflict => conflict.code));

  assert.equal(fixture.importPreview.mode, 'dry-run-first');
  assert.equal(fixture.importPreview.apply_supported, false);
  assert.equal(fixture.importPreview.mutated, false);
  assert.equal(fixture.importPreview.providerCalls, 0);
  assert.equal(fixture.importPreview.durableMemoryTouched, false);
  assert.equal(fixture.importPreview.realMemoryPreview, false);
  for (const code of ['duplicate_memory_id', 'unsupported_schema_version', 'missing_source_provenance', 'missing_audit_refs']) {
    assert.equal(codes.has(code), true, `${code} missing`);
  }
  assert.equal(conflicts.every(conflict => conflict.mutated === false), true);
});

test('backup and rollback manifests are required but not generated', () => {
  assert.equal(fixture.backupRollbackPreview.backupRequiredBeforeApply, true);
  assert.equal(fixture.backupRollbackPreview.rollbackManifestRequired, true);
  assert.equal(fixture.backupRollbackPreview.generated, false);
  assert.equal(fixture.backupRollbackPreview.mutated, false);
});

test('raw secrets and raw workspace id are not exposed', () => {
  const text = JSON.stringify(fixture);
  const summaryText = JSON.stringify(fixture.exportEnvelope.lowRiskSummary);

  assert.equal(fixture.redactionApplied, true);
  assert.equal(fixture.rawSecretExposed, false);
  assert.equal(fixture.rawWorkspaceIdExposed, false);
  assert.equal(fixture.exportEnvelope.source.workspace.raw_workspace_id, null);
  assert.equal(fixture.exportEnvelope.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.exportEnvelope.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(/password=|api[_-]?key|bearer\s+|authorization|cookie/i.test(text), false);
  assert.equal(summaryText.includes('raw_workspace_id'), false);
});

test('fixture read is side-effect free', () => {
  deterministicFixtureHash(fixture.exportEnvelope, fixture.importPreview);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), fixtureText);
});
