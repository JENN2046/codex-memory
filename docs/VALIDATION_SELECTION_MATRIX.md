# Validation Selection Matrix

Updated: 2026-05-21

## Purpose

A4.8 selects validation by risk and touched surface. Passing a broad command is not enough unless it covers the actual requirement being changed.

Under Smart Standing Authorization v3, validation selection also records whether the action was Green, Amber, or Red. Amber actions require exact scope, budget tracking, validation evidence, and a receipt after every meaningful external or write action.

## Docs-Only

Use for docs, board notes, status files, handoff files, and policy text.

Required:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Also inspect the diff for stale claims, broken phase state, copied secrets, and overclaiming.

## Amber Envelope Action

Use when Smart Standing Authorization v3 permits an exact, budgeted provider call, API/MCP call, runtime probe, exact external read, exact sanitized memory write, or exact small dependency action.

Required before execution:

- confirm the current user goal is clear
- confirm exact target system, target object, and action
- confirm the relevant budget remains
- confirm no Red condition is present
- define validation and rollback/cleanup

Required after execution:

- record a receipt with budget use and validation result
- record whether the next auto step remains allowed
- stop after one obvious local repair/retry if validation still fails

Amber evidence does not by itself create runtime readiness, cutover readiness, production readiness, release readiness, or `RC_READY`.

## Tests / Fixtures

Use when adding or changing fixture-backed contracts.

Required:

```powershell
node --test <targeted-test>
npm test
git diff --check
```

Run docs validation if docs changed.

## CLI

Use when adding or changing a local CLI.

Required:

```powershell
node --test <targeted-cli-test>
npm run <script> -- --json
npm test
git diff --check
```

Run docs validation if docs changed. If the CLI is dry-run-only, verify `mutated=false` and no durable writes.

## Runtime

Use when changing `src/` runtime behavior.

Required baseline:

```powershell
node --test <targeted-runtime-test>
npm test
npm run gate:ci
```

Add when applicable:

- MCP-adjacent change: `node --test tests\mcp-contract.test.js`
- HTTP/mainline affected: `npm run gate:mainline:strict`
- scope affected: `npm run scope:acceptance -- --json`
- lifecycle/SQLite-adjacent: `npm run lifecycle:sqlite:dry-run -- --json`

Runtime mutation tools are not Green by default. Exact bounded probes may be Amber under v3; broad mutation, config switching, startup/watchdog installation, and readiness claims are Red.

## Package.json Script Only

Use when `package.json` only adds or adjusts a script and does not change dependencies.

Required:

- inspect the script target exists
- run targeted test for the script
- run `npm test`
- run `git diff --check`

Any dependency or package-manager change without exact package/action list and v3 budget is a hard stop. `audit fix`, batch upgrades, and package-manager switches are Red.

## MCP Public Tool / Schema

Hard stop unless explicitly authorized.

After approval, required validation includes:

- MCP contract tests
- targeted runtime/tool tests
- `npm test`
- `npm run gate:ci`
- `npm run gate:mainline:strict`
- secret scan
- raw `workspace_id` low-risk summary check

## SQLite Migration / Real DB

Hard stop unless explicitly authorized.

Before approval, prepare:

- dry-run first
- fixture test
- backup plan
- restore plan
- migration risk report
- no-provider validation path

After approval, validation must prove backup, migration, read compatibility, and rollback/restore behavior.
