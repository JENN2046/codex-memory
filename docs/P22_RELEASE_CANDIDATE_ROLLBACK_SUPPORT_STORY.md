# P22.3 Release Candidate Rollback / Support Story

Phase: `P22.3-release-candidate-rollback-support-story`

Status: rollback/support planning

## Purpose

Define the rollback, support, troubleshooting, and operator handoff story required before any release-candidate implementation is requested.

This phase is docs/status/board only. It does not run the release-candidate gate matrix, create backups, restore backups, start HTTP MCP, install startup or watchdog tasks, edit Codex or Claude configuration, run `claude mcp`, call providers, read real memory content, run migration, apply import/export, create a release candidate, tag, release, or deploy.

## Support Goal

A future release candidate is supportable only if an operator can answer:

- what changed
- which commit is the candidate
- which gates were fresh for that commit
- which assets are protected
- how to diagnose failure without exposing secrets or real memory content
- how to return to the previous safe state
- which operations are blocked until explicit A5 approval

P22.3 documents that story without executing it.

## Protected Assets

| Asset | Protection requirement | Default P22.3 action |
|---|---|---|
| MCP public contract | Public tools remain `record_memory`, `search_memory`, `memory_overview`. | Document only. |
| Internal mutation boundary | `validate_memory` remains internal-only. | Document only. |
| SQLite shadow store | No migration or `ALTER TABLE` without approval. | No DB access. |
| Diary-compatible memory | No rewrite or broad real-memory preview. | No diary read/write. |
| Vector/chunk indexes | No rebuild or cleanup apply. | No index operation. |
| Codex / Claude config | No real config mutation. | No config command. |
| Startup / watchdog state | No scheduled task, HKCU Run, service, or watchdog operation. | No startup command. |
| Provider keys and external calls | No provider smoke / benchmark without explicit approval. | No provider call. |
| Release artifacts | No RC artifact, tag, release, or deploy. | No release action. |

## Rollback Story Tiers

| Tier | Scenario | Rollback expectation | Approval boundary |
|---|---|---|---|
| `tier-0-docs-only` | Docs/status/board drift or wrong checklist wording. | Revert or correct docs in a guarded docs commit. | A4.8 guarded commit/safe-push policy. |
| `tier-1-gate-failure` | Full suite, `gate:ci`, compare, rollback, or strict mainline fails. | Stop RC path, capture failed gate, do not broaden scope, repair in a separate approved phase. | Local gate repair may proceed only if scoped and reversible. |
| `tier-2-runtime-config` | HTTP MCP, Codex config, Claude config, startup task, watchdog, or HKCU Run is touched in a future phase. | Use the pre-approved rollback command or manual restore path named in that phase. | Explicit A5 approval required before any touch. |
| `tier-3-durable-data` | SQLite, diary, vector index, import/export apply, backup, restore, or migration is touched in a future phase. | Restore from named backup, verify hashes/counts, rerun readiness gates, and keep migration blocked until reviewed. | Explicit A5 approval required before any touch. |
| `tier-4-provider-live` | Provider smoke, benchmark, or live Claude/model acceptance is run in a future phase. | Stop on unsafe output, redact logs, preserve command and provider metadata without secrets. | Explicit provider/live approval required. |
| `tier-5-release-artifact` | RC branch, tag, release, or deploy is created in a future phase. | Use the release-specific rollback/delete/supersede plan approved for that artifact. | Explicit release approval required. |

P22.3 does not execute any tier above `tier-0-docs-only`.

## Troubleshooting Map

| Symptom | First safe check | Unsafe shortcut to avoid | Support note |
|---|---|---|---|
| Gate evidence is stale | Check target commit and gate timestamp. | Treat standing evidence as fresh. | Mark `stale-evidence` and require refresh. |
| `gate:ci` fails | Inspect redacted JSON summary and failing check name. | Rewrite runtime to make the gate pass. | Open a narrow repair phase. |
| Compare / rollback mismatch | Inspect case ID and category. | Change donor semantics without fixture update. | Preserve mismatch evidence. |
| HTTP health unknown | Review P20/P21 approval boundary first. | Start HTTP MCP or watchdog casually. | Runtime observation needs explicit scope. |
| Claude live acceptance unknown | Use P21 docs and manual blocker status. | Run `claude mcp` or edit config. | Live checks need explicit approval. |
| Provider evidence missing | Keep provider gates blocked. | Run provider smoke / benchmark by habit. | Provider calls need explicit approval. |
| Migration readiness blocked | Keep `migrationBlocked=true`. | Apply migration or import/export. | Use P18/P13 readiness docs only. |
| Secret-like output appears | Stop and sanitize. | Copy raw logs into docs. | Record only redacted metadata. |

## Operator Handoff Fields

Any future RC approval packet or handoff should include:

- phase
- target commit
- branch
- worktree status
- candidate artifact status
- public MCP tool list
- `validate_memory` exposure status
- fresh gate matrix summary
- stale gates
- approval-required gates
- provider call count
- durable memory touch status
- real config touch status
- startup/watchdog touch status
- migration/import-export touch status
- backup requirement
- rollback tier
- rollback command or manual restore path
- support owner / reviewer
- known gaps
- next action

## Required Evidence Before RC Implementation

Before any RC implementation request, the project should have:

- clean worktree and target commit
- fresh full `npm test`
- fresh `npm run gate:ci -- --json`
- fresh compare standard suite
- fresh rollback standard suite
- reviewed strict mainline gate scope and fresh result if approved
- docs validation
- client privacy non-regression status
- local production safety review
- rollback tier assignment
- support/troubleshooting handoff
- explicit A5 approval packet

Provider, live Claude, startup/watchdog, config mutation, migration, import/export apply, and release artifact work remain blocked unless explicitly approved.

## Non-Goals

P22.3 does not:

- run the gate matrix
- run `npm test`
- run `gate:ci`
- run compare / rollback suites
- run strict mainline gate
- start HTTP MCP
- start or install watchdog
- install scheduled tasks
- edit HKCU Run
- edit Codex or Claude configuration
- run `claude mcp`
- call providers
- read real memory content
- create backups
- restore backups
- write durable DB / memory / diary data
- run SQLite migration or `ALTER TABLE`
- apply import/export
- change MCP schema or public tools
- create a release candidate
- tag, release, or deploy

## P22.3 Result

Result: `P22_ROLLBACK_SUPPORT_STORY_PLANNED_BLOCKED_FOR_APPROVAL_PACKET`

P22.3 is sufficient to proceed to an RC approval packet template.

It is not sufficient to authorize RC implementation, gate execution, startup/watchdog installation, config mutation, provider calls, migration, import/export apply, public MCP expansion, tag, release, or deploy.

## Next Recommended Phase

`P22.4-release-candidate-approval-packet-template`
