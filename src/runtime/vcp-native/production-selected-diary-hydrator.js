'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  deepFreeze,
  digestObject,
  isPlainObject,
  utf8ByteLength
} = require('../../../packages/chatgpt-r4-contracts/canonical');
const {
  failureRegistryEntry
} = require('../../../packages/chatgpt-r4-contracts/governed-read-attempt');

const MAX_SELECTED_DIARIES = 8;
const MAX_SELECTED_DIARY_SCOPE_BYTES = 3 * 1024;
const MAX_SELECTED_FILES = 10_000;
const MAX_SELECTED_CHUNKS = 250_000;
const MAX_SELECTED_METADATA_BYTES = 16 * 1024 * 1024;
const MAX_SELECTED_CONTENT_BYTES = 128 * 1024 * 1024;
const MAX_SELECTED_VECTOR_BYTES = 128 * 1024 * 1024;
const MAX_PROJECTION_PLAN_BYTES = 4 * 1024;
const SOURCE_DATABASE_FILENAME = 'knowledge_base.sqlite';
const SOURCE_PROJECTION_PROTOCOL = 'governed_read_source_projection.v1';
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

const SECONDARY_TABLES = Object.freeze([
  'file_tags',
  'kv_store',
  'migration_deleted_chunks',
  'migration_deleted_files',
  'tag_intrinsic_residuals',
  'tag_pair_similarity',
  'tags'
]);

const REQUIRED_SOURCE_SCHEMA = deepFreeze({
  files: [
    { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
    { name: 'path', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'diary_name', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'checksum', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'mtime', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'size', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'updated_at', type: 'INTEGER', notnull: 0, pk: 0 }
  ],
  chunks: [
    { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
    { name: 'file_id', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'chunk_index', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'content', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'vector', type: 'BLOB', notnull: 0, pk: 0 }
  ]
});

const PROJECTION_PLAN_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'allowed_diary_names',
  'dimension',
  'budget',
  'source_identity_digest',
  'selected_projection_digest',
  'plan_digest'
]);

const PROJECTION_BUDGET_KEYS = Object.freeze([
  'file_count',
  'chunk_count',
  'metadata_bytes',
  'content_bytes',
  'vector_bytes'
]);

function codedError(code, reasonCode, {
  counterFacts,
  causeCode
} = {}) {
  failureRegistryEntry(reasonCode);
  const error = new Error(code);
  error.code = code;
  error.reasonCode = reasonCode;
  if (counterFacts !== undefined) {
    error.counterFacts = deepFreeze(structuredClone(counterFacts));
  }
  if (causeCode !== undefined) error.causeCode = causeCode;
  return error;
}

function rethrowKnown(error) {
  if (error?.reasonCode) throw error;
  return error;
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function normalizeSelectedDiaryNames(value) {
  if (!Array.isArray(value) ||
      value.length < 1 ||
      value.length > MAX_SELECTED_DIARIES) {
    throw codedError(
      'selected_diary_hydration_allowlist_invalid',
      'source_scope_invalid'
    );
  }
  const names = value.map(name => {
    if (typeof name !== 'string' ||
        name.length < 1 ||
        name.length > 255 ||
        name.trim() !== name ||
        name === '.' ||
        name === '..' ||
        path.isAbsolute(name) ||
        path.basename(name) !== name ||
        /[\\/\u0000]/u.test(name)) {
      throw codedError(
        'selected_diary_hydration_allowlist_invalid',
        'source_scope_invalid'
      );
    }
    return name;
  });
  const unique = [...new Set(names)].sort();
  if (unique.length !== names.length) {
    throw codedError(
      'selected_diary_hydration_allowlist_invalid',
      'source_scope_invalid'
    );
  }
  if (utf8ByteLength(unique) > MAX_SELECTED_DIARY_SCOPE_BYTES) {
    throw codedError(
      'selected_diary_hydration_allowlist_invalid',
      'source_scope_invalid'
    );
  }
  return Object.freeze(unique);
}

function ownerDirectory(directory, {
  errorCode = 'selected_diary_hydration_directory_invalid',
  reasonCode = 'source_identity_invalid',
  fsModule = fs
} = {}) {
  if (typeof directory !== 'string' ||
      !path.isAbsolute(directory) ||
      path.resolve(directory) !== directory) {
    throw codedError(errorCode, reasonCode);
  }
  let before;
  let resolved;
  let after;
  try {
    before = fsModule.lstatSync(directory);
    resolved = fsModule.realpathSync(directory);
    after = fsModule.lstatSync(resolved);
  } catch {
    throw codedError(errorCode, reasonCode);
  }
  if (!before.isDirectory() ||
      before.isSymbolicLink() ||
      !after.isDirectory() ||
      after.isSymbolicLink() ||
      resolved !== directory) {
    throw codedError(errorCode, reasonCode);
  }
  return resolved;
}

function regularDatabaseFile(file, {
  errorCode = 'selected_diary_hydration_source_database_invalid',
  reasonCode = 'source_identity_invalid',
  fsModule = fs
} = {}) {
  let stat;
  let resolved;
  try {
    stat = fsModule.lstatSync(file);
    resolved = fsModule.realpathSync(file);
  } catch {
    throw codedError(errorCode, reasonCode);
  }
  if (!stat.isFile() ||
      stat.isSymbolicLink() ||
      resolved !== file) {
    throw codedError(errorCode, reasonCode);
  }
  return file;
}

function sourceIdentityDigest(file, {
  errorCode = 'selected_diary_hydration_source_database_invalid',
  reasonCode = 'source_identity_invalid',
  fsModule = fs
} = {}) {
  regularDatabaseFile(file, { errorCode, reasonCode, fsModule });
  let stat;
  try {
    stat = fsModule.lstatSync(file);
  } catch {
    throw codedError(errorCode, reasonCode);
  }
  if (!Number.isSafeInteger(stat.dev) ||
      !Number.isSafeInteger(stat.ino) ||
      stat.dev < 0 ||
      stat.ino < 1) {
    throw codedError(errorCode, reasonCode);
  }
  return digestObject({
    path: file,
    device: String(stat.dev),
    inode: String(stat.ino)
  });
}

function queryAll(database, sql, values, errorCode, reasonCode) {
  try {
    return database.prepare(sql).all(...values);
  } catch (error) {
    rethrowKnown(error);
    throw codedError(errorCode, reasonCode);
  }
}

function queryOne(database, sql, values, errorCode, reasonCode) {
  try {
    return database.prepare(sql).get(...values);
  } catch (error) {
    rethrowKnown(error);
    throw codedError(errorCode, reasonCode);
  }
}

function queryCount(database, sql, values, errorCode, reasonCode) {
  const row = queryOne(database, sql, values, errorCode, reasonCode);
  const count = Number(row?.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw codedError(errorCode, reasonCode);
  }
  return count;
}

function queryIterator(database, sql, values, errorCode, reasonCode) {
  try {
    const statement = database.prepare(sql);
    if (typeof statement.iterate !== 'function') {
      throw codedError(errorCode, reasonCode);
    }
    return statement.iterate(...values);
  } catch (error) {
    rethrowKnown(error);
    throw codedError(errorCode, reasonCode);
  }
}

function assertExactDatabaseFile(database, expectedFile, {
  errorCode,
  reasonCode,
  fsModule = fs
}) {
  const rows = queryAll(
    database,
    'PRAGMA database_list',
    [],
    errorCode,
    reasonCode
  );
  const mainRows = rows.filter(row => row?.name === 'main');
  const extraRows = rows.filter(row => row?.name !== 'main');
  if (mainRows.length !== 1 ||
      Number(mainRows[0]?.seq) !== 0 ||
      typeof mainRows[0]?.file !== 'string' ||
      mainRows[0].file.length < 1 ||
      extraRows.some(row =>
        row?.name !== 'temp' ||
        (row.file !== '' && row.file !== null)
      )) {
    throw codedError(errorCode, reasonCode, {
      causeCode: 'database_list_invalid'
    });
  }
  const actualFile = path.resolve(mainRows[0].file);
  regularDatabaseFile(actualFile, { errorCode, reasonCode, fsModule });
  regularDatabaseFile(expectedFile, { errorCode, reasonCode, fsModule });
  if (actualFile !== expectedFile) {
    throw codedError(errorCode, reasonCode, {
      causeCode: 'database_file_mismatch'
    });
  }
  return true;
}

function relationInside(parent, candidate) {
  const relation = path.relative(parent, candidate);
  return Boolean(
    relation &&
    !relation.startsWith('..') &&
    !path.isAbsolute(relation)
  );
}

function normalizeDimension(value, {
  errorCode = 'selected_diary_hydration_source_projection_invalid',
  reasonCode = 'source_schema_invalid'
} = {}) {
  if (!Number.isSafeInteger(value) ||
      value < 1 ||
      value > MAX_SELECTED_VECTOR_BYTES / Float32Array.BYTES_PER_ELEMENT) {
    throw codedError(errorCode, reasonCode);
  }
  return value;
}

function validateSourceBoundary({
  dimension,
  sourceKnowledgeBaseStorePath,
  vcpToolBoxRoot,
  fsModule = fs
}) {
  const normalizedDimension = normalizeDimension(dimension);
  const vcpRoot = ownerDirectory(vcpToolBoxRoot, { fsModule });
  const sourceStore = ownerDirectory(sourceKnowledgeBaseStorePath, { fsModule });
  if (sourceStore !== path.join(vcpRoot, 'VectorStore') ||
      !relationInside(vcpRoot, sourceStore)) {
    throw codedError(
      'selected_diary_hydration_boundary_mismatch',
      'source_identity_invalid'
    );
  }
  const sourceDatabase = regularDatabaseFile(
    path.join(sourceStore, SOURCE_DATABASE_FILENAME),
    { fsModule }
  );
  return Object.freeze({
    dimension: normalizedDimension,
    sourceDatabase,
    sourceStore,
    vcpRoot
  });
}

function validateRuntimeBoundary({
  knowledgeBaseManager,
  knowledgeBaseRootPath,
  knowledgeBaseStorePath,
  sourceKnowledgeBaseStorePath,
  vcpToolBoxRoot,
  fsModule = fs
}) {
  if (!knowledgeBaseManager ||
      typeof knowledgeBaseManager !== 'object' ||
      knowledgeBaseManager.initialized !== true ||
      !knowledgeBaseManager.db ||
      typeof knowledgeBaseManager.db.prepare !== 'function' ||
      typeof knowledgeBaseManager.db.exec !== 'function' ||
      knowledgeBaseManager.config?.fullScanOnStartup !== false ||
      knowledgeBaseManager.watcher !== null ||
      knowledgeBaseManager.ragParamsWatcher !== null ||
      knowledgeBaseManager.pendingFiles?.size !== 0 ||
      knowledgeBaseManager.pendingDeletes?.size !== 0 ||
      knowledgeBaseManager.isProcessing !== false ||
      knowledgeBaseManager.isProcessingDeletes !== false ||
      knowledgeBaseManager.rustWriteLease !== null ||
      !(knowledgeBaseManager.diaryIndices instanceof Map) ||
      knowledgeBaseManager.diaryIndices.size !== 0) {
    throw codedError(
      'selected_diary_hydration_runtime_not_quiescent',
      'hydration_failed'
    );
  }
  const sourceBoundary = validateSourceBoundary({
    dimension: knowledgeBaseManager.config?.dimension,
    sourceKnowledgeBaseStorePath,
    vcpToolBoxRoot,
    fsModule
  });
  const memoryRoot = ownerDirectory(knowledgeBaseRootPath, {
    errorCode: 'selected_diary_hydration_boundary_mismatch',
    reasonCode: 'hydration_failed',
    fsModule
  });
  const isolatedStore = ownerDirectory(knowledgeBaseStorePath, {
    errorCode: 'selected_diary_hydration_boundary_mismatch',
    reasonCode: 'hydration_failed',
    fsModule
  });
  const configuredRoot = ownerDirectory(
    path.resolve(knowledgeBaseManager.config.rootPath || ''),
    {
      errorCode: 'selected_diary_hydration_boundary_mismatch',
      reasonCode: 'hydration_failed',
      fsModule
    }
  );
  const configuredStore = ownerDirectory(
    path.resolve(knowledgeBaseManager.config.storePath || ''),
    {
      errorCode: 'selected_diary_hydration_boundary_mismatch',
      reasonCode: 'hydration_failed',
      fsModule
    }
  );
  if (configuredRoot !== memoryRoot ||
      configuredStore !== isolatedStore ||
      memoryRoot !== path.join(sourceBoundary.vcpRoot, 'dailynote') ||
      relationInside(sourceBoundary.vcpRoot, isolatedStore) ||
      relationInside(memoryRoot, sourceBoundary.sourceStore) ||
      relationInside(sourceBoundary.sourceStore, memoryRoot) ||
      relationInside(isolatedStore, sourceBoundary.sourceStore) ||
      relationInside(sourceBoundary.sourceStore, isolatedStore) ||
      isolatedStore === sourceBoundary.sourceStore) {
    throw codedError(
      'selected_diary_hydration_boundary_mismatch',
      'hydration_failed'
    );
  }
  assertExactDatabaseFile(
    knowledgeBaseManager.db,
    path.join(isolatedStore, SOURCE_DATABASE_FILENAME),
    {
      errorCode: 'selected_diary_hydration_isolated_database_invalid',
      reasonCode: 'hydration_failed',
      fsModule
    }
  );
  return Object.freeze({
    ...sourceBoundary,
    isolatedStore,
    memoryRoot
  });
}

function placeholders(count) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SELECTED_DIARIES) {
    throw codedError(
      'selected_diary_hydration_allowlist_invalid',
      'source_scope_invalid'
    );
  }
  return new Array(count).fill('?').join(', ');
}

function validateSourceSchema(database, {
  errorCode = 'selected_diary_hydration_source_schema_invalid',
  reasonCode = 'source_schema_invalid'
} = {}) {
  for (const [table, expectedColumns] of Object.entries(REQUIRED_SOURCE_SCHEMA)) {
    const rows = queryAll(
      database,
      `PRAGMA table_info(${table})`,
      [],
      errorCode,
      reasonCode
    );
    if (rows.length !== expectedColumns.length) {
      throw codedError(errorCode, reasonCode);
    }
    for (let index = 0; index < expectedColumns.length; index += 1) {
      const actual = rows[index];
      const expected = expectedColumns[index];
      if (actual?.name !== expected.name ||
          String(actual?.type || '').toUpperCase() !== expected.type ||
          Number(actual?.notnull) !== expected.notnull ||
          Number(actual?.pk) !== expected.pk) {
        throw codedError(errorCode, reasonCode);
      }
    }
  }
  return true;
}

function projectionBudget(
  database,
  marker,
  allowedDiaryNames,
  dimension,
  {
    errorCode = 'selected_diary_hydration_source_projection_invalid',
    phase = 'preflight'
  } = {}
) {
  const schemaReason = phase === 'preflight'
    ? 'source_schema_invalid'
    : 'hydration_failed';
  const budgetReason = phase === 'preflight'
    ? 'source_budget_exceeded'
    : 'hydration_failed';
  const vectorReason = phase === 'preflight'
    ? 'source_vector_invalid'
    : 'hydration_failed';
  const fileSummary = queryOne(database, `
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(
        length(CAST(path AS BLOB)) +
        length(CAST(diary_name AS BLOB)) +
        length(CAST(checksum AS BLOB))
      ), 0) AS metadataBytes
    FROM files
    WHERE diary_name IN (${marker})
  `, allowedDiaryNames, errorCode, schemaReason);
  const chunkSummary = queryOne(database, `
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(length(CAST(c.content AS BLOB))), 0) AS contentBytes,
      COALESCE(SUM(length(c.vector)), 0) AS vectorBytes
    FROM chunks c
    INNER JOIN files f ON f.id = c.file_id
    WHERE f.diary_name IN (${marker})
  `, allowedDiaryNames, errorCode, schemaReason);
  const fileCount = Number(fileSummary?.count);
  const metadataBytes = Number(fileSummary?.metadataBytes);
  const chunkCount = Number(chunkSummary?.count);
  const contentBytes = Number(chunkSummary?.contentBytes);
  const vectorBytes = Number(chunkSummary?.vectorBytes);
  const expectedVectorBytes =
    chunkCount * dimension * Float32Array.BYTES_PER_ELEMENT;
  for (const value of [
    fileCount,
    metadataBytes,
    chunkCount,
    contentBytes,
    vectorBytes,
    expectedVectorBytes
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw codedError(errorCode, schemaReason);
    }
  }
  if (fileCount > MAX_SELECTED_FILES ||
      metadataBytes > MAX_SELECTED_METADATA_BYTES ||
      chunkCount > MAX_SELECTED_CHUNKS ||
      contentBytes > MAX_SELECTED_CONTENT_BYTES ||
      vectorBytes > MAX_SELECTED_VECTOR_BYTES) {
    throw codedError(errorCode, budgetReason);
  }
  if (vectorBytes !== expectedVectorBytes) {
    throw codedError(errorCode, vectorReason);
  }
  return deepFreeze({
    file_count: fileCount,
    chunk_count: chunkCount,
    metadata_bytes: metadataBytes,
    content_bytes: contentBytes,
    vector_bytes: vectorBytes
  });
}

function validateProjectionBudget(value) {
  if (!exactKeys(value, PROJECTION_BUDGET_KEYS)) return false;
  const limits = {
    file_count: MAX_SELECTED_FILES,
    chunk_count: MAX_SELECTED_CHUNKS,
    metadata_bytes: MAX_SELECTED_METADATA_BYTES,
    content_bytes: MAX_SELECTED_CONTENT_BYTES,
    vector_bytes: MAX_SELECTED_VECTOR_BYTES
  };
  return Object.entries(limits).every(([key, maximum]) =>
    Number.isSafeInteger(value[key]) &&
    value[key] >= 0 &&
    value[key] <= maximum
  );
}

function normalizedVector(value, dimension, {
  errorCode = 'selected_diary_hydration_source_projection_invalid',
  phase = 'preflight'
} = {}) {
  const reasonCode = phase === 'preflight'
    ? 'source_vector_invalid'
    : 'hydration_failed';
  if (!Buffer.isBuffer(value) && !ArrayBuffer.isView(value)) {
    throw codedError(errorCode, reasonCode);
  }
  const vector = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (vector.length !== dimension * Float32Array.BYTES_PER_ELEMENT) {
    throw codedError(errorCode, reasonCode);
  }
  let nonzero = false;
  for (let offset = 0; offset < vector.length; offset += 4) {
    const item = vector.readFloatLE(offset);
    if (!Number.isFinite(item)) throw codedError(errorCode, reasonCode);
    if (item !== 0) nonzero = true;
  }
  if (!nonzero) throw codedError(errorCode, reasonCode);
  return vector;
}

function validateSelectedPath(value, diaryName, {
  errorCode = 'selected_diary_hydration_source_projection_invalid',
  phase = 'preflight'
} = {}) {
  const reasonCode = phase === 'preflight'
    ? 'source_scope_invalid'
    : 'hydration_failed';
  if (typeof value !== 'string' ||
      value.length < 1 ||
      value.length > 4096 ||
      value.includes('\u0000') ||
      value.includes('\\') ||
      path.posix.isAbsolute(value) ||
      path.posix.normalize(value) !== value ||
      value.startsWith('../') ||
      value === '..' ||
      (
        diaryName === 'Root'
          ? value.includes('/')
          : value.split('/')[0] !== diaryName
      )) {
    throw codedError(errorCode, reasonCode);
  }
  return value;
}

function updateDigestFrame(hash, label, value) {
  const labelBytes = Buffer.byteLength(label, 'utf8');
  const valueBytes = Buffer.isBuffer(value) || ArrayBuffer.isView(value)
    ? value.byteLength
    : Buffer.byteLength(String(value), 'utf8');
  hash.update(`${labelBytes}:${label}:${valueBytes}:`, 'utf8');
  if (Buffer.isBuffer(value)) {
    hash.update(value);
  } else if (ArrayBuffer.isView(value)) {
    hash.update(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
  } else {
    hash.update(String(value), 'utf8');
  }
  hash.update('\0', 'utf8');
}

function projectionDigestBuilder(allowedDiaryNames, dimension, budget) {
  const hash = crypto.createHash('sha256');
  updateDigestFrame(hash, 'protocol', SOURCE_PROJECTION_PROTOCOL);
  updateDigestFrame(hash, 'allowed_diary_names', JSON.stringify(allowedDiaryNames));
  updateDigestFrame(hash, 'dimension', String(dimension));
  updateDigestFrame(hash, 'budget', JSON.stringify(budget));
  return hash;
}

function normalizedFileRow(row, allowed, {
  errorCode,
  phase
}) {
  const reasonCode = phase === 'preflight'
    ? 'source_schema_invalid'
    : 'hydration_failed';
  if (!Number.isSafeInteger(row?.id) ||
      row.id < 1 ||
      !allowed.has(row.diaryName) ||
      typeof row.checksum !== 'string' ||
      row.checksum.length < 1 ||
      row.checksum.length > 128 ||
      !Number.isFinite(row.mtime) ||
      row.mtime < 0 ||
      !Number.isSafeInteger(row.size) ||
      row.size < 0 ||
      (row.updatedAt !== null &&
        row.updatedAt !== undefined &&
        (!Number.isFinite(row.updatedAt) || row.updatedAt < 0))) {
    throw codedError(errorCode, reasonCode);
  }
  return {
    id: row.id,
    path: validateSelectedPath(row.path, row.diaryName, {
      errorCode,
      phase
    }),
    diaryName: row.diaryName,
    checksum: row.checksum,
    mtime: row.mtime,
    size: row.size,
    updatedAt: row.updatedAt ?? null
  };
}

function normalizedChunkRow(row, fileIds, dimension, lastChunkIndex, {
  errorCode,
  phase
}) {
  const reasonCode = phase === 'preflight'
    ? 'source_schema_invalid'
    : 'hydration_failed';
  const previousChunkIndex = lastChunkIndex.get(row?.fileId);
  if (!Number.isSafeInteger(row?.id) ||
      row.id < 1 ||
      !fileIds.has(row.fileId) ||
      !Number.isSafeInteger(row.chunkIndex) ||
      row.chunkIndex < 0 ||
      (previousChunkIndex !== undefined &&
        row.chunkIndex <= previousChunkIndex) ||
      typeof row.content !== 'string') {
    throw codedError(errorCode, reasonCode);
  }
  lastChunkIndex.set(row.fileId, row.chunkIndex);
  return {
    id: row.id,
    fileId: row.fileId,
    chunkIndex: row.chunkIndex,
    content: row.content,
    vector: normalizedVector(row.vector, dimension, { errorCode, phase })
  };
}

function updateFileDigest(hash, file) {
  updateDigestFrame(hash, 'file.id', String(file.id));
  updateDigestFrame(hash, 'file.path', file.path);
  updateDigestFrame(hash, 'file.diary_name', file.diaryName);
  updateDigestFrame(hash, 'file.checksum', file.checksum);
  updateDigestFrame(hash, 'file.mtime', String(file.mtime));
  updateDigestFrame(hash, 'file.size', String(file.size));
  updateDigestFrame(
    hash,
    'file.updated_at',
    file.updatedAt === null ? 'null' : String(file.updatedAt)
  );
}

function updateChunkDigest(hash, chunk) {
  updateDigestFrame(hash, 'chunk.id', String(chunk.id));
  updateDigestFrame(hash, 'chunk.file_id', String(chunk.fileId));
  updateDigestFrame(hash, 'chunk.chunk_index', String(chunk.chunkIndex));
  updateDigestFrame(hash, 'chunk.content', chunk.content);
  updateDigestFrame(hash, 'chunk.vector', chunk.vector);
}

function scanSelectedProjection(
  database,
  allowedDiaryNames,
  dimension,
  {
    errorCode = 'selected_diary_hydration_source_projection_invalid',
    phase = 'preflight',
    onFile,
    onChunk
  } = {}
) {
  const schemaReason = phase === 'preflight'
    ? 'source_schema_invalid'
    : 'hydration_failed';
  validateSourceSchema(database, {
    errorCode: phase === 'preflight'
      ? 'selected_diary_hydration_source_schema_invalid'
      : errorCode,
    reasonCode: schemaReason
  });
  const allowed = new Set(allowedDiaryNames);
  const marker = placeholders(allowedDiaryNames.length);
  const budget = projectionBudget(
    database,
    marker,
    allowedDiaryNames,
    dimension,
    { errorCode, phase }
  );
  const duplicatePath = queryOne(database, `
    SELECT path
    FROM files
    WHERE diary_name IN (${marker})
    GROUP BY path
    HAVING COUNT(*) > 1
    LIMIT 1
  `, allowedDiaryNames, errorCode, schemaReason);
  if (duplicatePath !== undefined) {
    throw codedError(errorCode, schemaReason);
  }
  const hash = projectionDigestBuilder(allowedDiaryNames, dimension, budget);
  const fileIds = new Set();
  let fileCount = 0;
  let metadataBytes = 0;
  const files = queryIterator(database, `
    SELECT
      id,
      path,
      diary_name AS diaryName,
      checksum,
      mtime,
      size,
      updated_at AS updatedAt
    FROM files
    WHERE diary_name IN (${marker})
    ORDER BY path, id
    LIMIT ?
  `, [...allowedDiaryNames, MAX_SELECTED_FILES + 1], errorCode, schemaReason);
  try {
    for (const row of files) {
      const file = normalizedFileRow(row, allowed, { errorCode, phase });
      if (fileIds.has(file.id)) throw codedError(errorCode, schemaReason);
      fileIds.add(file.id);
      fileCount += 1;
      metadataBytes +=
        Buffer.byteLength(file.path, 'utf8') +
        Buffer.byteLength(file.diaryName, 'utf8') +
        Buffer.byteLength(file.checksum, 'utf8');
      if (fileCount > MAX_SELECTED_FILES ||
          metadataBytes > MAX_SELECTED_METADATA_BYTES) {
        throw codedError(
          errorCode,
          phase === 'preflight' ? 'source_budget_exceeded' : 'hydration_failed'
        );
      }
      updateFileDigest(hash, file);
      if (onFile) onFile(file);
    }
  } catch (error) {
    rethrowKnown(error);
    throw codedError(errorCode, schemaReason);
  }
  if (fileCount !== budget.file_count ||
      metadataBytes !== budget.metadata_bytes) {
    throw codedError(errorCode, schemaReason);
  }

  const lastChunkIndex = new Map();
  let chunkCount = 0;
  let contentBytes = 0;
  let vectorBytes = 0;
  const chunks = queryIterator(database, `
    SELECT
      c.id,
      c.file_id AS fileId,
      c.chunk_index AS chunkIndex,
      c.content,
      c.vector
    FROM chunks c
    INNER JOIN files f ON f.id = c.file_id
    WHERE f.diary_name IN (${marker})
    ORDER BY c.file_id, c.chunk_index, c.id
    LIMIT ?
  `, [...allowedDiaryNames, MAX_SELECTED_CHUNKS + 1], errorCode, schemaReason);
  try {
    for (const row of chunks) {
      const chunk = normalizedChunkRow(
        row,
        fileIds,
        dimension,
        lastChunkIndex,
        { errorCode, phase }
      );
      chunkCount += 1;
      contentBytes += Buffer.byteLength(chunk.content, 'utf8');
      vectorBytes += chunk.vector.byteLength;
      if (chunkCount > MAX_SELECTED_CHUNKS ||
          contentBytes > MAX_SELECTED_CONTENT_BYTES ||
          vectorBytes > MAX_SELECTED_VECTOR_BYTES) {
        throw codedError(
          errorCode,
          phase === 'preflight' ? 'source_budget_exceeded' : 'hydration_failed'
        );
      }
      updateChunkDigest(hash, chunk);
      if (onChunk) onChunk(chunk);
    }
  } catch (error) {
    rethrowKnown(error);
    throw codedError(errorCode, schemaReason);
  }
  if (chunkCount !== budget.chunk_count ||
      contentBytes !== budget.content_bytes ||
      vectorBytes !== budget.vector_bytes) {
    throw codedError(errorCode, schemaReason);
  }
  return deepFreeze({
    budget,
    selectedProjectionDigest: `sha256:${hash.digest('hex')}`
  });
}

function createProjectionPlan({
  allowedDiaryNames,
  dimension,
  budget,
  sourceIdentity,
  selectedProjectionDigest
}) {
  const base = {
    schema_version: 1,
    protocol: SOURCE_PROJECTION_PROTOCOL,
    allowed_diary_names: [...allowedDiaryNames],
    dimension,
    budget: structuredClone(budget),
    source_identity_digest: sourceIdentity,
    selected_projection_digest: selectedProjectionDigest
  };
  const plan = {
    ...base,
    plan_digest: digestObject(base)
  };
  validateProjectionPlan(plan);
  return deepFreeze(plan);
}

function validateProjectionPlan(plan) {
  try {
    if (!exactKeys(plan, PROJECTION_PLAN_KEYS) ||
        utf8ByteLength(plan) > MAX_PROJECTION_PLAN_BYTES ||
        plan.schema_version !== 1 ||
        plan.protocol !== SOURCE_PROJECTION_PROTOCOL ||
        !Array.isArray(plan.allowed_diary_names) ||
        !validateProjectionBudget(plan.budget) ||
        typeof plan.source_identity_digest !== 'string' ||
        !DIGEST_PATTERN.test(plan.source_identity_digest) ||
        typeof plan.selected_projection_digest !== 'string' ||
        !DIGEST_PATTERN.test(plan.selected_projection_digest) ||
        typeof plan.plan_digest !== 'string' ||
        !DIGEST_PATTERN.test(plan.plan_digest)) {
      throw new TypeError('projection_plan_shape_invalid');
    }
    const allowed = normalizeSelectedDiaryNames(plan.allowed_diary_names);
    normalizeDimension(plan.dimension, {
      errorCode: 'selected_diary_hydration_projection_plan_invalid',
      reasonCode: 'hydration_failed'
    });
    if (allowed.some(
      (name, index) => name !== plan.allowed_diary_names[index]
    )) {
      throw new TypeError('projection_plan_scope_invalid');
    }
    const { plan_digest: ignored, ...base } = plan;
    if (plan.plan_digest !== digestObject(base)) {
      throw new TypeError('projection_plan_digest_invalid');
    }
    return plan;
  } catch {
    throw codedError(
      'selected_diary_hydration_projection_plan_invalid',
      'hydration_failed',
      { counterFacts: zeroDerivedCounterFacts() }
    );
  }
}

function zeroDerivedCounterFacts() {
  return deepFreeze({
    primary_memory: {
      write_attempts: 0,
      writes_committed: 0
    },
    derived_transaction: {
      started: 0,
      committed: 0,
      rolled_back: 0
    }
  });
}

function derivedCounterFacts({
  started,
  committed,
  rolledBack
}) {
  const transaction = {
    started,
    committed
  };
  if (rolledBack !== null) transaction.rolled_back = rolledBack;
  return deepFreeze({
    primary_memory: {
      write_attempts: 0,
      writes_committed: 0
    },
    derived_transaction: transaction
  });
}

function assertIsolatedStoreState(
  database,
  expectedFileCount,
  expectedChunkCount,
  {
    errorCode = 'selected_diary_hydration_isolated_store_changed'
  } = {}
) {
  const currentFiles = queryCount(
    database,
    'SELECT COUNT(*) AS count FROM files',
    [],
    errorCode,
    'hydration_failed'
  );
  const currentChunks = queryCount(
    database,
    'SELECT COUNT(*) AS count FROM chunks',
    [],
    errorCode,
    'hydration_failed'
  );
  if (currentFiles !== expectedFileCount ||
      currentChunks !== expectedChunkCount) {
    throw codedError(errorCode, 'hydration_failed');
  }
  for (const table of SECONDARY_TABLES) {
    if (queryCount(
      database,
      `SELECT COUNT(*) AS count FROM ${table}`,
      [],
      errorCode,
      'hydration_failed'
    ) !== 0) {
      throw codedError(errorCode, 'hydration_failed');
    }
  }
  return true;
}

function selectedStoreDigest(
  database,
  allowedDiaryNames,
  dimension
) {
  const selected = scanSelectedProjection(
    database,
    allowedDiaryNames,
    dimension,
    {
      errorCode: 'selected_diary_hydration_isolated_store_invalid',
      phase: 'hydration'
    }
  );
  assertIsolatedStoreState(
    database,
    selected.budget.file_count,
    selected.budget.chunk_count,
    {
      errorCode: 'selected_diary_hydration_isolated_scope_contaminated'
    }
  );
  return selected;
}

function insertProjectionStream(
  sourceDatabase,
  isolatedDatabase,
  allowedDiaryNames,
  dimension
) {
  const insertFile = isolatedDatabase.prepare(`
    INSERT INTO files
      (id, path, diary_name, checksum, mtime, size, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertChunk = isolatedDatabase.prepare(`
    INSERT INTO chunks
      (id, file_id, chunk_index, content, vector)
    VALUES (?, ?, ?, ?, ?)
  `);
  return scanSelectedProjection(
    sourceDatabase,
    allowedDiaryNames,
    dimension,
    {
      errorCode: 'selected_diary_hydration_source_materialization_invalid',
      phase: 'hydration',
      onFile(file) {
        insertFile.run(
          file.id,
          file.path,
          file.diaryName,
          file.checksum,
          file.mtime,
          file.size,
          file.updatedAt
        );
      },
      onChunk(chunk) {
        insertChunk.run(
          chunk.id,
          chunk.fileId,
          chunk.chunkIndex,
          chunk.content,
          chunk.vector
        );
      }
    }
  );
}

function runDerivedTransaction(database, operation) {
  let started = 0;
  let committed = 0;
  let rolledBack = 0;
  try {
    database.exec('BEGIN IMMEDIATE');
    started = 1;
    const result = operation();
    database.exec('COMMIT');
    committed = 1;
    return {
      result,
      counterFacts: derivedCounterFacts({
        started,
        committed,
        rolledBack
      })
    };
  } catch (error) {
    if (started === 1 && committed === 0) {
      try {
        database.exec('ROLLBACK');
        rolledBack = 1;
      } catch {
        rolledBack = null;
      }
    }
    const counterFacts = derivedCounterFacts({
      started,
      committed,
      rolledBack
    });
    if (error?.reasonCode) {
      error.counterFacts = counterFacts;
      throw error;
    }
    throw codedError(
      'selected_diary_hydration_transaction_failed',
      'hydration_failed',
      { counterFacts }
    );
  }
}

function defaultOpenSourceDatabase(file, knowledgeBaseManager) {
  const Database = knowledgeBaseManager?.db?.constructor;
  if (typeof Database !== 'function') {
    throw codedError(
      'selected_diary_hydration_source_database_driver_invalid',
      'source_identity_invalid'
    );
  }
  let database;
  try {
    database = new Database(file, {
      fileMustExist: true,
      readonly: true
    });
  } catch {
    throw codedError(
      'selected_diary_hydration_source_database_open_failed',
      'source_identity_invalid'
    );
  }
  if (database.readonly !== true) {
    try {
      database.close();
    } catch {}
    throw codedError(
      'selected_diary_hydration_source_database_not_readonly',
      'source_identity_invalid'
    );
  }
  return database;
}

function executeSourceSnapshot({
  boundary,
  expectedSourceIdentity,
  fsModule,
  knowledgeBaseManager,
  openSourceDatabase,
  phase,
  operation
}) {
  const preflight = phase === 'preflight';
  const identityReason = preflight
    ? 'source_identity_invalid'
    : 'source_snapshot_changed_after_preflight';
  const errorCode = preflight
    ? 'selected_diary_hydration_source_database_invalid'
    : 'source_snapshot_changed_after_preflight';
  const currentIdentity = sourceIdentityDigest(boundary.sourceDatabase, {
    errorCode,
    reasonCode: identityReason,
    fsModule
  });
  if (expectedSourceIdentity &&
      currentIdentity !== expectedSourceIdentity) {
    throw codedError(
      errorCode,
      identityReason,
      preflight ? {} : { counterFacts: zeroDerivedCounterFacts() }
    );
  }
  let sourceDatabase;
  let activeError = null;
  let operationResult;
  try {
    try {
      sourceDatabase = openSourceDatabase(
        boundary.sourceDatabase,
        knowledgeBaseManager
      );
    } catch (error) {
      if (preflight) throw error;
      throw codedError(
        'selected_diary_hydration_source_database_open_failed',
        'hydration_failed',
        { counterFacts: zeroDerivedCounterFacts() }
      );
    }
    if (!sourceDatabase ||
        typeof sourceDatabase.prepare !== 'function' ||
        typeof sourceDatabase.exec !== 'function' ||
        typeof sourceDatabase.close !== 'function' ||
        sourceDatabase.readonly !== true) {
      throw codedError(
        'selected_diary_hydration_source_database_driver_invalid',
        identityReason
      );
    }
    assertExactDatabaseFile(
      sourceDatabase,
      boundary.sourceDatabase,
      {
        errorCode: preflight
          ? 'selected_diary_hydration_source_database_binding_invalid'
          : errorCode,
        reasonCode: identityReason,
        fsModule
      }
    );
    const identityAfterOpen = sourceIdentityDigest(boundary.sourceDatabase, {
      errorCode,
      reasonCode: identityReason,
      fsModule
    });
    if (identityAfterOpen !== currentIdentity) {
      throw codedError(errorCode, identityReason);
    }
    sourceDatabase.exec('PRAGMA query_only = ON');
    const queryOnly = sourceDatabase.prepare('PRAGMA query_only').get();
    if (Number(Object.values(queryOnly || {})[0]) !== 1) {
      throw codedError(
        'selected_diary_hydration_source_database_not_readonly',
        identityReason
      );
    }
    sourceDatabase.exec('BEGIN');
    let committed = false;
    try {
      operationResult = operation(sourceDatabase);
      sourceDatabase.exec('COMMIT');
      committed = true;
      return operationResult;
    } finally {
      if (!committed) {
        try {
          sourceDatabase.exec('ROLLBACK');
        } catch {}
      }
    }
  } catch (error) {
    const selectedError = error?.reasonCode
      ? error
      : codedError(
        preflight
          ? 'selected_diary_hydration_source_preflight_failed'
          : 'selected_diary_hydration_source_snapshot_close_failed',
        preflight ? 'source_preflight_failed' : 'hydration_failed'
      );
    activeError = selectedError;
    if (!preflight &&
        selectedError.counterFacts === undefined) {
      selectedError.counterFacts =
        operationResult?.counterFacts || zeroDerivedCounterFacts();
    }
    throw selectedError;
  } finally {
    if (sourceDatabase && typeof sourceDatabase.close === 'function') {
      try {
        sourceDatabase.close();
      } catch {
        if (!activeError) {
          throw codedError(
            'selected_diary_hydration_source_database_close_failed',
            preflight ? 'source_preflight_failed' : 'hydration_failed',
            preflight
              ? {}
              : {
                counterFacts:
                  operationResult?.counterFacts || zeroDerivedCounterFacts()
              }
          );
        }
      }
    }
  }
}

function sameAllowedDiaryNames(left, right) {
  return left.length === right.length &&
    left.every((name, index) => name === right[index]);
}

function createProductionSelectedDiarySourceProjection({
  sourceKnowledgeBaseStorePath,
  vcpToolBoxRoot,
  fsModule = fs,
  openSourceDatabase = defaultOpenSourceDatabase
} = {}) {
  if (typeof openSourceDatabase !== 'function') {
    throw codedError(
      'selected_diary_hydration_source_database_driver_invalid',
      'source_identity_invalid'
    );
  }

  function preflight({
    allowedDiaryNames,
    dimension,
    knowledgeBaseManager
  } = {}) {
    const allowed = normalizeSelectedDiaryNames(allowedDiaryNames);
    const selectedDimension = dimension ??
      knowledgeBaseManager?.config?.dimension;
    const boundary = validateSourceBoundary({
      dimension: selectedDimension,
      sourceKnowledgeBaseStorePath,
      vcpToolBoxRoot,
      fsModule
    });
    const sourceIdentity = sourceIdentityDigest(boundary.sourceDatabase, {
      fsModule
    });
    const selected = executeSourceSnapshot({
      boundary,
      expectedSourceIdentity: sourceIdentity,
      fsModule,
      knowledgeBaseManager,
      openSourceDatabase,
      phase: 'preflight',
      operation(sourceDatabase) {
        return scanSelectedProjection(
          sourceDatabase,
          allowed,
          boundary.dimension,
          { phase: 'preflight' }
        );
      }
    });
    return createProjectionPlan({
      allowedDiaryNames: allowed,
      dimension: boundary.dimension,
      budget: selected.budget,
      sourceIdentity,
      selectedProjectionDigest: selected.selectedProjectionDigest
    });
  }

  function materialize({
    allowedDiaryNames,
    knowledgeBaseManager,
    knowledgeBaseRootPath,
    knowledgeBaseStorePath,
    projectionPlan
  } = {}) {
    validateProjectionPlan(projectionPlan);
    let allowed;
    try {
      allowed = normalizeSelectedDiaryNames(
        allowedDiaryNames ?? projectionPlan.allowed_diary_names
      );
    } catch {
      throw codedError(
        'selected_diary_hydration_allowlist_invalid',
        'hydration_failed',
        { counterFacts: zeroDerivedCounterFacts() }
      );
    }
    if (!sameAllowedDiaryNames(
      allowed,
      projectionPlan.allowed_diary_names
    )) {
      throw codedError(
        'selected_diary_hydration_projection_plan_scope_mismatch',
        'hydration_failed',
        { counterFacts: zeroDerivedCounterFacts() }
      );
    }
    let boundary;
    try {
      boundary = validateRuntimeBoundary({
        knowledgeBaseManager,
        knowledgeBaseRootPath,
        knowledgeBaseStorePath,
        sourceKnowledgeBaseStorePath,
        vcpToolBoxRoot,
        fsModule
      });
    } catch (error) {
      throw codedError(
        typeof error?.code === 'string' &&
          error.code.startsWith('selected_diary_hydration_')
          ? error.code
          : 'selected_diary_hydration_boundary_mismatch',
        'hydration_failed',
        { counterFacts: zeroDerivedCounterFacts() }
      );
    }
    if (boundary.dimension !== projectionPlan.dimension) {
      throw codedError(
        'selected_diary_hydration_projection_plan_dimension_mismatch',
        'hydration_failed',
        { counterFacts: zeroDerivedCounterFacts() }
      );
    }

    let materializationCounters = zeroDerivedCounterFacts();
    const result = executeSourceSnapshot({
      boundary,
      expectedSourceIdentity: projectionPlan.source_identity_digest,
      fsModule,
      knowledgeBaseManager,
      openSourceDatabase,
      phase: 'materialization',
      operation(sourceDatabase) {
        let selected;
        try {
          selected = scanSelectedProjection(
            sourceDatabase,
            allowed,
            boundary.dimension,
            {
              errorCode: 'source_snapshot_changed_after_preflight',
              phase: 'hydration'
            }
          );
        } catch (error) {
          throw codedError(
            'source_snapshot_changed_after_preflight',
            'source_snapshot_changed_after_preflight',
            {
              counterFacts: zeroDerivedCounterFacts(),
              causeCode: error?.code
            }
          );
        }
        if (selected.selectedProjectionDigest !==
              projectionPlan.selected_projection_digest ||
            digestObject(selected.budget) !==
              digestObject(projectionPlan.budget)) {
          throw codedError(
            'source_snapshot_changed_after_preflight',
            'source_snapshot_changed_after_preflight',
            { counterFacts: zeroDerivedCounterFacts() }
          );
        }

        const existingFiles = queryCount(
          knowledgeBaseManager.db,
          'SELECT COUNT(*) AS count FROM files',
          [],
          'selected_diary_hydration_isolated_store_invalid',
          'hydration_failed'
        );
        const existingChunks = queryCount(
          knowledgeBaseManager.db,
          'SELECT COUNT(*) AS count FROM chunks',
          [],
          'selected_diary_hydration_isolated_store_invalid',
          'hydration_failed'
        );
        if (existingFiles > 0 || existingChunks > 0) {
          const existing = selectedStoreDigest(
            knowledgeBaseManager.db,
            allowed,
            boundary.dimension
          );
          if (existing.selectedProjectionDigest !==
                projectionPlan.selected_projection_digest ||
              digestObject(existing.budget) !==
                digestObject(projectionPlan.budget)) {
            throw codedError(
              'selected_diary_hydration_isolated_store_stale',
              'hydration_failed',
              { counterFacts: zeroDerivedCounterFacts() }
            );
          }
          return {
            selected,
            counterFacts: zeroDerivedCounterFacts()
          };
        }
        assertIsolatedStoreState(knowledgeBaseManager.db, 0, 0, {
          errorCode: 'selected_diary_hydration_isolated_scope_contaminated'
        });
        const transaction = runDerivedTransaction(
          knowledgeBaseManager.db,
          () => {
            assertIsolatedStoreState(knowledgeBaseManager.db, 0, 0);
            const inserted = insertProjectionStream(
              sourceDatabase,
              knowledgeBaseManager.db,
              allowed,
              boundary.dimension
            );
            if (inserted.selectedProjectionDigest !==
                  projectionPlan.selected_projection_digest ||
                digestObject(inserted.budget) !==
                  digestObject(projectionPlan.budget)) {
              throw codedError(
                'source_snapshot_changed_after_preflight',
                'source_snapshot_changed_after_preflight'
              );
            }
            assertIsolatedStoreState(
              knowledgeBaseManager.db,
              inserted.budget.file_count,
              inserted.budget.chunk_count
            );
            return inserted;
          }
        );
        materializationCounters = transaction.counterFacts;
        return {
          selected: transaction.result,
          counterFacts: transaction.counterFacts
        };
      }
    });
    materializationCounters = result.counterFacts || materializationCounters;
    return deepFreeze({
      accepted: true,
      authorizationResolvedBeforeHydration: true,
      selectedDiaryOnly: true,
      sourcePartitionMutationPerformed: false,
      primaryMemoryWritePerformed: false,
      unauthorizedSourceRowsRead: false,
      sourceSnapshotStable: true,
      selectedProjectionDigestMatched: true,
      hydratedDiaryCount: allowed.length,
      hydratedFileCount: result.selected.budget.file_count,
      hydratedChunkCount: result.selected.budget.chunk_count,
      counterFacts: materializationCounters
    });
  }

  return Object.freeze({
    preflight,
    materialize
  });
}

function createProductionSelectedDiaryRuntimeHydrator(options = {}) {
  const projection = createProductionSelectedDiarySourceProjection(options);
  const hydrate = async function productionSelectedDiaryRuntimeHydrator(input = {}) {
    const projectionPlan = projection.preflight(input);
    return projection.materialize({
      ...input,
      projectionPlan
    });
  };
  Object.defineProperties(hydrate, {
    preflight: {
      enumerable: true,
      value: projection.preflight
    },
    materialize: {
      enumerable: true,
      value: projection.materialize
    }
  });
  return Object.freeze(hydrate);
}

module.exports = {
  MAX_PROJECTION_PLAN_BYTES,
  MAX_SELECTED_CHUNKS,
  MAX_SELECTED_CONTENT_BYTES,
  MAX_SELECTED_DIARIES,
  MAX_SELECTED_DIARY_SCOPE_BYTES,
  MAX_SELECTED_FILES,
  MAX_SELECTED_METADATA_BYTES,
  MAX_SELECTED_VECTOR_BYTES,
  SOURCE_PROJECTION_PROTOCOL,
  createProductionSelectedDiaryRuntimeHydrator,
  createProductionSelectedDiarySourceProjection,
  normalizeSelectedDiaryNames,
  scanSelectedProjection,
  validateProjectionPlan,
  validateRuntimeBoundary,
  validateSourceBoundary
};
