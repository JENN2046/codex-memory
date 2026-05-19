# P66 A4 Strict Gate Test Failure Repair

Status: `COMPLETED_VALIDATED`

Date: 2026-05-19

## Scope

This local A4 repair diagnoses and fixes the four test failures observed in the fresh `A5-GAP-5` strict gate run recorded in [P66_A5_GAP_5_FRESH_STRICT_GATE_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_5_FRESH_STRICT_GATE_EVIDENCE.md).

It does not rerun `npm run gate:mainline:strict`. A fresh A5-GAP-5 rerun still requires a new exact approval line bound to the post-repair commit.

## Diagnosis

The strict gate failed in the `npm test` step with four failures:

- `tests/lifecycle-read-policy-runtime.test.js`: two assertions still expected terminal lifecycle records to remain visible through default `search_memory`.
- `tests/policy-read-preflight.test.js`: two preflight assertions still expected tombstoned/rejected records to appear before the hypothetical soft read policy was applied.

The runtime behavior had changed intentionally in the prior A4 recall isolation/classification layer:

- `rejected`, `superseded`, and `tombstoned` records are isolated before normal recall/read aggregation.
- `proposal` records remain visible until the lifecycle soft read policy is enabled.
- Cross-client private records remain a future soft read policy concern in these preflight tests.

The production behavior was preserved. The stale test expectations were updated to match the explicit recall isolation contract.

## Changed Files

- [lifecycle-read-policy-runtime.test.js](/A:/codex-memory/tests/lifecycle-read-policy-runtime.test.js)
- [policy-read-preflight.test.js](/A:/codex-memory/tests/policy-read-preflight.test.js)

## Validation

- `node --test tests\lifecycle-read-policy-runtime.test.js` -> `6/6` pass
- `node --test tests\policy-read-preflight.test.js` -> `5/5` pass
- `npm test` -> `1573/1573` pass
- `git diff --check` -> pass

## Boundaries

No fresh `A5-GAP-5` rerun was executed in this A4 repair. No provider call, real memory scan, durable write, public MCP expansion, config/watchdog/startup change, migration/import/export/backup/restore apply, remote write, tag, release, deploy, cutover, or `RC_READY` claim occurred.

## Fresh Approval Needed

Use the post-repair commit hash:

```text
I approve A5-GAP-5 for codex-memory on branch main at commit <POST_REPAIR_COMMIT>, running cutover-context strict gate only, no remote write.
```
