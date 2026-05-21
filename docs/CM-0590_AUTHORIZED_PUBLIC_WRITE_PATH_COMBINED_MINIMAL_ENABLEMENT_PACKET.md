# CM-0590 Authorized Public Write-Path Combined Minimal Enablement Packet

Status: APPROVED_EXECUTED_NOT_READY
Decision: AUTHORIZED_PUBLIC_WRITE_PATH_MINIMAL_ENABLEMENT_NOT_READY
Date: 2026-05-20

Execution evidence:

- [CM-0592 Authorized Public Write-Path Combined Minimal Enablement Evidence](/A:/codex-memory/docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md)

## Purpose

This packet narrows the next exact A5 boundary after CM-0589.

It does not execute `record_memory`.

It does not execute `search_memory`.

It does not prove readiness.

Its only purpose is to establish the minimum authorized public write-path prerequisites that CM-0589 classified as currently missing.

## Current Evidence Source

Current blocker-classification evidence:

```text
docs/CM-0589_AUTHORIZED_PUBLIC_WRITE_PATH_PREREQUISITE_CLASSIFICATION_EVIDENCE.md
```

Current blockers:

```text
AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_TOKEN_MISSING
AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_ENDPOINT_MISSING
AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_STARTUP_OR_INJECTION_APPROVAL_MISSING
```

## Exact Scope

This packet requests future exact approval for one bounded enablement unit only:

```text
AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_001
```

Goal:

```text
Establish one session-scoped authorized loopback public write-path prerequisite set by allowing exactly one current-session bearer-token binding check/bind, exactly one bounded loopback HTTP ensure/start action, and exactly one bounded loopback health confirmation, without calling record_memory.
```

## Why This Packet Is Narrower Than A Second Write Attempt

CM-0587 already proved that a second write-path attempt should not be retried blindly.

CM-0589 then classified that the current blocker is not only write authorization itself, but the missing prerequisite trio in front of it.

This packet therefore builds only the prerequisite boundary and still stops before any write validation.

## Permitted Only Under Exact Approval

- re-read branch, `HEAD`, `origin/main`, and remote main
- verify or establish current-session-only `CODEX_MEMORY_HTTP_TOKEN` binding without printing the token value
- run exactly one bounded `npm run start:http:ensure`
- perform exactly one bounded loopback `GET /health` probe against the resolved endpoint
- record one bounded enablement evidence note
- update docs/board after the enablement attempt

## Command-Family Contract

Only the following command families may appear in a future approved execution:

### Baseline Recheck

- `git branch --show-current`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git ls-remote origin refs/heads/main`

### Token Boundary

- current-session env presence check for `CODEX_MEMORY_HTTP_TOKEN`
- current-session-only env binding for `CODEX_MEMORY_HTTP_TOKEN` if and only if the future approval line explicitly allows binding

### Endpoint Boundary

- exactly one `npm run start:http:ensure`

### Health Boundary

- exactly one loopback `GET /health` probe against the resolved endpoint

No other runtime, MCP, observe, recall, write, or audit-inspection command family is allowed.

## Explicit Non-Goals

- no `record_memory`
- no `search_memory`
- no marker search
- no `.jsonl` read
- no `observe:http`
- no provider/model call
- no config file edit
- no Codex/Claude global config mutation
- no watchdog install/change
- no HKCU Run or scheduled-task change
- no public MCP expansion
- no migration/import/export/backup/restore apply
- no durable memory write
- no readiness claim

## Approved Surface Definition

### Token Boundary

Allowed only as:

- current-session scope
- no file write
- no token value echo
- no token persistence

The token may be:

- already present and only checked
- or explicitly bound into the current session if the future approval line names that action

It may not be:

- written to `.env`
- written to any config file
- echoed back in terminal output
- copied into docs, logs, board state, or memory
- persisted for future sessions

### Endpoint Boundary

Allowed only as:

- loopback/local endpoint
- resolved from existing defaults or current-session env
- one bounded ensure/start action through the existing repo entrypoint

Current repository entrypoint:

```text
npm run start:http:ensure
```

This packet does not authorize any watchdog, scheduled task, startup persistence, or non-loopback hosting.

### Health Boundary

Allowed only as:

- one bounded loopback `/health` probe
- no `observe:http`
- no audit/log tailing
- no `.jsonl` inspection

This keeps the enablement proof below the observability/audit-read boundary.

## Evidence Requirements

The future execution record must state:

- whether the token was already present before execution
- whether current-session token binding was attempted
- whether `start:http:ensure` was attempted
- whether the loopback endpoint became healthy
- whether the packet stopped before write validation
- that no `record_memory`, `search_memory`, `observe:http`, `.jsonl` read, provider call, config mutation, startup persistence, or readiness claim occurred

## Fail-Closed Result Shape

```json
{
  "unit": "AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_001",
  "targetBaseline": "<full commit>",
  "tokenPresentBefore": false,
  "tokenSessionBoundDuringExecution": false,
  "startupAttempted": false,
  "endpointHealthyAfterEnsure": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "jsonlReadPerformed": false,
  "providerCalled": false,
  "readinessClaimed": false,
  "result": "AUTHORIZED_PUBLIC_WRITE_PATH_MINIMAL_ENABLEMENT_NOT_READY"
}
```

## Stop Conditions

Stop immediately and report `BLOCKED_A5_OR_EXPLICIT_APPROVAL_REQUIRED` if progress would require:

- printing a token value
- persisting a token outside the current session
- editing `.env` or any config file
- starting watchdog/startup persistence
- changing Codex or Claude global config
- calling `record_memory`
- calling `search_memory`
- reading `.jsonl`
- running `observe:http`
- provider/model call
- public MCP expansion
- migration/import/export/backup/restore apply
- durable write
- push/tag/release/deploy/cutover
- any readiness claim

Stop and report `BLOCKED_BASELINE_REBIND_REQUIRED` if:

- target baseline is not current `HEAD`
- `origin/main` diverged
- remote main diverged
- uncommitted unrelated non-docs/board drift exists

## Required Approval Line

Suggested future approval line:

```text
授权执行 CM-0590，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_001，只允许在当前 session 内检查或绑定 CODEX_MEMORY_HTTP_TOKEN（不得打印、不得持久化）、执行 exactly one `npm run start:http:ensure`、并对 loopback `/health` 做 exactly one bounded probe；禁止 record_memory / search_memory / marker search / observe:http / .jsonl read / provider / config change / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

## Current State

```text
current blocker classification: CM-0589
latest execution evidence: CM-0592
token present in current shell before execution: no
endpoint healthy after approved ensure: yes
startup or injection approval boundary consumed: yes
controlling status: RC_NOT_READY_BLOCKED
```

## Next Safe Action

Use this packet as the consumed combined enablement record.

Do not re-run `AUTH_WRITE_PATH_VALIDATION_001` from this result.

The remaining blocker is now token-only; treat CM-0594 as consumed historical evidence and use CM-0597 before any future write-validation candidate.
