# Recall Precision Post-hardening Live Negative-Control Proof Review

Date: 2026-05-23
Task: `CM-0815`
Validation: `CMV-0934`
Reviewed evidence:

- `docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION.md`
- `docs/RECALL_PRECISION_POST_HARDENING_EXACT_APPROVAL_RECHECK.md`
- `docs/CM0774_SECOND_NEGATIVE_CONTROL_FAILURE_REVIEW.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`

Result: `RECALL_BLOCKER_ROUND_3_NEGATIVE_CONTROL_BLOCKER_DOWNGRADED_NOT_RELIABLE_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This review analyzes only existing sanitized evidence from the post-hardening live negative-control proof. It does not execute a new true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Sanitized Success Evidence

CM-0814 expected all four stricter negative-control slots to return `resultCount=0`. All four returned zero sanitized counts.

| Slot | Query family | Expected result count | Actual result count | Top opaque id hash | Top score | Raw content returned | Error |
|---|---|---:|---:|---|---:|---|---|
| NC1 / Q1 | `stricter_negative_control` | 0 | 0 | none | none | `false` | none |
| NC2 / Q2 | `stricter_negative_control` | 0 | 0 | none | none | `false` | none |
| NC3 / Q3 | `stricter_negative_control` | 0 | 0 | none | none | `false` | none |
| NC4 / Q4 | `stricter_negative_control` | 0 | 0 | none | none | `false` | none |

No matched metadata keys were emitted because no results were returned.

## Boundary Review

The runner / adapter / side-effect boundary passed:

- Runner decision was `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`.
- `rawContentReturned=false`.
- Provider calls were `0`.
- Direct `.jsonl` reads were `0`.
- Durable memory writes were `0`.
- Durable audit writes were `0`.
- Candidate cache writes/flushes, sync calls, vector flushes, embedding cache writes, raw memory content reads, and public MCP expansion were all `0`.

This means the post-hardening zero-result success is not explained by raw leakage, direct durable-store reads, provider/API/model calls, or hidden durable writes.

## Review Decision

The prior CM-0806 negative-control suppression blocker is downgraded for this exact proof shape.

Conservative classification:

- The fresh CM-0814 evidence resolves the exact CM-0803 / CM-0806 zero-result acceptance criterion for the approved NC1-NC4 query set under `precisionPolicyContext.enabled=true` and `proofNoResultMode=true`.
- The review therefore no longer classifies that specific stricter negative-control suppression issue as an active open blocker for this exact proof path.
- `memory recall reliable` still remains not claimed.
- Truth table still remains `complete? = no`.
- `memory recall reliable` still remains `bounded evidence only`.
- `RC_NOT_READY_BLOCKED` remains.

## Residual Limits And Risks

The evidence is still narrower than a full reliability closure:

- It is one separately approved live proof run with one exact negative-control query family and sanitized output only.
- This review still cannot inspect raw memory text, `.jsonl`, tokenization traces, or broader corpus behavior by design.
- The current internal proof runner still labels its internal exact-approval token surface as `CM-0774`; the operator approval for this run was CM-0814-specific and narrower in scope. That is governance/traceability drift to clean up later, not a recall-quality regression shown by this run.
- The execution baseline was a clean local `main` head `17500cff8633d25b69067897686d3810df52e75c` after an operator-approved local commit, while `origin/main` and remote `main` remained at `8a1d36f33e7ca115966e4a7d18b7daf4112e5d4d`. This evidence must not be described as synced-main proof.

## Decision Table

| Question | Decision |
|---|---|
| Did NC1/NC2/NC3/NC4 each return zero counts? | Yes. All four returned `0`. |
| Did runner / adapter / side-effect boundary pass? | Yes. Sanitized output only; complete counters all `0`. |
| Is the prior CM-0806 exact negative-control suppression blocker still open for this exact proof shape? | No. This run resolves that exact zero-result criterion. |
| Does this prove broad `memory recall reliable`? | No. Evidence is still bounded and exact-query-shape-specific. |
| Can truth-table row change to `complete? = yes`? | No. |
| Can runtime ready / RC ready / production ready / release ready / cutover ready be claimed? | No. |
| Controlling state | `RC_NOT_READY_BLOCKED` remains. |

## Decision

`RECALL_BLOCKER_ROUND_3_NEGATIVE_CONTROL_BLOCKER_DOWNGRADED_NOT_RELIABLE_NOT_READY`

The post-hardening live negative-control proof succeeds for the exact approved NC1-NC4 query set and downgrades the prior recall precision blocker from an active suppression failure to bounded accepted evidence for this narrow proof shape. It still does not prove `memory recall reliable`, does not make the truth table complete, and does not change `RC_NOT_READY_BLOCKED`.
