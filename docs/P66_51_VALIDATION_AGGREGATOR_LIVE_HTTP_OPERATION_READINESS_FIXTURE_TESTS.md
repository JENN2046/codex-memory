# P66.51 ValidationAggregator Live HTTP Operation Readiness Fixture Tests

Status: `FIXTURE_TESTS_ONLY`

Decision: `NOT_READY_BLOCKED`

## Purpose

P66.51 defines detailed local fixture/test acceptance criteria for the P66.50 live HTTP operation readiness gap:

```text
live_http_operation_readiness_not_claimed
```

This phase turns the P66.50 planning contract into a stricter machine-readable acceptance fixture. It does not start HTTP MCP, stop HTTP MCP, run `observe:http`, call `/health`, execute MCP initialize or tools/list against a live service, install or operate watchdog/startup tasks, switch Codex or Claude config, call providers, read real memory, scan runtime stores, write durable memory or audit records, execute gates or runners, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Scope

P66.51 adds:

- `tests/fixtures/p66-validation-aggregator-live-http-operation-readiness-fixture-v1.json`
- `tests/p66-validation-aggregator-live-http-operation-readiness-fixture.test.js`

The fixture locks:

- selected gap identity and priority
- P66.50 source-plan binding
- required live HTTP evidence acceptance cases
- HTTP contract acceptance cases
- operation readiness rules
- source boundary expectations
- fail-closed cases
- disallowed work
- A5 hard stops
- safety flags
- forbidden readiness claims

## Acceptance Cases

Every required live HTTP evidence group remains missing until a future separately authorized runtime phase supplies explicit, machine-readable evidence:

```text
http_health_probe
mcp_initialize_probe
tools_list_public_mcp_freeze_probe
http_observe_cli_report
no_token_mutation_rejection_probe
bearer_token_mutation_guard_probe
failure_reporting_probe
sensitive_fragment_redaction_probe
no_service_install_report
no_config_switch_report
no_provider_call_report
safe_start_preflight_report
safe_shutdown_preflight_report
machine_readable_operation_report
```

Every missing, stale, non-machine-readable, source-mismatched, raw-secret-bearing, raw HTTP response, config-mutating, provider-backed, watchdog/startup-operating, public-MCP-expanding, runtime-readiness, or `RC_READY` claim must fail closed.

## Controls

The fixture requires synthetic or sanitized metadata source boundaries only. It rejects raw HTTP bodies, raw headers, bearer tokens, cookies, raw auth errors, real memory content, provider output, runtime store output, service installation output, config mutation output, and operator free text.

P66.51 only defines the acceptance contract. It does not run controls against live HTTP services, runtime stores, providers, config files, startup/watchdog systems, remote systems, or real memory.

## Boundaries

P66.51 does not:

- start HTTP MCP
- stop HTTP MCP
- run `observe:http`
- call `/health`
- execute MCP initialize
- execute MCP tools/list
- install watchdog or startup entries
- run watchdog once
- switch Codex or Claude config
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
- execute commands, gates, or runners
- expand public MCP tools
- expose `validate_memory` publicly
- push, tag, release, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Readiness

P66.51 preserves:

- `validationAggregatorFullImplementation=false`
- `httpRuntimeObserved=false`
- `liveHttpOperationReadinessClaimed=false`
- `httpHealthReady=false`
- `mcpInitializeReady=false`
- `toolsListReady=false`
- `publicMcpFreezeVerified=false`
- `operationHardeningReady=false`
- `safeStartPreflightReady=false`
- `safeShutdownPreflightReady=false`
- `watchdogReady=false`
- `startupReady=false`
- `configSwitchReady=false`
- `providerValidationReady=false`
- `realMemoryScanned=false`
- `runtimeStoreScanned=false`
- `durableMemoryWritten=false`
- `durableAuditWritten=false`
- `runtimeReady=false`
- `finalRcMatrixReady=false`
- `v1RcReady=false`
- `rcReady=false`
- `cutoverReady=false`

The release state remains `NOT_READY_BLOCKED`.

## Validation

Required validation:

```text
node --check tests\p66-validation-aggregator-live-http-operation-readiness-fixture.test.js
node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/p66-validation-aggregator-live-http-operation-readiness-fixture-v1.json','utf8'))"
node --test tests\p66-validation-aggregator-live-http-operation-readiness-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `LIVE_HTTP_OPERATION_READINESS_ACCEPTANCE_FIXTURE_DEFINED`

P66.51 is a docs/fixture/test acceptance phase only. It strengthens local live HTTP operation readiness requirements without observing live HTTP, operating watchdog/startup, mutating config, calling providers, scanning or writing real data, expanding public MCP, or claiming readiness.
