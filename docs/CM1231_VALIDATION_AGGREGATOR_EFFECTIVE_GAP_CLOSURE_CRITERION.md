# CM-1231 ValidationAggregator Effective Gap Closure Criterion

Date: 2026-05-31

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Add an effective remaining-gap clearance criterion to the ValidationAggregator full implementation closure criteria.

This is a local source/test report-shape improvement only. It does not execute A5-GAP-6 aggregation, read evidence files, execute validation commands from inside the aggregator, run runtime collectors, scan runtime stores, call providers, touch durable memory/audit, run migration/import/export/backup/restore, change config/watchdog/startup, expand MCP tools, or claim readiness.

## Change

`p66ValidationAggregatorFullImplementationDefinition.closureCriteria` now includes:

```yaml
effectiveRemainingGapsCleared: false
```

`closureMissingCriteria` now includes:

```yaml
- effective_remaining_gaps_cleared
```

when the effective remaining full implementation gap list is not empty.

## Result

The report now fails closed on the actual effective gap list, not only on whether a sanitized runtime summary exists or validation evidence is usable.

The report still preserves:

```yaml
validationAggregatorFullImplementation: false
fullAggregatorImplementationComplete: false
runtimeReady: false
finalRcMatrixReady: false
rcReady: false
```

## Validation

```text
node --check src\core\ValidationAggregatorService.js
node --test tests\v1-rc-validation-aggregator-implementation.test.js tests\no-touch-boundary-regression.test.js
```

Targeted test result: `21/21` passed.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains controlling.
