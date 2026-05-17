# P38 Recall Isolation Fixtures

Status: fixture-only / synthetic planning contract.

P38 proves isolation expectations with committed synthetic fixtures only. It does not implement recall runtime isolation and does not touch real memory, vector index, candidate cache, diary, ranking, projection, or audit summary paths.

## Isolated Surfaces

These record kinds must not enter normal recall namespaces or recall-adjacent surfaces:

- governance records
- validation transcripts
- redaction samples
- policy decisions
- blocked memory
- tombstoned memory
- out-of-scope memory

They are excluded from:

- normal recall namespace
- candidate cache
- ranking
- projection
- audit summary

## Control Case

The fixture includes one positive control: active in-scope user memory may enter normal recall surfaces. This prevents the contract from becoming an all-records-denied placeholder.

## Evidence

The committed fixture contract is [p38-recall-isolation-v1.json](/A:/codex-memory/tests/fixtures/p38-recall-isolation-v1.json).

The focused test is [p38-recall-isolation-fixture.test.js](/A:/codex-memory/tests/p38-recall-isolation-fixture.test.js).

## Non-Goals

P38 does not:

- implement recall runtime isolation
- read real memory content
- write durable memory or audit state
- alter vector, candidate, diary, ranking, projection, or audit summary paths
- expand public MCP tools or schemas
- call providers or models
- run migration/import/export/backup/restore
- claim v1.0 RC or runtime readiness
