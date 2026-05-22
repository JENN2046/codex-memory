# Recall Precision Post-hardening Live Negative-Control Proof Execution

Date: 2026-05-23
Task: `CM-0814`
Validation: `CMV-0933`
Baseline: `17500cff8633d25b69067897686d3810df52e75c`
Result: `RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_COMPLETED_LOCAL_NOT_READY`
Runner decision: `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This execution used the separately operator-approved post-hardening live negative-control proof path once through `TrueLiveRecallReadonlyProofRunner` and `createTrueLiveRecallExecutorAdapter({ app })`.

The execution used exactly four stricter negative-control queries, `precisionPolicyContext.enabled=true`, `proofNoResultMode=true`, sanitized output only, and complete zero side-effect counters.

This execution did not call true live `record_memory`, did not directly read `.jsonl` or durable memory content, did not call providers/models/APIs, did not write durable memory/audit state, did not expand public MCP, did not change package/config/watchdog/startup state, did not apply rollback/migration/import/export/backup/restore, did not tag/release/deploy/cutover, and did not make any readiness or reliability claim.

## Preflight

| Check | Result |
|---|---|
| operator exact approval | supplied in-thread for `CM-0814` before execution |
| local commit approval | supplied in-thread; one local commit was explicitly approved before execution |
| `git status --short --branch` before proof | clean `main...origin/main [ahead 1]` |
| `HEAD` | `17500cff8633d25b69067897686d3810df52e75c` |
| `origin/main` | `8a1d36f33e7ca115966e4a7d18b7daf4112e5d4d` |
| remote `refs/heads/main` | `8a1d36f33e7ca115966e4a7d18b7daf4112e5d4d` |
| execution path | internal proof runner plus approved adapter |
| query count | exactly `4` |
| output shape | sanitized only |

Because the operator explicitly approved one local commit before execution, this run is recorded as `LOCAL_NOT_READY`, not `SYNCED_NOT_READY`.

## Exact Query Set

| Slot | Plan slot | Family | Query text | Expected result count |
|---|---|---|---|---:|
| Q1 | NC1 | `stricter_negative_control` | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| Q2 | NC2 | `stricter_negative_control` | `nareth-48291-pluvox-darnel-kiv` | 0 |
| Q3 | NC3 | `stricter_negative_control` | `vornik-73019-quaspel-threnn-ulo` | 0 |
| Q4 | NC4 | `stricter_negative_control` | `mavrix-60428-selkun-dopra-nyxal` | 0 |

## Sanitized Proof Output

| Slot | Expected count | Actual result count | Top opaque id hash | Top score | Raw content returned | Error |
|---|---:|---:|---|---:|---|---|
| Q1 / NC1 | 0 | 0 | none | none | `false` | none |
| Q2 / NC2 | 0 | 0 | none | none | `false` | none |
| Q3 / NC3 | 0 | 0 | none | none | `false` | none |
| Q4 / NC4 | 0 | 0 | none | none | `false` | none |

Matched metadata keys only:

```text
none
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
- The post-hardening negative-control acceptance criterion was met because NC1, NC2, NC3, and NC4 all returned `resultCount=0`.
- Node emitted the standard SQLite `ExperimentalWarning`; this did not change the runner decision or side-effect counters.
- Post-proof `git status --short --branch` remained clean before docs recording.
- The current internal proof runner still reports `approvalPacket = CM-0774`; this reflects existing internal token labeling, not a broader approval scope.

## Decision

`RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_COMPLETED_LOCAL_NOT_READY`

This execution provides fresh post-hardening sanitized live evidence that the approved exact negative-control proof shape can now return zero results with complete zero side-effect counters on the clean local `main` head at `17500cff8633d25b69067897686d3810df52e75c`. It does not by itself prove `memory recall reliable`, does not change any truth-table row to `complete? = yes`, and does not change `RC_NOT_READY_BLOCKED`.
