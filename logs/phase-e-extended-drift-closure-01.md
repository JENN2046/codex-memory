# Phase E Extended Drift Closure 01

## Summary

- Scope: `Phase E / P1-1`
- Goal: reduce `extended-only-drift` without changing core donor-aligned recall behavior
- Strategy: keep adapter/service semantics intact, but move donor-unneeded top-level CLI fields into `meta`

## Change

- Updated `src/cli/active-memory-cli-common.js`
- `--full` success payloads now keep donor-shaped top-level fields cleaner
- error payloads now keep donor-shaped top-level fields cleaner
- moved these top-level drift-heavy fields into `meta`:
  - `toolName / tool_name`
  - `code`
  - `command`
  - `maid / maidName`
  - `agentId / agent_id`
  - `topicId / topic_id / topicName`
  - `historyStatus`
  - `resultCount / result_count`
  - `topicCount / topic_count`
  - selected CLI-only helper fields such as `mode`, `adapterStatus`, rerank flags, and duplicated output aliases

## Why

- compare/rollback only need donor-like top-level compatibility for migration gating
- we still want richer diagnostics available for humans
- nesting the extra fields under `meta` keeps them available without polluting donor-facing comparison fields

## Validation

- `node --test .\tests\vcp-active-memory-cli.test.js`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
- `node --test .\tests\rollback-active-memory-cli.test.js`
- `node --test .\tests\mainline-rollback-cli.test.js`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
- `npm test`

## Result

- `matchedCaseCount = 25`
- `readyCaseCount = 25`
- `extendedMismatchCountTotal = 0`
- `driftReasonBreakdown = {}`
- full regression baseline is now `87/87`

## Follow-up

- next best target is `Phase E / P1-2`: continue aligning donor ranking feel and selective extended payload details
