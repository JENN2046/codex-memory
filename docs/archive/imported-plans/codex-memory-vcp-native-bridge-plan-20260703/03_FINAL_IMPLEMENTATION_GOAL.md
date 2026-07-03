# Final Implementation Goal

## One-sentence goal

`codex-memory` becomes the governed MCP bridge that lets Codex and Claude safely use VCPToolBox native memory, while preserving local memory only as fallback, audit, compatibility, and test substrate.

## Formal goal

Build a memory governance control plane with these properties:

```yaml
product_goal:
  primary_runtime: VCPToolBox native memory
  primary_value: governance, not memory intelligence
  clients:
    - Codex
    - Claude
  access_path: governed MCP tools
  governed_dimensions:
    - client_id
    - scope
    - visibility
    - target runtime
    - invocation profile
    - read/write authority
    - output disclosure budget
    - audit receipt
    - rollback posture
  local_memory_role:
    - fallback
    - audit
    - validation fixture
    - compatibility
    - offline continuity
```

## Non-goals

- Rebuild VCPToolBox memory intelligence as the primary route.
- Claim VCP parity without VCP-native live evidence.
- Execute live provider/API calls without exact approval.
- Read secrets, tokens, `.env`, raw private runtime state, or raw private memory.
- Expand public MCP tools without explicit boundary approval.
- Claim production-ready, release-ready, cutover-ready, or complete V8 based on docs-only or fixture-only evidence.

## Success definition

### Usable

```yaml
usable_when:
  - README and active roadmap state VCP-native-first governed bridge
  - STATUS / CURRENT_STATE / TASK_QUEUE / CURRENT_FACTS / VALIDATION_LOG agree on current state
  - VCP native capability inventory exists
  - invocation profiles and exact approval boundaries are documented
  - local fallback role is explicitly limited
  - fixture and dry-run gates are green
```

### Release candidate candidate

```yaml
rc_candidate_when:
  - exact-approved observe-lite target proof exists
  - exact-approved read-shape proof exists
  - trusted-full-read workflow harness passes with low-disclosure receipts
  - policy shield blocks L4 cases
  - response normalization and audit receipts are stable
  - local fallback passes isolation and rollback tests
  - docs match runtime evidence
  - no P0/P1 open governance risk
```

### Production-ready candidate

```yaml
production_ready_candidate_when:
  - release-candidate evidence is repeated across bounded sessions
  - Codex and Claude client_id isolation is demonstrated
  - bounded autonomous writes are proven only after exact write boundary approval
  - rollback / supersede / tombstone receipts are validated
  - monitoring / health / dashboard reports are stable
  - production readiness claim has explicit Jenn approval
```

These are criteria for future claims, not current claims.
