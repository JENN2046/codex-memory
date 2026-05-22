# Memory Recall True Live Real-Store Proof Approval Packet

Status: `MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Scope: exact approval packet only; no true live execution in this slice
Entry evidence: `MEMORY_RECALL_LIMITED_LOCAL_REAL_PATH_EVIDENCE_REVIEW_COMPLETED_SYNCED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

This packet prepares a future exact approval unit for true live real-store recall reliability proof.

It does not approve execution by itself. It does not execute true live `search_memory`, read real user memory, read `.jsonl`, call providers, write durable memory/audit state, or claim memory recall reliability.

## Entry Conditions

A future execution may proceed only if all are true at execution time:

- This packet is present on local `main`, tracking `origin/main`, and remote `refs/heads/main`.
- The future operator gives a separate explicit approval naming this packet and the exact execution label.
- Worktree is clean before execution.
- The execution can be performed without provider/model/API calls.
- The execution can be performed without direct `.jsonl` or durable memory file reads.
- The execution can be performed without durable memory/audit writes.
- `RC_NOT_READY_BLOCKED` remains the controlling state before and after the proof.

## Proposed Future Exact Approval Line

```text
I approve MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION_ONCE for codex-memory at the current synced main head, limited to exactly four read-only true live search_memory calls against the current local codex-memory real store, using the query-family and output boundaries in docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md, with no provider call, no direct .jsonl read, no durable memory/audit write, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness claim.
```

Any missing, edited, bundled, or broader approval must fail closed.

## Exact Future Execution Boundary

| field | required value |
|---|---|
| true live `search_memory` allowed? | only after the separate exact approval line above; not allowed by this packet alone |
| exact query count | `4` |
| target store boundary | current local codex-memory real store reachable through the existing `search_memory` tool path only |
| direct store file reads | forbidden |
| direct `.jsonl` audit/durable memory reads | forbidden |
| provider/model/API calls | forbidden |
| durable memory/audit writes | forbidden |
| migration/import/export/backup/restore apply | forbidden |
| public MCP expansion | forbidden |
| config/watchdog/startup changes | forbidden |
| output | sanitized summary only |
| readiness claim | forbidden |

## Query Family

The future execution must use exactly four operator-visible query-family slots. The slots are intentionally semantic rather than raw memory-content dependent:

| slot | query family | purpose |
|---|---|---|
| Q1 | current project status / mainline memory spine state | prove a real-store recall can return a relevant high-level project-state hit without raw content output |
| Q2 | memory recall evidence ladder / bounded evidence progression | prove recall can find the recent recall-evidence chain at a metadata level |
| Q3 | blocker / not-ready / no-overclaim status | prove recall can surface the current blocker posture without claiming readiness |
| Q4 | deliberately unlikely negative-control phrase selected by the operator | prove an irrelevant query produces zero or clearly bounded irrelevant output |

If the future operator wants literal query text instead of these families, it must be supplied in the future approval and must still preserve exact query count `4`.

## Allowed Output Shape

The future execution may report only sanitized evidence:

```text
taskId
baselineCommit
queryCount
queryFamiliesUsed
perQuery:
  querySlot
  elapsedMs
  resultCount
  topResultIdHashOrStableOpaqueId
  topResultScoreIfAvailable
  matchedMetadataKeysOnly
  rawContentReturned=false
  errorCodeIfAny
sideEffectCounters:
  providerCalls=0
  directJsonlReads=0
  durableMemoryWrites=0
  durableAuditWrites=0
decision
```

Forbidden output:

- raw memory text
- raw chat history
- raw `.jsonl` lines
- secrets, tokens, env values, private keys, auth headers, cookies, or provider credentials
- broad result dumps
- screenshots or transcripts containing raw memory content

## Redaction And Sanitization Rule

All result identifiers must be hashed, truncated, or represented as stable opaque IDs unless the ID is already non-sensitive and checked into public project docs. Result content must not be printed. Metadata may be limited to counts, booleans, score numbers, timestamps rounded to date, and safe category names.

If any raw content appears in tool output, the future execution must stop and report only that sanitized leakage occurred.

## Timeout And Error Handling

- Each future query should use the existing bounded timeout/error path where available.
- Timeout must be recorded as `SEARCH_MEMORY_TIMEOUT` or the current equivalent bounded error code.
- A timeout is not a pass.
- Provider requirement, direct `.jsonl` requirement, raw content leakage, durable write attempt, or broad-scan requirement is a hard failure.

## Pass / Fail Labels

Allowed future execution labels:

- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`
- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_FAILED_NOT_READY`
- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_BOUNDARY`
- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_SCOPE_DRIFT`

Even a passed proof must remain `NOT_READY` unless a separate later review updates the truth table with stronger evidence and no overclaim.

## Rollback / Cleanup Policy

No rollback or cleanup operation is expected because the future proof must be read-only and must not write durable memory/audit state.

If any mutation or durable write is detected, stop immediately. Do not run cleanup, migration, restore, backup, or rollback apply unless separately exact-approved.

## No-Readiness Wording

This packet is approval preparation only.

It does not claim:

- `memory recall reliable`
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

`RC_NOT_READY_BLOCKED` remains.

Result: `MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET_COMPLETED_SYNCED_NOT_READY`.

