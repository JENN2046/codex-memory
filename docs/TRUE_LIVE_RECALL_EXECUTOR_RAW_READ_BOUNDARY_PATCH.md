# True Live Recall Executor Raw Read Boundary Patch

Status: `TRUE_LIVE_RECALL_EXECUTOR_RAW_READ_BOUNDARY_PATCHED_LOCAL_NOT_READY`
Date: 2026-05-23
Task: `CM-0820`
Decision: `RC_NOT_READY_BLOCKED`
Branch: `codex/true-live-recall-raw-read-boundary`

## Purpose

This patch responds to the remote-update review finding that the true live recall executor adapter could silently project away upstream raw fields, and that previous `rawMemoryContentReads=0` proof wording did not have a strong enough code-level boundary because the normal recall aggregation path can read `record.rawText || record.content` even when `includeContent=false`.

The patch does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, and does not claim `memory recall reliable`.

## Runtime Patch

Changed files:

- `src/core/TrueLiveRecallExecutorAdapter.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/app.js`

Boundary changes:

- The executor adapter now scans raw `search_memory` response results before projection.
- Upstream raw fields such as `content`, `text`, `title`, `snippet`, `rawText`, `sourceFile`, `jsonlLine`, and path-like fields now fail closed with `executor_adapter_sanitization_failed`.
- The adapter no longer treats sanitized projection as proof that no raw executor leakage occurred.
- The adapter sends an internal-only `executionContext.noRawContentRead=true` flag to the approved runner path.
- `src/app.js` accepts `noRawContentRead` only when `noTokenReadOnly=true` and `requestSource=internal-true-live-recall-readonly-proof-runner`.
- Public or non-approved injected `noRawContentRead` fails before passive recall search.
- `KnowledgeBaseRecallPipeline` now supports metadata-only aggregation for `noRawContentRead=true`.
- Metadata-only aggregation skips `shadowStore.getRecordsByIds`, does not read `record.rawText` / `record.content`, and does not emit raw-derived `title`, `sourceFile`, `snippet`, `text`, or `content`.
- Direct pipeline use of `noRawContentRead` now requires a boolean flag, `readOnly=true`, and `includeContent=false`.

## Evidence Reinterpretation

Earlier CM-0801 and CM-0814 evidence remains useful as bounded sanitized-output proof evidence, but its `rawMemoryContentReads=0` counter should not be over-read as a fully verified no-raw-content-read boundary before this patch.

After this patch, a future exact-approved true live proof can make `rawMemoryContentReads=0` meaningful only if it runs through the patched adapter and the internal `noRawContentRead=true` metadata-only pipeline path.

This patch itself is local source/test evidence only. It does not replay CM-0801, CM-0814, or any true live proof.

## Targeted Validation

Required validation for this patch:

```text
node --check src\core\TrueLiveRecallExecutorAdapter.js
node --check src\recall\KnowledgeBaseRecallPipeline.js
node --check src\app.js
node --check tests\true-live-recall-executor-adapter.test.js
node --check tests\true-live-recall-precision-policy-path.test.js
node --check tests\true-live-recall-internal-proof-runner.test.js
node --check tests\recall-precision-hardening-bounded.test.js
node --test tests\true-live-recall-executor-adapter.test.js
node --test tests\true-live-recall-precision-policy-path.test.js
node --test tests\true-live-recall-internal-proof-runner.test.js
node --test tests\recall-precision-hardening-bounded.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Expected targeted coverage:

- upstream raw executor fields fail closed before adapter sanitization
- adapter success path forwards `noRawContentRead=true`
- approved app path forwards `noRawContentRead` to passive recall
- non-approved `noRawContentRead` injection fails closed before passive recall
- pipeline metadata-only proof mode returns no raw-derived fields and avoids raw record fetch
- direct pipeline `noRawContentRead` misuse fails closed before sync, record read, or audit write
- existing exact approval, exact query count, no-provider, no-audit, no durable write, and timeout-adjacent runner behavior remains covered by the existing internal runner targeted test

## Closeout

Result: `TRUE_LIVE_RECALL_EXECUTOR_RAW_READ_BOUNDARY_PATCHED_LOCAL_NOT_READY`.

`memory recall reliable` remains not claimed. `RC_NOT_READY_BLOCKED` remains.
