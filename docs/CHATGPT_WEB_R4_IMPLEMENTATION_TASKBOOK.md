# ChatGPT Web R4 Implementation Taskbook

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Current stage: `R4-A architecture_freeze`

Old R3/M5 Tunnel route: `draft_paused_no_merge`

```yaml
automatic-first-task-call-guaranteed: false
production-ready: false
release-ready: false
cutover-ready: false
```

Every stage begins from current `origin/main` in its own task worktree. The R3
branch is not merged or rebased into R4. Reusable controls are ported only after
review against the frozen manifest.

## R4-A — Architecture Freeze

Deliverables:

- human architecture decision;
- machine-readable manifest and schema;
- threat model;
- staged taskbook;
- fail-closed static validator and negative tests;
- frozen JSON Schema validation and canonical manifest/schema digest anchors;
- README navigation.

Gates:

```yaml
runtime_or_service_action: false
runtime_config_read_or_write: false
secret_read_or_write: false
provider_call: false
memory_read_or_write: false
public_schema_expansion: false
r3_tunnel_pr_merged: false
```

Exit: docs and validator pass normal tests/CI and architecture review. This
freezes a target; it proves no runtime capability.

## R4-B — Contracts And Synthetic Harness

Implement without external runtime:

- create the frozen package roots under `apps/`, `packages/`,
  `src/adapters/chatgpt-r4/`, and `tests/chatgpt-r4/` without activating them;
- add CI import fences so the Edge cannot import local config/storage/recall/VCP
  code and the Relay cannot own mapping/provider/storage/scope authorization;
- Edge/Relay request and response envelope schemas;
- principal assertion and `project_context_ref` contracts;
- expiry, replay, signature, size, and counter validators;
- data/render tool descriptors in a non-default candidate profile;
- project-scope widget DTO and bridge contract;
- zero-memory synthetic end-to-end harness;
- explicit no-durable-remote-state checks.

Required gates include negative mutations for every authority-bearing field.
No service, OAuth configuration, public tool activation, provider, or real
memory is authorized by R4-B.

## R4-C — Local Edge/Relay Integration

Build a loopback-only reference topology:

```text
synthetic ChatGPT caller
  -> loopback Edge
  <- outbound Local Recall Relay
  -> temporary UDS
  -> strict synthetic governance double
```

Prove claim/ack/expiry/reconnect, replay rejection, cancellation, response
correlation, body-log absence, and zero provider/native/write counters. Use only
temporary roots and synthetic data. Do not read active config, start the active
memory service, or expose a public endpoint.

## R4-D — OAuth And External Edge Activation

This stage crosses external auth/runtime configuration and requires Jenn's
current exact authorization.

Before execution, freeze:

- host/project and single-operator ownership;
- IdP, issuer, exact resource/audience, scopes, and PKCE mode;
- public URL and `/mcp`/PRMD/discovery paths;
- edge/relay credential references and rollback/revocation;
- no-body-log and bounded in-flight state settings;
- supply-chain identity for deployed artifacts.

Run a direct HTTPS OAuth compatibility canary before adding any optional
Tunnel/proxy/CDN adapter. If direct succeeds and an adapter fails, investigate
the adapter; do not mutate local memory governance or weaken OAuth.

No real memory is allowed in R4-D.

## R4-E — Zero-memory ChatGPT E2E

Create or bind the private single-operator ChatGPT App and prove:

- OAuth login and exact principal/resource/scope;
- tool discovery for the candidate read-only profile;
- minimal `interactive-decoupled` scope widget rendering;
- `memory_overview` zero-content/zero-memory probe;
- signed Edge/Relay/UDS receipt chain;
- provider, native invocation, fallback, primary write, derived write, and
  durable remote mutation counters all equal zero.

This stage does not prove recall, relevance, or automatic task-start use.

## R4-F — Bounded Governed Live Read

This is the only R4 stage that may authorize real memory. It requires a new
exact authorization after R4-E passes and after Jenn accepts the residual edge
processing risk.

Minimum proof matrix:

- resolve one explicitly selected registered project into a short-lived
  `project_context_ref`;
- project and workspace positive reads;
- cross-project, client-private, legacy, ambiguous, and unregistered negative
  reads;
- source post-check and mapping/receipt binding;
- non-empty/relevance verdict without raw disclosure;
- global/unscoped search count zero;
- live-proof primary memory writes zero;
- actual observation of whether ChatGPT called the intended context tool.

Do not claim `automatic-first-task-call-guaranteed`; report actual call receipts
per session.

## R4-G — Observation And Closeout

After bounded live proof:

- run restart, revocation, mapping-mismatch, relay-unavailable, and rollback
  drills;
- observe bounded sessions and record actual call frequency/failures;
- generate low-disclosure independent evidence;
- update current state and operational docs;
- decide whether an optional transport adapter is useful;
- keep production/release/deploy/cutover/readiness false unless separately
  authorized and evidenced.

## Rollback

Rollback never changes memory content:

1. disable or remove the private ChatGPT App binding;
2. stop the Local Recall Relay;
3. revoke Edge/Relay credentials;
4. disable the external Edge route;
5. retain local Codex/Claude UDS/governance service unchanged;
6. preserve low-disclosure evidence and expire all in-flight requests.

No migration, deletion, diary reclassification, proof-memory cleanup, or VCP
core change is part of rollback.

## Completion Meaning

`R4-A COMPLETE` means the architecture is frozen and validated. It does not
mean R4 is implemented. `R4 COMPLETE` requires all separately authorized stages
through R4-G and still does not imply production/release/cutover readiness.
