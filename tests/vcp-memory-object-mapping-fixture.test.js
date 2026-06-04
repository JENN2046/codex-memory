const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'vcp-memory-object-mapping-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_SQLITE_FIELDS = [
  'memory_id',
  'title',
  'content',
  'project_id',
  'workspace_id',
  'visibility',
  'created_at',
  'updated_at'
];

const OPTIONAL_VNEXT_FIELDS = [
  ['client_id', 'unknown'],
  ['agent_id', null],
  ['task_id', null],
  ['lifecycle_status', 'unknown'],
  ['supersedes_memory_id', null],
  ['superseded_by_memory_id', null]
];

function stableHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function contentHash(sqliteRecord, diaryRecord) {
  const payload = JSON.stringify({
    sqlite: {
      memory_id: sqliteRecord.memory_id ?? null,
      title: sqliteRecord.title ?? null,
      content: sqliteRecord.content ?? null
    },
    diary: diaryRecord
      ? {
          title: diaryRecord.title ?? null,
          evidence: diaryRecord.evidence ?? null,
          tags: diaryRecord.tags ?? []
        }
      : null
  });

  return `sha256:${stableHash(payload)}`;
}

function normalizeMissingFields(sqliteRecord, diaryRecord) {
  const missingRequiredFields = REQUIRED_SQLITE_FIELDS.filter((field) => {
    const value = sqliteRecord[field];
    return value === undefined || value === null || value === '';
  });

  const missingOptionalFields = [];
  const normalizedOptionalFields = {};

  for (const [field, fallback] of OPTIONAL_VNEXT_FIELDS) {
    const value = sqliteRecord[field];
    if (value === undefined || value === null || value === '') {
      missingOptionalFields.push(field);
      normalizedOptionalFields[field] = fallback;
    } else {
      normalizedOptionalFields[field] = value;
    }
  }

  if (!diaryRecord?.source_path) {
    missingOptionalFields.push('source_path');
  }

  if (!diaryRecord?.relative_path) {
    missingOptionalFields.push('relative_path');
  }

  return {
    missingRequiredFields,
    missingOptionalFields,
    normalizedOptionalFields,
    unknownFields: []
  };
}

function redactSecretLikeContent(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/fixture-raw-secret-should-not-emit/g, '<REDACTED_SECRET>');
}

function buildLowRiskSummary(mappingPreview) {
  const memoryRecord = mappingPreview.memoryRecordVNext;

  return {
    status: mappingPreview.status,
    mutated: false,
    memory_id: memoryRecord.memory_id,
    workspace_id_present: Boolean(memoryRecord.workspace_id),
    workspace_ref: memoryRecord.workspace_id
      ? `workspace-sha256:${stableHash(memoryRecord.workspace_id).slice(0, 16)}`
      : 'unknown',
    lifecycle_status: memoryRecord.lifecycle_status,
    importExportSafe: mappingPreview.importExportSafe,
    rawWorkspaceIdExposed: false,
    rawSecretExposed: false
  };
}

function buildMappingPreview(inputFixture, overrides = {}) {
  const sqliteRecord = overrides.sqliteRecordFixture
    ? { ...overrides.sqliteRecordFixture }
    : { ...inputFixture.sqliteRecordFixture };
  const diaryRecord = overrides.diaryRecordFixture === null
    ? null
    : {
        ...inputFixture.diaryRecordFixture,
        ...(overrides.diaryRecordFixture ?? {})
      };
  const auditLog = {
    ...inputFixture.auditLogFixture,
    ...(overrides.auditLogFixture ?? {})
  };
  const chunkMetadata = {
    ...inputFixture.chunkMetadataFixture,
    ...(overrides.chunkMetadataFixture ?? {})
  };
  const tagMetadata = {
    ...inputFixture.tagMetadataFixture,
    ...(overrides.tagMetadataFixture ?? {})
  };

  const {
    missingRequiredFields,
    missingOptionalFields,
    normalizedOptionalFields,
    unknownFields
  } = normalizeMissingFields(sqliteRecord, diaryRecord);

  const lifecycleStatus = normalizedOptionalFields.lifecycle_status;
  const memoryId = sqliteRecord.memory_id ?? null;
  const auditRefs = auditLog.memory_id === memoryId && auditLog.event_id ? [auditLog.event_id] : [];
  const chunkRefs = chunkMetadata.memory_id === memoryId && chunkMetadata.chunk_id ? [chunkMetadata.chunk_id] : [];
  const tagRefs = tagMetadata.memory_id === memoryId && tagMetadata.tag_id ? [tagMetadata.tag_id] : [];
  const hasSource = Boolean(diaryRecord?.source_path && diaryRecord?.relative_path);
  const hasProvenance = Boolean(hasSource && auditLog.event_id);

  const memoryRecordVNext = {
    memory_id: memoryId,
    schema_version: 'vNext',
    kind: 'MemoryRecord',
    title: sqliteRecord.title ?? diaryRecord?.title ?? null,
    content_ref: memoryId ? `fixture://mapping-preview/content/${memoryId}` : null,
    content_hash: contentHash(sqliteRecord, diaryRecord),
    source: hasSource
      ? {
          kind: 'diary-fixture',
          source_path: diaryRecord.source_path,
          relative_path: diaryRecord.relative_path
        }
      : null,
    provenance: hasProvenance
      ? {
          audit_event_id: auditLog.event_id,
          diary_created_at: diaryRecord.created_at ?? null,
          redaction_applied: Boolean(auditLog.redaction_applied),
          scope_policy_applied: Boolean(auditLog.scope_policy_applied),
          lifecycle_policy_applied: Boolean(auditLog.lifecycle_policy_applied)
        }
      : null,
    title_preview: redactSecretLikeContent(sqliteRecord.title ?? diaryRecord?.title ?? null),
    project_id: sqliteRecord.project_id ?? null,
    workspace_id: sqliteRecord.workspace_id ?? null,
    client_id: normalizedOptionalFields.client_id,
    agent_id: normalizedOptionalFields.agent_id,
    task_id: normalizedOptionalFields.task_id,
    visibility: sqliteRecord.visibility ?? 'unknown',
    lifecycle_status: lifecycleStatus,
    supersedes_memory_id: normalizedOptionalFields.supersedes_memory_id,
    superseded_by_memory_id: normalizedOptionalFields.superseded_by_memory_id,
    audit_refs: auditRefs,
    chunk_refs: chunkRefs,
    tag_refs: tagRefs,
    proposal: {
      active: false
    },
    tombstone: {
      hidden: true
    }
  };

  const mappingPreview = {
    status: missingRequiredFields.length > 0 ? 'needs_review' : 'ok',
    mutated: false,
    sourceKind: 'sqlite+diary+audit+chunk+tag-fixture',
    memoryRecordVNext,
    missingRequiredFields,
    missingOptionalFields,
    unknownFields,
    lifecycleStatusCoverage: {
      known: lifecycleStatus === 'unknown' ? 0 : 1,
      unknown: lifecycleStatus === 'unknown' ? 1 : 0
    },
    scopeCoverage: {
      project_id: Boolean(memoryRecordVNext.project_id),
      workspace_id: Boolean(memoryRecordVNext.workspace_id),
      client_id: memoryRecordVNext.client_id !== 'unknown',
      visibility: memoryRecordVNext.visibility !== 'unknown'
    },
    auditRefCoverage: {
      count: auditRefs.length
    },
    chunkRefCoverage: {
      count: chunkRefs.length
    },
    tagRefCoverage: {
      count: tagRefs.length
    },
    importExportSafe: missingRequiredFields.length === 0 && hasSource && hasProvenance,
    rawWorkspaceIdExposed: false,
    rawSecretExposed: false
  };

  mappingPreview.lowRiskSummary = buildLowRiskSummary(mappingPreview);

  return mappingPreview;
}

test('fixture parses', () => {
  assert.equal(fixture.schemaVersion, 'vcp-memory-object-mapping-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.runtimeMapperImplemented, false);
  assert.equal(fixture.trueDatabaseRead, false);
  assert.equal(fixture.trueDiaryRead, false);
  assert.deepEqual(fixture.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
});

test('mapping preview keeps memory_id', () => {
  const preview = buildMappingPreview(fixture);

  assert.equal(preview.memoryRecordVNext.memory_id, fixture.sqliteRecordFixture.memory_id);
});

test('mapping preview keeps title/kind/schema_version', () => {
  const preview = buildMappingPreview(fixture);

  assert.equal(preview.memoryRecordVNext.title, fixture.sqliteRecordFixture.title);
  assert.equal(preview.memoryRecordVNext.kind, 'MemoryRecord');
  assert.equal(preview.memoryRecordVNext.schema_version, 'vNext');
});

test('mapping preview preserves scope fields internally', () => {
  const preview = buildMappingPreview(fixture);

  assert.equal(preview.memoryRecordVNext.project_id, fixture.sqliteRecordFixture.project_id);
  assert.equal(preview.memoryRecordVNext.workspace_id, fixture.sqliteRecordFixture.workspace_id);
  assert.equal(preview.memoryRecordVNext.client_id, fixture.sqliteRecordFixture.client_id);
  assert.equal(preview.memoryRecordVNext.visibility, fixture.sqliteRecordFixture.visibility);
});

test('low-risk summary does not expose raw workspace_id', () => {
  const preview = buildMappingPreview(fixture);
  const summaryText = JSON.stringify(preview.lowRiskSummary);

  assert.equal(preview.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(summaryText.includes(fixture.sqliteRecordFixture.workspace_id), false);
});

test('mapping preview preserves lifecycle_status', () => {
  const preview = buildMappingPreview(fixture);

  assert.equal(preview.memoryRecordVNext.lifecycle_status, fixture.sqliteRecordFixture.lifecycle_status);
  assert.deepEqual(preview.lifecycleStatusCoverage, { known: 1, unknown: 0 });
});

test('missing lifecycle_status is reported as unknown, not silently active', () => {
  const preview = buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.missingLifecycleStatusFixture
  });

  assert.equal(preview.memoryRecordVNext.lifecycle_status, 'unknown');
  assert.equal(preview.memoryRecordVNext.lifecycle_status === 'active', false);
  assert.equal(preview.missingOptionalFields.includes('lifecycle_status'), true);
  assert.deepEqual(preview.lifecycleStatusCoverage, { known: 0, unknown: 1 });
});

test('mapping preview preserves audit refs', () => {
  const preview = buildMappingPreview(fixture);

  assert.deepEqual(preview.memoryRecordVNext.audit_refs, [fixture.auditLogFixture.event_id]);
  assert.equal(preview.auditRefCoverage.count, 1);
});

test('mapping preview preserves chunk refs', () => {
  const preview = buildMappingPreview(fixture);

  assert.deepEqual(preview.memoryRecordVNext.chunk_refs, [fixture.chunkMetadataFixture.chunk_id]);
  assert.equal(preview.chunkRefCoverage.count, 1);
});

test('mapping preview preserves tag refs', () => {
  const preview = buildMappingPreview(fixture);

  assert.deepEqual(preview.memoryRecordVNext.tag_refs, [fixture.tagMetadataFixture.tag_id]);
  assert.equal(preview.tagRefCoverage.count, 1);
});

test('content_hash is deterministic in fixture context', () => {
  const first = buildMappingPreview(fixture);
  const second = buildMappingPreview(fixture);

  assert.equal(first.memoryRecordVNext.content_hash, second.memoryRecordVNext.content_hash);
  assert.match(first.memoryRecordVNext.content_hash, /^sha256:[a-f0-9]{64}$/);
});

test('content_ref is generated in fixture context only', () => {
  const preview = buildMappingPreview(fixture);

  assert.equal(
    preview.memoryRecordVNext.content_ref,
    `fixture://mapping-preview/content/${fixture.sqliteRecordFixture.memory_id}`
  );
  assert.equal(fixture.runtimeMapperImplemented, false);
});

test('missing required fields are reported, not inferred', () => {
  const preview = buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.missingRequiredFieldsFixture
  });

  assert.equal(preview.memoryRecordVNext.memory_id, null);
  assert.equal(preview.status, 'needs_review');
  assert.equal(preview.missingRequiredFields.includes('memory_id'), true);
});

test('missing optional fields normalize to null/unknown', () => {
  const preview = buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.missingOptionalFieldsFixture
  });

  assert.equal(preview.memoryRecordVNext.client_id, 'unknown');
  assert.equal(preview.memoryRecordVNext.agent_id, null);
  assert.equal(preview.memoryRecordVNext.task_id, null);
  assert.equal(preview.memoryRecordVNext.supersedes_memory_id, null);
  assert.equal(preview.memoryRecordVNext.superseded_by_memory_id, null);
});

test('importExportSafe is false when provenance/source missing', () => {
  const preview = buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.missingSourceProvenanceFixture,
    diaryRecordFixture: null
  });

  assert.equal(preview.memoryRecordVNext.source, null);
  assert.equal(preview.memoryRecordVNext.provenance, null);
  assert.equal(preview.importExportSafe, false);
});

test('proposal remains inactive by default', () => {
  const preview = buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.proposalFixture
  });

  assert.equal(preview.memoryRecordVNext.lifecycle_status, 'proposal');
  assert.equal(preview.memoryRecordVNext.proposal.active, false);
});

test('tombstone remains hidden by default', () => {
  const preview = buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.tombstoneFixture
  });

  assert.equal(preview.memoryRecordVNext.lifecycle_status, 'tombstoned');
  assert.equal(preview.memoryRecordVNext.tombstone.hidden, true);
});

test('raw secrets are not emitted in mapping preview', () => {
  const preview = buildMappingPreview(fixture);
  const previewText = JSON.stringify(preview);

  assert.equal(preview.rawSecretExposed, false);
  assert.equal(previewText.includes('fixture-raw-secret-should-not-emit'), false);
  assert.equal(previewText.includes('<REDACTED_SECRET>'), false);
});

test('mapping report has mutated=false', () => {
  const preview = buildMappingPreview(fixture);

  assert.equal(preview.mutated, false);
  assert.equal(preview.lowRiskSummary.mutated, false);
});

test('no side effect occurs', () => {
  const before = JSON.stringify(fixture);

  buildMappingPreview(fixture);
  buildMappingPreview(fixture, {
    sqliteRecordFixture: fixture.edgeCases.missingRequiredFieldsFixture
  });

  assert.equal(JSON.stringify(fixture), before);
  assert.equal(fixture.trueDatabaseRead, false);
  assert.equal(fixture.trueDiaryRead, false);
});
