# Executive Decision

## Recommended strategy

Adopt the new route:

```yaml
strategy: VCP-native-first governed memory bridge
north_star:
  VCPToolBox: owns memory intelligence
  codex-memory: owns memory governance
  Codex_Claude: consume memory through governed MCP tools
```

## What changes

1. The primary objective changes from local VCP memory reimplementation / parity clone to governed invocation of VCPToolBox native memory.
2. DeepMemo / TopicMemo / TagMemo / DailyNote / KnowledgeBase / RAG-like intelligence should be treated as VCPToolBox-native capabilities first.
3. codex-memory should provide:
   - MCP entrypoint governance.
   - profile / target / scope / client_id / visibility policy.
   - bounded autonomous approval.
   - L4 hard stops.
   - audit receipts.
   - result normalization.
   - fallback local memory.
   - AGENTS OS sustained workflow bridge.
4. Local parity work becomes fallback / audit / validation / compatibility substrate, not the product center.

## What remains

Local memory remains useful for:

- offline fallback when VCPToolBox is unavailable or not approved;
- audit and receipt persistence;
- fixture and regression testing;
- compatibility with existing MCP `record_memory`, `search_memory`, `memory_overview` flows;
- rollback-ready dry-runs;
- validating query quality without touching private VCP runtime;
- supporting no-live-call development and CI gates.

## What must stop

- Treating VCP memory practical parity as the primary roadmap.
- Expanding local DeepMemo/TopicMemo/TagMemo clone behavior before VCP native capability inventory.
- Calling fixture-only or approval-packet gates “live VCP proof.”
- Publishing production/release/cutover readiness based on docs-only or no-runtime validation.
- Designing every normal memory operation to wait for Jenn manual confirmation.

## Immediate next move

Proceed with:

1. M0 Repository Reality Calibration.
2. M1 Strategy Pivot Alignment.
3. M2 Documentation Source-of-Truth Synchronization.

Do not start live VCP observe-lite proof, write proof, production hardening, public MCP expansion, release candidate, or cutover work before M0-M2 are complete and M3 exact approval boundaries are drafted.

## Evidence level

- Strategy: `assumed from user strategy`.
- Need to pivot: `verified from repository` + `inferred from docs`.
- Current implementation/live proof limits: `verified from repository snapshot`.
- VCPToolBox capability details: `unresolved` until exact-approved inventory/proof.
