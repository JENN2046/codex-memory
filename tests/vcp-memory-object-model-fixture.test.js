const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'vcp-memory-object-model-v1.json');

const OBJECT_FAMILIES = [
  'MemoryRecord',
  'MemoChunk',
  'KnowledgeChunk',
  'Tag',
  'AgentProfile',
  'ProjectContext',
  'TaskContext',
  'Checkpoint',
  'Handoff',
  'AuditEvent',
  'Tombstone',
  'MemoryProposal',
  'MemoryMigration'
];

const MEMORY_RECORD_REQUIRED_FIELDS = [
  'memory_id',
  'schema_version',
  'kind',
  'title',
  'content_ref',
  'content_hash',
  'source',
  'provenance',
  'created_at',
  'updated_at',
  'project_id',
  'workspace_id',
  'client_id',
  'agent_id',
  'task_id',
  'visibility',
  'lifecycle_status',
  'supersedes_memory_id',
  'superseded_by_memory_id',
  'retention_policy',
  'audit_refs',
  'tag_refs',
  'chunk_refs'
];

const LIFECYCLE_OBJECTS = [
  'MemoryRecord',
  'MemoChunk',
  'KnowledgeChunk',
  'Tombstone',
  'MemoryProposal',
  'MemoryMigration'
];

const AUDIT_BEARING_OBJECTS = [
  'MemoryRecord',
  'Checkpoint',
  'Handoff',
  'AuditEvent',
  'Tombstone',
  'MemoryProposal',
  'MemoryMigration'
];

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function objectMap(fixture) {
  return new Map(fixture.objectFamilies.map(object => [object.object_name, object]));
}

function fieldsFor(object) {
  return new Set([...object.required_fields, ...object.optional_fields]);
}

test('vcp memory object model fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'vcp-memory-object-model-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P13.1-object-model-fixture-schemas');
  assert.equal(fixture.runtimeMutationImplemented, false);
  assert.equal(fixture.sqliteMigrationImplemented, false);
});

test('object family is complete', () => {
  const fixture = loadFixture();
  const names = fixture.objectFamilies.map(object => object.object_name);

  assert.deepEqual(names, OBJECT_FAMILIES);
});

test('object names are unique', () => {
  const fixture = loadFixture();
  const names = fixture.objectFamilies.map(object => object.object_name);

  assert.equal(new Set(names).size, names.length);
  assert.equal(fixture.rules.objectNamesUnique, true);
});

test('schema_version is present for every object', () => {
  const fixture = loadFixture();

  assert.equal(fixture.rules.schemaVersionsRequired, true);
  for (const object of fixture.objectFamilies) {
    assert.equal(object.schema_version, 'v1', object.object_name);
  }
});

test('MemoryRecord required fields are complete', () => {
  const fixture = loadFixture();
  const memoryRecord = objectMap(fixture).get('MemoryRecord');

  assert.deepEqual(memoryRecord.required_fields, MEMORY_RECORD_REQUIRED_FIELDS);
});

test('lifecycle objects include lifecycle boundary', () => {
  const fixture = loadFixture();
  const objects = objectMap(fixture);

  for (const name of LIFECYCLE_OBJECTS) {
    const object = objects.get(name);
    assert.equal(object.lifecycle_boundary.required, true, name);
    assert.equal(object.lifecycle_boundary.missing_vnext_fields, 'safe-null-or-unknown', name);
  }
});

test('audit-bearing objects include audit boundary', () => {
  const fixture = loadFixture();
  const objects = objectMap(fixture);

  for (const name of AUDIT_BEARING_OBJECTS) {
    const object = objects.get(name);
    assert.equal(object.audit_boundary.required, true, name);
    assert.equal(object.audit_boundary.raw_secret_output_allowed, false, name);
  }
});

test('privacy boundary is present for all scope-sensitive objects', () => {
  const fixture = loadFixture();

  for (const object of fixture.objectFamilies) {
    if (!object.privacy_boundary.scope_sensitive) {
      continue;
    }

    assert.equal(object.privacy_boundary.raw_secret_output_allowed, false, object.object_name);
    assert.equal(
      object.privacy_boundary.low_risk_summary_raw_workspace_id_allowed,
      false,
      object.object_name
    );
  }
});

test('import/export safe objects include provenance or source', () => {
  const fixture = loadFixture();

  for (const object of fixture.objectFamilies) {
    if (!object.import_export_safe.safe) {
      continue;
    }

    assert.equal(object.import_export_safe.requires_source_or_provenance, true, object.object_name);
    assert.equal(object.import_export_safe.ambiguous, false, object.object_name);
    assert.equal(
      fieldsFor(object).has('source') || fieldsFor(object).has('provenance'),
      true,
      object.object_name
    );
  }
});

test('MemoryProposal is inactive by default', () => {
  const fixture = loadFixture();
  const proposal = objectMap(fixture).get('MemoryProposal');

  assert.equal(fixture.rules.memoryProposalActiveByDefaultAllowed, false);
  assert.equal(proposal.lifecycle_boundary.default_status, 'proposal');
  assert.equal(proposal.lifecycle_boundary.treated_as_active_by_default, false);
});

test('Tombstone is not visible by default', () => {
  const fixture = loadFixture();
  const tombstone = objectMap(fixture).get('Tombstone');

  assert.equal(fixture.rules.tombstoneImportExportAmbiguousAllowed, false);
  assert.equal(tombstone.lifecycle_boundary.status, 'tombstoned');
  assert.equal(tombstone.lifecycle_boundary.visible_by_default, false);
  assert.equal(tombstone.import_export_safe.ambiguous, false);
});

test('no object allows raw secret output', () => {
  const fixture = loadFixture();

  assert.equal(fixture.policy.rawSecretOutputAllowed, false);
  assert.equal(fixture.rules.auditEventRawSecretsAllowed, false);

  for (const object of fixture.objectFamilies) {
    assert.equal(object.privacy_boundary.raw_secret_output_allowed, false, object.object_name);
    assert.equal(object.audit_boundary.raw_secret_output_allowed, false, object.object_name);
  }
});

test('no low-risk summary allows raw workspace_id', () => {
  const fixture = loadFixture();

  assert.equal(fixture.policy.lowRiskSummaryAllowsRawWorkspaceId, false);
  assert.equal(fixture.rules.lowRiskSummaryRawWorkspaceIdAllowed, false);

  for (const object of fixture.objectFamilies) {
    assert.equal(
      object.privacy_boundary.low_risk_summary_raw_workspace_id_allowed,
      false,
      object.object_name
    );
  }
});
