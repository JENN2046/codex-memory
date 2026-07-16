# Diary Scope Enforcement v1

`diary_allowlist_v1` makes a selected diary partition the native enforcement
unit. It does not implement record, file, chunk, or `scope_id` ACLs.

## Startup binding

The bridge receives `expectedDiaryScopeMappingReference` and
`expectedDiaryScopeMappingDigest` from trusted constructor/static config. The
shim loads one mapping from constructor injection or the dedicated
`--diary-scope-mapping` path. A configured invalid mapping fails startup; an
unconfigured mapping permits startup but every governed native read is denied.
Mappings are startup-only and are never hot reloaded.

The bridge and shim compare the exact reference and SHA-256 digest internally.
Public results and receipts expose only bound/matched booleans and counts, not
the digest or diary names.

## Read order

The governed native read order is:

1. accept trusted `client_id`, `project_id`, `workspace_id`, and visibility;
2. resolve the mapping and require a non-empty allowlist of at most eight diaries;
3. request the query embedding;
4. call only `KnowledgeBaseManager.search(allowedDiaryNames, vector, limit, 0, [])`;
5. validate every result source against the allowlist;
6. apply the low-disclosure projection.

There is no governed global native search or global native fallback. A missing,
empty, invalid, ambiguous, or mismatched mapping fails before provider/native
execution. One invalid result source rejects the whole call.

## Scope semantics

- `private` resolves the most-specific current-client private partition.
- `project` and `workspace` require their corresponding trusted identifiers.
- `shared` includes matching trusted project/workspace partitions and requires
  at least one result.
- task-start context always requires current-client private and conditionally
  appends trusted project/workspace partitions.
- `scope_id` remains fingerprint-bound and audited but never changes the diary
  allowlist and is not claimed as enforced ACL.

`resolveWrite()` is a pure resolver only in this stage. It does not place a
proposal, call native write, migrate data, or activate runtime configuration.

## Repository artifacts

- JSON schema: `schemas/diary-scope-mapping-v1.schema.json`
- Redacted example: `examples/diary-scope-mapping-v1.redacted.example.json`

No live mapping, diary inventory, provider response, raw memory, or runtime
configuration is committed. Production, release, cutover, and readiness remain
false.
