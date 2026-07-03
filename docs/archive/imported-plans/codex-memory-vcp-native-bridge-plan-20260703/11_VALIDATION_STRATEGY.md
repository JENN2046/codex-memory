# Validation Strategy

## Unit

Purpose: verify request normalization, policy decisions, client_id/scope/visibility checks, receipt envelope validation, and fallback markers.

Allowed before live approval:

- pure unit tests;
- schema fixtures;
- negative L4 tests;
- no network/runtime/provider/API calls.

## Integration

Purpose: validate MCP request paths and local fallback behavior without touching VCPToolBox live memory unless exact-approved.

Guardrails:

- use temp DB / fixture stores;
- no `.env` / token / credential reads;
- no raw private memory;
- no provider smoke or benchmark unless exact-approved.

## Fixture

Purpose: keep fast regression gates, but label them correctly.

Rules:

- fixture-only results must never be called live proof;
- approval request display / template / boundary tests are not runtime authorization;
- fixture counts are useful only as static safety evidence.

## Dry-run

Purpose: prepare mutation, migration, backfill, import/export, and query quality without durable runtime effects.

Rules:

- dry-run output must include fallback/rollback posture;
- dry-run must fail if it would require unapproved scope expansion.

## Live exact-approved

Purpose: prove target binding, read shape, trusted-full-read, and later writes under explicit boundaries.

Required packet:

```yaml
live_packet:
  target_alias: exact
  transport: exact
  client_id: exact
  scope: exact
  visibility: exact
  profile: exact
  max_calls: exact
  max_results: exact
  max_duration: exact
  output_disclosure: exact
  allowed_actions: exact
  forbidden_actions: exact
  stop_conditions: exact
  receipt_required: true
```

Live proof sequence:

1. observe-lite: target/handshake only, no memory read/write.
2. observe-full read shape: bounded shape/metadata, no write.
3. trusted-full-read: sustained workflow, no write.
4. write proposal: no durable write.
5. bounded write: only after exact Jenn write boundary approval.

## Regression

Recommended families:

- source-of-truth consistency;
- README/STATUS/taskboard drift detection;
- L4 stop matrix;
- client_id isolation;
- scope/visibility expansion;
- fallback marker correctness;
- response normalization;
- audit receipt schema;
- query quality fixture/local temp DB;
- no readiness overclaim lint.

## Security

Hard-fail cases:

- secrets/tokens/credentials/cookies;
- `.env` access;
- raw private runtime/memory reads;
- unbounded scans;
- cross-client private leakage;
- irreversible deletion;
- runtime config/service/startup mutation;
- provider/API calls without exact approval.

## Governance

Governance validation must prove:

- L0-L3 in-boundary operations self-approve;
- L4 operations fail closed;
- boundary expansion requires Jenn;
- every operation has receipt;
- no routine operation requires Jenn per-call confirmation when inside approved boundary.

## Release candidate

RC gate requires:

- fresh git snapshot;
- docs matching runtime evidence;
- no P0/P1 open risk;
- live proof chain complete;
- rollback posture validated;
- dedicated approval packet.

This package authorizes none of the release actions.
