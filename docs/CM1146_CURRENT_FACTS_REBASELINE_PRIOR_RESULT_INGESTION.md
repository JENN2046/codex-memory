# CM1146 Current-Facts Rebaseline And CM1145 Prior Result Ingestion

Status: `CM1146_CURRENT_FACTS_REBASELINE_PRIOR_RESULT_INGESTION_COMPLETED_VALIDATED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1146 repairs the current-facts gate sequence after CM-1111 was exact-approved and recorded by CM-1145.

The issue was twofold:

- `selected-audit-correlation-current-facts-preflight.js` defaulted to an empty prior-result list, so current-facts gates continued to report `prior_result_CM-1111_missing`.
- CM-1120 target-head mismatch was treated as an unknown blocker in CM-1131/CM-1140, even though it should be a later CM-1120 rebaseline blocker, not a reason to send the operator back to CM-1111 after CM-1145 is recorded.

## Changed Source

```text
src/cli/selected-audit-correlation-current-facts-preflight.js
src/core/SelectedAuditCorrelationPrerequisiteBlockerPlan.js
src/core/SelectedAuditCorrelationPrerequisiteStageGate.js
src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence.js
```

## Behavior

Current-facts preflight now reads the local CM-1145 execution record when present and ingests only this exact prior result:

```text
CM-1111:APPLIED_TOMBSTONED_SANITIZED
```

The ingestion is narrow and fail-closed. It requires the CM-1145 status marker, result class, exact memory id, `decision=tombstoned`, and `mutated=true`.

CM-1131 now treats CM-1120 target-head mismatch as a known rebaseline blocker after prior results:

```text
WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115
```

CM-1140 now converts that stage class to:

```text
WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115
nextAllowedAction=prepare_fresh_cm1120_target_head_rebaseline_packet_only
```

When CM-1145 is present but CM-1115 is still missing, the sequence advances to:

```text
WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111
WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111
```

## Validation

Targeted validation:

```text
node --test .\tests\selected-audit-correlation-current-facts-preflight-cli.test.js .\tests\selected-audit-correlation-prerequisite-stage-gate.test.js .\tests\selected-audit-correlation-prerequisite-resolution-sequence.test.js .\tests\selected-audit-correlation-current-facts-stage-gate-cli.test.js .\tests\selected-audit-correlation-current-facts-resolution-sequence-cli.test.js
```

Result:

```text
33/33 passed
```

Regression validation after updating adjacent legacy fail-closed tests:

```text
node --test .\tests\selected-audit-correlation-blocker-downgrade-review.test.js .\tests\selected-audit-correlation-current-facts-downgrade-review-cli.test.js .\tests\selected-audit-correlation-current-facts-prerequisite-plan-cli.test.js .\tests\selected-audit-correlation-current-facts-preflight-cli.test.js .\tests\selected-audit-correlation-prerequisite-stage-gate.test.js .\tests\selected-audit-correlation-prerequisite-resolution-sequence.test.js .\tests\selected-audit-correlation-current-facts-stage-gate-cli.test.js .\tests\selected-audit-correlation-current-facts-resolution-sequence-cli.test.js
```

Result:

```text
49/49 passed
```

Full local project validation:

```text
npm test
```

Result:

```text
2747/2747 passed
```

## Boundary

CM-1146 does not execute CM-1115, CM-1120, selected audit observation, memory tools, provider/API calls, cleanup/rollback/migration apply, config/startup/package changes, push, or readiness/reliability claims.

## Decision

`CM1146_CURRENT_FACTS_REBASELINE_PRIOR_RESULT_INGESTION_COMPLETED_VALIDATED_NOT_READY`

Next safe step after a clean commit is to rerun real current-facts gates and confirm the next target is CM-1115 approval request only.
