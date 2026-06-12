# CM-1693 VCPToolBox Full-Capability Live Target Proof Packet Contract

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_LIVE_TARGET_PROOF_PACKET_CONTRACT_FIXTURE_ONLY_NO_RUNTIME`

## Purpose

CM-1693 turns the next live-target-proof step into a fixture-only source
contract before any real VCPToolBox target proof is attempted.

Added:

- `src/core/VcpToolBoxLiveTargetProofPacketContract.js`
- `tests/vcp-toolbox-live-target-proof-packet-contract.test.js`

## Contract Boundary

This helper accepts only a planned proof packet. It never authorizes or executes
live proof.

Required execution authorization fields must stay false:

```text
executionAuthorization.liveExecutionApproved=false
executionAuthorization.approvalTokenIncluded=false
executionAuthorization.approvalTokenValueIncluded=false
executionAuthorization.approvalTokenHashPresent=false
```

Any future real proof still requires a separate exact approval outside this
packet.

## Required Packet Fields

Top-level fields:

```text
schemaVersion
sourceSystem=VCPToolBox
packetId
operatorIntent
target
proofProfile
proofMode
allowedRuntimeActions
principalScope
executionAuthorization
nonSecretAssertions
validationPlan
counters
```

Target fields:

```text
target.kind
target.referenceName
target.discoverySource
target.locatorHashPresent=true
target.locatorValueIncluded=false
target.secretMaterialIncluded=false
target.configEnvRead=false
target.runtimeCalled=false
target.observedPresent
target.runtimeEntrypointKnown
```

Validation plan fields:

```text
freshGitRequired=true
targetPacketValidationRequired=true
postProofReceiptRequired=true
noRawOutputPersistence=true
maxRuntimeProbeMinutes=1..10
maxRuntimeCalls=1..3
```

## Proof Modes

Fixture-only proof modes:

| Mode | Allowed planned runtime actions |
|---|---|
| `target_presence_no_memory` | `target_presence.check` |
| `runtime_handshake_no_memory` | `target_presence.check`, `runtime_handshake.check` |
| `entrypoint_shape_no_memory` | `target_presence.check`, `runtime_handshake.check`, `entrypoint_shape.inspect` |

All are planned-only. The helper returns `executionStatus=planned_not_executed`.

## Low-Disclosure Rules

The helper reuses the CM-1692 safe reference boundary:

- `packetId` and `target.referenceName` must be safe short aliases.
- `operatorIntent` must not contain path, URL, `config.env`, `.env`,
  bearer/token/secret/API-key/private-key/password-shaped content.
- Rejected low-disclosure projection only echoes safe aliases.
- Accepted output returns `operatorIntentPresent=true`, not raw
  `operatorIntent`.

## Forbidden Values

The packet rejects:

- path, endpoint, URL, base URL, or locator values
- approval token values or token hashes
- `config.env` or `.env` values
- bearer tokens, API keys, shared secrets, private keys, passwords
- raw DailyNote, RAG, vector, prompt, or conversation content
- positive runtime/provider/memory/public-MCP/readiness counters
- any claim that live execution is already approved

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-live-target-proof-packet-contract.test.js
node --test tests\vcp-toolbox-full-capability-bridge-plan.test.js tests\vcp-toolbox-runtime-target-locator-preflight.test.js tests\vcp-toolbox-runtime-target-operator-packet.test.js
```

Result:

```text
10/10 passed
32/32 passed
```

Coverage:

- accepts fixture-only proof packet without execution
- accepts `trusted-full` only as a no-execution proof plan
- rejects missing target, execution authorization, and validation fields
- rejects path, endpoint, approval-token, config-env, and raw values without echo
- rejects unsafe packet reference, target reference, and intent values without
  echo
- rejects packets that claim live execution approval
- rejects runtime actions outside proof-mode vocabulary or above call limit
- rejects positive execution counters
- locks proof mode, authorization, assertion, and forbidden-field vocabulary
- proves helper never performs runtime, provider, memory, or public MCP actions

## Boundary

CM-1693 did not:

- execute live target proof
- start or call VCPToolBox
- inspect a real VCPToolBox path
- receive or persist a real endpoint
- receive or persist a token or secret
- include an approval token value or hash
- read `config.env`
- read `.env`
- call MCP
- call providers
- read raw memory stores
- write memory
- wire runtime behavior
- expand public MCP tools
- claim production/release/cutover readiness

## Next Step

Next safe local step:

```text
CM-1694 VCPToolBox live target proof approval packet focused review
```

Actual live target proof remains approval-bound and must start from fresh Git
facts plus this fixture-only packet contract.
