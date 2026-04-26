# Embedding Profile Migration Runbook

This runbook describes the safe path for changing embedding models, dimensions, or RAG profile tuning in `codex-memory`.

The core rule is simple: every embedding model change creates a new terrain. Do not reuse old vectors, chunk indexes, candidate cache, or RAG tuning without an explicit profile boundary.

## Profile Identity

`codex-memory` builds the active embedding fingerprint as:

```text
<model>__<dimensions>__<version>
```

Example:

```text
bge-m3-local__1024__v1
text-embedding-3-large__3072__v1
qwen-embedding-x__1536__v1
```

Inputs:

- `CODEX_MEMORY_LOCAL_EMBEDDING_MODEL`
- `CODEX_MEMORY_EMBED_DIMS`
- `CODEX_MEMORY_EMBEDDING_PROFILE_VERSION`

RAG tuning can be attached with:

```text
CODEX_MEMORY_RAG_PARAMS_PATH=examples/rag-params.profiles.example.json
```

## Safety Boundaries

Safe to regenerate:

- current profile vector index
- current profile SQLite `memory_chunks`
- current profile candidate cache entries
- embedding cache entries under the current profile vector index

Must be preserved:

- diary source files
- `memory_records`
- `.env` and secret files
- other embedding profiles
- user-owned uncommitted files
- remote branches and repository history

Never switch a model by overwriting the old profile in place. Bump `CODEX_MEMORY_EMBEDDING_PROFILE_VERSION` when changing model behavior, dimensions, provider, or major RAG tuning.

## Preflight

Run these before changing anything:

```powershell
git branch --show-current
git status --short
git diff --stat
npm run profile-health
npm run rebuild-profile -- --dry-run --json
npm run profile-gate -- --json --summary-only
```

Expected healthy current state:

- `profile-health` status is `ready`
- current chunks are nonzero
- vector index exists
- vector index fingerprint matches current fingerprint
- legacy chunks, if present, are reported as ignored by current-profile search

## Migration Procedure

1. Edit local environment only.

   Set the new model, dimensions, and profile version:

   ```powershell
   $env:CODEX_MEMORY_LOCAL_EMBEDDING_MODEL="bge-m3-local"
   $env:CODEX_MEMORY_EMBED_DIMS="1024"
   $env:CODEX_MEMORY_EMBEDDING_PROFILE_VERSION="v2"
   $env:CODEX_MEMORY_RAG_PARAMS_PATH="examples/rag-params.profiles.example.json"
   ```

2. Verify the new fingerprint before cleanup:

   ```powershell
   npm run rebuild-profile -- --dry-run --json
   ```

   Confirm that `embeddingProfile.fingerprint` is the intended new value.

3. Clear only current-profile generated artifacts:

   ```powershell
   npm run rebuild-profile -- --confirm --json
   ```

   This must only clear current profile vector index, current profile chunks, and current profile candidate cache entries.

4. Rebuild chunks and vectors:

   ```powershell
   npm run rebuild-shadow
   ```

5. Check profile health:

   ```powershell
   npm run profile-health
   ```

6. Compare recall behavior:

   ```powershell
   npm run shadow-compare -- --query "embedding profile migration"
   npm run shadow-compare -- --query "your domain query" --json
   npm run profile-gate -- --json --summary-only
   ```

   Use several real queries from recent work. `profile-gate` runs the fixed migration suite from `benchmarks/profile-migration-suite.json`; pass `--baseline-fingerprint "<old-profile>" --require-pass` when you have a real previous profile and want a hard gate. Treat `approximate` and `lexical-only` as directional signals, not final proof.

7. Run validation:

   ```powershell
   npm test
   ```

## Legacy Cleanup

Legacy chunks are rows with no `embedding_fingerprint`. They are ignored by current-profile search, but they may still be useful as a temporary baseline before final cleanup.

Before cleanup:

```powershell
npm run profile-health
npm run profile-gate -- --json --summary-only
npm run cleanup-legacy-chunks -- --dry-run --json
```

If you need a hard recall comparison, capture or preserve a real previous fingerprint before deleting legacy rows. Once legacy rows are removed, `profile-gate` can still verify that the current profile returns results, but it will report `baseline-missing` until another baseline profile exists.

Create a rollback point before the destructive command. For SQLite-backed local runs, copy `data/codex-memory.sqlite` to `data/backups/` or another local backup path first.

Only after the dry-run count and backup look correct:

```powershell
npm run cleanup-legacy-chunks -- --confirm --json
npm run profile-health
npm run profile-gate -- --json --summary-only
```

Expected post-cleanup state:

- `profile-health` status is `ready`
- `legacy chunks` is `0`
- current chunks still match the current profile
- `profile-gate` may return `warn` with `baseline-missing` when no baseline profile remains

## Acceptance Criteria

Minimum acceptance for local migration:

- `profile-health` status is `ready`
- current profile chunk count is nonzero
- vector index exists and fingerprint matches current profile
- `npm test` passes
- `shadow-compare` has been run on representative queries
- `profile-gate` has been run on the fixed migration suite
- no `.env` secret values were printed, copied, or committed

Recommended acceptance before publishing:

- current profile has stable recall for project-critical queries
- previous profile artifacts are preserved or intentionally cleaned
- README and examples match the active fingerprint rule
- worktree state is reviewed before commit

## Rollback

Rollback is profile selection, not data destruction.

To return to a previous embedding terrain:

1. Restore the old environment values:

   ```powershell
   $env:CODEX_MEMORY_LOCAL_EMBEDDING_MODEL="bge-m3-local"
   $env:CODEX_MEMORY_EMBED_DIMS="1024"
   $env:CODEX_MEMORY_EMBEDDING_PROFILE_VERSION="v1"
   ```

2. Check health:

   ```powershell
   npm run profile-health
   ```

3. If the old profile artifacts are missing, rebuild them:

   ```powershell
   npm run rebuild-profile -- --dry-run --json
   npm run rebuild-shadow
   ```

Do not delete other profile directories during rollback unless you have an explicit cleanup task and a fresh backup or commit boundary.

## Troubleshooting

`profile-health` says `sqlite-fingerprint-column-missing`:

- Run `npm run rebuild-shadow`.
- This migrates shadow chunks into fingerprint-aware rows.

`profile-health` says `vector-index-fingerprint-mismatch`:

- Run `npm run rebuild-profile -- --confirm --json`.
- Then run `npm run rebuild-shadow`.

`shadow-compare` says `no-baseline`:

- There is no other fingerprint in SQLite chunks.
- This is normal for a first clean rebuild.

`shadow-compare` says `approximate`:

- The compared chunks are cross-profile.
- Use it as an inspection aid, not as a final quality gate.

`profile-gate` returns `warn`:

- Inspect `checks` first.
- `baseline-missing`, `lexical-only`, and `approximate-vector-compare` mean the gate ran, but the comparison is directional.
- For release gating, use a known baseline fingerprint and `--require-pass`.

`rebuild-shadow` prints a result but the shell times out:

- Run `npm run rebuild-profile -- --dry-run --json` and `npm run profile-health`.
- If chunks and vector index were regenerated, the rebuild likely completed and only process shutdown lagged.

## Release Checklist

Before commit or push:

```powershell
git status --short
git diff --stat
npm run profile-health
npm run profile-gate -- --json --summary-only
npm test
```

Do not commit:

- `.env`
- API keys
- provider tokens
- generated profile data under `data/`
- unrelated user documents unless intentionally included
