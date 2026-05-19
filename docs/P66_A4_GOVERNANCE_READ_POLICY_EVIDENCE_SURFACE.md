# P66 A4 Governance Read-Policy Evidence Surface

Date: 2026-05-19

Decision: `A4_IMPLEMENTED_READY_FOR_A5_RERUN_REQUEST`

## Purpose

The prior A5-GAP-1 read-only governance report produced nominal governance counts, but the read-policy portion was reported as:

```yaml
readPolicy.status: unavailable
readPolicy.source: config-only
```

That wording was too coarse. It mixed two different facts:

- config evidence was available and safely readable
- no recent read-policy audit sample was present in the tail window

This A4 slice makes that distinction explicit without running a fresh real governance report, scanning memory, mutating runtime state, or claiming readiness.

## Implementation

Updated [src/cli/governance-report.js](/A:/codex-memory/src/cli/governance-report.js):

- `buildReadPolicySurface()` now reports `status=config_only_no_recent_audit` when config evidence is present but no recent read-policy audit entry is available.
- `source` now distinguishes `config-only-no-recent-audit` from `config-and-recent-recall-audit`.
- Added explicit booleans:
  - `configEvidenceAvailable`
  - `auditEvidenceAvailable`
  - `readPolicyConfigured`

Updated [tests/governance-report-cli.test.js](/A:/codex-memory/tests/governance-report-cli.test.js):

- locks the config-only/no-recent-audit case
- locks the recent read-policy audit evidence case
- keeps `rawWorkspaceIdExposed=false`
- keeps no-provider/no-mutation/no-migration behavior

## Boundary

This was an A4 local implementation and test update only.

It did not run `npm run governance:report -- --json` against the real local database, scan or preview real memory content, write durable memory, write durable audit, call providers, expand public MCP tools, change config/watchdog/startup, apply migration/import/export/backup/restore, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Validation

```text
node --check src\cli\governance-report.js
node --check tests\governance-report-cli.test.js
node --test tests\governance-report-cli.test.js
node --test tests\governance-report-cli.test.js tests\dashboard-cli.test.js tests\http-observe-cli.test.js tests\admin-review-schema-snapshot-gate.test.js
npm test
scripts\validate-local.ps1 -Area docs
git diff --check
```

Observed result:

```yaml
governanceReportCliTests: 4/4
observabilitySurfaceTests: 15/15
npmTest: 1574/1574
docsValidation: passed
diffCheck: passed
```

## Next A5 Rerun Request

After this A4 slice is committed, the next safe A5 step is a fresh A5-GAP-1 rerun limited to the read-only governance report:

```text
I approve A5-GAP-1 for codex-memory on branch main at commit <NEW_HEAD>, limited to p66-a5-gap1-governance-read-policy-readonly sanitized report, with durable write no, running read-only governance report only.
```

That rerun should verify whether the real current `governance:report` output now distinguishes config evidence from missing recent audit evidence. It still must not claim production governance readiness unless complete read-policy evidence is present and explicitly evaluated.
