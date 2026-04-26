class VcpPassiveMemoryAdapter {
  constructor({ passiveRecallService, compatibilitySyntaxAdapter }) {
    this.passiveRecallService = passiveRecallService;
    this.compatibilitySyntaxAdapter = compatibilitySyntaxAdapter;
  }

  async search(rawInput, options = {}) {
    const parsed = this.compatibilitySyntaxAdapter.parse(rawInput);
    const results = await this.passiveRecallService.search({
      query: parsed.query,
      target: options.target || 'both',
      limit: options.limit,
      includeContent: !!options.includeContent,
      contextText: options.contextText || '',
      contextMessages: options.contextMessages || [],
      candidateFilters: options.candidateFilters || {},
      source: 'vcp-passive-adapter',
      compatibility: parsed
    });

    return {
      parsed,
      results
    };
  }
}

module.exports = {
  VcpPassiveMemoryAdapter
};
