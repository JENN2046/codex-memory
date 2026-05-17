# CHECKPOINT.md - codex-memory

## Current Goal

P41-P45 Evidence-First Gate Spine.

## Current Area

P8 memory governance / P43 Recall-Migration Isolation Explicit-Input Helper.

## Current Status

- Last pushed baseline: `3e3f76d fix: harden local http and governance redaction` on `origin/main`.
- Local branch is ahead of `origin/main` by CM-0307 `408a92c`, CM-0308 `d1f48c2`, CM-0309 `cb7d1ef`, CM-0310 `251af9c`, CM-0311 `1ed25ad`, CM-0312 `6f7ade4`, post-P40 board sync `ba59537`, CM-0313 `08597d6`, CM-0314 `8895816`, and CM-0315 `169f5bc`.
- Latest pushed task chain: P35.1 fixture contract, P35 post-push board reconciliation, and P35 security hardening.
- Current task: CM-0316 / P43-T1 Recall-Migration Isolation Explicit-Input Helper.
- CM-0307 validation passed: `node --check tests\p36-scope-a5-boundary-contract-fixture.test.js`, targeted fixture test `12/12`, `npm test` `739/739`, `git diff --check`, docs validation, and boundary scan with only expected hard-stop policy wording.
- CM-0308 validation passed: `node --check tests\p36-task-risk-labels-contract-fixture.test.js`, targeted fixture test `11/11`, `npm test` `750/750`, `git diff --check`, docs validation, and boundary scan with only expected forbidden-claim / hard-stop policy wording.
- CM-0309 validation passed: `node --check tests\p37-policy-decision-envelope-fixture.test.js`, targeted fixture test `11/11`, `npm test` `761/761`, `git diff --check`, docs validation, and boundary scan with only expected forbidden-claim / isolation wording.
- CM-0310 validation passed: `node --check tests\p38-recall-isolation-fixture.test.js`, targeted fixture test `10/10`, `npm test` `771/771`, `git diff --check`, docs validation, and boundary scan with only expected forbidden-claim / isolation wording.
- CM-0311 validation passed: `node --check tests\p39-synthetic-migration-dry-run-fixture.test.js`, targeted fixture test `10/10`, `npm test` `781/781`, `git diff --check`, docs validation, and boundary scan with only expected forbidden-claim / hard-stop wording.
- CM-0312 validation passed: `node --check tests\p40-local-readiness-report-fixture.test.js`, targeted fixture test `9/9`, `npm test` `790/790`, `git diff --check`, docs validation, boundary scan with only expected forbidden-claim / hard-stop wording, and read-only Verifier scope review `PASS`.
- CM-0314 validation passed and is committed locally at `8895816`: `node --check tests\p41-evidence-manifest-contract-fixture.test.js`, targeted fixture test `12/12`, `npm test` `802/802`, `git diff --check`, docs validation, boundary scan with only expected P41 forbidden-claim / hard-stop / historical negative readiness wording, and read-only Verifier scope review `PASS`.
- CM-0315 validation passed: `node --check src\core\EvidenceManifestContract.js`, `node --check tests\evidence-manifest-contract-helper.test.js`, targeted helper/fixture tests `22/22`, `npm test` `812/812`, `git diff --check`, docs validation, and boundary scan with only expected hard-stop/history wording plus synthetic redaction-test strings.
- CM-0316 validation passed: `node --check src\core\RecallMigrationIsolationContract.js`, `node --check tests\recall-migration-isolation-helper.test.js`, targeted helper/P38/P39 fixture tests `30/30`, `npm test` `822/822`, `git diff --check`, docs validation, and boundary scan with only expected hard-stop/history wording plus synthetic redaction/static-boundary test strings.

## Active Boundaries

- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.
- v1.0 RC remains `NOT_READY_BLOCKED`.
- P41-P45 default mode is local, fixture-only, dry-run-only, and explicit-input-only unless a task explicitly states otherwise.
- Unknown, missing, ambiguous, or unparsable scope metadata fails closed.
- Unknown risk label is `A5-hard-stop`; critical skipped/unknown gate result fails.
- Governance records, validation transcripts, redaction samples, and policy decisions must not enter normal user recall namespaces.
- A5 actions remain blocked: push, tag, release, deploy, provider/model call, real memory content read/preview/export/import/scan, diary/SQLite/vector/candidate/recall-audit scan, SQLite migration apply, backup/restore, service/watchdog/startup install, Codex/Claude config switch, public MCP expansion, `.env`/secret edit, dependency change, durable memory/audit write, and production deploy.

## Context Compression

- The pre-compression full checkpoint was moved to `.agent_board/archive/CHECKPOINT_FULL_PRE_CM0301.md`.
- The pre-compression full root status/plan/backlog docs were moved to `docs/archive/*_FULL_PRE_CM0302.md`.
- P34.x closeout review was added at `docs/P34_GOVERNANCE_REVIEW_SURFACE_CLOSEOUT_REVIEW.md`.
- P35 policy gate planning is recorded at `docs/P35_GOVERNED_MEMORY_SPINE_POLICY_GATE_PLAN.md`.
- P36-T1 fixture/test/doc were added at `tests/fixtures/p36-scope-a5-boundary-contract-v1.json`, `tests/p36-scope-a5-boundary-contract-fixture.test.js`, and `docs/P36_SCOPE_A5_BOUNDARY_CONTRACT.md`.
- P36-T2 fixture/test/doc are being added at `tests/fixtures/p36-task-risk-labels-contract-v1.json`, `tests/p36-task-risk-labels-contract-fixture.test.js`, and `docs/P36_TASK_RISK_LABELS_CONTRACT.md`.
- P37-T1 fixture/test/doc are being added at `tests/fixtures/p37-policy-decision-envelope-v1.json`, `tests/p37-policy-decision-envelope-fixture.test.js`, and `docs/P37_POLICY_DECISION_ENVELOPE_FIXTURE_MATRIX.md`.
- P38 fixture/test/doc are being added at `tests/fixtures/p38-recall-isolation-v1.json`, `tests/p38-recall-isolation-fixture.test.js`, and `docs/P38_RECALL_ISOLATION_FIXTURES.md`.
- P39 fixture/test/doc are being added at `tests/fixtures/p39-synthetic-migration-dry-run-v1.json`, `tests/p39-synthetic-migration-dry-run-fixture.test.js`, and `docs/P39_SYNTHETIC_MIGRATION_DRY_RUN_CONTRACT.md`.
- P40 fixture/test/doc are being added at `tests/fixtures/p40-local-readiness-report-v1.json`, `tests/p40-local-readiness-report-fixture.test.js`, and `docs/P40_LOCAL_READINESS_REPORT.md`.
- Active `CHECKPOINT.md` is now a short current-state checkpoint.
- Detailed historical validation remains in `.agent_board/VALIDATION_LOG.md`.
- Detailed task ledger remains in `.agent_board/TASK_QUEUE.md`.
- Current operational state remains in `.agent_board/RUN_STATE.md` and `.agent_board/HANDOFF.md`.

## Next Safe Step

Finish CM-0316 diff/docs/boundary validation and guarded local commit if scoped. Push remains user-directed and not authorized.
