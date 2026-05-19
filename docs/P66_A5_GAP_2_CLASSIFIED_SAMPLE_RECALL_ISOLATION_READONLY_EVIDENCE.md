# P66 A5-GAP-2 Classified Sample Recall Isolation Readonly Evidence

Date: `2026-05-19`

Decision: `FAIL_CLOSED_NO_CLASSIFIED_REAL_SAMPLE_PRESENT`

Approval unit: `A5-GAP-2`

Approved target commit: `ff55256105e58725c8dbc45cb2d6a68fde98929e`

## Approval

The user provided the exact approval line:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit ff55256, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation, read-only classified isolation positive-sample presence and projection proof only, no backfill, no migration, no durable write.
```

## Scope

Allowed and performed:

- read approved stores only
- use `RecallIsolationClassifier` explicit classification semantics
- check for already-existing explicit classified samples
- check approved projection surfaces for leakage by sanitized counts only
- compare before/after store snapshots
- record one sanitized evidence document

Not allowed and not performed:

- classified sample creation
- classified marker backfill
- migration, import, export, backup, restore, or apply
- durable memory write
- durable audit write
- provider/model call
- public MCP expansion
- config/watchdog/startup change
- remote write, tag, release, deploy, or cutover
- raw memory content, raw titles, raw file names, raw paths, raw IDs, or raw audit entries in output
- readiness or `RC_READY` claim

## Preflight

```text
branch: main
HEAD: ff55256105e58725c8dbc45cb2d6a68fde98929e
worktree before execution: clean
diff before execution: empty
approved stores: real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit
```

## Method

The proof used an in-memory Node process and printed only sanitized JSON.

The scan read:

- `real_diary`: configured DailyNote root
- `real_sqlite`: configured SQLite shadow store opened read-only
- `real_vector_index`: current profile vector index JSON
- `real_candidate_cache`: candidate cache JSON
- `real_recall_audit`: recall audit JSONL

The scan did not run a recall/search pipeline and did not output raw memory content or raw IDs.

## Evidence Summary

| Field | Result |
|---|---|
| schemaVersion | `p66-a5-gap2-classified-sample-recall-isolation-readonly-evidence-v1` |
| generatedAt | `2026-05-19T10:09:33.385Z` |
| mode | `read_only_classified_isolation_positive_sample_presence_and_projection_proof` |
| approvalUnit | `A5-GAP-2` |
| approvedCommit | `ff55256105e58725c8dbc45cb2d6a68fde98929e` |
| classifierVersion | `recall-isolation-classifier-v1` |
| noMutation | `true` |
| classifiedSamplePresenceChecked | `true` |
| classifiedSampleCount | `0` |
| projectionLeakageCount | `0` |
| storeSnapshotsUnchanged | `true` |
| rawContentOutput | `false` |
| rawIdsOutput | `false` |
| rawPathsOutput | `false` |
| recallPipelineExecuted | `false` |
| providerCalled | `false` |
| durableMemoryWritten | `false` |
| durableAuditWritten | `false` |
| migrationApplied | `false` |
| importExportApplied | `false` |
| backupRestoreApplied | `false` |
| publicMcpExpanded | `false` |
| configWatchdogStartupChanged | `false` |
| remoteWrite | `false` |
| runtimeReady | `false` |
| finalRcMatrixReady | `false` |
| v1RcReady | `false` |
| rcReady | `false` |
| beforeSnapshotDigest | `8fdaf75a63c8a3d7` |
| afterSnapshotDigest | `8fdaf75a63c8a3d7` |

Approved store summary:

| Store | Sanitized result |
|---|---:|
| `real_diary` | `498` scoped text files |
| `real_sqlite` | read-only available; `455` records; `1290` chunks |
| `real_vector_index` | exists; `0` record vector keys; `1` diary vector bucket |
| `real_candidate_cache` | exists; `2` top-level entries |
| `real_recall_audit` | exists; `325` parsed lines |

Explicit family counts:

| Family | Count |
|---|---:|
| `governance_records` | `0` |
| `validation_transcripts` | `0` |
| `redaction_samples` | `0` |
| `policy_decisions` | `0` |
| `readiness_reports` | `0` |
| `migration_metadata` | `0` |
| `blocked_memory` | `0` |
| `tombstoned_memory` | `0` |
| `out_of_scope_memory` | `0` |

Projection surface counts:

| Projection surface | Leakage count |
|---|---:|
| `sqlite_chunk_projection` | `0` |
| `vector_index` | `0` |
| `candidate_cache` | `0` |
| `recall_audit` | `0` |

## Result

The approved read-only proof executed and failed closed:

```text
FAIL_CLOSED_NO_CLASSIFIED_REAL_SAMPLE_PRESENT
```

This means the approved stores still do not contain an already-existing explicit classified real sample. Because no positive sample exists, the proof cannot demonstrate positive projection-clearing behavior against a real classified sample.

The run did prove:

- exact approved stores were read in no-mutation mode
- explicit classified sample count remains `0`
- projection leakage count is `0`
- before/after store snapshots are unchanged
- no raw content/IDs/paths were output
- no durable write, migration/apply, provider call, public MCP expansion, config/watchdog/startup change, remote write, cutover, or readiness claim occurred

It does not claim:

- A5-GAP-2 complete
- durable backfill/migration readiness
- production readiness
- ValidationAggregator full implementation complete
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`
