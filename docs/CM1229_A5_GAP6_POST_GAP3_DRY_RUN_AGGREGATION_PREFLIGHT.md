# CM-1229 A5-GAP-6 Post-GAP3 Dry-Run Aggregation Preflight

Date: 2026-05-31

Decision: `NOT_READY_BLOCKED`

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Purpose

Prepare the next exact-approved `A5-GAP-6` aggregation refresh after CM-1228 added current `A5-GAP-3` fixture-only migration-readiness dry-run evidence.

This document is not authorization and does not execute ValidationAggregator. It fixes the next evidence-consumption boundary so the project can aggregate the current approved runtime evidence set without scanning stores, invoking MCP tools, calling providers, or claiming readiness.

## Fresh Preflight Snapshot

Observed before this preflight document was written:

```text
branch = main
HEAD = 0eca82ba0fa193364d06ed4746a0a2f781324591
branch state = main...origin/main [ahead 22]
tracked diff = clean
untracked left untouched = CLAUDE.md, docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

Current Git facts must be rechecked immediately before any approved A5 execution. If this preflight is committed first, the approval line must bind to the new fresh `HEAD`, not the snapshot above.

## Evidence Units Prepared For Consumption

Default selected units for the next aggregation refresh:

```text
A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5
```

Evidence map:

| Unit | Current evidence | Binding | Safe interpretation |
|---|---|---|---|
| `A5-GAP-1` | `CM-1215` no-durable-write governance loop proof | `main@7d66d072ccb7828770cdb1ddffb5b756152b9af3`, subject `cm1214-governance-runtime-loop-no-durable-write sanitized test subject` | Subject-bound governance review / approval / audit loop proof accepted; all stages `evaluated_not_executed`; side-effect counters zero; no governed action or durable write. |
| `A5-GAP-2` | `CM-1218` recall isolation no-mutation proof | execution bound to `main@d0f008133465b2c1be4ea66689b072fa4ca86dd9`; evidence committed in `main@840556d7c7be1ddf6172a890fa87193eee9fbd6f` | Approved stores were read in no-mutation mode; `storeSnapshotsUnchanged=true`; `projectionLeakageTotal=0`; limitation remains `NO_CLASSIFIED_REAL_SAMPLE_PRESENT`. |
| `A5-GAP-3` | `CM-1228` migration-readiness fixture-only dry-run | execution bound to `main@e23e86dd4a3f443a95c2a2b4aeda4da901dde797`; evidence committed in `main@0eca82ba0fa193364d06ed4746a0a2f781324591` | Fixture-only dry-run executed; `fixtureOnly=true`, `mutated=false`, `migrationBlocked=true`; no apply/import/export/backup/restore/durable write. |
| `A5-GAP-4` | `CM-1210` endpoint-bound HTTP evidence | `main@db5a4d66cf472d35e80b12d512816cda5de09220`, endpoint `http://127.0.0.1:7605` | Health and observe evidence passed; unauthenticated MCP failed closed with Unauthorized. |
| `A5-GAP-4` | `CM-1211` authenticated MCP initialize/tools-list evidence | `main@1a7d198f1f4758f0de3caf9b839cc59aa1b9802e`, endpoint `http://127.0.0.1:7605` | Authenticated `initialize` passed; `tools/list` returned exactly `record_memory`, `search_memory`, `memory_overview`; no `tools/call`. |
| `A5-GAP-5` | `CM-1208` strict gate | `main@d3b9bf9fb8cc92cc7b2f2112d6006940a68b3d9d` | Target-bound strict-gate pass only: health ok, contract `29/29`, test `2754/2754`, compare `43/43`, rollback `43/43`. |

## Allowed Future Aggregation Shape

The next `A5-GAP-6` execution, if separately approved, should:

- feed only explicitly produced sanitized evidence from approved units `A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5` into ValidationAggregator
- use an in-memory sanitized evidence summary
- report evidence source map, freshness/baseline binding, missing evidence list, aggregator decision, and remaining gaps
- keep `commandsExecutedByAggregator=false`
- keep `validationAggregatorFullImplementation=false`
- preserve `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Disallowed Without Separate Approval

The next aggregation refresh must not:

- scan files or stores to collect new evidence
- read raw private memory or broad real memory content
- execute `record_memory`, `search_memory`, `memory_overview`, or any MCP `tools/call`
- start services or change HTTP/runtime configuration
- call providers
- write durable memory or durable audit
- execute governed actions
- run migration/import/export/backup/restore apply
- change config/watchdog/startup
- expand public MCP tools
- push, PR, tag, release, deploy, or cutover
- claim runtime readiness, RC readiness, production readiness, write reliability, recall reliability, governance readiness, migration readiness, or `RC_READY`

## Exact Approval Line Required

Use a fresh `HEAD` after committing or otherwise stabilizing this preflight state:

```text
I approve A5-GAP-6 for codex-memory on branch main at commit <FRESH_HEAD>, using only evidence from approved A5-GAP units A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5.
```

Any broader wording, stale commit, changed unit list, dirty worktree ambiguity, or missing unit list is insufficient.

## Required Preflight Before Execution

Run and inspect:

```powershell
git status --short --branch
git log --oneline --decorate -n 10
git diff --stat
git diff --check
```

Stop before execution if the branch, commit, selected units, worktree scope, or disallowed-action boundary differs from the exact approval line.

## Result

```text
cm1229_preflight_created=true
a5_gap6_executed=false
validation_aggregator_executed=false
selected_units=A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5
a5_gap3_consumption_prepared=true
runtime_ready=false
rc_ready=false
decision=NOT_READY_BLOCKED
```
