# ChatGPT Edge Data Response v2

Status: source hard cut complete; stopped runtime rebind pending

Task: `CM-2159 / governed_read_attempt_refactor`

This is the fourth ordered CM-2159 delivery. It changes only the ChatGPT Edge
data-tool request/response contract and its governed-read transport. The six
tool names, five data-tool input schemas, widget tool, canonical Codex
five-tool surface, and repository nine-tool surface remain unchanged.

The source contract versions are:

```yaml
data_response_schema: 2
edge_request_envelope_schema: 2
edge_response_envelope_schema: 2
governed_read_attempt_protocol: governed_read_attempt.v1
legacy_v1_request_or_response_accepted: false
```

This is a hard cut, not a dual-read migration. Request and response envelope
v1 are rejected before signature-dependent business processing. A legacy
data response without `schema_version: 2` is also rejected. Internal
Governance-to-Relay invocation content remains transport-private and is
validated separately; it is not an active public v1 response path.

## Resolve remains context setup

`resolve_memory_context` does not create an attempt. Its successful or
low-disclosure denied/unavailable result adds only:

```yaml
schema_version: 2
```

The existing context result fields remain unchanged. An `attempt` field on a
resolve result is rejected.

## Every read has one attempt

Each accepted `memory_overview`, `search_memory`, `audit_memory`, or
`prepare_memory_context` request creates exactly one
`governed_read_attempt.v1` identity at the transient Edge broker. The public
result preserves the existing tool-specific fields and adds:

```yaml
schema_version: 2
attempt:
  protocol: governed_read_attempt.v1
  attempt_ref: grat_...
  outcome: success | failure
  last_completed_stage: STAGE | null
  failed_stage: STAGE | null
  reason_code: safe_code | null
  failure_category: safe_category | null
  evidence_complete: true | false
  counters:
    provider: { started, succeeded, failed }
    native_invocation: { started, succeeded, failed }
    primary_memory: { write_attempts, writes_committed }
    derived_transaction: { started, committed, rolled_back }
    fallback: { attempts }
```

Counter fields are non-negative integers or `null`. Known partial evidence
must remain compatible with a canonical complete tuple; unknown evidence is
never replaced with zero. Complete success requires complete counters,
provider/native reconciliation, zero primary writes, and zero fallback.

The signed response envelope's legacy flat counters are a compatibility
projection of this same terminal evidence. For governed reads they may contain
`null` and must match the public attempt projection exactly. They are not an
independent source of facts.

## Terminal and failure semantics

The Edge transient broker is the sole terminal CAS coordinator. Downstream
components submit one hash-bound candidate; timeout, cancellation, and valid
completion compete under first-terminal-wins. A late completion cannot replace
the accepted terminal.

After an attempt exists, business denial, downstream failure, timeout, and
cancellation return a normal MCP tool result with `isError: true`,
`schema_version: 2`, and the canonical low-disclosure attempt projection.
OAuth failure, malformed MCP input, invalid envelope bootstrap, and other
pre-attempt protocol failures remain protocol exceptions.

The public result and terminal must agree:

- terminal success requires response status `ok`;
- `governance_denied` requires `denied`;
- every other canonical attempt failure requires `unavailable`.

Reason, category, failed stage, origin, fallback policy, and unknown-evidence
rules come only from the attempt-v1 failure registry. Edge, Relay, Observer,
and MCP projection code do not maintain duplicate attempt failure allowlists.

## Controller binding

The schema-v6 controller source manifest remains schema `1` but now includes
the full `apps/chatgpt-edge` runtime root in addition to Relay, contracts,
scripts, and core runtime source. Low-disclosure controller status reports:

```yaml
edge:
  dataResponseSchemaVersion: 2
  requestEnvelopeSchemaVersion: 2
  responseEnvelopeSchemaVersion: 2
  governedReadAttemptProtocol: governed_read_attempt.v1
  legacyV1Accepted: false
```

The managed Shim uses one controller-owned PID for its existing native-MCP
listener and a separate fixed loopback governed-attempt listener. Acceptance
requires that exact PID to own both listeners. The attempt listener is bound
to the existing Governance runtime identity, uses the production two-pass
source projection and lease worker, and adds no signing secret. Governance
loads the v2 attempt runtime and no longer retains the prior application read
path as an active v1 compatibility route.

The persistent Shim also owns a fresh, per-attempt provider helper process.
That helper receives provider authority only over its exact IPC handle, calls
the pinned VCP embedding singleton once, inherits no provider/Edge secret
environment, and exposes no stdout/stderr. Timeout or cancellation sends
`SIGTERM` only to the exact helper and waits for proven exit before native
admission is reusable. The separate derived-store lease child remains
provider-authority-free.

These source changes do not rebind or start the held-stopped schema-v6 stack.
After all four CM-2159 PRs are merged and merged-main CI succeeds, a separate
current authorization is still required for stopped-state `rebind-source`.

## Non-claims

This delivery does not:

- call a provider or memory tool;
- read private configuration, raw logs, raw memory, or provider output;
- change VCPToolBox core or dependencies;
- add a public tool, rename a tool, or change an input schema;
- rebind, start, deploy, release, or publish a runtime;
- authorize R5-O `_005` or merge;
- establish R5-O acceptance, production readiness, or `RC_READY`.
