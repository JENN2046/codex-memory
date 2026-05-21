# Safe Push Policy

Updated: 2026-05-21

## Purpose

Safe-push lets A4.8 publish validated low-risk work to `origin/main` without treating push permission as permission for high-risk work.

Under Smart Standing Authorization v3, push remains Red unless the existing safe-push policy fully passes or the user explicitly authorizes the exact push. The autonomy envelope does not make push, tag, release, deploy, or PR work automatic.

Safe-push is allowed only when every condition below passes.

## Safe-Push Conditions

- worktree is clean
- push readiness result is `ready`
- local branch is ahead only by validated commits
- changed files are inside the current phase scope
- no `.env`, secrets, credentials, provider keys, cookies, bearer tokens, private keys, or password values changed
- no dependency manifest, lockfile, or package-manager change
- no provider-smoke or provider-benchmark was run
- no Amber external/write receipt is missing
- no `rebuild-profile --confirm`
- no SQLite migration or `ALTER TABLE`
- no real DB/memory mutation
- no MCP public tool expansion
- no MCP schema change
- no stale branch merge/rebase/cherry-pick
- required validation commands passed
- post-push remote hash verification is performed

## Push Readiness Checks

Before safe-push, inspect:

```powershell
git status -sb
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
git diff --name-only origin/main..HEAD
git diff --check origin/main..HEAD
git ls-remote origin refs/heads/main
```

Also scan the diff for sensitive patterns such as token, api key, password, private key, bearer, cookie, authorization, and secret. Policy words such as `SecretScanner` or `emit_raw_secret` are not themselves credentials, but the scan must still be reviewed.

## Forbidden Auto-Push Cases

Do not auto-push when the diff includes or requires:

- runtime mutation tool implementation
- MCP schema/tool expansion
- DB migration
- dependency change
- package-manager change
- secrets/env change
- release/tag/deploy
- failed validation
- ambiguous diff scope
- unrelated worktree files
- generated durable runtime data
- real provider calls
- real DB/memory writes

## Post-Push Verification

After push, verify:

```powershell
git status -sb
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
```

Closeout must report local hash, `origin/main` hash, remote hash, worktree status, and whether tag/release/deploy were avoided.
