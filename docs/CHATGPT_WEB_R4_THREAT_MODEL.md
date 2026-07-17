# ChatGPT Web R4 Threat Model

Reference: `codex-memory-chatgpt-web-r4-v1`

Primary architecture: `interactive-decoupled`

Default policy: deny

```yaml
automatic-first-task-call-guaranteed: false
production-ready: false
```

## Protected Assets

- raw memory and recall results;
- diary names, partition references, paths, mapping content, and exact digest;
- private project registry and project membership;
- OAuth tokens, relay/device credentials, signing and encryption keys;
- trusted scope, native/bridge/context receipts, and counter integrity;
- local VCP indexes and runtime configuration.

## Trust Boundaries

```text
ChatGPT
  | public internet + OAuth
stable HTTPS ChatGPT Edge
  | authenticated outbound claim channel
outbound Local Recall Relay
  | local UDS
codex-memory Governance Kernel
  | selected-diary native contract
VCPToolBox
```

Neither ChatGPT, the widget, nor the public edge may decide diary ACL. The
outbound Local Recall Relay verifies transport envelopes but does not resolve
project ownership. The local Governance Kernel is the only diary ACL authority.

## Threat Matrix

| Threat | Required control | Failure behavior |
|---|---|---|
| forged project/tool argument | ignore as ACL input; require locally issued `project_context_ref` | no memory read |
| stale or replayed context | principal binding, nonce, expiry, one-time consumption | reject before provider/native |
| cross-project/client disclosure | local registry + mapping resolution + allowlist + source post-check | fail entire call |
| legacy diary hydration | mapping exclusion and selected-diary index load only | reject; no global fallback |
| Tunnel/proxy metadata rewrite | own stable HTTPS OAuth/MCP edge; direct contract canary | activation blocked |
| edge compromise | no durable memory/mapping, least privilege, body-log ban, short TTL | revoke edge/relay credentials; expire inflight |
| relay impersonation | device-bound credential plus signed challenge/envelope | no UDS forwarding |
| malicious or duplicated envelope | signature, digest, nonce, TTL, one-time claim | reject and bounded audit event |
| mapping drift | bind registry/mapping reference and digest end to end | reject before provider |
| widget authority injection | widget state is presentation only | ignore; require local context resolution |
| prompt injection requests memory bypass | tools never accept diary names or authority override | deny |
| result source mismatch | diary/path source post-check before projection | fail entire call |
| edge request/response retention | in-flight memory only, no body logs, bounded TTL | expire on restart |
| local relay unavailable | no Snapshot or global native fallback | bounded unavailable result |
| oversized or slow request | size/deadline/limit gates at each hop | cancel and expire |
| false success receipt | bind actual invoker counters and receipt chain | proof invalid |
| automatic-call overclaim | measure actual MCP receipts; never infer from guidance | report not-called honestly |

## Required Negative Tests

R4 implementation must cover at least:

- missing, expired, replayed, principal-mismatched, and signature-invalid
  `project_context_ref`;
- forged `client_id`, project/workspace ID, diary name, mapping reference, and
  digest in public arguments;
- cross-project and cross-client queries;
- private, legacy, compatibility, ambiguous, and unregistered partition
  exclusion;
- edge/relay disconnect, restart, timeout, duplicated claim, and delayed
  response;
- result source post-check mismatch;
- missing/false native, bridge, or context receipt;
- request/response logging and durable remote state detection;
- OAuth issuer, audience, scope, PKCE, PRMD, and challenge mismatch;
- widget/model-context attempts to change authorization;
- unrestricted/global native search invocation;
- provider/native/fallback/write counter tampering.

## Secrets And Logs

Secret values may exist only in approved private runtime configuration or an
OS/provider secret store. They must never enter Git, chat, public receipts,
test fixtures, command output, or request logs. Runtime diagnostics use only
presence, reference, fingerprint, bounded category, and counter evidence.

Public/remote logs may contain request ID, coarse timing, status category, and
non-sensitive version identifiers. They may not contain tool arguments,
queries, results, project labels, diary identifiers, mapping digests, tokens,
or provider responses.

## Stop Conditions

Implementation or live proof stops immediately if any of the following occurs:

- cross-project, cross-client, private, or legacy result;
- unrestricted/global native search;
- OAuth resource/audience or principal ambiguity;
- edge persistence or logging of memory-bearing bodies;
- missing envelope or receipt binding;
- a required core change to VCPToolBox;
- public write/proposal exposure;
- a need to weaken default-deny or add a silent Snapshot/local fallback;
- secret, token, raw memory, or provider-response disclosure.

## Residual Risk

The edge necessarily processes the ChatGPT tool request in memory before
forwarding it. R4 reduces but cannot mathematically eliminate platform and edge
process exposure. The compensating controls are single-operator scope, OAuth,
least privilege, no durable body storage/logging, short TTL, minimal results,
and local final authorization. This residual risk must be accepted explicitly
before R4-F real-memory proof.
