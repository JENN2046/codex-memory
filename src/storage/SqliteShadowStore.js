const fs = require('node:fs/promises');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const RECORD_ISOLATION_TEXT_PATTERNS = Object.freeze({
  governance_records: [
    'isolation-family: governance_records',
    'isolation_family: governance_records',
    'record-family: governance_records',
    'record_family: governance_records',
    'classification-family: governance_records',
    'classification_family: governance_records',
    'recall-classification: governance_records',
    'recall_classification: governance_records',
    'isolation-family:governance_records',
    'isolation_family:governance_records',
    'record-family:governance_records',
    'record_family:governance_records',
    'classification-family:governance_records',
    'classification_family:governance_records',
    'recall-classification:governance_records',
    'recall_classification:governance_records'
  ],
  validation_transcripts: [
    'isolation-family: validation_transcripts',
    'isolation_family: validation_transcripts',
    'record-family: validation_transcripts',
    'record_family: validation_transcripts',
    'classification-family: validation_transcripts',
    'classification_family: validation_transcripts',
    'recall-classification: validation_transcripts',
    'recall_classification: validation_transcripts',
    'isolation-family:validation_transcripts',
    'isolation_family:validation_transcripts',
    'record-family:validation_transcripts',
    'record_family:validation_transcripts',
    'classification-family:validation_transcripts',
    'classification_family:validation_transcripts',
    'recall-classification:validation_transcripts',
    'recall_classification:validation_transcripts'
  ],
  redaction_samples: [
    'isolation-family: redaction_samples',
    'isolation_family: redaction_samples',
    'record-family: redaction_samples',
    'record_family: redaction_samples',
    'classification-family: redaction_samples',
    'classification_family: redaction_samples',
    'recall-classification: redaction_samples',
    'recall_classification: redaction_samples',
    'isolation-family:redaction_samples',
    'isolation_family:redaction_samples',
    'record-family:redaction_samples',
    'record_family:redaction_samples',
    'classification-family:redaction_samples',
    'classification_family:redaction_samples',
    'recall-classification:redaction_samples',
    'recall_classification:redaction_samples'
  ],
  policy_decisions: [
    'isolation-family: policy_decisions',
    'isolation_family: policy_decisions',
    'record-family: policy_decisions',
    'record_family: policy_decisions',
    'classification-family: policy_decisions',
    'classification_family: policy_decisions',
    'recall-classification: policy_decisions',
    'recall_classification: policy_decisions',
    'isolation-family:policy_decisions',
    'isolation_family:policy_decisions',
    'record-family:policy_decisions',
    'record_family:policy_decisions',
    'classification-family:policy_decisions',
    'classification_family:policy_decisions',
    'recall-classification:policy_decisions',
    'recall_classification:policy_decisions'
  ],
  readiness_reports: [
    'isolation-family: readiness_reports',
    'isolation_family: readiness_reports',
    'record-family: readiness_reports',
    'record_family: readiness_reports',
    'classification-family: readiness_reports',
    'classification_family: readiness_reports',
    'recall-classification: readiness_reports',
    'recall_classification: readiness_reports',
    'isolation-family:readiness_reports',
    'isolation_family:readiness_reports',
    'record-family:readiness_reports',
    'record_family:readiness_reports',
    'classification-family:readiness_reports',
    'classification_family:readiness_reports',
    'recall-classification:readiness_reports',
    'recall_classification:readiness_reports'
  ],
  migration_metadata: [
    'isolation-family: migration_metadata',
    'isolation_family: migration_metadata',
    'record-family: migration_metadata',
    'record_family: migration_metadata',
    'classification-family: migration_metadata',
    'classification_family: migration_metadata',
    'recall-classification: migration_metadata',
    'recall_classification: migration_metadata',
    'isolation-family:migration_metadata',
    'isolation_family:migration_metadata',
    'record-family:migration_metadata',
    'record_family:migration_metadata',
    'classification-family:migration_metadata',
    'classification_family:migration_metadata',
    'recall-classification:migration_metadata',
    'recall_classification:migration_metadata'
  ],
  blocked_memory: [
    'isolation-family: blocked_memory',
    'isolation_family: blocked_memory',
    'record-family: blocked_memory',
    'record_family: blocked_memory',
    'classification-family: blocked_memory',
    'classification_family: blocked_memory',
    'recall-classification: blocked_memory',
    'recall_classification: blocked_memory',
    'isolation-family:blocked_memory',
    'isolation_family:blocked_memory',
    'record-family:blocked_memory',
    'record_family:blocked_memory',
    'classification-family:blocked_memory',
    'classification_family:blocked_memory',
    'recall-classification:blocked_memory',
    'recall_classification:blocked_memory'
  ],
  tombstoned_memory: [
    'isolation-family: tombstoned_memory',
    'isolation_family: tombstoned_memory',
    'record-family: tombstoned_memory',
    'record_family: tombstoned_memory',
    'classification-family: tombstoned_memory',
    'classification_family: tombstoned_memory',
    'recall-classification: tombstoned_memory',
    'recall_classification: tombstoned_memory',
    'isolation-family:tombstoned_memory',
    'isolation_family:tombstoned_memory',
    'record-family:tombstoned_memory',
    'record_family:tombstoned_memory',
    'classification-family:tombstoned_memory',
    'classification_family:tombstoned_memory',
    'recall-classification:tombstoned_memory',
    'recall_classification:tombstoned_memory'
  ]
});
const RECORD_ISOLATION_LINE_PREFIXES = Object.freeze([
  '\n',
  '\n ',
  '\n  ',
  '\n   ',
  '\n    ',
  '\n\t',
  '\n\t\t'
]);

function buildIsolationHintSql() {
  const haystack = "lower(char(10) || coalesce(title, '') || char(10) || coalesce(content, '') || char(10) || coalesce(evidence, '') || char(10) || coalesce(tags_json, ''))";
  const params = [];
  const fragments = Object.entries(RECORD_ISOLATION_TEXT_PATTERNS).map(([family, patterns]) => {
    const checks = patterns.flatMap(pattern =>
      RECORD_ISOLATION_LINE_PREFIXES.map(prefix => {
        params.push(`%${prefix}${pattern}%`);
        return `${haystack} LIKE ?`;
      })
    ).join(' OR ');
    return `CASE WHEN ${checks} THEN '${family}|' ELSE '' END`;
  });
  return {
    expression: fragments.join(' || '),
    params
  };
}

class SqliteShadowStore {
  constructor(config) {
    this.config = config;
    this.db = null;
    this.memoryRecordColumns = new Map();
  }

  async ensureReady() {
    if (this.db) return;
    await fs.mkdir(path.dirname(this.config.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.config.dbPath);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS memory_records (
        memory_id TEXT PRIMARY KEY,
        target TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        evidence TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        validated INTEGER NOT NULL,
        reusable INTEGER NOT NULL,
        sensitivity TEXT NOT NULL,
        file_path TEXT,
        relative_path TEXT,
        raw_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        client_id TEXT,
        workspace_id TEXT,
        project_id TEXT,
        task_id TEXT,
        conversation_id TEXT,
        visibility TEXT,
        retention_policy TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_memory_records_target ON memory_records(target);
      CREATE INDEX IF NOT EXISTS idx_memory_records_updated ON memory_records(updated_at);
      CREATE TABLE IF NOT EXISTS memory_chunks (
        chunk_id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        target TEXT NOT NULL,
        title TEXT NOT NULL,
        source_file TEXT,
        relative_path TEXT,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        vector_json TEXT NOT NULL,
        embedding_fingerprint TEXT,
        tags_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(memory_id) REFERENCES memory_records(memory_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_memory_chunks_memory ON memory_chunks(memory_id);
      CREATE INDEX IF NOT EXISTS idx_memory_chunks_target ON memory_chunks(target);
      CREATE INDEX IF NOT EXISTS idx_memory_chunks_source ON memory_chunks(relative_path);
      CREATE INDEX IF NOT EXISTS idx_memory_chunks_created ON memory_chunks(created_at);
      CREATE TABLE IF NOT EXISTS reconcile_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id TEXT,
        store_kind TEXT NOT NULL,
        reason TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    this.ensureColumn('memory_chunks', 'embedding_fingerprint', 'TEXT');
    this.ensureColumn('memory_records', 'project_id', 'TEXT');
    this.ensureColumn('memory_records', 'workspace_id', 'TEXT');
    this.ensureColumn('memory_records', 'client_id', 'TEXT');
    this.ensureColumn('memory_records', 'task_id', 'TEXT');
    this.ensureColumn('memory_records', 'conversation_id', 'TEXT');
    this.ensureColumn('memory_records', 'visibility', 'TEXT');
    this.ensureColumn('memory_records', 'retention_policy', 'TEXT');
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memory_records_project ON memory_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_memory_records_visibility ON memory_records(visibility);
      CREATE INDEX IF NOT EXISTS idx_memory_records_client ON memory_records(client_id);
    `);
    this.refreshMemoryRecordColumnInfo();
  }

  ensureColumn(tableName, columnName, definition) {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (columns.some(column => column.name === columnName)) return;
    this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }

  refreshMemoryRecordColumnInfo() {
    this.memoryRecordColumns = new Map(
      this.db.prepare('PRAGMA table_info(memory_records)').all()
        .map(column => [column.name, column])
    );
  }

  getColumnDefaultValue(columnName) {
    const column = this.memoryRecordColumns.get(columnName);
    if (!column || !column.notnull || column.dflt_value === null || column.dflt_value === undefined) {
      return null;
    }

    const rawDefault = String(column.dflt_value);
    const quoted = rawDefault.match(/^'(.*)'$/);
    return quoted ? quoted[1].replace(/''/g, "'") : rawDefault;
  }

  hasMemoryRecordColumn(columnName) {
    return this.memoryRecordColumns.has(columnName);
  }

  getScopeWriteValue(columnName, value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (normalized) {
      return normalized;
    }

    return this.getColumnDefaultValue(columnName);
  }

  async upsertRecord(record) {
    await this.ensureReady();
    const statement = this.db.prepare(`
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json, validated, reusable, sensitivity,
        file_path, relative_path, raw_text, created_at, updated_at,
        project_id, workspace_id, client_id, task_id, conversation_id, visibility, retention_policy
      ) VALUES (
        $memory_id, $target, $title, $content, $evidence, $tags_json, $validated, $reusable, $sensitivity,
        $file_path, $relative_path, $raw_text, $created_at, $updated_at,
        $project_id, $workspace_id, $client_id, $task_id, $conversation_id, $visibility, $retention_policy
      )
      ON CONFLICT(memory_id) DO UPDATE SET
        target = excluded.target,
        title = excluded.title,
        content = excluded.content,
        evidence = excluded.evidence,
        tags_json = excluded.tags_json,
        validated = excluded.validated,
        reusable = excluded.reusable,
        sensitivity = excluded.sensitivity,
        file_path = excluded.file_path,
        relative_path = excluded.relative_path,
        raw_text = excluded.raw_text,
        updated_at = excluded.updated_at,
        project_id = excluded.project_id,
        workspace_id = excluded.workspace_id,
        client_id = excluded.client_id,
        task_id = excluded.task_id,
        conversation_id = excluded.conversation_id,
        visibility = excluded.visibility,
        retention_policy = excluded.retention_policy
    `);

    statement.run({
      $memory_id: record.memoryId,
      $target: record.target,
      $title: record.title,
      $content: record.content,
      $evidence: record.evidence,
      $tags_json: JSON.stringify(record.tags || []),
      $validated: record.validated ? 1 : 0,
      $reusable: record.reusable ? 1 : 0,
      $sensitivity: record.sensitivity || 'none',
      $file_path: record.filePath || null,
      $relative_path: record.relativePath || null,
      $raw_text: record.rawText || null,
      $created_at: record.createdAt || new Date().toISOString(),
      $updated_at: record.updatedAt || record.createdAt || new Date().toISOString(),
      $project_id: this.getScopeWriteValue('project_id', record.projectId),
      $workspace_id: this.getScopeWriteValue('workspace_id', record.workspaceId),
      $client_id: this.getScopeWriteValue('client_id', record.clientId),
      $task_id: record.taskId || null,
      $conversation_id: record.conversationId || null,
      $visibility: this.getScopeWriteValue('visibility', record.visibility),
      $retention_policy: this.getScopeWriteValue('retention_policy', record.retentionPolicy)
    });
  }

  async replaceChunksForRecord(record, chunks = []) {
    await this.ensureReady();
    const deleteStatement = this.db.prepare(`
      DELETE FROM memory_chunks
      WHERE memory_id = ?
        AND (
          embedding_fingerprint = ?
          OR embedding_fingerprint IS NULL
          OR chunk_id GLOB ?
        )
    `);
    const insertStatement = this.db.prepare(`
      INSERT INTO memory_chunks (
        chunk_id, memory_id, target, title, source_file, relative_path, chunk_index,
        text, vector_json, embedding_fingerprint, tags_json, created_at, updated_at
      ) VALUES (
        $chunk_id, $memory_id, $target, $title, $source_file, $relative_path, $chunk_index,
        $text, $vector_json, $embedding_fingerprint, $tags_json, $created_at, $updated_at
      )
    `);

    deleteStatement.run(record.memoryId, this.config.embeddingFingerprint, `${this.config.embeddingFingerprint}:*`);
    for (const chunk of chunks) {
      insertStatement.run({
        $chunk_id: this.getProfileChunkId(chunk.chunkId),
        $memory_id: record.memoryId,
        $target: record.target,
        $title: record.title,
        $source_file: record.filePath || null,
        $relative_path: record.relativePath || null,
        $chunk_index: chunk.chunkIndex,
        $text: chunk.text,
        $vector_json: JSON.stringify(chunk.vector || []),
        $embedding_fingerprint: this.config.embeddingFingerprint,
        $tags_json: JSON.stringify(record.tags || []),
        $created_at: record.createdAt || new Date().toISOString(),
        $updated_at: record.updatedAt || record.createdAt || new Date().toISOString()
      });
    }
  }

  async getRecord(memoryId) {
    await this.ensureReady();
    const row = this.db.prepare(`
      SELECT * FROM memory_records WHERE memory_id = ?
    `).get(memoryId);
    return row ? this.mapRow(row) : null;
  }

  async deleteRecord(memoryId) {
    await this.ensureReady();
    this.db.prepare('DELETE FROM memory_records WHERE memory_id = ?').run(memoryId);
  }

  async listRecords(target = 'both') {
    await this.ensureReady();
    let query = 'SELECT * FROM memory_records ORDER BY updated_at DESC';
    let rows;
    if (target === 'both') {
      rows = this.db.prepare(query).all();
    } else {
      query = 'SELECT * FROM memory_records WHERE target = ? ORDER BY updated_at DESC';
      rows = this.db.prepare(query).all(target);
    }
    return rows.map(row => this.mapRow(row));
  }

  async getRecordsByIds(memoryIds = []) {
    await this.ensureReady();
    const uniqueIds = [...new Set((memoryIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const placeholders = uniqueIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM memory_records WHERE memory_id IN (${placeholders})
    `).all(...uniqueIds);

    return rows.map(row => this.mapRow(row));
  }

  async getRecordsScopeMap(memoryIds = []) {
    await this.ensureReady();
    const uniqueIds = [...new Set((memoryIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    const placeholders = uniqueIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT memory_id, project_id, workspace_id, client_id, visibility
      FROM memory_records WHERE memory_id IN (${placeholders})
    `).all(...uniqueIds);

    const result = new Map();
    for (const row of rows) {
      result.set(row.memory_id, {
        projectId: row.project_id || null,
        workspaceId: row.workspace_id || null,
        clientId: row.client_id || null,
        visibility: row.visibility || null
      });
    }
    return result;
  }

  async getRecordsPolicyMap(memoryIds = []) {
    await this.ensureReady();
    const uniqueIds = [...new Set(memoryIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    this.refreshMemoryRecordColumnInfo();
    const hasStatus = this.hasMemoryRecordColumn('status');
    const placeholders = uniqueIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT memory_id, client_id, visibility${hasStatus ? ', status' : ''}
      FROM memory_records WHERE memory_id IN (${placeholders})
    `).all(...uniqueIds);

    return new Map(rows.map(row => [
      row.memory_id,
      {
        status: hasStatus ? (row.status || 'active') : 'active',
        clientId: row.client_id || null,
        visibility: row.visibility || null
      }
    ]));
  }

  async getRecordsIsolationMap(memoryIds = []) {
    await this.ensureReady();
    const uniqueIds = [...new Set((memoryIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    this.refreshMemoryRecordColumnInfo();
    const hasStatus = this.hasMemoryRecordColumn('status');
    const placeholders = uniqueIds.map(() => '?').join(',');
    const isolationHintSql = buildIsolationHintSql();
    const rows = this.db.prepare(`
      SELECT memory_id, tags_json, project_id, workspace_id, client_id, visibility${hasStatus ? ', status' : ''},
        ${isolationHintSql.expression} AS isolation_family_hints
      FROM memory_records WHERE memory_id IN (${placeholders})
    `).all(...isolationHintSql.params, ...uniqueIds);

    const result = new Map();
    for (const row of rows) {
      let tags = [];
      try {
        tags = JSON.parse(row.tags_json || '[]');
      } catch {
        tags = [];
      }
      const textDerivedFamilies = String(row.isolation_family_hints || '')
        .split('|')
        .map(value => value.trim())
        .filter(Boolean);
      const isolationTags = textDerivedFamilies.map(family => `isolation:${family}`);
      result.set(row.memory_id, {
        memoryId: row.memory_id,
        tags: [...new Set([...(Array.isArray(tags) ? tags : []), ...isolationTags])],
        isolationFamily: textDerivedFamilies[0] || null,
        status: hasStatus ? (row.status || null) : null,
        lifecycleStatus: hasStatus ? (row.status || null) : null,
        projectId: row.project_id || null,
        workspaceId: row.workspace_id || null,
        clientId: row.client_id || null,
        visibility: row.visibility || null
      });
    }
    return result;
  }

  async getRecordsLifecycleStatusMap(memoryIds = []) {
    await this.ensureReady();
    const uniqueIds = [...new Set(memoryIds.filter(Boolean))];
    const result = {
      lifecycleColumnAvailable: false,
      statuses: new Map()
    };
    if (uniqueIds.length === 0) {
      return result;
    }

    this.refreshMemoryRecordColumnInfo();
    if (!this.hasMemoryRecordColumn('status')) {
      return result;
    }

    result.lifecycleColumnAvailable = true;
    const placeholders = uniqueIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT memory_id, status
      FROM memory_records WHERE memory_id IN (${placeholders})
    `).all(...uniqueIds);

    for (const row of rows) {
      result.statuses.set(row.memory_id, row.status || null);
    }
    return result;
  }

  async getRecordValidationPolicy(memoryId) {
    await this.ensureReady();
    this.refreshMemoryRecordColumnInfo();
    const hasStatus = this.hasMemoryRecordColumn('status');
    const row = this.db.prepare(`
      SELECT memory_id, client_id, visibility${hasStatus ? ', status' : ''}
      FROM memory_records WHERE memory_id = ?
    `).get(memoryId);

    if (!row) {
      return {
        exists: false,
        lifecycleColumnAvailable: hasStatus,
        status: null,
        clientId: null,
        visibility: null
      };
    }

    return {
      exists: true,
      lifecycleColumnAvailable: hasStatus,
      status: hasStatus ? (row.status || null) : null,
      clientId: row.client_id || null,
      visibility: row.visibility || null
    };
  }

  async updateLifecycleStatus({
    memoryId,
    fromStatus,
    toStatus,
    updatedAt,
    actorClientId = null,
    reason = null,
    expectedClientId = null,
    expectedVisibility = null
  }) {
    await this.ensureReady();
    this.refreshMemoryRecordColumnInfo();
    if (!this.hasMemoryRecordColumn('status')) {
      return { updated: false, reason: 'missing_status_column' };
    }
    if (!this.hasMemoryRecordColumn('client_id') || !this.hasMemoryRecordColumn('visibility')) {
      return { updated: false, reason: 'missing_policy_guard_column' };
    }

    const assignments = ['status = ?', 'updated_at = ?'];
    const setParams = [toStatus, updatedAt];
    if (this.hasMemoryRecordColumn('lifecycle_updated_at')) {
      assignments.splice(2, 0, 'lifecycle_updated_at = ?');
      setParams.splice(2, 0, updatedAt);
    }
    if (this.hasMemoryRecordColumn('lifecycle_actor_client_id')) {
      assignments.splice(assignments.length, 0, 'lifecycle_actor_client_id = ?');
      setParams.push(actorClientId);
    }
    if (this.hasMemoryRecordColumn('status_reason')) {
      assignments.splice(assignments.length, 0, 'status_reason = ?');
      setParams.push(reason);
    }

    const whereClauses = ['memory_id = ?', 'status = ?'];
    const whereParams = [memoryId, fromStatus];
    const addExpectedGuard = (columnName, expectedValue) => {
      const normalized = typeof expectedValue === 'string' ? expectedValue.trim() : '';
      if (!normalized) {
        whereClauses.push(`(${columnName} IS NULL OR ${columnName} = '')`);
        return;
      }
      whereClauses.push(`${columnName} = ?`);
      whereParams.push(normalized);
    };

    addExpectedGuard('client_id', expectedClientId);
    addExpectedGuard('visibility', expectedVisibility);

    const result = this.db.prepare(`
      UPDATE memory_records
      SET ${assignments.join(', ')}
      WHERE ${whereClauses.join(' AND ')}
    `).run(...setParams, ...whereParams);

    return {
      updated: result.changes === 1,
      changes: result.changes
    };
  }

  normalizePathFilters(raw) {
    const values = Array.isArray(raw) ? raw : [];
    return [...new Set(values
      .map(item => String(item || '').trim().toLowerCase().replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
      .filter(Boolean))];
  }

  buildPathSegmentPatterns(value) {
    return [...new Set([
      value,
      `${value}/%`,
      `%/${value}`,
      `%/${value}/%`
    ])];
  }

  buildPathMatchClause(values = [], mode = 'any') {
    const normalized = this.normalizePathFilters(values);
    if (normalized.length === 0) {
      return { clause: '', params: [] };
    }

    const pathExpression = "lower(replace(coalesce(relative_path, source_file, ''), char(92), '/'))";
    const groupJoiner = mode === 'all' ? ' AND ' : ' OR ';
    const groups = [];
    const params = [];

    for (const value of normalized) {
      const patterns = this.buildPathSegmentPatterns(value);
      groups.push(`(${patterns.map(() => `${pathExpression} LIKE ?`).join(' OR ')})`);
      params.push(...patterns);
    }

    return {
      clause: `(${groups.join(groupJoiner)})`,
      params
    };
  }

  buildPathGroupClause(groups = []) {
    const normalizedGroups = Array.isArray(groups)
      ? groups.filter(group => group && typeof group === 'object')
      : [];
    const groupClauses = [];
    const params = [];

    for (const group of normalizedGroups) {
      const allFilter = this.buildPathMatchClause(group.allIncludes ?? group.all, 'all');
      const anyFilter = this.buildPathMatchClause(group.anyIncludes ?? group.any, 'any');
      const parts = [];

      if (allFilter.clause) {
        parts.push(allFilter.clause);
        params.push(...allFilter.params);
      }

      if (anyFilter.clause) {
        parts.push(anyFilter.clause);
        params.push(...anyFilter.params);
      }

      if (parts.length > 0) {
        groupClauses.push(`(${parts.join(' AND ')})`);
      }
    }

    return {
      clause: groupClauses.length > 0 ? `(${groupClauses.join(' OR ')})` : '',
      params
    };
  }

  buildChunkQuery(target = 'both', filters = {}) {
    const where = ['embedding_fingerprint = ?'];
    const params = [this.config.embeddingFingerprint];

    if (target !== 'both') {
      where.push('target = ?');
      params.push(target);
    }

    const groupedPathFilter = this.buildPathGroupClause(filters.relativePathGroups);
    if (groupedPathFilter.clause) {
      where.push(groupedPathFilter.clause);
      params.push(...groupedPathFilter.params);
    } else {
      const anyPathFilter = this.buildPathMatchClause(
        filters.relativePathAnyIncludes ?? filters.relativePathIncludes,
        'any'
      );
      if (anyPathFilter.clause) {
        where.push(anyPathFilter.clause);
        params.push(...anyPathFilter.params);
      }

      const allPathFilter = this.buildPathMatchClause(filters.relativePathAllIncludes, 'all');
      if (allPathFilter.clause) {
        where.push(allPathFilter.clause);
        params.push(...allPathFilter.params);
      }
    }

    const excludedPathFilter = this.buildPathMatchClause(filters.relativePathExcludes, 'any');
    if (excludedPathFilter.clause) {
      where.push(`NOT ${excludedPathFilter.clause}`);
      params.push(...excludedPathFilter.params);
    }

    const recordScopeClauses = [];
    const recordScopeParams = [];
    if (filters.projectId) {
      recordScopeClauses.push('mr.project_id = ?');
      recordScopeParams.push(filters.projectId);
    }
    if (filters.workspaceId) {
      recordScopeClauses.push('mr.workspace_id = ?');
      recordScopeParams.push(filters.workspaceId);
    }
    if (filters.clientId) {
      recordScopeClauses.push('mr.client_id = ?');
      recordScopeParams.push(filters.clientId);
    }
    const visibilityValues = Array.isArray(filters.visibility)
      ? filters.visibility.map(value => String(value || '').trim()).filter(Boolean)
      : [];
    if (visibilityValues.length > 0) {
      recordScopeClauses.push(`mr.visibility IN (${visibilityValues.map(() => '?').join(',')})`);
      recordScopeParams.push(...visibilityValues);
    }
    if (recordScopeClauses.length > 0) {
      where.push(`EXISTS (
        SELECT 1 FROM memory_records mr
        WHERE mr.memory_id = memory_chunks.memory_id
          AND ${recordScopeClauses.join(' AND ')}
      )`);
      params.push(...recordScopeParams);
    }

    const sql = [
      'SELECT * FROM memory_chunks',
      where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
      'ORDER BY updated_at DESC, chunk_index ASC'
    ].filter(Boolean).join(' ');

    return { sql, params };
  }

  async listChunks(target = 'both', filters = {}) {
    await this.ensureReady();
    const { sql, params } = this.buildChunkQuery(target, filters);
    const rows = this.db.prepare(sql).all(...params);

    return rows.map(row => this.mapChunkRow(row));
  }

  async getChunksByRelativePaths(relativePaths = []) {
    await this.ensureReady();
    const uniquePaths = [...new Set((relativePaths || []).filter(Boolean))];
    if (uniquePaths.length === 0) return [];

    const placeholders = uniquePaths.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM memory_chunks
      WHERE embedding_fingerprint = ? AND relative_path IN (${placeholders})
      ORDER BY updated_at DESC, chunk_index ASC
    `).all(this.config.embeddingFingerprint, ...uniquePaths);

    return rows.map(row => this.mapChunkRow(row));
  }

  getProfileChunkId(chunkId) {
    return `${this.config.embeddingFingerprint}:${chunkId}`;
  }

  async countChunksForRecord(memoryId, { currentFingerprintOnly = true } = {}) {
    await this.ensureReady();
    if (currentFingerprintOnly) {
      return this.db.prepare(`
        SELECT COUNT(*) AS count FROM memory_chunks WHERE memory_id = ? AND embedding_fingerprint = ?
      `).get(memoryId, this.config.embeddingFingerprint).count;
    }

    return this.db.prepare('SELECT COUNT(*) AS count FROM memory_chunks WHERE memory_id = ?')
      .get(memoryId).count;
  }

  async listChunksByTimeRanges(target = 'both', ranges = [], filters = {}) {
    const chunks = await this.listChunks(target, filters);
    if (!Array.isArray(ranges) || ranges.length === 0) {
      return chunks;
    }

    return chunks.filter(chunk => {
      const createdTime = new Date(chunk.createdAt || 0).getTime();
      if (!Number.isFinite(createdTime) || createdTime <= 0) return false;
      return ranges.some(range => createdTime >= range.start.getTime() && createdTime <= range.end.getTime());
    });
  }

  async enqueueReconcileTask(task) {
    await this.ensureReady();
    this.db.prepare(`
      INSERT INTO reconcile_queue (memory_id, store_kind, reason, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      task.memoryId || null,
      task.storeKind,
      task.reason,
      JSON.stringify(task.payload || {}),
      task.createdAt || new Date().toISOString()
    );
  }

  async clearReconcileTasks(memoryId, storeKind = null) {
    await this.ensureReady();
    if (storeKind) {
      this.db.prepare('DELETE FROM reconcile_queue WHERE memory_id = ? AND store_kind = ?').run(memoryId, storeKind);
      return;
    }

    this.db.prepare('DELETE FROM reconcile_queue WHERE memory_id = ?').run(memoryId);
  }

  async listReconcileTasks(limit = 50) {
    await this.ensureReady();
    return this.db.prepare(`
      SELECT * FROM reconcile_queue ORDER BY created_at ASC LIMIT ?
    `).all(limit).map(row => ({
      id: row.id,
      memoryId: row.memory_id,
      storeKind: row.store_kind,
      reason: row.reason,
      payload: JSON.parse(row.payload_json || '{}'),
      createdAt: row.created_at
    }));
  }

  async getHealth() {
    await this.ensureReady();
    const recordCount = this.db.prepare('SELECT COUNT(*) AS count FROM memory_records').get().count;
    const chunkCount = this.db.prepare('SELECT COUNT(*) AS count FROM memory_chunks WHERE embedding_fingerprint = ?')
      .get(this.config.embeddingFingerprint).count;
    const totalChunkCount = this.db.prepare('SELECT COUNT(*) AS count FROM memory_chunks').get().count;
    const reconcileCount = this.db.prepare('SELECT COUNT(*) AS count FROM reconcile_queue').get().count;
    return {
      available: true,
      dbPath: this.config.dbPath,
      embeddingFingerprint: this.config.embeddingFingerprint,
      recordCount,
      chunkCount,
      totalChunkCount,
      reconcileCount
    };
  }

  async close() {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }

  mapRow(row) {
    return {
      memoryId: row.memory_id,
      target: row.target,
      title: row.title,
      content: row.content,
      evidence: row.evidence,
      tags: JSON.parse(row.tags_json || '[]'),
      validated: !!row.validated,
      reusable: !!row.reusable,
      sensitivity: row.sensitivity,
      filePath: row.file_path,
      relativePath: row.relative_path,
      rawText: row.raw_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      projectId: row.project_id || null,
      workspaceId: row.workspace_id || null,
      clientId: row.client_id || null,
      taskId: row.task_id || null,
      conversationId: row.conversation_id || null,
      visibility: row.visibility || null,
      status: Object.prototype.hasOwnProperty.call(row, 'status') ? (row.status || null) : null,
      retentionPolicy: row.retention_policy || null
    };
  }

  mapChunkRow(row) {
    return {
      chunkId: row.chunk_id,
      memoryId: row.memory_id,
      target: row.target,
      title: row.title,
      filePath: row.source_file,
      relativePath: row.relative_path,
      chunkIndex: row.chunk_index,
      text: row.text,
      vector: JSON.parse(row.vector_json || '[]'),
      embeddingFingerprint: row.embedding_fingerprint || null,
      tags: JSON.parse(row.tags_json || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = {
  SqliteShadowStore
};
