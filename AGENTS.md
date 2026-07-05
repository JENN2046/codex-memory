# AGENTS.md - codex-memory Project-Level Operating Protocol

Version: Project-level filled template 1.1
Date: 2026-07-05

Purpose: repository-specific companion to Jenn's global L3 operating protocol.
The global protocol controls default autonomy, core hard stops, and general
delivery behavior. This file narrows that protocol only with facts, commands,
paths, risks, validation gates, and delivery surfaces verified in this
`codex-memory` repository.

This file does not authorize production, release, deployment, paid provider
calls, destructive operations, secret access, unsafe remotes, readiness claims,
or public MCP expansion.

---

## 1. Project Identity and Scope

Project name: `codex-memory`
Repository: `/home/jenn/AGENTS_OS_Workspace/memory/codex-memory`
Observed remote: `origin` -> `git@github.com:JENN2046/codex-memory.git`
Primary language / stack: Node.js 22+, CommonJS, MCP server/runtime, CLI tools,
local storage/index/audit helpers.
Package manager: `npm` with `package-lock.json`.
Package facts: `package.json` has `"name": "codex-memory"`, `"private": true`,
`"type": "commonjs"`, and `"engines": { "node": ">=22.0.0" }`.

Main purpose, from README/source evidence: governed memory bridge and
compatibility runtime for Codex / Claude workflows. Current direction is
VCPToolBox-native-first governed memory bridge work, while the local
`vcp_codex_memory` runtime remains a protected compatibility layer and
fallback/test substrate. VCPToolBox remains the native memory behavior owner;
`codex-memory` owns governance, profile selection, approval boundaries,
low-disclosure projections, receipts, rollback posture, client scope
governance, and local fallback/test contracts.

Current protected source realities:

* MCP service identity is `vcp_codex_memory`.
* Current `TOOL_DEFINITIONS` public MCP surface is exactly:
  `audit_memory`, `memory_overview`, `record_memory`, `search_memory`,
  `supersede_memory`, `tombstone_memory`, `validate_memory`.
* `audit_memory` is readonly and low-disclosure.
* `validate_memory`, `tombstone_memory`, and `supersede_memory` are public
  controlled-mutation preflight tools; durable confirmed mutation requires a
  separate exact approval and must not be inferred from registration.
* Public MCP tool/schema expansion remains blocked unless Jenn explicitly
  authorizes the exact phase and boundary.
* Docs-only, fixture-only, no-mutation, and read-only evidence must not be
  described as live runtime readiness, cutover readiness, production readiness,
  release readiness, or `RC_READY`.

Authorized default repository scope, when the current task allows writes:

* `src/`
* `tests/`
* `docs/`
* `.agent_board/`
* `scripts/`
* `schemas/`
* `examples/`
* `benchmarks/active-memory-suite/` for active-memory fixtures and gates
* Root project docs such as `README.md`, `STATUS.md`, `CURRENT_STATE.md`,
  `DOCS_GOVERNANCE.md`, `VALIDATION.md`, `CODEX_MEMORY_NEXT_PHASE_PLAN.md`,
  `PHASE_NAVIGATION.md`, and phase/backlog/taskbook markdown files
* `package.json` scripts only when command wiring is directly in scope;
  dependency changes require exact package/action scope

Out of scope unless Jenn explicitly authorizes the exact boundary:

* VCPToolBox core-code modification
* production configuration
* release automation or publishing
* deployment workflows
* billing or paid provider configuration
* credentials, secret values, tokens, cookies, or private keys
* destructive migrations, cleanup apply/confirm, or irreversible state changes
* broad architecture rewrites
* public MCP tool or schema expansion
* real memory import/export/migration
* broad real memory scans
* raw private memory, raw store, raw audit, raw log, raw `.jsonl`, provider
  payload, response body, or secret-bearing output reads
* readiness, release, deploy, cutover, full bridge completion, read-shape proof,
  live runtime proof, or `RC_READY` claims without exact evidence and scope

---

## 2. Applicable Global Protocol

Follow Jenn's global `AGENTS.md` for:

* L3 default autonomous delivery
* core hard stops
* secret and private-state handling
* Git safety
* validation truthfulness
* memory safety
* reporting

This repository file only adds repo-specific evidence and narrower rules. If a
repo instruction conflicts with the global protocol or Jenn's current task
boundary, follow the stricter safe boundary and report `BLOCK` when needed.

Instruction precedence inside this repository:

1. Higher-level system / runtime / tool / safety limits.
2. Jenn's explicit current instruction.
3. Current task brief / issue / taskbook / authorization boundary.
4. Nearest applicable directory-level `AGENTS.override.md` or `AGENTS.md`.
5. This repository-root `AGENTS.md`.
6. Jenn's global `AGENTS.md`.
7. Project docs and tool outputs as contextual evidence.

Default repository posture:

* Standard local profile: root `AGENTS.md` plus `.agent_board/`.
* Smart Standing Authorization v3 is recognized by project docs, but this file
  does not restate the global autonomy model.
* Red Lane remains manual for this repository: push, PR, tag, release, deploy,
  destructive commands, secret reads, broad private data scans, public MCP
  expansion, config/watchdog/startup mutation, real memory migration, paid
  provider calls, and readiness claims.
* Default response language for project work is Simplified Chinese unless Jenn
  asks otherwise. Keep code, commands, paths, identifiers, logs, and errors in
  their original language.

---

## 3. Repository Map

Key paths:

| Path | Purpose | Agent behavior |
|---|---|---|
| `src/core/` | Memory domain services, contracts, constants, governance helpers | Editable inside scope; add targeted tests for behavior or boundary changes |
| `src/storage/` | Diary, SQLite, vector index, chat index, audit, cache | High risk; prefer fixture/temp stores; do not inspect raw runtime stores by default |
| `src/recall/` | Candidate generation, TagMemo, EPA, ResidualPyramid, rerank, recall audit | Validate with targeted tests and active-memory compare/rollback when touched |
| `src/adapters/codex-mcp/` | HTTP/stdio MCP adapter surface | Public contract sensitive; preserve seven-tool surface unless exact expansion is approved |
| `src/adapters/vcp-*` | VCP active/passive/light memory compatibility adapters | Compatibility sensitive; validate with focused tests and compare/rollback where relevant |
| `src/cli/` | CLI entrypoints and validation/runtime utilities | Inspect before running; dry-run by default for migration/profile/cleanup commands |
| `src/config/` | Local configuration helpers | Do not edit secrets or live env values |
| `src/tagmemo/` | TagMemo-specific behavior | Validate targeted TagMemo tests and recall gates when touched |
| `tests/` | Node test suite and fixtures | Editable inside scope; prefer focused tests plus default suite for shared behavior |
| `tests/fixtures/`, `tests/schema_examples/` | Synthetic fixtures/examples | Fixture-only unless current task explicitly authorizes broader runtime evidence |
| `docs/` | Documentation, receipts, plans, archive, taskbooks | Approved project memory; keep claims aligned to source and validation evidence |
| `docs/archive/` | Archived plans/backups/evidence | Read by targeted id/path when needed; avoid loading large history by default |
| `.agent_board/` | Sustained task queue, current facts, validation log, handoff, ledger, checkpoint | Required governance surface for non-trivial status/route work |
| `scripts/` | Local validation and helper scripts | Inspect before running; scripts must not push/deploy/edit secrets |
| `benchmarks/active-memory-suite/` | Active-memory standard suite and fixtures | Fixture validation only unless exact broader scope is authorized |
| `benchmarks/real-query-suite/`, `benchmarks/reports/` | Query/report benchmark surfaces | Treat as evidence surfaces; do not infer live runtime readiness |
| `schemas/` | Contract/schema artifacts | Editable with corresponding tests/docs |
| `examples/` | Example env/config inputs | Avoid real secrets or private paths |
| `.github/workflows/ci.yml` | Observed CI workflow | High risk; workflow changes need explicit scope and local validation |
| `data/` | Ignored runtime storage/indexes | Private/raw runtime state; do not inspect contents by default |
| `logs/*.log`, `logs/*.jsonl` | Ignored generated logs/audit streams | Raw output; do not read unless exact approval allows it |
| `logs/*.md`, `logs/archived/*.md` | Tracked markdown evidence records | Docs/evidence; do not confuse with raw log streams |
| `.colameta/plan.json`, `.colameta/memory.md`, `.colameta/runtime/**`, `.colameta/logs/**`, `.colameta/local/**`, and related ignored `.colameta` state | Local ColaMeta state | Do not read or move into tracked state unless exact non-secret scope allows it |
| `.colameta/prompts/*.md`, `.colameta/rules.md` | Tracked ColaMeta prompt/rule docs observed in git | Treat as tracked docs, not secret by path alone |
| `.omc/`, `.claude/`, `.tmp/`, `tmp-compare.json` | Ignored local/scratch state | Do not commit or inspect private contents by default |
| `tmp/` | Local directory observed, not ignored as a whole by `.gitignore` | Verify `git status` before using; do not assume it is ignored private scratch |
| `.env`, `.env.local`, `.env.*.local` | Local config/secrets | Do not read contents |
| `.env.example`, `.env.advanced.example`, `examples/*.env.example` | Redacted config examples | Safe to inspect for schema/examples, not for live values |

Add directory-level overrides only when a sub-tree needs stricter rules.

---

## 4. Setup and Local Commands

Allowed setup command when dependency installation is in scope:

```bash
npm ci
```

Use lockfile-respecting install commands. Do not run setup/install commands that
require secrets, production credentials, live provider routing, production
databases, irreversible external writes, or real-world notifications.

Observed package scripts include:

```bash
npm test
npm run test:hardening
npm run test:provider
npm run test:all
npm run gate:mainline
npm run gate:mainline:strict
npm run gate:ci
npm run start:http
npm run start:http:ensure
npm run observe:http -- --json
npm run compare-active-memory -- --suite ./benchmarks/active-memory-suite/standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite ./benchmarks/active-memory-suite/standard-suite.json --json --require-ready
npm run rebuild-profile -- --dry-run --json
npm run profile-health
npm run profile-gate -- --json --summary-only
npm run rollback:mainline:plan -- --json
```

No dedicated `lint`, `typecheck`, or `build` package script was observed in
`package.json`. Treat those as `UNKNOWN - no dedicated package script observed`
unless a task identifies a specific substitute.

Primary local validation commands:

```bash
node --check <changed-js-file>
node --test tests/<targeted-test>.test.js
npm test -- --summary
bash scripts/validate-local.sh docs
bash scripts/validate-local.sh test
bash scripts/validate-local.sh mainline
bash scripts/validate-local.sh strict
npm run gate:mainline
npm run gate:mainline:strict
```

Recommended validation ladder:

1. `node --check <changed-js-file>` for changed JavaScript.
2. `node --test tests/<targeted-test>.test.js` for focused behavior.
3. `npm test -- --summary` for default-safe tests.
4. `bash scripts/validate-local.sh docs` for docs/status/board updates.
5. `node scripts/validate_current_facts_drift.js` when current facts may drift.
6. `node scripts/validate_autopilot_ledger_consistency.js` when ledger/status is touched.
7. `npm run gate:mainline` for mainline-sensitive behavior.
8. `npm run gate:mainline:strict` for MCP/HTTP/mainline contract-sensitive work.

Commands that are slow, runtime-adjacent, provider-adjacent, or need caution:

```bash
npm run gate:mainline:strict
npm run test:all
npm run compare-active-memory -- --suite ./benchmarks/active-memory-suite/standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite ./benchmarks/active-memory-suite/standard-suite.json --json --require-ready
npm run start:http:ensure
npm run observe:http -- --json
npm run start:http:watchdog:once
npm run provider-smoke -- --json
npm run provider-benchmark -- --json
```

Commands blocked unless Jenn explicitly authorizes the exact scope:

```bash
npm run start:http:install-task
npm run start:http:watchdog:install
npm run start:http:watchdog:ensure
npm run rebuild-profile -- --confirm --json
npm run rebuild-shadow
npm run cleanup-legacy-chunks -- --confirm
npm run lifecycle:sqlite:migrate
npm run provider-smoke -- --json
npm run provider-benchmark -- --json
git push origin main
git push --tags
```

Dry-run-only by default:

```bash
npm run rebuild-profile -- --dry-run --json
npm run cleanup-legacy-chunks -- --dry-run --json
npm run lifecycle:sqlite:dry-run
npm run vcp-memory:mapping:dry-run
npm run vcp-memory:migration-readiness -- --json
npm run rollback:mainline:plan -- --json
```

---

## 5. Branch, Remote, and Delivery Policy

Observed at fill time:

* Current branch: `main`
* Current remote: `origin` -> `git@github.com:JENN2046/codex-memory.git`
* Current `main...origin/main`: ahead 248, behind 0

These are point-in-time facts. Re-run Git checks before branch-sensitive,
commit, push-readiness, PR, release-like, or remote work:

```bash
git branch --show-current
git status --short
git remote -v
git rev-list --left-right --count <branch>...origin/<branch>
```

Protected branches:

* `main`
* `master`
* `production`
* `release`

Remote policy:

* Push is not authorized by default for this project.
* A remote named `origin` is not automatically safe.
* Do not push unless Jenn explicitly authorizes the exact push action or a
  current project instruction explicitly activates a safe-push policy and every
  safe-push requirement passes with fresh evidence.
* Do not push to `main`, `master`, `production`, or `release`.
* Do not push to `upstream`.
* Do not force push.
* Do not push tags.
* Do not push branches known to trigger release, deployment, production
  mutation, billing, paid provider calls, customer-facing effects, or
  real-world notifications.

Default task branch pattern when branch creation is in scope:

```text
codex/<short-task-name>
```

Normal delivery surfaces:

* local commit
* safe feature branch only when push is authorized and fresh safety checks pass
* existing PR or repository PR system only when Jenn authorizes that delivery
* `.agent_board/TASK_QUEUE.md`
* `.agent_board/VALIDATION_LOG.md`
* `.agent_board/CHECKPOINT.md`
* `.agent_board/HANDOFF.md`
* `.agent_board/AUTOPILOT_LEDGER.md`
* `STATUS.md`
* `CURRENT_STATE.md`
* `docs/`
* `docs/taskbooks/`
* `docs/archive/imported-plans/`
* task-specific receipt docs

Do not create external trackers, cloud resources, SaaS records, customer-facing
posts, messages, or notifications unless Jenn explicitly authorizes them.

---

## 6. CI, Deployment, and Release Risk

Observed workflow files:

```text
.github/workflows/ci.yml
```

Observed `.github/workflows/ci.yml` behavior:

* Runs on pushes to `main`.
* Runs on pull requests targeting `main`.
* Uses Node.js 22.
* Runs `npm ci`.
* Runs `npm test`.
* Runs profile CLI smoke commands:
  `npm run rebuild-profile -- --dry-run --json`,
  `npm run profile-health`,
  `npm run profile-gate -- --json --summary-only`,
  `npm run v8-diagnose -- --query "[[checkpoint vector schema migration]] ::TagMemo+1.5"`.
* No deployment, package publish, release upload, production migration, or
  notification step is currently observed in that workflow.

Deployment / release risk:

* No deployment trigger is currently observed in `.github/workflows/ci.yml`.
* Release-related docs and release-gate test scripts exist, but they do not
  authorize tagging, publishing, deployment, or release claims.
* Repository settings, branch protections, GitHub environments, and external
  integrations outside checked-in files are `UNKNOWN - treat remote delivery as
  blocked until verified for the exact action`.
* Treat any new workflow, release, tag, package publish, `workflow_dispatch`,
  environment deployment, branch protection bypass, or external integration as
  high risk and blocked unless Jenn explicitly scopes it.

Release policy:

* Agents may not tag releases.
* Agents may not publish packages.
* Agents may not deploy.
* Agents may not run production migrations.
* Agents may not modify release automation unless Jenn explicitly scopes the
  task and no hard stop is triggered.

If push or PR update may trigger deployment, release, production mutation,
billing, paid provider calls, or real-world side effects, report `BLOCK` for
that delivery step.

---

## 7. Secrets and Private State Map

Secret-adjacent or private-state paths:

* `.env`
* `.env.local`
* `.env.*.local`
* `data/`
* `*.sqlite`
* `*.sqlite-shm`
* `*.sqlite-wal`
* `logs/*.log`
* `logs/*.jsonl`
* `.omc/`
* `.claude/`
* `.tmp/`
* `tmp-compare.json`
* ignored `.colameta` local state listed in `.gitignore`, including
  `.colameta/plan.json`, `.colameta/memory.md`, `.colameta/decisions.json`,
  `.colameta/todolist.json`, `.colameta/state.json`, `.colameta/runtime/**`,
  `.colameta/logs/**`, `.colameta/reports/**`, `.colameta/audits/**`,
  `.colameta/plan-patches/**`, `.colameta/tmp/**`, `.colameta/local/**`,
  `.colameta/executor-session.json`, `.colameta/executor-sessions/**`,
  `.colameta/settings.json`, `.colameta/runner-settings.json`, and
  `.colameta/**/*.lock`
* any bearer-token, provider-key, private-key, cookie, credential, verification
  code, database URL, runtime-state, raw memory, raw audit, raw log, provider
  payload, or response-body file discovered during task work

Clarifications:

* `.env.example`, `.env.advanced.example`, and `examples/*.env.example` are
  redacted examples and may be inspected for shape.
* `logs/*.md` and `logs/archived/*.md` are tracked markdown evidence records,
  not raw `.log` / `.jsonl` streams by path alone.
* Some `.colameta` prompt/rule markdown files are tracked. Do not treat the
  entire `.colameta/` tree as private by path alone; apply the ignored-state
  list above and fresh `git status`/`git ls-files` checks.
* `tmp/` exists locally but is not ignored as a whole by `.gitignore`; verify
  before use and do not assume it is safe scratch.

Rules:

* Do not open or read secret/private-state contents.
* Do not print, summarize, validate, transform, commit, store, or transmit
  secret values.
* Agents may inspect file names, paths, git status, and whether
  secret-adjacent files are tracked.
* Use redacted examples, config schemas, docs, mocks, or redacted error
  messages instead of real secret values.
* Do not read raw memory stores, raw audit streams, raw `.jsonl`, runtime logs,
  provider payloads, response bodies, or private memory content unless Jenn
  gives exact scope and the project boundary allows it.

Secret scanning command, if available and safe:

```bash
git diff --cached -U0 | rg -n "^\+[^+].*(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE)|Authorization:|Bearer [A-Za-z0-9._-]{20,})"
```

When docs intentionally contain approval-token vocabulary such as `APPROVE_`,
treat it as governance text only after manual review confirms it is not a live
secret and is within scope.

---

## 8. Documentation and Project Memory

Documentation paths:

* `README.md`
* `STATUS.md`
* `CURRENT_STATE.md`
* `DOCS_GOVERNANCE.md`
* `VALIDATION.md`
* `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
* `PHASE_NAVIGATION.md`
* `MEMORY.md`
* `docs/`
* `docs/taskbooks/`
* `docs/archive/`
* `.agent_board/`

Update docs when commands, APIs, configuration, tests, directory structure,
workflow, behavior, or architecture change inside task scope.

Approved project memory paths:

* `.agent_board/`
* `docs/`
* `docs/taskbooks/`
* `docs/archive/`
* `STATUS.md`
* `CURRENT_STATE.md`
* `MEMORY.md` only for safe, durable project facts already suitable for
  repository memory

Project memory should be durable, useful for future agents, evidence-grounded
or clearly marked as assumption, and safe to retain.

Do not write personal long-term user memory from project work unless Jenn
explicitly asks.

Do not write secrets, credentials, tokens, cookies, `.env` values, private keys,
verification codes, production credentials, `state-private` contents, low-value
logs, short-lived noise, or unverified guesses as facts.

---

## 9. Read-Only / Audit-Only Behavior

When Jenn asks for read-only review, audit-only work, no file changes, or no
writes:

* inspect only non-sensitive repository reality;
* do not edit files;
* do not create generated artifacts;
* do not update docs, reports, task notes, issues, PRs, or memory;
* do not commit;
* do not push;
* report findings in the allowed response surface.

Read-only does not authorize:

* raw private memory/store/audit/log reads;
* secret reads;
* runtime probes that call VCPToolBox, MCP tools, providers, or live services;
* process-state inspection;
* service start/stop/restart;
* endpoint/locator disclosure.

---

## 10. Testing and Validation Policy

For code changes, run the smallest relevant deterministic validation set first.
For docs/status/board changes, run docs validation unless the task is explicitly
read-only.

Task-specific validation expectations:

| Change type | Required validation |
|---|---|
| Docs/status/board-only change | Diff review, no contradiction with source/README, `git diff --check`, `bash scripts/validate-local.sh docs`, current-facts drift check when relevant, ledger consistency when relevant |
| Unit-level JavaScript change | `node --check <changed-js-file>` and targeted `node --test tests/<target>.test.js` |
| Shared source or governance helper | Targeted tests, negative-path tests where practical, `npm test -- --summary`, docs/status validation when status changes |
| MCP tool or public contract change | Targeted contract tests, public surface assertion against the seven-tool list, `npm run gate:mainline:strict`; public MCP expansion requires exact approval |
| HTTP runtime behavior change | Targeted tests, `npm run start:http:ensure`, `npm run observe:http -- --json`, and relevant gate only when runtime work is authorized |
| Active memory / DeepMemo / TopicMemo change | Targeted tests plus compare/rollback standard suite |
| Recall main chain / TagMemo / EPA / ResidualPyramid / rerank change | Targeted tests, default tests, compare/rollback suite, and mainline gate as needed |
| Provider/profile change | Dry-run profile validation by default; provider smoke/benchmark only under exact provider scope |
| Config/startup/watchdog change | Explicit Jenn authorization, local equivalent validation, rollback notes, and no install/ensure mutation unless approved |
| Shadow store / diary / vector / cache change | Prefer fixture/temp-store tests; real rebuilds only under exact scope |
| Migration/import/export/cleanup change | Dry-run only by default; no confirm/apply without exact approval |
| CI/workflow change | High risk; local equivalent validation and explicit scope required |
| Memory/security/boundary change | Negative-path tests or dry-runs where practical; secret/raw-output/readiness scans |

Validation labels:

* `PASS`: required validation passed.
* `PARTIAL`: useful work completed but required validation is incomplete or not
  fully applicable.
* `BLOCK`: a hard stop or exact Jenn decision is required.
* `FAIL`: validation failed and could not be fixed inside safe scope.
* `NO_CHANGES`: no file changes were made.
* `FINDINGS_ONLY`: review/audit produced findings without writes.

Do not report `PASS` for a required validation gate that failed. If validation
cannot run, report `NOT RUN` with the reason.

After fixing a bug, validation failure, security finding, or review finding,
perform a re-review pass over the changed scope before final reporting. The
re-review checks for regressions, contract drift, unsafe authorization changes,
provider/API calls, secret exposure, data mutation, readiness overclaims, and
validation gaps. Report "no actionable findings in the changed scope" only when
that is supported by the review.

Do not claim:

* production readiness;
* release readiness;
* deploy readiness;
* cutover readiness;
* `RC_READY`;
* complete V8;
* full bridge completion;
* read-shape proof;
* live runtime proof;

unless the current task explicitly requires it and all required evidence exists.

---

## 11. Incidental Findings

Handle incidental findings this way:

* hard-stop finding: report `BLOCK`;
* directly related to the task or validation credibility: fix within the
  smallest effective scope;
* unrelated but useful: record as follow-up in `.agent_board/TASK_QUEUE.md`,
  `.agent_board/CHECKPOINT.md`, `docs/taskbooks/`, or a task-specific docs note
  when writes are allowed;
* unrelated architecture concern: do not fix during current task unless Jenn
  explicitly expands scope.

Do not use incidental findings to justify broad rewrites, dependency churn,
public MCP expansion, runtime mutation, or readiness claims.

---

## 12. Subagents and Review

Use subagents when parallel work, independent review, or domain separation adds
clear value. Do not use them for small tasks.

Suggested split for complex tasks:

* Commander: scope, risks, hard stops, decomposition.
* Worker A: implementation.
* Worker B: tests.
* Worker C: docs / project memory.
* Reviewer: safety, validation, scope, secret handling.
* Integrator: final consistency, validation, commit, authorized delivery, report.

Subagent output is not final truth. The primary Codex/Integrator remains
responsible for final consistency, validation, diff review, safe delivery, and
reporting.

Independent review is especially useful for:

* public MCP contract changes;
* memory read/write governance;
* raw-output or secret-boundary changes;
* HTTP runtime/startup/watchdog changes;
* validation/ledger/current-facts gate changes;
* release/cutover/readiness-adjacent work.

---

## 13. Reporting Template

Every task must end with:

```text
Result:
Scope:
Changed files:
Validation:
Evidence:
Git delivery:
Delivery surface:
Memory:
Risks:
Incidental findings:
Next step:
```

Allowed result states: `PASS`, `PARTIAL`, `BLOCK`, `FAIL`,
`FINDINGS_ONLY`, `NO_CHANGES`.

For commit / push / PR / issue / task note / memory write, include enough detail
to audit the delivery:

* commit hash;
* branch;
* remote and push status;
* PR or issue identifier when applicable;
* validation status;
* memory location/type when applicable;
* whether release, deploy, cutover, production impact, paid action, force push,
  or tags occurred.

For `BLOCK`, include blocked reason, hard stop, evidence, safe actions
completed, unsafe action not performed, and options for Jenn.

Do not output secrets, private-state contents, raw memory, raw audit rows, raw
logs, provider payloads, bearer tokens, endpoint locators, or response bodies
unless exact scope explicitly permits the specific disclosure.

---

## 14. Project Fill-In Checklist

Filled for `codex-memory` on 2026-07-05 using repository evidence:

* project name: `codex-memory`;
* repository path: `/home/jenn/AGENTS_OS_Workspace/memory/codex-memory`;
* observed remote: `origin` -> `git@github.com:JENN2046/codex-memory.git`;
* stack: Node.js 22+, CommonJS, MCP server/runtime and CLI tools;
* package manager: `npm` with `package-lock.json`;
* setup command: `npm ci`;
* editable source/test/docs paths: `src/`, `tests/`, `docs/`,
  `.agent_board/`, `scripts/`, `schemas/`, `examples/`, `benchmarks/`;
* current public MCP tools: `audit_memory`, `memory_overview`,
  `record_memory`, `search_memory`, `supersede_memory`, `tombstone_memory`,
  `validate_memory`;
* validation commands: targeted `node --check`, targeted `node --test`,
  `npm test -- --summary`, `bash scripts/validate-local.sh docs`, current-facts
  drift, ledger consistency, and mainline gates as needed;
* protected branches: `main`, `master`, `production`, `release`;
* push policy: not authorized by default; exact Jenn authorization or an
  explicitly active safe-push policy with fresh passing evidence is required;
* CI behavior: `.github/workflows/ci.yml` runs on push to `main` and PR to
  `main`, with `npm ci`, `npm test`, profile dry-run/profile health/profile
  gate, and `v8-diagnose`;
* deployment triggers: none observed in checked workflow; external repository
  settings are unknown and treated as blocked until verified for exact remote
  delivery;
* release triggers: none authorized;
* secret-adjacent paths: `.env*`, `data/`, SQLite files, raw logs/jsonl,
  ignored `.colameta` state, `.omc/`, `.claude/`, `.tmp/`, local scratch and
  runtime state;
* docs paths: `README.md`, `STATUS.md`, `CURRENT_STATE.md`,
  `DOCS_GOVERNANCE.md`, `VALIDATION.md`, `docs/`, `.agent_board/`;
* project memory paths: `.agent_board/`, `docs/`, `docs/taskbooks/`,
  `docs/archive/`, status/current-state files, and safe `MEMORY.md` entries;
* blocked scripts/actions: persistent startup/watchdog install/ensure,
  confirm/apply migrations/profile rebuilds, provider smoke/benchmark outside
  exact scope, push to protected branches, tag, release, deploy;
* reporting conventions: use Section 13 structured report and preserve
  low-disclosure/no-readiness wording.

Unresolved `UNKNOWN` / `NEEDS JENN CONFIRMATION` fields:

* `UNKNOWN - no dedicated lint package script observed in package.json`.
* `UNKNOWN - no dedicated typecheck package script observed in package.json`.
* `UNKNOWN - no dedicated build package script observed in package.json`.
* `UNKNOWN - repository settings, branch protections, GitHub environments, and
  external integrations outside checked-in files are not verified by local file
  inspection; treat exact remote delivery as blocked until verified`.
* `NEEDS JENN CONFIRMATION - any push/PR/release/deploy/cutover/readiness
  action unless a current task explicitly authorizes it and all project/global
  safety checks pass`.

If repository reality changes, update this file with evidence and keep Jenn's
global hard stops intact.
