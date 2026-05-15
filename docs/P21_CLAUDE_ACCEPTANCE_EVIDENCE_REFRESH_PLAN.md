# P21.3 Claude Acceptance Evidence Refresh Plan

Phase: `P21.3-Claude-acceptance-evidence-refresh-plan`

Status: planning

## Purpose

Plan a safe refresh of Claude Code local HTTP MCP acceptance evidence without mutating real Claude configuration by default.

This phase is docs-only. It does not run `claude mcp`, edit Claude configuration, edit Codex configuration, start HTTP MCP, install startup/watchdog tasks, change MCP schema, expand public MCP tools, call providers, read real memory content, run migration, apply import/export, or enter release-candidate work.

## Current Evidence Baseline

Existing Claude acceptance evidence:

| Evidence | Current status |
|---|---|
| [CLAUDE_MCP_ACCEPTANCE.md](../CLAUDE_MCP_ACCEPTANCE.md) | Documents local HTTP MCP acceptance, configured Claude Code path, public tools, and remaining interactive `/mcp` manual check. |
| [claude-mcp-minimal-acceptance-05.md](../logs/claude-mcp-minimal-acceptance-05.md) | Historical model-side `memory_overview` success with `deepseek-ai/deepseek-v4-flash`; no config mutation in that evidence refresh. |
| P21.1 inventory | Separated read-only CLI observation from `claude mcp add/remove` config mutation. |
| P21.2 scope review | Targeted scope tests passed and identified Claude interactive `/mcp` as a manual gap. |

## Refresh Tiers

P21.3 defines three refresh tiers.

| Tier | Purpose | Default status |
|---|---|---|
| Tier 0 docs-only | Review existing acceptance docs and known gaps. | allowed in P21.3 |
| Tier 1 read-only local observation | Inspect local CLI availability or read-only config/list state. | requires explicit phase scope before running |
| Tier 2 config mutation / model-mediated tool call | Add/remove MCP server, edit config, or call model/provider-backed Claude flows. | blocked without explicit approval |

P21.3 itself only performs Tier 0.

## Tier 0 Docs-Only Review

Tier 0 may update docs with:

- current acceptance baseline
- known manual gaps
- commands that are read-only versus mutating
- rollback requirements for mutating commands
- validation sequence for a future refresh
- stop conditions and hard stops

Tier 0 must not claim fresh live Claude acceptance unless commands are actually run and evidence is captured.

## Tier 1 Read-Only Observation Plan

Future Tier 1 refresh may run, if explicitly scoped:

```powershell
Get-Command claude
claude --version
claude mcp list
claude mcp get vcp_codex_memory
```

Safety notes:

- `claude mcp list` and `claude mcp get` read local Claude state.
- Outputs may contain local config paths or endpoint details; summaries should stay low-risk.
- Do not print secrets, auth tokens, cookies, provider keys, or raw config file contents.
- Do not treat connected status as proof that interactive `/mcp` panel has been manually checked.

## Tier 1 Local HTTP Readiness Plan

Future Tier 1 HTTP readiness may run, if explicitly scoped and if local runtime observation is acceptable:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
npm run gate:mainline
```

Safety notes:

- These checks are live/local-runtime adjacent.
- They should not start services by default.
- If HTTP is not running, do not automatically run `start:http`, `start:http:ensure`, or watchdog commands unless that phase explicitly approves runtime operation.

## Tier 2 Blocked Actions

The following remain blocked without an explicit approval packet:

```powershell
claude mcp add --transport http --scope local vcp_codex_memory http://127.0.0.1:7605/mcp/codex-memory
claude mcp remove vcp_codex_memory
```

Also blocked:

- editing `C:\Users\617\.claude.json`
- editing any Claude Desktop config
- editing Codex config
- starting HTTP MCP as a long-running service
- installing startup or watchdog tasks
- running model-mediated provider-backed Claude prompts
- calling MCP tools through Claude if that implies provider usage or user-account cost

## Future Approval Packet For Tier 2

Any future Tier 2 refresh must include:

- exact phase name
- exact Claude command
- exact config file or scope affected
- expected config diff or low-risk summary
- rollback command or manual rollback steps
- provider/model budget if a Claude model call is involved
- validation commands
- stop conditions
- explicit user approval sentence

Ambiguous continuation language is not approval.

## Acceptance Refresh Checklist

A future approved refresh should capture:

| Check | Evidence |
|---|---|
| Claude CLI available | command path and version, without secrets |
| MCP server listed | `vcp_codex_memory` present / absent |
| MCP server detail | endpoint and status, without raw secrets |
| HTTP health | `ok=true` and endpoint path if HTTP is already running |
| Public tools | `record_memory`, `search_memory`, `memory_overview` only |
| Read-only tool call | `memory_overview` success, if provider/model call is explicitly approved |
| Interactive `/mcp` | manual operator evidence, not replaced by non-interactive prompt |
| Mainline health | `gate:mainline` or scoped equivalent |
| Rollback readiness | rollback command documented for any config mutation |

## Non-Goals

P21.3 does not:

- refresh live Claude acceptance
- run `claude mcp list`
- run `claude mcp get`
- run `claude mcp add`
- run `claude mcp remove`
- run model-mediated Claude prompts
- edit config files
- start HTTP MCP
- add tests or fixtures
- change runtime behavior
- expand MCP public tools
- call providers
- enter P22 release candidate

## Validation

Docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## P21.3 Result

Result: `P21_CLAUDE_ACCEPTANCE_REFRESH_PLANNED_BLOCKED_FOR_LIVE_CHECKS`

P21.3 is sufficient to proceed to client privacy boundary fixture tests.

It is not sufficient to authorize Claude config mutation, live acceptance refresh, model/provider calls, runtime service start, MCP public tool expansion, migration/import-export apply, or release-candidate work.

## Next Recommended Phase

P21.4 client privacy boundary fixture tests are captured in [P21_CLIENT_PRIVACY_BOUNDARY_FIXTURE_TESTS.md](./P21_CLIENT_PRIVACY_BOUNDARY_FIXTURE_TESTS.md).

`P21.5-client-integration-standing-gate-summary`
