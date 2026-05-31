# CM-1232 ValidationAggregator Effective Gap Delta

Date: 2026-05-31

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Add static-baseline versus effective-gap delta fields to the ValidationAggregator full implementation gap accounting surface.

This is a local source/test report-shape improvement only. It does not execute A5-GAP-6 aggregation, read evidence files, execute validation commands from inside the aggregator, run runtime collectors, scan runtime stores, call providers, touch durable memory/audit, run migration/import/export/backup/restore, change config/watchdog/startup, expand MCP tools, or claim readiness.

## Change

`p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting` now includes:

- `staticBaselineClearedGapIds`
- `staticBaselineClearedGapCount`
- `staticBaselineStillRemainingGapIds`
- `staticBaselineStillRemainingGapCount`
- `effectiveNonBaselineRemainingGapIds`
- `effectiveNonBaselineRemainingGapCount`

The summary now exposes the corresponding counts.

## Result

When no explicit sanitized runtime summary is accepted, the delta is empty:

```yaml
staticBaselineClearedGapCount: 0
staticBaselineStillRemainingGapCount: 7
effectiveNonBaselineRemainingGapCount: 0
```

When an accepted sanitized runtime summary removes a baseline remaining gap, the delta lists it in `staticBaselineClearedGapIds`. This makes future A5-GAP-6 aggregation output easier to audit without implying readiness.

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
