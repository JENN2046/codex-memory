#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const REJECTED_FLAGS = new Set(['--execute', '--apply', '--confirm', '--write', '--mutate']);

function parseArgs(argv = []) {
  const options = {
    json: false,
    rejectedFlag: '',
    dbPath: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--db') {
      options.dbPath = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function resolveDbPath(options = {}) {
  if (options.dbPath) return options.dbPath;
  if (process.env.CODEX_MEMORY_DB_PATH) {
    return path.resolve(process.cwd(), process.env.CODEX_MEMORY_DB_PATH);
  }
  const dataDir = process.env.CODEX_MEMORY_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(path.resolve(process.cwd(), dataDir), 'codex-memory.sqlite');
}

function emptyAgeBreakdown() {
  return { last24h: 0, last7d: 0, last30d: 0, older30d: 0 };
}

function collectStoreFreshness(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return {
      status: 'warn',
      records: 0,
      chunks: 0,
      ageBreakdown: emptyAgeBreakdown(),
      message: `Database not found: ${dbPath}`
    };
  }

  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);
  try {
    const recordCount = Number(db.prepare('SELECT COUNT(*) as cnt FROM memory_records').get().cnt) || 0;
    let chunkCount = 0;
    try {
      chunkCount = Number(db.prepare('SELECT COUNT(*) as cnt FROM memory_chunks').get().cnt) || 0;
    } catch {
      chunkCount = 0;
    }

    const now = new Date();
    const d1 = new Date(now - 86400000).toISOString();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const ageBreakdown = {
      last24h: Number(db.prepare('SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at > ?').get(d1).cnt) || 0,
      last7d: Number(db.prepare('SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at > ?').get(d7).cnt) || 0,
      last30d: Number(db.prepare('SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at > ?').get(d30).cnt) || 0,
      older30d: 0
    };
    ageBreakdown.older30d = Math.max(0, recordCount - ageBreakdown.last30d);

    return {
      status: recordCount > 0 ? 'ok' : 'warn',
      records: recordCount,
      chunks: chunkCount,
      ageBreakdown
    };
  } finally {
    db.close();
  }
}

function buildProposedRecordMemoryArguments(store) {
  return {
    target: 'process',
    title: 'codex-memory local mainline freshness evidence',
    content: [
      'Type: local-mainline-write-path-evidence',
      'Purpose: bounded freshness evidence for codex-memory local mainline stability.',
      'Boundary: exactly one sanitized record_memory write after explicit authorization only.',
      'No provider call, broad memory scan, config change, public MCP expansion, push, deploy, or readiness claim.'
    ].join('\n'),
    evidence: `store_freshness_preflight last24h=${store.ageBreakdown.last24h} last7d=${store.ageBreakdown.last7d} records=${store.records}`,
    validated: true,
    reusable: false,
    tags: ['codex-memory', 'mainline-health', 'write-path-evidence'],
    sensitivity: 'none',
    client_id: 'codex',
    visibility: 'project',
    retention_policy: 'keep'
  };
}

function buildApprovalPacket(store, proposedArguments) {
  return {
    packetId: 'CM-0732-store-freshness-write-evidence-approval-packet-v0',
    approvalState: 'NOT_APPROVED',
    decision: 'APPROVAL_REQUIRED_BEFORE_WRITE',
    exactAction: 'Execute exactly one sanitized record_memory write for local store freshness evidence.',
    proposedTool: 'record_memory',
    proposedArguments,
    budget: {
      maxMemoryWrites: 1,
      maxMcpToolCalls: 1,
      maxProviderCalls: 0,
      maxApiCalls: 0,
      maxRemoteActions: 0
    },
    currentEvidence: {
      storeRecords: store.records,
      storeChunks: store.chunks,
      last24h: store.ageBreakdown.last24h,
      last7d: store.ageBreakdown.last7d,
      last30d: store.ageBreakdown.last30d
    },
    forbiddenActions: [
      'search_memory',
      'memory_overview broad scan',
      'provider call',
      'config change',
      'watchdog/startup change',
      'public MCP expansion',
      'additional durable write',
      'push',
      'release',
      'deploy',
      'cutover',
      'readiness claim'
    ],
    requiredPostExecutionEvidence: [
      'record_memory response decision is accepted',
      'exactly one memory write was attempted',
      'write audit side effect is the only expected durable side effect',
      'dashboard StoreFresh is rechecked after execution',
      'readiness remains NOT_READY_BLOCKED unless all governance blockers are separately closed'
    ],
    rollbackOrCleanup: 'Do not delete evidence automatically. If the future evidence write is wrong, use an explicitly approved lifecycle governance action such as validate/supersede/tombstone; this preflight performs no cleanup.',
    operatorApprovalLine: 'Approve exactly one sanitized record_memory write using this approvalPacket.proposedArguments; no search_memory, provider/API call, config/startup change, remote action, additional write, or readiness claim is authorized.'
  };
}

function buildRejectedFlagReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'REJECTED_MUTATION_FLAG',
    dryRun: true,
    mutated: false,
    rejectedFlag,
    memoryWrites: 0,
    proposedMemoryWrites: 0,
    readinessClaimAllowed: false,
    error: `${rejectedFlag} is not supported by store freshness write preflight.`,
    nextStep: 'Re-run without execute/apply/confirm/write/mutate flags.'
  };
}

function buildReport(options = {}) {
  if (options.rejectedFlag) return buildRejectedFlagReport(options.rejectedFlag);

  const dbPath = resolveDbPath(options);
  let store;
  try {
    store = collectStoreFreshness(dbPath);
  } catch (error) {
    return {
      status: 'error',
      decision: 'STORE_FRESHNESS_EVIDENCE_BLOCKED',
      dryRun: true,
      mutated: false,
      dbAvailable: false,
      dbPath,
      memoryWrites: 0,
      proposedMemoryWrites: 0,
      readinessClaimAllowed: false,
      error: error.message || 'failed to inspect store freshness',
      nextStep: 'Fix local store inspection before preparing bounded write-path evidence.'
    };
  }

  const needsEvidence = store.ageBreakdown.last24h === 0;
  const decision = needsEvidence
    ? 'STORE_FRESHNESS_EVIDENCE_PREPARED_EXACT_ONLY'
    : 'STORE_FRESHNESS_EVIDENCE_NOT_REQUIRED';

  const proposedArguments = needsEvidence ? buildProposedRecordMemoryArguments(store) : null;
  const approvalPacket = needsEvidence ? buildApprovalPacket(store, proposedArguments) : null;

  return {
    status: needsEvidence ? 'warn' : 'ok',
    decision,
    dryRun: true,
    mutated: false,
    dbAvailable: fs.existsSync(dbPath),
    dbPath,
    store: {
      status: store.status,
      records: store.records,
      chunks: store.chunks,
      ageBreakdown: store.ageBreakdown,
      message: store.message || ''
    },
    approvalRequired: needsEvidence,
    explicitApprovalRequired: needsEvidence,
    proposedTool: needsEvidence ? 'record_memory' : null,
    proposedArguments,
    approvalPacket,
    memoryWrites: 0,
    proposedMemoryWrites: needsEvidence ? 1 : 0,
    providerCalls: 0,
    apiCalls: 0,
    mcpToolCalls: 0,
    remoteActionsPerformed: false,
    readinessClaimAllowed: false,
    safety: {
      noDurableMemoryWrite: true,
      noMcpToolCall: true,
      noProviderCall: true,
      noConfigChange: true,
      noPublicMcpExpansion: true,
      noRemoteAction: true,
      rawPrivateDataPrinted: false
    },
    commandPreview: 'node .\\src\\cli\\store-freshness-write-preflight.js --json',
    nextStep: needsEvidence
      ? 'If freshness evidence is still required, request exact approval for one sanitized record_memory write using proposedArguments.'
      : 'No freshness evidence write is currently needed; keep monitoring StoreFresh before readiness claim.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `dryRun: ${report.dryRun}`,
    `mutated: ${report.mutated}`,
    `memoryWrites: ${report.memoryWrites}`,
    `proposedMemoryWrites: ${report.proposedMemoryWrites}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed}`
  ];

  if (report.store) {
    lines.push(`storeFreshness: ${report.store.ageBreakdown.last24h} in 24h, ${report.store.ageBreakdown.last7d} in 7d`);
  }
  if (report.proposedTool) {
    lines.push(`proposedTool: ${report.proposedTool}`);
    lines.push(`approvalRequired: ${report.approvalRequired}`);
  }
  if (report.approvalPacket) {
    lines.push(`approvalPacket: ${report.approvalPacket.packetId}/${report.approvalPacket.approvalState}`);
    lines.push(`operatorApprovalLine: ${report.approvalPacket.operatorApprovalLine}`);
  }
  if (report.error) lines.push(`error: ${report.error}`);
  lines.push(`nextStep: ${report.nextStep}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReport,
  buildApprovalPacket,
  buildProposedRecordMemoryArguments,
  collectStoreFreshness,
  parseArgs
};
