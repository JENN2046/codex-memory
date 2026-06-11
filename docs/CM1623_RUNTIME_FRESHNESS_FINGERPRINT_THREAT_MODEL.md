# CM-1623 Runtime Freshness Fingerprint Threat Model

Date: 2026-06-11

## Decision

`/health.runtimeFreshness.sourceFingerprint` is classified as a bounded public runtime freshness signal for the scoped local HTTP runtime contract.

It is not classified as token material, provider/API material, raw memory, raw audit, filesystem path disclosure, memory id disclosure, or production readiness evidence.

This decision preserves the current no-token `/health` behavior so local freshness guards can compare the running HTTP process with the current source fingerprint without requiring bearer-token material.

## Boundary

Allowed no-token health fields remain bounded to:

- algorithm
- sourceFingerprint
- sourceFileCount
- startedAt

The fingerprint is a SHA-256 digest over a fixed runtime source set. It does not include file paths in the public projection.

## Non-Claims

This decision does not claim:

- source freshness is proof of production readiness
- source freshness is proof of release readiness
- source freshness is proof of cutover readiness
- source freshness is proof that live clients are connected
- source freshness is proof that memory tools are safe to execute
- source freshness is proof of broad `record_memory` reliability
- source freshness is proof of complete V8

## Rejected Interpretation

The runtime freshness fingerprint must not be treated as:

- bearer token material
- provider credential material
- raw memory content
- raw audit content
- local filesystem path
- complete runtime attestation
- release/cutover approval

## Future Hardening Option

If the project later adopts a stricter public-health policy for production-like environments, the next safe design would be:

```text
no-token /health:
  sourceFingerprintReturned: false
  sourceFileCount retained or bucketed

bearer /health:
  sourceFingerprintReturned: true
```

That behavior change should be handled as a separate source/test slice because it may affect existing freshness guards and live-runtime validation scripts.

## Validation

This is docs-only threat-model clarification. Existing source behavior and tests remain unchanged.

Relevant existing validation from CM-1622 and prior runtime freshness tests confirms:

- `buildRuntimeFreshness(...)` returns bounded fields
- source fingerprint is deterministic SHA-256
- tests assert the health projection exposes bounded runtime freshness metadata
- no token, provider, raw memory, raw audit, or filesystem path fields are exposed by the runtime freshness projection

No live HTTP probe, bearer-token use, provider/API call, memory tool call, raw store scan, config/watchdog/startup change, public MCP expansion, release/tag/deploy, production readiness claim, release readiness claim, cutover readiness claim, or complete V8 claim occurred.
