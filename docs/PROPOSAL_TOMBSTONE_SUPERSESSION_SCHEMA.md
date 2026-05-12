# Proposal / Tombstone / Supersession — Schema Design

更新时间：2026-05-08

## 目的

这份文档设计 `MEMORY_GOVERNANCE_MODEL.md` 中定义的 proposal、tombstone、supersession 三个 governance 概念的 schema 扩展方案。这是 H-002a 设计成果，只定义 schema，不修改真实数据库。

## 1. 当前 schema 回顾

```sql
-- 现有 memory_records（简化）
CREATE TABLE memory_records (
  memory_id    TEXT PRIMARY KEY,
  target       TEXT NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  evidence     TEXT NOT NULL,
  tags_json    TEXT NOT NULL,       -- JSON array
  validated    INTEGER NOT NULL,    -- 0/1
  reusable     INTEGER NOT NULL,    -- 0/1
  sensitivity  TEXT NOT NULL,       -- 'public'|'internal'|'private'|'sensitive'|'redacted'
  file_path    TEXT,
  relative_path TEXT,
  raw_text     TEXT,
  created_at   TEXT NOT NULL,       -- ISO 8601
  updated_at   TEXT NOT NULL
);
```

### 1.1 缺失的 governance 字段

| 缺失字段 | 作用 | 来自 |
|---------|------|------|
| `status` | active/stale/superseded/tombstoned/archived/proposal/rejected | GOVERNANCE §12 |
| `scope` | user/project/repo/task/domain/ecosystem | GOVERNANCE §6 |
| `confidence` | 0.0-1.0 | POLICY §11 |
| `provenance` | 来源描述 | POLICY §10 |
| `superseded_by` | 替换本 record 的新 record ID | GOVERNANCE §4.1 |
| `supersedes` | 被本 record 替换的旧 record IDs | GOVERNANCE §4.1 |
| `tombstone_reason` | 为何 tombstone | GOVERNANCE §4.1 |

## 2. 设计原则

1. **加字段，不改结构**：不拆表、不加新表
2. **默认值兼容现有数据**：所有新列有安全默认值
3. **先加后补**：先 schema 设计，再 dry-run 回填，再真实 migration
4. **不立刻上线新 MCP tool**

## 3. Schema Extension

### 3.1 新增列

```sql
ALTER TABLE memory_records ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE memory_records ADD COLUMN scope TEXT NOT NULL DEFAULT 'project:codex-memory';
ALTER TABLE memory_records ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0;
ALTER TABLE memory_records ADD COLUMN provenance TEXT NOT NULL DEFAULT '';
ALTER TABLE memory_records ADD COLUMN superseded_by TEXT;    -- NULL = not superseded
ALTER TABLE memory_records ADD COLUMN supersedes TEXT;       -- NULL = not a supersession
ALTER TABLE memory_records ADD COLUMN tombstone_reason TEXT; -- NULL = not tombstoned
```

### 3.2 新增索引

```sql
CREATE INDEX IF NOT EXISTS idx_memory_records_status ON memory_records(status);
CREATE INDEX IF NOT EXISTS idx_memory_records_scope ON memory_records(scope);
CREATE INDEX IF NOT EXISTS idx_memory_records_superseded_by ON memory_records(superseded_by);
```

### 3.3 完整目标 schema

```sql
CREATE TABLE memory_records (
  memory_id        TEXT PRIMARY KEY,
  target           TEXT NOT NULL,
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  evidence         TEXT NOT NULL,
  tags_json        TEXT NOT NULL,
  validated        INTEGER NOT NULL,
  reusable         INTEGER NOT NULL,
  sensitivity      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  scope            TEXT NOT NULL DEFAULT 'project:codex-memory',
  confidence       REAL NOT NULL DEFAULT 1.0,
  provenance       TEXT NOT NULL DEFAULT '',
  superseded_by    TEXT,
  supersedes       TEXT,
  tombstone_reason TEXT,
  file_path        TEXT,
  relative_path    TEXT,
  raw_text         TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
```

## 4. 字段语义

### 4.1 `status`

```text
active      当前可用
stale       可能过期，使用前需验证
superseded  被新 record 替换
tombstoned  已删除，保留审计痕迹
archived    历史归档，不主动检索
proposal    候选 memory，待审查
rejected    已拒绝，保留审计痕迹
```

写入规则：
- 新 record 默认 `active`
- proposal 写入时 `status = 'proposal'`
- 审批通过后 `proposal -> active`
- supersession 发生时 `active -> superseded`
- 删除时 `active -> tombstoned`
- 合并 compaction 时 `active -> archived`

### 4.2 `scope`

```text
格式: <scope_type>:<scope_value>

scope_type:
  project:    项目级（例：project:codex-memory）
  user:       用户级（例：user:JENN2046）
  repo:       仓库级（例：repo:codex-memory）
  task:       任务级（例：task:M-001）
  domain:     领域级（例：domain:memory）
  ecosystem:  生态级（例：ecosystem:VCP）
```

### 4.3 `confidence`

```text
1.0 直接验证的当前事实
0.8 强证据，大概率当前
0.6 合理但可能需要验证
0.4 弱或旧证据
0.2 推测性提案
0.0 已拒绝 / 不可靠
```

### 4.4 `provenance`

自由文本字段，记录 memory 来源：

```text
"user instruction, 2026-05-08"
"git diff A:\codex-memory\src\cli\compare-vcp-active-memory.js"
"agent inference from recall audit, confidence 0.6"
"manual review approved"
```

### 4.5 `superseded_by`

单值 TEXT，指向替换本 record 的 `memory_id`。

`NULL` 表示未被替换。被替换时写入新 record 的 ID。

### 4.6 `supersedes`

单值 TEXT，指向被本 record 替换的 `memory_id`。

`NULL` 表示本 record 不是 supersession。

简化：当前只支持 1:1 supersession。后续可升级为 JSON array 支持 1:N。

### 4.7 `tombstone_reason`

`NULL` 表示未 tombstoned。tombstoned 时写明原因：

```text
"用户请求删除 — 内容过时"
"敏感内容回扫发现 — 已 redact"
"重复 memory — 合并至 <memory_id>"
```

## 5. Proposal Flow 与 Schema

### 5.1 写入 Proposal

```
Codex/Claude 生成 proposal
  → status = 'proposal'
  → confidence = <推断值，通常 0.4-0.6>
  → provenance = 来源描述
  → 其他字段正常填充
```

### 5.2 审查 Proposal

```
search_memory({ status: 'proposal' })
  → 返回所有待审查 proposal
  → Commander 审查
    → approved: UPDATE status = 'active', confidence = 1.0
    → rejected: UPDATE status = 'rejected'
    → duplicate: UPDATE status = 'rejected', tombstone_reason = 'duplicate of <id>'
```

### 5.3 当前不做的

- `propose_memory` MCP tool（proposal 当前直接写入）
- `review_memory` MCP tool（审查通过 SQL 或 CLI 手动操作）
- 自动 proposal 审批

## 6. Supersession Flow 与 Schema

### 6.1 写入 Supersession

```
写新 record:
  → status = 'active'
  → supersedes = '<old_memory_id>'
  → 事务内同时 UPDATE 旧 record: status = 'superseded', superseded_by = '<new_id>'
```

### 6.2 查询 Supersession 链

```sql
-- 找到替换了某条 record 的新 record
SELECT * FROM memory_records WHERE supersedes = '<memory_id>';

-- 找到被某条 record 替换的旧 record
SELECT * FROM memory_records WHERE superseded_by = '<memory_id>';

-- 找到所有未被替换的 active records
SELECT * FROM memory_records WHERE status = 'active' AND superseded_by IS NULL;
```

## 7. Tombstone Flow 与 Schema

### 7.1 Tombstone

```
用户请求删除 record:
  → UPDATE status = 'tombstoned'
  → UPDATE tombstone_reason = '用户请求删除'
  → 内容字段保留（审计）
  → 检索默认排除 tombstoned
```

### 7.2 Hard Delete

```
用户明确要求 hard delete:
  → DELETE FROM memory_records WHERE memory_id = '<id>';
  → 同时在 audit 表记录删除事件
```

hard delete 是极少见的操作，需要 Commander 明确确认。

## 8. 向后兼容

### 8.1 现有数据回填

所有现有 442 records 在 migration 后自动获得默认值：

```sql
-- 回填默认值（migration 执行后生效）
status        = 'active'
scope         = 'project:codex-memory'
confidence    = 1.0
provenance    = ''
superseded_by = NULL
supersedes    = NULL
tombstone_reason = NULL
```

### 8.2 现有代码影响

- `search_memory`: 默认 WHERE status IN ('active', 'stale')
- `record_memory`: 新字段使用 DEFAULT 值
- `memory_overview`: 新增 status/scope 分布汇总
- compare/rollback 不涉及 memory_records 表结构

## 9. Migration Plan

| Step | 内容 | 风险 | 授权 |
|------|------|------|------|
| H-002a | 本文件 — schema 设计 | A0 | 无需 |
| H-002b-1 | dry-run: 在临时 SQLite 副本上跑 ALTER TABLE | A1 | 无需 |
| H-002b-2 | 验证回填结果 + 现有 CLI/tests 不报错 | A1 | 无需 |
| H-002c | 真实 migration: 在 `codex-memory.sqlite` 上执行 ALTER | A2 | 需要 |

## 10. 不做的

- 新建独立的 `proposals` 表（proposal 和 active 共用 memory_records，通过 status 区分）
- 新建独立的 `audit` 表（审计日志当前通过 diary 文件实现，不在 SQLite 内额外建表）
- 支持 1:N supersession（初始只做 1:1，降低复杂度）
- scope 的 foreign key 或 check constraint（scope 格式用约定，不用 schema 强约束）
