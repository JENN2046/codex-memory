# CM-1218 A5-GAP-2 Recall Isolation No-Mutation Evidence

Date: `2026-05-31`

Decision: `EXECUTED_PASSED_NO_EXPLICIT_ISOLATION_PROJECTION_LEAKAGE_DETECTED_WITH_LIMITATION`

Approved target commit: `d0f008133465b2c1be4ea66689b072fa4ca86dd9`

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
I approve A5-GAP-2 for codex-memory on branch main at commit d0f008133465b2c1be4ea66689b072fa4ca86dd9, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation.
```

## Scope

Allowed:

- read the five approved local stores in scoped no-mutation mode
- use `RecallIsolationClassifier` explicit family/tag/header/status/scope classification
- compare classified-memory IDs against approved projection surfaces
- report sanitized counts, booleans, and limitation labels

Not allowed and not performed:

- raw memory preview or broad export
- unrelated private content output
- normal recall/search pipeline execution
- MCP `tools/call`
- provider/model call
- durable memory write
- durable audit write
- public MCP expansion
- config/watchdog/startup change
- migration/import/export/backup/restore apply
- push, PR, tag, release, deploy, cutover, readiness, reliability, or `RC_READY` claim

## Preflight

```text
branch: main
HEAD: d0f008133465b2c1be4ea66689b072fa4ca86dd9
origin state: main...origin/main [ahead 11]
tracked worktree: clean before execution
untracked left untouched: CLAUDE.md; docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

## Method

The proof used a local Node `v24.14.0` process.

The scan read only:

- `real_diary`: local diary store
- `real_sqlite`: local SQLite store opened read-only through `node:sqlite`
- `real_vector_index`: current local vector index
- `real_candidate_cache`: local candidate cache
- `real_recall_audit`: local recall audit log

The script did not print raw titles, raw memory body text, raw audit entries, file names, file paths, vectors, cache payloads, or SQLite row content.

The first script attempt failed before evidence output with a local `ReferenceError` in a summary variable name. It used the same no-mutation read boundary and produced no durable write, provider call, MCP call, config change, remote action, or readiness claim. The corrected rerun produced the evidence below.

## Evidence Summary

| Field | Result |
|---|---|
| schemaVersion | `cm1218-a5-gap2-recall-isolation-no-mutation-evidence-v1` |
| approvedCommit | `d0f008133465b2c1be4ea66689b072fa4ca86dd9` |
| classifierVersion | `recall-isolation-classifier-v1` |
| approvedStores | `real_diary`, `real_sqlite`, `real_vector_index`, `real_candidate_cache`, `real_recall_audit` |
| mutationMode | `no mutation` |
| storeSnapshotsUnchanged | `true` |
| rawContentOutput | `false` |
| recallPipelineExecuted | `false` |
| mcpToolsCallExecuted | `false` |
| providerCalled | `false` |
| publicMcpExpanded | `false` |
| durableMemoryWritten | `false` |
| durableAuditWritten | `false` |
| projectionLeakageTotal | `0` |
| result | `passed_no_explicit_isolation_projection_leakage_detected_no_mutation` |

Store summary:

| Store | Sanitized result |
|---|---:|
| Diary files | `16` scoped files |
| SQLite records | `16` records |
| SQLite chunks | `33` chunks |
| SQLite write manifests | `10` manifests |
| Vector index | exists; `6` top-level keys |
| Candidate cache | exists; `4` top-level entries |
| Recall audit | exists; `10` parsed lines |

Explicit isolation summary:

| Field | Result |
|---|---:|
| diaryClassifiedFiles | `0` |
| sqliteClassifiedRecords | `0` |
| isolatedIdCount | `0` |

Explicit family counts:

```text
governance_records=0
validation_transcripts=0
redaction_samples=0
policy_decisions=0
readiness_reports=0
migration_metadata=0
blocked_memory=0
tombstoned_memory=0
out_of_scope_memory=0
```

Projection leakage counts:

| Projection surface | Leakage count |
|---|---:|
| sqlite_chunk_projection | `0` |
| vector_index | `0` |
| candidate_cache | `0` |
| recall_audit | `0` |
| total | `0` |

## Result

`A5-GAP-2` was rerun for the approved real stores with `no mutation`.

The result is:

```text
EXECUTED_PASSED_NO_EXPLICIT_ISOLATION_PROJECTION_LEAKAGE_DETECTED_WITH_LIMITATION
```

Important limitation:

```text
NO_CLASSIFIED_REAL_SAMPLE_PRESENT
```

This proves only that the current approved stores had no explicit classified isolation projection leakage under the approved no-mutation scan. It does not prove broad future-sample coverage, durable backfill/migration safety, runtime readiness, final RC readiness, cutover readiness, recall reliability, write reliability, or `RC_READY`.
