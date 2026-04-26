#!/usr/bin/env node
const { createCodexMemoryApplication } = require('../app');

function parseArgs(argv = []) {
  const options = {
    command: 'health',
    json: false,
    rootPath: '',
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--root') {
      options.rootPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--force') {
      options.force = true;
      continue;
    }
    if (!token.startsWith('--') && options.command === 'health') {
      options.command = String(token || 'health').trim().toLowerCase() || 'health';
    }
  }

  return options;
}

async function runCommand(app, options) {
  const rootPath = String(options.rootPath || app.config.activeMemoryRootPath || '').trim();
  const command = String(options.command || 'health').trim().toLowerCase();

  if (command === 'health') {
    return {
      command: 'health',
      rootPath: rootPath || null,
      health: await app.stores.chatHistoryIndexStore.getHealth()
    };
  }

  if (command === 'rebuild') {
    const result = await app.rebuildActiveMemoryFromSource({ rootPath });
    return {
      command: 'rebuild',
      rootPath: rootPath || null,
      result,
      health: await app.stores.chatHistoryIndexStore.getHealth()
    };
  }

  if (command === 'sync') {
    const result = await app.syncActiveMemoryFromSource({
      rootPath,
      force: !!options.force
    });
    return {
      command: 'sync',
      rootPath: rootPath || null,
      result,
      health: await app.stores.chatHistoryIndexStore.getHealth()
    };
  }

  throw new Error(`Unknown active-memory command: ${command}`);
}

function formatTextReport(report) {
  const lines = [
    `command: ${report.command}`,
    `rootPath: ${report.rootPath || 'unset'}`,
    `status: ${report.health?.status || 'unknown'}`
  ];

  if (report.result) {
    lines.push(`mode: ${report.result.mode || 'n/a'}`);
    lines.push(`changed: ${typeof report.result.changed === 'boolean' ? report.result.changed : 'n/a'}`);
    lines.push(`agentCount: ${report.result.agentCount ?? report.health?.agentCount ?? 0}`);
    lines.push(`topicCount: ${report.result.topicCount ?? report.health?.topicCount ?? 0}`);
    lines.push(`conversationCount: ${report.result.conversationCount ?? report.health?.conversationCount ?? 0}`);
  } else {
    lines.push(`agentCount: ${report.health?.agentCount ?? 0}`);
    lines.push(`topicCount: ${report.health?.topicCount ?? 0}`);
    lines.push(`conversationCount: ${report.health?.conversationCount ?? 0}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = createCodexMemoryApplication();
  await app.initialize();

  try {
    const payload = await runCommand(app, options);
    const report = {
      generatedAt: new Date().toISOString(),
      ...payload
    };

    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(formatTextReport(report));
    }
  } finally {
    await app.close();
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
