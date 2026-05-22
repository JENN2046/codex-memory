# CM0774 Second Negative-Control Proof Execution

Date: 2026-05-22

Task: `CM-0805`

Validation: `CMV-0924`

Baseline: `7403bd5e3b85a6d8a8efe3a331a6fd9138cfb8f3`

Result: `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_FAILED_NOT_READY`

Runner decision: `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This execution used the exact-approved second stricter negative-control proof path once through `TrueLiveRecallReadonlyProofRunner` and `createTrueLiveRecallExecutorAdapter({ app })`.

The execution used exactly four negative-control queries from `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN.md`, expected every slot to return `resultCount=0`, and recorded sanitized evidence only.

This execution did not call true live `record_memory`, did not directly read `.jsonl` or durable memory content, did not call providers/models/APIs, did not write durable memory/audit state, did not expand public MCP, did not change package/config/watchdog/startup state, did not apply rollback/migration/import/export/backup/restore, did not tag/release/deploy/cutover, and did not make any readiness or reliability claim.

## Preflight

| Check | Result |
|---|---|
| `git status --short --branch` | clean `main...origin/main` |
| `HEAD` | `7403bd5e3b85a6d8a8efe3a331a6fd9138cfb8f3` |
| `origin/main` | `7403bd5e3b85a6d8a8efe3a331a6fd9138cfb8f3` |
| remote `refs/heads/main` | `7403bd5e3b85a6d8a8efe3a331a6fd9138cfb8f3` |
| execution path | internal proof runner plus approved adapter |
| query count | exactly `4` |
| output shape | sanitized only |

## Exact Query Set

The current runner requires ordered slots `Q1` through `Q4`; those slots carried the approved NC1 through NC4 query texts.

| Slot | Plan slot | Family | Query text | Expected result count |
|---|---|---|---|---:|
| Q1 | NC1 | `stricter_negative_control` | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| Q2 | NC2 | `stricter_negative_control` | `nareth-48291-pluvox-darnel-kiv` | 0 |
| Q3 | NC3 | `stricter_negative_control` | `vornik-73019-quaspel-threnn-ulo` | 0 |
| Q4 | NC4 | `stricter_negative_control` | `mavrix-60428-selkun-dopra-nyxal` | 0 |

## Sanitized Proof Output

| Slot | Expected count | Actual result count | Top opaque id hash | Top score | Raw content returned | Error |
|---|---:|---:|---|---:|---|---|
| Q1 / NC1 | 0 | 3 | `2e5ef202f9aa0e19` | `0.098152` | `false` | none |
| Q2 / NC2 | 0 | 2 | `2e5ef202f9aa0e19` | `0.018801` | `false` | none |
| Q3 / NC3 | 0 | 3 | `3c31bd1d9dcfbc75` | `0.058401` | `false` | none |
| Q4 / NC4 | 0 | 2 | `6e9d03ef0c958dfe` | `0.075486` | `false` | none |

Matched metadata keys only:

```text
baseScore
coreTagsCount
createdAtDateOnly
matchedTagsCount
memoryId
rerankScore
score
sourceKinds
target
updatedAtDateOnly
```

Proof context:

| Field | Value |
|---|---|
| mode | `true_live_recall_readonly_proof` |
| approvalPacket | `CM-0774` |
| exactApprovalRequired | `true` |
| exactQueryCount | `4` |
| readOnly | `true` |
| noProvider | `true` |
| noAudit | `true` |
| sanitizedOutput | `true` |
| includeContent | `false` |

## Side-Effect Counters

| Counter | Value |
|---|---:|
| providerCalls | 0 |
| directJsonlReads | 0 |
| durableMemoryWrites | 0 |
| durableAuditWrites | 0 |
| candidateCacheWrites | 0 |
| candidateCacheFlushes | 0 |
| syncCalls | 0 |
| vectorFlushes | 0 |
| embeddingCacheWrites | 0 |
| rawMemoryContentReads | 0 |
| publicMcpExpansion | 0 |

The runner would fail closed on missing, partial, malformed, non-finite, negative, required-nonzero, or unknown-positive counters. No boundary failure occurred in this run.

## Execution Notes

- The runner boundary decision was `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`, meaning the internal proof runner and approved adapter path completed with sanitized output and complete zero side-effect counters.
- The CM-0803 negative-control acceptance criterion was not met because every slot returned nonzero sanitized results.
- Execution result is therefore `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_FAILED_NOT_READY`.
- Node emitted the standard SQLite `ExperimentalWarning`; this did not change the runner decision or side-effect counters.
- Post-proof `git status --short --branch` remained clean before docs recording.

## Decision

`CM0774_SECOND_NEGATIVE_CONTROL_PROOF_FAILED_NOT_READY`

This execution strengthens the evidence that the current true live recall path does not yet suppress stricter irrelevant negative-control queries to zero results. It does not prove `memory recall reliable`, does not close or downgrade the recall blocker, does not change any truth-table row to `complete? = yes`, and does not change `RC_NOT_READY_BLOCKED`.
