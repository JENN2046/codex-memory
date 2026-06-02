# RC ValidationAggregator Current-Head Required Slice

Phase: `post-RC-9-validation-aggregator-full-implementation-slice`

Mode: `local source/test implementation`

Risk: `local reversible source/test`

Decision: `SOURCE_TEST_SLICE_ACCEPTED_NOT_RC_READY`

## Purpose

Reduce the `validation_aggregator_full_implementation_incomplete` blocker by making current-head binding mandatory for explicit runtime evidence summaries.

This slice does not read Git, execute runtime evidence, scan files, scan stores, call MCP tools, call providers, mutate durable memory or audit state, change config/watchdog/startup, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Changed

- `src/core/ValidationAggregatorService.js`
- `tests/v1-rc-validation-aggregator-implementation.test.js`

## Behavior

`buildV1RcValidationAggregatorReport({ runtimeEvidenceSummary })` now accepts an explicit sanitized summary only when:

- `currentHeadCommit` is present and is a valid commit id
- `expectedCurrentHeadCommit` is present and is a valid commit id
- both commit ids match

Fail-closed behavior:

- missing or one-sided current-head binding rejects the runtime summary with `current_head_binding_required`
- mismatched commit ids still reject with `current_head_binding_mismatch`
- malformed commit strings still reject with `current_head_binding_malformed`
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

This slice advances explicit current-head binding enforcement, but it does not complete the full ValidationAggregator implementation.

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
