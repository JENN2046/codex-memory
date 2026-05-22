# Recall Precision Hardening Plan Review

Date: 2026-05-23

Task: `CM-0808`

Validation: `CMV-0927`

Reviewed plan: `docs/RECALL_PRECISION_HARDENING_PLAN.md`

Baseline: `c778a6f5a412e583e7131b18027deb265a8c520b`

Result: `RECALL_PRECISION_HARDENING_PLAN_REVIEW_COMPLETED_SYNCED_NOT_READY`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This is a review and next-implementation-plan packet for CM-0807. It does not execute a new true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Preflight

- Local branch was `main`.
- Initial worktree status was clean: `## main...origin/main`.
- `HEAD`, `origin/main`, and remote `refs/heads/main` all resolved to `c778a6f5a412e583e7131b18027deb265a8c520b`.
- Search confirmed `RECALL_PRECISION_HARDENING_PLAN_COMPLETED_SYNCED_NOT_READY` is already recorded in the plan, status, backlog, truth table, and board surfaces.

Because the hardening plan already exists and is synced, this task reviews CM-0807 and selects the next implementation path instead of rebuilding the plan.

## Plan Review Verdict

CM-0807 is sufficient to proceed to bounded implementation and tests.

It correctly identifies the precision gap:

- `CandidateGenerator.rankChunks()` currently keeps any candidate with `candidate.score > 0`.
- `CandidateGenerator.scoreChunk()` combines vector, lexical, TagMemo, structural, context, diary, and source-bias signals, but no minimum accepted score or no-result proof gate is enforced there.
- `KnowledgeBaseRecallPipeline` can aggregate and pass low-confidence candidates forward.
- `RecallEnhancer.enhance()` deduplicates, optionally reranks/groups, sorts, and slices, but does not impose a low-confidence no-result gate.
- The read-only proof path suppresses audit/write side effects, but it does not change recall precision behavior.

This matches CM-0806: runner/adapter/side-effect boundaries passed, but negative-control suppression failed with NC1=3, NC2=2, NC3=3, and NC4=2.

## Implementation Versus Further Review

The next safe step should be bounded implementation/tests, not another plan-only review and not a third live query.

Implementation should remain internal and minimal:

- No public MCP schema expansion.
- No default readiness wording.
- No provider/API/model calls.
- No raw memory or direct `.jsonl` read.
- No durable memory/audit write.
- No live proof until bounded evidence is reviewed and a later exact approval is supplied.

## Recommended Implementation Sequence

1. Add a small internal recall precision policy helper, for example `src/recall/RecallPrecisionPolicy.js` or an equivalent local helper.
2. Feed the policy sanitized candidate metadata only: `score`, `baseScore`, `rerankScore`, score component names, matched tag counts, hit counts, query family, and proof context.
3. Add unit tests proving irrelevant low-confidence candidates are rejected and expected synthetic recall remains accepted.
4. Add candidate-generator or pipeline fixture tests proving negative-control fixture queries return zero after policy gating.
5. Add RecallEnhancer or pipeline tests proving dedup/rerank cannot reintroduce rejected below-threshold candidates.
6. Add internal runner/adapter fixture tests for `proofNoResultMode` so missing, partial, or malformed precision metadata fails closed.
7. Only after unit/fixture tests pass, consider an isolated temp/local bounded recall test with synthetic records and sanitized score distribution output.
8. After bounded hardening review, prepare a separate exact-approval recheck for any future true live proof.

## Bounded Verification Matrix

Allowed before any live proof:

- Unit precision policy tests with synthetic candidates.
- Candidate-generator fixture tests.
- Pipeline fixture tests with synthetic temp records.
- RecallEnhancer or aggregate-result fixture tests.
- Internal runner/adapter no-result-mode fixture tests.
- Sanitized score distribution review from fixtures or isolated temp/local bounded tests.

Still blocked without separate exact approval:

- Third-round true live negative-control proof.
- True live `search_memory`.
- True live `record_memory`.
- Raw memory or direct `.jsonl` inspection.
- Durable memory/audit writes.
- Provider/model/API calls.

## Pass / Fail Labels For Next Batch

Allowed next implementation labels:

- `RECALL_PRECISION_HARDENING_IMPLEMENTED_BOUNDED_NOT_READY`
- `RECALL_PRECISION_HARDENING_NEEDS_PATCH`
- `RECALL_PRECISION_HARDENING_BLOCKED`
- `RECALL_PRECISION_LIVE_PROOF_READY_FOR_EXACT_APPROVAL`

Forbidden as next-batch conclusions:

- `memory recall reliable`
- `RC_READY`
- `RELEASE_READY`
- `PRODUCTION_READY`
- `CUTOVER_READY`
- any `complete? = yes` truth-table change for recall reliability

## Decision

`RECALL_PRECISION_HARDENING_PLAN_REVIEW_COMPLETED_SYNCED_NOT_READY`

The next safe scope is bounded recall precision hardening implementation and targeted tests. The project remains `RC_NOT_READY_BLOCKED`; `memory recall reliable` remains not claimed; the truth-table row remains bounded evidence only and `complete? = no`.
