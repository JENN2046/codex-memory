# P66 A5-GAP-2 Recall Isolation Runtime Proof Evidence

Date: `2026-05-19`

Decision: `EXECUTED_FAIL_CLOSED_CONTAMINATION_MARKERS_DETECTED_NOT_READY`

Approved target commit: `6faa8baa375e7496dcf62cb4443668dd9f67f712`

Approved stores:

```text
real_diary
real_sqlite
real_vector_index
real_candidate_cache
real_recall_audit
```

Mutation mode: `no mutation`

## Approval

The user provided the exact approval line:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit 6faa8baa375e7496dcf62cb4443668dd9f67f712, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation.
```

## Scope

This evidence is limited to a read-only, scoped contamination scan of the approved stores.

Allowed:

- read approved real store files only
- inspect SQLite with read-only access
- scan only isolated-family markers and lifecycle/scope metadata
- produce sanitized counts, hashes, and no-mutation evidence

Not allowed and not performed:

- raw memory preview or broad export
- unrelated private content output
- search pipeline execution
- provider/model call
- durable memory write
- durable audit write
- public MCP expansion
- config/watchdog/startup change
- migration/import/export/backup/restore apply
- push, tag, release, deploy, cutover, or `RC_READY` claim

## Preflight

```text
branch: main
HEAD: 6faa8baa375e7496dcf62cb4443668dd9f67f712
origin/main: a9177d5 fix: tighten review patch safety semantics
ahead: 7 local commits
worktree: clean before execution
diff: empty before execution
```

## Method

The proof used an in-memory Node process.

The scan read:

- `real_diary`: `data/dailynote`
- `real_sqlite`: `data/codex-memory.sqlite`
- `real_vector_index`: current profile `memory-vectors.json`
- `real_candidate_cache`: `data/candidate-cache.json`
- `real_recall_audit`: `logs/codex-memory-recall.jsonl`

The scan did not print raw titles, raw memory body text, raw audit entries, file names, or paths. Store paths and record/file references were represented with short hashes only.

The script computed before/after store snapshots and reported:

```text
storeSnapshotsUnchanged=true
rawContentOutput=false
providerCalled=false
publicMcpExpanded=false
recallPipelineExecuted=false
durableMemoryWritten=false
durableAuditWritten=false
```

One first attempt failed on an in-memory variable-name error before producing evidence. Post-error `git status --short --branch` and `git diff --stat` remained clean. The corrected read-only proof then executed successfully.

## Evidence Summary

| Field | Result |
|---|---|
| schemaVersion | `p66-a5-gap2-recall-isolation-runtime-proof-evidence-v1` |
| mode | `read_only_scoped_contamination_scan` |
| generatedAt | `2026-05-19T05:47:00.181Z` |
| approvedStores | `real_diary`, `real_sqlite`, `real_vector_index`, `real_candidate_cache`, `real_recall_audit` |
| noMutation | `true` |
| storeSnapshotsUnchanged | `true` |
| rawContentOutput | `false` |
| recallPipelineExecuted | `false` |
| contamination result | `contamination_markers_detected` |
| failClosed | `true` |

Store summary:

| Store | Sanitized result |
|---|---:|
| SQLite records | `455` total; `455` active in-scope; `0` non-active; `0` out-of-scope; `0` tombstoned/superseded |
| SQLite chunks | `1290` total; `0` orphan chunks |
| Diary files | `498` scoped text files |
| Vector index | exists; `0` record vectors; `1` diary vector; `0` orphan vectors |
| Candidate cache | exists; `2` entries; `0` active memory-id references discovered |
| Recall audit | exists; `324` parsed lines; `0` unparsable lines; `260` active memory-id references discovered |

## Contamination Findings

The scan found isolated-family markers on four surfaces:

```text
normal_recall_namespace
diary_source_text
sqlite_chunk_projection
recall_audit_summary
```

No markers were found in:

```text
vector_index
candidate_cache
ranking_projection_cache
```

Sanitized family counts:

| Family | SQLite active records | Diary source text | SQLite chunk projection | Recall audit summary |
|---|---:|---:|---:|---:|
| `governance_records` | 190 | 191 | 583 | 102 |
| `validation_transcripts` | 455 | 468 | 1290 | 260 |
| `redaction_samples` | 1 | 1 | 2 | 0 |
| `policy_decisions` | 101 | 102 | 333 | 77 |
| `readiness_reports` | 173 | 192 | 534 | 101 |
| `migration_metadata` | 75 | 83 | 227 | 46 |
| `blocked_memory` | 0 | 0 | 0 | 0 |
| `tombstoned_memory` | 0 | 0 | 0 | 0 |
| `out_of_scope_memory` | 0 | 0 | 0 | 0 |

The proof deliberately reports only counts and short hashes. It does not include raw matched content.

## Result

`A5-GAP-2` was executed for the approved real stores with `no mutation`.

The result is:

```text
EXECUTED_FAIL_CLOSED_CONTAMINATION_MARKERS_DETECTED
```

This means the runtime proof ran and produced a sanitized contamination report, but the recall-isolation runtime gap is not closed. The current real stores contain governance, validation, policy, readiness, and migration-related marker families on normal recall and audit surfaces.

It does not claim:

- recall isolation passed
- recall isolation runtime proof ready
- ValidationAggregator full implementation complete
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`

## Next Minimal Implementation

The next safe implementation is not another proof scan. The next useful work is to design and implement an explicit isolation/classification layer so governance, validation, readiness, policy, migration, blocked, tombstoned, and out-of-scope records can be structurally excluded from normal recall/index/cache/audit projection before re-running A5-GAP-2.
