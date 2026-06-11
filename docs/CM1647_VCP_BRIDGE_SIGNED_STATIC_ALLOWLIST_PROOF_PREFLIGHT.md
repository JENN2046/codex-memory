# CM-1647 VCP Bridge signed/static allowlist proof preflight

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_VCP_BRIDGE_SIGNED_STATIC_ALLOWLIST_PROOF_PREFLIGHT_FIXTURE_ONLY`

## Scope

This slice adds a fixture-only proof preflight model for the CM-1646 VCP Bridge
trusted context adapter skeleton. It defines the static allowlist proof packet
shape and signed-context metadata shape required before adapter output may be
treated as consumable by a future bridge integration.

This is not a live bridge proof and not real signature verification. It does
not accept private keys, signing keys, bearer-token material, API keys, or other
secret-bearing proof material.

## Implemented Files

```text
src/core/VcpBridgeTrustedContextProofPreflight.js
tests/vcp-bridge-trusted-context-proof-preflight.test.js
docs/CM1647_VCP_BRIDGE_SIGNED_STATIC_ALLOWLIST_PROOF_PREFLIGHT.md
```

## Proof Packet Shape

The preflight expects a fixture-only packet:

```text
proofType: vcp_bridge_trusted_context_static_allowlist_fixture
fixtureOnly: true
staticAllowlist: { agentAlias, agentIds, requestSources, projectIds, workspaceIds, clientIds }
signedContext:
  issuedAt
  expiresAt
  nonce
  bridgeInstanceId
  contextHash
  signaturePresent: true
  signatureVerified: false
```

`signatureVerified=false` is intentional. CM-1647 models the required metadata
shape and deterministic context binding only. It does not verify a real
signature and does not handle private keys.

## Deterministic Context Hash

The helper exports `buildVcpBridgeTrustedContextHash(...)`, which computes a
deterministic SHA-256 hash over:

```text
executionContext
bridgeAllowlist
```

This is a fixture hash for shape and mismatch testing. It is not a signed
runtime proof, does not use secret material, and does not establish production
trust by itself.

## Acceptance Rules

Proof is accepted only when:

- proof packet is a plain object
- proof type matches the fixture preflight type
- `fixtureOnly=true`
- static allowlist is complete
- signed context metadata is complete
- `signaturePresent=true`
- `signatureVerified=false`
- adapter result is already accepted
- `issuedAt` / `expiresAt` are valid and not expired
- supplied `contextHash` matches the deterministic hash of accepted adapter
  output plus static allowlist
- no prompt/tool payload/public args authority is supplied
- no private key, signing key, bearer-token material, API key, secret, or
  password shaped field is supplied

Accepted output sets:

```text
accepted: true
adapterConsumable: true
fixtureOnly: true
signatureVerified: false
payloadAuthorityUsed: false
privateKeyAccepted: false
bearerTokenAccepted: false
publicMcpExpanded: false
recordMemoryCalled: false
providerApiCalled: false
```

## Fail-Closed Rules

Proof is rejected when:

- proof packet is missing or not fixture-only
- static allowlist is missing or incomplete
- signed context metadata is missing or incomplete
- proof is expired
- adapter result is not accepted
- context hash mismatches
- prompt/tool payload/public args identity is supplied
- secret-shaped material is supplied

Rejected output is low-disclosure and does not echo raw nonce,
`bridgeInstanceId`, raw payload identity, private key, token, or secret values.
Adapter output can be consumed only when `accepted=true` and
`adapterConsumable=true`.

## Validation Coverage

`tests/vcp-bridge-trusted-context-proof-preflight.test.js` covers:

- static allowlist proof packet shape
- signed-context metadata projection
- fixture-only proof behavior
- private key / bearer-token material rejection
- expired proof rejection
- missing allowlist rejection
- mismatched context hash rejection
- payload-derived identity rejection
- low-disclosure output
- adapter output consumable only after proof acceptance
- public MCP surface remains seven tools

## Default-Off Boundary

CM-1647 does not change production behavior:

```text
real signature verification: NOT_ADDED
private key handling: NOT_ADDED
VCPBridgeServer integration: NOT_ADDED
live VCP proof: NOT_EXECUTED
live MCP proof: NOT_EXECUTED
record_memory call path: NOT_CALLED
strict production default: NOT_ENABLED
runtime wiring: NOT_ADDED
```

Future live bridge proof, real signature verification design, runtime wiring,
or production candidate movement requires separate exact approval.

## Non-Claims

```text
strict default changed: NO
production strict mode enabled: NO
runtime auth behavior changed: NO
real record_memory write occurred: NO
live VCP Bridge proof occurred: NO
live MCP proof occurred: NO
real signature verification occurred: NO
provider/API occurred: NO
bearer token material used: NO
raw scan / broad scan occurred: NO
confirmed mutation occurred: NO
public MCP expansion occurred: NO
persistent tag write occurred: NO
release/tag/deploy occurred: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```
