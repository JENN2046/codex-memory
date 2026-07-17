# ChatGPT Web R3 implementation matrix

This branch follows contract candidate package
`codex-memory-chatgpt-contract-freeze-candidate-r3-20260717` as a working
taskbook. The package integrity was verified locally (87/87 declared file
digests), but its own decision receipt remains `human_frozen: false`. Current
implementation work does not convert the candidate into a human-frozen
contract and does not authorize runtime stages.

Status vocabulary:

- `code_candidate`: implementation and deterministic synthetic tests exist.
- `partial`: some code/evidence exists, but task acceptance is incomplete.
- `not_started`: no current branch evidence.
- `runtime_gate`: requires the taskbook's separate runtime or Jenn gate.

## M0 — entry evidence

| Task | Status | Current evidence / gap |
|---|---|---|
| M0-T1 fresh snapshot | partial | Branch was merged normally with current `origin/main`; delivery commit and final validation are pending. |
| M0-T2 platform eligibility | runtime_gate | No Developer Mode, Tunnel, or platform receipt. |
| M0-T3 transport audit | code_candidate | UDS/HTTP conformance is synthetic only. |
| M0-T4 tool/profile audit | code_candidate | Frozen profile ceiling and default-surface regression tests exist. |
| M0-T5 VCP source audit | partial | Layered-source and facade contracts exist; no live VCP evidence. |
| M0-T6 ChatGPT data controls | runtime_gate | No real ChatGPT Data Controls or Memory receipt. |

## M1–M4 — repository implementation

| Tasks | Status | Current evidence / gap |
|---|---|---|
| M1-T1..T3 profile, channel, fixed scope | code_candidate | Default-off server-fixed profiles and override rejection tests. |
| M1-T4 cross-client isolation | partial | Synthetic context/override isolation only; no real private result canary. |
| M2-T1..T8 UDS, HTTP, schema, endpoint generation | code_candidate | Linux temporary UDS tests; no Tunnel or App. Secret/socket paths reject symlinks and non-owner/private modes. |
| M3-T1 probe | partial | Zero-touch service path exists, but MCP runtime binding remains default-off. |
| M3-T2/T3 receipts and injection telemetry | code_candidate | Low-disclosure synthetic receipt tests only. |
| M3-T4 advisory-only context | code_candidate | ChatGPT context assembler has no memory-derived recommendation field. |
| M3-T5 layered provenance | code_candidate | Five source dimensions, non-atomic window, and aggregate digest are explicit. |
| M3-T6 cross-App injection | code_candidate | Synthetic Gmail/Web/other-App fixtures prove zero tool/network/write counters. |
| M4-T1/T3 facade | code_candidate | Internal `GovernedReadFacade`; MCP reentry and strict-profile fallback are blocked. |
| M4-T2 v2 exposure gate | code_candidate | `prepare_memory_context` is exposed only when the composite gate is explicitly true; runtime binding remains unconditionally off. |

The current native bridge still recognizes only the existing Codex and Claude
runtime principals. The R3 `chatgpt_web` channel principal has not been admitted
to that bridge, and must not be added to the shared read/write client constant:
doing so would accidentally widen native-write eligibility. A later runtime
binding change needs a distinct read-only channel-principal contract plus
project/workspace-only enforcement. Until that exists, runtime invocation stays
unconditionally blocked.

## M5–M8 — runtime, canary, operations, stable use

All M5, M6, M7, and M8 tasks remain `runtime_gate` or `not_started`:

- no Tunnel client or supply-chain receipt;
- no Secure MCP Tunnel or ChatGPT App;
- no local activated UDS service proof;
- no ChatGPT E2E nonce proof;
- no real or synthetic VCP canary through ChatGPT;
- no 404, key rotation, blue-green, upgrade, or rollback drill;
- no observation period or stable-use decision.

## Non-claims

```yaml
runtime_bound: false
tunnel_created: false
chatgpt_app_connected: false
real_memory_read: false
provider_call_performed: false
public_default_mcp_schema_expanded: false
production_ready: false
release_ready: false
cutover_ready: false
```
