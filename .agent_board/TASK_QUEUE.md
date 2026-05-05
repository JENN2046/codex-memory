# TASK_QUEUE.md — codex-memory

Persistent task queue for `codex-memory` sustained autopilot.

Statuses:

```text
todo
in_progress
done
blocked
skipped
cancelled
```

Areas:

```text
P0-mainline-health
P1-donor-compatibility
P2-active-memory
P3-provider-profile
P4-http-runtime
P5-rollback-readiness
P6-docs-drift
P7-vcp-parity-hardening
P8-memory-governance
P9-multi-agent-arbitration
P10-observability-admin
```

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-0001 | 1 | done | P6-docs-drift | A0 | `PHASE_E_CHECKPOINT_INDEX.md` / navigation docs | Compress repeated Phase E checkpoint links into a dedicated index | diff inspection / link anchor check / `git diff --check` | no | no | Landed locally in `57aa164`, pushed to `origin/main` |
| CM-0002 | 2 | done | P1-donor-compatibility | A1 | active-memory suite / legacy runner / compare+rollback tests / docs | Add `TopicMemo GetTopicContent agentId/topicId alias` suite case | compare suite / rollback suite / harness tests / `gate:mainline` | compare+rollback ready | yes | Landed locally in `1159873`, pushed to `origin/main` |
| CM-0003 | 3 | done | P6-docs-drift | A1 | `AGENTS.md` / `.agent_board` / `scripts/validate-local.*` / `README_CODEX_MEMORY_AUTOPILOT.md` | Review and prepare sustained autopilot rail files for version control | `git diff --check` / validate-local docs path | no | no | Current task; commit requires explicit user approval |
| CM-0004 | 4 | done | P0-mainline-health | A0 | runtime | Run read-only mainline health observation if task requires | `npm run observe:http -- --json` | no config change | no | Only if runtime validation is in scope |
