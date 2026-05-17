# BLOCKERS.md — codex-memory

| ID | Status | Type | Area | Affected Task | Reason | Required Human Action | Created |
|---|---|---|---|---|---|---|---|
| CMB-0001 | closed | template | none | none | Template row retired | none | 2026-05-05 |
| CMB-0002 | closed | outside-workspace-write | P9-codex-claude-client-scope | CM-0025 | `claude mcp add` writes Claude local/user configuration outside `A:\codex-memory` | Authorized and completed; rollback is `claude mcp remove vcp_codex_memory -s local` | 2026-05-06 |
| CMB-0003 | closed | model-api-connectivity | P9-codex-claude-client-scope | CM-0025 | `deepseek-v4-pro` model-mediated tool call previously failed before MCP tool execution with API `ConnectionRefused` | Rerun completed; `deepseek-v4-pro` model-mediated `memory_overview` succeeded | 2026-05-06 |
| CMB-0004 | open | A5-approval-boundary | P22-release-candidate | CM-0161 | P22 planning is closed, but fresh RC gate refresh / implementation may run heavy gates, touch live/client/provider/config surfaces, or create release artifacts | User must explicitly approve an exact A5 RC gate refresh / implementation packet before any gate refresh, config/service/provider/migration/import-export, RC artifact, tag, release, or deploy action | 2026-05-15 |
| CMB-0005 | open | A5-runtime-completion-boundary | P51-P62-runtime-enforced-governed-memory-spine | P62-completion-audit | P51-P62 local evidence/preflight/audit artifacts are complete to the post-T6 audit/refinement closeout, but completion audit fixtures still report `objectiveComplete=false`, 9 runtime gaps, and 16 A5 hard stops | Separate explicit authorization and fresh machine-readable evidence are required before any runtime enforcement proof, final RC matrix execution, governance runtime loop, recall runtime proof, migration/import-export/backup-restore apply, live HTTP operation, mainline strict gate, push/tag/release/deploy/config/watchdog/cutover, durable write, provider call, real memory scan, public MCP expansion, or `RC_READY` claim | 2026-05-18 |

## Project-Specific Hard Stops

Stop before:

- push / PR / release / deploy / tag
- release-candidate gate refresh or implementation without an exact A5 approval packet
- P51-P62 runtime completion, final RC matrix execution, mainline strict gate execution, or `RC_READY` claim without fresh evidence and separate explicit authorization
- changing `C:\Users\617\.codex\config.toml`
- switching 7605/6005 mainline in real config
- installing/updating/removing watchdog scheduled task
- modifying HKCU Run startup entry
- editing `.env`
- editing real secrets/provider keys
- dependency changes
- `rebuild-profile --confirm`
- cleanup non-dry-run/apply/confirm
- importing real VCP memory
- broad memory export
- real migration
- hard deleting data/logs/diary/indexes
- destructive commands
- writing outside workspace root
- overwriting user-owned uncommitted changes
