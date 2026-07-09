# CM-1448 Release Test Gate Matrix

Date: 2026-06-04

Status: `UPDATED_BY_CM1459_LOCAL_SCRIPT_CONTRACT`

## Purpose

CM-1448 recorded the test-gate contract without changing `package.json` or CI scripts.

CM-1459 adds local package-script entrypoints for migration, parity, and release-candidate gate subsets. These scripts are local source/test aggregation only; they do not authorize provider calls, daemon startup, live memory access, public MCP expansion, release, cutover, or readiness claims.

This matrix prevents a common overclaim: default local tests are useful regression evidence, but they are not release readiness by themselves.

## Current Gate Meaning

| Gate | Current Meaning | Release Claim Allowed |
|---|---|---|
| `npm test` | Default local safe regression suite through `src/cli/run-default-tests.js`; excludes known provider, daemon, and self-referential classes; fixture-drift exclusions must remain empty and visible if reintroduced | no |
| `npm run test:migration` | Local migration-adjacent test subset through `src/cli/run-release-gate-tests.js migration`; temp DB and dry-run gates only | no |
| `npm run test:parity` | Local parity/governance contract subset through `src/cli/run-release-gate-tests.js parity`; no provider, daemon, or public MCP expansion | no |
| `npm run test:release-candidate` | Local release-candidate evidence subset through `src/cli/run-release-gate-tests.js release-candidate`; reports `RC_NOT_READY_BLOCKED` contract status | no |
| targeted `node --test ...` | Slice-specific source/test evidence | no |
| `git diff --check` | whitespace/diff hygiene | no |
| current facts drift validator | status snapshot consistency | no |
| ledger consistency validator | Smart Standing ledger table consistency | no |
| `scripts/validate-local.ps1 -Area docs` | local docs/status governance validation | no |
| provider smoke or benchmark | provider-specific evidence only when exact task-relevant scope allows provider calls | no by itself |
| mainline or strict gate | stronger local mainline evidence when required by touched subsystem | no by itself |
| live client acceptance | runtime/client evidence only within exact bounded approval | no by itself |

## Contract

Release, cutover, production readiness, broad memory reliability, provider readiness, and `RC_READY` remain blocked until a dedicated release/cutover gate explicitly authorizes the required evidence and the required evidence passes.

CM-1459 adds `npm run test:release-candidate`, `npm run test:parity`, and `npm run test:migration` as local test aggregation scripts. These scripts are not release readiness, and a passing result must not be described as `RC_READY`.

## Boundary

CM-1459 changes package scripts and a local test runner only. It does not change dependencies, CI, runtime, memory tools, provider behavior, startup/watchdog/config, public MCP tools, remote state, readiness status, or `RC_READY` status.
