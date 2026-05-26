# CM-1109 Proof Memory Pollution Prevention Source Review

Date: 2026-05-25
Task: `CM-1109`
Result: `CM1109_PROOF_MEMORY_POLLUTION_PREVENTION_SOURCE_REVIEW_COMPLETED_SOURCE_TEST_BACKED_NOT_LIVE_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This review checks whether the existing source and tests support proof-memory pollution prevention for CM-1100-style `internal_proof` writes.

This review does not approve or execute CM-1107. It does not execute `record_memory`, does not execute `search_memory`, does not execute `memory_overview`, does not read raw memory content, does not read raw store/audit/diary data, does not read `.jsonl`, does not perform a metadata store read, does not call providers, does not write durable memory or audit state, does not apply retention/tombstone/cleanup/rollback/migration work, does not start a worker, does not expand public MCP, does not change config/watchdog/startup/package state, does not push/tag/release/deploy/cutover, and does not claim readiness or reliability.

## Reviewed Source

| Source | Relevant behavior | Review |
|---|---|---|
| `src/core/ProofMemoryPolicy.js` | `applyProofMemoryWritePolicy(...)` maps explicit proof-retention payloads to `visibility="internal_proof"`, `retentionPolicy="short_lived_or_tombstone_after_validation"`, and tag `proof`. | supports proof namespace |
| `src/core/ProofMemoryPolicy.js` | `buildProofMemoryRecallFilters(...)` adds `visibilityExclude=["internal_proof"]` unless the caller explicitly asks for `visibility=["internal_proof"]`. | supports default suppression |
| `src/recall/KnowledgeBaseRecallPipeline.js` | Candidate generation always receives `buildProofMemoryRecallFilters(candidateFilters)`. | connects suppression to recall pipeline |
| `src/storage/SqliteShadowStore.js` | `buildChunkQuery(...)` implements `visibilityExclude` with a `NOT EXISTS` guard against matching `memory_records.visibility`. | supports SQL candidate exclusion |
| `src/core/constants.js` | Public `record_memory.visibility` enum remains `private/workspace/project/shared`; public `search_memory.scope.visibility` enum also excludes `internal_proof`. | keeps proof namespace out of public schema |

## Reviewed Tests

| Test | Existing coverage | Review |
|---|---|---|
| `tests/proof-memory-policy.test.js` | Verifies proof-retention writes normalize into `internal_proof` and short proof retention. | covered |
| `tests/proof-memory-policy.test.js` | Verifies default proof-memory recall filters add `visibilityExclude=["internal_proof"]`. | covered |
| `tests/proof-memory-policy.test.js` | Uses a temp-local app to write proof memory, confirms normal recall does not return it, and explicit internal-proof visibility recall can return it. | temp-local covered |
| `tests/proof-memory-policy.test.js` | Verifies public MCP tool schemas do not expose `proof_memory`, `include_proof_memory`, or `internal_proof` visibility enum values. | covered |

These tests were inspected as existing evidence in this review; CM-1109 did not rerun them.

## Current CM-1100 Chain Interpretation

For the accepted CM-1100 proof memory:

```text
memory_id=codex-process-50325be15fdb479d805728fe420b4838
visibility=internal_proof
retention_policy=short_lived_or_tombstone_after_validation
```

The source and tests support a narrow conclusion:

- CM-1100-style proof memory is intended to be segregated under `internal_proof`.
- Normal recall should exclude `internal_proof` by default through the candidate filter path.
- Public schema does not provide a normal user-facing way to request `internal_proof` visibility.

This is source/test-backed pollution-prevention evidence only.

## Remaining Gaps

Still missing:

- no true live public/default `search_memory` suppression verification for the exact CM-1100 memory id
- no approved CM-1107 execution result
- no restart or long-run durability proof for suppression
- no retention/tombstone apply safety
- no cleanup/rollback apply safety
- no proof-memory automatic expiry worker evidence
- no broad proof-memory corpus scan
- no public/default write reliability
- no `memory write reliable`
- no `memory recall reliable`

## Decision

`CM1109_PROOF_MEMORY_POLLUTION_PREVENTION_SOURCE_REVIEW_COMPLETED_SOURCE_TEST_BACKED_NOT_LIVE_NOT_READY`

Allowed narrow interpretation:

- There is source/test-backed evidence that `internal_proof` memory is excluded from normal recall by default.
- This reduces the governance pollution concern for the CM-1100 proof memory at the source/test level.

Forbidden interpretation:

- Do not treat this as live public/default recall suppression proof for the exact CM-1100 memory id.
- Do not treat this as CM-1107 execution.
- Do not claim `memory write reliable`.
- Do not claim `memory recall reliable`.
- Do not set truth-table `complete? = yes`.
- Do not claim runtime, RC, production, release, or cutover readiness.

## Next Safe Local Task

The next safe local task is either:

- wait for separate exact approval before any CM-1107 execution, or
- draft a CM-1110 no-execution proof-memory lifecycle suppression and retention-apply gap review.

No `record_memory`, `search_memory`, `memory_overview`, raw/store/audit read, metadata store read, retention/tombstone/cleanup/rollback apply, provider/API call, public MCP expansion, config/watchdog/startup/package change, push/tag/release/deploy/cutover, or readiness/reliability claim is authorized by CM-1109.
