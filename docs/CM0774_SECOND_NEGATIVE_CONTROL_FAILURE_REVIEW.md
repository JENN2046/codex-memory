# CM0774 Second Negative-Control Failure Review

Date: 2026-05-22

Task: `CM-0806`

Validation: `CMV-0925`

Reviewed evidence:

- `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_EXECUTION.md`
- `docs/TRUE_LIVE_RECALL_PROOF_REVIEW.md`
- `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN.md`
- `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_EXACT_APPROVAL_RECHECK.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`

Result: `CM0774_RECALL_PRECISION_HARDENING_REQUIRED`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This review analyzes only existing sanitized evidence from the second stricter negative-control proof failure. It does not execute a new true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Sanitized Failure Evidence

CM-0805 expected all four stricter negative-control slots to return `resultCount=0`. All four returned nonzero sanitized counts.

| Slot | Query family | Expected result count | Actual result count | Top opaque id hash | Top score | Raw content returned | Error |
|---|---|---:|---:|---|---:|---|---|
| NC1 / Q1 | `stricter_negative_control` | 0 | 3 | `2e5ef202f9aa0e19` | `0.098152` | `false` | none |
| NC2 / Q2 | `stricter_negative_control` | 0 | 2 | `2e5ef202f9aa0e19` | `0.018801` | `false` | none |
| NC3 / Q3 | `stricter_negative_control` | 0 | 3 | `3c31bd1d9dcfbc75` | `0.058401` | `false` | none |
| NC4 / Q4 | `stricter_negative_control` | 0 | 2 | `6e9d03ef0c958dfe` | `0.075486` | `false` | none |

The matched metadata key names were limited to sanitized keys: `baseScore`, `coreTagsCount`, `createdAtDateOnly`, `matchedTagsCount`, `memoryId`, `rerankScore`, `score`, `sourceKinds`, `target`, and `updatedAtDateOnly`.

## Boundary Review

The runner / adapter / side-effect boundary passed:

- Runner decision was `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`.
- `rawContentReturned=false`.
- Provider calls were `0`.
- Direct `.jsonl` reads were `0`.
- Durable memory writes were `0`.
- Durable audit writes were `0`.
- Candidate cache writes/flushes, sync calls, vector flushes, embedding cache writes, raw memory content reads, and public MCP expansion were all `0`.

This means the failure is not a runner boundary failure, raw leakage, direct durable-store read, provider/API/model call, or durable write failure.

## Failure Classification

Negative-control suppression failed.

The failure should be treated as a recall precision blocker because four independent improbable negative-control strings all returned nonzero sanitized candidates. The allowed evidence does not prove the exact cause because this review cannot inspect raw result text, raw memory content, `.jsonl`, tokenization traces, or provider internals. Still, the sanitized counts and scores are enough to show the current query path admits low-score or broad-match candidates for irrelevant inputs.

Conservative classification:

- `memory recall reliable` remains not claimed.
- Truth table remains `complete? = no`.
- `memory recall reliable` remains `bounded evidence only`.
- `RC_NOT_READY_BLOCKED` remains.
- Direct third-round live querying is not the next safe step.

## Required Hardening Direction

Recall precision hardening is required before any further exact-approved negative-control live proof.

The next local-safe scope should be a planning/review task that evaluates, without raw memory reads or new live queries:

- Retrieval threshold policy for negative-control or low-confidence inputs.
- Negative-control gating that can produce deterministic no-result behavior for improbable strings.
- Minimum score policy using sanitized score distributions.
- No-result mode or stricter filter behavior for proof contexts.
- Exact negative-control reject policy that fails closed when all candidates are below an approved confidence threshold.
- A targeted test plan using synthetic fixtures before any additional true live query is considered.

## Decision Table

| Question | Decision |
|---|---|
| Did NC1/NC2/NC3/NC4 each return nonzero counts? | Yes. Counts were `3`, `2`, `3`, and `2`. |
| Did runner / adapter / side-effect boundary pass? | Yes. Sanitized output only; complete counters all `0`. |
| Did negative-control suppression pass? | No. Every slot failed the zero-result criterion. |
| Is this a recall precision blocker? | Yes, conservatively. |
| Need retrieval threshold / negative-control gating / minimum score policy review? | Yes. |
| Need sanitized score distribution review? | Yes, using sanitized scores only. |
| Need no-result mode / stricter filter / exact negative-control reject policy? | Yes, as a planning and targeted-test scope. |
| Need recall precision hardening plan first? | Yes. |
| Is direct third-round live query allowed as next step? | No. It would repeat live querying before hardening the failed precision boundary. |
| Can `memory recall reliable` be claimed? | No. |
| Can truth-table row change to `complete? = yes`? | No. |
| Controlling state | `RC_NOT_READY_BLOCKED` remains. |

## Decision

`CM0774_RECALL_PRECISION_HARDENING_REQUIRED`

The second stricter negative-control proof failure is cleanly bounded and sanitized, but it is still a real precision/suppression blocker. The next safe step is a recall precision hardening plan, not another live proof execution.
