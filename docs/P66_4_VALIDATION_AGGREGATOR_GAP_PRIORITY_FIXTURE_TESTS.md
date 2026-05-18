# P66.4 ValidationAggregator Gap Priority Fixture Tests

Phase: `P66.4-validation-aggregator-gap-priority-fixture-tests`

Mode: `A4.8 docs/fixture/test only`

Risk: `A1/A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Lock the first remaining ValidationAggregator runtime gap acceptance criteria before any runtime bridge work.

The selected first gap is:

```text
validation_aggregator_full_implementation_incomplete
```

This phase is a fixture/test acceptance contract only. It does not implement a runtime collector, execute commands, read evidence files, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Acceptance Criteria Locked

The fixture [p66-validation-aggregator-gap-priority-v1.json](/A:/codex-memory/tests/fixtures/p66-validation-aggregator-gap-priority-v1.json) locks the first-gap acceptance criteria:

- exact first gap id and priority
- accepted future local work classes
- required evidence groups before any full implementation claim
- disallowed evidence groups
- fail-closed cases
- blocked A5 actions
- no-touch boundaries
- forbidden readiness claims

The first gap remains open after P66.4. P66.4 only defines the evidence checklist that future local work must satisfy.

## Required Evidence Groups

Future work on this first gap must provide all of these evidence groups before `validationAggregatorFullImplementation` can change:

- source registry exact-set proof
- evidence freshness proof
- baseline binding proof
- runtime evidence summary normalization proof
- missing or stale evidence fail-closed proof
- unsupported source fail-closed proof
- no-touch boundary proof
- readiness overclaim rejection proof

Missing any group must keep the gap open.

## Explicit Non-Goals

P66.4 does not:

- make `validationAggregatorFullImplementation=true`
- make `runtimeReady=true`
- make `finalRcMatrixReady=true`
- make `v1RcReady=true`
- make `rcReady=true`
- clear any A5 hard stop
- execute final RC matrix
- execute live HTTP operation
- execute governance runtime loop
- execute recall isolation runtime proof
- apply migration/import-export/backup/restore
- create or move tags
- release or deploy

## Result

Result: `P66_4_GAP_PRIORITY_FIXTURE_TESTS_DEFINED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.5-validation-aggregator-source-registry-proof-helper
```

Chinese explanation: P66.5 can implement a pure explicit-input helper for source-registry proof only. It must not read files, execute commands, start services, scan real memory, or claim readiness.
