# P47 Evidence-to-Enforcement Gap Map

Status: local planning evidence only.

This map records the remaining distance between the P36-P46 fixture/helper evidence chain and real runtime enforcement. It is not a runtime implementation plan approval, an RC readiness claim, or an authorization to read real memory content.

## Current Local Evidence

| Area | Local evidence available | Runtime enforcement status |
|---|---|---|
| Scope and A5 boundaries | P36 fixture contracts | Not wired as runtime policy kernel |
| Risk labels | P36 task risk label fixture | Not enforced for live operations |
| Policy decision envelope | P37 synthetic matrix | Not connected to write/read runtime |
| Recall isolation | P38 fixture matrix | Not connected to normal recall, vector, candidate, ranking, projection, or audit runtime |
| Synthetic migration dry-run | P39 fixture contract | Not connected to real migration/import/export/backup/restore |
| Local readiness report | P40 fixture report | Local evidence only; no RC readiness |
| Evidence manifest | P41/P42 manifest fixture and helper | Caller-provided explicit input only |
| Recall/migration isolation helper | P43 helper | Caller-provided explicit input only |
| ValidationAggregator evidence posture | P44 static report shape | Static surface only; no helper/gate/runner execution |
| Final RC matrix evaluator | P45 explicit-input skeleton | Evaluator skeleton only; no runner execution |
| HTTP/redaction boundary | P46 no-token write rejection and shared redaction | Boundary hardening only; no runtime governance mutation |

## Enforcement Gaps

| Gap | Required before enforcement | Current blocker |
|---|---|---|
| Runtime schema/version enforcement | Runtime entrypoints must reject or gate unknown schema/version metadata consistently | `schema_version_runtime_enforcement_incomplete` |
| Policy decision kernel integration | Runtime must consume a versioned decision envelope and preserve allow/deny/require_review semantics | P37 remains synthetic fixture-only |
| Approval execution | Governed actions need explicit approval packets, owners, durable audit intent, and rollback path | A5 hard stop without separate approval |
| Recall isolation runtime | Governance records and validation transcripts must be excluded from normal recall namespaces and caches | P38 is fixture-only; no runtime recall integration |
| Migration/import/export readiness | Dry-run parity and rollback readiness must operate on approved sanitized metadata only before any real content path | P39 is synthetic-only; real content operations remain blocked |
| ValidationAggregator full implementation | Aggregator must consume explicit evidence maps without executing unsafe collection paths | P44 is static posture only |
| Final RC matrix runner | Runner must evaluate explicit evidence without collecting evidence or executing validation commands | P45 is skeleton only; final matrix not executed |
| Observability/report wording | Reports must distinguish local evidence readiness from runtime, RC, push, release, deploy, config, and watchdog readiness | `NOT_READY_BLOCKED` wording must remain visible |

## Required Fail-Closed Semantics

- Missing, unknown, ambiguous, unparsable, skipped, warning-only, stale, or unsupported critical evidence is failure.
- Unsupported source type is rejected from planning and must not be echoed raw if sensitive.
- Caller-provided readiness claims do not override A5 blockers.
- Public MCP surface remains frozen to `record_memory`, `search_memory`, and `memory_overview`.
- Governance records, validation transcripts, redaction samples, policy decisions, and readiness reports must not enter normal user recall namespace.

## Blocked Actions

The following remain A5 hard stops unless separately authorized:

- real memory content read, preview, export, import, or scan
- diary, SQLite, vector, candidate cache, or recall audit scan for this goal
- runtime governance mutation implementation
- SQLite migration apply
- import/export apply
- backup/restore
- provider/model call
- service/watchdog/startup install
- Codex/Claude config switch
- public MCP tool/schema expansion
- dependency/package change
- durable memory/audit write outside existing tests
- push/tag/release/deploy

## Next Safe Slice

P48 should be a fixture/test consistency guard over explicit local evidence identifiers, source types, schema/policy versions, blocked actions, and fail-closed states. It should not connect runtime, read real memory, execute helpers, collect evidence, or claim RC readiness.
