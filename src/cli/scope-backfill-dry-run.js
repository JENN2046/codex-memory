#!/usr/bin/env node
const path = require('node:path');
const { createCodexMemoryApplication } = require('../app');

function parseArgs(argv = []) {
  const options = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; }
  }
  return options;
}

async function runReport() {
  const app = createCodexMemoryApplication({
    projectBasePath: process.env.CODEX_MEMORY_BASE_PATH || process.cwd(),
    dailyNoteRootPath: process.env.CODEX_MEMORY_BASE_PATH
      ? path.join(process.env.CODEX_MEMORY_BASE_PATH, 'dailynote')
      : path.join(process.cwd(), 'data', 'dailynote'),
    logsDir: process.env.CODEX_MEMORY_BASE_PATH
      ? path.join(process.env.CODEX_MEMORY_BASE_PATH, 'logs')
      : path.join(process.cwd(), 'logs'),
    dataDir: process.env.CODEX_MEMORY_BASE_PATH
      ? path.join(process.env.CODEX_MEMORY_BASE_PATH, 'data')
      : path.join(process.cwd(), 'data')
  });

  try {
    await app.initialize();
  } catch {
    return {
      status: 'warn',
      totalRecords: 0,
      alreadyScoped: 0,
      missingProjectId: 0,
      missingClientId: 0,
      missingWorkspaceId: 0,
      missingVisibility: 0,
      suggestedDefaults: {
        client_id: 'codex',
        project_id: 'codex-memory',
        workspace_id: '<manual-review-required>',
        visibility: 'project'
      },
      wouldUpdate: 0,
      mutated: false,
      reason: 'shadow store unavailable'
    };
  }

  try {
    const records = await app.stores.shadowStore.listRecords('both');
    let alreadyScoped = 0;
    let missingProjectId = 0;
    let missingClientId = 0;
    let missingWorkspaceId = 0;
    let missingVisibility = 0;
    let wouldUpdate = 0;

    for (const record of records) {
      const missingScopeField = !record.projectId || !record.workspaceId || !record.clientId || !record.visibility;
      if (record.projectId && record.workspaceId && record.clientId && record.visibility) {
        alreadyScoped += 1;
      }
      if (!record.projectId) missingProjectId += 1;
      if (!record.clientId) missingClientId += 1;
      if (!record.workspaceId) missingWorkspaceId += 1;
      if (!record.visibility) missingVisibility += 1;
      if (missingScopeField) wouldUpdate += 1;
    }

    return {
      status: 'ok',
      totalRecords: records.length,
      alreadyScoped,
      missingProjectId,
      missingClientId,
      missingWorkspaceId,
      missingVisibility,
      suggestedDefaults: {
        client_id: 'codex',
        project_id: 'codex-memory',
        workspace_id: '<manual-review-required>',
        visibility: 'project'
      },
      wouldUpdate,
      mutated: false
    };
  } catch (error) {
    return {
      status: 'warn',
      totalRecords: 0,
      alreadyScoped: 0,
      missingProjectId: 0,
      missingClientId: 0,
      missingWorkspaceId: 0,
      missingVisibility: 0,
      suggestedDefaults: {
        client_id: 'codex',
        project_id: 'codex-memory',
        workspace_id: '<manual-review-required>',
        visibility: 'project'
      },
      wouldUpdate: 0,
      mutated: false,
      reason: error.message || 'unknown error'
    };
  } finally {
    try { await app.close(); } catch { /* ignore */ }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await runReport();

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(`status: ${report.status}\n`);
    process.stdout.write(`totalRecords: ${report.totalRecords}\n`);
    process.stdout.write(`alreadyScoped: ${report.alreadyScoped}\n`);
    process.stdout.write(`missingProjectId: ${report.missingProjectId}\n`);
    process.stdout.write(`missingClientId: ${report.missingClientId}\n`);
    process.stdout.write(`missingWorkspaceId: ${report.missingWorkspaceId}\n`);
    process.stdout.write(`missingVisibility: ${report.missingVisibility}\n`);
    process.stdout.write(`wouldUpdate: ${report.wouldUpdate}\n`);
    process.stdout.write(`mutated: ${report.mutated}\n`);
  }

  process.exitCode = report.status === 'error' ? 1 : 0;
}

main();
