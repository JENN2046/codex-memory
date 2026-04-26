#!/usr/bin/env node
const { createCodexMemoryApplication } = require('./app');
const { createStdioServer } = require('./adapters/codex-mcp/stdio');

async function main() {
  const app = createCodexMemoryApplication();
  await app.initialize();
  createStdioServer({ app });
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
