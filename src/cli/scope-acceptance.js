#!/usr/bin/env node
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { StringDecoder } = require('node:string_decoder');
const { spawn } = require('node:child_process');

const { createCodexMemoryApplication } = require('../app');
const { CodexMemoryMcpServer } = require('../adapters/codex-mcp/server');

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
      dataDir: path.join(tempBasePath, 'data')
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

    const writeArgs = (projectId) => ({
      target: 'process',
      title: `scope test ${projectId}`,
      content: `Type: checkpoint\nrisk: verify scope isolation for ${projectId}`,
      evidence: `observed from scope acceptance CLI for ${projectId}`,
      validated: true,
      reusable: false,
      tags: ['scope-acceptance', projectId],
      sensitivity: 'none',
      project_id: projectId
    });

    const writeA = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'record_memory', arguments: writeArgs(options.projectA) }
    }, requestContext);

    const writeB = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'record_memory', arguments: writeArgs(options.projectB) }
    }, requestContext);

    const writtenA = writeA.response?.result?.structuredContent?.decision === 'accepted';
    const writtenB = writeB.response?.result?.structuredContent?.decision === 'accepted';

    const searchA = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: `scope test ${options.projectA}`,
          target: 'both',
          limit: 10,
          include_content: true,
          scope: { project_id: options.projectA, strict: true }
        }
      }
    }, requestContext);

    const searchB = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: `scope test ${options.projectB}`,
          target: 'both',
          limit: 10,
          include_content: true,
          scope: { project_id: options.projectB, strict: true }
        }
      }
    }, requestContext);

    const resultsA = searchA.response?.result?.structuredContent?.results || [];
    const resultsB = searchB.response?.result?.structuredContent?.results || [];

    const foundA = resultsA.length > 0;
    const foundB = resultsB.length > 0;
    const leakedProjectB = resultsA.some(r => {
      const title = (r.title || '').toLowerCase();
      return title.includes(options.projectB) && !title.includes(options.projectA);
    });
    const leakedProjectA = resultsB.some(r => {
      const title = (r.title || '').toLowerCase();
      return title.includes(options.projectA) && !title.includes(options.projectB);
    });

    const allOk = writtenA && writtenB && foundA && foundB && !leakedProjectB && !leakedProjectA;
    const status = allOk ? 'ok' : 'error';

    return buildReport({
      status,
      projectA: { written: writtenA, found: foundA, leakedProjectB },
      projectB: { written: writtenB, found: foundB, leakedProjectA },
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
