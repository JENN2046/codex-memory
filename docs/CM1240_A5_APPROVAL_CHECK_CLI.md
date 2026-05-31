# CM-1240 A5 Approval Check CLI

Date: 2026-05-31

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1240 adds a local, explicit-input CLI wrapper around the A5 approval line verifier.

The CLI validates text supplied by the operator. It does not discover approval text, grant approval by itself, execute approved commands, start services, call providers, call MCP tools, read real memory, write durable state, push, cut over, or claim readiness.

## Result

Added:

- `src/cli/a5-approval-check.js`
- `tests/a5-approval-check-cli.test.js`

Example:

```powershell
node .\src\cli\a5-approval-check.js --json --approval-line "I approve A5-GAP-5 for codex-memory on branch main at commit <FRESH_HEAD>, running cutover-context strict gate only, no remote write." --expected-unit A5-GAP-5 --expected-branch main --expected-commit <FRESH_HEAD>
```

The CLI returns exit code `0` only when the supplied line exactly matches the expected unit, branch, and commit. Rejections return exit code `1` with fail-closed reasons such as `missing_approval_line` or `commit_mismatch`.

## Boundary

This is source/test only:

- no A5-GAP execution
- no strict gate execution
- no service start
- no MCP `tools/call`
- no provider call
- no real memory scan
- no durable memory/audit write
- no config/watchdog/startup change
- no package or dependency change
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
node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js
```

Targeted test result: `9/9`.
