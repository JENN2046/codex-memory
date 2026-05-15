# VCP Memory Practical Parity Roadmap

Status: source of truth for long-term post-P9 roadmap.
Last updated: 2026-05-14.

This document is the single long-form roadmap for `codex-memory` after P9 scoped memory runtime integration. Other docs should link here or summarize the current priority only. Do not copy the whole roadmap into README, backlog, or `.agent_board`.

## Route

```text
current: P16 TagMemo / semantic association parity planning
target: VCP memory practical parity 100%
```

Strategy:

1. First harden safety boundaries.
2. Then harden read/write policy.
3. Then add memory lifecycle.
4. Then align the VCP object model.
5. Then close TagMemo / DeepMemo feel gaps.
6. Finally handle advanced intelligence, migration, UI, and release.

Near-term priority:

```text
P16
```

Current status note:

- P10 safety/runtime policy gates are complete.
- P11 lifecycle read-policy loop is complete.
- P12 controlled write tools reached internal `validate_memory` service + internal CLI wrapper.
- `validate_memory` remains internal-only.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- P13 object-model fixture / dry-run sequence is complete through migration-readiness reporting.
- P14 donor behavior parity standing gate is complete with compare `43/43 matched` and rollback `43/43 rollback-ready`.
- P15 query-quality gate is complete through fixture recall dry-run standing signal `14/14`.
- P16 is planning TagMemo / semantic association parity in [P16_TAGMEMO_SEMANTIC_ASSOCIATION_PARITY_PLAN.md](/A:/codex-memory/docs/P16_TAGMEMO_SEMANTIC_ASSOCIATION_PARITY_PLAN.md).

Do not jump early to:

```text
P17 / V8 / UI
```

Those stages require P16 fixture-backed evidence first.

---

## P10 — Memory Policy Hardening Runtime Gate

Direction / 方向:
Harden the current scoped memory runtime without changing the public MCP tool surface.

Focus / 重点:
- Secret-like write rejection before diary writes.
- Runtime schema validation for MCP `tools/call`.
- HTTP auth hardening for non-loopback hosts.
- Default-off soft read policy.
- Fixture-only recall dry-run for query validation.

Done When / 完成标志:
- Secret-like `title/content/evidence/tags` writes are rejected before diary write.
- Unknown fields, enum mismatches, and invalid scope return `-32602`.
- Non-loopback HTTP with empty token fails fast.
- `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false` remains default.
- Query dry-run remains fixture-only and non-mutating.

Risk / 风险级别:
A2-A3.

Validation / 建议验证:
- `node --test tests\security-write-policy.test.js`
- `node --test tests\mcp-contract.test.js`
- `node --test tests\mcp-http.test.js`
- `node --test tests\policy-read-preflight.test.js`
- `npm test`
- `npm run gate:mainline:strict`
- `npm run scope:acceptance -- --json`

Not Before / 前置条件:
P9 scoped memory runtime must be integrated and strict mainline gate must pass.

---

## P11 — Memory Lifecycle Core

Direction / 方向:
Turn governance state into a controlled lifecycle model without adding public write tools yet.

Focus / 重点:
- Internal lifecycle states for active, proposal, rejected, tombstoned, superseded, and stale.
- Lifecycle transition rules and audit shape.
- Read-only lifecycle inspection.
- Fixture-backed lifecycle transition tests.

Done When / 完成标志:
- Lifecycle states have one canonical source and validation contract.
- Read paths can distinguish lifecycle state without guessing.
- Transition simulation is covered by fixture tests.
- No automatic lifecycle mutation happens without an explicit controlled path.

Risk / 风险级别:
A2-A3.

Validation / 建议验证:
- Lifecycle unit tests.
- Policy preflight tests.
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P10 runtime gate is validated and documented. Soft read policy default-off behavior must remain stable.

---

## P12 — Controlled Write Tools Expansion

Direction / 方向:
Decide whether and how to add controlled governance write capability after lifecycle rules are stable.

Focus / 重点:
- Propose/review/supersede/tombstone flow design.
- Strict permission and audit boundaries.
- Human-review-first write path.
- Compatibility with current `record_memory` contract.

Done When / 完成标志:
- Any proposed new public tool is separately approved.
- Tool schemas are strict and audited.
- Writes are reversible or traceable.
- Existing public tools remain compatible.

Risk / 风险级别:
A3-A4.

Validation / 建议验证:
- MCP contract tests.
- Governance write fixture tests.
- Audit redaction tests.
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P11 lifecycle core must be complete. Do not add public MCP tools before lifecycle semantics and rollback story are clear.

---

## P13 — VCP-Compatible Memory Object Model

Direction / 方向:
Align stored memory records with a practical VCP-compatible object model while preserving local-first behavior.

Focus / 重点:
- Canonical memory identity and version fields.
- Source, scope, lifecycle, audit, and supersession metadata.
- Import/export-safe JSON shape.
- Backward-compatible diary and SQLite mapping.

Done When / 完成标志:
- Object model is documented and fixture-tested.
- Existing records can be read without migration breakage.
- New records can round-trip through diary, SQLite, audit, and export fixtures.

Risk / 风险级别:
A3.

Validation / 建议验证:
- Object-model fixture tests.
- Scope rebuild tests.
- Shadow compare.
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P10 and P11 must be stable. Avoid object-model churn before lifecycle semantics settle.

---

## P14 — VCP Donor Behavior Parity Gate

Direction / 方向:
Make donor compatibility measurable as a standing gate instead of scattered case checks.

Focus / 重点:
- DeepMemo / TopicMemo donor edge cases.
- Passive memory query syntax.
- Error envelope and `meta` placement.
- Compare/rollback suite expansion.

Done When / 完成标志:
- Donor parity suite has coverage targets.
- New edge cases land with compare and rollback expectations.
- Known intentional differences are documented.

Risk / 风险级别:
A2-A3.

Validation / 建议验证:
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P13 object model should be stable enough that parity fixtures are not rewritten repeatedly.

---

## P15 — Real Query Quality Gate

Direction / 方向:
Move from fixture assertion to trustworthy local query-quality gates without provider surprises.

Focus / 重点:
- Fixture recall dry-run as baseline.
- Real-query suite quality metrics.
- Provider-independent regression signals.
- Optional provider-backed benchmarks kept explicit and non-default.

Done When / 完成标志:
- `gate:ci` or equivalent reports query-quality summary.
- Fixture-only quality signals are stable.
- Provider-backed quality remains opt-in and never runs by accident.

Risk / 风险级别:
A2-A3.

Validation / 建议验证:
- Query suite tests.
- `npm run real-query-suite -- --json --fixture-recall-dry-run`
- `npm run query:quality -- --json --dry-run --fixture-recall-dry-run`
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P10 query dry-run support must exist. Do not treat fixture recall as real provider quality.

---

## P16 — TagMemo / Semantic Association Parity

Direction / 方向:
Close donor-like semantic association behavior after the policy and quality gates are in place.

Focus / 重点:
- TagMemo association strength.
- Semantic grouping and query expansion.
- ResidualPyramid / EPA interactions.
- Donor feel and ordering.

Done When / 完成标志:
- TagMemo parity cases are fixture-backed.
- Ranking behavior has stable tie-breakers.
- Drift reasons are visible in compare reports.

Risk / 风险级别:
A3.

Validation / 建议验证:
- TagMemo targeted tests.
- Ordering tests.
- Compare/rollback category gates.
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
Do not start before P10-P15. This stage depends on trustworthy policy, lifecycle, object model, donor parity, and query-quality gates.

---

## P17 — Advanced Memory Intelligence / V8 Evidence Gate

Direction / 方向:
Only after core parity gates are stable, evaluate advanced memory intelligence with evidence gates.

Focus / 重点:
- V8 terrain diagnostics.
- Meta-thinking signals.
- Advanced context routing.
- Evidence-first intelligence checks.

Done When / 完成标志:
- Advanced signals are read-only or gated.
- Diagnostics prove value without destabilizing recall.
- No advanced feature bypasses policy or lifecycle rules.

Risk / 风险级别:
A3-A4.

Validation / 建议验证:
- `npm run v8-diagnose -- --json`
- Advanced diagnostic tests.
- Query-quality gates.
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P16 must be stable. Do not jump to V8 before policy, lifecycle, object model, and quality gates are reliable.

---

## P18 — Import / Export / Migration Safety

Direction / 方向:
Make memory movement safe, auditable, reversible, and compatible with VCP practical parity.

Focus / 重点:
- Safe export shape.
- Import dry-run and diff.
- Migration preview and rollback plan.
- Redaction and scope/lifecycle preservation.

Done When / 完成标志:
- Import/export dry-run never mutates by default.
- Migration reports include counts, risks, and rollback.
- Sensitive data is not printed in reports.

Risk / 风险级别:
A3-A4.

Validation / 建议验证:
- Migration dry-run tests.
- Redaction tests.
- Shadow compare.
- `npm test`
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P13 object model and P11 lifecycle core must be stable.

---

## P19 — Observability / Admin Review Surface

Direction / 方向:
Improve local review surfaces without prematurely building a UI.

Focus / 重点:
- Dashboard report shape.
- Governance review summaries.
- Audit and lifecycle review.
- Operator troubleshooting notes.

Done When / 完成标志:
- CLI/JSON/Markdown surfaces are stable.
- Schema snapshots protect observability outputs.
- Review output does not mutate state.

Risk / 风险级别:
A1-A2.

Validation / 建议验证:
- Dashboard and observe tests.
- Governance report tests.
- Docs validation.
- `npm test`

Not Before / 前置条件:
P10-P12 policy and lifecycle surfaces should be clear. UI remains out of scope until later.

---

## P20 — Local Production Hardening

Direction / 方向:
Harden local operations for long-running Codex/Claude usage.

Focus / 重点:
- Startup and watchdog safety.
- Health checks.
- Local backup and rollback.
- Configuration warnings.

Done When / 完成标志:
- Local health and rollback paths are documented and tested.
- Dangerous maintenance commands remain explicit.
- No service install or startup mutation happens without approval.

Risk / 风险级别:
A2-A4 depending on operation.

Validation / 建议验证:
- HTTP observe.
- Mainline gate.
- Rollback plan dry-run.
- Docs validation.

Not Before / 前置条件:
Core runtime gates should be stable. Any scheduled task or startup install requires explicit approval.

---

## P21 — Codex / Claude Client Integration Hardening

Direction / 方向:
Stabilize client-specific behavior without fragmenting the memory kernel.

Focus / 重点:
- Codex/Claude scope behavior.
- Client identity and visibility.
- Client-specific acceptance checks.
- MCP configuration guidance.

Done When / 完成标志:
- Client-scoped recall is validated.
- Cross-client private leakage is prevented when policy is enabled.
- Acceptance docs match real behavior.

Risk / 风险级别:
A2-A3.

Validation / 建议验证:
- Scope acceptance.
- MCP contract tests.
- Client acceptance docs validation.
- `npm run gate:mainline:strict`

Not Before / 前置条件:
P10 soft read policy and P11 lifecycle semantics should be stable.

---

## P22 — VCP Practical Parity Release Candidate

Planning entry:

- [P22_RELEASE_CANDIDATE_PLAN.md](./P22_RELEASE_CANDIDATE_PLAN.md)
- [P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md](./P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md)
- [P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md](./P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md)
- [P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](./P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md)
- [P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md](./P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md)
- [P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md](./P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md)

Direction / 方向:
Freeze behavior for a practical parity release candidate.

Focus / 重点:
- Contract freeze.
- Parity evidence.
- Rollback readiness.
- Known gaps and non-goals.

Done When / 完成标志:
- All required gates pass.
- Known gaps are documented.
- Release candidate has a rollback and support story.

Risk / 风险级别:
A4.

Validation / 建议验证:
- Full test suite.
- Strict mainline gate.
- Compare/rollback standard suite.
- Query-quality gate.
- Docs validation.

Not Before / 前置条件:
P10-P21 must be complete or explicitly deferred with evidence. Do not create release candidates early.

---

## P23 — v1.0 Memory Kernel

Direction / 方向:
Cut the stable local memory kernel after practical parity is proven.

Focus / 重点:
- Stable contract.
- Stable local operations.
- Migration and rollback guidance.
- Long-term maintenance policy.

Done When / 完成标志:
- v1.0 criteria are met.
- Documentation and gates align.
- No critical unresolved lifecycle, policy, or parity gaps remain.

Risk / 风险级别:
A4.

Validation / 建议验证:
- Release checklist.
- Full validation matrix.
- Security and secrets review.
- No-push dry-run before any publish action.

Not Before / 前置条件:
P22 release candidate must be validated. Tag/release/deploy still require explicit approval.

---

## Standing Boundaries

- Do not expand public MCP tools without a dedicated approved phase.
- Do not run provider smoke or benchmark as routine roadmap work.
- Do not modify `.env`, secrets, global config, startup tasks, or real provider keys.
- Do not run real migrations or cleanup apply without explicit approval.
- Do not jump to P16, P17, V8, UI, release candidate, tag, or deploy before the prerequisite stages are done.
- Superseded stale branches may only be used for selective documentation salvage; runtime, test, package, and board changes must not be merged or cherry-picked from stale branches.
