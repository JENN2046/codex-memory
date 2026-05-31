# CM-1217 A5-GAP-2 Recall Isolation No-Mutation Preflight

Date: 2026-05-31

Decision: `NOT_READY_BLOCKED`

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Purpose

Prepare the next exact-approved `A5-GAP-2` recall isolation runtime proof after CM-1215 refreshed the current governance-loop evidence and CM-1216 prepared the next aggregation boundary.

This document is not authorization and does not run recall isolation proof. It fixes a read-only, no-mutation proof boundary so `codex-memory` can keep moving toward auditable and dogfoodable runtime evidence without broad real-memory scans or readiness claims.

## Fresh Preflight Snapshot

Observed before this preflight document was written:

```text
branch = main
HEAD = 564b3f99c9e4b56146dd72a3d83067220833bac8
branch state = main...origin/main [ahead 10]
tracked diff = clean
untracked left untouched = CLAUDE.md, docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

Current Git facts must be rechecked immediately before any approved A5 execution. If this preflight is committed first, the approval line must bind to the new fresh `HEAD`, not the snapshot above.

## Selected Gap

```text
unit = A5-GAP-2
gap = recall_isolation_runtime_proof_not_executed
mode = no mutation
stores = real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit
```

Rationale:

- CM-1213 and CM-1215 moved governance and aggregation evidence forward, but recall isolation remains one of the active runtime gaps.
- The historical A5-GAP-2 proof used the same five-store no-mutation boundary.
- A fresh current-head proof should keep the scope read-only and sanitized before any future write/backfill/migration discussion.

## Allowed Future Execution Shape

If separately exact-approved, the future run may execute only a scoped no-mutation recall isolation proof over the stores named above:

- inspect only approved stores
- produce sanitized counts / hashes / contamination summary
- prove no intended mutation
- report store snapshot unchanged status where available
- report isolated record family / projection leakage status
- produce a machine-readable contamination/evidence report

The execution must avoid raw content output. Any evidence samples must be redacted or represented by short non-reversible identifiers.

## Disallowed Without Separate Approval

The future `A5-GAP-2` run must not:

- perform broad memory export
- preview unrelated private content
- output raw diary, SQLite, vector, cache, or recall-audit contents
- run normal recall/search pipeline
- execute `record_memory`, `search_memory`, `memory_overview`, or any MCP `tools/call`
- mutate stores
- write durable memory
- write durable audit
- call providers
- change config/watchdog/startup
- change dependencies
- expand public MCP tools
- run migration/import/export/backup/restore apply
- push, PR, tag, release, deploy, or cutover
- claim runtime readiness, RC readiness, production readiness, write reliability, recall reliability, or `RC_READY`

## Exact Approval Line Required

Use a fresh `HEAD` after committing or otherwise stabilizing this preflight state:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit <FRESH_HEAD>, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation.
```

Any broader wording, stale commit, changed store list, missing `no mutation`, dirty worktree ambiguity, or store expansion is insufficient.

## Required Preflight Before Execution

Run and inspect:

```powershell
git status --short --branch
git log --oneline --decorate -n 10
git diff --stat
git diff --check
```

Then verify:

- branch is `main`
- commit exactly matches the approval line
- no tracked drift is present unless it is explicitly part of the approved execution packet
- `CLAUDE.md` and `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md` remain out of scope unless separately addressed
- no `.env`, secret, package, lockfile, config, watchdog, startup, public MCP schema, migration, backup/restore, or durable write change is present

## Result

```text
cm1217_preflight_created=true
a5_gap2_executed=false
recall_isolation_runtime_proof_executed=false
stores=real_diary,real_sqlite,real_vector_index,real_candidate_cache,real_recall_audit
no_mutation=true
readiness_claimed=false
decision=NOT_READY_BLOCKED
```
