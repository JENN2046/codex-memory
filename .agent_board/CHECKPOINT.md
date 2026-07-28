# CHECKPOINT.md - codex-memory

> Non-authoritative checkpoint pointer. Current authority is
> `CURRENT_STATE.md`.

## CM-2159 Controller Source Manifest Binding

Status: `IN_PROGRESS`

- Current lane: source/test/docs only
- Goal: replace schema-v5 whole-HEAD equality with manifest-v1 runtime identity
- New owner profile target: schema v6
- Historical compatibility: schema v4/v5 status and controlled stop
- Last completed receipt remains: `CM-2158 / CMV-2243`
- Runtime transition: not authorized in this phase
- Accepted product baseline: PR `#61`

The implementation must preserve clean-current-main, repository ancestry, VCP,
provider, Edge, non-secret configuration, owner credential freshness,
write-free runtime, rollback, and low-disclosure gates. An implementation PR
does not itself prove current runtime health.

## CM-2158 V5 Full-Stack Controller Transition Closeout

Status: `COMPLETED_VALIDATED`

- Validation: `CMV-2243`
- Active task after closeout: `null`
- Active queue after closeout: empty
- Controller delivery: PR `#65`, merge `48ecfe1c…`
- Transition: exact-authorized stop, start, adopt-running replacement, status
- Profile boundary: schema v5, owner-only, reference-only
- Runtime evidence: accepted at closeout for four controller-managed processes
- Evidence boundary: point-in-time low-disclosure result, not current live health
- Accepted product baseline: PR `#61`
- Reviewed product head: `4680b4c1…`
- Product merge baseline: `ef62d481…`
- Accepted main CI run: `30238902177`
- Historical baseline: `ef62d481…`

The transition used the exact merged controller baseline. Its first start
correctly failed closed for the profile upgrade while accepting the
transitional runtime, then `adopt-running --replace` stored one owner-only
reference-only schema-v5 profile and the final inspection accepted the bound
stack. No PID, socket, secret reference, raw log, provider response, or raw
memory is committed. No `record_memory`, real configuration edit,
migration/import/export/rebuild, public MCP expansion, release, deploy, or
readiness claim occurred.

## Stop State

Continue the source-only `CM-2159` implementation and PR follow-through.
Runtime `status`, lifecycle conversion, profile replacement, and R5-O remain
separate current-authorization boundaries.

History and recovery commands:
`docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
