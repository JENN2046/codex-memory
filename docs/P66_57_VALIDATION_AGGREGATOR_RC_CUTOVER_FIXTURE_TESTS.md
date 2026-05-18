# P66.57 ValidationAggregator RC Cutover Fixture Tests

Status: `FIXTURE_TESTS_ONLY`

Decision: `NOT_READY_BLOCKED`

## Purpose

P66.57 defines detailed local fixture/test acceptance criteria for the P66.56 RC cutover gap:

```text
rc_cutover_not_executed
```

This phase turns the P66.56 planning contract into a stricter machine-readable acceptance fixture. It does not execute RC cutover, push, tag, release, deploy, run `gate:mainline:strict`, run `gate:ci`, execute the final RC runner, execute cutover-context gates, fetch, merge, rebase, checkout, reset, detach `HEAD`, switch Codex or Claude config, install or operate watchdog/startup tasks, call providers, read real memory, scan runtime stores, write durable memory or audit records, expand public MCP tools, or claim `RC_READY`.

## Scope

P66.57 adds:

- `tests/fixtures/p66-validation-aggregator-rc-cutover-fixture-v1.json`
- `tests/p66-validation-aggregator-rc-cutover-fixture.test.js`

The fixture locks:

- selected gap identity and priority
- P66.56 source-plan binding
- RC cutover evidence acceptance cases
- RC cutover context acceptance cases
- execution readiness rules
- source boundary expectations
- fail-closed cases
- disallowed work
- A5 hard stops
- safety flags
- forbidden readiness claims

## Acceptance Cases

Every required RC cutover evidence group remains missing until a future separately authorized runtime phase supplies explicit, machine-readable evidence:

```text
explicit_a5_rc_cutover_authorization
objective_complete
zero_remaining_runtime_gaps
zero_a5_hard_stops
final_rc_matrix_ready
v1_rc_ready
cutover_mainline_strict_gate_ready
live_http_operation_readiness
governance_runtime_loop_ready
recall_isolation_runtime_proof_ready
migration_approval_execution_ready
release_target_binding
rollback_plan
no_git_state_change_report
no_config_switch_report
no_watchdog_startup_report
no_provider_call_report
machine_readable_rc_cutover_report
```

Every missing, stale, warning-only, failed, non-machine-readable, source-mismatched, objective-incomplete, runtime-gap-bearing, A5-hard-stop-bearing, unapproved release-action, config-mutating, provider-backed, public-MCP-expanding, cutover-readiness, or `RC_READY` claim must fail closed.

## Controls

The fixture requires synthetic or sanitized metadata source boundaries only. It rejects raw command output with secrets, raw git remotes, raw auth material, real memory content, provider output, release artifacts, deployment logs, config mutation output, service installation output, and operator free text.

P66.57 only defines the acceptance contract. It does not run controls against Git remotes, gates, runtime stores, providers, config files, startup/watchdog systems, release systems, remote systems, or real memory.

## Boundaries

P66.57 does not:

- execute RC cutover
- claim `RC_READY`
- push, tag, release, or deploy
- run `gate:mainline:strict`
- run `gate:ci`
- execute the final RC runner
- execute cutover-context gates
- fetch, merge, rebase, checkout, reset, or detach `HEAD`
- switch Codex or Claude config
- install watchdog or startup entries
- edit `.env` or secrets
- call providers
- read real memory
- scan diary data
- scan SQLite rows
- scan vector index data
- scan candidate cache data
- scan recall audit data
- write durable memory records
- write durable audit records
- expand public MCP tools
- expose `validate_memory` publicly

## Readiness

P66.57 preserves:

- `validationAggregatorFullImplementation=false`
- `rcCutoverExecuted=false`
- `rcCutoverAuthorized=false`
- `rcCutoverReady=false`
- `releaseActionReady=false`
- `pushReady=false`
- `tagReady=false`
- `deployReady=false`
- `objectiveComplete=false`
- `zeroRemainingRuntimeGaps=false`
- `zeroA5HardStops=false`
- `finalRcMatrixReady=false`
- `v1RcReady=false`
- `runtimeReady=false`
- `rcReady=false`
- `cutoverReady=false`

The release state remains `NOT_READY_BLOCKED`.

## Validation

Required validation:

```text
node --check tests\p66-validation-aggregator-rc-cutover-fixture.test.js
node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/p66-validation-aggregator-rc-cutover-fixture-v1.json','utf8'))"
node --test tests\p66-validation-aggregator-rc-cutover-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `RC_CUTOVER_ACCEPTANCE_FIXTURE_DEFINED`

P66.57 is a docs/fixture/test acceptance phase only. It strengthens local RC cutover requirements without executing cutover, changing Git state, mutating config, calling providers, scanning or writing real data, expanding public MCP, performing release actions, or claiming readiness.
