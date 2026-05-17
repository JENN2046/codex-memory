# CHECKPOINT.md - codex-memory

## Current Goal

P51-P62 Runtime-Enforced Governed Memory Spine Completion.

## Current Area

P10 observability/admin no-touch / no-leak / redaction long-term regression.

## Current Status

- Last pushed baseline: `1ae4286 test: harden no-touch redaction regressions` on `origin/main`.
- Local `main` is ahead of `origin/main`; push is not authorized.
- P51-T1 through P56-T1 are locally committed through `a31ff3a`.
- P56-T2 governance loop explicit-input helper is implemented, validated, and committed locally in `f69fbbb`.
- P56-T2 post-commit board reconciliation is locally committed in `12e6666`.
- P57-T1 recall isolation runtime proof boundary inventory is implemented, validated, and committed locally in `c89a772`.
- P57-T1 post-commit board reconciliation is locally committed in `19ad34b`.
- P57-T2 recall isolation runtime proof explicit-input evaluator is implemented, validated, and committed locally in `6f29757`.
- P57-T2 post-commit board reconciliation is locally committed in `c337ab4`.
- P58-T1 migration/import-export/backup-restore approval framework boundary inventory is implemented, validated, and committed locally in `5326169` as docs/fixture/test only.
- P58-T1 post-commit board reconciliation is locally committed in `14ba9ce`.
- P58-T2 approval framework explicit-input helper is implemented, validated, and committed locally in `2470634`.
- P58-T2 post-commit board reconciliation is locally committed in `0092189`.
- P59-T1 HTTP runtime observability / operation hardening boundary inventory is implemented, validated, and committed locally in `c57be03` as docs/fixture/test only.
- P59-T1 post-commit board reconciliation is locally committed in `46fd98e`.
- P59-T2 HTTP observability explicit-input evidence helper is implemented, validated, and committed locally in `a036c8d`.
- P59-T2 post-commit board reconciliation is locally committed in `3206a0f`.
- P60-T1 no-touch / no-leak / redaction long-term regression is implemented and validated locally.
- v1.0 RC remains `NOT_READY_BLOCKED`.
- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.

## P60-T1 Evidence

- Added `tests/p60-no-touch-no-leak-redaction-regression.test.js`.
- The regression locks centralized helper redaction through `src/core/SensitiveFragmentRedaction.js`.
- The redaction corpus covers authorization/bearer headers, API keys, providerapikey, workspace_id/raw_workspace_id, set-cookie, token, password, URLs, `.env` files, and absolute paths.
- The helper source targets must not import fs/child_process/network/runtime-store APIs or introduce execution/durable-write calls.
- It is test-only and keeps runtime/service/provider/config/deploy operation, public MCP expansion, final RC readiness, and v1 RC readiness blocked.

## Validation

- `node --check tests\p60-no-touch-no-leak-redaction-regression.test.js`
- Targeted P60/no-touch/sensitive-redaction test (`8/8`)
- `npm test` (`1011/1011`)

## Active Boundaries

- No real memory content read, preview, export, import, or scan.
- No diary, SQLite, vector, candidate cache, or recall-audit scan.
- No provider/model call.
- No service/watchdog/startup install.
- No Codex/Claude config switch.
- No public MCP expansion.
- No `.env` or secret edit.
- No dependency change.
- No durable memory/audit write or runtime mutation.
- No SQLite migration apply, import/export apply, backup/restore apply.
- No push/tag/release/deploy unless explicitly authorized.

## Next Safe Step

Run final diff/docs validation for P60-T1 board/status updates, create a guarded local commit if scope remains clean, then perform post-commit board reconciliation.
