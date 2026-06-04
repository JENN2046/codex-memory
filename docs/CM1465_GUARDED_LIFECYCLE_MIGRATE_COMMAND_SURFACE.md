# CM-1465 Guarded Lifecycle Migrate Command Surface

Date: 2026-06-04

## Scope

CM-1465 exposes the existing guarded lifecycle SQLite migrate CLI as a package script:

```powershell
npm run lifecycle:sqlite:migrate
```

This prepares the command surface required by a future exact-approved real DB apply, but does not execute real DB migration apply.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Source Reality

The guarded CLI already existed:

```text
src/cli/lifecycle-sqlite-migrate.js
```

The temp-DB test coverage already existed:

```text
tests/lifecycle-sqlite-migrate-cli.test.js
```

CM-1465 only adds the missing `package.json` script:

```json
"lifecycle:sqlite:migrate": "node ./src/cli/lifecycle-sqlite-migrate.js"
```

## Guard Contract

The command surface is guarded:

- Default behavior is dry-run only.
- Without `--confirm`, it does not apply.
- With `--confirm` but without `--backup <path>`, it fails closed.
- The unsupported `--apply` alias is rejected.
- Existing backup paths are rejected.
- Test apply coverage uses temp SQLite DBs only.

Future exact-approved apply command shape:

```powershell
npm run lifecycle:sqlite:migrate -- --confirm --backup <backup_path>
```

## Boundary Receipt

CM-1465 did not run `--confirm`.

CM-1465 did not execute real DB migration apply.

CM-1465 did not use a real backup path for apply.

CM-1465 did not edit or delete a real SQLite DB.

CM-1465 did not perform a raw row scan, raw audit scan, raw JSONL dump, provider/API call, bearer-token use, live memory tool call, public MCP expansion, dependency/config/watchdog/startup change, release/tag/deploy, readiness claim, `RC_READY` claim, remote action, or push.

## Validation

Required CM-1465 validation:

```powershell
git diff --check
node --test tests\lifecycle-sqlite-migrate-cli.test.js
npm run test:migration
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git status --short
```

`tests/lifecycle-sqlite-migrate-cli.test.js` uses temp SQLite DBs for guarded apply coverage. It does not apply to the durable memory DB.
