# Post-Push Gate Compact Mode

Purpose: keep post-push `npm run gate:mainline` evidence useful without creating a new receipt document after every routine push.

## Default Rule

Use compact mode by default for routine post-push mainline health confirmation when all are true:

- fresh `git status --short --branch` shows local `main` aligned with `origin/main`
- `npm run gate:mainline` passes
- health is ok
- compare matches all standard suite cases
- rollback reports all standard suite cases ready
- no runtime/source behavior changed after the pushed commit
- no production config, `.env`, startup/watchdog, provider/API, raw/broad scan, public MCP expansion, release/deploy/cutover, or readiness claim occurred

In compact mode, do not create a new `docs/CM*_POST_PUSH_*RECEIPT*.md` file.

## Required Compact Fields

Record the compact post-push health note in the existing active status surfaces:

- `CURRENT_STATE.md`
- `STATUS.md`
- `.agent_board/CURRENT_FACTS.json`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/AUTOPILOT_LEDGER.md`
- `.agent_board/CHECKPOINT.md`

The compact note must include:

- task id and validation id
- pushed short commit id and commit subject
- fresh pre-gate Git status summary
- `npm run gate:mainline` result
- health status and HTTP status
- compare matched count
- rollback ready count
- rollback recommendation
- explicit non-claims for production observe rollout, production strict auth enablement, `.env`, startup/watchdog, provider/API, raw/broad scan, public MCP expansion, release/deploy/cutover, readiness, and complete V8

## When To Create A Dedicated Receipt Doc

Create a dedicated receipt doc only when at least one is true:

- user explicitly asks for a receipt document
- gate output is unusual, partial, failed, retried after failure, or needs diagnosis
- push involved a source/runtime/security/auth/rollback/provider/migration/config change that needs standalone evidence
- evidence needs exact approval traceability
- the receipt closes a phase or blocker and should be linked independently
- compact mode would make the handoff ambiguous

## Validation

For compact mode, validate with:

```text
git diff --check
node -e "const f=require('./.agent_board/CURRENT_FACTS.json'); /* task/validation pointer check */"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
scoped secret-shaped scan over changed status surfaces
```

The compact note is docs/status evidence only. It is not live-runtime readiness, production readiness, release readiness, cutover readiness, or complete V8 evidence.
