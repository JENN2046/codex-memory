'use strict';

const {
  STATUS_SYNC_PATHS
} = require('./Cm2118FullPlanApplicationExecution');
const {
  READINESS_FIELDS,
  REVIEW_PATH,
  REVIEW_MARKDOWN_PATH
} = require('./Cm2120FullPlanApplicationReceiptReview');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  gitBlobOid,
  sameJson,
  serializeArtifact,
  sha256
} = require('./Cm2117ExactFullPlanApplicationDecision');

const TASK_ID = 'CM-2121';
const VALIDATION_ID = 'CMV-2214';
const BASELINE_COMMIT = '521348cff0f0aea6afbc2a5dbde67cf096e708a7';
const BASELINE_TREE = '63f85c927d686a443edba8d32db38f3078c1ec5c';
const BASELINE_PARENT_COMMIT = '02862ebb4a47f3b612c1482b5d307269b97e0eab';
const BASELINE_PARENT_TREE = '312ba73c3b4067c0ca176d482fa86ee306954fa3';
const APPLICATION_PATH = 'docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.json';
const APPLICATION_MARKDOWN_PATH = APPLICATION_PATH.replace(/\.json$/, '.md');
const REVIEW_DECISION = Object.freeze({
  reference: 'CM-2120-INTERNAL-RECEIPT-REVIEW-PASS-C6BCA575-D5E61022',
  commit: BASELINE_COMMIT,
  tree: BASELINE_TREE,
  parentCommit: BASELINE_PARENT_COMMIT,
  parentTree: BASELINE_PARENT_TREE,
  payloadSha256: '0c237372eb2c1ad91f26e84812601cb598c59f5230cd2774afd5fddf40fc6e90',
  json: Object.freeze({
    path: REVIEW_PATH,
    blobOid: 'b16aecc7df1b88ab6b6414be6684200fed465151',
    bytes: 7546,
    sha256: '00981d8f143639a49dfb22f2526756245fee830777d6340a2dc4f989c2cc316f'
  }),
  markdown: Object.freeze({
    path: REVIEW_MARKDOWN_PATH,
    blobOid: '9cc1add38925eaf0d12a36ecf703ac37e5f579f5',
    bytes: 8079,
    sha256: 'd24c69f03bcd6f96a5080067c4f362850baa6002b45c4482985d4239dab71724'
  })
});

const ACTIVE_START = '<!-- CURRENT-FACTS-ACTIVE-START -->';
const ACTIVE_END = '<!-- CURRENT-FACTS-ACTIVE-END -->';
const CURRENT_FACTS_PATH = '.agent_board/CURRENT_FACTS.json';

function wrapPayload(payload, artifactType) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    artifactType,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first === -1 || text.indexOf(needle, first + needle.length) !== -1) {
    throw new Error(`cm2121_projection_anchor_invalid:${label}`);
  }
  return `${text.slice(0, first)}${replacement}${text.slice(first + needle.length)}`;
}

function replaceActiveBlock(text, lines) {
  const start = text.indexOf(ACTIVE_START);
  const end = text.indexOf(ACTIVE_END);
  if (start === -1 || end === -1 || end < start || text.indexOf(ACTIVE_START, start + 1) !== -1 ||
      text.indexOf(ACTIVE_END, end + 1) !== -1) throw new Error('cm2121_active_block_invalid');
  const block = [ACTIVE_START, '', ...lines, '', ACTIVE_END].join('\n');
  return `${text.slice(0, start)}${block}${text.slice(end + ACTIVE_END.length)}`;
}

function insertTableRow(text, row, label) {
  const lines = text.split('\n');
  const header = lines.findIndex(line => line.startsWith('| ID |'));
  if (header === -1 || !/^\|[-:| ]+\|$/.test(lines[header + 1] || '') || text.includes(`| ${TASK_ID} |`) ||
      (label === 'validation' && text.includes(`| ${VALIDATION_ID} |`))) {
    throw new Error(`cm2121_table_anchor_invalid:${label}`);
  }
  lines.splice(header + 2, 0, row);
  return lines.join('\n');
}

function projectCurrentFacts(beforeBytes, projection = {}) {
  const historical = projection.historicalFrozenStatusSync === true;
  const facts = JSON.parse(beforeBytes.toString('utf8'));
  facts.updatedAt = '2026-07-12';
  facts.taskId = TASK_ID;
  facts.validationId = VALIDATION_ID;
  facts.reviewedObject = {
    commit: REVIEW_DECISION.commit,
    parent: REVIEW_DECISION.parentCommit,
    source: REVIEW_PATH,
    presentInLocalCheckout: true
  };
  facts.planPackCompletion = {
    ...facts.planPackCompletion,
    phase8Completed: true,
    fullPlanApplicationGatePrepared: true,
    fullPlanApplicationDecisionPresent: true,
    fullPlanApplicationDecisionContentApproved: true,
    fullPlanApplicationDecisionGitIntakeCompleted: true,
    fullPlanApplicationFinalExecutionReleasePresent: true,
    fullPlanApplicationFinalExecutionReleaseGitIntakeCompleted: true,
    fullPlanApplicationAuthorized: true,
    fullPlanApplicationClaimCreated: true,
    fullPlanApplicationApplied: true,
    fullPlanApplicationExecuted: true,
    fullPlanApplicationCommitBound: true,
    fullPlanApplicationAuthorizationConsumed: true,
    fullPlanApplicationAuthorizationReplayAllowed: false,
    fullPlanApplicationReceiptReviewPassed: true,
    // CM-2121 did perform the historical synchronization (recorded separately
    // in evidenceBaseline), but the current status synchronization was later
    // reopened for revalidation. Only the byte-exact historical artifact
    // verifier may request the old projected value.
    fullPlanStatusSyncPerformed: historical,
    fullPlanPackCompleted: historical,
    readinessClaimed: false
  };
  facts.status = {
    ...facts.status,
    project: 'NOT_READY_BLOCKED',
    rc: 'RC_NOT_READY_BLOCKED',
    scope: historical
      ? 'near_model_memory_plan_pack_completed_evidence_bound_status_synced_no_readiness_claim'
      : 'near_model_memory_plan_pack_reopened_needs_revalidation_no_readiness_claim',
    notReleaseReady: true,
    notProductionReady: true,
    notDeployReady: true,
    notCutoverReady: true,
    completeV8Claimed: false
  };
  facts.validationSummary = [{
    id: VALIDATION_ID,
    scope: 'CM-2121 exact full-plan status synchronization',
    status: historical
      ? 'COMPLETED_FULL_PLAN_APPLICATION_BOUND_STATUS_SYNCED_READINESS_FALSE'
      : 'COMPLETED_STATUS_REOPENED_FULL_PLAN_NEEDS_REVALIDATION_READINESS_FALSE'
  }, ...(facts.validationSummary || []).filter(item => item.id !== VALIDATION_ID)];
  const evidence = facts.evidenceBaseline || {};
  Object.assign(evidence, {
    cm2117DecisionGitIntakeCompleted: true,
    cm2117FinalExecutionReleasePresent: true,
    cm2117ClaimCreated: true,
    cm2117ApplicationExecuted: true,
    cm2117ApplicationCommitBound: true,
    cm2119ClaimCreated: true,
    cm2119ApplicationExecuted: true,
    cm2119ApplicationCommitCreated: true,
    cm2119ApplicationCommitBound: true,
    cm2119AuthorizationConsumed: true,
    cm2119AuthorizationReplayAllowed: false,
    cm2118ApplicationCommit: '41097b0fb1118a47f3d16873a12a5e0fcc75a94b',
    cm2118ApplicationTree: 'fecb13c4f55d634197feab94d1dec5f56575521a',
    cm2118ApplicationParentCommit: 'b1245149e2b94248a39213737ea05adae4d53f5e',
    cm2118ApplicationParentTree: 'f59b578a039e1fc615e6c8e3bbb83a826b833792',
    cm2118ApplicationDiffPathCount: 5,
    cm2118ApplicationClaimFinalState: 'CONSUMED_SUCCESS',
    cm2118ApplicationAuthorizationUseCount: 1,
    cm2118ApplicationPatchInvocationCount: 1,
    cm2118ApplicationAuthorizationConsumed: true,
    cm2118ApplicationAuthorizationReplayAllowed: false,
    cm2118ApplicationBindingHash: 'f0596fe77d1e1d9737bdbab8d2d1c5d20f9c9eae9fecb29597454520f5c8d635',
    cm2120ReceiptFreezeCommit: '727e812861a7b856f10fb242c62e15b638a982d8',
    cm2120ExecutionReceiptBlobOid: '0b0ecabc4daba8a275487f541f45613fdca9322d',
    cm2120ExecutionReceiptBytes: 7986,
    cm2120ExecutionReceiptRawSha256: 'c6bca575cc7fce687b2452ec75d25cb6271bfd66214addd2390d1813bbca83fe',
    cm2120ExecutionReceiptPayloadSha256: '9e4761ace00edddfee62e2fd9663760bc2236110b807febc6a41a1b975f3ebef',
    cm2120BindingReceiptBlobOid: '8378bae1c06d084bd4b5386c4a625b0b4a319b36',
    cm2120BindingReceiptBytes: 7546,
    cm2120BindingReceiptRawSha256: 'd5e610229545a1da55100bfb6e949d84bd8ffc59e207c5a9736281a3d9911fbb',
    cm2120BindingReceiptPayloadSha256: '1da21b7437e8accdb62a7d3f00320da74774e6f293ff4c384976b2d91cdc7fc6',
    cm2120ReceiptReviewDecisionReference: REVIEW_DECISION.reference,
    cm2120ReceiptReviewDecisionCommit: REVIEW_DECISION.commit,
    cm2120ReceiptReviewDecisionBlobOid: REVIEW_DECISION.json.blobOid,
    cm2120ReceiptReviewDecisionBytes: REVIEW_DECISION.json.bytes,
    cm2120ReceiptReviewDecisionRawSha256: REVIEW_DECISION.json.sha256,
    cm2120ReceiptReviewDecisionPayloadSha256: REVIEW_DECISION.payloadSha256,
    cm2120ReceiptReviewPassed: true,
    cm2121StatusSyncPerformed: true,
    cm2121ReadinessClaimed: false
  });
  facts.evidenceBaseline = evidence;
  return Buffer.from(`${JSON.stringify(canonicalize(facts), null, 2)}\n`);
}

function projectMarkdown(sourcePath, beforeBytes, projection = {}) {
  const historical = projection.historicalFrozenStatusSync === true;
  let text = beforeBytes.toString('utf8');
  const commonActive = [
    `Current facts snapshot: \`${CURRENT_FACTS_PATH}\`.`,
    '',
    `Current task: \`${TASK_ID} exact full-plan status synchronization\`.`,
    `Current validation: \`${VALIDATION_ID}\`.`,
    'Current fact: the exact application commit is ancestry-anchored, both low-disclosure receipts are frozen and internally reviewed, the one-shot authorization is consumed/non-replayable, and the nine-path status synchronization records `fullPlanPackCompleted=true`.',
    'All production/release/deploy/cutover/RC/complete-V8/readiness fields remain false; no native/provider/real-memory/remote action is authorized or performed by this synchronization.'
  ];
  if (sourcePath !== 'CURRENT_STATE.md') text = replaceActiveBlock(text, commonActive);

  if (sourcePath === '.agent_board/AUTOPILOT_LEDGER.md') {
    text = insertTableRow(text,
      '| CM-2121 | synchronize bound full-plan completion evidence | Exact local nine-path status application; readiness remains false | `cm2121_exact_full_plan_status_sync` | Anchored application `41097b0f…`, froze/reviewed receipts, then synchronized only committed status/governance surfaces | `application=41097b0f; receipts=727e8128; review=521348cf; claim=CONSUMED_SUCCESS; use_count=1; replay=false; full_plan=true; readiness=false` | `CMV-2214` | one status patch; 0 native/provider/real-memory/remote actions | no authorization replay, extra path, readiness, release, deploy, cutover, tag, push, or memory action | completed_full_plan_application_bound_status_synced_readiness_false | 2026-07-12 |',
      'ledger');
  } else if (sourcePath === '.agent_board/TASK_QUEUE.md') {
    text = insertTableRow(text,
      '| CM-2121 | 2121 | done | P0-mainline-health / P6-docs-drift / P8-memory-governance | Exact local status sync only | nine status/governance paths | Bind the reviewed one-shot application result into current status while keeping every readiness field false | exact receipt review; nine before/after blobs; current-facts drift; ledger consistency; docs/diff checks | authorization consumed/non-replayable; no native/provider/real-memory/remote effect | separate exact status-sync decision/release required; no readiness authority | COMPLETED_FULL_PLAN_APPLICATION_BOUND_STATUS_SYNCED_READINESS_FALSE |',
      'task');
  } else if (sourcePath === '.agent_board/VALIDATION_LOG.md') {
    text = insertTableRow(text,
      '| CMV-2214 | exact application/receipt Git replay; CM-2120 review tests; nine-path before/after projection; current-facts drift; ledger consistency; docs/diff/non-claim checks | P0-mainline-health / P6-docs-drift / P8-memory-governance | CM-2121 exact full-plan status synchronization | COMPLETED_FULL_PLAN_APPLICATION_BOUND_STATUS_SYNCED_READINESS_FALSE | Application `41097b0f…` is ancestry-anchored; receipt freeze `727e8128…` and review `521348cf…` bind consumed one-shot evidence. Only nine status paths change; `fullPlanPackCompleted=true`, while all readiness aliases remain false. | Any readiness, release, deploy, cutover, tag, push, provider, native-memory, or real-memory action requires a separate exact boundary. | 2026-07-12 |',
      'validation');
  } else if (sourcePath === '.agent_board/CHECKPOINT.md') {
    text = replaceOnce(text, '\n## CM-2118/CM-2119 Executor Packet and Final Release\n', [
      '\n## CM-2121 Bound Full-plan Completion Status Sync',
      '',
      'Status: `FULL_PLAN_APPLICATION_BOUND_STATUS_SYNCED_READINESS_FALSE`',
      '',
      '- Application `41097b0f…` / tree `fecb13c4…` is anchored in branch ancestry with the exact `4M+1A` target set.',
      '- Receipt freeze `727e8128…` preserves the exact 7986-byte execution and 7546-byte binding receipts; review `521348cf…` passed.',
      '- Authorization final state is `CONSUMED_SUCCESS`, use count and patch count are one, and replay is forbidden.',
      '- The status application changes only nine governance/status paths and records `fullPlanPackCompleted=true`.',
      '- Every readiness alias remains false; no native/provider/real-memory/remote action occurs.',
      '',
      `Validation: \`${VALIDATION_ID}\`.`,
      '',
      '## Historical CM-2118/CM-2119 Executor Packet and Final Release',
      ''
    ].join('\n'), 'checkpoint');
  } else if (sourcePath === '.agent_board/HANDOFF.md') {
    text = replaceOnce(text, '## Active Handoff\n\n', [
      '## Active Handoff', '',
      'The exact full-plan application is now bound and ancestry-anchored. Application `41097b0f…` has the exact five-path tree, receipt freeze `727e8128…` preserves both raw receipts, and internal review `521348cf…` accepts their Git identities and non-claim boundary. The one-shot authorization is consumed and cannot be replayed.',
      '',
      '`fullPlanPackCompleted=true` is a plan-pack evidence state only. Production, release, deploy, cutover, `RC_READY`, complete V8, and all other readiness fields remain false. No native/provider/real-memory/remote action is active.',
      '',
      '## Previous Active Handoff', ''
    ].join('\n'), 'handoff');
  } else if (sourcePath === '.agent_board/RUN_STATE.md') {
    text = replaceOnce(text, '\n## Historical Run State Archive\n', [
      '\n## Current Run State', '',
      '- Full-plan application evidence: bound and synchronized.',
      '- Application authorization: consumed, non-replayable, inactive.',
      '- Readiness: all aliases false.',
      '- Native/provider/real-memory/remote authority from this task: none.',
      '',
      '## Historical Run State Archive', ''
    ].join('\n'), 'run-state');
    const nextStart = text.indexOf('## Next Safe Action');
    const nextEnd = text.indexOf('\n## Historical Run Notes', nextStart);
    if (nextStart === -1 || nextEnd === -1) throw new Error('cm2121_projection_anchor_invalid:next-safe-action');
    text = `${text.slice(0, nextStart)}## Next Safe Action\n\nAny readiness, release, deploy, cutover, tag, push, native-memory, provider, or real-memory action requires a new exact boundary. Do not replay the consumed full-plan application authorization.\n${text.slice(nextEnd)}`;
  } else if (sourcePath === 'CURRENT_STATE.md') {
    const snapshotStart = text.indexOf('## Snapshot');
    const nextSection = text.indexOf('\n## Current Final Execution Release', snapshotStart);
    if (snapshotStart === -1 || nextSection === -1) throw new Error('cm2121_projection_anchor_invalid:current-state-snapshot');
    const snapshot = [
      '## Snapshot', '',
      '| Field | Value |', '|---|---|',
      '| Status | Exact full-plan application bound and status synchronized; readiness remains false |',
      `| Current task | \`${TASK_ID} exact full-plan status synchronization\` |`,
      `| Current validation | \`${VALIDATION_ID}\` |`,
      '| Current route | Full plan-pack evidence is complete; any readiness or external action remains separately gated |',
      `| Machine snapshot | \`${CURRENT_FACTS_PATH}\` |`,
      '| Intake contract | `docs/CONTEXT_INTAKE_CONTRACT.md` |',
      '| Archive index | `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md` |', ''
    ].join('\n');
    text = `${text.slice(0, snapshotStart)}${snapshot}${text.slice(nextSection)}`;
    text = text.replace('## Current Final Execution Release', '## Historical Final Execution Release');
    text = replaceOnce(text, '\n## Historical Final Execution Release\n', [
      '\n## Current Bound Full-plan Application', '',
      'Application `41097b0f…` / tree `fecb13c4…` is ancestry-anchored with its exact `4M+1A` target set. Freeze commit `727e8128…` preserves the byte-exact execution and binding receipts; internal review `521348cf…` passed. The one-shot authorization is `CONSUMED_SUCCESS`, use count one, and non-replayable.',
      '',
      '`fullPlanPackCompleted=true` now describes the bounded plan-pack evidence state. This is not production, release, deploy, cutover, `RC_READY`, complete V8, or another readiness claim; every readiness field remains false.',
      '',
      '## Historical Final Execution Release', ''
    ].join('\n'), 'current-state-current');
  } else if (sourcePath === 'STATUS.md') {
    text = replaceOnce(text, `${ACTIVE_END}\n\n`, [
      ACTIVE_END, '',
      '## CM-2121 Bound Full-plan Application Status', '',
      'Application `41097b0f…` is ancestry-anchored with exact tree `fecb13c4…`. Receipt freeze `727e8128…` preserves both byte-exact low-disclosure receipts, and internal review `521348cf…` passes. Authorization is consumed/non-replayable; the nine-path status synchronization records `fullPlanPackCompleted=true`.',
      '',
      'This completion is limited to the imported plan-pack evidence state. Production, release, deploy, cutover, `RC_READY`, complete V8, and all other readiness fields remain false. No native/provider/real-memory/remote action is authorized or performed by the status synchronization.',
      '',
      '## Historical CM-2118/CM-2119 Release State', ''
    ].join('\n'), 'status-current');
    if (!historical) {
      const releaseStart = text.indexOf('## Historical CM-2118/CM-2119 Release State');
      const releaseEnd = text.indexOf('\nCM-2115-R2 internal self-review implementation', releaseStart);
      if (releaseStart === -1 || releaseEnd === -1 ||
          text.indexOf('## Historical CM-2118/CM-2119 Release State', releaseStart + 1) !== -1) {
        throw new Error('cm2121_projection_anchor_invalid:status-historical-release');
      }
      const historicalRelease = [
        '## Historical CM-2118/CM-2119 Release State', '',
        'CM-2118 implementation `45c53bf5…` froze the fixed-root claim registry, three-commit secure executor, low-disclosure external receipts, and exact application-commit binding contract. Packet `02a78ef8…` and CM-2119 release `dd78a679…` passed exact Git intake and authorized one local application with replay forbidden.',
        '',
        'That authorization was subsequently consumed by application `41097b0f…`: the durable claim reached `CONSUMED_SUCCESS`, use count and patch invocation count are one, and receipts frozen at `727e8128…` were accepted by review `521348cf…`. The historical executor is inactive and non-replayable; it is not an unclaimed future route.',
        '',
        'CM-2117 decision `b1245149…` supplied the content-only parent and exact five-path target boundary. CM-2116 gate `f6b7f9a5…` remains an immutable pre-execution checkpoint; its then-current zero counters do not describe the later consumed application evidence.',
        '',
        'The current status synchronization is reopened for revalidation, so `fullPlanPackCompleted=false (pending revalidation)`. All readiness claims remain false, and no additional application, native-memory, provider, real-memory, or remote action is authorized.',
        ''
      ].join('\n');
      text = `${text.slice(0, releaseStart)}${historicalRelease}${text.slice(releaseEnd)}`;
    }
  }
  if (!historical) {
    const replacements = [
      ['fullPlanPackCompleted=true', 'fullPlanPackCompleted=false (pending revalidation)'],
      ['full_plan=true', 'full_plan=false'],
      ['COMPLETED_FULL_PLAN_APPLICATION_BOUND_STATUS_SYNCED_READINESS_FALSE',
        'COMPLETED_STATUS_REOPENED_FULL_PLAN_NEEDS_REVALIDATION_READINESS_FALSE'],
      ['completed_full_plan_application_bound_status_synced_readiness_false',
        'completed_status_reopened_full_plan_needs_revalidation_readiness_false'],
      ['FULL_PLAN_APPLICATION_BOUND_STATUS_SYNCED_READINESS_FALSE',
        'COMPLETED_STATUS_REOPENED_FULL_PLAN_NEEDS_REVALIDATION_READINESS_FALSE'],
      ['Full plan-pack evidence is complete', 'Full plan-pack completion needs revalidation'],
      ['Full-plan application evidence: bound and synchronized.',
        'Full-plan application evidence: historically bound; current synchronization is reopened for revalidation.'],
      ['Exact full-plan application bound and status synchronized; readiness remains false',
        'Historical full-plan application bound; current status sync reopened for revalidation; readiness remains false'],
      ['The exact full-plan application is now bound and ancestry-anchored.',
        'The historical exact full-plan application remains bound and ancestry-anchored; current completion is reopened for revalidation.'],
      ['## CM-2121 Bound Full-plan Application Status',
        '## CM-2121 Reopened Full-plan Status Revalidation'],
      ['## CM-2121 Bound Full-plan Completion Status Sync',
        '## CM-2121 Reopened Full-plan Status Revalidation']
    ];
    for (const [from, to] of replacements) text = text.split(from).join(to);
  }
  return Buffer.from(text);
}

function projectStatusFileForProjection(sourcePath, beforeBytes, projection = {}) {
  if (!STATUS_SYNC_PATHS.includes(sourcePath)) throw new Error(`cm2121_status_path_not_allowed:${sourcePath}`);
  return sourcePath === CURRENT_FACTS_PATH
    ? projectCurrentFacts(beforeBytes, projection)
    : projectMarkdown(sourcePath, beforeBytes, projection);
}

function projectStatusFile(sourcePath, beforeBytes) {
  return projectStatusFileForProjection(sourcePath, beforeBytes);
}

function verifyReviewDecisionIdentity(options, blockers) {
  try {
    if (options.resolveCommitTree(BASELINE_COMMIT) !== BASELINE_TREE ||
        options.resolveParentCommit(BASELINE_COMMIT) !== BASELINE_PARENT_COMMIT ||
        options.resolveCommitTree(BASELINE_PARENT_COMMIT) !== BASELINE_PARENT_TREE ||
        !sameJson(options.resolveDiffPaths(BASELINE_PARENT_COMMIT, BASELINE_COMMIT).sort(),
          [REVIEW_MARKDOWN_PATH, REVIEW_PATH].sort())) blockers.push('statusSync.reviewLineage');
    const json = options.resolveGitFile(BASELINE_COMMIT, REVIEW_PATH);
    const markdown = options.resolveGitFile(BASELINE_COMMIT, REVIEW_MARKDOWN_PATH);
    for (const [actual, expected, label] of [[json, REVIEW_DECISION.json, 'json'], [markdown, REVIEW_DECISION.markdown, 'markdown']]) {
      if (actual.gitMode !== '100644' || actual.gitObjectType !== 'blob' || actual.blobOid !== expected.blobOid ||
          actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 || gitBlobOid(actual.content) !== expected.blobOid ||
          sha256(actual.content) !== expected.sha256) blockers.push(`statusSync.review.${label}`);
    }
    if (!markdown.content.toString('utf8').includes(json.content.toString('utf8').trimEnd())) blockers.push('statusSync.reviewMirror');
    const decision = JSON.parse(json.content.toString('utf8'));
    if (decision.payload?.decisionReference !== REVIEW_DECISION.reference ||
        decision.canonicalPayloadSha256 !== REVIEW_DECISION.payloadSha256 ||
        decision.payload?.appliedEvidence?.fullPlanPackCompleted !== true ||
        decision.payload?.appliedEvidence?.statusSyncAuthorizedByThisDecision !== false ||
        Object.values(decision.payload?.appliedEvidence?.readiness || {}).some(value => value !== false)) {
      blockers.push('statusSync.reviewDecisionBoundary');
    }
  } catch {
    blockers.push('statusSync.reviewUnreadable');
  }
}

function buildTargets(options, blockers, projection = {}) {
  const targets = [];
  for (const sourcePath of STATUS_SYNC_PATHS) {
    try {
      const before = options.resolveGitFile(BASELINE_COMMIT, sourcePath);
      if (before.gitMode !== '100644' || before.gitObjectType !== 'blob' || !Buffer.isBuffer(before.content)) {
        blockers.push(`statusSync.before.${sourcePath}`);
        continue;
      }
      const afterBytes = projectStatusFileForProjection(sourcePath, before.content, projection);
      targets.push({
        sourcePath,
        operation: 'modify',
        before: {
          gitMode: before.gitMode,
          blobOid: before.blobOid,
          bytes: before.bytes,
          sha256: before.sha256
        },
        after: {
          gitMode: '100644',
          blobOid: gitBlobOid(afterBytes),
          bytes: afterBytes.length,
          sha256: sha256(afterBytes)
        }
      });
    } catch {
      blockers.push(`statusSync.projection.${sourcePath}`);
    }
  }
  return targets;
}

function buildApplicationForProjection(options = {}, projection = {}) {
  const blockers = [];
  if (!['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveGitFile']
    .every(name => typeof options[name] === 'function')) throw new Error('cm2121_git_resolvers_required');
  verifyReviewDecisionIdentity(options, blockers);
  const targets = buildTargets(options, blockers, projection);
  if (targets.length !== STATUS_SYNC_PATHS.length) blockers.push('statusSync.targetCount');
  if (blockers.length) throw new Error(`cm2121_application_blocked:${[...new Set(blockers)].join(',')}`);
  const payload = {
    applicationReference: 'CM-2121-EXACT-FULL-PLAN-STATUS-SYNC-APPLICATION-521348CF-C6BCA575-D5E61022',
    applicationType: 'non_executing_exact_full_plan_status_sync_application',
    baseline: {
      commit: BASELINE_COMMIT,
      tree: BASELINE_TREE,
      receiptReviewDecision: REVIEW_DECISION
    },
    patchPlan: {
      exactPaths: [...STATUS_SYNC_PATHS],
      exactEntries: STATUS_SYNC_PATHS.map(sourcePath => ({ status: 'M', path: sourcePath })),
      targets,
      patchPayloadSha256: sha256Canonical(targets),
      onlyAuthoritativeTransition: {
        field: 'fullPlanPackCompleted',
        before: false,
        after: projection.historicalFrozenStatusSync === true
      },
      statusSyncPerformedOnlyAfterFutureExactApplication: true,
      readinessFieldsForcedFalse: [...READINESS_FIELDS]
    },
    oneShotBoundary: {
      separateContentDecisionRequired: true,
      separateFinalExecutionReleaseRequired: true,
      durableClaimRegistryRequired: true,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false,
      futureNonce: 'cm2121-full-plan-status-sync-001',
      futureReceiptId: 'cm2121-full-plan-status-sync-receipt-001',
      futureRegistryReference: 'cm2121-full-plan-status-sync-registry-001'
    },
    currentAuthority: {
      applicationPrepared: true,
      contentDecisionPresent: false,
      finalExecutionReleasePresent: false,
      statusSyncAuthorized: false,
      branchRefUpdateAuthorized: false
    },
    currentState: {
      applicationExecuted: false,
      statusSyncPerformed: false,
      fullPlanPackCompletedInBoundEvidence: true,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false
    },
    sideEffectLimits: {
      repositoryPatches: 1,
      applicationCommits: 1,
      branchRefUpdates: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    currentSideEffects: {
      repositoryPatches: 0,
      applicationCommits: 0,
      branchRefUpdates: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload, 'cm2121_exact_full_plan_status_sync_application_v1');
}

function buildApplication(options = {}) {
  return buildApplicationForProjection(options);
}

function evaluateApplicationForProjection(application = {}, options = {}, projection = {}) {
  const blockers = [];
  let expected = null;
  try {
    expected = buildApplicationForProjection(options, projection);
    if (!sameJson(application, expected)) blockers.push('statusSync.exactContent');
  } catch (error) {
    blockers.push(error.message);
  }
  if (application.schemaVersion !== 1 || application.taskId !== TASK_ID ||
      application.artifactType !== 'cm2121_exact_full_plan_status_sync_application_v1' ||
      application.canonicalPayloadSha256 !== sha256Canonical(application.payload || {})) blockers.push('statusSync.identityOrHash');
  const authority = application.payload?.currentAuthority || {};
  const current = application.payload?.currentState || {};
  if (authority.applicationPrepared !== true || authority.contentDecisionPresent !== false ||
      authority.finalExecutionReleasePresent !== false || authority.statusSyncAuthorized !== false ||
      authority.branchRefUpdateAuthorized !== false || current.applicationExecuted !== false ||
      current.statusSyncPerformed !== false || current.currentBranchStatusSynchronized !== false ||
      current.readinessClaimed !== false || Object.values(application.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(application.payload?.nonClaims || {}).some(value => value !== false)) blockers.push('statusSync.nonExecutingBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationPrepared: blockers.length === 0,
    statusSyncAuthorized: false,
    statusSyncPerformed: false,
    fullPlanPackCompletedInBoundEvidence: blockers.length === 0,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false
  };
}

function evaluateApplication(application = {}, options = {}) {
  return evaluateApplicationForProjection(application, options);
}

// Existing CM-2121/2122/2123 Git objects bind the original projection. Keep
// that byte-exact historical verification separate from the active generator,
// which must not recreate the subsequently reopened current-state flag.
function evaluateHistoricalFrozenApplication(application = {}, options = {}) {
  return evaluateApplicationForProjection(application, options, { historicalFrozenStatusSync: true });
}

module.exports = {
  APPLICATION_MARKDOWN_PATH,
  APPLICATION_PATH,
  BASELINE_COMMIT,
  BASELINE_PARENT_COMMIT,
  BASELINE_PARENT_TREE,
  BASELINE_TREE,
  CURRENT_FACTS_PATH,
  REVIEW_DECISION,
  TASK_ID,
  VALIDATION_ID,
  buildApplication,
  canonicalize,
  evaluateApplication,
  evaluateHistoricalFrozenApplication,
  projectStatusFile,
  serializeArtifact,
  wrapPayload
};
