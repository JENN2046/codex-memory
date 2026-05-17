# P57 Recall Isolation Runtime Proof Boundary Inventory

P57-T1 defines the boundary inventory for a future recall isolation runtime proof. It does not implement the runtime proof, does not run recall, and does not read real memory or runtime stores.

## Purpose

The future proof must show that governance records, validation transcripts, redaction samples, policy decisions, readiness reports, migration metadata, blocked memory, tombstoned memory, and out-of-scope memory do not enter:

- normal recall namespace
- vector index
- candidate cache
- ranking
- projection
- user-visible audit summary
- recall audit summary

P57-T1 only records the required proof surfaces, source evidence, fail-closed states, and blocked actions as local synthetic evidence.

## Boundary

P57-T1 is:

- fixture-only
- synthetic
- local-only
- boundary-inventory-only
- not runtime integrated
- not a recall runtime proof
- not a final RC matrix result

The fixture and tests must not:

- scan real memory
- read diary data
- read SQLite rows
- read vector index data
- read candidate cache data
- read recall audit data
- run provider calls
- write durable memory or audit records
- expand public MCP tools
- apply migration, import/export, backup, or restore
- start services or install watchdog/startup
- change config, dependencies, secrets, or environment files
- push, tag, release, or deploy

## Future Proof Requirements

A later runtime proof can only be considered after explicit scope is defined and after all required proof evidence is supplied:

- synthetic runtime harness plan
- instrumented namespace assertions
- vector exclusion assertions
- candidate cache exclusion assertions
- ranking exclusion assertions
- projection exclusion assertions
- user-visible audit summary exclusion assertions
- recall audit summary exclusion assertions
- negative controls for isolated record families
- positive control for active in-scope user memory
- no-durable-write evidence
- no-public-MCP-expansion evidence
- machine-readable contamination report

Until those exist and are actually executed under approved boundaries, recall isolation runtime proof remains blocked.

## Current Decision

Decision: `NOT_READY_BLOCKED`.

P57-T1 may support planning only. It must not be represented as runtime isolation, final RC readiness, or v1.0 RC readiness.
