const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'vcp-memory-import-export-shape-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

function deterministicFixtureHash(exportEnvelope, importEnvelope) {
  const input = [
    exportEnvelope.schema_version,
    ...exportEnvelope.records.map(record => record.memory_id),
    ...exportEnvelope.chunks.map(chunk => chunk.chunk_id),
    ...exportEnvelope.tags.map(tag => tag.tag_id),
    ...exportEnvelope.audit_events.map(event => event.event_id),
    ...exportEnvelope.tombstones.map(tombstone => tombstone.tombstone_id),
    ...exportEnvelope.proposals.map(proposal => proposal.proposal_id),
    importEnvelope.import_mode
  ].join('|');

  return `fixture-sha256:${crypto.createHash('sha256').update(input).digest('hex')}`;
}

test('fixture parses', () => {
  assert.equal(fixture.schemaVersion, 'vcp-memory-import-export-shape-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.fileGenerationImplemented, false);
  assert.equal(fixture.runtimeImportExportImplemented, false);
  assert.equal(fixture.mutated, false);
});

test('export envelope has schema_version', () => {
  assert.equal(fixture.exportEnvelope.schema_version, 'vNext-import-export-safe-json');
  assert.match(fixture.exportEnvelope.exported_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('import envelope has schema_version', () => {
  assert.equal(fixture.importEnvelope.schema_version, fixture.exportEnvelope.schema_version);
  assert.equal(fixture.importEnvelope.apply_supported, false);
  assert.equal(fixture.importEnvelope.requires_explicit_approval, true);
});

test('records preserve memory_id', () => {
  const record = fixture.exportEnvelope.records[0];

  assert.equal(record.memory_id, 'mem-p13-ie-001');
  assert.equal(record.kind, 'MemoryRecord');
  assert.ok(record.audit_refs.includes('audit-p13-ie-001'));
});

test('chunks preserve chunk refs', () => {
  const record = fixture.exportEnvelope.records[0];
  const chunk = fixture.exportEnvelope.chunks[0];

  assert.ok(record.chunk_refs.includes(chunk.chunk_id));
  assert.equal(chunk.memory_id, record.memory_id);
});

test('tags preserve tag refs', () => {
  const record = fixture.exportEnvelope.records[0];
  const tag = fixture.exportEnvelope.tags[0];

  assert.ok(record.tag_refs.includes(tag.tag_id));
  assert.equal(tag.memory_id, record.memory_id);
});

test('audit_events preserve event_id', () => {
  const event = fixture.exportEnvelope.audit_events[0];

  assert.equal(event.event_id, 'audit-p13-ie-001');
  assert.equal(event.memory_id, 'mem-p13-ie-001');
  assert.equal(event.event_type, 'record_memory');
});

test('tombstones remain hidden by default', () => {
  const tombstone = fixture.exportEnvelope.tombstones[0];

  assert.equal(tombstone.hidden, true);
  assert.equal(tombstone.hard_delete, false);
});

test('proposals remain inactive by default', () => {
  const proposal = fixture.exportEnvelope.proposals[0];

  assert.equal(proposal.active, false);
  assert.equal(proposal.requires_review, true);
});

test('redaction_applied is required', () => {
  assert.equal(fixture.exportEnvelope.redaction_applied, true);
  assert.equal(fixture.importEnvelope.redaction_applied, true);
  assert.equal(fixture.exportEnvelope.audit_events.every(event => event.redaction_applied === true), true);
});

test('raw secrets are forbidden', () => {
  const text = JSON.stringify(fixture);

  assert.equal(fixture.exportEnvelope.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.importEnvelope.rawSecretExposed, false);
  assert.equal(/fixture-raw-secret|password=|api[_-]?key|bearer\s+/i.test(text), false);
});

test('raw workspace_id is forbidden in low-risk summary', () => {
  const summaryText = JSON.stringify(fixture.exportEnvelope.lowRiskSummary);

  assert.equal(fixture.exportEnvelope.source_workspace.raw_workspace_id, null);
  assert.equal(fixture.exportEnvelope.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.importEnvelope.rawWorkspaceIdExposed, false);
  assert.equal(summaryText.includes('raw_workspace_id'), false);
});

test('checksum hash is deterministic in fixture context', () => {
  const first = deterministicFixtureHash(fixture.exportEnvelope, fixture.importEnvelope);
  const second = deterministicFixtureHash(fixture.exportEnvelope, fixture.importEnvelope);

  assert.equal(first, second);
  assert.equal(fixture.exportEnvelope.checksum.algorithm, 'fixture-sha256');
  assert.equal(fixture.exportEnvelope.checksum.value, first);
});

test('import mode is dry-run-first', () => {
  assert.equal(fixture.exportEnvelope.import_mode, 'dry-run-first');
  assert.equal(fixture.importEnvelope.import_mode, 'dry-run-first');
});

test('mutated=false', () => {
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.exportEnvelope.mutated, false);
  assert.equal(fixture.importEnvelope.mutated, false);
  assert.equal(fixture.exportEnvelope.migrations.every(migration => migration.mutated === false), true);
});

test('no side effects', () => {
  const before = fixtureText;

  deterministicFixtureHash(fixture.exportEnvelope, fixture.importEnvelope);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
