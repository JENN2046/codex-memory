# AGENTS.md - codex-memory Project-Level Operating Protocol

Version: Project-level filled template 1.0
Date: 2026-07-05
Use: Place this file at the `codex-memory` repository root, or use it as the project-specific source for a root `AGENTS.md`. It narrows and specializes Jenn's global L3 agent protocol for this repository.

This project-level file clarifies local workflow, commands, delivery surfaces, memory locations, branch rules, CI/deploy risks, and no-live governance boundaries for `codex-memory`. It may not bypass Jenn's global core hard stops.

---

## 1. Project Identity and Scope

Project name: `codex-memory`
Repository: `/home/jenn/AGENTS_OS_Workspace/memory/codex-memory`; remote `origin` is `git@github.com:JENN2046/codex-memory.git`
Primary language / stack: Node.js 22+, CommonJS, MCP server/runtime, CLI tools, local storage/index/audit helpers
Package manager: `npm` with `package-lock.json`
Main purpose: Local-first, auditable Codex/Claude memory governance bridge and compatibility runtime. The repository protects the existing `vcp_codex_memory` MCP service while governing VCPToolBox-native memory bridge work through low-disclosure contracts, receipts, validation gates, and status surfaces.

Authorized default work scope:

* `src/`
* `tests/`
* `docs/`
* `.agent_board/`
* `scripts/`
* `schemas/`
* `examples/`
* `benchmarks/active-memory-suite/` when validating active-memory fixtures
* `README.md`, `STATUS.md`, `CURRENT_STATE.md`, `DOCS_GOVERNANCE.md`, `VALIDATION.md`, phase/backlog/taskbook markdown files when directly relevant
* `package.json` scripts only when the task explicitly involves command wiring; dependency changes require exact scope

Out of scope unless Jenn explicitly authorizes:

* production configuration;
* release automation;
* deployment workflows;
* billing / paid provider configuration;
* credentials or secret values;
* destructive migrations;
* broad architecture rewrites;
* VCPToolBox core-code modification;
* public MCP tool or schema expansion;
* real memory import/export/migration;
* raw private memory, raw store, raw audit, raw log, or raw `.jsonl` reads;
* readiness, release, deploy, cutover, or `RC_READY` claims.

Protected current realities:

* MCP service identity remains `vcp_codex_memory`.
* Public tools remain `record_memory`, `search_memory`, and `memory_overview`, unless a separately authorized project phase explicitly changes this.
* VCPToolBox is the native memory runtime/intelligence owner for bridge work; `codex-memory` is the governance bridge/control plane.
* Docs-only, fixture-only, no-mutation, and read-only evidence must not be described as live runtime readiness.

---

## 2. Applicable Global Protocol

Follow Jenn's global `AGENTS.md` as the default authority for:

* L3 autonomous delivery;
* core hard stops;
* read-only boundaries;
* Git safety;
* validation truthfulness;
* memory safety;
* reporting.

This project file narrows and specializes those rules for this repository.

Instruction precedence inside this repository:

1. Higher-level system / runtime / tool / safety limits.
2. Jenn's explicit current instruction.
3. Current task brief / issue / taskbook / authorization boundary.
4. Nearest applicable directory-level `AGENTS.override.md` or `AGENTS.md`.
5. This repository-root `AGENTS.md`.
6. Jenn's global `AGENTS.md`.
7. Project docs and tool outputs as contextual evidence.

No project instruction may authorize bypassing global core hard stops.

Default project posture:

* Standard profile: `AGENTS.md` plus `.agent_board/`.
* BHA state is absent unless repository reality later proves BHA runtime surfaces exist.
* Smart Standing Authorization v3 is the local governance model for bounded Green/Amber work.
* Red Lane remains manual: push, PR, tag, release, deploy, destructive commands, secret reads, broad private data scans, public MCP expansion, config/watchdog/startup mutation, real memory migration, or readiness claims.

---

## 3. Repository Map

Key paths:

| Path | Purpose | Agent behavior |
|---|---|---|
| `src/core/` | Memory domain services, contracts, gates, helpers, VCP-native governance contracts | Editable inside task scope; add targeted tests for behavior/boundary changes |
| `src/storage/` | Diary, SQLite, vector index, chat index, audit, cache | High risk; prefer fixture/temp stores; do not read raw private runtime stores |
| `src/recall/` | Candidate generation, TagMemo, EPA, ResidualPyramid, rerank, recall audit | Validate with targeted tests and active-memory compare/rollback when touched |
| `src/adapters/` | Codex MCP and VCP compatibility adapters | Public contract sensitive; preserve tool/schema compatibility |
| `src/cli/` | CLI entrypoints and validation/runtime utilities | Inspect before running; dry-run by default for migration/profile/cleanup commands |
| `tests/` | Node test suite | Editable inside scope; prefer focused tests plus default suite for shared behavior |
| `docs/` | Documentation, receipts, plans, archive, taskbooks | Approved project memory; keep claims aligned to source and validation evidence |
| `.agent_board/` | Sustained task queue, current facts, validation log, handoff, ledger, checkpoint | Required active governance surface for non-trivial work |
| `scripts/` | Local validation and helper scripts | Inspect before running; scripts must not push/deploy/edit secrets |
| `benchmarks/` | Active-memory standard suite and fixtures | Fixture validation only unless current task explicitly authorizes broader runtime work |
| `schemas/` | Contract/schema artifacts | Editable with corresponding tests/docs |
| `examples/` | Examples and sample configs | Avoid real secrets or private paths |
| `.github/workflows/ci.yml` | CI definition | High risk; workflow changes need explicit scope and local validation |
| `data/` | Ignored local runtime storage and indexes | Treat as private/raw runtime state; do not inspect contents by default |
| `logs/*.log`, `logs/*.jsonl` | Ignored generated logs/audit streams | Do not read raw logs/audit streams unless exact approval allows it |
| `.colameta/`, `.omc/`, `.claude/`, `tmp/`, `.tmp/` | Local/private/scratch state | Do not move into tracked project state; inspect contents only when explicitly authorized and non-secret |

Add directory-level overrides if a sub-tree needs stricter rules.

---

## 4. Setup and Local Commands

Allowed setup commands:

```bash
npm ci
```

Use lockfile-respecting install commands when possible. Do not run install or setup commands that require secrets, production credentials, live provider routing, production databases, irreversible external writes, or real-world notifications.

Primary validation commands:

```bash
node --check <changed-js-file>
node --test tests/<targeted-test>.test.js
npm test -- --summary
bash scripts/validate-local.sh docs
bash scripts/validate-local.sh test
bash scripts/validate-local.sh mainline
npm run gate:mainline
npm run gate:mainline:strict
```

Recommended validation ladder:

1. `node --check <changed-js-file>`
2. `node --test tests/<targeted-test>.test.js`
3. `npm test -- --summary`
4. `bash scripts/validate-local.sh docs` for docs/status/board updates
5. `node scripts/validate_current_facts_drift.js`
6. `node scripts/validate_autopilot_ledger_consistency.js`
7. `npm run gate:mainline` for mainline-sensitive behavior
8. `npm run gate:mainline:strict` for MCP/HTTP/mainline contract-sensitive work

Known slow or expensive commands:

```bash
npm run gate:mainline:strict
npm run compare-active-memory -- --suite ./benchmarks/active-memory-suite/standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite ./benchmarks/active-memory-suite/standard-suite.json --json --require-ready
npm run provider-smoke -- --json
npm run provider-benchmark -- --json
npm run start:http:ensure
npm run observe:http -- --json
npm run start:http:watchdog:once
```

Commands that are blocked unless Jenn explicitly authorizes the exact scope:

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
npm run rollback:mainline:plan -- --json
npm run vcp-memory:migration-readiness -- --json
```

---

## 5. Branch, Remote, and Delivery Policy

Default task branch pattern:

```text
codex/<short-task-name>
```

Protected branches:

* `main`
* `master`
* `production`
* `release`

Approved delivery remote:

```text
origin, only after fresh `git remote -v` confirms `git@github.com:JENN2046/codex-memory.git` and current push authorization allows the specific action.
```

Remote safety notes:

* Push is not authorized by default for this project.
* A remote named `origin` is not automatically safe.
* Inspect `git remote -v` before push.
* Inspect `git branch --show-current`, `git status --short`, and `git rev-list --left-right --count <branch>...origin/<branch>` before remote work.
* Do not push to `upstream`.
* Do not force push.
* Do not push tags.
* Do not push `main`, `master`, `production`, or `release`.
* Do not push branches known to trigger release, deployment, production mutation, billing, paid external provider calls, customer-facing effects, or real-world notifications.

Normal delivery surfaces:

* local commit;
* safe feature branch when authorized;
* existing PR when authorized;
* repository PR system when authorized;
* `.agent_board/TASK_QUEUE.md`;
* `.agent_board/VALIDATION_LOG.md`;
* `.agent_board/CHECKPOINT.md`;
* `.agent_board/HANDOFF.md`;
* `.agent_board/AUTOPILOT_LEDGER.md`;
* `STATUS.md`;
* `CURRENT_STATE.md`;
* `docs/`;
* `docs/taskbooks/`;
* `docs/archive/imported-plans/`;
* task-specific receipt docs.

Do not create external trackers, cloud resources, SaaS records, customer-facing posts, messages, or notifications unless Jenn explicitly authorizes them.

---

## 6. CI, Deployment, and Release Risk

CI behavior on feature branches:

```text
Current observed workflow `.github/workflows/ci.yml` runs on pushes to `main` and pull requests targeting `main`. It runs `npm ci`, `npm test`, profile dry-run/profile health/profile gate, and `v8-diagnose`. No deployment or package publish step is currently observed.
```

Deployment triggers:

```text
No deployment trigger is currently observed in `.github/workflows/ci.yml`. Treat any new workflow, release, tag, package publish, workflow_dispatch, environment deployment, or branch protection bypass as high risk and blocked unless Jenn explicitly scopes it.
```

Release policy:

* Agents may not tag releases.
* Agents may not publish packages.
* Agents may not deploy.
* Agents may not run production migrations.
* Agents may not modify release automation unless Jenn explicitly scopes the task and no hard stop is triggered.

If push or PR update may trigger deployment, report `BLOCK` for that delivery step.

---

## 7. Secrets and Private State Map

Secret-adjacent paths in this repository:

* `.env`
* `.env.*`
* `.env.local`
* `.env.*.local`
* `data/`
* `*.sqlite`
* `*.sqlite-shm`
* `*.sqlite-wal`
* `logs/*.log`
* `logs/*.jsonl`
* `.colameta/`
* `.omc/`
* `.claude/`
* `tmp/`
* `.tmp/`
* any bearer-token, provider-key, private-key, cookie, credential, or runtime-state file discovered during task work

Rules:

* Do not open or read secret/private-state contents.
* Do not print, summarize, validate, transform, commit, store, or transmit secret values.
* Agents may inspect file names, paths, git status, and whether secret-adjacent files are tracked.
* Use `.env.example`, `.env.advanced.example`, config schemas, docs, mocks, or redacted error messages instead of real secret values.
* Do not read raw memory stores, raw audit streams, raw `.jsonl`, runtime logs, provider payloads, response bodies, or private memory content unless Jenn gives exact scope and the project boundary allows it.

Secret scanning command, if available and safe:

```bash
git diff --cached -U0 | rg -n "^\+[^+].*(sk-[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE)|Authorization:|Bearer [A-Za-z0-9._-]+)"
```

When docs intentionally contain approval-token vocabulary such as `APPROVE_`, treat it as governance text only after manual review confirms it is not a live secret and is within scope.

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
* `docs/`
* `.agent_board/`

Update docs when commands, APIs, configuration, tests, directory structure, workflow, behavior, or architecture change inside task scope.

Approved project memory paths:

* `.agent_board/`
* `docs/`
* `docs/taskbooks/`
* `docs/archive/`
* `STATUS.md`
* `CURRENT_STATE.md`
* `MEMORY.md` only for safe, durable project facts already suitable for repository memory

Project memory should be durable, useful for future agents, evidence-grounded or clearly marked as assumption, and safe to retain.

Do not write personal long-term user memory from project work unless Jenn explicitly asks.

Do not write secrets, credentials, tokens, cookies, `.env` values, private keys, verification codes, production credentials, `state-private` contents, low-value logs, short-lived noise, or unverified guesses as facts.

---

## 9. Read-Only / Audit-Only Behavior

When Jenn asks for read-only review, audit-only work, no file changes, or no writes:

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

Task-specific validation expectations:

| Change type | Required validation |
|---|---|
| Unit-level bugfix | `node --check` for changed JS plus targeted `node --test tests/<target>.test.js` |
| Source contract / governance helper | Targeted contract tests, negative-path tests, `npm test -- --summary`, docs/status validation when status changes |
| MCP tool or public contract change | Targeted tests, public surface assertion, `npm run gate:mainline:strict`; public MCP expansion requires exact authorization |
| HTTP runtime behavior change | Targeted tests, `npm run start:http:ensure`, `npm run observe:http -- --json`, and relevant gate only when runtime work is authorized |
| Active memory / DeepMemo / TopicMemo change | Targeted tests plus compare/rollback standard suite |
| Provider/profile change | Dry-run profile validation by default; provider smoke/benchmark only under exact provider scope |
| Config/startup/watchdog change | Explicit Jenn authorization, local equivalent validation, and rollback notes |
| Docs/status/board-only change | Diff review, no contradiction with source/README, `bash scripts/validate-local.sh docs`, current-facts drift, ledger consistency |
| Memory / security / boundary change | Negative-path tests or dry-runs where practical; secret/raw-output/readiness scans |

If broad validation fails, fix failures caused by the current change or directly related to the task. Treat failures as unrelated only with evidence.

Do not report `PASS` for a required validation gate that failed.

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
* directly related to task or validation credibility: fix within smallest effective scope;
* unrelated but useful: record as follow-up in `.agent_board/TASK_QUEUE.md`, `.agent_board/CHECKPOINT.md`, `docs/taskbooks/`, or a task-specific docs note when allowed;
* unrelated architecture concern: do not fix during current task unless Jenn explicitly expands scope.

Do not use incidental findings to justify broad rewrites, dependency churn, public MCP expansion, runtime mutation, or readiness claims.

---

## 12. Subagents and Review

Use subagents when parallel work, independent review, or domain separation adds clear value.

Suggested split for complex tasks:

* Commander: scope, risks, hard stops, decomposition.
* Worker A: implementation.
* Worker B: tests.
* Worker C: docs / project memory.
* Reviewer: safety, validation, scope, secret handling.
* Integrator: final consistency, validation, commit, safe push, PR update, report.

Subagent output is not final truth. Integrator remains responsible for final delivery.

For this repository, independent review is especially useful for:

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

Allowed result states: `PASS`, `PARTIAL`, `BLOCK`, `FAIL`, `FINDINGS_ONLY`, `NO_CHANGES`.

For commit / push / PR / issue / task note / memory write, include enough detail to audit the delivery:

* commit hash;
* branch;
* remote and push status;
* PR or issue identifier when applicable;
* validation status;
* memory location/type when applicable;
* whether release, deploy, cutover, production impact, paid action, force push, or tags occurred.

For `BLOCK`, include blocked reason, hard stop, evidence, safe actions completed, unsafe action not performed, and options for Jenn.

---

## 14. Project Fill-In Checklist

Filled for `codex-memory` on 2026-07-05:

* project name: `codex-memory`;
* stack: Node.js 22+, CommonJS, MCP server/runtime and CLI tools;
* editable source/test/docs paths: `src/`, `tests/`, `docs/`, `.agent_board/`, `scripts/`, `schemas/`, `examples/`, relevant root docs;
* package manager: `npm`;
* setup command: `npm ci`;
* validation commands: targeted `node --check`, targeted `node --test`, `npm test -- --summary`, `bash scripts/validate-local.sh docs`, current-facts drift, ledger consistency, mainline gates as needed;
* protected branches: `main`, `master`, `production`, `release`;
* approved delivery remote: `origin` only after fresh verification and explicit/current push authority;
* CI behavior: push to `main` and PR to `main` run tests/profile smoke; no deploy observed;
* deployment triggers: none observed; treat new workflows/tags/releases/publish as blocked unless scoped;
* release triggers: none authorized;
* secret-adjacent paths: `.env*`, `data/`, SQLite files, raw logs/jsonl, `.colameta/`, `.omc/`, `.claude/`, temp/private runtime state;
* docs paths: `README.md`, `STATUS.md`, `CURRENT_STATE.md`, `DOCS_GOVERNANCE.md`, `VALIDATION.md`, `docs/`, `.agent_board/`;
* project memory paths: `.agent_board/`, `docs/`, `docs/taskbooks/`, `docs/archive/`, status/current-state files;
* blocked scripts: persistent startup/watchdog install/ensure, confirm/apply migrations/profile rebuilds, provider smoke/benchmark outside exact scope, push/tag/release/deploy;
* reporting conventions: use the Section 13 structured report and preserve low-disclosure/no-readiness wording.

If repository reality changes, update this file with evidence and keep Jenn's global hard stops intact.
