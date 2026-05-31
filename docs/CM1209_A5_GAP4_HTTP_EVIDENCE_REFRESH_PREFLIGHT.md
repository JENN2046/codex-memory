# CM1209 A5-GAP-4 HTTP Evidence Refresh Preflight

Date: 2026-05-31

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Purpose

Prepare the next A5/P66 runtime-gap unit after CM-1208 produced target-bound strict-gate evidence for `main@d3b9bf9fb8cc92cc7b2f2112d6006940a68b3d9d`.

This document does not execute HTTP observe, start or ensure runtime, change config, install watchdog/startup, call providers, read or scan real memory, write durable memory or audit state, expand public MCP tools, push, tag, release, deploy, or claim readiness.

## Selected Next Unit

`A5-GAP-4 live_http_operation_readiness_not_claimed`

Rationale:

- The P66 approval packet recommends live HTTP operation evidence before or alongside cutover-context strict-gate evidence.
- CM-1208 has already refreshed `A5-GAP-5` for the current local target.
- The current branch has advanced through docs/board commits since the older HTTP evidence.
- GAP-4 remains endpoint-bound only; even a pass would not prove production readiness, RC readiness, cutover readiness, write reliability, or recall reliability.

## Proposed Endpoint

```text
http://127.0.0.1:7605
```

## Exact Approval Template

Fill `<COMMIT>` from a fresh `git rev-parse HEAD` immediately before approval:

```text
I approve A5-GAP-4 for codex-memory on branch main at commit <COMMIT>, endpoint http://127.0.0.1:7605, no config/watchdog/startup change.
```

## Required Fresh Preflight Before Execution

```powershell
git status --short --branch
git log --oneline --decorate -n 10
git diff --stat
git diff --check
git rev-parse HEAD
```

Stop if:

- branch is not `main`
- approval commit does not equal fresh `HEAD`
- tracked worktree contains unrelated changes
- execution would require config/watchdog/startup changes
- execution would call providers
- execution would read or scan real memory content
- execution would write durable memory or durable audit state
- execution would expand public MCP tools
- execution would push, PR, tag, release, deploy, or claim readiness

## Expected Evidence Shape

If separately approved, the evidence should record:

- approved commit and branch
- approved endpoint
- health result
- MCP initialize result
- MCP tools/list public tool list
- HTTP observe summary
- no config/watchdog/startup change proof
- no provider call proof
- no real memory scan proof
- no durable write proof
- no public MCP expansion proof
- final decision remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`
