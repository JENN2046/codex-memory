# ChatGPT Web R4 Implementation Taskbook

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Current stage: `R4-H private_development_closeout_complete_not_ready`

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

Status: `COMPLETE`

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

Status: `COMPLETE`

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

Implementation evidence: `docs/CHATGPT_WEB_R4B_CONTRACTS_SYNTHETIC.md`.

## R4-C — Local Edge/Relay Integration

Status: `COMPLETE_MERGED`

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

Implementation evidence: `docs/CHATGPT_WEB_R4C_LOCAL_INTEGRATION.md`.

## R4-D — OAuth And External Edge Activation

Status: `D2C_D3_D4_DIRECT_CANARY_PASS_ZERO_MEMORY`

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

Preflight evidence:
`docs/CHATGPT_WEB_R4D_EXTERNAL_RUNTIME_PREFLIGHT.md`.

Execution sequence after preflight:

```text
D2A isolated external Edge source + pinned container artifact
  -> D2B self-hosted private-binding amendment + outbound Relay client binding
  -> D2C exact-head artifact freeze + authorized deploy/health contract
  -> D3 OAuth discovery/resource/token canary
  -> D4 zero-memory direct canary
```

D2A is implemented and locally validated. It uses the official MCP SDK,
stateless Streamable HTTP, exact Auth0 token binding, an immutable MCP Apps
resource, a bounded authenticated Relay broker, owner-only secret references,
actual lockfile/build-source identity checks, and a digest-pinned non-root
container. It does not start a container, create or change an external service,
exchange a token, call memory/provider paths, or activate the local default MCP
surface. Evidence: `docs/CHATGPT_WEB_R4D_D2A_EDGE_ARTIFACT.md`.

The existing D1 binding contract selected Render and cannot be silently reused
for the preflighted private VM. D2B must amend and revalidate host ownership,
public origin, rollback references, and Relay signing authority before D2C.

D2B now implements the self-hosted amendment contract and outbound HTTPS Relay
client. The exact private amendment is frozen against a Jenn-controlled DNS
origin. D2C deployed one isolated non-root Edge behind loopback/Nginx/TLS; D3
bound the Auth0 resource, predefined public client, PKCE S256, exact scope, and
single operator; D4 authenticated only `initialize` and `tools/list`. Six
read-only candidate tools were discovered with zero tool, Relay, memory,
provider, native, fallback, or durable-mutation calls. Evidence:
`docs/CHATGPT_WEB_R4D_D2B_SELF_HOSTED_RELAY.md` and
`docs/CHATGPT_WEB_R4D_DIRECT_OAUTH_RUNTIME_CANARY.md`.

## R4-E — Zero-memory ChatGPT E2E

Status: `COMPLETE_PRIVATE_MANAGED_CANARY`

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

Status: `COMPLETE_PRIVATE_BOUNDED_LIVE_READ`

This was the only R4 stage authorized to read real memory. Execution required
the exact R4-F authorization issued after R4-E passed and after Jenn accepted
the residual Edge processing risk.

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

Implementation boundary and activation procedure:
`docs/CHATGPT_WEB_R4F_BOUNDED_GOVERNED_LIVE_READ.md`.

The authorized private-development proof completed project/workspace positive
reads, negative scope controls, mapping/receipt binding, source post-check,
non-empty relevance, zero unrestricted native search, and zero live-proof
primary-memory write. It did not enable a public write surface or establish a
general automatic-first-task-call guarantee.

## R4-G — Session-Scoped Live Read Activation And Kill Switch

Status: `COMPLETE_PRIVATE_RUNTIME_PROOF_ROLLED_BACK_ZERO_MEMORY`

Replace per-proof public Edge environment switching with local, ephemeral
Governance authority:

- every Governance process start is inactive;
- an owner-only local control UDS can grant one principal/project/visibility
  lease for 30 to 300 seconds;
- one lease can issue one `project_context_ref` and perform one governed read;
- the lease is consumed after that read and cannot be reused;
- expiry and explicit kill are checked before provider invocation and again
  before returning an in-flight result;
- activation state is never durable and restart returns to inactive;
- the six-tool public MCP profile and schemas do not change.

Implementation evidence:
`docs/CHATGPT_WEB_R4G_SESSION_SCOPED_LIVE_READ.md`.

The authorized runtime proof passed exact activation, one-context/one-read,
automatic consumption, kill-before-read, in-flight suppression, TTL expiry,
restart-inactive, scope isolation, and zero unrestricted native search. The
private runtime is stopped and the Edge is restored to zero-memory.

## R4-H — Observation And Closeout

Status: `COMPLETE_PRIVATE_DEVELOPMENT_NOT_READY`

After bounded live proof:

- run restart, revocation, mapping-mismatch, relay-unavailable, and rollback
  drills;
- observe bounded sessions and record actual call frequency/failures;
- generate low-disclosure independent evidence;
- update current state and operational docs;
- decide whether an optional transport adapter is useful;
- keep production/release/deploy/cutover/readiness false unless separately
  authorized and evidenced.

All listed drills and closeout actions passed. The immutable owner-only proof
artifact remains outside Git. Public closeout evidence is recorded in
`docs/CHATGPT_WEB_R4H_PRIVATE_DEVELOPMENT_CLOSEOUT.md`. Final verdict:
`R4_COMPLETE_PRIVATE_DEVELOPMENT_NOT_READY`.

No optional transport adapter is needed for the accepted private-development
route. Direct managed HTTPS remains canonical; Tunnel stays non-canonical.

## R5-K — Scope, Receipt, Terminal Stop, And Private Runtime Preparation

R5-K is a source-only behavior and presentation closure after the R5-J canary.
It does not reopen R4 runtime acceptance.

Required source gates:

1. the first 512 MCP instruction characters require exact project alias and
   visibility, ask for clarification when either is missing, and abstain from
   memory-irrelevant tasks;
2. `task_start_context`, `current`, App names, URLs, clients, workspaces, and
   inferred repositories are never guessed scope;
3. `render_memory_scope` is component-only and hidden from model selection;
4. the resolve result directly mounts a versioned scope Widget;
5. the Widget distinguishes result-receipt binding from context-reference
   issuance using Widget-only low-disclosure metadata;
6. any read result or transport failure is terminal for memory-tool selection;
7. governed failure and transport failure semantics remain distinct;
8. formal private runtime preparation replaces stale native target data only
   from an observed loopback, write-disabled isolated shim and recomputes the
   Governance binding digest;
9. the six public tool names and exact input/output schemas remain frozen.

R5-K source completion is not a runtime proof, automatic-selection guarantee,
release, deploy, cutover, or readiness claim.

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
through R4-H and still does not imply production/release/cutover readiness.
