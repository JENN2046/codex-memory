# P20.2 Health / Readiness Dry-Run Evidence

Phase: `P20.2-health-readiness-dry-run-evidence`

Status: evidence captured; initial readiness blocker resolved by P20.2b

## Purpose

Collect local production health and readiness evidence without starting services, installing watchdogs, editing startup entries, changing Codex or Claude configuration, calling providers, reading real memory content, writing durable memory, or applying migration / import / export behavior.

P20.2 is an evidence phase. It records what can be checked safely now, what report shapes are available, and what must be fixed before local production hardening can be treated as green.

## Evidence Commands Run

| Command | Result | Notes |
|---|---|---|
| `npm run gate:ci -- --json` | failed | CI-safe fixture gate ran with `fixtureOnly=true`, `noNetwork=true`, `noDaemon=true`, `noProvider=true`; one embedded test failed. |
| manual CI-safe test batch matching `gate:ci` exclusions | failed | Reproduced the same `448/449 passed, 1 failed` result and identified the failing test. |

`gate:ci` evidence summary:

| Check | Result | Evidence |
|---|---|---|
| compare | ok | `43/43` standard-suite cases matched; `coreMismatchCountTotal=0`; `extendedMismatchCountTotal=0`. |
| rollback | ok | `43/43` cases rollback-ready; `coreMismatchCountTotal=0`; `extendedMismatchCountTotal=0`. |
| queries | ok | `14/14` query assertions passed; fixture recall `14/14`; `mutated=false`; `providerCalls=0`; `durableMemoryTouched=false`. |
| policyPreflight | ok | fixture-only soft read-policy preflight; `mutated=false`; no daemon / network / provider. |
| lifecyclePolicy | ok | default off; active/stale included; proposal/rejected/superseded/tombstoned excluded; `rawWorkspaceIdExposed=false`; `mutated=false`. |
| docs | ok | `39` npm scripts inspected; all script targets exist. |
| tests | error | `448/449 passed, 1 failed` across `53` CI-safe test files. |

## Readiness Blocker

The current blocker is not a startup or watchdog failure. The blocker is an existing TagMemo semantic fixture drift:

```text
tests/tagmemo-targeted-semantic-fixture.test.js
P16.3 targeted semantic fixtures lock TagMemo ordering and audit shape

case: group-tag-interleaves-semantic-buckets
expected: p16-alpha-b, p16-beta, p16-alpha-a
actual:   p16-alpha-a, p16-beta, p16-alpha-b
```

P20 local production readiness should not proceed to install, watchdog, service, or release-candidate work while `gate:ci` is red.

Follow-up: P20.2b repaired the P16.3 fixture contract without runtime changes, and `npm run gate:ci -- --json` later passed with tests `449/449`.

## Safe Report Shapes Reviewed From Source

### `observe:http`

Source: `src/cli/http-observe.js`

Shape families:

- `summary`
- `health`
- `config`
- `logs.http`
- `logs.watchdog`
- `governance`
- `readPolicy`
- `audits.write`
- `audits.recall`

Safety notes:

- Does not start HTTP MCP.
- Does query the configured `/health` URL.
- Reads HTTP / watchdog logs.
- Reads write and recall audit summaries.
- Can expose local runtime state, so P20.2 did not run it as live evidence.

### `gate:ci`

Source: `src/cli/gate-ci.js`

Shape families:

- `summary`
- `checks.compare`
- `checks.rollback`
- `checks.queries`
- `checks.policyPreflight`
- `checks.lifecyclePolicy`
- `checks.tests`
- `checks.docs`

Safety notes:

- Fixture-only.
- `noNetwork=true`.
- `noDaemon=true`.
- `noProvider=true`.
- Does not require HTTP MCP to be running.
- Current result is blocked by the P16.3 fixture drift above.

### `rollback:mainline:plan`

Source: `src/cli/mainline-rollback.js`

Shape families:

- `summary`
- `config`
- `current`
- `rollbackTarget`
- `legacyProbe`
- `rollbackPatch`
- `steps`

Safety notes:

- Planning-only; it does not edit Codex config.
- It may read the configured Codex config path and discover/probe a legacy target.
- P20.2 did not run it live because this phase avoids external config probing unless explicitly scoped.

## Commands Not Run

| Command | Reason |
|---|---|
| `npm run start:http` | Starts HTTP MCP runtime; out of scope. |
| `npm run start:http:ensure` | May start a hidden HTTP MCP process; out of scope. |
| `npm run start:http:watchdog:once` | May start HTTP MCP and writes watchdog logs; out of scope. |
| `npm run start:http:watchdog:ensure` | Starts a long-running watchdog process; out of scope. |
| `npm run start:http:install-task` | Writes scheduled task or HKCU Run fallback; hard stop. |
| `npm run start:http:watchdog:install` | Writes scheduled task or HKCU Run fallback; hard stop. |
| `npm run observe:http -- --json` | Read-only but live runtime/log/audit observation; deferred until explicitly scoped after gate is green. |
| `npm run rollback:mainline:plan -- --json` | Read-only but may inspect external config / legacy target; deferred until explicitly scoped after gate is green. |
| provider smoke / benchmark | Provider calls are out of scope. |
| `rebuild-profile --confirm` | Hard stop. |
| migration / import-export apply | Hard stop. |

## Readiness Interpretation

Current status:

```text
startupInstallReady=false
watchdogInstallReady=false
runtimeObservationReady=false
gateCiReady=false at initial P20.2 capture; resolved by P20.2b
mutated=false
providerCalls=0
durableMemoryTouched=false
```

The safe path was to fix or reconcile the P16.3 TagMemo ordering drift before continuing deeper P20 readiness work. P20.2b completed that repair and restored `gate:ci`.

## Boundary Confirmation

P20.2 did not:

- change `src/`
- add or modify tests / fixtures
- change `package.json` or lockfiles
- change MCP schema or public tools
- start HTTP MCP
- start watchdog
- install scheduled tasks
- edit HKCU Run
- edit Codex or Claude configuration
- call providers
- read real memory content
- write durable DB / memory / diary data
- run SQLite migration or `ALTER TABLE`
- apply import/export
- create backup or restore backup
- tag, release, or deploy

## Next Recommended Phase

`P20.3-rollback-backup-operations-plan`

P20.3 rollback / backup operations planning may proceed as docs/planning only. It still must not install services, change startup/watchdog state, mutate config, call providers, read real memory content, apply import/export, or run migration.
