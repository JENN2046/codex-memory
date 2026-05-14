# Validation Selection Matrix

Updated: 2026-05-14

## Purpose

A4.8 selects validation by risk and touched surface. Passing a broad command is not enough unless it covers the actual requirement being changed.

## Docs-Only

Use for docs, board notes, status files, handoff files, and policy text.

Required:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Also inspect the diff for stale claims, broken phase state, copied secrets, and overclaiming.

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

Runtime mutation tools are not A4.8 by default; they require explicit approval.

## Package.json Script Only

Use when `package.json` only adds or adjusts a script and does not change dependencies.

Required:

- inspect the script target exists
- run targeted test for the script
- run `npm test`
- run `git diff --check`

Any dependency or package-manager change is a hard stop.

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
