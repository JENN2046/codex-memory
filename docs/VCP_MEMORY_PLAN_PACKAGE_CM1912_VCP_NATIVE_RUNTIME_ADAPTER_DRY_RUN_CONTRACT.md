# CM-1912 VCP Native Runtime Adapter Dry-Run Contract

Status: `COMPLETED_VALIDATED_VCP_NATIVE_RUNTIME_ADAPTER_DRY_RUN_CONTRACT_NO_RUNTIME_NO_WRITE_NO_APPROVAL_LINE`

## Scope

CM-1912 turns the CM-1911 `invocationPlan` into a local dry-run/no-call runtime adapter contract:

- Accepts the CM-1911 pre-runtime invocation plan shape directly as input.
- Verifies the plan still points at a read-only VCP native proof path.
- Verifies the hardcoded no-write/no-body-leak runtime wrapper budget remains intact.
- Enters the runtime adapter boundary only as `dryRunOnly`.
- Produces the required `dry_run_result` while keeping exact approval required.
- Fails closed on current exact approval, runtime authorization, body/log/endpoint/secret fields, positive side-effect counters, public MCP expansion, and readiness claims.

This is adapter contract work, not another readiness-blocked fixture layer and not an approval packet skeleton variant.

## Added Surfaces

- `src/core/VcpNativeRuntimeAdapterDryRunContract.js`
- `tests/vcp-native-runtime-adapter-dry-run-contract.test.js`

The module does not import network, process, filesystem, runtime, MCP memory, provider, or VCPToolBox client APIs.

## Dry-Run Result

Accepted CM-1912 output includes:

```yaml
dry_run_result:
  accepted: true
  wouldExecute: true
  runtimeExecuted: false
  liveVcpToolBoxCalled: false
  networkCalled: false
  requestBodyGenerated: false
  responseBodyRead: false
  memoryReadPerformed: false
  memoryWritten: false
  normalizedResultExpected: true
  exactApprovalStillRequired: true
```

`wouldExecute: true` means the plan has reached a runtime adapter contract boundary and could only proceed under a later exact-approved live mode. It is not execution authority.

## Explicit Non-Actions

CM-1912 did not execute runtime, call VCPToolBox, call MCP memory tools, read response bodies, read logs/stdout/stderr, read config/env/secrets, read raw private memory/raw stores/raw audit rows, run real queries, write memory, write durable state, write receipts, call providers/APIs, change config/startup/watchdog, expand public MCP, create/submit authorization requests, generate or submit request bodies, generate or submit approval lines, push, tag, release, deploy, cut over, claim readiness, claim `RC_READY`, claim production readiness, or claim full bridge completion.

## Validation

- `node --check src/core/VcpNativeRuntimeAdapterDryRunContract.js`
- `node --check tests/vcp-native-runtime-adapter-dry-run-contract.test.js`
- `node --test tests/vcp-native-runtime-adapter-dry-run-contract.test.js`
- `node --test tests/vcp-native-readonly-proof-path-gate.test.js tests/vcp-native-runtime-adapter-dry-run-contract.test.js`

Broader validation is recorded as `CMV-2015` in `.agent_board/VALIDATION_LOG.md`.

## Next Route

Next local-safe route: `CM-1913 Low-disclosure execution receipt schema`.

CM-1913 should define the low-disclosure execution receipt schema before any exact-approved live read-only proof. It must still avoid live runtime execution, VCPToolBox calls, public MCP expansion, write paths, approval-line/request-body generation, raw response/body/log persistence, config/startup/watchdog changes, and RC / production / cutover claims.
