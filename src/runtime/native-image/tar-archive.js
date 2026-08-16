'use strict';

const path = require('node:path');

const BLOCK = 512;
const DEFAULT_LIMITS = Object.freeze({
  maximumEntries: 20_000,
  maximumFileBytes: 512 * 1024 * 1024,
  maximumTotalBytes: 2 * 1024 * 1024 * 1024
});

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function field(block, start, length) {
  return block.subarray(start, start + length).toString('utf8').replace(/\0.*$/su, '');
}

function octal(block, start, length) {
  const value = field(block, start, length).trim();
  if (!/^[0-7]+$/u.test(value || '0')) fail('runtime_tar_header_invalid');
  const number = Number.parseInt(value || '0', 8);
  if (!Number.isSafeInteger(number) || number < 0) fail('runtime_tar_header_invalid');
  return number;
}

function normalizedName(name) {
  const stripped = name.replace(/^\.\//u, '').replace(/\/$/u, '');
  const normalized = path.posix.normalize(stripped);
  if (!stripped || stripped.startsWith('/') || normalized !== stripped ||
      normalized === '..' || normalized.startsWith('../') || normalized.includes('\0')) {
    fail('runtime_tar_path_unsafe');
  }
  return normalized;
}

function parseTarBuffer(buffer, limits = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length < BLOCK * 2 || buffer.length % BLOCK !== 0) {
    fail('runtime_tar_archive_invalid');
  }
  const policy = { ...DEFAULT_LIMITS, ...limits };
  const entries = [];
  const names = new Set();
  let offset = 0;
  let totalBytes = 0;
  let zeroBlocks = 0;
  while (offset + BLOCK <= buffer.length) {
    const header = buffer.subarray(offset, offset + BLOCK);
    if (header.every(byte => byte === 0)) {
      zeroBlocks += 1;
      offset += BLOCK;
      if (zeroBlocks === 2) break;
      continue;
    }
    if (zeroBlocks !== 0) fail('runtime_tar_archive_invalid');
    const storedChecksum = octal(header, 148, 8);
    let checksum = 0;
    for (let index = 0; index < BLOCK; index += 1) {
      checksum += index >= 148 && index < 156 ? 32 : header[index];
    }
    if (checksum !== storedChecksum) fail('runtime_tar_checksum_invalid');
    const prefix = field(header, 345, 155);
    const basename = field(header, 0, 100);
    const name = normalizedName(prefix ? `${prefix}/${basename}` : basename);
    if (names.has(name)) fail('runtime_tar_duplicate_path');
    names.add(name);
    const type = String.fromCharCode(header[156] || 48);
    if (!['0', '5'].includes(type)) fail('runtime_tar_special_entry_forbidden');
    const size = octal(header, 124, 12);
    if (type === '5' && size !== 0) fail('runtime_tar_header_invalid');
    if (size > policy.maximumFileBytes) fail('runtime_tar_entry_too_large');
    totalBytes += size;
    if (totalBytes > policy.maximumTotalBytes) fail('runtime_tar_expansion_limit');
    const contentOffset = offset + BLOCK;
    const next = contentOffset + Math.ceil(size / BLOCK) * BLOCK;
    if (next > buffer.length) fail('runtime_tar_archive_truncated');
    entries.push(Object.freeze({
      content: type === '0' ? buffer.subarray(contentOffset, contentOffset + size) : null,
      mode: octal(header, 100, 8),
      name,
      size,
      type: type === '0' ? 'file' : 'directory'
    }));
    if (entries.length > policy.maximumEntries) fail('runtime_tar_entry_limit');
    offset = next;
  }
  if (zeroBlocks < 2) fail('runtime_tar_archive_unterminated');
  for (; offset < buffer.length; offset += 1) {
    if (buffer[offset] !== 0) fail('runtime_tar_trailing_data');
  }
  return Object.freeze(entries);
}

function regularFiles(entries) {
  return new Map(entries.filter(entry => entry.type === 'file')
    .map(entry => [entry.name, entry]));
}

module.exports = { DEFAULT_LIMITS, parseTarBuffer, regularFiles };
