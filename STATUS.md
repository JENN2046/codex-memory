# codex-memory Status

更新时间：2026-05-17

## 当前结论

- `codex-memory` 已是可用的本地 `vcp_codex_memory` runtime：HTTP/stdio MCP、`record_memory` / `search_memory` / `memory_overview`、SQLite shadow store、vector index、audit、active-memory compatibility、DeepMemo / TopicMemo、compare / rollback / gate / observe 工具链均已存在。
- 当前远端基线：`origin/main` = `3e3f76d fix: harden local http and governance redaction`。
- 当前本地基线：`main` ahead `origin/main` by local CM-0307 `408a92c`, CM-0308 `d1f48c2`, and CM-0309 `cb7d1ef`。
- 最新已推送完成：P35.1 governed memory policy gate fixture contract、P35 post-push board reconciliation、P35 security hardening 均已推送到 `3e3f76d`。
- 最新上下文维护：CM-0301 已把活动 `.agent_board/CHECKPOINT.md` / `.agent_board/HANDOFF.md` 压缩为当前摘要，完整旧版保留在 `.agent_board/archive/`。
- 当前任务：P38 Recall Isolation Fixtures，本地 synthetic fixture-only recall 隔离矩阵。

## 当前阻塞

- v1.0 RC 仍是 `NOT_READY_BLOCKED`。
- schema/version runtime enforcement still required。
- ValidationAggregator full implementation still incomplete。
- final RC matrix runner still incomplete / not executed。
- Governance review/runtime execution、durable audit/memory write、public MCP expansion、migration/import-export apply、backup/restore、provider/model call、service/watchdog/startup install、Codex/Claude config switch、push/tag/release/deploy 都仍是 A5 hard stop，除非用户单独明确授权。

## 当前优先级

1. 完成 P38 recall isolation fixtures，证明治理记录、validation transcripts、redaction samples、policy decisions、blocked/tombstoned/out-of-scope memory 不进入普通 recall/candidate/ranking/projection/audit summary。
2. 继续 P39 synthetic migration dry-run contract，保持 synthetic fixtures 或 sanitized metadata only。
3. P38/P39 不得连接真实 memory、vector/candidate/diary runtime path 或声称 runtime-ready。

## 主要事实源

- Current operation state: [.agent_board/RUN_STATE.md](/A:/codex-memory/.agent_board/RUN_STATE.md)
- Current handoff: [.agent_board/HANDOFF.md](/A:/codex-memory/.agent_board/HANDOFF.md)
- Task queue: [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
- Validation ledger: [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)
- Next phase plan: [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
- Maintenance backlog: [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)

## Archive

- Full pre-compression status document: [docs/archive/STATUS_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/STATUS_FULL_PRE_CM0302.md)
