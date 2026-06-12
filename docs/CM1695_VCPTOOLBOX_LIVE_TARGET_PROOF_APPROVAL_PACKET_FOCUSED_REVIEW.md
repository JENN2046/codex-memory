# CM-1695 VCPToolBox Live Target Proof Approval Packet Focused Review

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_LIVE_TARGET_PROOF_APPROVAL_PACKET_FOCUSED_REVIEW_REPAIRED`

## Purpose

CM-1695 reviews the CM-1694 fixture-only live target proof approval packet
contract and audits its execution boundary.

Review target:

- `src/core/VcpToolBoxLiveTargetProofApprovalPacketContract.js`
- `tests/vcp-toolbox-live-target-proof-approval-packet-contract.test.js`
- `docs/CM1694_VCPTOOLBOX_LIVE_TARGET_PROOF_APPROVAL_PACKET_CONTRACT.md`
- referenced CM-1693 proof packet contract boundary

## Finding

Finding: `ACTIONABLE_LOW_DISCLOSURE_BOUNDARY_GAP_REPAIRED`

The CM-1694 helper validated the referenced proof packet, approval scope,
commit/expiry presence flags, forbidden expansion flags, and zero counters.
However, the approval packet helper did not globally reject additional
secret/locator/raw-shaped fields on the approval packet itself.

Impact:

```text
A packet carrying extra fields such as endpoint, bearerToken, configEnvPath, or
rawDailyNoteContent could still be accepted if the required approval fields were
otherwise valid.
```

The accepted output did not echo those values, but accepting a packet that
contains them weakens the no-secret/no-raw approval-packet boundary.

## Repair

Updated `src/core/VcpToolBoxLiveTargetProofApprovalPacketContract.js`:

- added `FORBIDDEN_FIELD_NAMES`
- added recursive forbidden-field collection
- rejects approval packets containing locator, endpoint, config/env, token,
  secret, or raw memory shaped fields
- adds `forbiddenFields` to rejected output without echoing submitted values

Updated `tests/vcp-toolbox-live-target-proof-approval-packet-contract.test.js`:

- added CM-1695 regression coverage for extra `endpoint`, `bearerToken`,
  `configEnvPath`, and `rawDailyNoteContent`
- confirmed forbidden values are not echoed
- locked the new forbidden field vocabulary

## Execution Boundary Review

After repair, the helper remains fixture-only:

- live execution approval remains `false`
- runtime execution remains `false`
- live VCPToolBox call remains `false`
- live target proof remains `false`
- runtime wiring remains `false`
- `config.env` read remains `false`
- `.env` read/edit remains `false`
- raw memory read remains `false`
- memory write remains `false`
- provider/API call remains `false`
- public MCP expansion remains `false`
- readiness claim remains `false`

The CM-1694 token remains a contract-only token:

```text
APPROVE_CM1694_VCPTOOLBOX_LIVE_TARGET_PROOF_APPROVAL_PACKET_ONLY_NO_EXECUTION
```

It does not approve live execution. Future live target proof still requires a
separate fresh operator approval, fresh Git/runtime facts, and a runtime-specific
validation plan.

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-live-target-proof-approval-packet-contract.test.js
node --check src\core\VcpToolBoxLiveTargetProofApprovalPacketContract.js
```

Result:

```text
12/12 passed
```

Additional closeout validation should include:

```text
git diff --check
scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
changed-scope re-review
```

## Boundary

CM-1695 did not:

- approve live execution
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

## Next Step

Next safe local step:

```text
CM-1696 VCPToolBox live target proof execution approval packet draft
```

Actual live target proof remains approval-bound.
