# Risk Register

## P0

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-client private leakage | Codex/Claude isolation failure | Fail-closed client_id/scope/visibility matrix; negative tests; audit receipts |
| Secret/token/config/private runtime access | Severe security breach | L4 hard stop; forbid `.env`, credentials, raw runtime; no provider/API unless exact-approved |
| Unbounded memory scan or raw private memory dump | Privacy and governance failure | Exact query budgets; max results; output projection; abort on budget overrun |
| Irreversible deletion or unapproved durable write | Data loss / trust loss | Proposal mode before write; tombstone over delete; exact write boundary; rollback receipt |
| Production/release/cutover overclaim | Operational risk | Dedicated readiness gate; docs lint; never treat fixture-only as live proof |

## P1

| Risk | Impact | Mitigation |
|---|---|---|
| README/roadmap drift keeps old parity route alive | Wrong execution path | M1/M2 first; legacy banners; new source-of-truth roadmap |
| VCPToolBox capability assumed from docs | False design | M3 inventory with evidence levels; M6/M7 exact-approved proofs |
| Over-manual approval model | AGENTS OS stalls | L0-L3 self-review/self-approval inside approved boundary |
| Over-broad autonomy | Memory governance failure | L4 hard stops; scope/client/visibility matrix; receipts |
| Local fallback becomes primary clone route | Strategy drift | fallback contract; mark fallback results; limit parity work to compatibility/test |

## P2

| Risk | Impact | Mitigation |
|---|---|---|
| Far phases become pseudo-precise | Planning debt | M9-M15 only entry/exit/risk until closer |
| Package metadata remains “standalone” | Messaging inconsistency | M2 navigation/metadata sync task |
| Validation matrix too large | Slow execution | Split fixture, dry-run, exact-live, and release gates |
| Dashboard leaks private data | Observability risk | Low-disclosure summaries only; no raw payloads |
| Old docs broken by renaming | Usability risk | Prefer banners and links before file movement |

## Top mitigations

1. Finish M0-M2 before live VCP work.
2. Use exact approval packets for every live phase.
3. Keep local fallback but remove it from primary north star.
4. Require receipts for every governed operation.
5. Treat current repository state as evidence, not aspiration.
