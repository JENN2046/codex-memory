# 09｜给 Codex 的执行任务书

## 角色

You are implementing `codex-memory` as a governed external memory runtime for Codex.

The goal is not to claim true model-internal memory.

The goal is to provide a near-model-memory experience through:

- governed VCPToolBox native memory access
- read-only native realtime proof
- memory context package
- task-start automatic recall
- memory delta proposal
- staged operator-only full surface
- native write production proof

## Hard Boundaries

Do not:

```text
claim production replacement
create release/tag
enable default full write surface
expose tombstone/supersede by default
return endpoint/token/raw provider payload/raw memory/raw audit
treat fallback as native realtime
modify VCPToolBox native source unless explicitly authorized
perform real production write without exact approval
```

## Batch 1｜Fix blockers and freeze goal

### Objective

Make the project safe enough to re-enter fresh gates.

### Tasks

1. Add or update goal docs:
   - `docs/CODEX_MEMORY_FINAL_GOAL.md`
   - `docs/CAPABILITY_LAYER_MODEL.md`
   - `docs/NON_CLAIMS.md`

2. Fix hardened MCP surface:
   - If `securityProfile === "hardened"`, public tools must be read-only regardless of:
     - `mcpPublicToolSurface`
     - `exposeControlledMutationMcpTools`
     - `exposeWriteMcpTools`
     - `mcpPublicToolNames`
     - `CODEX_MEMORY_MCP_PUBLIC_TOOLS`

3. Add regression tests for hardened explicit public tools.

4. Fix `AtomicFileWriter` stale lock cleanup:
   - stale deletion must compare observed metadata before unlink.
   - do not delete a later owner lock.

5. Add TOCTOU regression test.

6. Run:
   ```bash
   npm run test:all
   npm run gate:ci -- --json
   git diff --check
   ```

7. Update README non-claims.

8. Produce closeout.

### Acceptance

```text
hardened explicit tools bypass impossible
stale cleanup cannot delete later owner lock
test:all PASS
gate:ci PASS
README no overclaim
```

---

## Batch 2｜prepare_memory_context MVP

### Objective

Build the first version of memory context package.

### Tasks

1. Add tool definition:
   - `prepare_memory_context`

2. Make it:
   - read-only
   - default exposed
   - no durable mutation
   - low-disclosure

3. Build context package:
   - must_know
   - recent_decisions
   - current_state
   - blockers
   - risks
   - forbidden_assumptions
   - recommended_next_step
   - source_breakdown
   - audit_receipt

4. Tests:
   - native success
   - fallback label
   - empty memory
   - stale memory
   - conflict memory
   - private isolation
   - oversized compression
   - low-disclosure

5. Produce MVP report.

### Acceptance

```text
prepare_memory_context can be used at task start
fallback is explicit
scope isolation holds
raw sensitive fields not returned
```

---

## Batch 3｜Memory Delta Proposal

### Objective

Let Codex propose what should be remembered after a task, without writing production memory by default.

### Tasks

1. Add `propose_memory_delta`.
2. Ensure proposal-only.
3. Add schema fixtures.
4. Add tests:
   - no durable mutation
   - evidence required
   - low-disclosure
   - no raw sensitive content
5. Draft `commit_memory_delta` contract but do not enable production write.

### Acceptance

```text
Codex can propose memory delta safely.
No production write occurs by default.
```

---

## Batch 4｜Operator-only Full Surface

### Objective

Prove full surface can be exposed only under explicit operator configuration.

### Tasks

1. Prove:
   - record_memory
   - validate_memory
   - tombstone_memory
   - supersede_memory

2. Require:
   - explicit env
   - not hardened
   - audit receipt
   - exact approval where applicable
   - rollback posture

3. Tests:
   - hardened stays read-only
   - operator full surface works
   - no approval means no durable destructive mutation

### Acceptance

```text
operator-only full surface usable
default Codex still read-only/context-only
```

---

## Batch 5｜Native Write Production Proof

### Objective

Prove governed native production write under real runtime.

### Tasks

1. Define:
   - prepare_write
   - commit_write
   - verify_write
   - rollback_or_compensate

2. Prove:
   - exact approval
   - native side-effect receipt
   - real-root durable write
   - audit receipt
   - rollback posture
   - failure recovery
   - output disclosure budget

3. Produce proof artifact.

### Acceptance

```text
native write production proof can pass without over-disclosure or unbounded mutation.
```
