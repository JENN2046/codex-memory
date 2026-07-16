# Phase 1 Acceptance Gate Evidence Report

Task: `CM-2018 Phase 1 acceptance gate evidence`
Validation: `CMV-2119`
Date: 2026-07-10

## Result

`PASS`: CM-2018 supplies current local evidence for the Phase 1 command gates
listed in `docs/near-model-memory-plan-pack/04_PHASE_PLAN.md` and
`docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md`.

This closes the current `test:all` and `gate:ci` evidence gap identified by
CM-2017. It does not close the full plan pack.

## Commands

Executed from the repository root:

```bash
npm run test:all
npm run gate:ci -- --json
```

## Evidence Summary

`npm run test:all`:

```text
exit=0
npm_test=4658/4658 passed
test_hardening_primary=94/94 passed
test_hardening_gate_ci_override=6/6 passed
```

`npm run gate:ci -- --json`:

```text
exit=0
summary.ok=true
mode=ci
fixtureOnly=true
noNetwork=true
noDaemon=true
noProvider=true
providerGateForcedOff=true
unsafeEnvOverrideDetected=false
failedChecks=0
compare=43/43 matched
rollback=43/43 rollback-ready
queries=14/14 query assertions passed
fixtureRecallDryRun=14/14 passed
policyPreflight=4/9 records remain under soft read policy
lifecyclePolicy=default off, 2/6 statuses included, 4 lifecycle-hidden
ciSafeTests=4658/4658 passed
docs=57 scripts, all targets exist
```

## Phase 1 Mapping

| Phase 1 requirement | Current evidence |
|---|---|
| hardened explicit public tools bypass regression | Covered by hardening/default tests and prior CM-2008/CM-2016 surface assertions |
| AtomicFileWriter stale lock cleanup TOCTOU regression | Covered by default test output including stale lock cleanup subtests |
| regression tests | `npm run test:all` passed |
| `npm run test:all` | passed in CM-2018 |
| `npm run gate:ci -- --json` | passed in CM-2018 |

## Boundaries

CM-2018 did not perform:

```text
providerApiCalled=false
vcpToolBoxRuntimeCalled=false
nativeWriteExecuted=false
durableMutationPerformed=false
realMemoryRead=false
rawPrivateStateRead=false
publicMcpExpanded=false
tagCreated=false
tagPushed=false
releasePublished=false
deploymentTriggered=false
cutoverPerformed=false
readinessClaimed=false
fullPlanPackCompleted=false
```

## Remaining Plan-Pack Gaps

The full plan pack remains incomplete. Remaining high-level evidence categories
include:

- Phase 2 current native read proof / target binding / WSL and Windows smoke.
- Phase 8 native side-effect receipt, real-root durable write proof,
  `verify_write`, rollback drill proof, and failure recovery proof.
- Phase 9 observation window or equivalent dogfood review plus external review.
- Phase 10 external review and tag approval packet completion.

No production, release, deploy, cutover, RC, or full plan-pack readiness follows
from this Phase 1 evidence.
