# CM-0824 True Live Recall Patched Proof Approval Packet

Status: `CM0824_TRUE_LIVE_RECALL_PATCHED_PROOF_APPROVAL_PACKET_READY_NOT_RELIABLE_NOT_READY`
Date: 2026-05-23
Scope: exact approval packet only; no true live execution in this slice
Entry evidence: `CM0823_PATCHED_METADATA_ONLY_PROOF_PATH_REVIEW_READY_FOR_PACKET_NOT_RELIABLE_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

This packet defines the future execution standard for one patched true live recall proof.

The future proof is intended to test the CM-0820 patched metadata-only path, where `noRawContentRead=true` is carried from the internal runner through the executor adapter, approved app path, and recall pipeline.

This packet does not approve execution by itself. It does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` or durable memory content, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Entry Conditions

A future execution may proceed only if all are true at execution time:

- The current execution head contains the CM-0820 patched metadata-only path and this packet.
- Worktree is clean before execution.
- The operator gives a separate exact approval naming `CM0825_EXACT_APPROVED_PATCHED_TRUE_LIVE_RECALL_PROOF_ONCE`.
- Execution uses `TrueLiveRecallReadonlyProofRunner` plus `TrueLiveRecallExecutorAdapter`.
- The approved app path receives `noTokenReadOnly=true`, `include_content=false`, and `executionContext.noRawContentRead=true`.
- The recall pipeline runs with `readOnly=true`, `includeContent=false`, and metadata-only aggregation.
- `RC_NOT_READY_BLOCKED` remains controlling before and after the proof.

## Future Exact Approval Line

Future execution requires the operator to provide this line exactly:

```text
I approve CM0825_EXACT_APPROVED_PATCHED_TRUE_LIVE_RECALL_PROOF_ONCE for codex-memory at the current clean head containing the CM-0820 patched metadata-only recall path, limited to exactly four read-only true live recall queries through TrueLiveRecallReadonlyProofRunner and TrueLiveRecallExecutorAdapter, with noRawContentRead=true, sanitized output only, no raw memory output, no direct .jsonl read, no provider/model/API call, no durable memory/audit write, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness or reliability claim.
```

Any missing, edited, bundled, broader, or ambiguous approval must fail closed.

## Exact Query Set

Exact query count: `4`.

The future execution must use exactly these ordered query texts:

| Slot | Family | Query text | Expected result criterion |
|---|---|---|---|
| Q1 | positive_project_state | `current project status mainline memory spine state` | `resultCount >= 1`, sanitized metadata-only output |
| Q2 | positive_recall_evidence_ladder | `memory recall evidence ladder bounded evidence progression` | `resultCount >= 1`, sanitized metadata-only output |
| Q3 | positive_blocker_posture | `blocker not-ready no-overclaim status` | `resultCount >= 1`, sanitized metadata-only output |
| Q4 | stricter_negative_control | `xqzv-9137-lomdra-kepv-azmuth` | `resultCount = 0` |

The query set must not be broadened, substituted, reordered, or expanded during execution.

## Required Patched Path

Future execution must prove these path facts in sanitized evidence:

- Runner sealed context includes `readOnly=true`, `noProvider=true`, `noAudit=true`, `sanitizedOutput=true`, and `includeContent=false`.
- Adapter forwards `include_content=false`, `noTokenReadOnly=true`, approved `requestSource=internal-true-live-recall-readonly-proof-runner`, and `noRawContentRead=true`.
- App accepts `noRawContentRead=true` only through the approved internal path.
- Pipeline runs metadata-only under `noRawContentRead=true`.
- Pipeline does not call `shadowStore.getRecordsByIds`.
- Pipeline does not read `record.rawText` or `record.content`.
- Output does not include raw-derived `content`, `text`, `title`, `snippet`, `sourceFile`, direct `.jsonl` locations, durable paths, or raw memory fields.

## Side-Effect Counter Requirements

The future run must include complete side-effect counters. Every required counter must be finite, non-negative, present, and exactly zero:

- `providerCalls`
- `directJsonlReads`
- `durableMemoryWrites`
- `durableAuditWrites`
- `candidateCacheWrites`
- `candidateCacheFlushes`
- `syncCalls`
- `vectorFlushes`
- `embeddingCacheWrites`
- `rawMemoryContentReads`
- `publicMcpExpansion`

Missing, partial, malformed, non-finite, negative, required-nonzero, or unknown-positive counters must fail closed.

## Allowed Output Shape

The future proof may report only sanitized evidence:

```text
taskId
baselineCommit
queryCount
querySlots
perQuery:
  querySlot
  family
  elapsedMs
  resultCount
  resultIdHashOrStableOpaqueId
  scoreOrRankSummary
  matchedMetadataKeysOnly
  rawContentReturned=false
  errorCodeIfAny
sideEffectCounters
patchedPathChecks
decision
```

Forbidden output:

- raw memory text
- raw chat history
- raw `.jsonl` lines
- secrets, tokens, env values, private keys, auth headers, cookies, or provider credentials
- broad result dumps
- raw titles, snippets, source files, durable paths, or direct store locations

If any raw content appears in execution output, the future execution must stop and record only the sanitized leakage label.

## Timeout And Error Handling

- Each query must use the runner's bounded timeout/error handling.
- Timeout is a `FAILED_NOT_READY` result, not a pass.
- Provider requirement, direct `.jsonl` requirement, raw content leakage, durable write attempt, query-count drift, query-text drift, or public MCP expansion is a hard boundary failure.

## Pass / Fail Labels

Allowed future CM-0825 execution labels:

- `CM0825_PATCHED_TRUE_LIVE_RECALL_PROOF_PASSED_NOT_READY`
- `CM0825_PATCHED_TRUE_LIVE_RECALL_PROOF_FAILED_NOT_READY`
- `CM0825_PATCHED_TRUE_LIVE_RECALL_PROOF_BOUNDARY_FAILED_NOT_READY`
- `CM0825_PATCHED_TRUE_LIVE_RECALL_PROOF_BLOCKED`

Even a passed proof must remain `NOT_READY`. A separate CM-0826 review is required before any blocker downgrade.

## No-Readiness Wording

This packet is approval preparation only.

It does not claim:

- `memory recall reliable`
- memory write reliable
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

Result: `CM0824_TRUE_LIVE_RECALL_PATCHED_PROOF_APPROVAL_PACKET_READY_NOT_RELIABLE_NOT_READY`.

`RC_NOT_READY_BLOCKED` remains.
