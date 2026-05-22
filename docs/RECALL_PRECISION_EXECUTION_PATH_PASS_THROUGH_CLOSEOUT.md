# Recall Precision Execution Path Pass-through Closeout

Date: 2026-05-23
Task: `CM-0812`
Validation: `CMV-0931`
Inputs: `CM-0809`, local precision-policy pass-through patch set in `src/app.js`, `src/core/TrueLiveRecallExecutorAdapter.js`, `src/core/TrueLiveRecallReadonlyProofRunner.js`
Result: `RECALL_PRECISION_EXECUTION_PATH_PASS_THROUGH_COMPLETED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This closeout verifies the approved execution-path pass-through for `precisionPolicyContext` and `proofNoResultMode` from the internal true live recall proof runner into the bounded recall precision policy path.

This closeout is local source/test review plus targeted validation only. It does not execute true live `search_memory`, does not execute true live `record_memory`, does not read raw memory content, does not read direct `.jsonl` or durable memory content, does not call a provider/model/API, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup surfaces, does not run migration/import/export/backup/restore apply, does not run real rollback apply, and does not claim readiness or `memory recall reliable`.

## Closeout Verdict

The post-hardening execution path is now explicitly wired for internal proof use:

1. `TrueLiveRecallReadonlyProofRunner` can derive per-query precision policy input through `precisionPolicyContextFactory`.
2. `TrueLiveRecallExecutorAdapter` forwards that object only through internal `executionContext`.
3. `createCodexMemoryApplication()` accepts and normalizes that context only for the approved internal runner path.
4. `passiveRecallService.search()` receives the normalized context.
5. `KnowledgeBaseRecallPipeline` and `RecallPrecisionPolicy` can then apply `proofNoResultMode` through the existing bounded hardening path.

This closes the execution-path pass-through gap. It does not approve live proof execution and does not change the truth-table completion state.

## Evidence

| Path segment | Finding |
|---|---|
| `src/core/TrueLiveRecallReadonlyProofRunner.js` | PASS. Runner now supports `precisionPolicyContextFactory`, passes `querySlot` / `queryFamily`, and forwards per-query `precisionPolicyContext` to the search executor. |
| `src/core/TrueLiveRecallExecutorAdapter.js` | PASS. Adapter accepts only object-shaped precision policy context and forwards it only as `requestContext.executionContext.precisionPolicyContext` on the internal no-token read-only path. |
| `src/app.js` | PASS. App now normalizes and validates the internal precision context only when `noTokenReadOnly=true` and `requestSource=internal-true-live-recall-readonly-proof-runner`; unsupported callers fail closed. |
| `src/recall/KnowledgeBaseRecallPipeline.js` / `src/recall/RecallPrecisionPolicy.js` | PASS. Existing bounded hardening path already consumes `precisionPolicyContext.enabled` and `proofNoResultMode` to suppress negative-control results before aggregation. |
| Public/non-approved path | PASS. Injected precision context from a non-approved path is rejected; public search behavior stays unchanged when the context is absent. |

## Targeted Validation

Validated:

- `git diff --check`
- `node --check src\app.js`
- `node --check src\core\TrueLiveRecallExecutorAdapter.js`
- `node --check src\core\TrueLiveRecallReadonlyProofRunner.js`
- `node --check tests\true-live-recall-executor-adapter.test.js`
- `node --check tests\true-live-recall-precision-policy-path.test.js`
- `node --check tests\true-live-recall-internal-proof-runner.test.js`
- `node --check tests\recall-precision-hardening-bounded.test.js`
- `node --check tests\mcp-contract.test.js`
- `node --test tests\true-live-recall-executor-adapter.test.js`
- `node --test tests\true-live-recall-precision-policy-path.test.js`
- `node --test tests\true-live-recall-internal-proof-runner.test.js`
- `node --test tests\recall-precision-hardening-bounded.test.js`
- `node --test tests\mcp-contract.test.js`

Additional changed-scope coverage now includes:

- direct runner assertion that `precisionPolicyContextFactory` output is forwarded per query
- adapter assertion that internal executionContext carries the precision policy object
- app assertion that approved internal search path forwards normalized precision context into passive recall search
- app assertion that non-approved injected precision policy context fails closed

## Changed-Scope Re-review

No actionable findings remain in the changed scope.

Specific re-review judgments:

| Question | Judgment |
|---|---|
| Public MCP expansion introduced? | NO |
| Default public search behavior changed? | NO |
| Internal proof-only precision path now explicit end-to-end? | YES |
| `proofNoResultMode` can reach the bounded recall precision policy path without widening the public contract? | YES |
| Unsupported/internal misuse fails closed? | YES |
| Live proof execution approved by this closeout? | NO |
| `memory recall reliable` proven by this closeout? | NO |

## Decision

`RECALL_PRECISION_EXECUTION_PATH_PASS_THROUGH_COMPLETED_NOT_READY`

The internal execution path is now precise enough to support a future separately exact-approved post-hardening live negative-control proof. This closeout is still bounded local evidence only. `memory recall reliable` remains unclaimed, the truth table remains `complete? = no`, and `RC_NOT_READY_BLOCKED` remains.
