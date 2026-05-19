# Current Runtime Gap Truth Table

Status: CURRENT_RUNTIME_TRUTH_TABLE
Decision: NOT_READY_BLOCKED
Scope: authoritative current runtime gap dashboard
Local baseline: `765ab1825535c8b66078e50ff43ac519488d25f8`
Remote baseline: must be re-read before push, precheck, release, or cutover-sensitive work

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
4. Refresh `RC_PRECHECK_001` only through exact approval lines; any pass remains precheck evidence, not readiness.

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
