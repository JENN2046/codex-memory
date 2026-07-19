# ChatGPT Web R4-D External OAuth/Runtime Preflight

Status: `PREFLIGHT_CONTRACT_IMPLEMENTED_ACTIVATION_NOT_PERFORMED`

Task: `CM-2138`

Validation: `CMV-2223`

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

This stage was explicitly authorized by Jenn as an external OAuth/runtime
**preflight**. It freezes the activation contract and the recommended direct
route. It does not create an external service, configure an identity provider,
start a service, bind a ChatGPT App, exchange a token, call memory, or claim
runtime readiness.

```yaml
external-runtime-activated: false
service-started: false
chatgpt-app-created: false
oauth-configured: false
direct-https-canary-passed: false
real-memory-reads: 0
provider-calls: 0
public-tool-surface-expanded: false
production-ready: false
release-ready: false
cutover-ready: false
```

## Decision

R4-D v1 uses this route:

```text
private single operator (Jenn)
  -> private-development ChatGPT App (future R4-E)
  -> Auth0 predefined public client
  -> PKCE S256 + exact resource/audience + memory.read
  -> dedicated single-instance Render Web Service
  -> Direct HTTPS /mcp canary
  -> outbound authenticated Local Recall Relay
  -> local UDS
  -> synthetic/zero-memory governance path only in R4-D
```

The provider choices are deliberate:

- `Auth0` is selected instead of implementing an authorization server.
- A `predefined public client` is selected for the first canary because the
  prior direct-HTTPS comparison already established this mode as the shortest
  known compatible route for Jenn's environment.
- A dedicated single-instance Render Web Service is selected because the Edge
  owns bounded in-flight state. A scale-to-zero or multi-instance serverless
  topology would add state-routing ambiguity before the contract is proven.
- Direct HTTPS is tested first. Secure MCP Tunnel, reverse proxy, CDN, or other
  adapter stays disabled until the direct canary is green.

This remains the frozen `interactive-decoupled` archetype. Data tools and the
render-only scope widget remain separate; no write/proposal tool is introduced.

## Official Contract Alignment

The current OpenAI Apps SDK documentation requires or recommends the following
pieces used by this preflight:

- [Authentication](https://developers.openai.com/apps-sdk/build/auth):
  Protected Resource Metadata, an exact `resource` value carried through the
  authorization and token requests, OAuth discovery, PKCE `S256`, and per-call
  issuer/audience/expiry/scope verification.
- [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server):
  server-owned tools, MCP Apps resources, and MCP Apps bridge-first UI wiring.
- [Define tools](https://developers.openai.com/apps-sdk/plan/tools): accurate
  read-only annotations and link-required authorization behavior.
- [Apps SDK reference](https://developers.openai.com/apps-sdk/reference):
  per-tool `securitySchemes` plus the compatibility mirror in `_meta`.
- [Deploy your app](https://developers.openai.com/apps-sdk/deploy): stable HTTPS
  and streaming `/mcp` behavior for a deployed app.

The frozen paths are:

```text
MCP:   /mcp
PRMD:  /.well-known/oauth-protected-resource
OIDC:  <issuer>/.well-known/openid-configuration
scope: memory.read
```

The canonical protected-resource identifier is the exact public HTTPS origin,
without `/mcp`, query, fragment, credentials, localhost, or IP literal. The same
value must be the token audience/resource binding.

## Preflight Contract

Implementation surfaces:

- `packages/chatgpt-r4-contracts/external-runtime-preflight.js`
- `schemas/chatgpt-web-r4d-oauth-runtime-preflight-v1.schema.json`
- `examples/chatgpt-web-r4d-oauth-runtime-preflight.redacted.example.json`
- `scripts/validate_chatgpt_r4d_preflight.js`
- `tests/chatgpt-r4/oauth-runtime-preflight.test.js`

The contract accepts only:

- private-development, exactly one operator, owner role;
- Render dedicated single-instance Web Service reference;
- Auth0 with a predefined public client;
- exact HTTPS issuer, resource, public origin, PRMD and OIDC discovery binding;
- exact `memory.read` scope;
- authorization code flow with PKCE `S256` and token endpoint auth method
  `none`;
- `resource` echoed on both authorization and token requests;
- credential **references** using `env:NAME`, never credential values;
- direct-HTTPS-first runtime with adapters disabled;
- body logging disabled, no durable remote state, bounded in-flight count and
  request TTL;
- revocation/disable/stop rollback readiness;
- exact repository commit, tree, lockfile digest, and Edge artifact digest;
- zero activation, service, ChatGPT App, memory, provider, write-tool, and
  public-expansion effects during preflight.

The returned receipt deliberately omits issuer, resource, public URL, discovery
URL, host project, operator reference, client ID, key/token reference names,
and every secret value.

## Private Binding Inputs

No values are committed. A future private activation configuration must bind
these references:

```text
CODEX_MEMORY_R4_OPERATOR_REFERENCE
CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE
CODEX_MEMORY_R4_OAUTH_CLIENT_ID
CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY
CODEX_MEMORY_R4_RELAY_AUTH_TOKEN
CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE
```

It must also privately bind the exact issuer, public origin/resource, discovery
URL, source commit/tree, lockfile digest, and built Edge artifact digest. The
redacted example intentionally uses `.invalid` hosts and zero digests and is
therefore rejected by the executable validator.

## Gate Sequence

```text
D0 contract/schema/tests and source identity
  -> D1 private exact-value binding and offline validation
  -> D2 dedicated Direct HTTPS Edge configuration
  -> D3 PRMD/discovery/401/resource/PKCE/token validation
  -> D4 zero-memory direct canary
  -> R4-E private ChatGPT App E2E (separate stage)
```

Stop before D2 if any exact reference is missing, any value is a placeholder,
rollback is incomplete, the source identity does not match, or secret values
would need to be printed or committed. Stop during D3/D4 on issuer/audience/
scope mismatch, unexpected body logging, durable remote state, adapter routing,
memory/provider activity, or cross-scope disclosure.

## Current Preflight Verdict

Validation completed without starting the inactive local service:

```yaml
focused-r4d: 9/9
focused-r4b-r4c-r4d: 50/50
default-tests:
  pass: 5776
  fail: 0
  skip: 8
hardening:
  primary: 97/97
  secondary: 6/6
strict-offline-subgates:
  contract-tests: 113
  contract-pass: 112
  contract-fail: 0
  default-tests: 5784
  default-pass: 5776
  default-fail: 0
  default-skip: 8
  compare: 43/43
  rollback: 43/43
strict-health:
  status: UNAVAILABLE_SERVICE_INACTIVE
  service-started-for-gate: false
strict-overall: NOT_PASS_HEALTH_UNAVAILABLE
```

The strict command therefore returned nonzero only for the unavailable
`127.0.0.1:7605/health` probe. This preflight does not convert that result into
a pass and does not start the service to satisfy it.

```yaml
contract: pass
schema-digest-bound: true
redacted-example-fails-closed: true
recommended-host: render_dedicated_single_instance
recommended-idp: auth0
client-registration: predefined_public_client
direct-https-first: true
private-exact-values-bound: false
activation-performed: false
final-verdict: PREFLIGHT_CONTRACT_READY_PRIVATE_BINDING_PENDING
```

R4-D is not complete. The next authorized boundary is private exact-value
binding and offline validation. External service creation/configuration,
deployment, token exchange, and the Direct HTTPS canary remain unperformed.
