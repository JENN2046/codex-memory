# Phase 2 Governed Native Read Observation Report

Task: `CM-2073`

Status: `PARTIAL_EVIDENCE_ACCEPTED_PHASE2_INCOMPLETE`

Supersession note: CM-2074 subsequently supplied the current Windows/WSL smoke
and applied the exact observed low-disclosure receipt set. See
`phase2_governed_native_read_evidence_application_report.md`. The CM-2073 report
remains the immutable observation-stage record.

## Scope

After Jenn enabled the execution environment, the default governed read-only MCP
surface was exercised through exactly three bounded calls:

- `search_memory`;
- `memory_overview`;
- `audit_memory`.

The retained evidence is category-only and low-disclosure. No query text,
response body, memory content, memory identifier, title, snippet, raw audit row,
filesystem path, token material, provider payload, endpoint, or locator is
recorded here.

## Observed Receipt Facts

All three calls were accepted and delegated to the VCPToolBox native memory
runtime. Each receipt bound the native target reference, invocation profile,
trusted client identity, strict project scope, visibility policy, read
authority, output-disclosure budget, audit requirement, and rollback posture.
Each call performed a native memory read and appended a local low-disclosure
audit receipt. No local fallback route was used.

Observed counters:

```text
MCP calls: 3
VCPToolBox/native runtime calls: 3
native read attempts/successes: 3/3
memory reads: 3
provider API calls: 3
isolated derived-index writes: 3
local low-disclosure audit appends: 3
primary memory-store writes: 0
memory writes: 0
native write attempts: 0
raw/private reads returned: 0
local fallback uses: 0
public MCP/default-runtime expansions: 0
tag/release/deploy/cutover actions: 0
readiness claims: 0
```

The observed derived-index persistence used an isolated runtime store. It is
not a primary memory-store write, native memory write proof, durable real-root
write proof, or Phase 8 evidence.

## Evidence Coverage

This observation provides candidate evidence for:

- native target binding;
- native read attempt and success;
- audit receipt creation;
- scope and visibility isolation;
- low-disclosure output behavior;
- WSL/Linux execution category.

It does not provide:

- a fresh exact approval-line receipt;
- fallback/native distinction proof;
- Windows-host-to-WSL smoke proof;
- receipt-bundle application to the completion audit.

Therefore `phase2GovernedNativeReadObservationPassed` is a required local
contract field, while Phase 2 remains incomplete.

## Incidental Bounded Preflight

An attempted `--help` invocation of the governed live-read proof CLI was not a
help-only path. It started and stopped one temporary isolated shim and then
failed closed because the required provider/runtime environment was absent.
That attempt performed zero memory reads, zero provider calls, and zero memory
writes. It is recorded for auditability and is not Phase 2 proof.

## Non-claims

This report does not claim Phase 2 completion, fallback proof, Windows/WSL
smoke proof, native write proof, production readiness, release readiness,
cutover readiness, `RC_READY`, full bridge completion, or full plan-pack
completion.
