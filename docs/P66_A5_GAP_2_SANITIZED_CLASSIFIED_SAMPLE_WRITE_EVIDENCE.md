# P66 A5-GAP-2 Sanitized Classified Sample Write Evidence

Phase: `P66-A5-GAP-2-sanitized-classified-sample-write`

Mode: `A5-approved bounded durable memory write plus read-only projection proof`

Risk: `A5-approved`

Decision: `PASSED_POSITIVE_CLASSIFIED_SAMPLE_ISOLATED`

## Approval Boundary

User approval:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit bf3e86d, limited to creating exactly one sanitized classified sample with isolation-family: validation_transcripts, durable memory write yes, no durable audit write except normal write-path audit if unavoidable, then read-only projection proof over stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no backfill, no migration, no import, no export, no backup, no restore, no provider call, no public MCP expansion, no config/watchdog/startup change, no cutover.
```

Verified target commit before execution:

```text
bf3e86d573fd1be1317878d272a1b63373d8c673
```

Preflight:

```text
branch: main
worktree before execution: clean tracked worktree
remote state: local main ahead of origin/main
```

## Execution Summary

The approved sample was created through the real `MemoryWriteService.record()` write path. Evidence is intentionally sanitized: this report does not include raw memory id, raw title, raw content, raw evidence body, raw file path, raw audit entry, or raw store payload.

```yaml
decision: PASSED_POSITIVE_CLASSIFIED_SAMPLE_ISOLATED
sample_count_created: 1
sample_id_hash: 2fff87fbafe5c296
sample_title_hash: 363f9ac1a6b0aecf
sample_content_hash: ec96d0e9af8cfb90
sample_evidence_hash: 33a0cd3070e2acdc
sample_contract_matched: true
classifier_version: recall-isolation-classifier-v1
classifier_families:
  - validation_transcripts
classifier_reasons:
  - validation_transcripts:family+tag
durable_memory_written: true
durable_audit_written: normal_write_path_audit_unavoidable
normal_write_path_audit_appended: true
```

The normal write-path audit append is expected from the current `MemoryWriteService.record()` implementation after an accepted write. This was the only audit write observed and is within the approval clause `if unavoidable`.

## Store Snapshot

```yaml
before:
  real_diary:
    file_count: 498
  real_sqlite:
    records: 455
    chunks: 1290
  real_vector_index:
    vector_keys: 0
    embedding_cache_keys: 84
    diary_vector_keys: 1
  real_candidate_cache:
    entries: 2
  real_recall_audit:
    lines: 325
  write_audit:
    lines: 517
after:
  real_diary:
    file_count: 499
  real_sqlite:
    records: 456
    chunks: 1290
  real_vector_index:
    vector_keys: 0
    embedding_cache_keys: 84
    diary_vector_keys: 1
  real_candidate_cache:
    entries: 2
  real_recall_audit:
    lines: 325
  write_audit:
    lines: 518
```

## Projection Proof

```yaml
projection:
  real_diary:
    sample_durable_memory_written: true
  real_sqlite:
    sample_record_present: true
    sample_chunk_count: 0
  real_vector_index:
    exact_memory_id_occurrences: 0
    direct_vector_entry_present: false
  real_candidate_cache:
    exact_memory_id_occurrences: 0
  real_recall_audit:
    exact_memory_id_occurrences: 0
projection_leakage_count: 0
```

The positive control sample exists as one durable memory record, but its classified `validation_transcripts` family is isolated from normal projection surfaces:

- no SQLite chunks were created for the sample
- no vector entry was created for the sample
- no candidate-cache entry referenced the sample
- no recall-audit projection referenced the sample

## Safety Boundary

```yaml
provider_called: false
migration_applied: false
import_applied: false
export_applied: false
backup_restore_applied: false
public_mcp_expanded: false
config_watchdog_startup_changed: false
cutover_executed: false
remote_write: false
runtime_ready: false
final_rc_matrix_ready: false
v1_rc_ready: false
rc_ready: false
```

This evidence closes only the previous `NO_CLASSIFIED_REAL_SAMPLE_PRESENT` limitation for the approved sanitized positive-control sample. It does not prove broad real-memory isolation across arbitrary future samples, does not authorize backfill or migration, does not complete ValidationAggregator full implementation, and does not unlock runtime readiness, final RC readiness, v1.0 RC readiness, cutover, release, tag, deploy, or `RC_READY`.

## Next Safe Step

The next safest step is a fresh `A5-GAP-6` evidence-only aggregation refresh that consumes the updated A5-GAP-1/2/3/4/5 evidence set and performs no new runtime action.
