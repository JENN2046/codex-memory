# Current Runtime Gap Truth Table

Status: CURRENT_RUNTIME_TRUTH_TABLE
Decision: NOT_READY_BLOCKED
Scope: authoritative current runtime gap dashboard
Local baseline: `47d23345c04f5e15433149620558e87a2fd56c1e`
Remote baseline: `47d23345c04f5e15433149620558e87a2fd56c1e` after CM-0560 search timeout boundary push sync; must be re-read before push, precheck, release, or cutover-sensitive work

## Purpose

This is the single current runtime gap truth table for `codex-memory`.

Use this file as the current execution map for runtime readiness discussions. Older P66/P63/P64/P65 documents remain evidence history and source material, but they are not the current operator map unless this file explicitly references them.

This document is a status table only. It does not execute runtime proofs, start HTTP MCP, call providers, read real memory stores, scan broad runtime data, apply migration/import/export/backup/restore work, write durable memory or audit state, expand public MCP tools, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Current Rule

The project remains `NOT_READY_BLOCKED`.

A row can be treated as complete only when `complete?` is `yes`. Bounded evidence, fixture evidence, static report shape, local helper proof, target-bound gate evidence, endpoint-bound observation, or local runtime hardening does not become runtime readiness unless this table says so.

## Truth Table

| gap | current evidence | runtime touched? | A4/A5 | complete? | next minimal action |
|---|---|---|---|---|---|
| validation aggregator full implementation | Local P66 proof chain plus approved A5-GAP-6 evidence-only aggregation consumed sanitized A5 evidence and kept readiness flags false. Aggregator remains evidence consumer, not full runtime collector. | partial explicit-input aggregation only; no new runtime collector completion | A5 evidence-only aggregation | no | Feed only future separately approved A5 evidence into fail-closed aggregation; do not claim full implementation until runtime collector units exist and are approved. |
| governance review / approval / audit runtime loop | Subject-bound in-memory governance loop, durable audit writer smoke, read-policy audit writer smoke, and read-only governance reports exist as bounded evidence. No durable memory governance write or full production loop completion has been approved. | yes, bounded subject/read-only evidence; no durable memory governance write | A5 bounded evidence | no | Prepare exact approval only if a full governance runtime loop is needed; otherwise keep evidence historical and blocked. |
| recall isolation runtime proof | A4 explicit projection isolation exists; A5 no-mutation scan and sanitized positive-control write/projection proof exist. Broad real-memory isolation and future sample coverage remain incomplete. | yes, bounded approved stores and one sanitized positive-control write | A4 plus A5 bounded evidence | no | If needed, request exact approval for the next bounded recall isolation proof; no broad scan or backfill by default. |
| migration / import / export / backup / restore execution | Fixture-only migration-readiness dry-run evidence exists and remains blocked for real apply/import/export/backup/restore. | fixture-only dry-run; no real data apply | A5 dry-run only | no | Create a separate exact A5 packet naming one real action and one target before any apply/import/export/backup/restore action. |
| live HTTP operation readiness | Endpoint-bound historical HTTP evidence exists for loopback `7605`, with no config/watchdog/startup change. HTTP session TTL/cap/cleanup hardening is completed locally in `16538ea`; closeout recorded in `765ab18`; targeted HTTP tests passed `13/13`. | yes, local runtime hardening only; no fresh observe for current packet target; no config/watchdog/startup change | A4/CM-0550 local hardening plus historical A5 endpoint evidence | no | Future HTTP observe/precheck requires exact approval bound to current target and endpoint. Do not infer production readiness from local hardening alone. |
| current-head strict gate for cutover | Readonly RC_PRECHECK_001 evidence passed at local HEAD `638325a` with strict gate ok, tests `1601/1601`, compare `43/43`, rollback `43/43`, and HTTP observe ok. This is precheck evidence only, not cutover or readiness evidence. | yes for older target-bound gates; not current cutover | A5 target-bound gate evidence | no | For cutover evidence, request separate exact A5 approval; do not infer readiness from readonly precheck pass. |
| RC cutover | No RC cutover, tag, release, deploy, production transition, or readiness transition has been executed. | no | A5 required | no | Execute only after zero open runtime gaps, fresh approved gates, explicit release boundary approval, and final human authorization. |

## Current Minimal Backlog

1. Keep this table as the sole current runtime gap dashboard.
2. Treat `docs/P66_RUNTIME_GAP_TRUTH_TABLE.md` as historical source/evidence detail, not the current map.
3. Treat HTTP session TTL/cap/cleanup as local runtime hardening completed; future HTTP observe/precheck still requires exact approval.
4. Use `docs/RC_PRECHECK_002_PLAN.md` as a planning-only packet; do not execute `RC_PRECHECK_002` without future exact approval naming target and commands.
5. Any precheck pass remains precheck evidence, not readiness.
6. Use `docs/A5_ENABLEMENT_OBSTACLE_CLEARANCE_001.md` as the current A5 startup obstacle map; it does not execute A5 or close runtime gaps.
7. Use `docs/CM-0557_JSONRPC_NO_TOKEN_MUTATION_REJECTION_PLAN.md` as the CM-0557 to CM-0559 repair runway entry point; it does not authorize true `record_memory`, true `search_memory`, real memory scans, durable writes, or readiness claims.
8. Use `docs/CM-0559_SEARCH_MEMORY_TIMEOUT_READONLY_ANALYSIS.md` as the search timeout analysis that recommended CM-0560.
9. Use `docs/CM-0560_SEARCH_MEMORY_TIMEOUT_BOUNDARY.md` as the current local timeout-boundary evidence. CM-0560 controls the client-visible JSON-RPC timeout error shape, but it does not cancel deeper in-flight recall work, does not prove memory recall reliability, and does not change any `complete?` value in this table.

## Hard Boundary

This table does not authorize:

- real memory broad scan
- provider calls
- public MCP expansion
- migration/import/export/backup/restore apply
- config/watchdog/startup changes
- durable memory writes
- push, tag, release, deploy, or RC cutover
- A5-GAP-7
- `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness claims
## RC_PRECHECK_001 Closeout - 2026-05-19

- Result: PRECHECK_PASSED_NOT_RC_READY.
- strict gate ok.
- tests 1601/1601.
- compare 43/43 matched.
- rollback 43/43 rollback-ready.
- HTTP observe ok.
- SQLite ExperimentalWarning noted with successful command exits.
- no provider, no mutation, no durable write, no push.
- Controlling state remains NOT_READY_BLOCKED.

## LOCAL_RC_CANDIDATE_001 - 2026-05-20

- Result: LOCAL_RC_CANDIDATE_001_RECORDED_NOT_RC_READY.
- RC_PRECHECK_001 remains recorded as PRECHECK_PASSED_NOT_RC_READY.
- read-only rollback rehearsal remains recorded as READONLY_ROLLBACK_REHEARSAL_COMPLETED_NOT_READY.
- real rollback remains A5 blocked and requires separate exact approval plus validation plan.
- dogfood may start only as local/scoped/non-release work.
- RC remains NOT_READY_BLOCKED.
- V8 is not implemented.
- VCP full parity is not claimed.
- This local candidate record does not change any `complete?` value in the truth table.

## DOGFOOD_001 Closeout - 2026-05-20

- Result: DOGFOOD_COMPLETED_NOT_RC_READY.
- git status: `main...origin/main [ahead 15]`.
- HEAD: `b2a4cd1`.
- `git diff --check` passed.
- docs validation passed.
- `docs/LOCAL_RC_CANDIDATE_001.md` read confirmed.
- `docs/DOGFOOD_001_LOCAL_SCOPED_NON_RELEASE_PLAN.md` read confirmed.
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` read confirmed.
- forbidden actions all remained `no`.
- final state: NOT_READY_BLOCKED.
- This dogfood closeout does not change any `complete?` value in the truth table.

## DOGFOOD_002 Closeout - 2026-05-20

- Result: DOGFOOD_002_COMPLETED_NOT_RC_READY.
- branch: `main...origin/main [ahead 16]`.
- HEAD: `f4d4097`.
- `git diff --check` passed.
- docs validation passed.
- `STATUS.md` read confirmed.
- `MAINTENANCE_BACKLOG.md` read confirmed.
- `docs/DOGFOOD_001_LOCAL_SCOPED_NON_RELEASE_PLAN.md` read confirmed.
- `docs/LOCAL_RC_CANDIDATE_001.md` read confirmed.
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` read confirmed.
- forbidden actions all remained `no`.
- final state: NOT_READY_BLOCKED.
- This dogfood closeout does not change any `complete?` value in the truth table.

## DOGFOOD_003 HTTP Observe Closeout - 2026-05-20

- Result: DOGFOOD_003_HTTP_OBSERVE_COMPLETED_NOT_RC_READY.
- endpoint: `http://127.0.0.1:7605/health`.
- HTTP status: `200`.
- service: `vcp_codex_memory`.
- auth required: `false`.
- token posture: no-token local loopback observe only.
- `noProvider=true`.
- `mutated=false`.
- `migrationApplied=false`.
- SQLite ExperimentalWarning noted.
- final state: NOT_READY_BLOCKED.
- This dogfood HTTP observe closeout does not change any `complete?` value in the truth table and does not establish runtime, production, cutover, or RC readiness.

## DOGFOOD_004 Compare/Rollback Closeout - 2026-05-20

- Result: DOGFOOD_004_COMPARE_ROLLBACK_COMPLETED_NOT_RC_READY.
- compare: `ok=true`, `43/43 matched`, `0 mismatched`.
- rollback readiness: `ok=true`, `rollbackReady=true`, `43/43 rollback-safe`.
- SQLite ExperimentalWarning noted.
- this was rollback readiness evidence only, not real rollback.
- forbidden actions all remained `no`.
- final state: NOT_READY_BLOCKED.
- This dogfood compare/rollback closeout does not change any `complete?` value in the truth table and does not establish runtime, production, cutover, or RC readiness.

## DOGFOOD_SUMMARY_001 - 2026-05-20

- Result: DOGFOOD_SUMMARY_001_READY_FOR_COMMIT.
- Summary doc: `docs/DOGFOOD_SUMMARY_001.md`.
- DOGFOOD_001 through DOGFOOD_004 are summarized by command, result, evidence, and forbidden-item preservation.
- All four rounds remain `NOT_RC_READY`.
- Controlling state remains NOT_READY_BLOCKED.
- Real rollback remains A5 blocked.
- V8 is not implemented.
- VCP full parity is not claimed.
- This summary does not change any `complete?` value in the truth table.
- This summary does not authorize DOGFOOD_005/006/007, provider calls, real memory scans, durable memory/audit writes, config switch, migration/backup apply, public MCP expansion, push/tag/release/deploy, cutover, real rollback, or readiness claims.

## RC_PRECHECK_002 Planning - 2026-05-20

- Result: RC_PRECHECK_002_PLAN_READY_FOR_COMMIT.
- Plan doc: `docs/RC_PRECHECK_002_PLAN.md`.
- LOCAL_RC_CANDIDATE_CLOSEOUT_ACCEPTED.
- DOGFOOD_001 through DOGFOOD_004 are completed and summarized.
- DOGFOOD_SUMMARY_001 is remote-synced at `c840d06`.
- real rollback remains A5 blocked.
- RC remains NOT_READY_BLOCKED.
- V8 is not implemented.
- Target planning baseline: `c840d060970483295c6bda01068560032eccd148`.
- Future precheck execution must re-read local HEAD, `origin/main`, and remote main and stop on drift unless a new exact approval updates the target.
- This planning record does not change any `complete?` value in the truth table.
- This planning record does not authorize RC_PRECHECK_002 execution, HTTP observe, compare/rollback, provider calls, real memory scans, durable memory/audit writes, config switch, migration/backup apply, public MCP expansion, push/tag/release/deploy, cutover, real rollback, or readiness claims.

## HTTP JSON-RPC Rejection Shape Fix - 2026-05-20

- Result: HTTP_JSONRPC_REJECTION_SHAPE_FIX_PUSHED_NOT_RC_READY.
- Commit: `675895237c96bdebf4718f41c6318dbd5974aebc`.
- no-token `record_memory` mutation rejection now returns a JSON-RPC error envelope instead of a plain JSON `403` body.
- Controlled live MCP validation after local restart observed health 200, JSON-RPC `initialize`, JSON-RPC `tools/list`, JSON-RPC `Forbidden` for no-token `record_memory`, and bounded `search_memory` result in 795 ms.
- This fix does not prove authorized write-path readiness.
- This fix does not close any `complete?` value in the truth table.
- Controlling state remains RC_NOT_READY_BLOCKED.

## A5 Enablement Obstacle Clearance - 2026-05-20

- Result: A5_ENABLEMENT_OBSTACLE_CLEARANCE_001_READY_FOR_COMMIT.
- Note: `docs/A5_ENABLEMENT_OBSTACLE_CLEARANCE_001.md`.
- A5 is narrowed to exact-approval execution units, not a standing always-on mode.
- Recommended next exact A5 unit is `AUTH_WRITE_PATH_VALIDATION_001`.
- This obstacle clearance does not execute provider calls, real memory broad scans, durable memory/audit writes, config switch, migration/backup apply, public MCP expansion, push/tag/release/deploy/cutover, or readiness claims.
- Controlling state remains RC_NOT_READY_BLOCKED.

## CM-0557 JSON-RPC No-Token Mutation Rejection Plan - 2026-05-20

- Result: CM_0557_PLAN_READY_FOR_COMMIT.
- Plan doc: `docs/CM-0557_JSONRPC_NO_TOKEN_MUTATION_REJECTION_PLAN.md`.
- Scope: local repair runway for no-token `record_memory` rejection envelope and `search_memory` timeout read-only analysis.
- `record_memory` no-token rejection should keep HTTP 403 while returning a JSON-RPC error envelope.
- `search_memory` timeout remains an independent read-only chain-analysis item.
- No true `record_memory`, true `search_memory`, `.jsonl` read, real memory scan, durable write/audit write, provider call, config switch, migration/import/export/backup/restore apply, public MCP expansion, package change, push/tag/release/deploy/cutover, or readiness claim is authorized.
- Controlling state remains RC_NOT_READY_BLOCKED.

## CM-0559 Search Timeout Read-Only Analysis - 2026-05-20

- Result: CM_0559_NEEDS_CM0560.
- Analysis doc: `docs/CM-0559_SEARCH_MEMORY_TIMEOUT_READONLY_ANALYSIS.md`.
- Allowed read-only Git and source-pattern inspection completed.
- True `search_memory` was not called.
- `.jsonl` audit files and real memory content were not read.
- Timeout risk zones: app dispatch, recall pipeline, `shadowStore.listChunks`, vector embedding/query path, candidate cache, optional rerank, and recall audit append.
- Write-like side-effect zones: candidate cache set/clear, embedding cache update, recall audit append, and read-policy summary append.
- CM-0560 targeted runtime fix is recommended before any reliability claim.
- Controlling state remains RC_NOT_READY_BLOCKED.
