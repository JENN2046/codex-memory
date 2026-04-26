const fs = require('node:fs/promises');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

class SqliteShadowStore {
  constructor(config) {
    this.config = config;
    this.db = null;
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
        updated_at TEXT NOT NULL
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
  }

  async upsertRecord(record) {
    await this.ensureReady();
    const statement = this.db.prepare(`
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json, validated, reusable, sensitivity,
        file_path, relative_path, raw_text, created_at, updated_at
      ) VALUES (
        $memory_id, $target, $title, $content, $evidence, $tags_json, $validated, $reusable, $sensitivity,
        $file_path, $relative_path, $raw_text, $created_at, $updated_at
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
        updated_at = excluded.updated_at
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
      $updated_at: record.updatedAt || record.createdAt || new Date().toISOString()
    });
  }

  async replaceChunksForRecord(record, chunks = []) {
    await this.ensureReady();
    const deleteStatement = this.db.prepare('DELETE FROM memory_chunks WHERE memory_id = ?');
    const insertStatement = this.db.prepare(`
      INSERT INTO memory_chunks (
        chunk_id, memory_id, target, title, source_file, relative_path, chunk_index,
        text, vector_json, tags_json, created_at, updated_at
      ) VALUES (
        $chunk_id, $memory_id, $target, $title, $source_file, $relative_path, $chunk_index,
        $text, $vector_json, $tags_json, $created_at, $updated_at
      )
    `);

    deleteStatement.run(record.memoryId);
    for (const chunk of chunks) {
      insertStatement.run({
        $chunk_id: chunk.chunkId,
        $memory_id: record.memoryId,
        $target: record.target,
        $title: record.title,
        $source_file: record.filePath || null,
        $relative_path: record.relativePath || null,
        $chunk_index: chunk.chunkIndex,
        $text: chunk.text,
        $vector_json: JSON.stringify(chunk.vector || []),
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
    const where = [];
    const params = [];

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
      SELECT * FROM memory_chunks WHERE relative_path IN (${placeholders}) ORDER BY updated_at DESC, chunk_index ASC
    `).all(...uniquePaths);

    return rows.map(row => this.mapChunkRow(row));
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
    const chunkCount = this.db.prepare('SELECT COUNT(*) AS count FROM memory_chunks').get().count;
    const reconcileCount = this.db.prepare('SELECT COUNT(*) AS count FROM reconcile_queue').get().count;
    return {
      available: true,
      dbPath: this.config.dbPath,
      recordCount,
      chunkCount,
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
      updatedAt: row.updated_at
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
      tags: JSON.parse(row.tags_json || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = {
  SqliteShadowStore
};
