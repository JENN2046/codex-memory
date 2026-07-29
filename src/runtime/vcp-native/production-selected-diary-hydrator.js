'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_SELECTED_DIARIES = 8;
const MAX_SELECTED_FILES = 10_000;
const MAX_SELECTED_CHUNKS = 250_000;
const MAX_SELECTED_METADATA_BYTES = 16 * 1024 * 1024;
const MAX_SELECTED_CONTENT_BYTES = 128 * 1024 * 1024;
const MAX_SELECTED_VECTOR_BYTES = 128 * 1024 * 1024;
const SOURCE_DATABASE_FILENAME = 'knowledge_base.sqlite';
const SECONDARY_TABLES = Object.freeze([
  'file_tags',
  'kv_store',
  'migration_deleted_chunks',
  'migration_deleted_files',
  'tag_intrinsic_residuals',
  'tag_pair_similarity',
  'tags'
]);

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function normalizeSelectedDiaryNames(value) {
  if (!Array.isArray(value) ||
      value.length < 1 ||
      value.length > MAX_SELECTED_DIARIES) {
    throw codedError('selected_diary_hydration_allowlist_invalid');
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
      throw codedError('selected_diary_hydration_allowlist_invalid');
    }
    return name;
  });
  const unique = [...new Set(names)].sort();
  if (unique.length !== names.length) {
    throw codedError('selected_diary_hydration_allowlist_invalid');
  }
  return Object.freeze(unique);
}

function ownerDirectory(directory, {
  fsModule = fs
} = {}) {
  if (typeof directory !== 'string' ||
      !path.isAbsolute(directory) ||
      path.resolve(directory) !== directory) {
    throw codedError('selected_diary_hydration_directory_invalid');
  }
  let before;
  let resolved;
  let after;
  try {
    before = fsModule.lstatSync(directory);
    resolved = fsModule.realpathSync(directory);
    after = fsModule.lstatSync(resolved);
  } catch {
    throw codedError('selected_diary_hydration_directory_unavailable');
  }
  if (!before.isDirectory() ||
      before.isSymbolicLink() ||
      !after.isDirectory() ||
      after.isSymbolicLink() ||
      resolved !== directory) {
    throw codedError('selected_diary_hydration_directory_invalid');
  }
  return resolved;
}

function regularDatabaseFile(file, {
  errorCode = 'selected_diary_hydration_source_database_invalid',
  fsModule = fs
} = {}) {
  let stat;
  let resolved;
  try {
    stat = fsModule.lstatSync(file);
    resolved = fsModule.realpathSync(file);
  } catch {
    throw codedError(errorCode);
  }
  if (!stat.isFile() ||
      stat.isSymbolicLink() ||
      resolved !== file) {
    throw codedError(errorCode);
  }
  return file;
}

function assertExactDatabaseFile(database, expectedFile, {
  errorCode,
  fsModule = fs
}) {
  const rows = queryAll(
    database,
    'PRAGMA database_list',
    [],
    errorCode
  );
  if (rows.length !== 1 ||
      rows[0]?.seq !== 0 ||
      rows[0]?.name !== 'main' ||
      typeof rows[0]?.file !== 'string' ||
      rows[0].file.length < 1) {
    throw codedError(errorCode);
  }
  const actualFile = path.resolve(rows[0].file);
  regularDatabaseFile(actualFile, { errorCode, fsModule });
  regularDatabaseFile(expectedFile, { errorCode, fsModule });
  if (actualFile !== expectedFile) {
    throw codedError(errorCode);
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
      knowledgeBaseManager.diaryIndices.size !== 0 ||
      !Number.isSafeInteger(knowledgeBaseManager.config?.dimension) ||
      knowledgeBaseManager.config.dimension < 1) {
    throw codedError('selected_diary_hydration_runtime_not_quiescent');
  }
  const vcpRoot = ownerDirectory(vcpToolBoxRoot, { fsModule });
  const memoryRoot = ownerDirectory(knowledgeBaseRootPath, { fsModule });
  const isolatedStore = ownerDirectory(knowledgeBaseStorePath, { fsModule });
  const sourceStore = ownerDirectory(sourceKnowledgeBaseStorePath, { fsModule });
  const configuredRoot = ownerDirectory(
    path.resolve(knowledgeBaseManager.config.rootPath || ''),
    { fsModule }
  );
  const configuredStore = ownerDirectory(
    path.resolve(knowledgeBaseManager.config.storePath || ''),
    { fsModule }
  );
  if (configuredRoot !== memoryRoot ||
      configuredStore !== isolatedStore ||
      memoryRoot !== path.join(vcpRoot, 'dailynote') ||
      sourceStore !== path.join(vcpRoot, 'VectorStore') ||
      !relationInside(vcpRoot, memoryRoot) ||
      !relationInside(vcpRoot, sourceStore) ||
      relationInside(vcpRoot, isolatedStore) ||
      relationInside(memoryRoot, sourceStore) ||
      relationInside(sourceStore, memoryRoot) ||
      relationInside(isolatedStore, sourceStore) ||
      relationInside(sourceStore, isolatedStore) ||
      isolatedStore === sourceStore) {
    throw codedError('selected_diary_hydration_boundary_mismatch');
  }
  const sourceDatabase = regularDatabaseFile(
    path.join(sourceStore, SOURCE_DATABASE_FILENAME),
    { fsModule }
  );
  assertExactDatabaseFile(
    knowledgeBaseManager.db,
    path.join(isolatedStore, SOURCE_DATABASE_FILENAME),
    {
      errorCode: 'selected_diary_hydration_isolated_database_invalid',
      fsModule
    }
  );
  return Object.freeze({
    dimension: knowledgeBaseManager.config.dimension,
    isolatedStore,
    memoryRoot,
    sourceDatabase,
    sourceStore,
    vcpRoot
  });
}

function placeholders(count) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SELECTED_DIARIES) {
    throw codedError('selected_diary_hydration_allowlist_invalid');
  }
  return new Array(count).fill('?').join(', ');
}

function queryAll(database, sql, values, errorCode) {
  try {
    const statement = database.prepare(sql);
    return statement.all(...values);
  } catch {
    throw codedError(errorCode);
  }
}

function queryCount(database, sql, values, errorCode) {
  let row;
  try {
    row = database.prepare(sql).get(...values);
  } catch {
    throw codedError(errorCode);
  }
  const count = Number(row?.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw codedError(errorCode);
  }
  return count;
}

function queryProjectionBudget(
  database,
  marker,
  allowedDiaryNames,
  dimension,
  errorCode
) {
  let fileSummary;
  let chunkSummary;
  try {
    fileSummary = database.prepare(`
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(
          length(CAST(path AS BLOB)) +
          length(CAST(diary_name AS BLOB)) +
          length(CAST(checksum AS BLOB))
        ), 0) AS metadataBytes
      FROM files
      WHERE diary_name IN (${marker})
    `).get(...allowedDiaryNames);
    chunkSummary = database.prepare(`
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(length(CAST(c.content AS BLOB))), 0) AS contentBytes,
        COALESCE(SUM(length(c.vector)), 0) AS vectorBytes
      FROM chunks c
      INNER JOIN files f ON f.id = c.file_id
      WHERE f.diary_name IN (${marker})
    `).get(...allowedDiaryNames);
  } catch {
    throw codedError(errorCode);
  }
  const fileCount = Number(fileSummary?.count);
  const metadataBytes = Number(fileSummary?.metadataBytes);
  const chunkCount = Number(chunkSummary?.count);
  const contentBytes = Number(chunkSummary?.contentBytes);
  const vectorBytes = Number(chunkSummary?.vectorBytes);
  const expectedVectorBytes =
    chunkCount * dimension * Float32Array.BYTES_PER_ELEMENT;
  if (!Number.isSafeInteger(fileCount) ||
      fileCount < 0 ||
      fileCount > MAX_SELECTED_FILES ||
      !Number.isSafeInteger(metadataBytes) ||
      metadataBytes < 0 ||
      metadataBytes > MAX_SELECTED_METADATA_BYTES ||
      !Number.isSafeInteger(chunkCount) ||
      chunkCount < 0 ||
      chunkCount > MAX_SELECTED_CHUNKS ||
      !Number.isSafeInteger(contentBytes) ||
      contentBytes < 0 ||
      contentBytes > MAX_SELECTED_CONTENT_BYTES ||
      !Number.isSafeInteger(vectorBytes) ||
      vectorBytes < 0 ||
      vectorBytes > MAX_SELECTED_VECTOR_BYTES ||
      !Number.isSafeInteger(expectedVectorBytes) ||
      vectorBytes !== expectedVectorBytes) {
    throw codedError(errorCode);
  }
  return Object.freeze({
    chunkCount,
    contentBytes,
    fileCount,
    metadataBytes,
    vectorBytes
  });
}

function normalizedVector(value, dimension, errorCode) {
  if (!Buffer.isBuffer(value) && !ArrayBuffer.isView(value)) {
    throw codedError(errorCode);
  }
  const vector = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (vector.length !== dimension * Float32Array.BYTES_PER_ELEMENT) {
    throw codedError(errorCode);
  }
  let nonzero = false;
  for (let offset = 0; offset < vector.length; offset += 4) {
    const item = vector.readFloatLE(offset);
    if (!Number.isFinite(item)) throw codedError(errorCode);
    if (item !== 0) nonzero = true;
  }
  if (!nonzero) throw codedError(errorCode);
  return Buffer.from(vector);
}

function validateSelectedPath(value, diaryName, errorCode) {
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
    throw codedError(errorCode);
  }
  return value;
}

function readSelectedProjection(database, allowedDiaryNames, dimension, {
  errorCode = 'selected_diary_hydration_source_projection_invalid'
} = {}) {
  const allowed = new Set(allowedDiaryNames);
  const marker = placeholders(allowedDiaryNames.length);
  const budget = queryProjectionBudget(
    database,
    marker,
    allowedDiaryNames,
    dimension,
    errorCode
  );
  const files = queryAll(database, `
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
  `, [...allowedDiaryNames, MAX_SELECTED_FILES + 1], errorCode);
  if (files.length !== budget.fileCount) throw codedError(errorCode);
  const fileIds = new Set();
  const filePaths = new Set();
  const normalizedFiles = files.map(row => {
    if (!Number.isSafeInteger(row?.id) ||
        row.id < 1 ||
        fileIds.has(row.id) ||
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
      throw codedError(errorCode);
    }
    const selectedPath = validateSelectedPath(row.path, row.diaryName, errorCode);
    if (filePaths.has(selectedPath)) throw codedError(errorCode);
    fileIds.add(row.id);
    filePaths.add(selectedPath);
    return Object.freeze({
      id: row.id,
      path: selectedPath,
      diaryName: row.diaryName,
      checksum: row.checksum,
      mtime: row.mtime,
      size: row.size,
      updatedAt: row.updatedAt ?? null
    });
  });
  const chunks = queryAll(database, `
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
  `, [...allowedDiaryNames, MAX_SELECTED_CHUNKS + 1], errorCode);
  if (chunks.length !== budget.chunkCount) throw codedError(errorCode);
  const chunkIds = new Set();
  const nextChunkIndex = new Map();
  let contentBytes = 0;
  const normalizedChunks = chunks.map(row => {
    const expectedChunkIndex = nextChunkIndex.get(row?.fileId) || 0;
    if (!Number.isSafeInteger(row?.id) ||
        row.id < 1 ||
        chunkIds.has(row.id) ||
        !fileIds.has(row.fileId) ||
        !Number.isSafeInteger(row.chunkIndex) ||
        row.chunkIndex !== expectedChunkIndex ||
        typeof row.content !== 'string') {
      throw codedError(errorCode);
    }
    contentBytes += Buffer.byteLength(row.content, 'utf8');
    if (contentBytes > MAX_SELECTED_CONTENT_BYTES) {
      throw codedError(errorCode);
    }
    chunkIds.add(row.id);
    nextChunkIndex.set(row.fileId, expectedChunkIndex + 1);
    return Object.freeze({
      id: row.id,
      fileId: row.fileId,
      chunkIndex: row.chunkIndex,
      content: row.content,
      vector: normalizedVector(row.vector, dimension, errorCode)
    });
  });
  return Object.freeze({
    files: Object.freeze(normalizedFiles),
    chunks: Object.freeze(normalizedChunks)
  });
}

function projectionsEqual(left, right) {
  if (left.files.length !== right.files.length ||
      left.chunks.length !== right.chunks.length) {
    return false;
  }
  for (let index = 0; index < left.files.length; index += 1) {
    const a = left.files[index];
    const b = right.files[index];
    if (a.id !== b.id ||
        a.path !== b.path ||
        a.diaryName !== b.diaryName ||
        a.checksum !== b.checksum ||
        a.mtime !== b.mtime ||
        a.size !== b.size ||
        a.updatedAt !== b.updatedAt) {
      return false;
    }
  }
  for (let index = 0; index < left.chunks.length; index += 1) {
    const a = left.chunks[index];
    const b = right.chunks[index];
    if (a.id !== b.id ||
        a.fileId !== b.fileId ||
        a.chunkIndex !== b.chunkIndex ||
        a.content !== b.content ||
        !a.vector.equals(b.vector)) {
      return false;
    }
  }
  return true;
}

function isolatedStoreProjection(database, allowedDiaryNames, dimension) {
  const errorCode = 'selected_diary_hydration_isolated_store_invalid';
  const selected = readSelectedProjection(
    database,
    allowedDiaryNames,
    dimension,
    { errorCode }
  );
  const totalFiles = queryCount(
    database,
    'SELECT COUNT(*) AS count FROM files',
    [],
    errorCode
  );
  const totalChunks = queryCount(
    database,
    'SELECT COUNT(*) AS count FROM chunks',
    [],
    errorCode
  );
  if (totalFiles !== selected.files.length ||
      totalChunks !== selected.chunks.length) {
    throw codedError('selected_diary_hydration_isolated_scope_contaminated');
  }
  for (const table of SECONDARY_TABLES) {
    const count = queryCount(
      database,
      `SELECT COUNT(*) AS count FROM ${table}`,
      [],
      errorCode
    );
    if (count !== 0) {
      throw codedError('selected_diary_hydration_isolated_scope_contaminated');
    }
  }
  return selected;
}

function runIsolatedTransaction(database, operation) {
  database.exec('BEGIN IMMEDIATE');
  let committed = false;
  try {
    const value = operation();
    database.exec('COMMIT');
    committed = true;
    return value;
  } finally {
    if (!committed) {
      try {
        database.exec('ROLLBACK');
      } catch {}
    }
  }
}

function assertIsolatedTransactionState(
  database,
  expectedFileCount,
  expectedChunkCount
) {
  const errorCode = 'selected_diary_hydration_isolated_store_changed';
  const currentFiles = queryCount(
    database,
    'SELECT COUNT(*) AS count FROM files',
    [],
    errorCode
  );
  const currentChunks = queryCount(
    database,
    'SELECT COUNT(*) AS count FROM chunks',
    [],
    errorCode
  );
  if (currentFiles !== expectedFileCount ||
      currentChunks !== expectedChunkCount) {
    throw codedError(errorCode);
  }
  for (const table of SECONDARY_TABLES) {
    if (queryCount(
      database,
      `SELECT COUNT(*) AS count FROM ${table}`,
      [],
      errorCode
    ) !== 0) {
      throw codedError(errorCode);
    }
  }
}

function insertProjection(database, projection) {
  const insertFile = database.prepare(`
    INSERT INTO files
      (id, path, diary_name, checksum, mtime, size, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertChunk = database.prepare(`
    INSERT INTO chunks
      (id, file_id, chunk_index, content, vector)
    VALUES (?, ?, ?, ?, ?)
  `);
  runIsolatedTransaction(database, () => {
    assertIsolatedTransactionState(database, 0, 0);
    for (const file of projection.files) {
      insertFile.run(
        file.id,
        file.path,
        file.diaryName,
        file.checksum,
        file.mtime,
        file.size,
        file.updatedAt
      );
    }
    for (const chunk of projection.chunks) {
      insertChunk.run(
        chunk.id,
        chunk.fileId,
        chunk.chunkIndex,
        chunk.content,
        chunk.vector
      );
    }
    assertIsolatedTransactionState(
      database,
      projection.files.length,
      projection.chunks.length
    );
  });
}

function defaultOpenSourceDatabase(file, knowledgeBaseManager) {
  const Database = knowledgeBaseManager?.db?.constructor;
  if (typeof Database !== 'function') {
    throw codedError('selected_diary_hydration_source_database_driver_invalid');
  }
  let database;
  try {
    database = new Database(file, {
      fileMustExist: true,
      readonly: true
    });
  } catch {
    throw codedError('selected_diary_hydration_source_database_open_failed');
  }
  if (database.readonly !== true) {
    try {
      database.close();
    } catch {}
    throw codedError('selected_diary_hydration_source_database_not_readonly');
  }
  return database;
}

function createProductionSelectedDiaryRuntimeHydrator({
  sourceKnowledgeBaseStorePath,
  vcpToolBoxRoot,
  fsModule = fs,
  openSourceDatabase = defaultOpenSourceDatabase
} = {}) {
  if (typeof openSourceDatabase !== 'function') {
    throw codedError('selected_diary_hydration_source_database_driver_invalid');
  }
  return async function productionSelectedDiaryRuntimeHydrator({
    allowedDiaryNames,
    knowledgeBaseManager,
    knowledgeBaseRootPath,
    knowledgeBaseStorePath
  } = {}) {
    const allowed = normalizeSelectedDiaryNames(allowedDiaryNames);
    const boundary = validateRuntimeBoundary({
      knowledgeBaseManager,
      knowledgeBaseRootPath,
      knowledgeBaseStorePath,
      sourceKnowledgeBaseStorePath,
      vcpToolBoxRoot,
      fsModule
    });
    let sourceDatabase;
    let sourceProjection;
    try {
      sourceDatabase = openSourceDatabase(
        boundary.sourceDatabase,
        knowledgeBaseManager
      );
      if (!sourceDatabase ||
          typeof sourceDatabase.prepare !== 'function' ||
          typeof sourceDatabase.exec !== 'function' ||
          typeof sourceDatabase.close !== 'function' ||
          sourceDatabase.readonly !== true) {
        throw codedError('selected_diary_hydration_source_database_driver_invalid');
      }
      assertExactDatabaseFile(
        sourceDatabase,
        boundary.sourceDatabase,
        {
          errorCode: 'selected_diary_hydration_source_database_binding_invalid',
          fsModule
        }
      );
      sourceDatabase.exec('PRAGMA query_only = ON');
      const queryOnly = sourceDatabase.prepare('PRAGMA query_only').get();
      if (Object.values(queryOnly || {})[0] !== 1) {
        throw codedError('selected_diary_hydration_source_database_not_readonly');
      }
      sourceDatabase.exec('BEGIN');
      let committed = false;
      try {
        sourceProjection = readSelectedProjection(
          sourceDatabase,
          allowed,
          boundary.dimension
        );
        sourceDatabase.exec('COMMIT');
        committed = true;
      } finally {
        if (!committed) {
          try {
            sourceDatabase.exec('ROLLBACK');
          } catch {}
        }
      }
    } finally {
      if (sourceDatabase && typeof sourceDatabase.close === 'function') {
        try {
          sourceDatabase.close();
        } catch {
          throw codedError('selected_diary_hydration_source_database_close_failed');
        }
      }
    }
    const isolatedBefore = isolatedStoreProjection(
      knowledgeBaseManager.db,
      allowed,
      boundary.dimension
    );
    if (isolatedBefore.files.length === 0 &&
        isolatedBefore.chunks.length === 0) {
      insertProjection(knowledgeBaseManager.db, sourceProjection);
    } else if (!projectionsEqual(isolatedBefore, sourceProjection)) {
      throw codedError('selected_diary_hydration_isolated_store_stale');
    }
    const isolatedAfter = isolatedStoreProjection(
      knowledgeBaseManager.db,
      allowed,
      boundary.dimension
    );
    if (!projectionsEqual(isolatedAfter, sourceProjection)) {
      throw codedError('selected_diary_hydration_isolated_store_verification_failed');
    }
    return Object.freeze({
      accepted: true,
      authorizationResolvedBeforeHydration: true,
      selectedDiaryOnly: true,
      sourcePartitionMutationPerformed: false,
      primaryMemoryWritePerformed: false,
      unauthorizedSourceRowsRead: false,
      hydratedDiaryCount: allowed.length,
      hydratedFileCount: isolatedAfter.files.length,
      hydratedChunkCount: isolatedAfter.chunks.length
    });
  };
}

module.exports = {
  MAX_SELECTED_CHUNKS,
  MAX_SELECTED_CONTENT_BYTES,
  MAX_SELECTED_DIARIES,
  MAX_SELECTED_FILES,
  MAX_SELECTED_METADATA_BYTES,
  MAX_SELECTED_VECTOR_BYTES,
  createProductionSelectedDiaryRuntimeHydrator,
  isolatedStoreProjection,
  normalizeSelectedDiaryNames,
  projectionsEqual,
  readSelectedProjection,
  validateRuntimeBoundary
};
