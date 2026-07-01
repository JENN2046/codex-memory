# CM-1697 VCPToolBox Live Target Proof Execution Approval Draft

Date: 2026-07-02

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_LIVE_TARGET_PROOF_EXECUTION_APPROVAL_DRAFT_FIXTURE_ONLY_NO_EXECUTION`

## Purpose

CM-1697 turns the next VCPToolBox live-target-proof step into a fixture-only
execution approval draft contract.

Added:

- `src/core/VcpToolBoxLiveTargetProofExecutionApprovalDraft.js`
- `tests/vcp-toolbox-live-target-proof-execution-approval-draft.test.js`

The helper validates that a future execution approval packet draft is bounded,
low-disclosure, tied to CM-1694 approval-packet output, and still not executable.

It does not issue an exact approval line, grant live execution approval, execute
VCPToolBox, read memory, write memory, call providers, change runtime config, or
claim readiness.

## Draft Token

Fixture draft token:

```text
DRAFT_CM1697_VCPTOOLBOX_LIVE_TARGET_PROOF_EXECUTION_APPROVAL_PACKET_ONLY_NO_EXECUTION
```

Required operator decision:

```text
draft_execution_approval_packet_only_no_execution
```

This token means only:

```text
the execution approval packet draft shape is valid for future use
```

It does not mean that live execution is approved. A future live target proof
still requires a separate fresh exact operator approval line with target,
commit, expiry, and call-budget binding.

## Required Draft Shape

Top-level fields:

```text
schemaVersion
sourceSystem=VCPToolBox
executionApprovalDraftId
exactDraftToken
operatorDecision
referencedApprovalPacket
executionScope
currentFactsBinding
approvalLineTemplate
runtimeBudget
outputPolicy
receiptPlan
stopConditions
forbiddenExpansions
counters
```

The helper validates `referencedApprovalPacket` through the CM-1694 helper
before accepting the draft.

## Execution Scope

Required fields:

```text
approvalPacketId
proofPacketId
targetReferenceName
proofMode
proofProfile
allowedRuntimeActions
maxRuntimeCalls
noMemoryRead=true
noWrite=true
noProviderCall=true
noPublicMcpExpansion=true
noReadinessClaim=true
```

The execution scope must match the referenced CM-1694 approval packet and the
embedded CM-1693 proof packet. Runtime actions must match the proof packet
exactly.

## Current Facts Binding

Required fields:

```text
freshGitRequired=true
targetCommitPresent=true
targetCommitValueIncluded=false
originCommitPresent=true
originCommitValueIncluded=false
branchNamePresent=true
branchNameValueIncluded=false
worktreeStatusRequired=clean_before_execution
```

The draft may require those facts, but it must not contain real commit, origin,
or branch values.

## Approval Line Template

Required fields:

```text
exactApprovalLineTemplatePresent=true
exactApprovalLineValueIncluded=false
includesTargetBindingPlaceholder=true
includesCommitBindingPlaceholder=true
includesExpiryPlaceholder=true
includesCallBudget=true
oneTimeUseOnly=true
humanOperatorRequired=true
```

The draft records approval-line shape only. It must not persist an actual
approval line, approval phrase, approval text, or approval token value.

## Runtime Budget

Allowed draft budget:

```text
maxRuntimeProbeMinutes <= 10
maxRuntimeCalls <= 3
maxMemoryReadQueries=0
maxMemoryWrites=0
maxProviderCalls=0
```

The runtime call count must match the referenced proof packet budget.

## Output And Receipt Policy

Required output policy:

```text
lowDisclosureOnly=true
rawOutputPersistenceAllowed=false
secretValuesAllowed=false
rawMemoryAllowed=false
pathEndpointValueAllowed=false
```

Required receipt plan:

```text
postProofReceiptRequired=true
includeTargetClass=true
includeActionCounters=true
includeValidationResult=true
includeRawOutput=false
includeSecretValues=false
includeReadinessClaim=false
```

## Stop Conditions

All stop conditions must be `stop`:

```text
onMissingExactApproval
onDirtyWorktree
onTargetMismatch
onApprovalExpired
onUnexpectedRuntimeAction
onAnyMemoryRead
onAnyWrite
onAnyProviderCall
onRawOutput
```

## Forbidden Expansions

All must be false:

```text
allowExecutionWithoutFreshApproval
allowRuntimeWiring
allowConfigEnvRead
allowEnvFileRead
allowSecretMaterial
allowRawMemoryRead
allowMemoryRead
allowMemoryWrite
allowProviderCall
allowPublicMcpExpansion
allowReadinessClaim
allowRawOutputPersistence
allowApprovalLineValuePersistence
```

## Validation

Targeted validation:

```text
node --test tests/vcp-toolbox-live-target-proof-execution-approval-draft.test.js
node --test tests/vcp-toolbox-live-target-proof-execution-approval-draft.test.js tests/vcp-toolbox-live-target-proof-approval-packet-contract.test.js tests/vcp-toolbox-live-target-proof-packet-contract.test.js
npm test
```

Result:

```text
14/14 passed
36/36 passed
3414/3414 passed
```

Coverage:

- accepts execution approval draft without granting live execution
- rejects missing nested fields
- rejects invalid referenced approval packet without echoing private target
  values
- rejects unsafe draft id and draft token without echoing token value
- rejects approval line, endpoint, bearer token, and raw fields without echoing
  values
- rejects execution scope mismatch with referenced approval packet
- rejects current facts value disclosure and dirty worktree policy
- rejects stale approval-line template controls
- rejects runtime budget expansion to memory read/write/provider or too many
  calls
- rejects output and receipt policies that persist raw, secret, or readiness
  data
- rejects non-stop conditions and forbidden expansion flags
- rejects positive execution or approval counters
- locks draft vocabulary
- proves helper never performs runtime, provider, memory, public MCP, or
  approval issuance actions

## Boundary

CM-1697 did not:

- issue an exact approval line
- grant live execution approval
- execute live target proof
- call VCPToolBox
- inspect a real VCPToolBox path
- persist a real endpoint
- persist a secret
- read `config.env`
- read `.env`
- call MCP
- call providers
- read raw memory stores
- write memory
- wire runtime behavior
- expand public MCP tools
- claim production/release/cutover readiness

## Relationship To Vision Plan

CM-1697 closes Phase 1 of
`docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md` for the execution approval
draft layer.

It prepares the future exact-approved live target proof route without crossing
into Phase 3 execution.

## Next Step

Next safe local step:

```text
CM-1698 VCPToolBox exact target discovery packet preflight
```

CM-1698 should remain source/test/docs or docs-only unless Jenn gives a separate
exact approval for target-specific runtime inspection.
