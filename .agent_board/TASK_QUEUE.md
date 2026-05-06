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
| CM-0005 | 5 | done | P1-donor-compatibility | A1 | `src/cli/deepmemo.js` / active-memory standard suite / compare+rollback tests | Add DeepMemo `key_word` missing-maid error-meta alias case | CLI test / compare+rollback tests / input-validation compare+rollback / `gate:mainline` / `npm test` | `38/38 rollback-ready` | yes | Local only; wait for next batch before checkpoint/commit |
| CM-0006 | 6 | done | P1-donor-compatibility | A1 | active-memory standard suite / compare+rollback tests | Add DeepMemo `KeyWord` agent-not-found error-meta alias case | agent-selection compare+rollback / CLI test / compare+rollback tests / `gate:mainline` / `npm test` | `39/39 rollback-ready` | yes | Local only; ready to aggregate with CM-0005 |
| CM-0007 | 7 | done | P0-mainline-health | A0 | `logs/phase-e-mainline-gate-checkpoint-18.md` / checkpoint index / daily self-check / `.agent_board` | Record `56c647a` push-after mainline gate checkpoint | `git status --short` / `npm run gate:mainline` / `git diff --check` | `39/39 rollback-ready` | yes | Local docs only; commit requires explicit approval |
| CM-0008 | 8 | done | P0-mainline-health | A0 | `logs/phase-e-mainline-gate-checkpoint-19.md` / checkpoint index / daily self-check / `.agent_board` | Record `000c149` push-after mainline gate checkpoint | `git status --short` / `npm run gate:mainline` / `git diff --check` | `39/39 rollback-ready` | yes | Local docs only; wait for next batch aggregate commit |
| CM-0009 | 9 | done | P6-docs-drift | A0 | `PHASE_NAVIGATION.md` / `PHASE_E_SUMMARY.md` / `PHASE_E_BACKLOG.md` / `MEMORY.md` | Sync recovery docs to checkpoint-19 and `39/39` baseline | diff inspection / `git diff --check` | no runtime change | no | Low-risk Phase E P2-1 docs navigation sync; aggregate with checkpoint-19 |
| CM-0010 | 10 | done | P6-docs-drift | A0 | `STATUS.md` / `PROJECT_CLOSURE.md` | Sync current status and closure baseline to checkpoint-19 / `39/39` | diff inspection / `git diff --check` | no runtime change | no | Low-risk status baseline sync; included in aggregate commit |
| CM-0011 | 11 | done | P0-mainline-health | A0 | `.agent_board` | Record `8e3ae8d` push-after gate result as board-only delayed note | `git status --short` / `npm run gate:mainline` / `git diff --check` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next local batch |
| CM-0012 | 12 | done | P3-provider-profile | A0 | `PHASE_E_PROVIDER_BENCHMARK.md` / navigation docs | Add provider benchmark retention and safety entrypoint | diff inspection / `git diff --check` | no runtime change | no | Docs-only P2-2; no real provider call |
