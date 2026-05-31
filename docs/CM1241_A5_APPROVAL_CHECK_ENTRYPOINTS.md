# CM-1241 A5 Approval Check Entrypoints

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1241 exposes the CM-1240 A5 approval check CLI through standard local package entrypoints.

This is local package metadata plus tests only. It does not add dependencies, change lockfiles, grant approval, execute approved commands, start services, call providers, call MCP tools, read real memory, write durable state, push, cut over, or claim readiness.

## Result

Added:

- npm script: `a5:approval-check`
- bin entry: `codex-memory-a5-approval-check`
- targeted package metadata test: `tests/a5-approval-check-package-entry.test.js`

Supported local command:

```powershell
npm run a5:approval-check -- --json --approval-line "I approve A5-GAP-5 for codex-memory on branch main at commit <FRESH_HEAD>, running cutover-context strict gate only, no remote write." --expected-unit A5-GAP-5 --expected-branch main --expected-commit <FRESH_HEAD>
```

The command still only validates supplied text. Exit code `0` means the approval line matched the expected unit, branch, and commit. It is not permission to run the approved action.

## Boundary

- no A5-GAP execution
- no strict gate execution
- no service start
- no MCP `tools/call`
- no provider call
- no real memory scan
- no durable memory/audit write
- no config/watchdog/startup change
- no dependency or lockfile change
- no remote action
- no readiness claim

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```

## Validation

Passed:

```powershell
node --check src\cli\a5-approval-check.js
node --test tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js
npm run a5:approval-check -- --help
npm run gate:ci
```

`gate:ci` was fixture-only / no network / no daemon / no provider and passed with docs script target check `43 scripts, all targets exist`.
