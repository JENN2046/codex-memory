# Memory Recall Reliability Bounded Evidence Plan

Status: `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_PLAN_COMPLETED_NOT_READY`
Date: 2026-05-22
Scope: first-stage plan and evidence design only
Baseline: `93b2be92ae5f3198cc7773fcf2df16ded9ccbeaf`
Remote sync closeout: `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_PLAN_COMPLETED_SYNCED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

This plan defines a bounded evidence packet for the remaining `memory recall reliable` blocker. It does not execute recall validation, does not read real memory content, and does not claim memory recall reliability.

The intended next execution, if separately approved, must use synthetic fixture data, a sandbox store, or a temporary workspace that contains no real memory content. Evidence may prove only bounded fixture/sandbox recall behavior unless a future exact approval explicitly names a stronger target and its side-effect budget.

## Preconditions

- `V1_MAINLINE_CANDIDATE_PACKAGE_REVIEW_COMPLETED_SYNCED_NOT_READY` has been recorded.
- The selected runtime/readiness gap is `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_BATCH`.
- `RC_NOT_READY_BLOCKED` remains the controlling project state.
- `memory write reliable`, `memory recall reliable`, runtime ready, RC ready, production ready, V8 implementation, and VCP full parity are not claimed.

## Current Slice

This first slice is docs/board/status/truth-table planning only.

Allowed current-slice commands:

- `git status -sb`
- `git log --oneline --decorate -n 20`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Current-slice forbidden actions:

- Reading real memory content.
- Reading `.jsonl` audit or durable memory content.
- Running true live `search_memory` against the real store.
- Calling providers.
- Broad real memory scan.
- Durable memory write or durable audit write.
- Migration, import, export, backup, restore, or apply.
- Public MCP expansion.
- Config, watchdog, or startup change.
- Package or lockfile change.
- Tag, release, deploy, cutover, or readiness claim.

## Future Bounded Evidence Command Candidates

A future execution packet must name exact commands before running them. Acceptable command families are limited to fixture/sandbox/local temporary workspace validation, for example:

- `node --check <future fixture/sandbox helper>`
- `node --test <future fixture/sandbox test>`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

The future packet must not use placeholder commands as authorization. It must bind exact paths, query count, timeout, temp workspace location, output file policy, and cleanup expectation before execution.

## Evidence Output Shape

Future bounded evidence should produce sanitized structured output with at least these fields:

```json
{
  "taskId": "MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_BATCH",
  "baseline": "<git-head>",
  "evidenceClass": "fixture_or_sandbox_bounded_recall",
  "usesRealMemoryContent": false,
  "readsJsonlAudit": false,
  "trueSearchMemoryAgainstRealStore": false,
  "providerCalls": 0,
  "durableMemoryWrites": 0,
  "durableAuditWrites": 0,
  "queryCount": "<bounded-number>",
  "fixtureRecords": "<bounded-number>",
  "sanitizedResultCount": "<bounded-number>",
  "matchedExpectedSyntheticIds": true,
  "rawContentOutput": false,
  "readinessClaimAllowed": false,
  "decision": "BOUNDED_FIXTURE_RECALL_EVIDENCE_ACCEPTED_NOT_READY"
}
```

Raw memory text, raw private data, raw audit content, provider payloads, and unbounded result dumps are not allowed in the evidence output.

## Exclusion Rules

### Real Memory Exclusion

The future execution must not read the real memory store, real diary, real audit `.jsonl`, broad runtime data, or raw recall audit content. Any fixture/sandbox data must be synthetic, bounded, and created inside an explicitly named temp workspace or tracked fixture.

### Provider Exclusion

Provider calls are excluded. Embedding and rerank behavior must be local fixture logic, local hash behavior, or disabled in the future packet. Any external provider configuration, token use, remote embedding, or remote rerank attempt fails the packet.

### Durable Write Exclusion

The future execution must not write durable memory or durable audit state. It may use tracked fixtures or disposable temp workspace files only if the exact future packet names them. Any write to the real memory store, real diary, real recall audit, real write audit, real vector index, or production-like runtime data fails the packet.

## Pass Criteria

A future execution can be accepted only if all are true:

- Commands and target paths were exact before execution.
- Evidence used only synthetic fixture data, sandbox data, or a temporary workspace with no real memory content.
- Query count, fixture record count, and timeout were bounded.
- Expected synthetic IDs were matched without emitting raw memory content.
- Provider calls were `0`.
- Real memory reads were `0`.
- Durable memory writes were `0`.
- Durable audit writes were `0`.
- No public MCP surface changed.
- `git diff --check` passed.
- Required docs/status/board validation passed if docs/board were updated.
- Output wording did not claim memory recall reliability or readiness.

## Fail Criteria

The packet must fail closed if any are true:

- Real memory content is read.
- `.jsonl` audit or durable memory content is read.
- True live `search_memory` runs against the real store.
- Provider call is attempted.
- Durable memory or durable audit write is attempted.
- Query, record, output, or time budget is unbounded.
- Raw memory content or private data appears in output.
- Source/test/package/config changes appear outside a future exact scope.
- Public MCP expansion, migration/import/export/backup/restore apply, tag, release, deploy, cutover, or readiness wording appears.
- Validation fails and the fix is outside docs/board/status scope.

## No-Readiness Wording

Allowed wording:

- `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_PLAN_COMPLETED_NOT_READY`
- `bounded fixture/sandbox recall evidence plan`
- `does not claim memory recall reliable`
- `RC_NOT_READY_BLOCKED remains`

Forbidden wording:

- `memory recall reliable`
- `runtime ready`
- `RC ready`
- `production ready`
- `cutover ready`
- `V8 implemented`
- `VCP full parity`

## Closeout

This plan records the next bounded-evidence shape only. It does not execute runtime recall validation, true `record_memory`, true `search_memory`, provider calls, real memory scans, durable memory/audit writes, migration/import/export/backup/restore apply, public MCP expansion, config/watchdog/startup changes, package/lockfile changes, tag/release/deploy/cutover, or readiness claims.

Result: `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_PLAN_COMPLETED_NOT_READY`; `RC_NOT_READY_BLOCKED` remains.

## Remote Reconciliation Closeout

Result: `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_PLAN_COMPLETED_SYNCED_NOT_READY`.

- Remote reconciliation confirmed local `HEAD`, tracking `origin/main`, and remote `refs/heads/main` all at `1e9b20210e794ff74f20278c4cb8e0df0eef7b30`.
- This confirms the bounded recall evidence plan exists on local `main`, `origin/main`, and remote `refs/heads/main`.
- The completed plan is limited to bounded recall evidence planning only.
- It did not execute true `search_memory`, did not read real memory content or `.jsonl` audit/durable memory content, did not call providers, and did not write durable memory or durable audit state.
- `memory recall reliable` is not claimed.
- `RC_NOT_READY_BLOCKED` remains.
