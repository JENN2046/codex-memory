#!/usr/bin/env node

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const rawInput = await readStdin();
  const rawInputPreview = String(rawInput || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const errorText = `[DeepMemo] 无效的输入格式，无法解析JSON: ${String(rawInput || '')}`.trimEnd();
  process.stderr.write(JSON.stringify({
    status: 'error',
    error: errorText,
    result: null,
    meta: {
      inputSource: 'stdin',
      rawInputPreview,
      toolName: 'DeepMemo',
      tool_name: 'DeepMemo',
      code: 'invalid-json'
    }
  }) + '\n');
  process.exit(1);
}

main().catch(error => {
  process.stderr.write(JSON.stringify({
    status: 'error',
    error: String(error && error.message ? error.message : error),
    result: null
  }) + '\n');
  process.exit(1);
});
