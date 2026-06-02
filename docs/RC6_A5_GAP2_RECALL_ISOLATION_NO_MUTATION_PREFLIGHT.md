# RC-6 A5-GAP-2 Recall Isolation No-Mutation Preflight

Phase: `RC-6`

Mode: `A5-GAP-2 exact-approved no-mutation evidence`

Risk: `A5-preflight`

Decision: `EXECUTED_PASSED_NO_EXPLICIT_ISOLATION_PROJECTION_LEAKAGE_DETECTED_WITH_LIMITATION`

## Purpose

Record the smallest fresh-head `A5-GAP-2` no-mutation recall isolation evidence.

This evidence does not print raw memory content, call MCP tools, call providers, mutate durable memory or audit state, change config/watchdog/startup, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Current Git Reality

At packet creation time:

```text
branch = main
local HEAD = b15fe1abe1a7b7f61c5f22e0eefaf923c87f3102
origin/main = fe39bdc chore: align current facts to pushed head
ahead = 7 local commits
worktree = clean
diff = empty
```

Exact branch, commit, ahead/behind state, and worktree cleanliness must be rechecked immediately before any approved `A5-GAP-2` execution.

## Approval

The user provided the exact approval line:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit e117f6f25e67a178a7d097d9b9b857b27b61f926, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation.
```

Fresh preflight matched:

```text
branch = main
HEAD = e117f6f25e67a178a7d097d9b9b857b27b61f926
worktree = clean before execution
diff = empty before execution
```

## Freshness Assessment

Existing `A5-GAP-2` evidence is useful background, but it is not fresh evidence for current `HEAD`:

- `P66_A5_GAP_2_RERUN_RECALL_ISOLATION_RUNTIME_PROOF_EVIDENCE.md` is bound to commit `ceffc0f255c142875a0f41879539361dd547c4bc`.
- `P66_A5_GAP_2_CLASSIFIED_SAMPLE_RECALL_ISOLATION_READONLY_EVIDENCE.md` is bound to commit `ff55256105e58725c8dbc45cb2d6a68fde98929e`.
- `P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md` is bound to commit `bf3e86d573fd1be1317878d272a1b63373d8c673`.

Those records establish historical bounded evidence and limitations. They did not by themselves provide current-head runtime proof for `e117f6f25e67a178a7d097d9b9b857b27b61f926`, so this exact-approved no-mutation proof was executed.

## Requested Boundary

Requested unit:

```text
A5-GAP-2
```

Requested stores:

```text
real_diary
real_sqlite
real_vector_index
real_candidate_cache
real_recall_audit
```

Requested mutation mode:

```text
no mutation
```

Allowed and performed after exact approval:

- read the explicitly approved stores in no-mutation mode
- use the existing recall isolation/classification projection checks
- produce sanitized counts and proof flags only
- verify store snapshots remain unchanged

Not allowed and not performed:

- broad real-memory export
- raw memory preview or unrelated private content output
- bearer-token use
- MCP `tools/call`
- provider/model call
- durable memory write
- durable audit write
- migration/import/export/backup/restore
- public MCP expansion
- config/watchdog/startup change
- remote action
- tag/release/deploy/cutover
- readiness or reliability claim

## Evidence Summary

The approved run reported only sanitized fields:

| Field | Result |
|---|---|
| schemaVersion | `rc6-a5-gap2-recall-isolation-no-mutation-evidence-v1` |
| mode | `read_only_scoped_explicit_isolation_projection_scan` |
| approvedCommit | `e117f6f25e67a178a7d097d9b9b857b27b61f926` |
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
| Diary files | `17` scoped files |
| SQLite records | `17` records |
| SQLite chunks | `38` chunks |
| SQLite write manifests | `0` manifests |
| Vector index | not present |
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

## Execution Notes

The proof used a local Node process. Node emitted its standard experimental warning for `node:sqlite`; no failure occurred.

The script did not print raw titles, raw memory body text, raw audit entries, file names, file paths, vectors, cache payloads, or SQLite row content.

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

This proves only that the current approved stores had no explicit classified isolation projection leakage under the approved no-mutation scan.

## Readiness Boundary

This evidence does not claim:

- production readiness
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- durable writer readiness
- migration/backfill readiness
- `RC_READY`
