'use strict';

const {
  INVENTORY_CLASSES
} = require('./SelectedAuditCorrelationDirtyScopeInventory');

const REQUIRED_APPROVAL_LINE = 'I approve CM1135_EXACT_LOCAL_COMMIT_ISOLATION_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d with request_hash 381e4d8385b9cd2dcc7e9b13668b42b5f5330bed6812a7b84c01b48b7d765ec2, limited to one local commit containing only the known CM evidence dirty scope and CM-1135 status surfaces after fresh git status, diff, ledger consistency, docs validation, focused overclaim/secret scans, and guarded diff review pass; no push, no tag/release/deploy, no clean/reset/restore/delete, no dependency/package change, no config/watchdog/startup change, no public MCP expansion, no provider/model/API call, no memory tool call, no true audit/raw store/diary/jsonl read, no durable memory/audit write beyond the local Git commit object, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no CM-1111/CM-1115/CM-1120 approval or execution, and no readiness or reliability claim.';
const REQUIRED_CM1142_APPROVAL_LINE = 'I approve CM1142_EXACT_LOCAL_COMMIT_ISOLATION_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d with request_hash 060da750a39415fd627d224d0eda1884a76679c0865d08b57a5d4ed246b91a06, limited to one local commit containing only the known CM evidence dirty scope through CM-1142 status/docs/source/test/board surfaces after fresh git status, diff, ledger consistency, docs validation, focused overclaim/secret scans, guarded diff review pass, and CM-1142 preflight acceptance; no push, no tag/release/deploy, no clean/reset/restore/delete, no dependency/package change, no config/watchdog/startup change, no public MCP expansion, no provider/model/API call, no memory tool call, no true audit/raw store/diary/jsonl read, no durable memory/audit write beyond the local Git commit object, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no CM-1111/CM-1115/CM-1120 approval or execution, and no readiness or reliability claim.';
const REQUIRED_HEAD = '16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d';
const REQUIRED_BRANCH = 'main';
const REQUIRED_REQUEST_HASH = '381e4d8385b9cd2dcc7e9b13668b42b5f5330bed6812a7b84c01b48b7d765ec2';
const REQUIRED_CM1142_REQUEST_HASH = '060da750a39415fd627d224d0eda1884a76679c0865d08b57a5d4ed246b91a06';

const PREFLIGHT_CLASSES = Object.freeze({
  BLOCKED_APPROVAL_MISSING: 'BLOCKED_APPROVAL_MISSING',
  BLOCKED_APPROVAL_MISMATCH: 'BLOCKED_APPROVAL_MISMATCH',
  BLOCKED_BRANCH_MISMATCH: 'BLOCKED_BRANCH_MISMATCH',
  BLOCKED_HEAD_MISMATCH: 'BLOCKED_HEAD_MISMATCH',
  BLOCKED_INVENTORY_NOT_KNOWN_SCOPE: 'BLOCKED_INVENTORY_NOT_KNOWN_SCOPE',
  BLOCKED_UNKNOWN_DIRTY_SCOPE: 'BLOCKED_UNKNOWN_DIRTY_SCOPE',
  BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED: 'BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED',
  FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL: 'FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL',
  ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED: 'ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED'
});

const CM1135_DIRTY_SCOPE_MAX_DOC_NUMBER = 1135;
const CM1142_DIRTY_SCOPE_MAX_DOC_NUMBER = 1142;
const CM1142_DIRTY_SCOPE_MAX_STATUS_LINES = 94;
const POST_CM1135_IMPLEMENTATION_PATH_PATTERNS = Object.freeze([
  /selected-audit-correlation-local-commit-isolation-preflight/i,
  /selected-audit-correlation-local-commit-isolation-dry-run-plan/i,
  /selected-audit-correlation-current-facts-resolution-sequence/i,
  /SelectedAuditCorrelationLocalCommitIsolationPreflight/,
  /SelectedAuditCorrelationLocalCommitIsolationDryRunPlan/,
  /SelectedAuditCorrelationPrerequisiteResolutionSequence/,
  /selected-audit-correlation-prerequisite-resolution-sequence/i
]);
const POST_CM1142_IMPLEMENTATION_PATH_PATTERNS = Object.freeze([
  /selected-audit-correlation-local-commit-isolation-(executor|execution|apply|commit)/i,
  /SelectedAuditCorrelationLocalCommitIsolation(Executor|Execution|Apply|Commit)/
]);

const APPROVAL_PACKETS = Object.freeze([
  {
    id: 'CM-1135',
    approvalLine: REQUIRED_APPROVAL_LINE,
    requestHash: REQUIRED_REQUEST_HASH,
    branch: REQUIRED_BRANCH,
    head: REQUIRED_HEAD,
    maxDocNumber: CM1135_DIRTY_SCOPE_MAX_DOC_NUMBER,
    maxDirtyLineCount: null,
    postPacketPathPatterns: POST_CM1135_IMPLEMENTATION_PATH_PATTERNS,
    staleNextStep: 'Draft a fresh local commit isolation approval packet after reviewing the expanded dirty scope; do not reuse the CM-1135 line.',
    acceptedNextStep: 'A separate guarded local commit executor may proceed only within the CM-1135 boundary; push remains forbidden.'
  },
  {
    id: 'CM-1142',
    approvalLine: REQUIRED_CM1142_APPROVAL_LINE,
    requestHash: REQUIRED_CM1142_REQUEST_HASH,
    branch: REQUIRED_BRANCH,
    head: REQUIRED_HEAD,
    maxDocNumber: CM1142_DIRTY_SCOPE_MAX_DOC_NUMBER,
    maxDirtyLineCount: CM1142_DIRTY_SCOPE_MAX_STATUS_LINES,
    postPacketPathPatterns: POST_CM1142_IMPLEMENTATION_PATH_PATTERNS,
    staleNextStep: 'Draft a newer local commit isolation approval packet after reviewing the post-CM-1142 dirty-scope expansion.',
    acceptedNextStep: 'A separate guarded local commit executor may proceed only within the CM-1142 boundary; push remains forbidden.'
  }
]);

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasMutationOrOverclaimSignal(report = {}, inventory = {}) {
  return report.commitAuthorized === true ||
    report.cleanAuthorized === true ||
    report.approvalRequestsAllowedNow === true ||
    report.readinessClaimAllowed === true ||
    report.reliabilityClaimAllowed === true ||
    inventory.commitAuthorized === true ||
    inventory.cleanAuthorized === true ||
    inventory.approvalRequestsAllowedNow === true ||
    inventory.readinessClaimAllowed === true ||
    inventory.reliabilityClaimAllowed === true ||
    inventory.safety?.commits === true ||
    inventory.safety?.cleansWorktree === true ||
    inventory.safety?.appliesMutation === true ||
    inventory.safety?.claimsReadiness === true ||
    inventory.safety?.claimsRecallReliable === true ||
    inventory.safety?.claimsWriteReliable === true;
}

function collectInventoryEntries(inventory = {}) {
  const entries = [];
  const buckets = inventory.buckets && typeof inventory.buckets === 'object'
    ? inventory.buckets
    : {};
  for (const bucketEntries of Object.values(buckets)) {
    if (Array.isArray(bucketEntries)) {
      entries.push(...bucketEntries);
    }
  }
  if (Array.isArray(inventory.unknownEntries)) {
    entries.push(...inventory.unknownEntries);
  }
  return entries;
}

function cmDocNumber(pathValue) {
  const match = String(pathValue || '').match(/^docs\/CM(\d{4})/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function packetForApprovalLine(approvalLine) {
  const normalized = normalizeText(approvalLine);
  return APPROVAL_PACKETS.find(packet => normalized === normalizeText(packet.approvalLine)) || null;
}

function findApprovalScopeExpansion(packet = {}, inventory = {}) {
  const expansionPaths = collectInventoryEntries(inventory)
    .filter(entry => {
      const path = String(entry.path || '');
      const docNumber = cmDocNumber(path);
      if (Number.isInteger(docNumber) && Number.isInteger(packet.maxDocNumber) && docNumber > packet.maxDocNumber) {
        return true;
      }
      const patterns = Array.isArray(packet.postPacketPathPatterns)
        ? packet.postPacketPathPatterns
        : [];
      return patterns.some(pattern => pattern.test(path));
    })
    .map(entry => entry.path);

  if (
    Number.isInteger(packet.maxDirtyLineCount) &&
    Number.isInteger(inventory.dirtyLineCount) &&
    inventory.dirtyLineCount > packet.maxDirtyLineCount
  ) {
    expansionPaths.push(`dirtyLineCount_exceeds_${packet.id}_packet_max:${inventory.dirtyLineCount}>${packet.maxDirtyLineCount}`);
  }

  return expansionPaths;
}

function findCm1135ApprovalScopeExpansion(inventory = {}) {
  return findApprovalScopeExpansion(APPROVAL_PACKETS[0], inventory);
}

function baseResult(preflightClass, extra = {}, packet = null) {
  return {
    status: 'blocked',
    preflightClass,
    approvalLineAccepted: false,
    branchMatched: false,
    headMatched: false,
    approvalPacketId: packet?.id || '',
    requestHash: packet?.requestHash || REQUIRED_REQUEST_HASH,
    localCommitExecutionAllowedNow: false,
    commitAuthorized: false,
    cleanAuthorized: false,
    pushAuthorized: false,
    approvalRequestsAllowedNow: false,
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: 'Keep dirty scope blocked until a non-stale exact approval line and fresh preflight are both accepted.',
    safety: {
      sourceMode: 'explicit_approval_and_current_git_facts_only',
      readsCurrentGitFacts: true,
      readsFileContents: false,
      readsTrueAuditLog: false,
      readsRawAudit: false,
      readsRawMemory: false,
      readsJsonl: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false,
      callsProvider: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      appliesMutation: false,
      commits: false,
      cleansWorktree: false,
      pushes: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    },
    ...extra,
    approvalPacketId: extra.approvalPacketId || packet?.id || ''
  };
}

function evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight(input = {}) {
  const approvalLine = normalizeText(input.approvalLine);
  const currentBranch = normalizeString(input.currentBranch);
  const currentHead = normalizeString(input.currentHead);
  const inventoryReport = input.inventoryReport && typeof input.inventoryReport === 'object'
    ? input.inventoryReport
    : {};
  const inventory = inventoryReport.inventory && typeof inventoryReport.inventory === 'object'
    ? inventoryReport.inventory
    : inventoryReport;
  const inventoryClass = normalizeString(inventoryReport.inventoryClass || inventory.inventoryClass);

  const approvalPacket = packetForApprovalLine(approvalLine);

  if (!approvalLine) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_APPROVAL_MISSING, {
      reason: 'exact_approval_line_missing',
      currentBranch,
      currentHead,
      inventoryClass,
      nextStep: 'If the user wants local commit isolation, they must provide the latest exact approval line as a fresh instruction.'
    });
  }

  if (!approvalPacket) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_APPROVAL_MISMATCH, {
      reason: 'exact_approval_line_mismatch',
      approvalLineAccepted: false,
      currentBranch,
      currentHead,
      inventoryClass
    });
  }

  if (currentBranch !== approvalPacket.branch) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_BRANCH_MISMATCH, {
      reason: 'branch_mismatch',
      approvalLineAccepted: true,
      branchMatched: false,
      currentBranch,
      currentHead,
      inventoryClass
    }, approvalPacket);
  }

  if (currentHead !== approvalPacket.head) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_HEAD_MISMATCH, {
      reason: 'head_mismatch',
      approvalLineAccepted: true,
      branchMatched: true,
      headMatched: false,
      currentBranch,
      currentHead,
      inventoryClass
    }, approvalPacket);
  }

  if (hasMutationOrOverclaimSignal(inventoryReport, inventory)) {
    return baseResult(PREFLIGHT_CLASSES.FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL, {
      reason: 'inventory_attempted_mutation_or_overclaim_authority',
      approvalLineAccepted: true,
      branchMatched: true,
      headMatched: true,
      currentBranch,
      currentHead,
      inventoryClass
    }, approvalPacket);
  }

  if (inventoryClass === INVENTORY_CLASSES.UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_UNKNOWN_DIRTY_SCOPE, {
      reason: 'unknown_dirty_scope_present',
      approvalLineAccepted: true,
      branchMatched: true,
      headMatched: true,
      currentBranch,
      currentHead,
      inventoryClass,
      unknownDirtyLineCount: inventory.unknownDirtyLineCount || 0
    }, approvalPacket);
  }

  if (inventoryClass !== INVENTORY_CLASSES.KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_INVENTORY_NOT_KNOWN_SCOPE, {
      reason: 'inventory_not_known_cm_evidence_dirty_scope',
      approvalLineAccepted: true,
      branchMatched: true,
      headMatched: true,
      currentBranch,
      currentHead,
      inventoryClass
    }, approvalPacket);
  }

  const approvalScopeExpansionPaths = findApprovalScopeExpansion(approvalPacket, inventory);
  if (approvalScopeExpansionPaths.length > 0) {
    return baseResult(PREFLIGHT_CLASSES.BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED, {
      reason: 'approval_packet_scope_expanded_after_packet_was_drafted',
      approvalLineAccepted: true,
      branchMatched: true,
      headMatched: true,
      currentBranch,
      currentHead,
      inventoryClass,
      dirtyLineCount: inventory.dirtyLineCount || 0,
      unknownDirtyLineCount: inventory.unknownDirtyLineCount || 0,
      approvalScopeExpansionPaths,
      nextStep: approvalPacket.staleNextStep
    }, approvalPacket);
  }

  return baseResult(PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED, {
    status: 'accepted_not_executed',
    reason: 'exact_approval_and_current_facts_preflight_accepted_but_this_helper_does_not_commit',
    approvalLineAccepted: true,
    branchMatched: true,
    headMatched: true,
    currentBranch,
    currentHead,
    inventoryClass,
    dirtyLineCount: inventory.dirtyLineCount || 0,
    unknownDirtyLineCount: inventory.unknownDirtyLineCount || 0,
    localCommitExecutionAllowedNow: true,
    nextStep: approvalPacket.acceptedNextStep
  }, approvalPacket);
}

module.exports = {
  APPROVAL_PACKETS,
  CM1135_DIRTY_SCOPE_MAX_DOC_NUMBER,
  CM1142_DIRTY_SCOPE_MAX_DOC_NUMBER,
  CM1142_DIRTY_SCOPE_MAX_STATUS_LINES,
  PREFLIGHT_CLASSES,
  REQUIRED_CM1142_APPROVAL_LINE,
  REQUIRED_CM1142_REQUEST_HASH,
  REQUIRED_APPROVAL_LINE,
  REQUIRED_BRANCH,
  REQUIRED_HEAD,
  REQUIRED_REQUEST_HASH,
  evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight,
  findApprovalScopeExpansion,
  findCm1135ApprovalScopeExpansion
};
