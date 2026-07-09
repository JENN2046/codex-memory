# Master Plan

## Phase table

| Phase | Name | Planning depth | Primary purpose |
|---|---|---:|---|
| M0 | Reality Calibration | Full taskbook | Establish fresh repo/state/doc facts |
| M1 | Strategy Pivot Alignment | Full taskbook | Freeze VCP-native-first bridge route |
| M2 | Documentation Source-of-Truth Synchronization | Full taskbook | Sync README/STATUS/CURRENT_STATE/taskboard/roadmap |
| M3 | VCP Native Memory Capability Inventory | Full taskbook | Identify native VCP surfaces and profile vocabulary without live calls unless approved |
| M4 | VCP Memory Invocation Contract | Key drafts | Define exact target/profile/request/result/error contract |
| M5 | Governance Policy Shield | Key drafts | Encode L0-L3/L4/client/scope/visibility rules |
| M6 | Observe-lite Live Target Proof | Key drafts | Exact-approved low-disclosure target/handshake proof, no memory read/write |
| M7 | Observe-full Read Shape Proof | Key drafts | Exact-approved read-shape proof with no raw private output |
| M8 | Trusted-full-read Workflow Harness | Key drafts | Sustained bounded recall workflow for Codex/Claude |
| M9 | Governed Mutation Proposal Mode | Entry/exit only | Propose writes without durable mutation |
| M10 | Bounded Autonomous Write / Update / Supersede / Tombstone | Entry/exit only | Mutations inside approved write boundary |
| M11 | Response Normalization + Audit Receipts | Entry/exit only | Stable normalized output and receipts |
| M12 | Codex / Claude Sustained Workflow Integration | Entry/exit only | AGENTS OS memory workflow integration |
| M13 | Fallback Local Memory Hardening | Entry/exit only | Keep local runtime safe as fallback/test substrate |
| M14 | Observability / Dashboard / Health Report | Entry/exit only | Health, policy, receipt, quality reporting |
| M15 | Release Candidate Gate / v1 Stable Bridge | Entry/exit only | Candidate gate only, no release without approval |

## Why this order

1. Reality and documentation drift must be resolved before live runtime work.
2. Strategy pivot must downgrade parity clone route before new VCP bridge work begins.
3. VCP capability inventory must precede invocation contracts.
4. Invocation contracts and policy shield must precede live observe/read proofs.
5. Read proofs must precede write proposal mode.
6. Proposal mode must precede bounded autonomous durable mutation.
7. Production/release/cutover readiness must remain last and explicitly approval-bound.

## Dependency graph

```text
M0
 └─> M1
      └─> M2
           └─> M3
                └─> M4
                     └─> M5
                          └─> M6
                               └─> M7
                                    └─> M8
                                         ├─> M9
                                         │    └─> M10
                                         ├─> M11
                                         ├─> M12
                                         └─> M13
                                              └─> M14
                                                   └─> M15
```

## Release milestones

```yaml
usable:
  unlocked_by:
    - M0 complete
    - M1 complete
    - M2 complete
    - M3 complete
  claim_limits:
    - docs and contracts aligned
    - no live VCP claim unless M6/M7 done

bridge_candidate:
  unlocked_by:
    - M6 complete
    - M7 complete
    - M8 complete
    - M11 substantially complete

write_candidate:
  unlocked_by:
    - M9 complete
    - exact Jenn write boundary approval
    - M10 bounded mutation evidence

rc_candidate:
  unlocked_by:
    - M0-M14 complete
    - no P0/P1 open risk
    - dedicated RC approval
  not_included:
    - release
    - deploy
    - tag
    - cutover
```

## Risk sequencing

- P0 safety risks are addressed before live calls.
- Documentation drift is addressed before implementation tasks.
- VCP capability uncertainty is isolated in inventory and exact-approved proofs.
- Write/mutation is delayed until read governance is proven.
- Local fallback hardening is kept after bridge direction to avoid reviving reimplementation as the main track.
