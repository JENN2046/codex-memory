#!/usr/bin/env node
const { createCodexMemoryApplication } = require('../app');

async function main() {
  const app = createCodexMemoryApplication();
  await app.initialize();
  const result = await app.rebuildShadowFromDiary();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
