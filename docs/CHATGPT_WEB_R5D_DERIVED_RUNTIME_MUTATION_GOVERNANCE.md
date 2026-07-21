# ChatGPT Web R5-D Derived Runtime Mutation Governance

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Source status: `IMPLEMENTED_LOCAL_VALIDATION_RUNTIME_PROOF_PENDING`

R5-D corrects an over-strict interpretation used by the R5-C runtime gate.
VCPToolBox can remain read-only with respect to primary memory while still
maintaining an isolated runtime store. Startup schema checks, selected-diary
index hydration, in-memory caches, vector/tag persistence, and TagMemo matrix
refresh are derived runtime mutations. Treating all of them as forbidden made
normal VCP operation look like a security failure and allowed an interim
receipt to be misread as a final zero-mutation claim.

R5-D does not authorize primary memory writes. It makes the derived effects of
an already authorized selected-diary read explicit, bounded, and auditable.

## Mutation boundary

The governed policy is `isolated_derived_runtime_mutation_v1`. It is enabled
only when all of these conditions hold:

- the native shim is read-only and has no public write surface;
- an isolated runtime store is explicitly configured;
- diary mapping reference and digest are bound before runtime initialization;
- the selected-diary allowlist contains 1–8 authorized targets;
- full/global startup scan is disabled;
- broad source and runtime-config watchers are stopped before provider use, and
  any already queued source event rejects the read;
- primary memory, source partitions, legacy, ambiguous, and unregistered
  partitions remain immutable and inaccessible;
- native search uses the selected-diary array form and never the global form.

The only accepted low-disclosure trigger categories are:

```text
startup
hydration
cache
vector
tag
matrix
```

An unknown category, missing authorization, non-isolated store, or policy-name
mismatch fails closed before the operation is admitted.

## Lifecycle accounting

The shim wraps actual VCP lifecycle points without modifying VCPToolBox core:

- runtime initialization;
- first-load selected-diary hydration;
- SQLite-to-vector recovery;
- diary date-cache population;
- vector/tag index persistence;
- queued EPA/vector work;
- TagMemo matrix rebuild;
- VCP shutdown persistence.

Each admitted operation is counted when it begins and then recorded as active,
completed, or failed. Per-read receipts carry both a cumulative count and a
delta since the previous receipt. Trigger details, diary names, paths, mapping
values, queries, result text, and provider responses are never projected.

An interim receipt is never a final zero claim. A zero claim is valid only on
the final shutdown receipt after background work has drained. The bridge
rejects contradictory evidence, including:

- a positive lifecycle count paired with `derivedIndexWritePerformed=false`;
- a zero lifecycle count paired with derived-write flags or trigger categories;
- impossible active/completed/failed totals;
- duplicate or unknown trigger categories;
- a final receipt issued before drain;
- source-partition work pending at shutdown.

The current receipt treats any admitted derived lifecycle event
conservatively as an isolated derived-index mutation. This prevents false-zero
claims even when the underlying VCP operation is an in-memory hydration or a
durable SQLite/index refresh. It is not a primary-memory write and cannot be
used as native-write proof.

## Shutdown and receipt chain

Governed shutdown blocks new queued derived work, cancels future scheduling,
waits for in-flight operations, invokes VCP shutdown while accounting remains
active, cancels any follow-up scheduling, and emits the final drain receipt.
Pending source-file work makes shutdown fail closed and the failure remains
sticky on retry.

The read receipt, bridge receipt, private dogfood observation, and final drain
receipt form one low-disclosure lifecycle chain. R5-A no longer rejects a
nonzero derived counter by itself; it requires matching isolated authorization,
trigger, count, completion, and no-source/no-global/no-legacy evidence. Missing
or forged evidence latches the observation closed.

## R5-C interpretation

The owner-only R5-C artifact is preserved unchanged. R5-D supersedes only its
policy interpretation and its inaccurate zero-derived-write claim: the
observed isolated background matrix refresh was a normal VCP derived-runtime
mutation, not a primary-memory write. A new owner-only R5-D runtime proof is
still required before this source contract is treated as live evidence.

## Non-claims

R5-D does not add a public MCP tool or schema, enable memory write, modify
VCPToolBox core, authorize migration, access legacy memory, deploy production,
release, cut over, or claim readiness. Until the post-merge private proof is
complete, runtime verification remains pending.
