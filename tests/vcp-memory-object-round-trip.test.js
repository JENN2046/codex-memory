const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'vcp-memory-object-round-trip-v1.json');

const REQUIRED_OBJECTS = [
  'MemoryRecord',
  'MemoChunk',
  'KnowledgeChunk',
  'Tag',
  'AuditEvent',
  'MemoryProposal',
  'Tombstone',
  'Checkpoint',
  'Handoff'
];

const MEMORY_RECORD_DEFAULTS = {
  schema_version: 'unknown',
  kind: 'unknown',
  content_hash: null,
  source: { source_type: 'unknown' },
  provenance: null,
  project_id: null,
  workspace_id: null,
  client_id: 'unknown',
  agent_id: 'unknown',
  task_id: null,
  visibility: 'unknown',
  lifecycle_status: 'unknown',
  supersedes_memory_id: null,
  superseded_by_memory_id: null,
  retention_policy: 'unknown',
  audit_refs: [],
  tag_refs: [],
  chunk_refs: []
};

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, sortJsonValue(value[key])])
    );
  }

  return value;
}

function normalizeObjectEnvelope(envelope) {
  const normalized = deepClone(envelope);
  normalized.data = normalized.data || {};

  if (normalized.object_name === 'MemoryRecord') {
    normalized.data = {
      ...deepClone(MEMORY_RECORD_DEFAULTS),
      ...normalized.data
    };
  }

  normalized.normalization = {
    fixture_only: true,
    inferred_missing_vnext_fields: false,
    missing_vnext_fields: 'safe-null-or-unknown',
    mutated: false
  };

  return normalized;
}

function exportSafeJson(normalizedEnvelope) {
  const data = deepClone(normalizedEnvelope.data);
  const workspaceId = data.workspace_id || null;

  const exported = {
    object_name: normalizedEnvelope.object_name,
    schema_version: normalizedEnvelope.schema_version,
    kind: normalizedEnvelope.kind,
    data,
    export_boundary: {
      fixture_only: true,
      import_export_runtime_implemented: false,
      raw_secret_exposed: false,
      raw_workspace_id_in_low_risk_summary: false,
      low_risk_summary: {
        object_name: normalizedEnvelope.object_name,
        memory_id: data.memory_id || null,
        workspace_id_present: Boolean(workspaceId),
        workspace_id_hash_ref: workspaceId ? `hash:${Buffer.from(workspaceId).toString('hex')}` : null,
        scope_dimensions: ['project_id', 'workspace_id', 'client_id', 'agent_id', 'task_id', 'visibility']
          .filter(key => data[key] !== null && data[key] !== undefined),
        raw_workspace_id_exposed: false
      }
    },
    side_effects: {
      mutated: false,
      database_write: false,
      diary_write: false,
      vector_write: false,
      audit_log_write: false,
      durable_memory_write: false,
      runtime_mapper_used: false
    }
  };

  return sortJsonValue(exported);
}

function reloadExportedObject(exportedObject) {
  return JSON.parse(JSON.stringify(exportedObject));
}

function findEnvelope(fixture, objectName) {
  return fixture.sourceFixture.envelopes.find(envelope => envelope.object_name === objectName);
}

function roundTrip(envelope) {
  const normalized = normalizeObjectEnvelope(envelope);
  const exported = exportSafeJson(normalized);
  const reloaded = reloadExportedObject(exported);
  return { normalized, exported, reloaded };
}

test('fixture parses and contains required object envelopes', () => {
  const fixture = loadFixture();
  const objectNames = fixture.sourceFixture.envelopes.map(envelope => envelope.object_name);

  assert.equal(fixture.schemaVersion, 'vcp-memory-object-round-trip-v1');
  assert.equal(fixture.phase, 'P13.2-object-model-round-trip-fixture-tests');
  assert.equal(fixture.runtimeMutationImplemented, false);
  assert.equal(fixture.importExportRuntimeImplemented, false);
  assert.equal(fixture.sqliteMigrationImplemented, false);

  for (const objectName of REQUIRED_OBJECTS) {
    assert.equal(objectNames.includes(objectName), true, objectName);
  }
});

test('round-trip keeps memory_id', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.equal(reloaded.data.memory_id, memoryRecord.data.memory_id);
});

test('round-trip keeps schema_version', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.equal(reloaded.data.schema_version, memoryRecord.data.schema_version);
  assert.equal(reloaded.schema_version, memoryRecord.schema_version);
});

test('round-trip keeps kind', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.equal(reloaded.kind, memoryRecord.kind);
  assert.equal(reloaded.data.kind, memoryRecord.data.kind);
});

test('round-trip keeps source and provenance', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.deepEqual(reloaded.data.source, memoryRecord.data.source);
  assert.deepEqual(reloaded.data.provenance, memoryRecord.data.provenance);
});

test('round-trip keeps scope fields', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  for (const field of ['project_id', 'workspace_id', 'client_id', 'agent_id', 'task_id', 'visibility']) {
    assert.equal(reloaded.data[field], memoryRecord.data[field], field);
  }
});

test('round-trip keeps lifecycle_status', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.equal(reloaded.data.lifecycle_status, memoryRecord.data.lifecycle_status);
});

test('round-trip keeps supersession refs', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.equal(reloaded.data.supersedes_memory_id, memoryRecord.data.supersedes_memory_id);
  assert.equal(reloaded.data.superseded_by_memory_id, memoryRecord.data.superseded_by_memory_id);
});

test('round-trip keeps audit_refs', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.deepEqual(reloaded.data.audit_refs, memoryRecord.data.audit_refs);
});

test('round-trip keeps tag_refs', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.deepEqual(reloaded.data.tag_refs, memoryRecord.data.tag_refs);
});

test('round-trip keeps chunk_refs', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { reloaded } = roundTrip(memoryRecord);

  assert.deepEqual(reloaded.data.chunk_refs, memoryRecord.data.chunk_refs);
});

test('MemoryProposal remains inactive by default', () => {
  const fixture = loadFixture();
  const proposal = findEnvelope(fixture, 'MemoryProposal');
  const { reloaded } = roundTrip(proposal);

  assert.equal(reloaded.data.status, 'proposal');
  assert.equal(reloaded.data.active_by_default, false);
});

test('Tombstone remains hidden by default', () => {
  const fixture = loadFixture();
  const tombstone = findEnvelope(fixture, 'Tombstone');
  const { reloaded } = roundTrip(tombstone);

  assert.equal(reloaded.data.visible_by_default, false);
  assert.equal(reloaded.data.hard_delete_allowed, false);
});

test('AuditEvent does not expose raw secrets', () => {
  const fixture = loadFixture();
  const auditEvent = findEnvelope(fixture, 'AuditEvent');
  const { reloaded } = roundTrip(auditEvent);
  const json = JSON.stringify(reloaded);

  assert.equal(reloaded.data.redaction_applied, true);
  assert.equal(reloaded.data.diff_summary.raw_secret_exposed, false);
  assert.equal(/sk-live|BEGIN PRIVATE KEY|raw-secret-value|password=/i.test(json), false);
});

test('low-risk export summary does not expose raw workspace_id', () => {
  const fixture = loadFixture();
  const memoryRecord = findEnvelope(fixture, 'MemoryRecord');
  const { exported } = roundTrip(memoryRecord);
  const summaryJson = JSON.stringify(exported.export_boundary.low_risk_summary);

  assert.equal(exported.export_boundary.low_risk_summary.workspace_id_present, true);
  assert.equal(exported.export_boundary.low_risk_summary.raw_workspace_id_exposed, false);
  assert.equal(summaryJson.includes(memoryRecord.data.workspace_id), false);
});

test('missing optional vNext fields normalize to null or unknown, not inferred', () => {
  const fixture = loadFixture();
  const legacyEnvelope = fixture.sourceFixture.legacyOptionalMissingCase;
  const normalized = normalizeObjectEnvelope(legacyEnvelope);

  assert.equal(normalized.data.memory_id, legacyEnvelope.data.memory_id);
  assert.equal(normalized.data.agent_id, 'unknown');
  assert.equal(normalized.data.visibility, 'unknown');
  assert.equal(normalized.data.lifecycle_status, 'unknown');
  assert.equal(normalized.data.provenance, null);
  assert.equal(normalized.data.project_id, null);
  assert.equal(normalized.data.workspace_id, null);
  assert.equal(normalized.data.supersedes_memory_id, null);
  assert.equal(normalized.data.superseded_by_memory_id, null);
  assert.deepEqual(normalized.data.audit_refs, []);
  assert.notEqual(normalized.data.agent_id, normalized.data.client_id);
});

test('export-safe JSON is stable under JSON stringify and parse', () => {
  const fixture = loadFixture();
  const exports = fixture.sourceFixture.envelopes.map(envelope =>
    exportSafeJson(normalizeObjectEnvelope(envelope))
  );

  assert.deepEqual(JSON.parse(JSON.stringify(exports)), exports);
});

test('no mutation or side effect happens during round-trip', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);

  const exports = [
    ...fixture.sourceFixture.envelopes,
    fixture.sourceFixture.legacyOptionalMissingCase
  ].map(envelope => roundTrip(envelope).reloaded);

  assert.equal(JSON.stringify(fixture), before);
  assert.deepEqual(fixture.sideEffectSentinel, {
    mutated: false,
    databaseWrite: false,
    diaryWrite: false,
    vectorWrite: false,
    auditLogWrite: false,
    durableMemoryWrite: false,
    runtimeMapperUsed: false
  });

  for (const exported of exports) {
    assert.equal(exported.side_effects.mutated, false);
    assert.equal(exported.side_effects.database_write, false);
    assert.equal(exported.side_effects.diary_write, false);
    assert.equal(exported.side_effects.vector_write, false);
    assert.equal(exported.side_effects.audit_log_write, false);
    assert.equal(exported.side_effects.durable_memory_write, false);
    assert.equal(exported.side_effects.runtime_mapper_used, false);
  }
});
