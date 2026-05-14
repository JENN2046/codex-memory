# CLOSEOUT_SCHEMA.md

Every A4.8 phase closeout must include the following fields.

```yaml
phase:
result:
branch:
worktree:
changed_files:
validations:
boundary_confirmations:
commit_hash:
push_status:
remote_hashes:
blockers:
next_recommended_phase:
```

## Field Requirements

- `phase`: exact phase label
- `result`: `COMPLETED_VALIDATED`, `COMPLETED_UNVALIDATED`, `PARTIAL`, `BLOCKED`, or `FAILED`
- `branch`: current branch and upstream state
- `worktree`: clean/dirty status
- `changed_files`: all changed files, including untracked files before commit
- `validations`: commands run and pass/fail result
- `boundary_confirmations`: explicit yes/no statements for hard-stop classes
- `commit_hash`: guarded local commit hash, or `none`
- `push_status`: `not pushed`, `pushed`, or `blocked`
- `remote_hashes`: local/origin/remote hashes if pushed
- `blockers`: remaining blockers or `none`
- `next_recommended_phase`: next safe phase, or approval gate

## Required Boundary Confirmations

- no `.env` / secrets change
- no dependency or package-manager change
- no MCP public tool expansion
- no MCP schema change
- no runtime mutation unless explicitly approved
- no SQLite migration or `ALTER TABLE`
- no real DB/memory write
- no provider-smoke/provider-benchmark
- no `rebuild-profile --confirm`
- no stale branch merge/rebase/cherry-pick
- no tag/release/deploy

## Pushed Closeout Additions

If pushed, also report:

```yaml
local_main_hash:
origin_main_hash:
remote_main_hash:
post_push_worktree:
```
