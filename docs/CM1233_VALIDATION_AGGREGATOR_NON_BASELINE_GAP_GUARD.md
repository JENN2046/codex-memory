# CM-1233 ValidationAggregator Non-Baseline Gap Guard

Date: 2026-05-31

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Add a non-baseline remaining-gap guard to the ValidationAggregator full implementation closure criteria.

This is a local source/test report-shape improvement only. It does not execute A5-GAP-6 aggregation, read evidence files, execute validation commands from inside the aggregator, run runtime collectors, scan runtime stores, call providers, touch durable memory/audit, run migration/import/export/backup/restore, change config/watchdog/startup, expand MCP tools, or claim readiness.

## Change

`p66ValidationAggregatorFullImplementationDefinition.closureCriteria` now includes:

```yaml
effectiveNonBaselineRemainingGapsAbsent: true
```

If an accepted sanitized runtime summary introduces remaining gaps that are not part of the static baseline, `closureMissingCriteria` includes:

```yaml
- effective_non_baseline_remaining_gaps_absent
```

## Result

The report now fails closed when future aggregation evidence contains unmodeled remaining gaps, even if the summary itself is accepted and safe.

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

Targeted test result: `22/22` passed.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains controlling.
