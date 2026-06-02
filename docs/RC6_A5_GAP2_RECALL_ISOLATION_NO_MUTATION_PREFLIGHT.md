# RC-6 A5-GAP-2 Recall Isolation No-Mutation Preflight

Phase: `RC-6`

Mode: `A5-GAP-2 preflight packet only`

Risk: `A5-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

Prepare the smallest fresh-head `A5-GAP-2` approval boundary for recall isolation evidence.

This packet does not authorize execution. It does not run recall isolation proof, read or scan approved stores, print raw memory content, call MCP tools, call providers, mutate durable memory or audit state, change config/watchdog/startup, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Current Git Reality

At packet creation time:

```text
branch = main
local HEAD = b15fe1abe1a7b7f61c5f22e0eefaf923c87f3102
origin/main = fe39bdc chore: align current facts to pushed head
ahead = 7 local commits
worktree = clean
diff = empty
```

Exact branch, commit, ahead/behind state, and worktree cleanliness must be rechecked immediately before any approved `A5-GAP-2` execution.

## Freshness Assessment

Existing `A5-GAP-2` evidence is useful background, but it is not fresh evidence for current `HEAD`:

- `P66_A5_GAP_2_RERUN_RECALL_ISOLATION_RUNTIME_PROOF_EVIDENCE.md` is bound to commit `ceffc0f255c142875a0f41879539361dd547c4bc`.
- `P66_A5_GAP_2_CLASSIFIED_SAMPLE_RECALL_ISOLATION_READONLY_EVIDENCE.md` is bound to commit `ff55256105e58725c8dbc45cb2d6a68fde98929e`.
- `P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md` is bound to commit `bf3e86d573fd1be1317878d272a1b63373d8c673`.

Those records establish historical bounded evidence and limitations. They do not by themselves provide current-head runtime proof for `b15fe1abe1a7b7f61c5f22e0eefaf923c87f3102`.

## Requested Boundary

Requested unit:

```text
A5-GAP-2
```

Requested stores:

```text
real_diary
real_sqlite
real_vector_index
real_candidate_cache
real_recall_audit
```

Requested mutation mode:

```text
no mutation
```

Allowed only after exact approval:

- read the explicitly approved stores in no-mutation mode
- use the existing recall isolation/classification projection checks
- produce sanitized counts and proof flags only
- verify store snapshots remain unchanged

Not allowed:

- broad real-memory export
- raw memory preview or unrelated private content output
- bearer-token use
- MCP `tools/call`
- provider/model call
- durable memory write
- durable audit write
- migration/import/export/backup/restore
- public MCP expansion
- config/watchdog/startup change
- remote action
- tag/release/deploy/cutover
- readiness or reliability claim

## Expected Evidence

The approved run, if later executed, must report only sanitized fields such as:

- approved branch and commit
- approved store list
- no-mutation flag
- store snapshots unchanged flag
- raw content output flag
- recall pipeline execution flag
- provider call flag
- durable memory write flag
- durable audit write flag
- projection leakage count
- fail-closed limitation if no classified sample is present

## Exact Approval Line

After this packet is committed, use the fresh post-packet `HEAD` in the approval line:

```text
I approve A5-GAP-2 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, limited to stores real_diary, real_sqlite, real_vector_index, real_candidate_cache, real_recall_audit, no mutation.
```

Any broader wording is insufficient. Any reused stale commit is insufficient.

## Stop Conditions

Stop before execution if:

- branch is not `main`
- current `HEAD` does not match the approval line
- worktree is not clean except for intended docs/board preflight edits before commit
- `.env`, secrets, dependency manifests, lockfiles, config, watchdog/startup files, or runtime migration surfaces are unexpectedly changed
- the requested proof would need raw private data output
- the requested proof would need mutation, durable write, provider call, MCP tool call, broad scan, or remote action not named in the approval line

## Readiness Boundary

Even if the future approved `A5-GAP-2` no-mutation proof passes, it will not by itself claim:

- production readiness
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- durable writer readiness
- migration/backfill readiness
- `RC_READY`
