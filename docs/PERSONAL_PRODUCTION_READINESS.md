# Personal Production Readiness

Review date: 2026-05-13

This checklist describes a local-only personal production posture for the current
`origin/main` line. It is not a release checklist, not a public hosting guide,
and not authorization to migrate real memory data.

## Current Baseline

- Base branch: `origin/main`
- Current remote main HEAD: `180eec4`
- Public MCP tools remain `record_memory`, `search_memory`, and
  `memory_overview`.
- HTTP MCP remains the recommended local Codex Desktop entrypoint.
- Next recommended implementation phase:
  `P11.8-lifecycle-read-policy-runtime-flag-implementation`.

Do not use `codex/p1-vcp-memory-core-100-roadmap` as a production or development
baseline. It is a superseded stale reference branch.

## Personal Production Boundary

Allowed personal production posture:

- local-only use
- bind HTTP MCP to loopback unless an explicit token and exposure review exist
- no public exposure
- no multi-tenant use
- no secret-bearing memory writes
- no default provider smoke or provider benchmark
- no real migration without a verified backup and explicit approval
- no push, tag, release, deploy, or remote write without explicit approval

## P10 Runtime Gates To Preserve

Before relying on the runtime for personal production, preserve these current
mainline gates:

- `SecretScanner`: rejects secret-like `title`, `content`, `evidence`, and
  `tags` before diary writes.
- `ToolArgumentValidator`: validates MCP `tools/call` arguments and returns
  `-32602` for invalid shapes.
- HTTP non-loopback token fail-fast: non-loopback HTTP binding without a bearer
  token is rejected.
- Soft read policy default-off: `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false`
  remains the default unless a specific review enables it.

## P11 Lifecycle Readiness

Current lifecycle work is still staged. Treat it as governance groundwork unless
the corresponding runtime phase has explicitly landed.

Current P11 safeguards:

- lifecycle fixture schema defines allowed lifecycle states, transitions, audit
  event shape, and read-policy expectations
- lifecycle SQLite dry-run reports column gaps with `mutated=false`
- lifecycle read-policy fixture records the intended include/exclude behavior
- lifecycle read-policy runtime fixture records default-off flags, enabled-policy
  filtering, stale counts, private visibility behavior, missing-column
  fail-safe expectations, and audit summary shape

P11.8 may implement the optional runtime flag, but it must preserve default-off
behavior, keep MCP public tools unchanged, and avoid SQLite migration unless
explicitly approved.

## Minimum Local Checks

For docs/board-only changes:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

For runtime or contract changes, use targeted tests plus broader validation
appropriate to the touched subsystem. P10/P11 runtime-sensitive changes should
include:

```powershell
npm test
npm run gate:mainline:strict
npm run scope:acceptance -- --json
```

For CI-safe fixture checks:

```powershell
npm run gate:ci -- --json
```

Do not run provider smoke or provider benchmark as a default readiness check.
Those commands may call configured external services and require explicit task
intent.

## Backup Rule Before Real Maintenance

Before any approved real migration, cleanup apply, profile confirm, broad import,
or durable data rewrite, prepare a backup plan for:

- `data/`
- `logs/`
- `dailynote/`
- local configuration files that are explicitly in scope

Do not edit `.env`, provider keys, tokens, or secrets as part of routine
readiness work.

## Daily Local Observation

For a local-only personal run, prefer read-only observation:

```powershell
npm run dashboard
npm run observe:http -- --json
npm run gate:ci -- --json
```

Use `npm run gate:mainline:strict` when preparing a runtime-sensitive handoff or
when a change touches MCP contract, recall, lifecycle/read policy, storage, or
mainline health.

## Stop Conditions

Stop and request explicit approval before:

- public exposure
- provider smoke or provider benchmark
- `rebuild-profile -- --confirm`
- cleanup apply / confirm
- SQLite migration
- real memory import/export/migration
- changing secrets or `.env`
- push, tag, release, or deploy
- using a stale branch as a source for runtime, tests, package scripts, or board
  state
