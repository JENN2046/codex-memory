const Namespace = Object.freeze({
  PROCESS: 'process',
  KNOWLEDGE: 'knowledge',
  CHAT: 'chat'
});

const VisibilityPolicy = Object.freeze({
  CODEX_ONLY: 'codex_only',
  SHARED: 'shared',
  PRIVATE: 'private'
});

function createShadowWriteStatus(status = 'ok', failures = []) {
  return {
    status,
    failures: Array.isArray(failures) ? failures : []
  };
}

function createReindexTask(payload = {}) {
  return {
    taskId: payload.taskId || null,
    source: payload.source || 'diary',
    target: payload.target || 'both',
    createdAt: payload.createdAt || new Date().toISOString(),
    status: payload.status || 'pending'
  };
}

module.exports = {
  Namespace,
  VisibilityPolicy,
  createReindexTask,
  createShadowWriteStatus
};
