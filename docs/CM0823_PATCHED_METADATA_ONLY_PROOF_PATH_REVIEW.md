# CM-0823 Patched Metadata-Only Proof Path Review

Status: `CM0823_PATCHED_METADATA_ONLY_PROOF_PATH_REVIEW_READY_FOR_PACKET_NOT_RELIABLE_NOT_READY`
Date: 2026-05-23
Branch reviewed: `codex/true-live-recall-raw-read-boundary`
Local review head: `8e8155a7449218c3dd1ccffab8a1db55cc39d7b0`
Remote feature branch head: `f9e7e13fbccbd46b6483863d4b966d653d5f755b`
Mainline baseline: `origin/main = remote refs/heads/main = 20e7a9d7b26b0f5cabb70a908c0ea7ce83c50712`
Decision: `RC_NOT_READY_BLOCKED`

## Scope

CM-0823 reviews the patched metadata-only proof path after CM-0820 and CM-0821.

The reviewed path is:

```text
TrueLiveRecallReadonlyProofRunner
-> TrueLiveRecallExecutorAdapter
-> createCodexMemoryApplication / search_memory
-> KnowledgeBaseRecallPipeline
```

This review does not merge the feature branch, does not create a PR, does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` or durable memory content, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Review Verdict

The patched metadata-only proof path is sufficient to enter a future CM-0824 exact approval packet.

Acceptance points:

- The runner constructs a sealed proof context with `readOnly=true`, `noProvider=true`, `noAudit=true`, `sanitizedOutput=true`, and `includeContent=false`.
- The runner calls its executor with `includeContent=false`, internal source `internal-true-live-recall-readonly-proof-runner`, and per-query precision policy context when provided.
- The executor adapter validates the sealed proof context before any app call.
- The executor adapter calls `search_memory` with `include_content=false`, `noTokenReadOnly=true`, `requestSource=internal-true-live-recall-readonly-proof-runner`, and `noRawContentRead=true`.
- The executor adapter scans upstream raw response results before runner projection and fails closed on raw `content`, `text`, `title`, `snippet`, `rawText`, `sourceFile`, `jsonlLine`, and path-like fields.
- `src/app.js` accepts `noRawContentRead=true` only for the approved internal runner path with `noTokenReadOnly=true`; public or non-approved injection fails closed before passive recall search.
- `KnowledgeBaseRecallPipeline` requires `noRawContentRead` to be boolean, `readOnly=true`, and `includeContent=false`.
- Under `noRawContentRead=true`, pipeline aggregation skips `shadowStore.getRecordsByIds`, does not read `record.rawText` or `record.content`, and returns metadata-only results without raw-derived `content`, `text`, `title`, `snippet`, or `sourceFile`.
- Existing side-effect counter evidence remains bounded and fixture-backed, but the runner / adapter / app / pipeline path is now coherent enough for approval-packet drafting.

## Targeted Evidence

Commands run for this review:

```text
node --check src\core\TrueLiveRecallReadonlyProofRunner.js
node --check src\core\TrueLiveRecallExecutorAdapter.js
node --check src\app.js
node --check src\recall\KnowledgeBaseRecallPipeline.js
node --check tests\true-live-recall-internal-proof-runner.test.js
node --check tests\true-live-recall-executor-adapter.test.js
node --check tests\true-live-recall-precision-policy-path.test.js
node --check tests\recall-precision-hardening-bounded.test.js
node --test tests\true-live-recall-internal-proof-runner.test.js
node --test tests\true-live-recall-executor-adapter.test.js
node --test tests\true-live-recall-precision-policy-path.test.js
node --test tests\recall-precision-hardening-bounded.test.js
```

Results:

- internal proof runner test passed `8/8`
- executor adapter test passed `7/7`
- approved app-path precision / noRawContentRead test passed `5/5`
- bounded precision pipeline test passed `9/9`

The evidence is local targeted evidence only. It does not execute true live recall against the current real store.

## Residual Risks

- CM-0820 is still not merged into `main`.
- CM-0823 reviews the path at local branch head `8e8155a...`; remote feature branch still points to `f9e7e13...`.
- Existing CM-0801 / CM-0814 `rawMemoryContentReads=0` evidence remains pre-patch sanitized-output boundary evidence.
- A future true live proof must be separately exact-approved and must explicitly use this patched metadata-only path before `rawMemoryContentReads=0` can support stronger no-raw-content-read evidence.
- This review is not enough to claim `memory recall reliable`, runtime readiness, RC readiness, release readiness, or production readiness.

## CM-0824 Packet Preconditions

CM-0824 may prepare an approval packet if it preserves these constraints:

1. Exact query count remains `4`.
2. Query text or query family is fixed before execution.
3. Execution must use `TrueLiveRecallReadonlyProofRunner` plus `TrueLiveRecallExecutorAdapter`.
4. Adapter must pass `noRawContentRead=true` through the approved internal app path.
5. App must pass `noRawContentRead=true` into `KnowledgeBaseRecallPipeline`.
6. Pipeline must run with `readOnly=true`, `includeContent=false`, and metadata-only aggregation.
7. Output must be sanitized counts, labels, opaque ids or hashes, scores, and metadata key names only.
8. Raw memory text, direct `.jsonl` reads, provider calls, durable memory writes, durable audit writes, public MCP expansion, package/config/watchdog/startup changes, tag/release/deploy/cutover, and readiness claims remain forbidden.

## Closeout

Result: `CM0823_PATCHED_METADATA_ONLY_PROOF_PATH_REVIEW_READY_FOR_PACKET_NOT_RELIABLE_NOT_READY`.

`memory recall reliable` remains not claimed. `RC_NOT_READY_BLOCKED` remains.
