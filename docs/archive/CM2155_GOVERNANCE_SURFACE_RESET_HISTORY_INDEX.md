# CM-2155 Governance Surface Reset History Index

This index preserves bounded recovery after active governance surface
compaction. It contains references only; it does not copy raw memory, private
evidence, provider output, secrets, or historical status bodies.

## Fixed Baseline

- Governance reset task: `CM-2155`
- Governance reset validation: `CMV-2240`
- Pre-compaction baseline:
  `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1`
- Accepted product PR: `#61`
- Reviewed product head:
  `4680b4c198a71bb9e61d7bc1f21c0b77a1769fd9`
- Merge commit:
  `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1`
- Accepted main CI run: `30238902177`

The merge tree and reviewed-head tree are identical at this baseline.

## Historical Status Surfaces

- `CURRENT_STATE.md`
- `STATUS.md`
- `.agent_board/CURRENT_FACTS.json`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/AUTOPILOT_LEDGER.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/CHECKPOINT.md`

## Exact Recovery

```bash
git show ef62d4819ece3d93cb90e2d55fa84973cf43b7d1:CURRENT_STATE.md
git show ef62d4819ece3d93cb90e2d55fa84973cf43b7d1:.agent_board/TASK_QUEUE.md
git show ef62d4819ece3d93cb90e2d55fa84973cf43b7d1:.agent_board/CURRENT_FACTS.json
git show ef62d4819ece3d93cb90e2d55fa84973cf43b7d1:STATUS.md
```

Follow one surface through renames or edits:

```bash
git log --follow -- CURRENT_STATE.md
git log --follow -- .agent_board/TASK_QUEUE.md
git log --follow -- .agent_board/CURRENT_FACTS.json
git log --follow -- STATUS.md
```

Attribute a baseline line without making it current:

```bash
git blame ef62d4819ece3d93cb90e2d55fa84973cf43b7d1 -- CURRENT_STATE.md
git blame ef62d4819ece3d93cb90e2d55fa84973cf43b7d1 -- STATUS.md
```

## Product Evidence Anchors

- `docs/CHATGPT_WEB_R5O_RELAY_ROUTING_EXPLICIT_VISIBILITY.md`
- `docs/CHATGPT_WEB_R5O_PUBLIC_CONTRACT_INDEPENDENT_REVIEW.md`
- `docs/CHATGPT_WEB_R5H_PRIVATE_CHATGPT_DOGFOOD_WINDOW.md`
- `docs/CHATGPT_WEB_R5H_PRIVATE_CHATGPT_DOGFOOD_CLOSEOUT.md`

Owner-only or private evidence remains governed at its original boundary. This
index identifies safe tracked references only and does not authorize raw
content access.
