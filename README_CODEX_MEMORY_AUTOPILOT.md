# codex-memory Sustained Autopilot Pack v1.0

This pack installs a project-specific A4 sustained local autopilot rail for the existing `codex-memory` repository.

It is built for the current mature `vcp_codex_memory` runtime, not for a blank project.

## Contents

```text
AGENTS.md
.agent_board/TASK_QUEUE.md
.agent_board/CHECKPOINT.md
.agent_board/RUN_STATE.md
.agent_board/HANDOFF.md
.agent_board/BLOCKERS.md
.agent_board/DECISIONS.md
.agent_board/VALIDATION_LOG.md
scripts/validate-local.ps1
scripts/validate-local.sh
README_CODEX_MEMORY_AUTOPILOT.md
```

## Install Warning

Do not blindly extract this pack with `-Force` into `A:\codex-memory`.

This pack contains `AGENTS.md`, `.agent_board`, and validation scripts. It may overwrite existing project-specific rules or run state.

Safer review flow:

```powershell
cd A:\codex-memory

$dest = ".\_codex_memory_autopilot_review"
New-Item -ItemType Directory -Force $dest | Out-Null
Expand-Archive "path\to\codex_memory_sustained_autopilot_pack_v1_0.zip" -DestinationPath $dest -Force

Get-ChildItem -Recurse $dest
```

Then manually merge only the files you want.

Recommended checks before copying:

```powershell
git status --short
Test-Path .\AGENTS.md
Test-Path .\.agent_board
Test-Path .\scripts\validate-local.ps1
Test-Path .\scripts\validate-local.sh
```

## Intended Use

After review and merge, tell Codex:

```text
Use A4-Sustained Local Autopilot for codex-memory.
Read AGENTS.md, README.md, STATUS.md, PHASE_NAVIGATION.md, PHASE_E_BACKLOG.md, and .agent_board.
Decompose the goal, update TASK_QUEUE.md, execute safe local tasks, validate with the codex-memory validation matrix, update checkpoints, guarded local commit only if all conditions are met, and continue until done or hard-stopped.
```

## Hard Boundary

This pack does not authorize:

- push
- PR
- deploy
- release
- config.toml modification
- 7605/6005 real switch
- profile confirm/apply
- cleanup apply
- dependency changes
- `.env` or secret changes
- real memory migration
- hard deletion
- writing outside workspace root
