# P66 A5-GAP-2 Classified Sample Recall Isolation Readonly Approval Packet

Date: `2026-05-19`

Decision: `DRAFT_NOT_APPROVED`

Unit: `A5-GAP-2`

Gap: `recall_isolation_no_classified_real_sample_present`

## Purpose

Prepare the next exact A5 packet for the remaining limitation in the recall isolation proof:

```text
NO_CLASSIFIED_REAL_SAMPLE_PRESENT
```

The previous approved A5-GAP-2 rerun proved that no explicit classified isolation projection leakage was detected across the approved stores, but it also found zero already-classified real samples. This packet narrows the next action to a read-only positive-sample presence and projection proof. It does not authorize creating, backfilling, migrating, importing, exporting, or writing a classified sample.

## Approval Status

This packet is not approval.

No command is authorized by this document alone. Execution requires the user to provide the exact approval line after this packet is committed.

## Proposed Approval Line

After this packet is committed, use the resulting commit hash in place of `<POST_PACKET_COMMIT>`:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation, read-only classified isolation positive-sample presence and projection proof only, no backfill, no migration, no durable write.
```

## Scope

Allowed only after exact approval:

- read the approved stores listed in the approval line
- detect already-existing explicit classified isolation markers using the committed classifier semantics
- count explicit classified samples using sanitized integers only
- check whether any classified sample appears in projection surfaces
- report sanitized leakage counts by surface
- compute before/after store snapshots to prove no mutation
- write one sanitized evidence document inside `docs/`

Not allowed:

- create a classified sample
- backfill classified markers
- migrate, import, export, backup, restore, or apply data changes
- write durable memory
- write durable audit
- run search pipeline behavior as a user query
- call provider/model APIs
- start or change HTTP service configuration
- install or change watchdog/startup configuration
- expand public MCP tools
- output raw memory content, titles, file names, paths, raw IDs, raw audit entries, or private snippets
- push, tag, release, deploy, cut over, or claim `RC_READY`

## Approved Store Set

The proposed store set must remain exact:

```text
real_diary
real_sqlite
real_vector_index
real_candidate_cache
real_recall_audit
```

No other runtime store is included.

## Required Evidence Shape

The evidence document must include:

| Field | Required value |
|---|---|
| `approvalUnit` | `A5-GAP-2` |
| `approvedCommit` | exact user-approved commit |
| `approvedStores` | exact five-store set from this packet |
| `noMutation` | `true` |
| `classifiedSamplePresenceChecked` | `true` |
| `classifiedSampleCount` | sanitized integer |
| `projectionLeakageCount` | sanitized integer |
| `storeSnapshotsUnchanged` | `true` |
| `rawContentOutput` | `false` |
| `recallPipelineExecuted` | `false` |
| `providerCalled` | `false` |
| `durableMemoryWritten` | `false` |
| `durableAuditWritten` | `false` |
| `migrationApplied` | `false` |
| `publicMcpExpanded` | `false` |
| `runtimeReady` | `false` |
| `finalRcMatrixReady` | `false` |
| `v1RcReady` | `false` |
| `rcReady` | `false` |

Projection surface counts must include:

```text
sqlite_chunk_projection
vector_index
candidate_cache
recall_audit
```

## Pass / Fail Rules

`PASSED_POSITIVE_CLASSIFIED_SAMPLE_ISOLATED` requires all of:

- exact approval line matches this packet
- current `HEAD` equals the approved commit
- worktree has no unrelated tracked changes before execution
- approved store set is exact
- `classifiedSampleCount > 0`
- `projectionLeakageCount = 0`
- all per-surface leakage counts are `0`
- store snapshots are unchanged
- no raw content is printed
- no provider, durable write, migration/apply/import/export/backup/restore, public MCP expansion, config/watchdog/startup, remote write, tag, release, deploy, cutover, or readiness claim occurs

`FAIL_CLOSED_NO_CLASSIFIED_REAL_SAMPLE_PRESENT` is required when:

- the run is approved and no mutation occurs, but `classifiedSampleCount = 0`

`FAIL_CLOSED_PROJECTION_LEAKAGE_DETECTED` is required when:

- any classified sample appears in projection surfaces

`FAILED_UNAUTHORIZED_SCOPE` is required when:

- the approval line is missing, the commit does not match, the store set differs, mutation occurs, raw content is output, or any blocked action is attempted

## Validation Plan

Packet preparation validation:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
overclaim scan on the packet and active status docs
```

Execution validation after exact approval:

```text
git status -sb
git rev-parse HEAD
git diff --stat
read-only classified isolation positive-sample presence and projection proof
post-run git status -sb
post-run git diff --stat
docs validation
git diff --check
overclaim scan
```

## Boundary

This packet does not close `A5-GAP-2` by itself. It only prepares the next exact approval boundary for a read-only positive-sample proof. Until exact approval is provided and executed, the latest A5-GAP-2 result remains:

```text
EXECUTED_PASSED_NO_EXPLICIT_ISOLATION_PROJECTION_LEAKAGE_DETECTED_WITH_LIMITATION
NO_CLASSIFIED_REAL_SAMPLE_PRESENT
```

This packet does not claim runtime readiness, production readiness, durable writer readiness, migration/backfill readiness, final RC readiness, v1.0 RC readiness, cutover readiness, or `RC_READY`.
