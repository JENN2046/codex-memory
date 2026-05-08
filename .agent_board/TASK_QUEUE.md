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
P9-codex-claude-client-scope
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
| CM-0013 | 13 | done | P0-mainline-health | A0 | `.agent_board` | Record `ba7031a` push-after gate result as board-only delayed note | `git status --short` / `npm run gate:mainline` / `git diff --check` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next local batch |
| CM-0014 | 14 | done | P3-provider-profile | A0 | `benchmarks/reports/README.md` / provider benchmark docs | Add provider benchmark reports retention index | diff inspection / `git diff --check` | no runtime change | no | Docs-only P2-2; no real provider call |
| CM-0015 | 15 | done | P0-mainline-health | A0 | `.agent_board` | Record `f40a6f6` push-after gate result as board-only delayed note | `git status --short` / `npm run gate:mainline` / `git diff --check` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next local batch |
| CM-0016 | 16 | done | P3-provider-profile | A0 | `PHASE_E_PROVIDER_BENCHMARK.md` / `benchmarks/reports/README.md` / `logs/phase-e-provider-benchmark-record-template.md` / `PHASE_E_BACKLOG.md` | Add provider benchmark record template and interpretation/retention guidance | `git diff --check` / trailing whitespace scan / link target check / script reference check / secret pattern scan | no runtime change | no | Docs-only P2-2; no real provider smoke/benchmark call |
| CM-0017 | 17 | done | P0-mainline-health | A0 | `.agent_board` | Record `13d7c6b` push-after gate result as board-only delayed note | `git status --short` / `npm run gate:mainline` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next local batch |
| CM-0018 | 18 | done | P6-docs-drift | A0 | `PHASE_E_CHECKPOINT_INDEX.md` / `PHASE_NAVIGATION.md` / `PHASE_E_SUMMARY.md` / `.agent_board` | Sync Phase E checkpoint index to board-only push-after cadence and latest provider docs links | `git diff --check` / trailing whitespace scan / referenced local file check / secret pattern scan | no runtime change | no | Docs-only P2-1; no checkpoint-20 |
| CM-0019 | 19 | done | P0-mainline-health | A0 | `.agent_board` | Record `59f1b03` push-after gate result as board-only delayed note | `git status --short` / `npm run gate:mainline` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next local batch |
| CM-0020 | 20 | done | P6-docs-drift | A0 | `PHASE_E_FINAL_CLOSEOUT.md` / `PHASE_E_BACKLOG.md` / `PHASE_E_SUMMARY.md` / `PHASE_NAVIGATION.md` / `PROJECT_CLOSURE.md` / `STATUS.md` / `MEMORY.md` / `.agent_board` | Close Phase E and move remaining donor/provider/docs work into maintenance-phase incremental work | `git diff --check` / trailing whitespace scan / referenced local file check / secret pattern scan / `npm run gate:mainline` | `39/39 rollback-ready` | yes | Docs/governance closeout; no runtime change; no checkpoint-20 |
| CM-0021 | 21 | done | P0-mainline-health | A0 | `.agent_board` | Record `49537f6` push-after gate result as board-only delayed note | `git status --short` / `npm run gate:mainline` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next maintenance batch |
| CM-0022 | 22 | done | P6-docs-drift | A0 | `MAINTENANCE_BACKLOG.md` / `PHASE_E_FINAL_CLOSEOUT.md` / `PHASE_NAVIGATION.md` / `README.md` / `STATUS.md` / `MEMORY.md` / `.agent_board` | Add maintenance backlog and migrate post-Phase-E donor/provider/docs follow-ups out of Phase E | `git diff --check` / trailing whitespace scan / referenced local file check / secret pattern scan | no runtime change | no | Docs-only maintenance entrypoint; no provider calls; no checkpoint-20 |
| CM-0023 | 23 | done | P0-mainline-health | A0 | `.agent_board` | Record `bcb2d84` push-after gate result as board-only delayed note | `git push origin main` / `git status --short` / `npm run gate:mainline` | `39/39 rollback-ready` | yes | Push was already up to date; no checkpoint-20; aggregate this board note with the next maintenance batch |
| CM-0024 | 24 | done | P6-docs-drift | A0 | `PROJECT_GOAL.md` / `ROADMAP.md` / `ARCHITECTURE.md` / `MEMORY_POLICY.md` / `AGENTS.md` / `VALIDATION.md` / status docs / `.agent_board` | Align final target from generic multi-agent platform to Codex/Claude-only memory service | `git diff --check` / trailing whitespace scan / target wording scan | no runtime change | no | Fixture identifiers such as `vchat-fixture-multi-agent` are historical test names and were not renamed |
| CM-0025 | 25 | done | P9-codex-claude-client-scope | A1 | `CLAUDE_MCP_ACCEPTANCE.md` / `logs/claude-mcp-minimal-acceptance-01.md` / README/navigation/status/memory/backlog / `.agent_board` | Prepare Claude MCP minimal acceptance and preflight local HTTP path | HTTP health / `claude mcp list` / docs check / `npm run gate:mainline` | `39/39 rollback-ready` | yes | Preflight completed; `claude mcp add` was explicitly authorized and completed |
| CM-0026 | 26 | done | P9-codex-claude-client-scope | A1 | `CLAUDE_MCP_ACCEPTANCE.md` / `logs/claude-mcp-minimal-acceptance-05.md` / README/navigation/status/memory/backlog / `.agent_board` / `.gitignore` | Switch Claude Code model-side acceptance to `deepseek-ai/deepseek-v4-flash` and record successful `memory_overview` validation | model smoke / read-only Claude assessment / model-mediated MCP `memory_overview` / `npm run gate:mainline` | `39/39 rollback-ready` | yes | Historical `deepseek-v4-pro` record retained; current model-side path is `deepseek-ai/deepseek-v4-flash`; `.omc/` ignored as local tool state |
| CM-0027 | 27 | done | P0-mainline-health | A0 | `.agent_board` | Record `1628381` push-after gate result as board-only delayed note | `git push origin main` / `git status --short` / `npm run gate:mainline` | `39/39 rollback-ready` | yes | No checkpoint-20; aggregate this board note with the next maintenance batch |
| CM-0028 | 28 | done | P6-docs-drift | A0 | `STATUS.md` / `MEMORY.md` / `MAINTENANCE_BACKLOG.md` / `PHASE_NAVIGATION.md` / `PHASE_E_CHECKPOINT_INDEX.md` / `.agent_board` | Sync current baseline docs to `1628381` / `CMV-0039` | `git diff --check` / trailing whitespace scan / local link check / `npm run gate:mainline` | `39/39 rollback-ready` | yes | Docs-only baseline sync; no checkpoint-20 |
| CM-0029 | 29 | in_progress | P6-docs-drift | A0 | `docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md` / `README.md` / `STATUS.md` / `.agent_board` | Land VCP Memory Core 100% implementation plan as P1.0 docs-only | `git diff --check` / link check / `npm test` / `npm run gate:mainline:strict` | `39/39 rollback-ready` | yes | Docs-only; no src/tests/package.json; local commit only; no push |
