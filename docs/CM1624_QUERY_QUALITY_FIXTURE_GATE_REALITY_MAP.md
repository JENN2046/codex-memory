# CM-1624 Query Quality Fixture Gate Reality Map

Date: 2026-06-11

## Decision

The audit-plan item "add query-quality fixture/regression coverage for V8/TagMemo recall behavior" maps to an existing local gate in the current repository:

```text
npm run query:quality:temp-db
node --test tests\query-quality-temp-db-gate.test.js
```

This slice records the current reality instead of duplicating an already-present fixture gate.

## Existing Coverage Confirmed

`tests/query-quality-temp-db-gate.test.js` covers:

- synthetic temp SQLite recall records
- default gate pass over synthetic records
- `topKOrder` failure detection
- tombstoned record suppression
- cross-client private record suppression
- CLI JSON output
- provider calls remain `0`
- external provider is not allowed
- MCP/live MCP calls remain `0`
- real memory reads/writes remain `0`
- raw store scans remain `0`
- durable audit writes remain `0`
- public MCP expansion remains `false`
- config/watchdog/startup changes remain `0`
- readiness claim remains `false`

## Validation

```text
node --test tests\query-quality-temp-db-gate.test.js
```

Result: `4/4` passed.

## Non-Claims

This is fixture/temp-db evidence only. It does not claim:

- live memory recall quality
- provider-backed recall quality
- production query quality
- public MCP response changes
- runtime/public MCP persistent TagMemo enrichment
- broad memory scan safety
- production/release/cutover readiness
- complete V8

## Next Safe Route

If more V8/TagMemo query-quality work is desired, the next local-safe slice should extend the existing temp DB gate rather than create a parallel harness.

Possible extensions:

- add explicit TagMemo runtime-recall projection fixture cases
- add deterministic tie-breaker cases
- add proposal/private-cross-client/tombstoned must-not-return cases with richer tag projections
- add a docs matrix connecting TagMemo internal ranking fields to `query:quality:temp-db`
