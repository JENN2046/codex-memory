# Non-Claims

This file defines claims that `codex-memory` must not make unless a specific
gate and evidence artifact proves the narrower statement.

## Forbidden Claims

Do not claim:

```text
Codex has VCP complete realtime memory capability.
Codex has model-internal memory.
The production replacement is complete.
Native write production is accepted.
The default full surface is safe.
The project is tag or release ready without fresh gates.
Read proof is write proof.
Operator-only is Codex default.
Fixture proof is production-provider proof.
Fallback read is native realtime read.
The local memory store is the primary memory source.
codex-memory owns VCPToolBox memory intelligence.
EPA / Residual Pyramid / TagMemo advanced narratives are production memory intelligence.
prepare_memory_context requires a from-zero recall implementation.
propose_memory_delta is default production write.
```

## Required Claim Bindings

Every positive capability claim must include:

- date
- commit
- runtime
- evidence artifact
- gate result
- scope limitation

Examples:

```text
Default MCP surface is read-only at commit <sha>, verified by <gate>.
Native read path passed under runtime <runtime>, with evidence <artifact>.
Operator-only full surface passed local proof; Codex default remains read-only.
```

## Fallback Language

Fallback must be explicit.

Allowed:

```text
The request used local fallback.
The result is not native realtime evidence.
Fallback was used for offline continuity.
```

Forbidden when the result came from local fallback:

```text
Native realtime read succeeded.
VCP memory was read.
Production-provider proof passed.
```

## Memory Experience Language

Allowed:

```text
near-model-memory external runtime
near-model-memory experience
task-start governed memory context
external long-term memory runtime
```

Forbidden:

```text
true model memory
model-internal memory
perfect memory
unbounded complete memory
```

## Write Language

Allowed after proof:

```text
operator-only full surface passed local proof
native write production proof passed under specified runtime
```

Forbidden before proof:

```text
native write production ready
default write surface ready
destructive mutation is safe by default
```

## Current Policy

Until later gates pass, the default Codex runtime policy is:

```text
read-only by default
native read proof required for realtime claims
memory context package required for near-model-memory claims
proposal-only memory delta before production write
operator-only full surface only after explicit proof
existing local memory, SQLite shadow, vector index, recall pipeline, and write governance retained as support pipelines
VCPToolBox native memory remains final memory intelligence owner
EPA / Residual Pyramid / TagMemo advanced narratives treated as experimental recall heuristics
```
