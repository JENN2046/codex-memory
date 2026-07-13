'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const OWNER = 'VCPToolBox';
const OWNER_COMPONENT = 'DailyNote';
const OWNER_COMMUNICATION = 'stdio';
const RUNTIME_IDENTITY_FILENAME = '.codex-memory-vcptoolbox-runtime-identity.json';
const DEFAULT_STORE_IDENTITY_FILENAME = '.codex-memory-cm2113-vcptoolbox-owner-store-identity.json';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function exactObject(actual, expected) {
  return JSON.stringify(canonicalize(actual)) === JSON.stringify(canonicalize(expected));
}

async function readExactRegularFile(filePath, expectedSha256) {
  const stat = await fs.lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('owner_runtime_binding_not_regular_file');
  const bytes = await fs.readFile(filePath);
  if (sha256(bytes) !== expectedSha256) throw new Error('owner_runtime_binding_sha256_mismatch');
  return bytes;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createDailyNoteInput(args = {}, fixed = {}) {
  const title = normalizeString(args.title);
  const content = normalizeString(args.content);
  const evidence = normalizeString(args.evidence);
  const sensitivity = normalizeString(args.sensitivity);
  if (!title || !content || !evidence || !sensitivity) throw new Error('owner_runtime_record_arguments_incomplete');
  return {
    command: 'create',
    folder: fixed.folder,
    maid: fixed.maid,
    Date: fixed.date,
    fileName: fixed.fileName,
    Content: [
      `# ${title}`,
      '',
      content,
      '',
      '## Evidence',
      '',
      evidence,
      '',
      `Sensitivity: ${sensitivity}`
    ].join('\n'),
    Tag: fixed.tag
  };
}

function createExpectedDailyNoteMarkdown(args = {}, fixed = {}) {
  const input = createDailyNoteInput(args, fixed);
  return [
    `[${fixed.date}] - ${fixed.maid}`,
    `[${fixed.localTime}]`,
    input.Content,
    `Tag: ${fixed.tag}`
  ].join('\n');
}

function projectBusinessRecordArguments(args = {}) {
  return {
    target: args.target,
    title: args.title,
    content: args.content,
    evidence: args.evidence,
    validated: args.validated,
    reusable: args.reusable,
    sensitivity: args.sensitivity
  };
}

function governedTransportEnvelopeAccepted(args, expected) {
  const bridge = args?.governed_bridge;
  return exactObject(args?.scope, expected.allowedScope) &&
    bridge?.primary_runtime === 'VCPToolBox native memory' &&
    bridge?.access_path === 'governed MCP tools' &&
    bridge?.client_id === 'Codex' &&
    exactObject(bridge?.scope, expected.allowedScope) &&
    bridge?.visibility === expected.allowedScope.visibility &&
    bridge?.runtime_target?.primary_runtime === 'VCPToolBox native memory' &&
    bridge?.runtime_target?.target_reference_name === expected.targetReferenceName &&
    bridge?.runtime_target?.target_kind === 'mcp_server' &&
    bridge?.runtime_target?.bound === true &&
    bridge?.runtime_target?.endpoint_included === false &&
    bridge?.runtime_target?.token_material_included === false &&
    bridge?.invocation_tool_name === 'record_memory' &&
    bridge?.native_tool_name === 'knowledge_base.record' &&
    bridge?.read_allowed === false &&
    bridge?.write_allowed === true &&
    bridge?.raw_output_allowed === false &&
    bridge?.tool_arguments_may_override_governance === false &&
    bridge?.governance_metadata_may_override_transport_context === false &&
    bridge?.raw_request_body_disclosed === false &&
    bridge?.raw_response_body_disclosed === false &&
    bridge?.endpoint_disclosed === false &&
    bridge?.token_material_disclosed === false &&
    bridge?.low_disclosure === true &&
    bridge?.readiness_claimed === false;
}

function runOwnerRuntime({ nodeExecutable, pluginPath, pluginDirectory, input, env, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(nodeExecutable, [pluginPath], {
      cwd: pluginDirectory,
      env,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderrBytes = 0;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('owner_runtime_timeout'));
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (Buffer.byteLength(stdout, 'utf8') > 64 * 1024 && !settled) {
        settled = true;
        clearTimeout(timer);
        child.kill('SIGKILL');
        reject(new Error('owner_runtime_stdout_budget_exceeded'));
      }
    });
    child.stderr.on('data', chunk => { stderrBytes += chunk.length; });
    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`owner_runtime_spawn_failed:${error.code || 'unknown'}`));
    });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch { /* low-disclosure failure below */ }
      if (code !== 0 || parsed?.status !== 'success') {
        const error = new Error('owner_runtime_execution_failed');
        error.ownerRuntimeExitCode = code;
        error.ownerRuntimeStderrPresent = stderrBytes > 0;
        reject(error);
        return;
      }
      resolve({ parsed, exitCode: code, stderrPresent: stderrBytes > 0 });
    });
    child.stdin.end(JSON.stringify(input));
  });
}

async function listMarkdownFiles(root) {
  const output = [];
  async function walk(current, depth) {
    if (depth > 2) throw new Error('owner_runtime_store_depth_exceeded');
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error('owner_runtime_store_symlink_rejected');
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(child, depth + 1);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) output.push(child);
    }
  }
  await walk(root, 0);
  return output.sort();
}

async function inspectStore(root, identityFilename) {
  const markdown = [];
  let directories = 0;
  async function walk(current, depth) {
    if (depth > 2) throw new Error('owner_runtime_store_depth_exceeded');
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error('owner_runtime_store_symlink_rejected');
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) {
        directories += 1;
        await walk(child, depth + 1);
      } else if (entry.isFile()) {
        const atRoot = current === root;
        if (atRoot && entry.name === identityFilename) continue;
        if (!entry.name.toLowerCase().endsWith('.md')) {
          throw new Error('owner_runtime_store_unexpected_file');
        }
        markdown.push(child);
      } else {
        throw new Error('owner_runtime_store_unexpected_entry');
      }
    }
  }
  await walk(root, 0);
  return { markdown: markdown.sort(), directories };
}

function createVcpToolBoxDailyNoteOwnerRuntimeAdapter(options = {}) {
  const runtimeRoot = path.resolve(options.runtimeRoot || '');
  const pluginDirectory = path.join(runtimeRoot, 'Plugin', 'DailyNote');
  const pluginPath = path.join(pluginDirectory, 'dailynote.js');
  const manifestPath = path.join(pluginDirectory, 'plugin-manifest.json');
  const preloadPath = path.join(runtimeRoot, 'cm2113-frozen-clock-preload.js');
  const runtimeIdentityPath = path.join(runtimeRoot, RUNTIME_IDENTITY_FILENAME);
  const storeRoot = path.resolve(options.storeRoot || '');
  const storeIdentityFilename = options.storeIdentityFilename || DEFAULT_STORE_IDENTITY_FILENAME;
  const storeIdentityPath = path.join(storeRoot, storeIdentityFilename);
  const fixed = Object.freeze({ ...(options.fixedRecord || {}) });
  const expected = Object.freeze({ ...(options.expected || {}) });
  const dependencyRoot = path.resolve(options.dependencyRoot || '');
  const nodeExecutable = options.nodeExecutable || process.execPath;
  const timeoutMs = Number.isInteger(options.timeoutMs) ? options.timeoutMs : 30_000;
  let preflightResult = null;

  async function preflight() {
    for (const value of [
      expected.runtimeIdentitySha256,
      expected.pluginSha256,
      expected.manifestSha256,
      expected.preloadSha256,
      expected.storeIdentitySha256,
      expected.recordArgumentsCanonicalSha256,
      expected.durableMarkdownSha256,
      expected.dependencyLockSha256,
      expected.dotenvPackageSha256,
      expected.dotenvMainSha256
    ]) {
      if (!/^[a-f0-9]{64}$/.test(value || '')) throw new Error('owner_runtime_expected_binding_incomplete');
    }
    for (const value of [
      expected.runtimeSourceCommit,
      expected.runtimeSourceTree,
      expected.pluginBlobOid,
      expected.manifestBlobOid,
      expected.dependencyLockBlobOid
    ]) {
      if (!/^[a-f0-9]{40}$/.test(value || '')) throw new Error('owner_runtime_expected_git_binding_incomplete');
    }
    for (const value of [expected.storeReference, expected.storeInstanceId, expected.lifecycleReference]) {
      if (!/^[A-Za-z0-9._:-]{1,200}$/.test(value || '')) throw new Error('owner_runtime_expected_store_binding_incomplete');
    }
    for (const value of [expected.targetReferenceName, expected.allowedScope?.project_id, expected.allowedScope?.workspace_id, expected.allowedScope?.scope_id, expected.allowedScope?.client_id]) {
      if (!/^[A-Za-z0-9._:-]{1,200}$/.test(value || '')) throw new Error('owner_runtime_expected_transport_binding_incomplete');
    }
    if (expected.allowedScope?.visibility !== 'project') throw new Error('owner_runtime_expected_transport_binding_incomplete');
    for (const value of [fixed.folder, fixed.maid, fixed.date, fixed.fileName, fixed.localTime, fixed.tag]) {
      if (!normalizeString(value)) throw new Error('owner_runtime_fixed_record_binding_incomplete');
    }
    const runtimeStat = await fs.lstat(runtimeRoot);
    const storeStat = await fs.lstat(storeRoot);
    const dependencyStat = await fs.lstat(dependencyRoot);
    if (!runtimeStat.isDirectory() || runtimeStat.isSymbolicLink()) throw new Error('owner_runtime_root_invalid');
    if (!storeStat.isDirectory() || storeStat.isSymbolicLink()) throw new Error('owner_runtime_store_root_invalid');
    if (!dependencyStat.isDirectory() || dependencyStat.isSymbolicLink()) throw new Error('owner_runtime_dependency_root_invalid');
    const runtimeIdentityBytes = await readExactRegularFile(runtimeIdentityPath, expected.runtimeIdentitySha256);
    await readExactRegularFile(pluginPath, expected.pluginSha256);
    const manifestBytes = await readExactRegularFile(manifestPath, expected.manifestSha256);
    await readExactRegularFile(preloadPath, expected.preloadSha256);
    const storeIdentityBytes = await readExactRegularFile(storeIdentityPath, expected.storeIdentitySha256);
    const runtimeIdentity = JSON.parse(runtimeIdentityBytes.toString('utf8'));
    if (
      runtimeIdentity.memoryIntelligenceOwner !== OWNER ||
      runtimeIdentity.ownerRuntimeComponent !== OWNER_COMPONENT ||
      runtimeIdentity.ownerRuntimeCommunication !== OWNER_COMMUNICATION ||
      runtimeIdentity.runtimeSourceCommit !== expected.runtimeSourceCommit ||
      runtimeIdentity.runtimeSourceTree !== expected.runtimeSourceTree ||
      runtimeIdentity.pluginBlobOid !== expected.pluginBlobOid ||
      runtimeIdentity.manifestBlobOid !== expected.manifestBlobOid ||
      runtimeIdentity.pluginSha256 !== expected.pluginSha256 ||
      runtimeIdentity.manifestSha256 !== expected.manifestSha256 ||
      runtimeIdentity.preloadSha256 !== expected.preloadSha256 ||
      runtimeIdentity.dependencyLockBlobOid !== expected.dependencyLockBlobOid ||
      runtimeIdentity.dependencyLockSha256 !== expected.dependencyLockSha256 ||
      runtimeIdentity.dotenvVersion !== expected.dotenvVersion ||
      runtimeIdentity.dotenvPackageSha256 !== expected.dotenvPackageSha256 ||
      runtimeIdentity.dotenvMainSha256 !== expected.dotenvMainSha256
    ) throw new Error('owner_runtime_identity_binding_mismatch');
    const storeIdentity = JSON.parse(storeIdentityBytes.toString('utf8'));
    if (
      storeIdentity.storeReference !== expected.storeReference ||
      storeIdentity.storeInstanceId !== expected.storeInstanceId ||
      storeIdentity.lifecycleReference !== expected.lifecycleReference ||
      storeIdentity.syntheticOnly !== true ||
      storeIdentity.identityPresentBeforeFirstNativeWrite !== true ||
      storeIdentity.replacementAllowed !== false ||
      storeIdentity.reinitializationAllowed !== false ||
      storeIdentity.realMemoryAllowed !== false
    ) throw new Error('owner_runtime_store_identity_binding_mismatch');
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    if (
      manifest.name !== OWNER_COMPONENT ||
      manifest.pluginType !== 'synchronous' ||
      manifest.communication?.protocol !== OWNER_COMMUNICATION ||
      manifest.entryPoint?.command !== 'node dailynote.js'
    ) throw new Error('owner_runtime_manifest_contract_mismatch');
    const dotenvPackageBytes = await readExactRegularFile(
      path.join(dependencyRoot, 'dotenv', 'package.json'),
      expected.dotenvPackageSha256
    );
    const dotenvPackage = JSON.parse(dotenvPackageBytes.toString('utf8'));
    if (dotenvPackage.version !== expected.dotenvVersion || dotenvPackage.main !== 'lib/main.js') {
      throw new Error('owner_runtime_dotenv_package_binding_mismatch');
    }
    await readExactRegularFile(path.join(dependencyRoot, 'dotenv', 'lib', 'main.js'), expected.dotenvMainSha256);
    const storeProjection = await inspectStore(storeRoot, storeIdentityFilename);
    if (storeProjection.markdown.length !== 0 || storeProjection.directories !== 0) {
      throw new Error('owner_runtime_store_not_empty');
    }
    preflightResult = {
      accepted: true,
      memoryIntelligenceOwner: OWNER,
      ownerRuntimeComponent: OWNER_COMPONENT,
      ownerRuntimeCommunication: OWNER_COMMUNICATION,
      ownerRuntimeSourceCommitMatched: true,
      ownerRuntimeSourceTreeMatched: true,
      ownerRuntimePluginBlobMatched: true,
      ownerRuntimeManifestBlobMatched: true,
      stableStoreIdentityMatched: true,
      markdownCountBefore: 0,
      rawPathDisclosed: false
    };
    return preflightResult;
  }

  async function record(args = {}) {
    // The store is an exact empty synthetic target. Re-run preflight for every
    // invocation so a prior accepted result cannot authorize a later store
    // state, then inspect it again immediately before starting the owner.
    await preflight();
    const businessArgs = projectBusinessRecordArguments(args);
    if (sha256Canonical(businessArgs) !== expected.recordArgumentsCanonicalSha256) {
      throw new Error('owner_runtime_record_arguments_binding_mismatch');
    }
    if (!governedTransportEnvelopeAccepted(args, expected)) {
      throw new Error('owner_runtime_transport_envelope_binding_mismatch');
    }
    await readExactRegularFile(pluginPath, expected.pluginSha256);
    await readExactRegularFile(manifestPath, expected.manifestSha256);
    await readExactRegularFile(preloadPath, expected.preloadSha256);
    await readExactRegularFile(storeIdentityPath, expected.storeIdentitySha256);
    const dailyNoteInput = createDailyNoteInput(businessArgs, fixed);
    const expectedMarkdown = createExpectedDailyNoteMarkdown(businessArgs, fixed);
    const expectedMarkdownBytes = Buffer.from(expectedMarkdown, 'utf8');
    if (sha256(expectedMarkdownBytes) !== expected.durableMarkdownSha256) {
      throw new Error('owner_runtime_expected_markdown_binding_mismatch');
    }
    const env = {
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      NODE_PATH: dependencyRoot,
      NODE_OPTIONS: `--require=${preloadPath}`,
      NODE_NO_WARNINGS: '1',
      TZ: options.timeZone || 'Asia/Shanghai',
      KNOWLEDGEBASE_ROOT_PATH: storeRoot,
      DAILY_NOTE_EXTENSION: 'md',
      TagMaster: 'false',
      DebugMode: 'false',
      API_Key: '',
      API_URL: '',
      IMAGESERVER_IMAGE_KEY: '',
      IMAGESERVER_FILE_KEY: ''
    };
    const preWriteStoreProjection = await inspectStore(storeRoot, storeIdentityFilename);
    if (preWriteStoreProjection.markdown.length !== 0 ||
        preWriteStoreProjection.directories !== 0) {
      throw new Error('owner_runtime_store_not_empty_before_write');
    }
    const execution = await runOwnerRuntime({
      nodeExecutable,
      pluginPath,
      pluginDirectory,
      input: dailyNoteInput,
      env,
      timeoutMs
    });
    await readExactRegularFile(pluginPath, expected.pluginSha256);
    await readExactRegularFile(manifestPath, expected.manifestSha256);
    await readExactRegularFile(preloadPath, expected.preloadSha256);
    await readExactRegularFile(storeIdentityPath, expected.storeIdentitySha256);
    const storeProjection = await inspectStore(storeRoot, storeIdentityFilename);
    const files = storeProjection.markdown;
    if (files.length !== 1 || storeProjection.directories !== 1) {
      throw new Error('owner_runtime_post_write_markdown_count_mismatch');
    }
    const durableBytes = await readExactRegularFile(files[0], expected.durableMarkdownSha256);
    if (!durableBytes.equals(expectedMarkdownBytes)) throw new Error('owner_runtime_durable_bytes_mismatch');
    const resultFolder = normalizeString(execution.parsed?.result?.folder);
    const resultFileName = normalizeString(execution.parsed?.result?.fileName);
    const expectedFileName = `${fixed.date}-${fixed.localTime.replace(':', '_')}_00-${fixed.fileName}.md`;
    const expectedOutputPath = path.join(storeRoot, fixed.folder, expectedFileName);
    if (files[0] !== expectedOutputPath || resultFolder !== fixed.folder || resultFileName !== expectedFileName) {
      throw new Error('owner_runtime_result_binding_mismatch');
    }
    const durableSha256 = sha256(durableBytes);
    return {
      recorded: true,
      memory_id_ref: `vcp-dailynote-${durableSha256.slice(0, 16)}`,
      write_shape: 'vcptoolbox_daily_note_markdown',
      durable_bytes: durableBytes.length,
      durable_sha256: durableSha256,
      raw_path_disclosed: false,
      _nativeRuntimeReceipt: {
        nativeRuntimeCalled: true,
        nativeRuntimeInitialized: true,
        providerApiCalled: false,
        memoryReadPerformed: false,
        memoryWritePerformed: true,
        durableWritePerformed: true,
        durableWriteScope: 'primary_memory_write',
        isolatedRuntimeStoreUsed: true,
        primaryMemoryStoreWritePerformed: true,
        derivedIndexWritePerformed: false,
        rawRuntimeOutputDisclosed: execution.stderrPresent === true,
        rawMemoryContentDisclosed: false,
        runtimeLocatorDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false,
        memoryIntelligenceOwner: OWNER,
        ownerRuntimeComponent: OWNER_COMPONENT,
        ownerRuntimeCommunication: OWNER_COMMUNICATION,
        ownerRuntimeSourceCommitMatched: true,
        ownerRuntimeSourceTreeMatched: true,
        ownerRuntimePluginBlobMatched: true,
        ownerRuntimeManifestBlobMatched: true,
        stableStoreIdentityMatched: true,
        durableBytes: durableBytes.length,
        durableSha256
      }
    };
  }

  return { preflight, record };
}

module.exports = {
  DEFAULT_STORE_IDENTITY_FILENAME,
  OWNER,
  OWNER_COMMUNICATION,
  OWNER_COMPONENT,
  RUNTIME_IDENTITY_FILENAME,
  canonicalize,
  createDailyNoteInput,
  createExpectedDailyNoteMarkdown,
  createVcpToolBoxDailyNoteOwnerRuntimeAdapter,
  inspectStore,
  governedTransportEnvelopeAccepted,
  projectBusinessRecordArguments,
  runOwnerRuntime,
  sha256,
  sha256Canonical
};
