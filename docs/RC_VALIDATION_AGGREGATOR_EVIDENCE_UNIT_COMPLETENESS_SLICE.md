# RC ValidationAggregator Evidence Unit Completeness Slice

Phase: `post-RC-9-validation-aggregator-full-implementation-slice`

Mode: `local source/test implementation`

Risk: `local reversible source/test`

Decision: `SOURCE_TEST_SLICE_ACCEPTED_NOT_RC_READY`

## Purpose

Reduce the `validation_aggregator_full_implementation_incomplete` blocker by requiring explicit runtime evidence summaries to name the expected approved RC evidence units.

This slice does not execute runtime evidence, scan files, scan stores, call MCP tools, call providers, mutate durable memory or audit state, change config/watchdog/startup, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Changed

- `src/core/ValidationAggregatorService.js`
- `tests/v1-rc-validation-aggregator-implementation.test.js`

## Behavior

`buildV1RcValidationAggregatorReport({ runtimeEvidenceSummary })` now accepts only explicit sanitized summaries that include the expected A5 evidence unit set:

```text
A5-GAP-1
A5-GAP-2
A5-GAP-3
A5-GAP-4
A5-GAP-5
```

Accepted behavior:

- all required unit ids are present once
- no unknown unit id is present
- bridge summary exposes evidence unit counts and `evidenceUnitsComplete=true`
- report summary exposes the same evidence unit completeness counters

Fail-closed behavior:

- missing required unit ids reject the runtime summary with `runtime_evidence_units_missing`
- unknown unit ids reject the runtime summary with `runtime_evidence_units_unknown`
- duplicate unit ids reject the runtime summary with `runtime_evidence_units_duplicate`
- rejected summaries do not count local evidence gaps and do not claim readiness

## Validation

Targeted validation:

```powershell
node --check src\core\ValidationAggregatorService.js
node --check tests\v1-rc-validation-aggregator-implementation.test.js
node --test tests\v1-rc-validation-aggregator-implementation.test.js
```

Result:

```text
tests = 20
pass = 20
fail = 0
```

## Boundary

This slice advances explicit evidence-unit completeness validation, but it does not complete the full ValidationAggregator implementation.

Still not claimed:

- automatic runtime evidence ingestion
- full final RC matrix execution
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`

## Next

Continue local implementation slices for `validation_aggregator_full_implementation_incomplete`, focusing on stale evidence invalidation and final matrix authority before any cutover discussion.
