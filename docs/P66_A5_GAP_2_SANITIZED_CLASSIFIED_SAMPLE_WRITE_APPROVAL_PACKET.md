# P66 A5-GAP-2 Sanitized Classified Sample Write Approval Packet

Date: `2026-05-19`

Decision: `DRAFT_NOT_APPROVED`

Unit: `A5-GAP-2`

Gap: `recall_isolation_no_classified_real_sample_present`

## Purpose

Prepare the next exact A5 packet after the read-only positive-sample proof failed closed:

```text
FAIL_CLOSED_NO_CLASSIFIED_REAL_SAMPLE_PRESENT
```

The goal is to create exactly one sanitized explicit classified sample, then prove that the recall isolation/classification projection layer prevents that sample from entering normal projection surfaces.

This packet is intentionally narrow. It is not a backfill, migration, import, export, backup, restore, production cutover, public MCP expansion, provider call, or broad memory operation.

## Approval Status

This packet is not approval.

No write, command, scan, or runtime action is authorized by this document alone. Execution requires the user to provide the exact approval line after this packet is committed.

## Proposed Approval Line

After this packet is committed, use the resulting commit hash in place of `<POST_PACKET_COMMIT>`:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, limited to creating exactly one sanitized classified sample with isolation-family: validation_transcripts, durable memory write yes, no durable audit write except normal write-path audit if unavoidable, then read-only projection proof over stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no backfill, no migration, no import, no export, no backup, no restore, no provider call, no public MCP expansion, no config/watchdog/startup change, no cutover.
```

## Exact Sample Contract

The sample must be synthetic, sanitized, and purpose-built:

```text
title: p66-a5-gap2-sanitized-classified-sample
content: isolation-family: validation_transcripts
         sanitized validation transcript sample for recall isolation positive control
evidence: synthetic A5-GAP-2 classified sample approved for projection proof only
tags: validation-transcript, isolation:validation_transcripts, p66-a5-gap2
target: process
validated: false
reusable: false
```

The sample must not include:

- user private content
- secrets, tokens, keys, URLs with credentials, cookies, headers, or `.env` values
- raw workspace IDs
- raw provider data
- external service output
- imported memory content
- migration/backfill payloads

## Allowed Work After Exact Approval

Allowed:

- verify `HEAD` equals the approved commit
- verify worktree has no unrelated tracked changes before execution
- create exactly one sanitized classified sample through the existing local memory write path
- record the generated sample identifier only as a short hash in evidence
- run a read-only projection proof against the exact approved stores
- report sanitized counts, hashes, and before/after snapshot digests
- write one sanitized evidence document inside `docs/`
- update active status and `.agent_board`

## Blocked Work

Not allowed:

- create more than one sample
- write real/private memory content
- run a broad backfill
- modify existing records
- migrate, import, export, backup, restore, or apply data changes
- call provider/model APIs
- expand public MCP tools
- change HTTP config, watchdog, startup, Codex config, or Claude config
- run release, tag, deploy, push, or cutover
- output raw memory content, raw title as evidence body, raw file name, raw path, raw ID, raw audit entry, or private snippets
- claim runtime readiness, production readiness, final RC readiness, v1.0 RC readiness, cutover readiness, or `RC_READY`

## Required Evidence Shape

The evidence document must include:

| Field | Required value |
|---|---|
| `approvalUnit` | `A5-GAP-2` |
| `approvedCommit` | exact user-approved commit |
| `sampleCreated` | `true` |
| `sampleCountCreated` | `1` |
| `sampleContractMatched` | `true` |
| `sampleIdHash` | short hash only |
| `rawContentOutput` | `false` |
| `rawIdsOutput` | `false` |
| `rawPathsOutput` | `false` |
| `classifiedSampleCountAfterWrite` | `>= 1` |
| `projectionLeakageCount` | `0` |
| `sqliteChunkProjectionLeakage` | `0` |
| `vectorIndexLeakage` | `0` |
| `candidateCacheLeakage` | `0` |
| `recallAuditLeakage` | `0` |
| `durableMemoryWritten` | `true` |
| `durableAuditWritten` | `false` unless existing write path unavoidably writes normal audit |
| `providerCalled` | `false` |
| `migrationApplied` | `false` |
| `importExportApplied` | `false` |
| `backupRestoreApplied` | `false` |
| `publicMcpExpanded` | `false` |
| `configWatchdogStartupChanged` | `false` |
| `remoteWrite` | `false` |
| `runtimeReady` | `false` |
| `finalRcMatrixReady` | `false` |
| `v1RcReady` | `false` |
| `rcReady` | `false` |

## Pass / Fail Rules

`PASSED_POSITIVE_CLASSIFIED_SAMPLE_ISOLATED` requires all of:

- exact approval line matches this packet
- `HEAD` equals the approved commit
- worktree has no unrelated tracked changes before execution
- exactly one sanitized sample is created
- the sample matches the exact sample contract
- classifier detects the sample as `validation_transcripts`
- `classifiedSampleCountAfterWrite >= 1`
- `projectionLeakageCount = 0`
- all per-surface leakage counts are `0`
- no raw content, raw IDs, raw paths, or private snippets are output
- no provider, migration/apply/import/export/backup/restore, public MCP expansion, config/watchdog/startup, remote write, tag, release, deploy, cutover, or readiness claim occurs

`FAIL_CLOSED_SAMPLE_NOT_CREATED` is required when:

- the write path does not create exactly one sample

`FAIL_CLOSED_SAMPLE_CONTRACT_MISMATCH` is required when:

- the sample is not synthetic, sanitized, or explicitly classified as required

`FAIL_CLOSED_PROJECTION_LEAKAGE_DETECTED` is required when:

- the sample appears in SQLite chunk projection, vector index, candidate cache, or recall audit projection surfaces

`FAILED_UNAUTHORIZED_SCOPE` is required when:

- approval is missing, commit mismatches, more than one sample is created, raw content is output, or any blocked action is attempted

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
create exactly one sanitized classified sample
read-only projection proof over approved stores
post-run git status -sb
post-run git diff --stat
docs validation
git diff --check
overclaim scan
```

## Boundary

This packet does not authorize execution and does not close `A5-GAP-2`.

If later approved and passed, it can close only the positive classified sample projection-proof limitation. It still would not claim production readiness, ValidationAggregator full implementation, final RC readiness, v1.0 RC readiness, cutover readiness, migration/backfill readiness, or `RC_READY`.
