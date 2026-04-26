class PassiveRecallService {
  constructor({ pipeline }) {
    this.pipeline = pipeline;
  }

  async search(options) {
    return this.pipeline.search(options);
  }
}

module.exports = {
  PassiveRecallService
};
