## CMB-0006 - RC_PRECHECK_001 exact A5 approval required

- Status: `CLOSED_READONLY_EXECUTED_RECALL_NOT_APPROVED`
- Area: `P10-observability-admin / RC_PRECHECK_001`
- Blocking tasks: none for readonly precheck; recall observation and aggregation execution remain separate approval boundaries
- Current executed readonly target: `a6030f36b3026d360c6aa99f97a2d1af44365433`
- Resolution: exact `A5-RC-PRECHECK-READONLY` approval was provided and executed; `A5-RC-PRECHECK-RECALL` was not approved or run.
- Safe state: readonly evidence recorded as `PRECHECK_PASSED_NOT_RC_READY`; project remains `NOT_READY_BLOCKED`.
- Do not run without new exact approval: recall path observation, A5-GAP-6 aggregation execution, provider calls, real memory broad scans, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable writes, push, tag, release, deploy, cutover, or `A5-GAP-7`.
- Next boundary: prepare a separate A5-GAP-6 evidence-only aggregation packet, or request separate recall approval with exact subject/query/audit boundary.

# BLOCKERS.md — codex-memory

| ID | Status | Type | Area | Affected Task | Reason | Required Human Action | Created |
|---|---|---|---|---|---|---|---|
| CMB-0001 | closed | template | none | none | Template row retired | none | 2026-05-05 |
| CMB-0002 | closed | outside-workspace-write | P9-codex-claude-client-scope | CM-0025 | `claude mcp add` writes Claude local/user configuration outside `A:\codex-memory` | Authorized and completed; rollback is `claude mcp remove vcp_codex_memory -s local` | 2026-05-06 |
| CMB-0003 | closed | model-api-connectivity | P9-codex-claude-client-scope | CM-0025 | `deepseek-v4-pro` model-mediated tool call previously failed before MCP tool execution with API `ConnectionRefused` | Rerun completed; `deepseek-v4-pro` model-mediated `memory_overview` succeeded | 2026-05-06 |
| CMB-0004 | open | A5-approval-boundary | P22-release-candidate | CM-0161 | P22 planning is closed, but fresh RC gate refresh / implementation may run heavy gates, touch live/client/provider/config surfaces, or create release artifacts | User must explicitly approve an exact A5 RC gate refresh / implementation packet before any gate refresh, config/service/provider/migration/import-export, RC artifact, tag, release, or deploy action | 2026-05-15 |
| CMB-0005 | open | A5-runtime-completion-boundary | P51-P62-runtime-enforced-governed-memory-spine | P62-completion-audit | P51-P62 local evidence/preflight/audit artifacts are complete to the post-T6 audit/refinement closeout; P64 local evidence has reduced the active runner gap list to 7 runtime gaps, but `objectiveComplete=false`, A5 hard stops, and `NOT_READY_BLOCKED` still apply | Separate explicit authorization and fresh machine-readable evidence are required before any governance runtime loop, recall runtime proof, migration/import-export/backup-restore apply, live HTTP operation readiness, cutover-context mainline strict gate, push/tag/release/deploy/config/watchdog/cutover, durable write, provider call, real memory scan, public MCP expansion, or `RC_READY` claim | 2026-05-18 |

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

## CMB-0007 - Monthly plan remains local-safe until A5 approval

Status: `OPEN_AFTER_READONLY_PRECHECK`\r\n\r\nArea: P6-docs-drift / P10-observability-admin\r\n\r\nReason: `A5-RC-PRECHECK-READONLY` has executed, but recall observation, A5-GAP-6 aggregation execution, push, release, deploy, cutover, and readiness claims still require separate exact approval or fully passing A4.8 safe-push policy where applicable.

Required approval/action: prepare A5-GAP-6 evidence-only aggregation packet, separately approve `A5-RC-PRECHECK-RECALL` with subject/query/audit boundary if needed, or choose local-safe non-A5 Phase F work.

Safe state: `PRECHECK_PASSED_NOT_RC_READY` for readonly evidence, project remains `NOT_READY_BLOCKED`; no recall, aggregation execution, push, or cutover.

## CMB-0008 - RC_PRECHECK_001 A5-GAP-6 aggregation approval required

Status: `CLOSED_EXECUTED_NOT_READY`\r\n\r\nArea: P10-observability-admin / validation-aggregator\r\n\r\nResolution: exact A5-GAP-6 evidence-only aggregation approval was provided and executed for current HEAD `a1f54d6413fe0d1ee4d3ae1923b7bec4144aab9a`.

Next action: continue local-safe Phase F prep or request a separate exact approval for recall observation/cutover-related work if needed.

Safe state: aggregation evidence recorded as `EVIDENCE_AGGREGATED_NOT_RC_READY`; no recall, provider, real memory broad scan, migration/apply, config/watchdog/startup change, public MCP expansion, durable write, push, cutover, A5-GAP-7, or readiness claim.
