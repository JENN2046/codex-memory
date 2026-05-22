# Recall Precision Hardening Bounded Implementation

Date: 2026-05-23

Task: `CM-0809`

Validation: `CMV-0928`

Inputs:

- `docs/RECALL_PRECISION_HARDENING_PLAN.md`
- `docs/RECALL_PRECISION_HARDENING_PLAN_REVIEW.md`
- `docs/CM0774_SECOND_NEGATIVE_CONTROL_FAILURE_REVIEW.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `src/recall/*`
- `tests/*recall*`

Result: `RECALL_PRECISION_HARDENING_BOUNDED_IMPLEMENTED_SYNCED_NOT_READY`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This is a bounded implementation/test hardening slice. It does not execute a new true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Implementation

Added `src/recall/RecallPrecisionPolicy.js` as an internal precision policy helper.

The helper provides:

- retrieval threshold strategy through `minimumScore`
- negative-control gating through `proofNoResultMode`
- minimum score policy with positive-signal requirement
- sanitized score distribution summary
- no-result mode for stricter negative-control bounded tests
- stricter filter / exact negative-control reject behavior
- fail-closed handling for missing, malformed, non-finite, negative, raw-field, and high-confidence negative-control metadata

Updated `src/recall/CandidateGenerator.js` to attach sanitized `precision` metadata to candidates. The metadata contains scores, matched-tag arrays, and hit counts only; it does not include raw content, text, snippet, title, file path, or `.jsonl` location.

Updated `src/recall/KnowledgeBaseRecallPipeline.js` to accept optional internal `precisionPolicyContext`. The default remains disabled, preserving current public search behavior unless an internal caller explicitly enables the policy.

When enabled, the policy runs after candidate finalization/rerank and before aggregation. This allows negative-control bounded tests to suppress low-confidence candidates before synthetic record fetch, while positive-control bounded tests can still return expected records.

## Targeted Tests

Added `tests/recall-precision-hardening-bounded.test.js`.

Coverage:

- positive-control metadata is accepted
- low-confidence negative-control metadata is rejected
- missing metadata fails closed
- raw leakage into the policy fails closed
- no-result mode fails closed on high-confidence negative-control candidates
- pipeline positive-control still returns the expected bounded record
- pipeline negative-control returns zero results before record fetch
- sanitized score distribution exposes counts and metadata keys only
- no provider, no `.jsonl`, no durable memory/audit write, and no live memory tool call is used by the test harness

## Validation

Passed:

- `node --check src\recall\RecallPrecisionPolicy.js`
- `node --check src\recall\CandidateGenerator.js`
- `node --check src\recall\KnowledgeBaseRecallPipeline.js`
- `node --check tests\recall-precision-hardening-bounded.test.js`
- `node --test tests\recall-precision-hardening-bounded.test.js` (`5/5`)
- `node --test tests\memory-recall-reliability-bounded-evidence.test.js` (`2/2`)
- `node --test tests\memory-recall-temp-workspace-evidence.test.js` (`1/1`)
- `node --test tests\memory-recall-limited-local-real-path-evidence.test.js` (`1/1`)
- `npm test` (`1994/1994`)

## Remaining Boundary

This implementation is bounded fixture/temp/local evidence only.

It does not prove true live recall reliability. It does not close the `memory recall reliable` blocker, does not change any truth-table row to `complete? = yes`, and does not authorize a third live query.

Future movement still requires a separate bounded implementation review and, before any true live proof, a separate exact approval.

## Decision

`RECALL_PRECISION_HARDENING_BOUNDED_IMPLEMENTED_SYNCED_NOT_READY`

`memory recall reliable` remains not claimed. `RC_NOT_READY_BLOCKED` remains.
