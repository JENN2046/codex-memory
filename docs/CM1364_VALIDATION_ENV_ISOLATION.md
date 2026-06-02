# CM-1364 Validation Env Isolation

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1364 closes the local validation gap discovered during CM-1363.

This is a test-only hardening task. It does not execute Phase F1/F2/F3/F4/F5, does not push, does not start the HTTP service, does not call MCP/provider tools, does not read real memory/store/jsonl/raw audit data, does not write durable memory/audit data, does not change config/watchdog/startup, and does not claim readiness or reliability.

## Changes

- `tests/security-profile-config.test.js` now clears provider/rerank-related environment variables by default for the security profile config tests.
- Tests that expect default local security behavior now use isolated config construction instead of inheriting ambient provider configuration from the developer shell.
- `tests/lightmemo-cli.test.js` now runs each CLI child process with an isolated temporary `CODEX_MEMORY_DATA_DIR`, `CODEX_MEMORY_LOGS_DIR`, and `CODEX_MEMORY_DIARY_PATH`.
- LightMemo child processes set `NODE_NO_WARNINGS=1` so SQLite experimental warnings do not contaminate CLI stderr assertions.

## Evidence

Validation passed:

```text
node --check tests\security-profile-config.test.js
node --check tests\lightmemo-cli.test.js
node --test tests\security-profile-config.test.js tests\lightmemo-cli.test.js
node --test tests\lightmemo-cli.test.js
node --test tests\security-profile-config.test.js
npm test
```

The final `npm test` result was:

```text
pass 2889
fail 0
```

## Remaining State

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains unchanged.

Phase F1 live-client no-write execution is still blocked until local `main` is synced to `origin/main` by explicit push approval and then receives a fresh synced-head exact A5-GAP-4 approval.
