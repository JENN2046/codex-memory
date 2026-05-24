# CM-1012 CM0825 Negative-Control Wiring Guard

Status: `CM1012_CM0825_NEGATIVE_CONTROL_WIRING_GUARD_COMPLETED_VALIDATED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: record one clean-head CM0825 recall-proof failure and add a narrow internal runner guard
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1012 records a regression-shaped finding from a bounded CM0825 true-live recall proof attempt on the current clean synced baseline, then fixes the narrow internal runner wiring gap that allowed the CM0825 `stricter_negative_control` slot to run without no-result precision policy context when no caller-supplied factory was present.

This is not `memory recall reliable`, not `memory write reliable`, not runtime ready, not RC ready, not production ready, not release ready, and not cutover ready.

## Clean-Head Proof Finding

Baseline before the proof attempt:

```text
main / origin/main / remote refs/heads/main = c6926505603240d10bb8a1caa4903fa061c49ce7
worktree = clean
```

Preflight commands returned ready-not-executed:

```text
RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED
WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED
MEMORY_RELIABILITY_PROOF_BASELINE_READY_NOT_EXECUTED
```

One bounded in-process CM0825 recall proof attempt was executed through:

```text
TrueLiveRecallReadonlyProofRunner -> TrueLiveRecallExecutorAdapter -> app.callTool('search_memory')
```

The runner boundary stayed clean:

- query count: `4`
- `rawContentReturned=false`
- provider/API calls: `0`
- direct `.jsonl` reads: `0`
- durable memory writes: `0`
- durable audit writes: `0`
- candidate-cache writes/flushes: `0`
- sync calls: `0`
- vector flushes: `0`
- embedding-cache writes: `0`
- raw memory content reads: `0`
- public MCP expansion: `0`
- readiness/reliability claims: `0`

The proof is still failed/not-reliable because Q4 returned sanitized results:

| Slot | Family | Result count | Top result opaque hash | Top score | Raw content returned | Error |
|---|---|---:|---|---:|---|---|
| Q1 | `positive_project_state` | 4 | `449633a01f7c2db6` | 0.239729 | false | null |
| Q2 | `positive_recall_evidence_ladder` | 4 | `3b9263b32c973db5` | 0.521145 | false | null |
| Q3 | `positive_blocker_posture` | 2 | `2e5ef202f9aa0e19` | 0.313081 | false | null |
| Q4 | `stricter_negative_control` | 3 | `2e5ef202f9aa0e19` | 0.098152 | false | null |

Interpretation:

- This clean-head proof attempt does not support a recall reliability downgrade or closure.
- The failure is not a raw-output leak, provider leak, durable-write leak, or public MCP expansion.
- The immediate wiring issue is that the CM0825 negative-control slot depended on the caller to pass `precisionPolicyContextFactory`; without it, Q4 fell back to ordinary recall.
- The result must be treated as `FAILED_NOT_RELIABLE_NOT_READY`.

## Fix

Changed:

- [TrueLiveRecallReadonlyProofRunner.js](/A:/codex-memory/src/core/TrueLiveRecallReadonlyProofRunner.js)
- [true-live-recall-internal-proof-runner.test.js](/A:/codex-memory/tests/true-live-recall-internal-proof-runner.test.js)

The runner now derives a default precision policy context for internal proof queries whose family is exactly `stricter_negative_control` when no caller-supplied `precisionPolicyContextFactory` is present:

```json
{
  "enabled": true,
  "queryFamily": "stricter_negative_control",
  "proofNoResultMode": true,
  "minimumScore": 0.12,
  "highConfidenceScore": 0.62
}
```

Positive CM0825 slots still receive no default precision context. Caller-supplied factory output still overrides the default path. Public `search_memory` behavior and public MCP tools are unchanged.

## Validation

Passed:

```text
node --test .\tests\true-live-recall-internal-proof-runner.test.js
node --test .\tests\true-live-recall-precision-policy-path.test.js
node --test .\tests\true-live-recall-executor-adapter.test.js
node --test .\tests\mcp-contract.test.js
node --test .\tests\recall-precision-hardening-bounded.test.js
npm test
```

Result:

```text
runner: 10/10
precision path: 5/5
executor adapter: 7/7
MCP contract: 9/9
bounded precision: 13/13
npm test: 2445/2445
```

SQLite emitted only the expected Node experimental warning during app-path tests.

## Boundary

No `record_memory`, provider/API call, raw memory output, direct `.jsonl` read, durable memory/audit write, public MCP expansion, dependency change, config/watchdog/startup edit, tag/release/deploy/cutover, readiness claim, or reliability claim occurred during the fix and targeted validation.

The clean-head proof attempt did call internal read-only `search_memory` exactly four times through the approved runner/adapter seam and returned sanitized evidence only.

## Next

Do not treat CM-1012 as recall reliability closure. The next safe step is to commit this guard after full diff/review validation, then rerun current-facts preflight from a clean synced baseline before considering any further bounded live recall proof.
