# Client Scope — Schema Extension Design

更新时间：2026-05-08

## 目的

这是 I-002a 设计成果，基于 [CLIENT_SCOPE_MODEL.md](/A:/codex-memory/CLIENT_SCOPE_MODEL.md) 定义 client scope 的 SQLite schema 扩展方案。只定义 schema，不改真实数据库。

## 1. 与 H-002a 的关系

[H-002a](/A:/codex-memory/docs/PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md) 设计了 governance 列（status、scope、confidence、provenance、superseded_by、supersedes、tombstone_reason）。

本文档定义 client scope 列。两批列应合并为一次 migration，避免多次 ALTER TABLE。

合并后的完整 migration 包含 **H-002a 的 7 列 + I-002a 的 7 列 = 14 新列**。

## 2. 新增列

```sql
ALTER TABLE memory_records ADD COLUMN client_id TEXT NOT NULL DEFAULT 'codex';
ALTER TABLE memory_records ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '';
ALTER TABLE memory_records ADD COLUMN project_id TEXT NOT NULL DEFAULT 'codex-memory';
ALTER TABLE memory_records ADD COLUMN task_id TEXT;
ALTER TABLE memory_records ADD COLUMN conversation_id TEXT;
ALTER TABLE memory_records ADD COLUMN visibility TEXT NOT NULL DEFAULT 'project';
ALTER TABLE memory_records ADD COLUMN retention_policy TEXT NOT NULL DEFAULT 'permanent';
```

新增索引：

```sql
CREATE INDEX IF NOT EXISTS idx_memory_records_client ON memory_records(client_id);
CREATE INDEX IF NOT EXISTS idx_memory_records_project ON memory_records(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_records_visibility ON memory_records(visibility);
```

## 3. 字段语义

### 3.1 `client_id`

写入记录的 client 标识。

```text
codex      Codex Desktop / MCP 写入
claude     Claude Code / Desktop 写入
omc        OMC orchestration 写入
manual     用户手动写入
```

默认 `codex`（当前唯一 writer），`NOT NULL`。

### 3.2 `workspace_id`

工作区标识。

```text
格式: 自由文本，稳定标识一个工作目录
示例: "A:\\codex-memory"、"/home/user/project"
```

默认空字符串（当前不追踪 workspace）。

### 3.3 `project_id`

项目标识。

```text
格式: 项目名或 slug
示例: "codex-memory"、"VCPToolBox"
```

默认 `codex-memory`（从 git remote 推断）。

### 3.4 `task_id`

关联的任务或 issue。

```text
格式: 任务 ID 字符串
示例: "M-001"、"CM-0031"、"issue-42"
```

`NULL` = 不关联特定任务。checkpoint/handoff memory 应填写。

### 3.5 `conversation_id`

关联的对话 session。

```text
格式: session UUID 或标识
示例: "session-2026-05-08-abc123"
```

`NULL` = 不关联特定 conversation。

### 3.6 `visibility`

控制其他 client 的可见性。

```text
private     仅写入 client 可见
workspace   同 workspace 内所有 client 可见
project     同 project 内所有 client 可见（默认）
shared      所有 client 可见
```

检索时默认 filter：`visibility IN ('project', 'shared')`。

### 3.7 `retention_policy`

保留策略。

```text
permanent   不自动删除（默认）
session     conversation 结束时标记 stale
task        task 完成时标记 stale
project     project 归档时标记 stale
ttl:<N><u>  N 时间单位后标记 stale（u=d 天/w 周/m 月）
```

`retention_policy` 是 metadata，不自动触发删除。staleness 由后续 `review_memory` 或 cron 处理。

## 4. 完整目标 schema（合并 H-002a + I-002a）

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
  -- H-002a governance
  status           TEXT NOT NULL DEFAULT 'active',
  scope            TEXT NOT NULL DEFAULT 'project:codex-memory',
  confidence       REAL NOT NULL DEFAULT 1.0,
  provenance       TEXT NOT NULL DEFAULT '',
  superseded_by    TEXT,
  supersedes       TEXT,
  tombstone_reason TEXT,
  -- I-002a client scope
  client_id        TEXT NOT NULL DEFAULT 'codex',
  workspace_id     TEXT NOT NULL DEFAULT '',
  project_id       TEXT NOT NULL DEFAULT 'codex-memory',
  task_id          TEXT,
  conversation_id  TEXT,
  visibility       TEXT NOT NULL DEFAULT 'project',
  retention_policy TEXT NOT NULL DEFAULT 'permanent',
  -- 原有
  file_path        TEXT,
  relative_path    TEXT,
  raw_text         TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
```

从 14 列 → 28 列。

## 5. 向后兼容

### 5.1 现有数据回填

```text
client_id        = 'codex'          — 所有现有 memory 均由 Codex 写入
workspace_id     = ''               — 不追踪
project_id       = 'codex-memory'   — 本项目
task_id          = NULL             — 不关联
conversation_id  = NULL             — 不关联
visibility       = 'project'        — 项目内可见
retention_policy = 'permanent'      — 不自动删除
```

### 5.2 现有代码影响

- `record_memory`: 新增 `client_id` 自动检测（MCP session → 推断 client）
- `search_memory`: 可选 `--scope` filter 参数（不做默认 filter，保持向后兼容）
- `memory_overview`: 新增 visibility/retention/client 分布汇总
- 所有写入默认 `client_id = 'codex'`，Claude 写入需显式声明

## 6. 后续步骤

| Step | 内容 | 类型 | 依赖 |
|------|------|------|------|
| I-002a | 本文件 | docs | 无 |
| I-002b | scope schema dry-run（含入 H-002b 合并迁移） | dry-run | H-002b dry-run 结果 |
| I-002c | 真实 migration + scope filter 实现 | runtime（A2） | H-002c 授权 |

## 7. 不做

- `workspace_id` 自动发现（不在 schema 层做，由 application 层推断）
- `retention_policy` 自动过期（后续 cron/review 任务）
- visibility enforcement in `search_memory`（先加字段，enforcement 后续实现）
- conversation_id 自动关联 MCP session（先加字段，关联逻辑后续实现）
