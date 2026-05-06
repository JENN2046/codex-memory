# HANDOFF.md — codex-memory

## Goal

Prepare Claude MCP minimal acceptance and switch the model-side validation path to `deepseek-ai/deepseek-v4-flash`.

## Safe State

Runtime code is not being changed. `bcb2d84 docs: add maintenance backlog` is synchronized with `origin/main`. The active local commits and worktree changes are docs-governance updates that scope the project to `Codex` and `Claude`, plus Claude MCP minimal acceptance docs, model-side validation records, `.agent_board` notes, and `.omc/` ignore handling.

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- Worktree: Codex/Claude target-scope docs, Claude MCP acceptance docs, `deepseek-ai/deepseek-v4-flash` validation notes, `.gitignore`, and `.agent_board` changes present locally; no checkpoint-20 file created

## Queue Summary

- done: P1-3 DeepMemo keyword-alias cases committed as `56c647a` and pushed to `origin/main`; checkpoint-18 docs committed as `000c149`; checkpoint-19 baseline committed as `8e3ae8d`; provider benchmark docs committed as `ba7031a`; provider reports index committed as `f40a6f6`; provider benchmark record template committed as `3eaf11f`; handoff state committed as `13d7c6b`; board-only checkpoint index committed as `59f1b03`; Phase E final closeout committed and pushed as `49537f6`; maintenance backlog committed and pushed as `bcb2d84`; push-after gate passed; Codex/Claude target-scope docs updated; Claude MCP local preflight completed; `deepseek-v4-pro` historical model-mediated success recorded; `deepseek-ai/deepseek-v4-flash` model-mediated success recorded
- in_progress: local docs/client-scope aggregate is ready for final diff validation and guarded local commit
- blocked: none for minimal non-interactive acceptance; interactive `/mcp` panel remains optional manual follow-up
- remaining: validate docs after the `deepseek-ai/deepseek-v4-flash` success record and commit local batch if clean; push requires explicit remote authorization

## Changed Files

- `.agent_board/*.md`
- `PROJECT_GOAL.md`
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `MEMORY_POLICY.md`
- `AGENTS.md`
- `VALIDATION.md`
- `MAINTENANCE_BACKLOG.md`
- `PHASE_E_CHECKPOINT_INDEX.md`
- `PHASE_NAVIGATION.md`
- `PHASE_E_FINAL_CLOSEOUT.md`
- `STATUS.md`
- `PROJECT_CLOSURE.md`
- `MEMORY.md`
- `CLAUDE_MCP_ACCEPTANCE.md`
- `logs/claude-mcp-minimal-acceptance-01.md`
- `logs/claude-mcp-minimal-acceptance-02.md`
- `logs/claude-mcp-minimal-acceptance-03.md`
- `logs/claude-mcp-minimal-acceptance-04.md`
- `logs/claude-mcp-minimal-acceptance-05.md`
- `.gitignore`
- `.agent_board/BLOCKERS.md`
- `.agent_board/DECISIONS.md`

## Validation Evidence

- npm test: passed (`123/123`)
- gate:mainline: passed after `56c647a` push
- gate:mainline:strict: not run
- compare harness test: `14/14`
- rollback harness test: `11/11`
- active CLI diagnostics test: `17/17`
- compare suite: latest known `39/39 matched`
- rollback suite: latest known `39/39 rollback-ready`
- input-validation compare/rollback: latest known `5/5`
- agent-selection compare/rollback: latest known `8/8`
- git diff --check: passed
- push-after gate: latest pushed checkpoint `000c149` passed; this local batch is not pushed
- push-after gate: passed after `56c647a`
- push-after gate: passed after `000c149`
- push-after gate: passed after `8e3ae8d`: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- push-after gate: passed after `ba7031a`: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- push-after gate: passed after `f40a6f6`: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- provider benchmark docs validation: `git diff --check` passed with CRLF warnings only; package script references exist
- provider reports index validation: `git diff --check` passed with CRLF warnings only; report links present; secret scan only found placeholder/safety text
- provider record template validation: `git diff --check` passed with CRLF warnings only; trailing whitespace scan passed; local link target check passed; package script reference check passed; high-confidence secret pattern scan passed
- push-after gate: passed after `13d7c6b`: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- P2-1 docs navigation validation: `git diff --check` passed with CRLF warnings only; trailing whitespace scan passed; referenced local file check passed; high-confidence secret pattern scan passed
- push-after gate: passed after `59f1b03`: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- Phase E final closeout validation: `git diff --check` passed with CRLF warnings only; trailing whitespace scan passed; referenced local file check passed; high-confidence secret pattern scan passed; `npm run gate:mainline` passed with health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- push-after gate: passed after `49537f6`: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- maintenance backlog validation: `git diff --check` passed with CRLF warnings only; trailing whitespace scan passed; referenced local file check passed; high-confidence secret pattern scan passed
- push-after gate: passed after `bcb2d84`: push reported `Everything up-to-date`; pre-board-update status clean; health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- Codex/Claude target-scope docs validation: `git diff --check` passed with CRLF warnings only; trailing whitespace scan passed; target wording scan passed
- Claude MCP preflight: `claude` found at `C:\Users\617\.local\bin\claude.exe` version `2.1.100.0`; HTTP health ok; `claude mcp list` ran and showed `vcp_codex_memory` not configured yet
- Claude MCP docs/gate validation: `git diff --check`, trailing whitespace scan, local link check, and `npm run gate:mainline` passed; mainline gate remained health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- Claude MCP config write: `claude mcp add` succeeded after explicit authorization; `claude mcp get/list` showed connected
- Direct MCP `memory_overview`: succeeded via protocol probe with `overviewIsError=false`
- `deepseek-v4-pro` model-mediated retry: failed before tool execution with API `ConnectionRefused`
- `deepseek-v4-pro` model-mediated rerun: succeeded; final result included `memory_overview 调用成功`
- `deepseek-ai/deepseek-v4-flash` model smoke: succeeded
- `deepseek-ai/deepseek-v4-flash` read-only capability assessment: succeeded
- `deepseek-ai/deepseek-v4-flash` model-mediated MCP `memory_overview`: succeeded; final result included `memory_overview 调用成功`
- `npm run gate:mainline`: passed after Flash validation; health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`
- observe:http: not run
- profile gate: not run
- provider smoke: not run
- provider benchmark: not run

## Runtime Notes

- MCP mode: HTTP mainline assumption, verify before runtime claims
- HTTP health: latest known `200` from gate
- Rollback readiness: latest known `39/39 rollback-ready`
- Audit impact: none expected
- Recall impact: none expected

## Blockers

- none

## Decisions

- Keep the `49537f6` push-after result as a board-only delayed note.
- Do not create checkpoint-20 unless a later batch needs a formal checkpoint.
- Treat provider benchmark records as sanitized evidence for provider/profile comparison, not as a replacement for compare / rollback / mainline gate.
- Keep checkpoint-19 as the latest independent checkpoint; board-only push-after gate results can stay in `.agent_board` until a later formal checkpoint is warranted.
- Phase E is closed; future donor/provider/docs polish belongs to maintenance-phase incremental work.
- `MAINTENANCE_BACKLOG.md` is now the maintenance-phase queue for donor/provider/docs follow-up work.
- Keep the `bcb2d84` push-after result as a board-only delayed note.
- Product target is now Codex and Claude only; VCPToolBox remains donor/reference compatibility, not a service target.
- Claude Code local HTTP MCP is the first Claude acceptance path; model-side acceptance should now use `deepseek-ai/deepseek-v4-flash` per latest user instruction.
- Claude config write was explicitly authorized and completed.
- Do not push without explicit user approval.

## Next Safe Task

Validate docs after the `deepseek-ai/deepseek-v4-flash` success record, then create a guarded local aggregate commit if coherent. Do not push without explicit authorization.

## Warnings

- Verify repository reality before trusting this handoff.
- Do not push without explicit approval.
- Do not apply rollback config patches without explicit approval.
- Do not run profile confirm/apply without explicit approval.
