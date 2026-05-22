# Recall Precision Hardening Live Proof Recheck

Date: 2026-05-23
Task: `CM-0811`
Validation: `CMV-0930`
Inputs: `CM-0809`, `CM-0810`, `CM-0803`, `CM-0804`, `CM-0806`
Result: `RECALL_PRECISION_HARDENING_LIVE_PROOF_READY_FOR_EXACT_APPROVAL_RECHECK_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This recheck confirms whether the bounded recall precision hardening implementation is sufficient to wait for a future exact-approved live negative-control proof.

This recheck does not execute true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read direct `.jsonl` or durable memory content, does not call a provider/model/API, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup surfaces, does not run migration/import/export/backup/restore apply, does not run real rollback apply, and does not claim readiness or `memory recall reliable`.

## Recheck Verdict

CM-0809 plus CM-0810 are sufficient to enter a future exact approval gate for a post-hardening live negative-control proof.

This is not proof execution. This is not exact approval by itself. This is not a reliability claim. The future proof still requires a separate exact approval line from the operator plus fresh execution-time preflight.

## Evidence Reviewed

| Evidence | Finding |
|---|---|
| `CM-0806` failure review | The second stricter negative-control proof failed zero-result criteria with NC1=3, NC2=2, NC3=3, NC4=2, while runner/adapter boundary and side-effect counters stayed clean. |
| `CM-0807` hardening plan | The plan required thresholding, negative-control gating, minimum score policy, score distribution review, no-result mode, stricter filters, and exact reject policy before another live proof. |
| `CM-0809` bounded implementation | Implemented internal optional `RecallPrecisionPolicy`, optional `precisionPolicyContext`, minimum score policy, positive-signal requirement, negative-control no-result mode, sanitized distribution, and raw/malformed fail-closed behavior. |
| `CM-0810` bounded review | Accepted CM-0809 as sufficient bounded implementation evidence to enter future exact approval recheck, while preserving `complete? = no` and no reliability claim. |
| `CM-0803` / `CM-0804` query boundary | The future live negative-control proof shape remains exactly four stricter negative-control queries, all expected `resultCount=0`, sanitized output only, and complete zero side-effect counters. |

## Required Conditions

| Requirement | Finding |
|---|---|
| Optional precision policy default off | PASS. `precisionPolicyContext` remains optional and disabled unless explicitly enabled by an internal caller. |
| Public search behavior unchanged | PASS. Public MCP/search behavior remains unchanged by default; there is no public MCP expansion. |
| Minimum score policy | PASS for recheck readiness. The bounded policy can reject low-confidence candidates and is configurable by proof context. |
| Positive-signal requirement | PASS for recheck readiness. Ordinary acceptance requires score plus positive evidence signal; score alone is insufficient. |
| Negative-control no-result mode | PASS for recheck readiness. Proof no-result mode suppresses low-confidence/no-signal candidates and fail-closes on high-confidence or positive-signal negative-control candidates. |
| Sanitized score distribution | PASS. The exposed distribution is counts, score buckets, and metadata keys only, with no raw content/text/snippet/title/path fields. |
| Raw/malformed metadata fail-closed | PASS. Missing score, raw field leakage, non-finite, negative, malformed arrays/counts, and high-confidence negative-control candidates fail closed. |
| Targeted hardening tests | PASS. CM-0809 records targeted hardening tests `5/5`. |
| Adjacent bounded recall tests | PASS. CM-0809 records adjacent bounded recall tests `2/2`, `1/1`, and `1/1`, plus full `npm test` `1994/1994`. |
| Can enter future exact approval gate | PASS. The path is ready for a future exact approval line and execution-time preflight. |
| Can execute live proof now | NO. This recheck is not an exact approval and does not authorize live `search_memory`. |
| Can claim `memory recall reliable` | NO. No post-hardening live proof has run, no proof review has accepted live post-hardening evidence, and the truth table remains incomplete. |
| Truth-table completion | NO. `memory recall reliable` remains `bounded evidence only`; `complete? = no`. |

## Future Exact Proof Shape

The future execution, if separately exact-approved, must preserve the existing stricter negative-control query set:

| Slot | Query text | Expected result count |
|---|---|---:|
| NC1 | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| NC2 | `nareth-48291-pluvox-darnel-kiv` | 0 |
| NC3 | `vornik-73019-quaspel-threnn-ulo` | 0 |
| NC4 | `mavrix-60428-selkun-dopra-nyxal` | 0 |

Future execution must also require:

- exactly four queries
- internal proof runner / approved adapter path
- `precisionPolicyContext.enabled=true`
- proof no-result mode enabled for stricter negative-control
- sanitized output only
- no raw memory fields
- no direct `.jsonl` read
- no provider/model/API call
- no durable memory/audit write
- complete zero side-effect counters
- fail-closed behavior for missing/partial/malformed/nonzero/unknown-positive counters
- fail-closed behavior for raw content/text/snippet/title leakage
- no readiness or reliability wording

## Future Approval Line Shape

This document does not grant approval. A later operator message must separately and explicitly approve execution.

Minimum future approval line shape:

```text
I explicitly authorize Codex to execute RECALL_PRECISION_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF using docs/RECALL_PRECISION_HARDENING_LIVE_PROOF_RECHECK.md with exactly 4 stricter negative-control queries, expected resultCount=0 for NC1-NC4, sanitized output only, complete zero side-effect counters, no raw memory, no direct .jsonl read, no provider/model/API call, no durable memory/audit write, no memory write, and no readiness or reliability claim.
```

## Decision

`RECALL_PRECISION_HARDENING_LIVE_PROOF_READY_FOR_EXACT_APPROVAL_RECHECK_NOT_READY`

The bounded hardening implementation is sufficient to wait for a future exact-approved live negative-control proof. It is not sufficient to execute that proof without separate approval, close the blocker, mark the truth table complete, or claim `memory recall reliable`.
