# CM-0826 Recall Reliability Blocker Review Criteria

Status: `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_CRITERIA_PREPARED_NOT_REVIEWED_NOT_READY`
Date: 2026-05-23
Scope: review criteria only; no CM-0825 proof evidence exists in this slice
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

This document fixes the future CM-0826 review criteria before any CM-0825 patched true live recall proof is executed.

It does not review CM-0825 evidence because no separately exact-approved CM-0825 execution exists in this slice. It does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` or durable memory content, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Required Input Evidence

Future CM-0826 review may start only after a CM-0825 execution artifact exists with all required fields below:

| Required evidence | Acceptance requirement |
|---|---|
| exact approval | The exact CM-0824 approval line was provided before execution. |
| baseline | Execution recorded branch, clean worktree state, local `HEAD`, `origin/main`, and remote `refs/heads/main` where applicable. |
| query count | Exactly `4` queries executed. |
| query text | Query texts exactly match CM-0824 in order; no substitution, expansion, reordering, or broadening. |
| patched path | Evidence states the execution used `TrueLiveRecallReadonlyProofRunner -> TrueLiveRecallExecutorAdapter -> approved search_memory app path -> KnowledgeBaseRecallPipeline`. |
| metadata-only control | Evidence states `noRawContentRead=true`, `include_content=false`, and pipeline metadata-only aggregation were active. |
| output shape | Output is sanitized only and contains no raw memory text, raw title, raw snippet, raw source path, direct `.jsonl` location, durable path, or raw store field. |
| side-effect counters | Complete counters are present, finite, non-negative, and zero for provider, direct `.jsonl`, durable memory write, durable audit write, cache write/flush, sync, vector flush, embedding cache write, raw memory content read, and public MCP expansion. |
| pass/fail labels | Execution result uses one of the CM-0824 allowed CM-0825 labels and remains `NOT_READY`. |
| boundary statement | Evidence explicitly says no provider/API call, durable memory/audit write, public MCP expansion, package/config/watchdog/startup change, release/cutover, or readiness/reliability claim occurred. |

If any required input is missing, ambiguous, or contradicted by repository state, the CM-0826 review must return `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BLOCKED_INSUFFICIENT_EVIDENCE_NOT_READY`.

## Review Decision Table

| Condition | Future CM-0826 decision | Allowed interpretation |
|---|---|---|
| CM-0825 did not execute | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BLOCKED_NO_PROOF_NOT_READY` | No blocker downgrade; wait for exact-approved CM-0825 or choose non-execution planning only. |
| Exact approval missing or drifted | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BLOCKED_APPROVAL_DRIFT_NOT_READY` | Proof is not acceptable evidence. |
| Query count/text drifted | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BLOCKED_QUERY_DRIFT_NOT_READY` | Proof shape is not comparable to CM-0824. |
| Raw output, direct `.jsonl`, provider/API, durable write, public MCP expansion, or nonzero side-effect counter appears | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BOUNDARY_FAILED_NOT_READY` | Boundary failure; no downgrade. |
| Q1/Q2/Q3 expected-result slots fail | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_STILL_BLOCKED_EXPECTED_RESULT_FAILURE_NOT_READY` | Recall quality remains insufficient for this proof shape. |
| Q4 negative-control returns nonzero results | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_STILL_BLOCKED_NEGATIVE_CONTROL_FAILURE_NOT_READY` | Irrelevant suppression remains insufficient for this proof shape. |
| Q1/Q2/Q3 pass, Q4 is zero, patched path checks pass, and counters are complete zero | `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BLOCKER_DOWNGRADED_NOT_RELIABLE_NOT_READY` | Downgrade only the patched proof-shape ambiguity around metadata-only no-raw-content-read semantics; do not claim broad recall reliability. |

## Downgrade Boundary

Even if future CM-0825 passes and CM-0826 returns `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_BLOCKER_DOWNGRADED_NOT_RELIABLE_NOT_READY`, the downgrade is narrow.

Allowed downgrade:

- The CM-0801 / CM-0814 `rawMemoryContentReads=0` ambiguity can be replaced for the CM-0825 proof shape by stronger patched metadata-only path evidence.
- The future proof can support that the exact ordered query set ran through a no-raw-content-read path with sanitized output and zero side-effect counters.
- The blocker can move from "patched path unproven" to "patched proof-shape evidence accepted for review".

Forbidden interpretation:

- Do not claim `memory recall reliable`.
- Do not set truth-table `complete? = yes`.
- Do not claim runtime ready, RC ready, production ready, release ready, or cutover ready.
- Do not infer broad corpus quality, broad query-family coverage, long-run freshness behavior, provider-backed quality, V8 implementation, VCP full parity, or write reliability.
- Do not treat feature-branch evidence as merged mainline evidence unless a later CM-0822 reconciliation proves mainline integration.

## Next-Proof Shape Guidance

If future CM-0826 cannot downgrade the blocker, the next proof shape should be selected based on failure class:

- Approval/query/path drift: repair packet or execution path before any new proof.
- Positive expected-result failure: plan a narrower positive-control family or review recall quality scoring.
- Negative-control failure: return to bounded precision/negative-control hardening before another live query.
- Boundary failure: patch runner/adapter/app/pipeline boundary and rerun targeted bounded tests before any live proof.
- Mainline classification gap: perform CM-0822 after explicit mainline integration, then reclassify evidence.

## Closeout

Result: `CM0826_RECALL_RELIABILITY_BLOCKER_REVIEW_CRITERIA_PREPARED_NOT_REVIEWED_NOT_READY`.

This is criteria preparation only. CM-0826 has not reviewed CM-0825 evidence because CM-0825 has not executed.

`memory recall reliable` remains not claimed. `RC_NOT_READY_BLOCKED` remains.
