# Memory Records Migration — Dry-Run Plan & Evidence

更新时间：2026-05-08

## 目标 Migration

为 `memory_records` 表新增 7 个 governance 列：

```sql
ALTER TABLE memory_records ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE memory_records ADD COLUMN scope TEXT NOT NULL DEFAULT 'project:codex-memory';
ALTER TABLE memory_records ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0;
ALTER TABLE memory_records ADD COLUMN provenance TEXT NOT NULL DEFAULT '';
ALTER TABLE memory_records ADD COLUMN superseded_by TEXT;
ALTER TABLE memory_records ADD COLUMN supersedes TEXT;
ALTER TABLE memory_records ADD COLUMN tombstone_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_memory_records_status ON memory_records(status);
CREATE INDEX IF NOT EXISTS idx_memory_records_scope ON memory_records(scope);
CREATE INDEX IF NOT EXISTS idx_memory_records_superseded_by ON memory_records(superseded_by);
```

## Dry-Run 结果（2026-05-08）

### 环境

- 源数据库：`data/codex-memory.sqlite`（30.6 MB, 428 records, 1255 chunks）
- 副本：`data/codex-memory-migration-dryrun.sqlite`（已删除）

### 结果

| 检查项 | 结果 |
|--------|------|
| 7 列 ALTER TABLE | ✅ 全部成功 |
| 3 索引 CREATE | ✅ 全部成功 |
| 现有 columns 保留 | ✅ 14 列保留 + 7 新增 = 21 列 |
| 默认值回填 | ✅ 428 records: status=active, scope=project:codex-memory, confidence=1.0 |
| superseded_by/supersedes/tombstone_reason | ✅ 全部 NULL（正确） |
| JOIN memory_chunks | ✅ 1232 rows（无变化） |
| SELECT/DISTINCT/GROUP BY/ORDER BY | ✅ 全部正常 |

### 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 现有 CLI 代码不识别新列 | A1 | SQLite 新增列对现有 SELECT * 透明，现有 INSERT 语句使用 DEFAULT |
| DEFAULT 值与现有数据语义不匹配 | A0 | 现有所有 records 都是 active，scope 为 project:codex-memory 合理 |
| migration 中途中断 | A1 | WAL 模式下 SQLite ALTER TABLE 是原子操作（所有 ALTER 在同一事务内或逐条执行） |
| 数据库文件变大 | A0 | 新增 7 列，其中 3 列 NOT NULL 有 DEFAULT 值会立即占用空间，4 列 NULL 不占空间。预估 +2-5 MB |

## 执行前置条件

1. `npm run gate:mainline` 通过
2. 数据库已备份（`cp codex-memory.sqlite codex-memory-pre-migration.sqlite`）
3. HTTP MCP 服务已停止（`codex-memory-http` 不在运行）
4. 所有 CLI 进程已退出

## 推荐回滚方式

```powershell
# 停止服务
# 恢复备份
cp codex-memory-pre-migration.sqlite codex-memory.sqlite
# 重启服务
```

SQLite 不支持 `ALTER TABLE ... DROP COLUMN` 回退（部分版本支持但复杂），因此备份是唯一回滚路径。

## H-002c 决策点

H-002c 需要 Commander 授权以下操作：

1. 停止 HTTP MCP 服务
2. 备份当前数据库
3. 执行 ALTER TABLE migration
4. 重启 HTTP MCP 服务
5. 验证 `npm run gate:mainline`
6. 验证 `npm test`

此文档作为 H-002b 产出物，记录了 dry-run 结果和真实 migration 的路径。
