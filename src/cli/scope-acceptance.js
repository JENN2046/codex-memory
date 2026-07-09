#!/usr/bin/env node
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../app');
const { CodexMemoryMcpServer } = require('../adapters/codex-mcp/server');

const SCOPE_DIMENSIONS = ['project_id', 'workspace_id', 'client_id', 'visibility'];

function parseArgs(argv = []) {
  const options = {
    json: false,
    keepTemp: false,
    projectA: 'project-a',
    projectB: 'project-b'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') { options.json = true; continue; }
    if (token === '--keep-temp') { options.keepTemp = true; continue; }
    if (token === '--project-a') { options.projectA = argv[i + 1] || options.projectA; i += 1; continue; }
    if (token === '--project-b') { options.projectB = argv[i + 1] || options.projectB; i += 1; continue; }
  }

  return options;
}

function buildReport({ status, projectA, projectB, tempWorkspace, error }) {
  const report = {
    status,
    strictMode: true,
    dimensions: SCOPE_DIMENSIONS,
    projectA,
    projectB
  };
  if (tempWorkspace) report.tempWorkspace = tempWorkspace;
  if (status === 'ok') {
    report.recommendation = 'scope acceptance passed';
  } else {
    report.recommendation = error || 'scope acceptance failed';
  }
  return report;
}

async function runAcceptance(options) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'scope-acceptance-'));
  let app;
  try {
    app = createCodexMemoryApplication({
      projectBasePath: tempBasePath,
      dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
      logsDir: path.join(tempBasePath, 'logs'),
      dataDir: path.join(tempBasePath, 'data'),
      mcpPublicToolSurface: 'full'
    });
    await app.initialize();

    const server = new CodexMemoryMcpServer({ app });
    const requestContext = {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'scope-acceptance'
      }
    };

    const scopeA = {
      project_id: options.projectA,
      workspace_id: `${options.projectA}-workspace`,
      client_id: 'codex',
      visibility: 'project'
    };
    const scopeB = {
      project_id: options.projectB,
      workspace_id: `${options.projectB}-workspace`,
      client_id: 'claude',
      visibility: 'shared'
    };

    const writeArgs = (projectId, scope) => ({
      target: 'process',
      title: `scope test ${projectId}`,
      content: `Type: checkpoint\nrisk: verify scope isolation for ${projectId}`,
      evidence: `observed from scope acceptance CLI for ${projectId}`,
      validated: true,
      reusable: false,
      tags: ['scope-acceptance', projectId],
      sensitivity: 'none',
      ...scope
    });

    const writeA = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'record_memory', arguments: writeArgs(options.projectA, scopeA) }
    }, requestContext);

    const writeB = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'record_memory', arguments: writeArgs(options.projectB, scopeB) }
    }, requestContext);

    const writtenA = writeA.response?.result?.structuredContent?.decision === 'accepted';
    const writtenB = writeB.response?.result?.structuredContent?.decision === 'accepted';
    const memoryIdA = writeA.response?.result?.structuredContent?.memoryId || null;
    const memoryIdB = writeB.response?.result?.structuredContent?.memoryId || null;

    const searchA = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'scope test verify isolation',
          target: 'both',
          limit: 10,
          include_content: true,
          scope: { ...scopeA, strict: true }
        }
      }
    }, requestContext);

    const searchB = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'scope test verify isolation',
          target: 'both',
          limit: 10,
          include_content: true,
          scope: { ...scopeB, strict: true }
        }
      }
    }, requestContext);

    const resultsA = searchA.response?.result?.structuredContent?.results || [];
    const resultsB = searchB.response?.result?.structuredContent?.results || [];

    const foundA = memoryIdA ? resultsA.some(result => result.memoryId === memoryIdA) : false;
    const foundB = memoryIdB ? resultsB.some(result => result.memoryId === memoryIdB) : false;
    const leakedProjectB = memoryIdB ? resultsA.some(result => result.memoryId === memoryIdB) : true;
    const leakedProjectA = memoryIdA ? resultsB.some(result => result.memoryId === memoryIdA) : true;

    const allOk = writtenA && writtenB && foundA && foundB && !leakedProjectB && !leakedProjectA;
    const status = allOk ? 'ok' : 'error';

    return buildReport({
      status,
      projectA: { written: writtenA, found: foundA, leakedProjectB, scope: scopeA },
      projectB: { written: writtenB, found: foundB, leakedProjectA, scope: scopeB },
      tempWorkspace: options.keepTemp ? tempBasePath : undefined
    });
  } catch (error) {
    return buildReport({
      status: 'error',
      projectA: { written: false, found: false, leakedProjectB: false },
      projectB: { written: false, found: false, leakedProjectA: false },
      error: error.message || String(error)
    });
  } finally {
    if (app) {
      try { await app.close(); } catch { /* ignore */ }
    }
    if (!options.keepTemp) {
      try { await fs.rm(tempBasePath, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await runAcceptance(options);

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(`status: ${report.status}\n`);
    process.stdout.write(`projectA: written=${report.projectA.written} found=${report.projectA.found} leaked=${report.projectA.leakedProjectB}\n`);
    process.stdout.write(`projectB: written=${report.projectB.written} found=${report.projectB.found} leaked=${report.projectB.leakedProjectA}\n`);
    if (report.tempWorkspace) {
      process.stdout.write(`tempWorkspace: ${report.tempWorkspace}\n`);
    }
    process.stdout.write(`recommendation: ${report.recommendation}\n`);
  }

  process.exitCode = report.status === 'ok' ? 0 : 1;
}

main();
