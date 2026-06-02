# RC ValidationAggregator Stale Summary Invalidation Slice

Phase: `post-RC-9-validation-aggregator-full-implementation-slice`

Mode: `local source/test implementation`

Risk: `local reversible source/test`

Decision: `SOURCE_TEST_SLICE_ACCEPTED_NOT_RC_READY`

## Purpose

Reduce the `validation_aggregator_full_implementation_incomplete` blocker by making explicit runtime evidence summaries stale-aware.

This slice does not read Git, execute runtime evidence, scan files, scan stores, call MCP tools, call providers, mutate durable memory or audit state, change config/watchdog/startup, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Changed

- `src/core/ValidationAggregatorService.js`
- `tests/v1-rc-validation-aggregator-implementation.test.js`

## Behavior

`buildV1RcValidationAggregatorReport({ generatedAt, runtimeEvidenceSummary })` now accepts an explicit sanitized summary only when `runtimeEvidenceSummary.evidenceGeneratedAt` is present, parseable, not in the future relative to report `generatedAt`, and within the configured freshness window.

Accepted behavior:

- fresh summaries expose `evidenceFreshnessStatus=fresh`
- fresh summaries expose sanitized `evidenceGeneratedAt`
- fresh summaries expose the calculated age in hours

Fail-closed behavior:

- missing timestamp rejects with `runtime_evidence_summary_timestamp_required`
- malformed timestamp rejects with `runtime_evidence_summary_timestamp_malformed`
- future timestamp rejects with `runtime_evidence_summary_timestamp_future`
- stale timestamp rejects with `runtime_evidence_summary_stale`
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
tests = 21
pass = 21
fail = 0
```

## Boundary

This slice advances stale evidence invalidation for explicit summaries, but it does not complete the full ValidationAggregator implementation.

Still not claimed:

- automatic runtime evidence ingestion
- full final RC matrix execution
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`

## Next

Continue local implementation slices for `validation_aggregator_full_implementation_incomplete`, focusing on final matrix authority before any cutover discussion.
