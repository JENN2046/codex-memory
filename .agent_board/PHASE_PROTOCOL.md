# PHASE_PROTOCOL.md

This file defines the machine-readable-ish phase contract used by the A4.8 Safe Project Operator Rail.

## Fields

```yaml
current_phase:
next_phase:
risk_level:
allowed_files:
forbidden_files:
allowed_actions:
hard_stops:
validation:
done_when:
auto_continue:
push_policy:
closeout_required:
```

## Field Meanings

- `current_phase`: active phase name from roadmap/backlog/board
- `next_phase`: next recommended phase after successful closeout
- `risk_level`: A0/A1/A2/A3/A4/A5 risk label
- `allowed_files`: explicit paths or narrow path classes the phase may modify
- `forbidden_files`: paths or classes that must not change
- `allowed_actions`: local actions permitted without further approval
- `hard_stops`: actions that require explicit user approval
- `validation`: commands/checks required for completion
- `done_when`: objective evidence required before commit/closeout
- `auto_continue`: whether A4.8 may continue after completion
- `push_policy`: safe-push behavior for this phase
- `closeout_required`: mandatory report fields

## Current Project Example

```yaml
current_phase: P12.3-controlled-write-dry-run-cli-prototypes
next_phase: P12.4-MCP-tool-proposal-review
risk_level: A2
allowed_files:
  - src/cli/controlled-write-dry-run.js
  - tests/controlled-write-dry-run-cli.test.js
  - tests/fixtures/controlled-write-dry-run-v1.json
  - docs/CONTROLLED_WRITE_TOOLS_PLAN.md
  - MAINTENANCE_BACKLOG.md
  - STATUS.md
  - .agent_board/*
  - package.json script-only
forbidden_files:
  - .env
  - package-lock.json
  - src/adapters/*
  - src/app.js
  - src/index.js
  - src/http-index.js
  - data/*
  - dailynote/*
  - logs/*
allowed_actions:
  - inspect repository
  - add dry-run-only CLI
  - add fixtures/tests/docs
  - run local validation
  - guarded local commit
hard_stops:
  - real DB/memory mutation
  - SQLite migration
  - MCP public tool expansion
  - dependency change
  - secrets/env change
  - provider calls
  - tag/release/deploy
validation:
  - node --test tests\controlled-write-dry-run-cli.test.js
  - npm test
  - git diff --check
  - powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
done_when:
  - dry-run reports mutated=false
  - no durable write path added
  - public MCP tools remain frozen
auto_continue: true unless hard stop
push_policy: safe-push only when readiness is ready
closeout_required: true
```

## Current Reality Note

As of 2026-05-14, P12.3 and P12.4 have landed on `origin/main`. The next product phase is P12.5 planning/approval gate, but runtime mutation remains an A5 hard stop until explicitly approved.
