# CM-1698 VCPToolBox Exact Target Discovery Packet Preflight

Date: 2026-07-02

Status:
`COMPLETED_VALIDATED_VCPTOOLBOX_EXACT_TARGET_DISCOVERY_PACKET_PREFLIGHT_FIXTURE_ONLY_NO_RUNTIME`

## Purpose

CM-1698 adds a fixture-only preflight contract for the next VCPToolBox memory
capability step: preparing an exact target discovery packet without inspecting a
real target.

The helper validates the non-secret shape that must exist before any future
target-specific runtime inspection can be considered.

It does not authorize target-specific inspection, runtime execution, memory
read, memory write, provider/API calls, public MCP expansion, or readiness
claims.

## Added Surfaces

- `src/core/VcpToolBoxExactTargetDiscoveryPacketPreflight.js`
- `tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js`

The contract mode is `fixture_preflight_only`.

The exact preflight token is:

```text
PREFLIGHT_CM1698_VCPTOOLBOX_EXACT_TARGET_DISCOVERY_PACKET_ONLY_NO_RUNTIME
```

The accepted operator decision is:

```text
preflight_target_discovery_packet_only_no_runtime
```

## Accepted Packet Shape

An accepted packet must provide only safe aliases, booleans, profile names, and
component coverage flags.

Required coverage includes:

- sanitized `targetReference`;
- `principalScope` for agent, project, workspace, client, and session presence;
- discovery question coverage for target kind, startup, transport, auth/profile
  field names, read/write entrypoints, scope, timeout, failure model, and
  receipt fields;
- component surface coverage for `DailyNote`, `DailyNoteManager`,
  `KnowledgeBaseManager`, `TagMemo`, `LightMemo`, `TDBKnowledge`, `DeepMemo`,
  `TopicMemo`, `MeshMemo`, and `RAGDiaryPlugin`;
- explicit profile boundary;
- execution authorization flags all false;
- low-disclosure output policy;
- receipt plan that excludes raw output, secret values, and readiness claims;
- fail-closed stop conditions;
- forbidden expansion flags all false;
- zero counters.

## Rejection Boundary

The helper rejects:

- unsafe packet ids, operator intents, or target references;
- locator values, paths, endpoints, URLs, config/env fields, tokens, keys,
  secrets, passwords, approval-line values, and raw memory-shaped fields;
- target reference flags indicating locator/endpoint/secret inclusion,
  `config.env` read, runtime call, or target-specific inspection approval;
- incomplete discovery questions or raw value inclusion;
- incomplete component coverage;
- unknown profiles, raw-output allowance, or write allowance;
- live probe, memory read, write, provider call, public MCP expansion, or exact
  approval-line authorization;
- receipt/output policy that allows raw, secret, memory, path/endpoint, or
  readiness data;
- non-stop stop conditions;
- forbidden expansion flags;
- positive execution counters.

Rejected output remains low-disclosure and does not echo submitted private
locator, endpoint, secret, raw memory, or unsafe alias values.

## Validation

Targeted validation:

```bash
node --test tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
```

Result: passed `14/14`.

Adjacent VCPToolBox chain validation:

```bash
node --test tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js tests/vcp-toolbox-runtime-target-locator-preflight.test.js tests/vcp-toolbox-runtime-target-operator-packet.test.js tests/vcp-toolbox-live-target-proof-execution-approval-draft.test.js
```

Result: passed `49/49`.

## Boundary Receipt

No target-specific runtime inspection occurred.

No live VCPToolBox call occurred.

No real path, endpoint, config/env, token, secret, approval line, or raw memory
value was persisted.

No `config.env` or `.env` file was read or edited.

No provider/API call, memory read, memory write, durable audit write, public MCP
expansion, push, PR, release, deploy, cutover, production readiness claim,
release readiness claim, or complete V8 claim occurred.

## Next Route

The next safe local route is a target-specific runtime inspection approval
packet, likely `CM-1699`.

That future route must still remain exact-approval-bound before any real target
inspection, live runtime call, memory read, write, provider/API call, public MCP
expansion, or readiness claim.
