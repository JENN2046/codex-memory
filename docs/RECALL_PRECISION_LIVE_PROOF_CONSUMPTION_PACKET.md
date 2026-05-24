# Recall Precision Live Proof Consumption Packet

Date: 2026-05-24
Task: `CM-0898`
Validation: `CMV-1016`
Reviewed evidence:

- `docs/RECALL_PRECISION_EXECUTION_PATH_PASS_THROUGH_CLOSEOUT.md`
- `docs/RECALL_PRECISION_POST_HARDENING_EXACT_APPROVAL_RECHECK.md`
- `docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION.md`
- `docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_REVIEW.md`
- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `src/core/TrueLiveRecallExecutorAdapter.js`
- `src/app.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`

Result: `RECALL_PRECISION_LIVE_PROOF_CONSUMPTION_PACKET_COMPLETED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This packet is source/doc guidance only. It does not execute true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read direct `.jsonl` or durable memory content, does not call a provider/model/API, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Question Fixed

If a future separately exact-approved live recall proof is chosen, what exact seam should consume it?

## Consumption Rule

Any future separately exact-approved live recall proof should consume the existing internal proof seam only:

1. `TrueLiveRecallReadonlyProofRunner.run(...)`
2. `createTrueLiveRecallExecutorAdapter({ app })`
3. `app.callTool('search_memory', ...)` through the adapter only
4. `requestContext.noTokenReadOnly=true`
5. `executionContext.requestSource='internal-true-live-recall-readonly-proof-runner'`
6. `executionContext.noRawContentRead=true`
7. `executionContext.precisionPolicyContext.enabled=true`
8. `executionContext.precisionPolicyContext.proofNoResultMode=true`
9. sanitized output only with `include_content=false`

This packet fixes the seam only. It does not approve a future run, does not choose the future exact query family, and does not bind a future exact baseline.

## What Is Now Fixed

- future live recall proof should use the existing internal runner/adapter/app seam
- future proof should not invent a parallel runtime path
- future proof should not consume direct public `search_memory` as its proof seam
- future proof should not consume `dashboard`, `governance-report`, `http-observe`, or ad hoc app/service calls as substitute proof surfaces
- future proof should remain exactly bounded and exact-approved
- future proof should continue to require sanitized output only
- future proof should continue to require complete zero side-effect counters
- future proof should continue to fail closed on unsupported source, raw leakage, malformed counters, missing approved path, or precision-context drift

## What This Still Does Not Prove

- any future live recall proof is approved
- any future exact query family is approved
- any future baseline is rebound
- broad `memory recall reliable`
- `RC_READY`

## Operator Interpretation

- treat this packet as future seam-consumption guidance only
- do not treat it as execution approval
- do not treat it as live proof
- do not treat public `search_memory` as the proof seam
- keep `memory recall reliable = no`
- keep `complete? = no`

## Decision

`RECALL_PRECISION_LIVE_PROOF_CONSUMPTION_PACKET_COMPLETED_NOT_READY`

The future exact-approved live recall proof seam is now fixed: consume the existing internal runner/adapter/app path, not a new or broader path. This packet still does not approve execution, does not bind the future exact query family or baseline, does not prove `memory recall reliable`, and does not change `RC_NOT_READY_BLOCKED`.
