# CM0774 Second Negative-Control Proof Plan

Date: 2026-05-22

Task: `CM-0803`

Validation: `CMV-0922`

Baseline: `69de1df3fab6f7a43daa12fadc2c625221dbf608`

Inputs:

- `docs/CM0774_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION.md`
- `docs/TRUE_LIVE_RECALL_PROOF_REVIEW.md`

Result: `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN_COMPLETED_SYNCED_NOT_READY`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This plan defines a future second negative-control recall proof. It does not execute true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Why Q4 Blocks Reliability

CM-0801 executed four true live real-store recall queries through the approved internal runner/adapter path. Q1, Q2, and Q3 returned expected sanitized results. Q4, `negative-control-zeta-7194-nonexistent-memory-spine-token`, returned `2` sanitized results.

That nonzero Q4 count blocks a `memory recall reliable` conclusion because:

- A negative-control slot is supposed to demonstrate irrelevant-query suppression.
- Q4 did not demonstrate suppression because `resultCount=2`.
- The result is not a runner boundary failure: output was sanitized, raw content was not returned, and complete side-effect counters were zero.
- The result cannot be safely explained as tokenizer-only, semantic broad-match-only, or query-design-only without forbidden raw memory/content/tokenization evidence.
- Conservative classification remains a combined negative-control criteria / query-design / recall-precision risk.

## Future Exact Approval Requirement

This plan does not authorize execution. The future proof requires a separate exact approval line from the operator after confirming a fresh clean synced `main`.

Minimum future approval line shape:

```text
I explicitly authorize Codex to execute CM0774_SECOND_NEGATIVE_CONTROL_PROOF using docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN.md with exactly 4 stricter negative-control queries, sanitized output only, complete zero side-effect counters, no raw memory, no direct .jsonl read, no provider/model/API call, no durable memory/audit write, and no readiness or reliability claim.
```

## Exact Query Set

Exact query count: `4`.

All four slots are negative-control slots. The strings intentionally avoid project-domain terms such as `memory`, `spine`, `blocker`, `recall`, and `proof`.

| Slot | Family | Query text | Expected result count |
|---|---|---|---:|
| NC1 | stricter_negative_control | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| NC2 | stricter_negative_control | `nareth-48291-pluvox-darnel-kiv` | 0 |
| NC3 | stricter_negative_control | `vornik-73019-quaspel-threnn-ulo` | 0 |
| NC4 | stricter_negative_control | `mavrix-60428-selkun-dopra-nyxal` | 0 |

## Expected Zero-Result Criteria

The future execution passes only if every slot returns `resultCount=0` and all runner boundary checks pass.

Required slot-level criteria:

- `exactQueryCount=4`.
- Each query is one of the four fixed strings above, in order.
- Each slot has `resultCount=0`.
- `rawContentReturned=false`.
- No `content`, `text`, `snippet`, `title`, raw path, direct `.jsonl` location, or raw memory field is returned.
- Output contains only sanitized counts, booleans, hashes or opaque ids if needed for failure evidence, metadata key names, runner decision labels, and side-effect counters.

Any nonzero result count is a proof failure, not a reliability success.

## Side-Effect Counter Requirements

The future run must include complete side-effect counters. Every required counter must be finite, non-negative, present, and exactly zero:

- `providerCalls`
- `directJsonlReads`
- `durableMemoryWrites`
- `durableAuditWrites`
- `candidateCacheWrites`
- `candidateCacheFlushes`
- `syncCalls`
- `vectorFlushes`
- `embeddingCacheWrites`
- `rawMemoryContentReads`
- `publicMcpExpansion`

The runner must fail closed on missing, partial, malformed, non-finite, negative, required-nonzero, or unknown-positive counters.

## Pass / Fail Labels

Allowed future execution labels:

- `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PASSED_NOT_READY`: exactly four fixed negative-control queries executed, every result count was `0`, output stayed sanitized, complete side-effect counters were zero, and no hard-stop boundary was crossed.
- `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_FAILED_NOT_READY`: execution completed through the approved path but at least one negative-control slot returned nonzero sanitized results.
- `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_BOUNDARY_FAILED_NOT_READY`: execution failed closed because of raw leakage, missing/partial/malformed/nonzero counters, forbidden side effects, query-count drift, query-set drift, or output-shape drift.
- `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_BLOCKED`: execution did not start because exact approval, clean synced `main`, runner/adapter preflight, or hard-stop checks were not satisfied.

## No-Readiness Wording

Even if a future execution returns `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PASSED_NOT_READY`, it must not be described as runtime ready, RC ready, production ready, release ready, cutover ready, or `memory recall reliable`.

A passing second negative-control proof would only show that the stricter negative-control slots returned zero sanitized results through the approved read-only runner/adapter path. A separate proof review and truth-table update would still be required before any blocker downgrade or closure.

## Decision

`CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN_COMPLETED_SYNCED_NOT_READY`

The next safe step is a separately exact-approved execution of this plan, or a recheck if the runner/adapter path, query set, branch state, or hard-stop boundaries drift. Until then, `memory recall reliable` remains bounded evidence only, `complete? = no`, and `RC_NOT_READY_BLOCKED` remains.
