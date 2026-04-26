const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function startProviderServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      requests.push({
        url: req.url,
        body: parsed
      });

      if (req.url === '/v1/embeddings') {
        const inputs = Array.isArray(parsed.input) ? parsed.input : [parsed.input];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: inputs.map((_, index) => ({
            index,
            embedding: [0.8 - index * 0.1, 0.2 + index * 0.1]
          }))
        }));
        return;
      }

      if (req.url === '/v1/rerank') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          results: [
            { index: 1, relevance_score: 0.92 },
            { index: 0, relevance_score: 0.27 }
          ]
        }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    requests,
    async close() {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

function runCli({ cwd, env, args = [] }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/provider-smoke.js', ...args], {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('provider smoke CLI should report embedding and rerank success in json mode', async () => {
  const providerServer = await startProviderServer();
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-provider-cli-'));

  try {
    const result = await runCli({
      cwd: process.cwd(),
      args: ['--json', '--query', 'migration query', '--documents', 'doc one || doc two'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_EMBED_DIMS: '2',
        CODEX_MEMORY_EMBEDDING_PROVIDER: 'jina',
        CODEX_MEMORY_EMBEDDING_URL: providerServer.baseUrl,
        CODEX_MEMORY_EMBEDDING_API_KEY: 'embed-key',
        CODEX_MEMORY_EMBEDDING_MODEL: 'jina-embeddings-v4',
        CODEX_MEMORY_RERANK_PROVIDER: 'jina',
        CODEX_MEMORY_RERANK_URL: providerServer.baseUrl,
        CODEX_MEMORY_RERANK_API_KEY: 'rerank-key',
        CODEX_MEMORY_RERANK_MODEL: 'jina-reranker-v2-base-multilingual'
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.deepEqual(payload.selectedChecks, ['embedding', 'rerank']);
    assert.equal(payload.results.embedding.status, 'ok');
    assert.equal(payload.results.rerank.status, 'ok');
    assert.equal(payload.results.embedding.provider, 'jina');
    assert.equal(payload.results.rerank.provider, 'jina');

    const embeddingRequests = providerServer.requests.filter(item => item.url === '/v1/embeddings');
    const rerankRequests = providerServer.requests.filter(item => item.url === '/v1/rerank');
    assert.ok(embeddingRequests.length >= 2);
    assert.equal(embeddingRequests[0].body.task, 'retrieval.query');
    assert.equal(embeddingRequests[1].body.task, 'retrieval.passage');
    assert.equal(rerankRequests.length, 1);
    assert.equal(rerankRequests[0].body.top_n, 2);
  } finally {
    await providerServer.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
