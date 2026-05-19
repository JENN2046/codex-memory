# P66 A5-GAP-2 Rerun Recall Isolation Runtime Proof Evidence

Date: `2026-05-19`

Decision: `EXECUTED_PASSED_NO_EXPLICIT_ISOLATION_PROJECTION_LEAKAGE_DETECTED_WITH_LIMITATION`

Approved target commit: `ceffc0f255c142875a0f41879539361dd547c4bc`

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
I approve A5-GAP-2 for codex-memory on branch main at commit ceffc0f255c142875a0f41879539361dd547c4bc, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation.
```

## Scope

This evidence is limited to a read-only, scoped rerun after the local A4 recall isolation/classification projection layer was committed in `ceffc0f255c142875a0f41879539361dd547c4bc`.

Allowed:

- read approved real store files only
- inspect SQLite with read-only access
- use `RecallIsolationClassifier` explicit family/tag/header/status/scope classification
- compare projection surfaces for classified isolated-memory leakage
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
HEAD: ceffc0f255c142875a0f41879539361dd547c4bc
origin/main: a9177d5 fix: tighten review patch safety semantics
ahead: 9 local commits
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

The scan did not print raw titles, raw memory body text, raw audit entries, file names, or paths. Any samples would have been represented with short hashes only; no leakage samples were produced.

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

## Evidence Summary

| Field | Result |
|---|---|
| schemaVersion | `p66-a5-gap2-recall-isolation-runtime-proof-evidence-v2` |
| mode | `read_only_scoped_explicit_isolation_projection_scan` |
| generatedAt | `2026-05-19T06:12:54.518Z` |
| approvedCommit | `ceffc0f255c142875a0f41879539361dd547c4bc` |
| classifierVersion | `recall-isolation-classifier-v1` |
| approvedStores | `real_diary`, `real_sqlite`, `real_vector_index`, `real_candidate_cache`, `real_recall_audit` |
| noMutation | `true` |
| storeSnapshotsUnchanged | `true` |
| rawContentOutput | `false` |
| recallPipelineExecuted | `false` |
| explicit projection leakage | `0` |
| result | `passed_no_explicit_isolation_projection_leakage_detected` |

Store summary:

| Store | Sanitized result |
|---|---:|
| Diary files | `498` scoped text files |
| SQLite records | `455` records |
| SQLite chunks | `1290` chunks; `0` orphan chunks |
| Vector index | exists; `0` record vectors; `1` diary vector bucket |
| Candidate cache | exists; `3` top-level entries |
| Recall audit | exists; `324` parsed lines |

## Explicit Isolation Result

The explicit classifier found no classified isolated records in the approved real stores:

```text
isolatedMemoryIds=0
```

No classified isolated-memory IDs were found in projection surfaces:

| Projection surface | Leakage count |
|---|---:|
| `sqlite_chunk_projection` | `0` |
| `vector_index` | `0` |
| `candidate_cache` | `0` |
| `recall_audit` | `0` |

Explicit family counts were zero across all scanned surfaces:

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

## Legacy Broad-Marker Context

The previous A5-GAP-2 proof used broad marker scanning and failed closed because normal project records naturally contain terms such as `validation`, `gate`, `policy`, `readiness`, `import`, and `backup`.

This rerun keeps those counts as context only. They are not authoritative for the new explicit classifier because the A4 implementation deliberately avoids broad token matching.

Sanitized legacy broad-marker residue remains in diary, SQLite records, and SQLite chunks. It was not found in vector index, candidate cache, or recall-audit summary surfaces by this rerun.

## Result

`A5-GAP-2` was rerun for the approved real stores with `no mutation`.

The result is:

```text
EXECUTED_PASSED_NO_EXPLICIT_ISOLATION_PROJECTION_LEAKAGE_DETECTED_WITH_LIMITATION
```

This means the approved real-store rerun found no explicit classified isolation leakage after the A4 projection layer landed.

Important limitation:

```text
NO_CLASSIFIED_REAL_SAMPLE_PRESENT
```

The approved stores did not contain records marked with the new explicit isolation family markers, so this proof verifies absence of explicit classified leakage and no-mutation safety, while positive projection-clearing behavior remains covered by local source tests rather than by a real classified sample in the approved stores.

It does not claim:

- durable writer readiness
- migration/backfill readiness
- ValidationAggregator full implementation complete
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`
