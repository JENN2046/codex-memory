const fs = require('node:fs/promises');
const path = require('node:path');

const {
  PROCESS_DIARY_NAME,
  KNOWLEDGE_DIARY_NAME,
  getDiaryNameForTarget,
  getDiaryNamesForTarget,
  getTargetForDiaryName
} = require('../core/constants');

function sanitizePathComponent(name) {
  if (!name || typeof name !== 'string') {
    return 'Untitled';
  }

  const sanitized = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .replace(/^[.]+|[.]+$/g, '')
    .trim();

  return sanitized || 'Untitled';
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  return [];
}

function buildDiaryText(record, datePart) {
  const lines = [
    `[${datePart}] - Codex`,
    `Title: ${record.title}`,
    `Memory-ID: ${record.memoryId}`,
    `Record-Type: ${record.target === 'knowledge' ? 'knowledge' : 'process'}`,
    `Validated: ${record.validated ? 'yes' : 'no'}`,
    `Reusable: ${record.reusable ? 'yes' : 'no'}`
  ];

  const scopeLines = [
    ['Project-ID', record.projectId],
    ['Workspace-ID', record.workspaceId],
    ['Client-ID', record.clientId],
    ['Task-ID', record.taskId],
    ['Conversation-ID', record.conversationId],
    ['Visibility', record.visibility],
    ['Retention-Policy', record.retentionPolicy]
  ];
  for (const [label, value] of scopeLines) {
    if (typeof value === 'string' && value.trim()) {
      lines.push(`${label}: ${value.trim()}`);
    }
  }

  lines.push(
    '',
    'Content:',
    record.content,
    '',
    'Evidence:',
    record.evidence
  );

  if (record.tags && record.tags.length > 0) {
    lines.push('', `Tag: ${record.tags.join(', ')}`);
  }

  return lines.join('\n');
}

function stripMemoryMarkers(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const markerPattern = /^(?:Memory-ID|Project-ID|Workspace-ID|Client-ID|Task-ID|Conversation-ID|Visibility|Retention-Policy):\s*.*\r?\n?/gmi;
  const contentMatch = text.match(/\r?\nContent:\r?\n/);
  if (!contentMatch || contentMatch.index === undefined) {
    if (!/^(?:Memory-ID|Record-Type):\s*.+$/mi.test(text)) {
      return text.trim();
    }
    return text.replace(markerPattern, '').trim();
  }

  const header = text.slice(0, contentMatch.index);
  const body = text.slice(contentMatch.index);
  return `${header.replace(markerPattern, '')}${body}`.trim();
}

function parseBooleanFlag(value) {
  return String(value || '').trim().toLowerCase() === 'yes';
}

async function collectFilesRecursive(rootPath) {
  const output = [];

  async function walk(currentPath) {
    let entries = [];
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile()) {
        output.push(fullPath);
      }
    }
  }

  await walk(rootPath);
  return output;
}

class DiaryStore {
  constructor(config) {
    this.config = config;
  }

  async ensureReady() {
    await fs.mkdir(path.join(this.config.dailyNoteRootPath, PROCESS_DIARY_NAME), { recursive: true });
    await fs.mkdir(path.join(this.config.dailyNoteRootPath, KNOWLEDGE_DIARY_NAME), { recursive: true });
  }

  getDirectoryForTarget(target) {
    return path.join(this.config.dailyNoteRootPath, getDiaryNameForTarget(target));
  }

  getRelativePath(filePath) {
    return path.relative(this.config.dailyNoteRootPath, filePath).replace(/\\/g, '/');
  }

  async writeRecord(record) {
    await this.ensureReady();

    const dirPath = this.getDirectoryForTarget(record.target);
    const date = new Date(record.createdAt || Date.now());
    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
    const timePart = [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0')
    ].join('_');

    const baseName = sanitizePathComponent(record.title);
    let counter = 0;
    let filePath;

    do {
      const suffix = counter > 0 ? `-${counter}` : '';
      filePath = path.join(dirPath, `${datePart}-${timePart}-${baseName}${suffix}.${this.config.dailyNoteExtension}`);
      counter += 1;
      try {
        await fs.access(filePath);
      } catch {
        break;
      }
    } while (true);

    const fileContent = buildDiaryText(record, datePart);
    await fs.writeFile(filePath, fileContent, 'utf8');

    return {
      filePath,
      relativePath: this.getRelativePath(filePath),
      fileContent
    };
  }

  async listRecentFiles(target, limit = 10) {
    const dirPath = this.getDirectoryForTarget(target);
    const filePaths = await collectFilesRecursive(dirPath);

    const files = [];
    for (const fullPath of filePaths) {
      const stats = await fs.stat(fullPath);
      files.push({
        name: path.basename(fullPath),
        path: fullPath,
        size: stats.size,
        updatedAt: stats.mtime.toISOString()
      });
    }

    return files
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, limit);
  }

  async listRecords(options = {}) {
    await this.ensureReady();
    const dbNames = getDiaryNamesForTarget(options.target || 'both');
    const output = [];

    for (const dbName of dbNames) {
      const dirPath = path.join(this.config.dailyNoteRootPath, dbName);
      const filePaths = await collectFilesRecursive(dirPath);

      for (const filePath of filePaths) {
        const record = await this.readRecord(filePath, getTargetForDiaryName(dbName));
        if (record) {
          output.push(record);
        }
      }
    }

    return output.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }

  async readRecord(filePath, fallbackTarget = null) {
    let rawText;
    let stats;

    try {
      rawText = await fs.readFile(filePath, 'utf8');
      stats = await fs.stat(filePath);
    } catch {
      return null;
    }

    const withoutHeader = rawText.replace(/^\[[^\n]+\]\s*-\s*[^\n]*\r?\n/, '');
    const contentMarker = withoutHeader.match(/\r?\nContent:\r?\n/);
    const headerBlock = contentMarker && contentMarker.index !== undefined
      ? withoutHeader.slice(0, contentMarker.index)
      : withoutHeader;
    const title = this.matchSingleLine(headerBlock, /^Title:\s*(.+)$/mi) || path.basename(filePath);
    const memoryId = this.matchSingleLine(headerBlock, /^Memory-ID:\s*([A-Za-z0-9-]+)$/mi) || null;
    const recordType = this.matchSingleLine(headerBlock, /^Record-Type:\s*(.+)$/mi) || fallbackTarget || 'process';
    const target = String(recordType).trim().toLowerCase() === 'knowledge' ? 'knowledge' : 'process';
    const validated = parseBooleanFlag(this.matchSingleLine(headerBlock, /^Validated:\s*(.+)$/mi));
    const reusable = parseBooleanFlag(this.matchSingleLine(headerBlock, /^Reusable:\s*(.+)$/mi));
    const projectId = this.matchSingleLine(headerBlock, /^Project-ID:\s*(.+)$/mi) || null;
    const workspaceId = this.matchSingleLine(headerBlock, /^Workspace-ID:\s*(.+)$/mi) || null;
    const clientId = this.matchSingleLine(headerBlock, /^Client-ID:\s*(.+)$/mi) || null;
    const taskId = this.matchSingleLine(headerBlock, /^Task-ID:\s*(.+)$/mi) || null;
    const conversationId = this.matchSingleLine(headerBlock, /^Conversation-ID:\s*(.+)$/mi) || null;
    const visibility = this.matchSingleLine(headerBlock, /^Visibility:\s*(.+)$/mi) || null;
    const retentionPolicy = this.matchSingleLine(headerBlock, /^Retention-Policy:\s*(.+)$/mi) || null;
    const contentMatch = withoutHeader.match(/\nContent:\n([\s\S]*?)\n\nEvidence:\n/);
    const evidenceMatch = withoutHeader.match(/\nEvidence:\n([\s\S]*?)(?:\n\nTag:\s*(.+))?$/);
    const tagsLine = evidenceMatch?.[2] || '';
    const content = contentMatch ? contentMatch[1].trim() : '';
    const evidence = evidenceMatch ? evidenceMatch[1].trim() : '';
    const tags = normalizeTags(tagsLine);
    const cleanedText = stripMemoryMarkers(withoutHeader);
    const semanticDate = this.extractSemanticDate(rawText, filePath, stats);

    return {
      memoryId,
      target,
      title: title.trim(),
      content,
      evidence,
      tags,
      validated,
      reusable,
      projectId,
      workspaceId,
      clientId,
      taskId,
      conversationId,
      visibility,
      retentionPolicy,
      filePath,
      relativePath: this.getRelativePath(filePath),
      rawText,
      cleanedText,
      createdAt: semanticDate?.toISOString?.() || stats.birthtime?.toISOString?.() || stats.mtime.toISOString(),
      updatedAt: stats.mtime.toISOString()
    };
  }

  matchSingleLine(text, pattern) {
    const match = text.match(pattern);
    return match && match[1] ? match[1].trim() : '';
  }

  extractSemanticDate(rawText, filePath, stats) {
    const headerMatch = rawText.match(/^\[(\d{4})-(\d{2})-(\d{2})\]\s*-\s*/);
    const fileNameMatch = path.basename(filePath).match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})_(\d{2})_(\d{2})/);

    if (headerMatch && fileNameMatch) {
      return new Date(
        Number(fileNameMatch[1]),
        Number(fileNameMatch[2]) - 1,
        Number(fileNameMatch[3]),
        Number(fileNameMatch[4]),
        Number(fileNameMatch[5]),
        Number(fileNameMatch[6]),
        0
      );
    }

    if (headerMatch) {
      return new Date(
        Number(headerMatch[1]),
        Number(headerMatch[2]) - 1,
        Number(headerMatch[3]),
        12,
        0,
        0,
        0
      );
    }

    return stats.birthtime || stats.mtime;
  }
}

module.exports = {
  DiaryStore,
  buildDiaryText,
  normalizeTags,
  sanitizePathComponent,
  stripMemoryMarkers
};
