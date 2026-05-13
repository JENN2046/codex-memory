const crypto = require('node:crypto');

const { stripMemoryMarkers } = require('../storage/DiaryStore');
const { chunkText } = require('./chunkText');

class ChunkIndexingService {
  constructor({ config, shadowStore, vectorStore }) {
    this.config = config;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
  }

  async indexRecord(record) {
    const sourceText = stripMemoryMarkers(record.cleanedText || record.rawText || '')
      || [
        `Title: ${record.title}`,
        '',
        'Content:',
        record.content || '',
        '',
        'Evidence:',
        record.evidence || '',
        '',
        `Tag: ${(record.tags || []).join(', ')}`
      ].join('\n');

    const chunkTexts = chunkText(sourceText, {
      maxChars: this.config.chunkMaxChars,
      overlapChars: this.config.chunkOverlapChars
    });
    const vectors = await this.vectorStore.getBatchEmbeddingsCached(chunkTexts, { inputKind: 'document' });

    const chunks = chunkTexts.map((text, index) => ({
      chunkId: `${record.memoryId}:${index}:${this.createChunkDigest(text)}`,
      chunkIndex: index,
      text,
      vector: vectors[index] || this.vectorStore.embedText(text)
    }));

    await this.shadowStore.replaceChunksForRecord(record, chunks);
    return {
      chunkCount: chunks.length
    };
  }

  createChunkDigest(text) {
    return crypto.createHash('sha1').update(String(text || '')).digest('hex').slice(0, 12);
  }
}

module.exports = {
  ChunkIndexingService
};
