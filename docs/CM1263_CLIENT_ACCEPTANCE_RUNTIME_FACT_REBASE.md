# CM-1263 Client Acceptance Runtime Fact Rebase

Date: 2026-06-01

## Purpose

Separate historical Claude Code MCP acceptance evidence from current runtime facts.

## Change

- Updated `README.md` so the Codex / Claude integration section no longer presents historical Claude Code `connected` and model-mediated `memory_overview` success as current repository truth.
- Updated `CLAUDE_MCP_ACCEPTANCE.md` to mark prior Claude Code connected/model-side success as historical evidence that must be refreshed before personal RC dogfood or cutover decisions.
- Kept the HTTP MCP client setup and validation steps intact.

## Boundary

- Docs/status update only.
- No runtime behavior change.
- No CLI execution against Claude.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory/audit write.
- No config, watchdog, or startup change.
- No push, PR, tag, release, deploy, cutover, readiness, write reliability, or recall reliability claim.

## Validation

Planned validation:

```powershell
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This reduces stale client-integration overclaim risk only; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
