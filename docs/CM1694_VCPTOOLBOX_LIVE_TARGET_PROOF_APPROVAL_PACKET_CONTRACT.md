# CM-1694 VCPToolBox Live Target Proof Approval Packet Contract

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_LIVE_TARGET_PROOF_APPROVAL_PACKET_CONTRACT_FIXTURE_ONLY_NO_EXECUTION`

## Purpose

CM-1694 defines a fixture-only approval packet contract for the future
VCPToolBox live target proof route.

Added:

- `src/core/VcpToolBoxLiveTargetProofApprovalPacketContract.js`
- `tests/vcp-toolbox-live-target-proof-approval-packet-contract.test.js`

This contract validates approval-packet shape and binding only. It does not
authorize or execute live target proof.

## Exact Token

Fixture contract token:

```text
APPROVE_CM1694_VCPTOOLBOX_LIVE_TARGET_PROOF_APPROVAL_PACKET_ONLY_NO_EXECUTION
```

Meaning:

```text
approval packet shape is valid for future use only
```

It does not mean live execution is approved. Any live proof still needs a
separate fresh operator approval and fresh Git/runtime facts.

## Required Fields

Top-level fields:

```text
schemaVersion
sourceSystem=VCPToolBox
approvalPacketId
exactApprovalToken
operatorDecision
referencedProofPacket
approvalScope
commitBinding
expiry
forbiddenExpansions
counters
```

Required operator decision:

```text
approve_packet_contract_only_no_execution
```

Approval scope fields:

```text
proofPacketId
targetReferenceName
proofMode
proofProfile
maxRuntimeCalls
noMemoryRead=true
noWrite=true
noProviderCall=true
noPublicMcpExpansion=true
noReadinessClaim=true
```

Commit binding fields:

```text
freshGitRequired=true
targetCommitPresent=true
targetCommitValueIncluded=false
originCommitPresent=true
originCommitValueIncluded=false
worktreeStatusRequired=clean_or_explicitly_scoped
```

Expiry fields:

```text
expiresAtPresent=true
expiresAtValueIncluded=false
expired=false
```

## Binding Rules

The helper validates the embedded `referencedProofPacket` using the CM-1693
fixture-only contract first.

Then it requires:

- approval scope proof packet id matches referenced proof packet id
- approval scope target reference matches referenced target reference
- proof mode/profile match the referenced proof packet
- runtime call limit matches the referenced proof packet validation plan
- commit and origin values are represented only by presence flags
- expiry value is represented only by presence flags
- forbidden expansion flags remain false
- counters remain zero

## Forbidden Expansions

All must be false:

```text
allowLiveExecution
allowRuntimeWiring
allowConfigEnvRead
allowEnvFileRead
allowSecretMaterial
allowRawMemoryRead
allowMemoryWrite
allowProviderCall
allowPublicMcpExpansion
allowReadinessClaim
allowRawOutputPersistence
```

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-live-target-proof-approval-packet-contract.test.js
node --test tests\vcp-toolbox-live-target-proof-packet-contract.test.js tests\vcp-toolbox-full-capability-bridge-plan.test.js tests\vcp-toolbox-runtime-target-locator-preflight.test.js tests\vcp-toolbox-runtime-target-operator-packet.test.js
```

Result:

```text
11/11 passed
42/42 passed
```

Coverage:

- accepts exact approval packet contract without allowing live execution
- rejects missing scope, commit binding, and expiry fields
- rejects token mismatch without echoing submitted token
- rejects unsafe approval packet id without echo
- rejects invalid referenced proof packet with reason code only
- rejects approval scope mismatch
- rejects stale expiry and commit value disclosure flags
- rejects forbidden expansion flags
- rejects positive execution counters
- locks approval-packet vocabulary
- proves helper never performs runtime, provider, memory, or public MCP actions

## Boundary

CM-1694 did not:

- execute live target proof
- approve live execution
- start or call VCPToolBox
- inspect a real VCPToolBox path
- receive or persist a real endpoint
- receive or persist a secret
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
CM-1695 VCPToolBox live target proof approval packet focused review / execution boundary audit
```

Actual live target proof remains approval-bound.
