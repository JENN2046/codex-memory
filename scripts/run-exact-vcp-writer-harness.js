'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const EXACT_VCP_SHA = '555b3b538f6eb736e530c2912de678c5941f9985';
const CHILD_TIMEOUT_MS = 120_000;
const MAX_CHILD_OUTPUT_BYTES = 1024 * 1024;
const ROOT = path.resolve(__dirname, '..');
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,79}$/u;

function safeCode(value, fallback = null) {
  return typeof value === 'string' && SAFE_CODE_PATTERN.test(value)
    ? value
    : fallback;
}

function parseArguments(argv) {
  const options = {
    expectedSha: EXACT_VCP_SHA,
    json: false,
    vcpRoot: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--vcp-root') {
      options.vcpRoot = argv[++index];
    } else if (token === '--expected-sha') {
      options.expectedSha = argv[++index];
    } else if (token === '--json') {
      options.json = true;
    } else {
      throw new Error('exact_vcp_writer_harness_argument_invalid');
    }
  }
  if (options.expectedSha !== EXACT_VCP_SHA ||
      typeof options.vcpRoot !== 'string' ||
      !path.isAbsolute(options.vcpRoot) ||
      path.resolve(options.vcpRoot) !== options.vcpRoot) {
    throw new Error('exact_vcp_writer_harness_boundary_invalid');
  }
  return options;
}

function git(vcpRoot, args) {
  return childProcess.execFileSync('git', ['-C', vcpRoot, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function validateExactCheckout(vcpRoot, expectedSha) {
  const stat = fs.lstatSync(vcpRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('exact_vcp_writer_checkout_invalid');
  }
  const head = git(vcpRoot, ['rev-parse', 'HEAD']);
  if (head !== expectedSha) {
    throw new Error('exact_vcp_writer_sha_mismatch');
  }
  const trackedDiff = git(vcpRoot, [
    'status',
    '--porcelain',
    '--untracked-files=no'
  ]);
  if (trackedDiff !== '') {
    throw new Error('exact_vcp_writer_checkout_modified');
  }
  return head;
}

function syntheticEmbedding(text, index) {
  if (String(text).includes('OMIT_VECTOR_SENTINEL')) return null;
  const length = Buffer.byteLength(String(text), 'utf8');
  return [
    1,
    ((length + index) % 17 + 1) / 17,
    ((length * 3 + index) % 19 + 1) / 19,
    ((length * 7 + index) % 23 + 1) / 23
  ];
}

function createSyntheticEmbeddingServer() {
  const counters = {
    requests: 0,
    items: 0,
    omitted: 0
  };
  const server = http.createServer((request, response) => {
    if (request.method !== 'POST' ||
        request.url !== '/v1/embeddings') {
      response.writeHead(404).end();
      return;
    }
    let size = 0;
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      size += Buffer.byteLength(chunk, 'utf8');
      if (size > 1024 * 1024) {
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        response.writeHead(400).end();
        return;
      }
      const input = Array.isArray(payload?.input) ? payload.input : [];
      counters.requests += 1;
      counters.items += input.length;
      const data = input.map((text, index) => {
        const embedding = syntheticEmbedding(text, index);
        if (embedding === null) counters.omitted += 1;
        return { index, embedding };
      });
      response.writeHead(200, {
        'Content-Type': 'application/json'
      });
      response.end(JSON.stringify({ data }));
    });
  });
  return { counters, server };
}

function listenLoopback(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

function runChild({
  port,
  runtimeRoot,
  vcpRoot
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = childProcess.spawn(
      process.execPath,
      [path.join(__dirname, 'exact-vcp-writer-harness-child.js')],
      {
        cwd: runtimeRoot,
        env: {
          API_URL: `http://127.0.0.1:${port}`,
          API_Key: 'synthetic-loopback-only',
          CODEX_MEMORY_SOURCE_ROOT: ROOT,
          EMBEDDING_MAX_BATCH_ITEMS: '32',
          EXACT_VCP_EXPECTED_SHA: EXACT_VCP_SHA,
          EXACT_VCP_ROOT: vcpRoot,
          EXACT_VCP_RUNTIME_ROOT: runtimeRoot,
          KNOWLEDGEBASE_BATCH_WINDOW_MS: '60000',
          KNOWLEDGEBASE_DELETE_BATCH_WINDOW_MS: '60000',
          KNOWLEDGEBASE_DERIVED_STARTUP_COOLDOWN_MS: '600000',
          KNOWLEDGEBASE_FULL_SCAN_ON_STARTUP: 'false',
          KNOWLEDGEBASE_INDEX_IDLE_SWEEP_MS: '600000',
          KNOWLEDGEBASE_PERSIST_DEFAULT: 'false',
          KNOWLEDGEBASE_PERSIST_TAG_INDEX: 'false',
          LANG: 'C.UTF-8',
          NODE_ENV: 'test',
          PATH: process.env.PATH || '/usr/bin:/bin',
          TAGMEMO_INTRINSIC_RESIDUAL_FORCE_RECOMPUTE: 'false',
          TAG_VECTORIZE_CONCURRENCY: '1',
          TZ: 'UTC',
          VECTORDB_DIMENSION: '4',
          WhitelistEmbeddingModel: 'synthetic-loopback-v1',
          WhitelistEmbeddingModelMaxToken: '20'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    let stdout = '';
    let stderr = '';
    const settleReject = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      settleReject(new Error('exact_vcp_writer_child_timeout'));
    }, CHILD_TIMEOUT_MS);
    const append = (target, chunk) => {
      const next = target + chunk;
      if (Buffer.byteLength(next, 'utf8') > MAX_CHILD_OUTPUT_BYTES) {
        child.kill('SIGTERM');
        settleReject(new Error('exact_vcp_writer_child_output_exceeded'));
        return target;
      }
      return next;
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', chunk => {
      stderr = append(stderr, chunk);
    });
    child.once('error', error => {
      clearTimeout(timer);
      settleReject(error);
    });
    child.once('close', code => {
      clearTimeout(timer);
      if (settled) return;
      if (code !== 0) {
        let childError = null;
        try {
          const errorLine = stderr.trim().split(/\r?\n/u)
            .filter(Boolean)
            .at(-1);
          childError = JSON.parse(errorLine);
        } catch {}
        const error = new Error('exact_vcp_writer_child_failed');
        error.code = safeCode(
          childError?.code,
          'exact_vcp_writer_child_failed'
        );
        error.reasonCode = safeCode(childError?.reason_code);
        settled = true;
        reject(error);
        return;
      }
      try {
        const resultLine = stdout.trim().split(/\r?\n/u)
          .filter(Boolean)
          .at(-1);
        const result = JSON.parse(resultLine);
        settled = true;
        resolve(result);
      } catch {
        settleReject(new Error('exact_vcp_writer_child_result_invalid'));
      }
    });
  });
}

async function run(options) {
  validateExactCheckout(options.vcpRoot, options.expectedSha);
  const runtimeRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-exact-vcp-writer-')
  );
  const { counters, server } = createSyntheticEmbeddingServer();
  try {
    const port = await listenLoopback(server);
    const childResult = await runChild({
      port,
      runtimeRoot,
      vcpRoot: options.vcpRoot
    });
    assert.equal(childResult.exact_vcp_sha_verified, true);
    assert.equal(childResult.native_search.provider_invocations, 1);
    assert.equal(childResult.native_search.invocations, 1);
    assert.equal(
      childResult.projection.primary_source_unchanged_after_negatives,
      true
    );
    assert.equal(childResult.writer.unauthorized_diary_generated, true);
    assert.equal(childResult.projection.unauthorized_diary_excluded, true);
    assert.equal(
      childResult.native_search.unauthorized_diary_excluded,
      true
    );
    assert.ok(counters.requests >= 1);
    assert.ok(counters.items >= 1);
    assert.ok(counters.omitted >= 1);
    return {
      ...childResult,
      exact_vcp_sha: EXACT_VCP_SHA,
      synthetic_provider: {
        external_provider_called: false,
        loopback_only: true,
        request_count: counters.requests,
        item_count: counters.items,
        omitted_vector_count: counters.omitted
      },
      vcp_core_modified: false,
      secrets_required: false
    };
  } finally {
    if (server.listening) await closeServer(server);
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const result = await run(options);
  process.stdout.write(`${JSON.stringify(result, null, options.json ? 2 : 0)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${JSON.stringify({
      error: 'exact_vcp_writer_harness_failed',
      code: safeCode(
        error?.code,
        safeCode(error?.message, 'exact_vcp_writer_harness_failed')
      ),
      reason_code: safeCode(error?.reasonCode)
    })}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  EXACT_VCP_SHA,
  createSyntheticEmbeddingServer,
  parseArguments,
  run,
  syntheticEmbedding,
  validateExactCheckout
};
