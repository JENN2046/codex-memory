# Recall Precision Hardening Bounded Review

Date: 2026-05-23
Task: `CM-0810`
Validation: `CMV-0929`
Reviewed implementation: `CM-0809`
Baseline reviewed: `8a5c7837c868fac696efe294fa2f8d129cb2b2b5`
Result: `RECALL_PRECISION_HARDENING_BOUNDED_REVIEW_COMPLETED_SYNCED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This review evaluates the bounded recall precision hardening implementation from `CM-0809`:

- `src/recall/RecallPrecisionPolicy.js`
- `src/recall/CandidateGenerator.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `tests/recall-precision-hardening-bounded.test.js`
- `docs/RECALL_PRECISION_HARDENING_BOUNDED_IMPLEMENTATION.md`

This review did not execute true live `search_memory`, did not execute `record_memory`, did not read raw memory content, did not read direct `.jsonl` or durable memory content, did not call a provider/model/API, did not write durable memory/audit state, did not expand public MCP, did not change package/config/watchdog/startup surfaces, did not run migration/import/export/backup/restore apply, did not run real rollback apply, and did not claim readiness or `memory recall reliable`.

## Preflight

- Branch: `main`
- Starting worktree: clean `main...origin/main`
- Starting local `HEAD`: `8a5c7837c868fac696efe294fa2f8d129cb2b2b5`
- Starting `origin/main`: `8a5c7837c868fac696efe294fa2f8d129cb2b2b5`
- Starting remote `refs/heads/main`: `8a5c7837c868fac696efe294fa2f8d129cb2b2b5`
- Prior implementation result: `RECALL_PRECISION_HARDENING_BOUNDED_IMPLEMENTED_SYNCED_NOT_READY`

## Review Verdict

CM-0809 is sufficient to enter a future exact-approved live negative-control proof recheck.

This is not approval to execute a live proof. It is not a reliability claim. It does not change the truth-table row to complete. The next live proof step still requires a separate exact approval and a fresh synced-state preflight.

## Required Judgments

| Question | Judgment | Evidence |
|---|---|---|
| Optional `precisionPolicyContext` default off | PASS | `KnowledgeBaseRecallPipeline.search()` accepts `precisionPolicyContext = null`, and `RecallPrecisionPolicy.evaluateCandidates()` returns `policy_disabled` unless `context.enabled` is truthy. |
| Public search behavior unchanged | PASS | The new precision path is internal and opt-in. Public MCP/search callers do not gain a public schema expansion, and the ordinary candidate filtering path remains unchanged when the context is absent. |
| Minimum score policy sufficient | PASS for bounded evidence | The default minimum score policy rejects low-confidence bounded negative-control candidates and is configurable by proof context. CM-0805 negative-control sanitized top scores remain below the CM-0809 default threshold, but this still requires future live proof before reliability can be inferred. |
| Positive-signal requirement sufficient | PASS for bounded evidence | Acceptance requires both minimum score and at least one positive signal such as lexical/tag/tagMemo/matched/core/evidence hits. Score alone is not enough. |
| Negative-control no-result mode sufficient | PASS for bounded evidence | Proof no-result mode returns zero accepted candidates for low-confidence/no-positive-signal candidates and fail-closes on high-confidence or positive-signal negative-control candidates. |
| Sanitized score distribution sufficient | PASS | Score distribution exposes counts, min/max/top score, bucket counts, and metadata keys only. It does not expose raw `content`, `text`, `snippet`, `title`, or path-like fields. |
| Raw/malformed metadata fail-closed sufficient | PASS | The policy rejects raw fields before evaluation and fail-closes on missing or malformed scoring metadata. The targeted tests cover missing-score and raw-title leakage; code also rejects non-finite, negative, and malformed array/count values. |
| Targeted hardening tests `5/5` cover core risks | PASS | Tests cover positive-control retention, low-confidence negative suppression, missing-score fail-closed behavior, raw-field fail-closed behavior, high-confidence negative-control fail-closed behavior, pipeline suppression before record fetch, and sanitized distribution shape. |
| Adjacent bounded recall tests did not regress | PASS | CM-0809 evidence records adjacent bounded recall tests passing `2/2`, `1/1`, and `1/1`; full `npm test` passed `1994/1994`. |
| Can enter live proof recheck | PASS | The bounded implementation can support a future exact approval recheck for post-hardening live negative-control proof. Recheck must precede any execution. |
| Can claim `memory recall reliable` | NO | There is no post-hardening true live negative-control proof yet, no live score-distribution review after hardening, and no truth-table completion evidence. |
| Truth table complete? | NO | The row remains `bounded evidence only` with `complete? = no`. |

## Remaining Gaps

- A post-hardening live negative-control proof has not been executed.
- Future live proof still requires a separate exact approval and execution-time preflight.
- Future proof must keep sanitized output only, complete zero side-effect counters, no raw memory, no direct `.jsonl`, no provider/model/API, and no durable memory/audit write.
- Thresholds and no-result behavior are bounded-evidence accepted, not live-corpus reliable.
- The controlling state remains `RC_NOT_READY_BLOCKED`.

## Decision

Result: `RECALL_PRECISION_HARDENING_BOUNDED_REVIEW_COMPLETED_SYNCED_NOT_READY`.

Next safe scope: prepare a future exact approval recheck for a post-hardening live negative-control proof. Do not execute that proof without a separate exact approval. Do not claim `memory recall reliable`, runtime readiness, RC readiness, production readiness, release readiness, or cutover readiness from CM-0809 or this review.
