# True Live Recall Proof Review

Date: 2026-05-22

Task: `CM-0802`

Validation: `CMV-0921`

Baseline: `322f4f18634528ac682de1abb23bee9c73d05b28`

Reviewed evidence: `docs/CM0774_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION.md`

Result: `TRUE_LIVE_RECALL_PROOF_REVIEW_NEEDS_SECOND_NEGATIVE_CONTROL`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This review evaluates CM-0801 true live real-store recall proof evidence. It does not execute a new true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Evidence Summary

CM-0801 executed exactly four fixed queries through `TrueLiveRecallReadonlyProofRunner` and the approved internal adapter path. The runner decision was `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`.

| Slot | Expected role | Sanitized result count | Review finding |
|---|---|---:|---|
| Q1 | Current project status / mainline memory spine state | 3 | Supports expected recall at sanitized evidence level. |
| Q2 | Memory recall evidence ladder / bounded evidence progression | 3 | Supports expected recall at sanitized evidence level. |
| Q3 | Blocker / not-ready / no-overclaim status | 2 | Supports expected recall at sanitized evidence level. |
| Q4 | Negative control | 2 | Does not support negative-control suppression; needs follow-up. |

All CM-0801 side-effect counters were complete and zero, and `rawContentReturned=false` was recorded. The review found no runner/adapter boundary failure in the sanitized evidence.

## Q4 Negative-Control Assessment

Q4 was `negative-control-zeta-7194-nonexistent-memory-spine-token` and returned `2` sanitized results.

Risk level: `medium`.

Rationale:

- This is not a raw-output or side-effect failure. The output remained sanitized and complete zero side-effect counters were present.
- This is not enough to prove a tokenizer-only cause. The review cannot inspect raw result text, tokenization traces, or underlying memory content within the allowed scope.
- This is not enough to prove a semantic broad-match-only cause. The top scores and metadata keys are sanitized only, and the review cannot see whether the returned records were actually relevant.
- This is a recall precision and negative-control design risk. A deliberately unlikely query returning nonzero results means the proof does not demonstrate irrelevant-query suppression against the real store.

Conservative classification: Q4 exposes a combined negative-control criteria / query-design / recall-precision gap. It should be treated as a blocker to closing `memory recall reliable` until reviewed by a stricter, separately exact-approved negative-control proof.

## Required Follow-Up

A second exact-approved negative-control proof is needed before the recall blocker can be closed or downgraded further.

Minimum recommended criteria:

- Use one or more fixed negative-control strings that are independently improbable and do not contain project-domain terms such as `memory`, `spine`, `blocker`, `recall`, or `proof`.
- Keep the run through the same internal proof runner / approved adapter path.
- Preserve complete zero side-effect counters.
- Preserve sanitized output only.
- Require resultCount `0` for the negative-control slot, or define an explicit fail label if the result count is nonzero.
- Do not read raw memory content or direct `.jsonl` content.
- Do not claim readiness or reliability even if the second negative-control passes; require a separate proof review and truth-table update.

## Decisions

| Question | Decision |
|---|---|
| Do Q1/Q2/Q3 support expected recall? | Yes, at sanitized evidence level only. |
| Does Q4 returning 2 sanitized results fail the runner boundary? | No. |
| Does Q4 returning 2 sanitized results close the recall-quality gap? | No. |
| Is the likely issue tokenizer, semantic broad match, query design, or precision? | Cannot isolate without forbidden raw evidence; classify as combined negative-control criteria / query-design / recall-precision risk. |
| Improve negative-control criteria? | Yes. |
| Need second exact-approved negative-control proof? | Yes. |
| Can `memory recall reliable` blocker close now? | No. |
| Truth-table update? | Keep `memory recall reliable` as `bounded evidence only`, `complete? = no`. |
| Controlling state? | `RC_NOT_READY_BLOCKED` remains. |

## Decision

`TRUE_LIVE_RECALL_PROOF_REVIEW_NEEDS_SECOND_NEGATIVE_CONTROL`

CM-0801 is valuable evidence that the exact-approved runner/adapter path can execute true live real-store recall with sanitized output and complete zero side-effect counters. It is not sufficient to prove `memory recall reliable`, because the negative-control slot returned two sanitized results and still needs a stricter exact-approved negative-control proof.
