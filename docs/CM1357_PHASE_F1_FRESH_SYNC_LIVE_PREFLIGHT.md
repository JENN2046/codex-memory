# CM-1357 Phase F1 Fresh Sync And Live Preflight

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1357 defines the fresh preflight route required before Phase F1 live-client no-write evidence capture can resume.

This document does not push, start services, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, tag, release, deploy, cut over, or claim readiness.

## Current Problem

F1 approval packets that embed a commit hash become historical as soon as local work advances `HEAD`.

Current observed facts before this document:

```text
branch=main
HEAD=06cdd0e99267b5ae1c8e62b0d04bcbca704396c9
origin/main=be980d157cbc88b00fc2e641bc66a527538faae9
ahead_behind=2/0
worktree=clean
```

Because `main` is ahead of `origin/main`, `src/cli/phase-f1-live-client-no-write.js --execute` must remain blocked. The harness requires current local head and origin head to match.

## Fresh Preflight Route

Use this route instead of relying on old embedded approval packets:

1. Run fresh Git facts.

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git rev-list --left-right --count main...origin/main
```

2. If local `main` is ahead of `origin/main`, stop before push unless the user explicitly approves the exact push action.

3. After any approved sync, run fresh Git facts again.

4. Generate the Phase F1 exact A5-GAP-4 approval line from the fresh synced `HEAD`.

5. Execute `src/cli/phase-f1-live-client-no-write.js --execute` only if all are true:

- exact A5-GAP-4 user approval is present for the fresh synced `HEAD`;
- `currentHead` equals `originHead`;
- dirty status line count is zero;
- endpoint is `http://127.0.0.1:7605`;
- `CODEX_MEMORY_HTTP_TOKEN` is already present in the current session;
- no token material is printed or persisted.

## Push Approval Template

Push is Red Lane. This template is not approval.

Before push, replace the placeholders with fresh command output and obtain explicit user approval:

```text
I approve pushing local main commits from <CURRENT_HEAD> to origin/main for codex-memory from A:\codex-memory, using a normal non-force push to origin main only, with no tags, no PR, no deploy, no release, no config/watchdog/startup change, no provider call, no MCP call, no real memory read/write, and no readiness claim.
```

## F1 Live Approval Template

F1 live evidence capture is A5/Red gated. This template is not approval.

After sync and fresh facts, replace `<SYNCED_HEAD>` with the fresh `HEAD` that matches `origin/main`:

```text
I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch main at commit <SYNCED_HEAD>, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.
```

## Current Result

```text
phaseF1FreshPreflightRouteDefined=true
pushApproved=false
liveExecutionApproved=false
liveExecutionRun=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=explicit_push_approval_or_stay_local
```
