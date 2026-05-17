# codex-memory Status

更新时间：2026-05-17

## 当前结论

- `codex-memory` 已是可用的本地 `vcp_codex_memory` runtime：HTTP/stdio MCP、`record_memory` / `search_memory` / `memory_overview`、SQLite shadow store、vector index、audit、active-memory compatibility、DeepMemo / TopicMemo、compare / rollback / gate / observe 工具链均已存在。
- 当前远端基线：`origin/main` = `d210947 fix: redact governance helper output`。
- 当前本地基线：`main` 在 `origin/main` 之后已有本地提交 `83bd388`、`9d3ab69`、`b9965f7`、`280ab9b`、`c06436d`、`4d8d11a`、`3d774ad`、`8220d64`、`29858e6`、`c8325b6`。
- 最新本地完成：P35.1 governed memory policy gate fixture contract 已提交在 `c8325b6`。P35.1 只添加 synthetic fixture/test，不实现 runtime policy gate。
- 最新上下文维护：CM-0301 已把活动 `.agent_board/CHECKPOINT.md` / `.agent_board/HANDOFF.md` 压缩为当前摘要，完整旧版保留在 `.agent_board/archive/`。
- 当前任务：post-CM0305 board reconciliation。按用户指示，暂不开启 P35.2 下一轮。

## 当前阻塞

- v1.0 RC 仍是 `NOT_READY_BLOCKED`。
- schema/version runtime enforcement still required。
- ValidationAggregator full implementation still incomplete。
- final RC matrix runner still incomplete / not executed。
- Governance review/runtime execution、durable audit/memory write、public MCP expansion、migration/import-export apply、backup/restore、provider/model call、service/watchdog/startup install、Codex/Claude config switch、push/tag/release/deploy 都仍是 A5 hard stop，除非用户单独明确授权。

## 当前优先级

1. 完成 post-CM0305 board reconciliation，保持 docs/board only。
2. 暂停在 P35.2 explicit-input helper 候选之前，等待用户恢复长期目标循环。
3. 继续 P35+ governed memory spine queue，fixture-first/read-only 优先。

## 主要事实源

- Current operation state: [.agent_board/RUN_STATE.md](/A:/codex-memory/.agent_board/RUN_STATE.md)
- Current handoff: [.agent_board/HANDOFF.md](/A:/codex-memory/.agent_board/HANDOFF.md)
- Task queue: [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
- Validation ledger: [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)
- Next phase plan: [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
- Maintenance backlog: [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)

## Archive

- Full pre-compression status document: [docs/archive/STATUS_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/STATUS_FULL_PRE_CM0302.md)
