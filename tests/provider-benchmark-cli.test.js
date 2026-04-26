const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function startEmbeddingServer() {
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

      if (req.url !== '/v1/embeddings') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }

      const inputs = Array.isArray(parsed.input) ? parsed.input : [parsed.input];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: inputs.map((text, index) => ({
          index,
          embedding: buildEmbeddingForText(text)
        }))
      }));
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

function buildEmbeddingForText(text) {
  const normalized = String(text || '').toLowerCase();
  if (normalized.includes('side write failure') || normalized.includes('reconcile queue')) {
    return [1, 0, 0];
  }
  if (normalized.includes('recent conversation state') || normalized.includes('context vector')) {
    return [0, 1, 0];
  }
  return [0, 0, 1];
}

function runCli({ cwd, env, args = [] }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/provider-benchmark.js', ...args], {
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

test('provider benchmark CLI should compare local and jina retrieval in json mode', async () => {
  const providerServer = await startEmbeddingServer();
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-benchmark-cli-'));
  const datasetPath = path.join(tempBasePath, 'dataset.json');

  await fs.writeFile(datasetPath, JSON.stringify({
    name: 'provider-benchmark-test',
    documents: [
      {
        id: 'shadow',
        text: 'reconcile queue stores side write failure for later repair'
      },
      {
        id: 'context',
        text: 'context vector blends recent conversation state into retrieval'
      },
      {
        id: 'smoke',
        text: 'provider smoke command verifies remote connectivity'
      }
    ],
    queries: [
      {
        id: 'q-shadow',
        query: 'How does the system recover from side write failure?',
        relevant: ['shadow']
      },
      {
        id: 'q-context',
        query: 'How is recent conversation state injected into retrieval?',
        relevant: ['context']
      }
    ]
  }, null, 2), 'utf8');

  try {
    const result = await runCli({
      cwd: 'A:\\codex-memory',
      args: ['--json', '--dataset', datasetPath, '--providers', 'local,jina', '--top-k', '2'],
      env: {
        CODEX_MEMORY_BENCH_JINA_EMBEDDING_URL: providerServer.baseUrl,
        CODEX_MEMORY_BENCH_JINA_EMBEDDING_API_KEY: 'jina-key',
        CODEX_MEMORY_BENCH_JINA_EMBEDDING_MODEL: 'jina-embeddings-v4'
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.deepEqual(payload.selectedProviders, ['local', 'jina']);
    assert.equal(payload.providers.local.status, 'ok');
    assert.equal(payload.providers.jina.status, 'ok');
    assert.equal(payload.providers.jina.provider, 'jina');
    assert.equal(payload.providers.jina.metrics.top1Accuracy, 1);
    assert.equal(typeof payload.providers.local.metrics.top1Accuracy, 'number');
    assert.equal(payload.providers.jina.queries.length, 2);
    assert.equal(payload.deltas.jina.status, 'ok');
    assert.equal(typeof payload.deltas.jina.mrrDelta, 'number');

    const documentRequests = providerServer.requests.filter(item => item.url === '/v1/embeddings' && item.body.task === 'retrieval.passage');
    const queryRequests = providerServer.requests.filter(item => item.url === '/v1/embeddings' && item.body.task === 'retrieval.query');
    assert.equal(documentRequests.length, 1);
    assert.equal(documentRequests[0].body.input.length, 3);
    assert.equal(queryRequests.length, 2);
  } finally {
    await providerServer.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('provider benchmark CLI should fail when an explicitly requested remote provider is not configured', async () => {
  const result = await runCli({
    cwd: 'A:\\codex-memory',
    args: ['--json', '--providers', 'local,cohere'],
    env: {}
  });

  assert.equal(result.code, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.ok, false);
  assert.equal(payload.providers.local.status, 'ok');
  assert.equal(payload.providers.cohere.status, 'skipped');
  assert.match(payload.providers.cohere.reason, /Missing embedding api key/i);
});

test('provider benchmark CLI should support unauthenticated bge-m3-local provider', async () => {
  const providerServer = await startEmbeddingServer();
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-benchmark-bge-cli-'));
  const datasetPath = path.join(tempBasePath, 'dataset.json');

  await fs.writeFile(datasetPath, JSON.stringify({
    name: 'provider-benchmark-bge-local-test',
    documents: [
      { id: 'shadow', text: 'reconcile queue stores side write failure for later repair' },
      { id: 'context', text: 'context vector blends recent conversation state into retrieval' }
    ],
    queries: [
      { id: 'q-shadow', query: 'How does the system recover from side write failure?', relevant: ['shadow'] }
    ]
  }, null, 2), 'utf8');

  try {
    const result = await runCli({
      cwd: 'A:\\codex-memory',
      args: ['--json', '--dataset', datasetPath, '--providers', 'local,bge-m3-local'],
      env: {
        CODEX_MEMORY_BENCH_BGE_M3_LOCAL_EMBEDDING_URL: providerServer.baseUrl,
        CODEX_MEMORY_BENCH_BGE_M3_LOCAL_EMBEDDING_MODEL: 'bge-m3-local'
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.deepEqual(payload.selectedProviders, ['local', 'bge-m3-local']);
    assert.equal(payload.providers['bge-m3-local'].status, 'ok');
    assert.equal(payload.providers['bge-m3-local'].provider, 'bge-m3-local');
    assert.equal(payload.providers['bge-m3-local'].metrics.top1Accuracy, 1);

    const request = providerServer.requests[0];
    assert.equal(request.url, '/v1/embeddings');
    assert.equal(request.body.model, 'bge-m3-local');
  } finally {
    await providerServer.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
