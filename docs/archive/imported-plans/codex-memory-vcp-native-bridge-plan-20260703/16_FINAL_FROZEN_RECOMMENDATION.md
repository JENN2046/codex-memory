# Final Frozen Recommendation

## Recommended next phase

Proceed with M0-M2 only:

```yaml
next_phase:
  - M0 Reality Calibration
  - M1 Strategy Pivot Alignment
  - M2 Documentation Source-of-Truth Synchronization
```

M3 should be prepared after M0-M2, but live VCP proof should not start yet.

## First three executable tasks

1. `M0-T1 Repository Fresh Reality Snapshot`
2. `M1-T1 Strategy Pivot Decision Record`
3. `M2-T1 README Positioning Synchronization` and `M2-T2 STATUS CURRENT_STATE TASK_QUEUE Synchronization` as a coordinated docs/state sync pair

If only exactly three task prompts may be queued, use:

```yaml
first_three:
  - M0-T1 Repository Fresh Reality Snapshot
  - M1-T1 Strategy Pivot Decision Record
  - M2-T2 STATUS CURRENT_STATE TASK_QUEUE Synchronization
```

and execute README sync immediately after those, because README drift is public-facing.

## Hard stops

```yaml
hard_stops:
  - secret/token/credential/cookie/.env access
  - raw private runtime read
  - raw private memory read
  - unbounded memory scan
  - cross-client private leakage
  - irreversible deletion
  - runtime config/service/startup mutation
  - live provider/API call
  - unapproved live VCP call
  - new runtime target without approval
  - scope/client_id/visibility expansion without approval
  - public MCP expansion without approval
  - PR/push/tag/release/deploy/cutover
  - production/release/cutover readiness claim
```

## Expected outcome

After the first batch:

```yaml
expected_after_first_batch:
  - actual repo state is freshly evidenced
  - current task/validation drift is resolved or explicitly documented
  - README no longer contradicts VCP-native-first strategy
  - old VCP parity route is no longer primary
  - new bridge roadmap can be used for M3-M8 planning
  - live VCP proof remains deferred until exact approval
```
