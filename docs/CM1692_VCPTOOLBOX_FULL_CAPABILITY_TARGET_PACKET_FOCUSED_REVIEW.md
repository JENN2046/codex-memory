# CM-1692 VCPToolBox Full-Capability Target Packet Focused Review

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_TARGET_PACKET_FOCUSED_REVIEW_REPAIRED_LOW_DISCLOSURE_ALIAS_BOUNDARY`

## Purpose

CM-1692 reviews the CM-1689 through CM-1691 VCPToolBox full-capability source
contracts before any live target proof is considered.

Reviewed:

- `src/core/VcpToolBoxFullCapabilityBridgePlan.js`
- `src/core/VcpToolBoxRuntimeTargetLocatorPreflight.js`
- `src/core/VcpToolBoxRuntimeTargetOperatorPacket.js`
- `tests/vcp-toolbox-full-capability-bridge-plan.test.js`
- `tests/vcp-toolbox-runtime-target-locator-preflight.test.js`
- `tests/vcp-toolbox-runtime-target-operator-packet.test.js`

## Finding

The helpers already rejected forbidden field names such as `endpoint`, `path`,
`bearerToken`, `configEnvPath`, and raw memory fields. The remaining gap was
that operator-controlled alias fields could carry locator-shaped or
secret-shaped values while still being echoed in sanitized outputs.

Affected value fields:

- `target.referenceName`
- `candidateTargets[].referenceName`
- `packetId`
- `operatorIntent`

Impact if unfixed:

- a user-provided alias could contain a path, URL, or token-like string
- rejected `lowDisclosureProjection` could echo unsafe alias values
- accepted operator packet output could echo raw `operatorIntent`

## Repair

Added:

- `src/core/VcpToolBoxSafeReference.js`

The shared guard now requires:

- `referenceName` and `packetId` to be safe short aliases:
  `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`
- alias and intent values must not contain URL, filesystem path, `config.env`,
  `.env`, bearer, token, secret, API key, private key, or password-shaped
  content
- `operatorIntent` remains required but is capped and not returned verbatim in
  accepted output; accepted packet output uses `operatorIntentPresent=true`

Changed behavior:

- CM-1689 rejects unsafe `target.referenceName`
- CM-1690 rejects unsafe candidate `referenceName`
- CM-1691 rejects unsafe `packetId`, `operatorIntent`, and target
  `referenceName`
- rejected low-disclosure projections only echo safe aliases; unsafe aliases
  are projected as `null`

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-full-capability-bridge-plan.test.js tests\vcp-toolbox-runtime-target-locator-preflight.test.js tests\vcp-toolbox-runtime-target-operator-packet.test.js
```

Result:

```text
32/32 passed
```

Coverage added:

- CM-1689 rejects locator-shaped `target.referenceName` without echo
- CM-1690 rejects locator-shaped candidate `referenceName` without echo
- CM-1691 rejects locator/secret-shaped `packetId`, `operatorIntent`, and
  `target.referenceName` without echo
- CM-1691 accepted output no longer returns raw `operatorIntent`

## Post-Fix Re-Review

Re-review result: no actionable findings in the changed CM-1689 through CM-1691
focused scope.

Checked:

- no runtime wiring was added
- no live VCPToolBox target was inspected or called
- no `config.env` or `.env` read path was added
- no provider/API calls were added
- no real memory read/write path was added
- no public MCP tool/schema expansion occurred
- no readiness, production, release, or cutover claim was made

## Boundary

CM-1692 did not:

- receive or persist a real VCPToolBox path
- receive or persist a real endpoint
- receive or persist a token or secret
- read `config.env`
- read `.env`
- start or call VCPToolBox
- call MCP
- call providers
- read raw memory stores
- write memory
- wire runtime behavior
- expand public MCP tools
- claim live target proof
- claim production/release/cutover readiness

## Next Step

Any future live target proof remains separate and approval-bound. The next safe
local step is a docs-only or fixture-only live target proof packet that names the
allowed proof surface without executing it.
