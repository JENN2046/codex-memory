# CM-1230 ValidationAggregator Effective Gap Accounting

Date: 2026-05-31

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Add effective gap accounting fields to the ValidationAggregator full implementation report shape.

This is a local source/test report-shape improvement only. It does not execute A5-GAP-6 aggregation, read evidence files, execute validation commands from inside the aggregator, run runtime collectors, scan runtime stores, call providers, touch durable memory/audit, run migration/import/export/backup/restore, change config/watchdog/startup, expand MCP tools, or claim readiness.

## Change

`p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting` now includes:

- `effectiveGapSource`
- `effectiveRemainingFullImplementationGapIds`
- `effectiveRemainingFullImplementationGapCount`
- `effectiveLocallyEvidencedFullImplementationGapIds`
- `effectiveLocallyEvidencedFullImplementationGapCount`

The summary now exposes:

- `p66ValidationAggregatorFullImplementationGapAccountingEffectiveGapSource`
- `p66ValidationAggregatorFullImplementationGapAccountingEffectiveRemainingGapCount`
- `p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocallyEvidencedGapCount`

## Result

When no explicit sanitized runtime summary is accepted, effective gap accounting stays on the static baseline:

```yaml
effectiveGapSource: static_baseline
effectiveRemainingFullImplementationGapCount: 7
effectiveLocallyEvidencedFullImplementationGapCount: 2
```

When an explicit sanitized runtime summary is accepted, effective gap accounting reflects the accepted summary:

```yaml
effectiveGapSource: accepted_runtime_summary
```

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
