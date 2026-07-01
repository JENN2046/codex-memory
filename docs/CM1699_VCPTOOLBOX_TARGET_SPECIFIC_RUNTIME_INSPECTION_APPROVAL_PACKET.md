# CM-1699 VCPToolBox Target-Specific Runtime Inspection Approval Packet

Date: 2026-07-02

Status:
`COMPLETED_VALIDATED_VCPTOOLBOX_TARGET_SPECIFIC_RUNTIME_INSPECTION_APPROVAL_PACKET_FIXTURE_ONLY_NO_EXECUTION`

## Purpose

CM-1699 adds a fixture-only approval packet contract for a future
target-specific VCPToolBox runtime inspection.

It consumes the accepted CM-1698 exact target discovery packet shape and
validates whether a future approval packet is structurally bound to that
discovery packet.

It does not issue an approval line, consume an approval line, inspect a real
target, call VCPToolBox, read memory, write memory, call a provider/API, expand
public MCP tools, or claim readiness.

## Added Surfaces

- `src/core/VcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket.js`
- `tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js`

The contract mode is `fixture_approval_packet_only`.

The exact fixture token is:

```text
APPROVAL_CM1699_VCPTOOLBOX_TARGET_SPECIFIC_RUNTIME_INSPECTION_PACKET_ONLY_NO_EXECUTION
```

The accepted operator decision is:

```text
approve_target_specific_runtime_inspection_packet_only_no_execution
```

## Accepted Packet Shape

An accepted packet must include:

- a valid referenced CM-1698 discovery packet;
- a safe approval packet id and safe operator intent;
- approval scope matching the referenced discovery packet id, target reference
  name, target kind, discovery source, and requested profile;
- runtime budget capped at three runtime calls and ten probe minutes;
- zero memory read queries, zero memory writes, and zero provider calls;
- current Git facts represented by presence flags only;
- branch, target commit, origin commit, and expiry values omitted;
- execution authorization flags all false;
- low-disclosure output policy;
- receipt plan that excludes raw output, secret values, and readiness claims;
- fail-closed stop conditions;
- forbidden expansion flags all false;
- zero execution counters.

Accepted output returns only sanitized ids, target class metadata, profile name,
presence/value-included flags, budget counts, and false execution/readiness
booleans.

## Rejection Boundary

The helper rejects:

- invalid referenced discovery packets;
- unsafe source, approval id, operator decision, or operator intent values;
- approval-line values, endpoint/path/url/config/env/token/secret/key/password
  fields, raw target values, raw runtime responses, raw DailyNote/RAG/vector/
  prompt/conversation fields, commit values, branch values, and expiry values;
- approval scope drift from the referenced discovery packet;
- current-facts value disclosure or dirty-worktree policy;
- expired approval flags or expiry-value inclusion;
- execution authorization flags that grant runtime inspection, live probe,
  memory read, write, provider call, public MCP expansion, approval-line issue,
  or approval-line consumption;
- runtime budget expansion;
- output/receipt policies that allow raw, secret, memory, path/endpoint,
  runtime-response, or readiness data;
- non-stop stop conditions;
- forbidden expansion flags;
- non-zero execution counters.

Rejected output remains low-disclosure and does not echo submitted private
locator, endpoint, secret, approval-line, commit, branch, expiry, raw runtime,
or unsafe alias values.

## Validation

Targeted validation:

```bash
node --test tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js
```

Result: passed `15/15`.

Adjacent VCPToolBox chain validation:

```bash
node --test tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js tests/vcp-toolbox-live-target-proof-execution-approval-draft.test.js
```

Result: passed `43/43`.

Default validation:

```bash
npm test
```

Result: passed `3443/3443`.

## ColaMeta Boundary

ColaMeta prompt preview used:

```text
prompt_preview_CM_1699_vcptoolbox_t_20260701T181829_98e875eb
```

No ColaMeta executor run occurred.

No prompt file was applied.

No managed-project apply step occurred.

## Boundary Receipt

No target-specific runtime inspection occurred.

No exact approval line was issued or consumed.

No live VCPToolBox call occurred.

No real path, endpoint, config/env, token, secret, approval line, commit value,
branch value, expiry value, or raw memory/runtime value was persisted.

No `config.env` or `.env` file was read or edited.

No memory read, memory write, provider/API call, durable audit write, public MCP
expansion, push, PR, release, deploy, cutover, production readiness claim,
release readiness claim, or complete V8 claim occurred.

## Next Route

The next safe local route is an exact runtime-inspection execution approval
draft or no-memory inspection proof preflight, likely `CM-1700`.

That future route must still require a separate explicit approval before any
real VCPToolBox target inspection, live runtime call, memory read, write,
provider/API call, public MCP expansion, or readiness claim.
