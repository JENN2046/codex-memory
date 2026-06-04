# CM-1448 Release Test Gate Matrix

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_DOCS_ONLY_CONTRACT`

## Purpose

CM-1448 records the current test-gate contract without changing `package.json` or CI scripts.

This matrix prevents a common overclaim: default local tests are useful regression evidence, but they are not release readiness by themselves.

## Current Gate Meaning

| Gate | Current Meaning | Release Claim Allowed |
|---|---|---|
| `npm test` | Default local safe regression suite through `src/cli/run-default-tests.js`; excludes known provider, daemon, self-referential, and fixture-drift classes | no |
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

CM-1448 intentionally does not add `npm run test:release-candidate`, `npm run test:parity`, or `npm run test:migration`. Those may be future implementation work, but package-script changes are outside this local docs-only matrix.

## Boundary

CM-1448 did not change dependencies, package scripts, CI, runtime, memory tools, provider behavior, startup/watchdog/config, public MCP tools, remote state, readiness status, or `RC_READY` status.

