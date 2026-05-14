#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'vcp-memory-object-mapping-dry-run-v1.json'
);

const REJECTED_FLAGS = new Set(['--confirm', '--apply', '--migrate']);
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

function parseArgs(argv = []) {
  const options = {
    json: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function incrementCount(counts, field) {
  counts[field] = (counts[field] || 0) + 1;
}

function normalizeMissingFields(sqliteRecord, diaryRecord) {
  const missingRequiredFields = [];
  const missingOptionalFields = [];
  const normalizedOptionalFields = {};

  for (const field of REQUIRED_SQLITE_FIELDS) {
    const value = sqliteRecord[field];
    if (value === undefined || value === null || value === '') {
      missingRequiredFields.push(field);
    }
  }

  for (const [field, fallback] of OPTIONAL_VNEXT_FIELDS) {
    const value = sqliteRecord[field];
    if (value === undefined || value === null || value === '') {
      missingOptionalFields.push(field);
      normalizedOptionalFields[field] = fallback;
    } else {
      normalizedOptionalFields[field] = value;
    }
  }

  if (!diaryRecord?.source_path) missingOptionalFields.push('source_path');
  if (!diaryRecord?.relative_path) missingOptionalFields.push('relative_path');

  return { missingRequiredFields, missingOptionalFields, normalizedOptionalFields };
}

function buildPreview(sourceRecord) {
  const sqliteRecord = sourceRecord.sqliteRecord || {};
  const diaryRecord = sourceRecord.diaryRecord || null;
  const auditLogs = sourceRecord.auditLogs || [];
  const chunkMetadata = sourceRecord.chunkMetadata || [];
  const tagMetadata = sourceRecord.tagMetadata || [];
  const {
    missingRequiredFields,
    missingOptionalFields,
    normalizedOptionalFields
  } = normalizeMissingFields(sqliteRecord, diaryRecord);

  const memoryId = sqliteRecord.memory_id || null;
  const lifecycleStatus = normalizedOptionalFields.lifecycle_status;
  const auditRefs = auditLogs
    .filter(event => event.memory_id === memoryId && event.event_id)
    .map(event => event.event_id);
  const chunkRefs = chunkMetadata
    .filter(chunk => chunk.memory_id === memoryId && chunk.chunk_id)
    .map(chunk => chunk.chunk_id);
  const tagRefs = tagMetadata
    .filter(tag => tag.memory_id === memoryId && tag.tag_id)
    .map(tag => tag.tag_id);
  const hasSource = Boolean(diaryRecord?.source_path && diaryRecord?.relative_path);
  const hasProvenance = Boolean(hasSource && auditRefs.length > 0);
  const mapped = missingRequiredFields.length === 0;

  const payloadForHash = JSON.stringify({
    memory_id: memoryId,
    title: sqliteRecord.title || diaryRecord?.title || null,
    source_path: hasSource ? diaryRecord.source_path : null,
    relative_path: hasSource ? diaryRecord.relative_path : null
  });

  return {
    case_id: sourceRecord.case_id,
    status: mapped ? 'mapped' : 'unmapped',
    sourceKind: sourceRecord.sourceKind || 'fixture',
    importExportSafe: mapped && hasSource && hasProvenance,
    missingRequiredFields,
    missingOptionalFields,
    memoryRecordVNext: {
      memory_id: memoryId,
      schema_version: 'vNext',
      kind: 'MemoryRecord',
      title: sqliteRecord.title || diaryRecord?.title || null,
      content_ref: memoryId ? `fixture://mapping-dry-run/content/${memoryId}` : null,
      content_hash: `sha256:${stableHash(payloadForHash)}`,
      project_id: sqliteRecord.project_id || null,
      workspace_id: sqliteRecord.workspace_id || null,
      client_id: normalizedOptionalFields.client_id,
      agent_id: normalizedOptionalFields.agent_id,
      task_id: normalizedOptionalFields.task_id,
      visibility: sqliteRecord.visibility || 'unknown',
      lifecycle_status: lifecycleStatus,
      supersedes_memory_id: normalizedOptionalFields.supersedes_memory_id,
      superseded_by_memory_id: normalizedOptionalFields.superseded_by_memory_id,
      source: hasSource
        ? {
            kind: 'diary-fixture',
            source_path: diaryRecord.source_path,
            relative_path: diaryRecord.relative_path
          }
        : null,
      provenance: hasProvenance
        ? {
            audit_refs: auditRefs,
            redaction_applied: auditLogs.every(event => event.redaction_applied === true),
            scope_policy_applied: auditLogs.every(event => event.scope_policy_applied === true),
            lifecycle_policy_applied: auditLogs.every(event => event.lifecycle_policy_applied === true)
          }
        : null,
      audit_refs: auditRefs,
      chunk_refs: chunkRefs,
      tag_refs: tagRefs,
      proposal: {
        active: false
      },
      tombstone: {
        hidden: true
      }
    }
  };
}

function buildLowRiskSummary(previews) {
  return previews.map(preview => ({
    case_id: preview.case_id,
    status: preview.status,
    memory_id: preview.memoryRecordVNext.memory_id,
    workspace_id_present: Boolean(preview.memoryRecordVNext.workspace_id),
    workspace_ref: preview.memoryRecordVNext.workspace_id
      ? `workspace-sha256:${stableHash(preview.memoryRecordVNext.workspace_id).slice(0, 16)}`
      : 'unknown',
    lifecycle_status: preview.memoryRecordVNext.lifecycle_status,
    importExportSafe: preview.importExportSafe,
    rawWorkspaceIdExposed: false,
    rawSecretExposed: false
  }));
}

function buildReport({ fixture, rejectedFlag = null } = {}) {
  if (rejectedFlag) {
    return {
      status: 'error',
      mutated: false,
      sourceMode: 'fixture',
      rejectedFlag,
      error: `${rejectedFlag} is not supported by VCP memory object mapping dry-run.`,
      nextStep: 'Re-run without confirm/apply/migrate flags.'
    };
  }

  const previews = (fixture.records || []).map(buildPreview);
  const missingRequiredFieldCounts = {};
  const missingOptionalFieldCounts = {};
  const unknownFieldCounts = {};
  const lifecycleStatusCoverage = {};
  const scopeCoverage = {
    project_id: 0,
    workspace_id: 0,
    client_id: 0,
    visibility: 0
  };
  const auditRefCoverage = { withRefs: 0, withoutRefs: 0 };
  const chunkRefCoverage = { withRefs: 0, withoutRefs: 0 };
  const tagRefCoverage = { withRefs: 0, withoutRefs: 0 };

  for (const preview of previews) {
    for (const field of preview.missingRequiredFields) incrementCount(missingRequiredFieldCounts, field);
    for (const field of preview.missingOptionalFields) incrementCount(missingOptionalFieldCounts, field);

    const record = preview.memoryRecordVNext;
    incrementCount(lifecycleStatusCoverage, record.lifecycle_status);
    if (record.lifecycle_status === 'unknown') incrementCount(unknownFieldCounts, 'lifecycle_status');
    if (record.project_id) scopeCoverage.project_id += 1;
    if (record.workspace_id) scopeCoverage.workspace_id += 1;
    if (record.client_id && record.client_id !== 'unknown') scopeCoverage.client_id += 1;
    if (record.visibility && record.visibility !== 'unknown') scopeCoverage.visibility += 1;
    if (record.audit_refs.length > 0) auditRefCoverage.withRefs += 1;
    else auditRefCoverage.withoutRefs += 1;
    if (record.chunk_refs.length > 0) chunkRefCoverage.withRefs += 1;
    else chunkRefCoverage.withoutRefs += 1;
    if (record.tag_refs.length > 0) tagRefCoverage.withRefs += 1;
    else tagRefCoverage.withoutRefs += 1;
  }

  const mappedRecordCount = previews.filter(preview => preview.status === 'mapped').length;
  const unmappedRecordCount = previews.length - mappedRecordCount;
  const importExportSafeCount = previews.filter(preview => preview.importExportSafe).length;

  return {
    status: unmappedRecordCount > 0 ? 'warn' : 'ok',
    phase: fixture.phase,
    schemaVersion: fixture.schemaVersion,
    mutated: false,
    sourceMode: fixture.sourceMode || 'fixture',
    fixtureOnly: fixture.fixtureOnly === true,
    scannedRecordCount: previews.length,
    mappedRecordCount,
    unmappedRecordCount,
    missingRequiredFieldCounts,
    missingOptionalFieldCounts,
    unknownFieldCounts,
    lifecycleStatusCoverage,
    scopeCoverage,
    auditRefCoverage,
    chunkRefCoverage,
    tagRefCoverage,
    importExportSafeCount,
    lowRiskSummary: buildLowRiskSummary(previews),
    mappingPreviews: previews,
    rawWorkspaceIdExposed: false,
    rawSecretExposed: false,
    noSQLiteWrite: fixture.noSQLiteWrite === true,
    noDiaryWrite: fixture.noDiaryWrite === true,
    noAuditLogWrite: fixture.noAuditLogWrite === true,
    noVectorWrite: fixture.noVectorWrite === true,
    noChunkWrite: fixture.noChunkWrite === true,
    noImportExportFileGeneration: fixture.noImportExportFileGeneration === true,
    noMigration: fixture.noMigration === true,
    trueDatabaseRead: fixture.trueDatabaseRead === true,
    trueDiaryRead: fixture.trueDiaryRead === true,
    publicTools: fixture.publicTools,
    noMcpPublicToolExpansion: fixture.noMcpPublicToolExpansion === true,
    riskLevel: unmappedRecordCount > 0 ? 'A2' : 'A1',
    rollbackRequirement: 'none; dry-run fixture mode performs no durable writes',
    nextStep: 'Review fixture dry-run output; P13.6 should lock import/export-safe JSON shapes before any real data movement.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `mutated: ${report.mutated}`,
    `sourceMode: ${report.sourceMode}`
  ];

  if (report.status === 'error') {
    lines.push(`rejectedFlag: ${report.rejectedFlag}`);
    lines.push(`error: ${report.error}`);
    lines.push(`nextStep: ${report.nextStep}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(`scannedRecordCount: ${report.scannedRecordCount}`);
  lines.push(`mappedRecordCount: ${report.mappedRecordCount}`);
  lines.push(`unmappedRecordCount: ${report.unmappedRecordCount}`);
  lines.push(`importExportSafeCount: ${report.importExportSafeCount}`);
  lines.push(`riskLevel: ${report.riskLevel}`);
  lines.push(`rollbackRequirement: ${report.rollbackRequirement}`);
  lines.push(`nextStep: ${report.nextStep}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;
  try {
    const fixture = loadFixture(options.fixturePath);
    report = buildReport({ fixture, rejectedFlag: options.rejectedFlag });
  } catch (error) {
    report = {
      status: 'error',
      mutated: false,
      sourceMode: 'fixture',
      error: error.message || 'failed to load VCP memory object mapping dry-run fixture',
      nextStep: 'Check the fixture path and rerun.'
    };
  }

  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  parseArgs,
  loadFixture,
  buildPreview,
  buildReport,
  renderText
};
