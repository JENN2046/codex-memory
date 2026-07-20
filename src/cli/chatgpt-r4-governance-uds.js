#!/usr/bin/env node
'use strict';

const {
  loadGovernanceRuntimeFromEnvironment
} = require('../runtime/chatgpt-r4/governance-runtime-authority');

async function main() {
  const runtime = await loadGovernanceRuntimeFromEnvironment();
  await runtime.start();
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await runtime.stop();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

if (require.main === module) {
  main().catch(error => {
    const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
      ? error.code
      : 'r4_governance_runtime_failed';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main };
