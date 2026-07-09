#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { createCodexMemoryApplication } = require('./app');
const { createStreamableHttpServer } = require('./adapters/codex-mcp/http');
const { computeRuntimeSourceFingerprint } = require('./core/RuntimeFreshness');

function appendLogLine(logPath, level, message) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}\n`;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // ignore log file failures
  }

  const stream = level === 'error' ? process.stderr : process.stdout;
  try {
    stream.write(line);
  } catch {
    // ignore stderr failures
  }
}

async function main() {
  const app = createCodexMemoryApplication();
  await app.initialize();

  const logger = {
    info(message) {
      appendLogLine(app.config.httpLogPath, 'info', message);
    },
    error(message) {
      appendLogLine(app.config.httpLogPath, 'error', message);
    }
  };

  const httpServer = createStreamableHttpServer({
    app,
    host: app.config.httpHost,
    port: app.config.httpPort,
    mcpPath: app.config.httpMcpPath,
    bearerToken: app.config.httpBearerToken,
    runtimeFreshness: {
      ...computeRuntimeSourceFingerprint(),
      startedAt: new Date().toISOString()
    }
  });

  const address = await httpServer.listen();
  if (httpServer.authWarning) {
    logger.info(httpServer.authWarning);
  }
  logger.info(`vcp_codex_memory HTTP MCP listening on ${address.url}`);

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Shutting down vcp_codex_memory HTTP MCP after ${signal}`);

    try {
      await httpServer.close();
      await app.close();
    } catch (error) {
      logger.error(error.stack || error.message || String(error));
      process.exitCode = 1;
    }
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT').finally(() => process.exit());
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').finally(() => process.exit());
  });
}

main().catch(error => {
  const message = error.stack || error.message || String(error);
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // ignore stderr failures
  }
  process.exitCode = 1;
});
