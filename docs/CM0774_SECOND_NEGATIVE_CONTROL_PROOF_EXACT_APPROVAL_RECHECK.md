# CM0774 Second Negative-Control Proof Exact Approval Recheck

Date: 2026-05-22

Task: `CM-0804`

Validation: `CMV-0923`

Baseline: `ab48fbdaf9ce1772cba340fefa4d35241584dd14`

Result: `CM0774_SECOND_NEGATIVE_CONTROL_PROOF_READY_FOR_EXACT_APPROVAL`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This recheck evaluates whether the second stricter negative-control recall proof plan is ready to wait for a future exact approval line. It does not execute true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Recheck Verdict

The second negative-control plan remains valid for exact-approval readiness.

| Requirement | Finding |
|---|---|
| Plan still valid? | Yes. `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN.md` is present and aligned with CM-0802. |
| Exact query count | Yes. The future proof requires exactly `4` queries. |
| Query expected counts | Yes. NC1, NC2, NC3, and NC4 each require `resultCount=0`. |
| Query-domain constraint | Yes. The four query strings avoid project-domain terms such as `memory`, `spine`, `blocker`, `recall`, and `proof`. |
| Sanitized output shape | Yes. Output is limited to sanitized counts, booleans, hashes or opaque ids when needed, metadata key names, runner labels, and side-effect counters. |
| Complete zero side-effect counters | Yes. The plan requires complete finite non-negative counters and every required counter must be exactly zero. |
| Raw memory prohibited | Yes. Raw `content`, `text`, `snippet`, `title`, raw path, direct `.jsonl` location, and raw memory fields are prohibited. |
| Direct `.jsonl` read prohibited | Yes. `directJsonlReads` must be present and `0`. |
| Provider/model/API prohibited | Yes. `providerCalls` must be present and `0`; provider/model/API calls remain forbidden. |
| Durable memory/audit write prohibited | Yes. `durableMemoryWrites` and `durableAuditWrites` must be present and `0`. |
| User exact approval still required | Yes. This recheck does not authorize execution by itself. |
| Can enter execution authorization? | Yes, as a future separately exact-approved execution unit only. |
| Current controlling state | `RC_NOT_READY_BLOCKED` remains. |

## Exact Query Set To Preserve

The future execution authorization must preserve this exact ordered query set:

| Slot | Query text | Expected result count |
|---|---|---:|
| NC1 | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| NC2 | `nareth-48291-pluvox-darnel-kiv` | 0 |
| NC3 | `vornik-73019-quaspel-threnn-ulo` | 0 |
| NC4 | `mavrix-60428-selkun-dopra-nyxal` | 0 |

Any query-set drift, query-count drift, or nonzero sanitized result count must fail-not-ready rather than become reliability evidence.

## Future Exact Approval Boundary

The future operator approval must explicitly name this plan, exactly four stricter negative-control queries, sanitized output only, complete zero side-effect counters, no raw memory, no direct `.jsonl` read, no provider/model/API call, no durable memory/audit write, and no readiness or reliability claim.

The future run must still perform execution-time preflight:

- fresh clean synced `main`
- runner/adapter path unchanged or freshly reviewed
- exact query set unchanged
- exact query count `4`
- complete zero counter requirement unchanged
- sanitized output shape unchanged
- no hard-stop drift

## Decision

`CM0774_SECOND_NEGATIVE_CONTROL_PROOF_READY_FOR_EXACT_APPROVAL`

The second stricter negative-control proof can proceed to a future execution authorization line, but only after separate exact approval. This recheck does not execute the proof, does not close `memory recall reliable`, does not change any truth-table row to `complete? = yes`, and does not change `RC_NOT_READY_BLOCKED`.
