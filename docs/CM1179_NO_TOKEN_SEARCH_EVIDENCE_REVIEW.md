# CM-1179 No-Token Search Evidence Review

Date: 2026-05-26

Status: `CM1179_NO_TOKEN_SEARCH_EVIDENCE_REVIEW_BLOCKER_DOWNGRADED_NOT_RELIABLE_NOT_READY`

Reviewed evidence:

- `CM-1177` readonly/syncing search semantic split, local commit `1c756b9`.
- `CM-1178` no-token raw content read closure, local commit `d50b76e`.
- Post-commit board reconciliation, local commit `e4d4907`.

## Scope

This review consumes the committed CM-1177 and CM-1178 source/test/docs evidence.

It does not execute live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl`, does not call providers, does not write durable memory or audit state, does not expand public MCP, does not change config/watchdog/startup/package state, and does not claim readiness or reliability.

## Evidence Reviewed

| Required evidence | Reviewed evidence | Result |
|---|---|---|
| readonly no-token search avoids sync | CM-1177 regression fails if no-token HTTP `search_memory` calls `KnowledgeBaseSyncService.syncTarget(...)`. | accepted |
| readonly no-token search avoids candidate-cache metadata reads/writes | CM-1177 changed `CandidateGenerator.generate(...)` so `readOnly=true` bypasses candidate cache get/set; regression fails on candidate cache get or set. | accepted |
| readonly no-token search avoids recall/read-policy audit writes | CM-1177 no-token regression fails on recall audit and read-policy audit calls. | accepted |
| readonly no-token search avoids provider/cache side effects | CM-1177 no-token regressions fail on embedding-cache flush, external embedding provider, and external rerank provider calls. | accepted |
| authorized syncing search preserved | CM-1177 phase-B regression still proves authorized syncing search can sync, cache, and audit. | accepted |
| no-token raw content request blocked | CM-1178 rejects no-token HTTP JSON-RPC `search_memory` when `arguments.include_content === true`, returning HTTP `403` before tool execution. | accepted |
| public MCP contract remains frozen | CM-1177 and CM-1178 do not add public tools or schemas; public tools remain `record_memory`, `search_memory`, and `memory_overview`. | accepted |
| validation evidence | CM-1177 passed targeted `33/33` plus full `npm test` `2786/2786`; CM-1178 passed targeted `18/18`, adjacent `35/35`, docs/ledger/diff checks, and full `npm test` `2787/2787`. | accepted |
| no overclaim boundary | Both records explicitly reject production readiness, runtime readiness, recall reliability, and write reliability claims. | accepted |

## Downgrade

Allowed narrow downgrade:

- The no-token HTTP `search_memory` side-effect/raw-content blocker is downgraded for the covered public HTTP no-token search path.
- Within that path, current local evidence shows no-token `search_memory` stays readonly for sync/cache/audit/provider/cache-flush behavior.
- Within that path, no-token callers cannot request raw memory content through `include_content=true`; the HTTP boundary rejects before tool execution.

Still blocked:

- `memory recall reliable` is not claimed.
- `memory write reliable` is not claimed.
- Runtime ready, RC ready, production ready, release ready, and cutover ready are not claimed.
- Full no-token governance closure is not claimed.
- No-token `memory_overview` selected-output posture still needs a separate review.
- Broad corpus quality, broad query-family coverage, live recall quality, long-run freshness behavior, provider-backed quality, VCP full parity, startup recovery, and SQLite schema startup hard stop remain unproven.

## Decision

`CM1179_NO_TOKEN_SEARCH_EVIDENCE_REVIEW_BLOCKER_DOWNGRADED_NOT_RELIABLE_NOT_READY`

This review supports only a narrow downgrade for the no-token HTTP `search_memory` side-effect/raw-content blocker. It does not convert CM-1177 or CM-1178 into readiness, reliability, or broad governance evidence.
