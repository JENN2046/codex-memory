# Key Task Drafts for M4-M8

These are intentionally less detailed than M0-M3 to avoid pseudo-precision before repository reality, strategy, and capability inventory are aligned.

## M4-K1 — VCP Invocation Contract Spec

```yaml
task:
  id: M4-K1
  title: VCP Invocation Contract Spec
  mode: contract design
  risk_level: L2
  objective: define request, response, error, receipt, fallback marker, and disclosure-budget shapes for governed VCP memory calls
  depends_on:
    - M3-T1
    - M3-T2
  allowed_actions:
    - docs/contracts
    - fixture examples
    - schema review
  forbidden_actions:
    - live VCP call
    - provider/API call
    - raw private runtime read
    - write/update/tombstone
  validation_direction:
    - schema examples cover success, fallback, denied, L4 stop, unknown target, and partial result
    - no fixture example contains secrets/private raw output
```

## M4-K2 — Result Normalization Contract

```yaml
task:
  id: M4-K2
  title: Result Normalization Contract
  mode: contract design
  risk_level: L2
  objective: define normalized memory result envelopes across VCP-native and local fallback paths
  depends_on:
    - M4-K1
  acceptance_direction:
    - normalized output contains source_runtime, confidence/evidence, scope, visibility, receipt_id, and fallback flag
    - raw VCP private payload is never required in client-facing output
```

## M5-K1 — Governance Policy Shield Truth Table

```yaml
task:
  id: M5-K1
  title: Governance Policy Shield Truth Table
  mode: governance design
  risk_level: L2
  objective: define testable policy rows for L0-L3 autonomous approval and L4 hard stops
  depends_on:
    - M4-K1
  acceptance_direction:
    - each policy row has input, expected decision, receipt fields, and stop condition
    - cross-client private leakage cases fail closed
    - bounded routine read inside approved profile self-approves without Jenn per-call confirmation
```

## M5-K2 — Client / Scope / Visibility Matrix

```yaml
task:
  id: M5-K2
  title: Client Scope Visibility Matrix
  mode: governance design
  risk_level: L2
  objective: map Codex and Claude client_id rules, private/shared visibility rules, and scope-expansion rules
  acceptance_direction:
    - codex private does not leak to claude
    - claude private does not leak to codex
    - shared visibility requires explicit boundary
    - unknown client_id fails closed
```

## M6-K1 — Observe-lite Exact Approval Packet

```yaml
task:
  id: M6-K1
  title: Observe-lite Exact Approval Packet
  mode: live-proof preparation
  risk_level: L3
  exact_approval_boundary_required:
    target_alias: required
    transport: required
    max_calls: required
    max_duration: required
    output_disclosure: target/handshake metadata only
    memory_read: forbidden
    memory_write: forbidden
    provider_api: forbidden
    config_secret_read: forbidden
  objective: prepare one exact-approved observe-lite proof that confirms target binding only
  stop_conditions:
    - unknown target
    - auth ambiguity
    - raw memory returned
    - secret/config requested
    - result count exceeds budget
```

## M7-K1 — Observe-full Read Shape Proof Packet

```yaml
task:
  id: M7-K1
  title: Observe-full Read Shape Proof Packet
  mode: live read-shape preparation
  risk_level: L3
  exact_approval_boundary_required:
    target_alias: required
    profile: observe-full or narrower
    query: exact
    max_results: required
    output_disclosure: redacted shape / metadata unless otherwise approved
    write: forbidden
    broad_scan: forbidden
  objective: prove read result shape without exposing raw private memory
  stop_conditions:
    - unexpected raw private payload
    - cross-client leakage
    - result budget exceeded
    - visibility mismatch
```

## M8-K1 — Trusted-full-read Workflow Harness Draft

```yaml
task:
  id: M8-K1
  title: Trusted-full-read Workflow Harness Draft
  mode: read-only workflow harness
  risk_level: L3
  depends_on:
    - M7-K1 accepted receipt
  objective: design a bounded sustained recall workflow for Codex and Claude with checkpoint/handoff receipts
  forbidden_actions:
    - durable writes
    - visibility expansion
    - public MCP expansion
    - production claim
  acceptance_direction:
    - multi-step read-only workflow produces receipt chain
    - fallback and abort behavior are explicit
    - client_id isolation is demonstrated
```
