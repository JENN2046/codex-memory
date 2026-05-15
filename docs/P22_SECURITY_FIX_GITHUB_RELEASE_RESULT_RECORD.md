# P22 Security-Fix GitHub Release Result Record

Phase: `P22-github-release-creation`

Mode: `A5 approved GitHub release creation`

Risk: `A4`

Result: `GITHUB_RELEASE_CREATED`

## Purpose

Record that the approved P22 security-fix GitHub release was created for tag `p22-rc-7fd17de`.

This document records completed GitHub release evidence. It does not deploy, call providers, start live HTTP MCP, mutate config, preview real memory, write durable memory, apply migration/import-export behavior, expand public MCP tools, or change package / lockfile / `.env` files.

## Release Evidence

| Field | Value |
|---|---|
| Repository | `JENN2046/codex-memory` |
| Release title | `P22 Security-Fix Release Candidate p22-rc-7fd17de` |
| Tag | `p22-rc-7fd17de` |
| Tag target commit | `7fd17de624c0da76751e863e97302bed0dbec905` |
| Release URL | `https://github.com/JENN2046/codex-memory/releases/tag/p22-rc-7fd17de` |
| GitHub release draft | `false` |
| GitHub release prerelease | `true` |
| Artifact | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md` |

Verification commands recorded for this result:

```powershell
gh release view p22-rc-7fd17de --repo JENN2046/codex-memory --json tagName,name,isPrerelease,isDraft,url,targetCommitish,createdAt,publishedAt
git rev-parse p22-rc-7fd17de
git ls-remote origin refs/tags/p22-rc-7fd17de
git status -sb
```

## Artifact Reference

The release references the approved local Markdown RC artifact:

- [P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md)

The release is a GitHub prerelease because the title and artifact describe a release candidate.

## Recorded Gate Evidence

The artifact records the fresh gate refresh evidence:

- `node --test tests\security-write-policy.test.js`: `3/3` passed
- `npm test`: `473/473` passed
- `gate:ci` tests: `458/458`
- `gate:ci` compare: `43/43`
- `gate:ci` rollback: `43/43`
- `gate:ci` `noProvider=true`
- `gate:ci` `mutated=false`

These gate results are recorded evidence from the approved fresh gate refresh. This release-result record phase did not rerun gates.

## Superseded Candidate Boundary

The previous candidate remains superseded:

- superseded tag: `p22-rc-806cc847`
- superseded artifact: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`
- superseded target: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`

Required boundary:

- do not reuse `p22-rc-806cc847`
- do not move `p22-rc-806cc847`
- do not delete `p22-rc-806cc847` without separate explicit approval
- do not create or edit a GitHub release for `p22-rc-806cc847` without separate explicit approval

## Release State

Release state: `SECURITY_FIX_GITHUB_RELEASE_CREATED_DEPLOY_NOT_PERFORMED`

Completed:

- security fix committed and pushed
- fresh local non-provider RC gate refresh passed
- security-fix RC artifact created
- Git tag `p22-rc-7fd17de` created and pushed
- GitHub prerelease created for `p22-rc-7fd17de`

Still not performed:

- no deploy
- no provider call
- no live HTTP MCP startup
- no config mutation
- no startup/watchdog operation
- no real memory preview
- no durable memory write
- no SQLite migration or `ALTER TABLE`
- no migration/import-export apply
- no public MCP expansion
- no package or lockfile change
- no `.env` or secret change

## Next Recommended Phase

If deployment should continue, request explicit deploy approval for a named target, exact command, rollback story, and validation plan.

Deploy remains separately blocked and requires its own explicit approval.
