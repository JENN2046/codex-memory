# ChatGPT Web R4 Architecture Freeze

Status: `FROZEN_FOR_IMPLEMENTATION`

Reference: `codex-memory-chatgpt-web-r4-v1`

Decision date: `2026-07-18`

Authority: Jenn's explicit instruction to freeze R4 instead of continuing the old M5 Tunnel route

This document freezes the target architecture. It does not implement, activate,
deploy, or prove the target runtime.

```yaml
edge-implemented: false
relay-implemented: false
oauth-configured: false
real-memory-read-performed: false
provider-call-performed: false
public-tool-surface-expanded: false
automatic-first-task-call-guaranteed: false
production-ready: false
release-ready: false
deploy-ready: false
cutover-ready: false
```

The machine-readable counterpart is
`docs/CHATGPT_WEB_R4_ARCHITECTURE_MANIFEST.json`. Its fail-closed validator is
`scripts/validate_chatgpt_web_r4_architecture.js`. The gate loads the frozen
JSON Schema and also binds canonical SHA-256 digests of both manifest and
schema, so a field not covered by a named semantic assertion still cannot drift
silently.

## 1. Frozen Decision

R4 uses a stable public ChatGPT-facing edge while keeping scope authorization,
mapping, memory intelligence, indexes, and durable memory local.

```text
ChatGPT App + minimal Memory Scope widget
  -> OAuth 2.1
  -> stable HTTPS ChatGPT Edge (/mcp)
       transient request handling only
       no VCP, mapping, diary names, provider, or durable memory
  <- authenticated outbound claim channel
  -> outbound Local Recall Relay
  -> local UDS
  -> codex-memory Governance Kernel
       Project Context Resolver
       trusted scope + registry + startup-bound mapping
       diary allowlist + result post-check
  -> VCPToolBox selected-diary native search
  -> low-disclosure result + signed receipt chain
```

The primary Apps SDK archetype is `interactive-decoupled`: data tools remain
separate from a render-only scope widget. The widget helps Jenn see and select
the active safe project alias, but never becomes an authorization authority.

The Secure MCP Tunnel is no longer the canonical route. It may remain an
optional development or compatibility adapter, and it must not become an
identity authority, scope authority, diary ACL authority, or proof shortcut.

## 2. Why This Is The Best Project Structure

The design is optimized for five facts that must remain true at the same time:

1. ChatGPT needs a stable HTTPS MCP endpoint and, before real memory, standard
   OAuth discovery and challenge behavior.
2. Jenn has many projects, so a conversation string such as a project name
   cannot safely select a diary.
3. VCPToolBox owns memory intelligence and durable memory; `codex-memory` owns
   governance, not a second remote memory database.
4. Local Codex and Claude clients must continue to use the same governance
   kernel and mapping rules as ChatGPT.
5. A platform proxy must not silently rewrite OAuth or weaken scope evidence.

The earlier R3 M5 route made the platform Tunnel part of the canonical
end-to-end dependency. Jenn's AI-Video direct-HTTPS comparison showed the
important failure pattern: a locally correct OAuth/MCP implementation can work
directly while a managed Tunnel path fails discovery or challenge semantics.
R4 therefore makes transport replaceable and keeps the security contract at
our own stable edge and local governance boundary.

## 3. Component Ownership

| Component | Owns | Explicitly does not own |
|---|---|---|
| ChatGPT App | conversation UX, tool selection, widget host | trusted project identity, diary ACL, durable memory |
| Memory Scope widget | project selection UI, bounded status and receipt display | memory data API, ACL decisions, raw memory display |
| stable HTTPS ChatGPT Edge | MCP/OAuth contract, principal assertion, transient request correlation | diary mapping, VCP, embeddings, durable memory, long-term request logs |
| outbound Local Recall Relay | outbound connection, envelope verification, replay/expiry checks, UDS forwarding | scope decisions, fallback decisions, memory storage |
| codex-memory Governance Kernel | project registry, trusted scope, allowlist, governed read, result post-check, receipts | vector intelligence and primary memory storage |
| VCPToolBox | selected-diary index load, embedding/vector search, durable memory runtime | public identity and ChatGPT authorization |

Exactly one component may decide diary ACL: the local `codex-memory` Governance
Kernel. Exactly one component may own durable native memory: VCPToolBox.

### Frozen repository layout

The public Edge and local Relay are different trust zones and deployment
units. They must not be mixed into the existing local core as a loose folder:

```text
apps/
  chatgpt-edge/                    # public OAuth/MCP edge; independently deployable
  local-recall-relay/              # local outbound claimant and UDS forwarder
  chatgpt-memory-scope-widget/     # browser bundle; DTO and bridge only
packages/
  chatgpt-r4-contracts/            # pure schemas, canonicalization, envelopes; no I/O
src/
  adapters/chatgpt-r4/             # local adapter into existing governance services
tests/
  chatgpt-r4/                      # contract, synthetic, integration, and import-fence tests
```

CI import fences must prevent `apps/chatgpt-edge` from importing local config,
storage, recall, or VCP adapters. The Local Recall Relay may import shared
contracts and its UDS transport, but may not load mapping, call a provider,
store memory, or authorize scope. The widget may import UI DTOs only. Existing
governance logic stays in the current core and is reached through the local R4
adapter instead of being copied into any app package.

## 4. Multi-project Scope Contract

Every real-memory read requires a short-lived opaque `project_context_ref`.
The local Project Context Resolver creates it from the private project registry.
The reference binds at least:

```text
principal fingerprint
client_id = ChatGPT
project_id
workspace_id
visibility allowlist
registry reference
mapping reference and digest
issued_at / expires_at
nonce
```

The public edge and widget see only safe project aliases and the opaque
reference. They do not receive diary names, partition references, internal
paths, or the exact mapping digest in public receipts.

Fail-closed rules:

- no context reference: no memory read;
- expired, replayed, principal-mismatched, or mapping-mismatched reference: no
  provider call and no native invocation;
- ambiguous project alias: ask for explicit selection, do not guess;
- tool arguments or widget state that claim another project: ignored for ACL;
- ChatGPT R4 may read mapped project/workspace partitions only;
- Codex-private, Claude-private, compatibility, ambiguous, unregistered, and
  legacy partitions remain excluded.

This solves the many-project confusion risk at the authority boundary instead
of relying on file naming alone.

## 5. Tool And Widget Profile

The frozen future profile separates data tools from rendering:

| Type | Frozen name | Purpose |
|---|---|---|
| data | `resolve_memory_context` | resolve a safe project alias into a short-lived local authority reference |
| data | `memory_overview` | zero-content status/capability overview for the active context |
| data | `search_memory` | bounded governed project/workspace read |
| data | `audit_memory` | low-disclosure audit/result status |
| data | `prepare_memory_context` | governed task-context package after context resolution |
| render | `render_memory_scope` | mount the minimal scope/status widget |

There are no ChatGPT write or proposal tools in R4. The current repository's
five-tool default surface is not changed by this freeze. Future public schema
changes require their own contract implementation, tests, and authorization.

The standard MCP `search`/`fetch` compatibility profile is deferred. It may be
added later as a separate adapter if its result/provenance contract can preserve
the same project authority and disclosure rules; R4 does not claim Deep
Research or company-knowledge compatibility.

The widget may use the MCP Apps bridge for display and may send non-authority
interaction hints. `ui/update-model-context` or equivalent UI state is never a
trusted authorization input. The render tool is a mount operation, not a second
memory API.

## 6. Authentication And Principal Binding

Before any real-memory read, the stable edge must implement OAuth 2.1 with:

- exact Protected Resource Metadata and `WWW-Authenticate` linkage;
- exact resource/audience validation;
- PKCE `S256`;
- an established provider with issuer/JWKS/revocation support;
- an issuer-bound local principal mapping;
- least-privilege read scopes;
- no anonymous fallback.

The identity provider is deliberately provider-neutral at architecture freeze.
Selecting or configuring the provider is an R4-D activation decision, not a
reason to weaken the contract.

## 7. Edge/Relay Envelope

The public edge accepts the ChatGPT request, binds the authenticated principal,
and creates a bounded request envelope. The local relay claims it over an
outbound authenticated channel; no inbound local port is required.

Both request and response envelopes bind:

- schema version, request ID, nonce, issue time, and expiry;
- principal fingerprint and requested tool/profile;
- opaque `project_context_ref`;
- registry/mapping binding;
- request/response digest;
- native, bridge, and context receipt chain;
- provider/native/fallback/write counters;
- low-disclosure result count and verdict.

Signatures, expiry, one-time claim semantics, replay rejection, bounded body
size, and receipt verification are mandatory. The edge must not log request or
response bodies. It holds only in-flight state with a bounded TTL; restart
expires the request rather than reconstructing it from durable storage.

R4 does not publish or periodically synchronize a durable memory Snapshot.
Small immutable UI assets and contract metadata are allowed; memory content,
mapping, diary inventory, and recall results are not remote durable state.

## 8. Platform Reality: Automatic Use Is Not A Guarantee

ChatGPT decides whether to call an App tool. Descriptions, read-only hints, and
global instructions can make the intended behavior clearer, but they do not
create a deterministic platform guarantee that the first meaningful task will
always call `prepare_memory_context`.

Therefore:

```yaml
automatic-first-task-call-guaranteed: false
```

R4 provides a safe bootstrap flow instead:

1. resolve or explicitly select a project context;
2. show the active context in the small widget;
3. make governed context preparation the preferred read action;
4. surface a low-disclosure receipt when it occurs;
5. if no call occurs, never pretend memory was loaded.

Deterministic task-start memory remains available to local Codex/Claude clients
whose client runtime can enforce the call. ChatGPT App behavior is measured by
E2E observation, not asserted from prompts.

## 9. Preserved R3 Controls

R4 supersedes only the claim that the old M5 Tunnel path is canonical. It
preserves these R3 controls:

- private/single-operator initial app posture;
- UDS local boundary;
- low-disclosure receipts;
- exact source and supply-chain identity evidence;
- zero-memory overview probe before any recall;
- default deny and no local/global fallback on authorization failure;
- no write tools, migration, release, deploy, or readiness claim.

The existing R3 branch/PR stays `draft_paused_no_merge`. It is evidence and a
source of reusable controls, not the base branch for R4 implementation.

## 10. Official Platform Contracts Used

The freeze follows the current official OpenAI guidance for:

- [building an MCP server](https://developers.openai.com/apps-sdk/build/mcp-server),
  including server-owned tools, auth enforcement, and UI resources;
- [ChatGPT UI and the MCP Apps bridge](https://developers.openai.com/apps-sdk/build/chatgpt-ui);
- [tool design](https://developers.openai.com/apps-sdk/plan/tools), including
  separate data and render responsibilities;
- [OAuth](https://developers.openai.com/apps-sdk/build/auth), including
  resource metadata, exact audience, and PKCE;
- [deployment](https://developers.openai.com/apps-sdk/deploy), which expects a
  stable HTTPS `/mcp` endpoint for deployed apps;
- [Secure MCP Tunnels](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels),
  retained here only as an optional adapter rather than the architecture core.

## 11. Change Control

Any change to these frozen decisions requires an explicit R4 architecture
amendment with updated manifest, threat model, tests, and rationale:

- canonical route or trust zones;
- diary ACL authority or durable memory authority;
- remote persistence;
- project context binding;
- OAuth requirement;
- public write/proposal surface;
- Tunnel canonicality;
- failure/fallback policy;
- implementation-stage authority boundaries.

Implementation details that preserve those invariants may evolve within the
staged taskbook.
