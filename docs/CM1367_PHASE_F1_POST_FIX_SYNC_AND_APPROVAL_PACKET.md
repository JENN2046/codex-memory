# CM-1367 Phase F1 Post-Fix Sync And Approval Packet

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1367 records the current post-CM-1366 sync packet and the next exact F1 approval template.

This is docs/board only. It does not push, pull, merge, rebase, rerun F1, call MCP, call providers, read real memory/audit data, write durable memory/audit data, change config/watchdog/startup, expand public MCP tools, or claim readiness/reliability.

## Fresh Git Facts

```text
branch=main
HEAD=c6804d676105f8051a329e46bd031847ef2aaa08
origin/main=546915bec01fd8ffd0fd974f59b6fc95966218a4
ahead=2
behind=0
worktree=clean
local_commits=
- c6804d6 fix: preserve no-token http contract with bearer configured
- b3f58b5 docs: record phase f1 live no-write rejection
```

## Push Approval Template

Use this exact line only if the operator intends to authorize the normal non-force push:

```text
I approve pushing local main commits through c6804d676105f8051a329e46bd031847ef2aaa08 to origin/main for codex-memory from A:\codex-memory, using a normal non-force push to origin main only, with no tags, no PR, no deploy, no release, no merge, no rebase, no config/watchdog/startup change, no provider call, no MCP call, no real memory read/write, and no readiness or reliability claim.
```

Authorized command after that exact approval:

```powershell
git push origin main
```

No force push, tags, PR, merge, rebase, deploy, release, provider call, MCP call, memory read/write, config/watchdog/startup change, readiness claim, or reliability claim is included.

## Post-Push F1 A5-GAP-4 Template

After a successful normal non-force push, fresh checks must prove:

```text
main=origin/main=c6804d676105f8051a329e46bd031847ef2aaa08
ahead=0
behind=0
worktree=clean
```

Only then can the operator use this exact A5-GAP-4 line to authorize a bounded F1 live no-write rerun:

```text
I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch main at commit c6804d676105f8051a329e46bd031847ef2aaa08, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.
```

## Remaining State

F1 remains blocked until the push approval is provided, the push succeeds, fresh synced-head facts are verified, and the exact A5-GAP-4 approval is provided for the synced commit.

F2/F3/F4/F5 remain blocked until accepted F1 live evidence exists.
