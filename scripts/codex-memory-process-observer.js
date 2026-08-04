'use strict';

const fs = require('node:fs');

const DECISIONS = Object.freeze({
  IGNORE: 'IGNORE_DEFINITIVELY_UNRELATED',
  FAIL_CLOSED: 'FAIL_CLOSED_PLAUSIBLE_OR_UNKNOWN',
  EXACT: 'EXACT_MANAGED_MATCH'
});

const COMMAND_SHAPES = Object.freeze({
  DEFINITIVELY_UNRELATED: 'DEFINITIVELY_UNRELATED',
  MANAGED_SHAPE: 'MANAGED_SHAPE',
  AMBIGUOUS: 'AMBIGUOUS'
});

const OWNER_STATES = Object.freeze({
  SAME_OWNER: 'SAME_OWNER',
  FOREIGN_OWNER: 'FOREIGN_OWNER',
  UNKNOWN: 'UNKNOWN'
});

const EVIDENCE_STATUS = Object.freeze({
  RESOLVED: 'RESOLVED',
  UNAVAILABLE: 'UNAVAILABLE',
  READABLE: 'READABLE',
  UNREADABLE: 'UNREADABLE',
  NOT_READ: 'NOT_READ',
  VALID: 'VALID',
  INVALID: 'INVALID'
});

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isAbsolutePath(value) {
  return typeof value === 'string' && value.length > 0 &&
    value.includes('\0') === false && value.startsWith('/');
}

function isStringArray(value) {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every(candidate => typeof candidate === 'string' &&
      candidate.includes('\0') === false);
}

function normalizeShape(value) {
  return Object.values(COMMAND_SHAPES).includes(value)
    ? value
    : COMMAND_SHAPES.AMBIGUOUS;
}

function classifyManagedCommandShape(argv, {
  matchComponents,
  hasManagedShapeHint = () => false
} = {}) {
  if (!isStringArray(argv) || typeof matchComponents !== 'function') {
    return COMMAND_SHAPES.AMBIGUOUS;
  }
  let matches;
  try {
    matches = matchComponents(argv);
  } catch {
    return COMMAND_SHAPES.AMBIGUOUS;
  }
  if (matches === true) return COMMAND_SHAPES.MANAGED_SHAPE;
  if (matches === false) {
    try {
      return hasManagedShapeHint(argv)
        ? COMMAND_SHAPES.AMBIGUOUS
        : COMMAND_SHAPES.DEFINITIVELY_UNRELATED;
    } catch {
      return COMMAND_SHAPES.AMBIGUOUS;
    }
  }
  if (Array.isArray(matches)) {
    if (matches.length === 1) return COMMAND_SHAPES.MANAGED_SHAPE;
    if (matches.length > 1) return COMMAND_SHAPES.AMBIGUOUS;
    try {
      return hasManagedShapeHint(argv)
        ? COMMAND_SHAPES.AMBIGUOUS
        : COMMAND_SHAPES.DEFINITIVELY_UNRELATED;
    } catch {
      return COMMAND_SHAPES.AMBIGUOUS;
    }
  }
  return normalizeShape(matches);
}

function baseEvidence(pid) {
  return {
    pid,
    running: 'unknown',
    disappeared: false,
    owner: { status: OWNER_STATES.UNKNOWN },
    canonicalNode: { status: EVIDENCE_STATUS.UNAVAILABLE, path: null },
    executable: { status: EVIDENCE_STATUS.UNREADABLE, path: null },
    cwd: { status: EVIDENCE_STATUS.UNREADABLE, path: null },
    command: { status: EVIDENCE_STATUS.NOT_READ, argv: null },
    startIdentity: { status: EVIDENCE_STATUS.NOT_READ, value: null }
  };
}

function classifyManagedProcessEvidence(evidence, {
  runtimeRepository,
  commandShape = COMMAND_SHAPES.AMBIGUOUS,
  exactComponent = null,
  controllerSelf = false
} = {}) {
  if (!evidence || typeof evidence !== 'object' ||
      !isAbsolutePath(runtimeRepository)) {
    return Object.freeze({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'OBSERVATION_UNAVAILABLE',
      component: null
    });
  }
  if (evidence.running === false || evidence.disappeared === true) {
    return Object.freeze({
      decision: DECISIONS.IGNORE,
      reason: evidence.disappeared ? 'PROCESS_DISAPPEARED' : 'PROCESS_NOT_RUNNING',
      component: null
    });
  }
  if (controllerSelf === true) {
    return Object.freeze({
      decision: DECISIONS.IGNORE,
      reason: 'CONTROLLER_SELF',
      component: null
    });
  }
  if (evidence.owner?.status === OWNER_STATES.FOREIGN_OWNER) {
    return Object.freeze({
      decision: DECISIONS.IGNORE,
      reason: 'FOREIGN_OWNER',
      component: null
    });
  }
  if (evidence.running !== true ||
      evidence.owner?.status !== OWNER_STATES.SAME_OWNER) {
    return Object.freeze({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'OBSERVATION_UNAVAILABLE',
      component: null
    });
  }
  if (evidence.cwd?.status === EVIDENCE_STATUS.READABLE &&
      evidence.cwd.path !== runtimeRepository) {
    return Object.freeze({
      decision: DECISIONS.IGNORE,
      reason: 'CWD_OUTSIDE_RUNTIME_REPOSITORY',
      component: null
    });
  }
  if (evidence.canonicalNode?.status === EVIDENCE_STATUS.RESOLVED &&
      evidence.executable?.status === EVIDENCE_STATUS.READABLE &&
      evidence.executable.path !== evidence.canonicalNode.path) {
    return Object.freeze({
      decision: DECISIONS.IGNORE,
      reason: 'EXECUTABLE_NOT_CANONICAL_NODE',
      component: null
    });
  }
  if (evidence.command?.status !== EVIDENCE_STATUS.READABLE ||
      !isStringArray(evidence.command.argv)) {
    return Object.freeze({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'COMMAND_UNAVAILABLE',
      component: null
    });
  }
  const completeIdentity =
    evidence.canonicalNode?.status === EVIDENCE_STATUS.RESOLVED &&
    evidence.executable?.status === EVIDENCE_STATUS.READABLE &&
    evidence.executable.path === evidence.canonicalNode.path &&
    evidence.cwd?.status === EVIDENCE_STATUS.READABLE &&
    evidence.cwd.path === runtimeRepository;
  if (completeIdentity) {
    const exactComponentName = typeof exactComponent === 'string' &&
      exactComponent.length > 0
      ? exactComponent
      : null;
    if (!exactComponentName) {
      return Object.freeze({
        decision: DECISIONS.IGNORE,
        reason: 'COMPLETE_IDENTITY_NONMATCH',
        component: null
      });
    }
    if (evidence.startIdentity?.status !== EVIDENCE_STATUS.VALID) {
      return Object.freeze({
        decision: DECISIONS.FAIL_CLOSED,
        reason: 'START_IDENTITY_UNAVAILABLE',
        component: null
      });
    }
    return Object.freeze({
      decision: DECISIONS.EXACT,
      reason: 'EXACT_COMPONENT_IDENTITY',
      component: exactComponentName
    });
  }
  if (commandShape === COMMAND_SHAPES.DEFINITIVELY_UNRELATED) {
    return Object.freeze({
      decision: DECISIONS.IGNORE,
      reason: 'COMMAND_SHAPE_NONMATCH',
      component: null
    });
  }
  return Object.freeze({
    decision: DECISIONS.FAIL_CLOSED,
    reason: commandShape === COMMAND_SHAPES.MANAGED_SHAPE
      ? 'MANAGED_SHAPE_IDENTITY_INCOMPLETE'
      : 'COMMAND_SHAPE_AMBIGUOUS',
    component: null
  });
}

function createCanonicalNodeSnapshot({
  execPath = process.execPath,
  realpathSync = fs.realpathSync
} = {}) {
  try {
    const resolved = realpathSync(execPath);
    if (!isAbsolutePath(resolved)) throw codedError('process_node_unavailable');
    return Object.freeze({
      status: EVIDENCE_STATUS.RESOLVED,
      path: resolved
    });
  } catch {
    return Object.freeze({
      status: EVIDENCE_STATUS.UNAVAILABLE,
      path: null
    });
  }
}

function normalizePathObservation(value) {
  if (value && typeof value === 'object' && 'status' in value) {
    return Object.freeze({
      status: value.status === EVIDENCE_STATUS.READABLE
        ? EVIDENCE_STATUS.READABLE
        : EVIDENCE_STATUS.UNREADABLE,
      path: value.status === EVIDENCE_STATUS.READABLE &&
        isAbsolutePath(value.path) ? value.path : null
    });
  }
  return isAbsolutePath(value)
    ? Object.freeze({ status: EVIDENCE_STATUS.READABLE, path: value })
    : Object.freeze({ status: EVIDENCE_STATUS.UNREADABLE, path: null });
}

function normalizeCommandObservation(value) {
  if (value && typeof value === 'object' && 'status' in value) {
    if (value.status === EVIDENCE_STATUS.READABLE &&
        isStringArray(value.argv)) {
      return Object.freeze({
        status: EVIDENCE_STATUS.READABLE,
        argv: Object.freeze([...value.argv]),
        disappeared: value.disappeared === true
      });
    }
    return Object.freeze({
      status: EVIDENCE_STATUS.UNREADABLE,
      argv: null,
      disappeared: value.disappeared === true
    });
  }
  if (isStringArray(value)) {
    return Object.freeze({
      status: EVIDENCE_STATUS.READABLE,
      argv: Object.freeze([...value]),
      disappeared: false
    });
  }
  return Object.freeze({
    status: EVIDENCE_STATUS.UNREADABLE,
    argv: null,
    disappeared: false
  });
}

function normalizeStartIdentity(value) {
  if (value && typeof value === 'object' && 'status' in value) {
    const validValue = typeof value.value === 'string' &&
      /^[1-9][0-9]{0,39}$/u.test(value.value);
    return Object.freeze({
      status: value.status === EVIDENCE_STATUS.VALID && validValue
        ? EVIDENCE_STATUS.VALID
        : value.status === EVIDENCE_STATUS.INVALID
          ? EVIDENCE_STATUS.INVALID
          : EVIDENCE_STATUS.UNAVAILABLE,
      value: value.status === EVIDENCE_STATUS.VALID && validValue
        ? value.value || null
        : null
    });
  }
  return typeof value === 'string' && /^[1-9][0-9]{0,39}$/u.test(value)
    ? Object.freeze({ status: EVIDENCE_STATUS.VALID, value })
    : Object.freeze({ status: EVIDENCE_STATUS.UNAVAILABLE, value: null });
}

function normalizeOwner(value) {
  if (value === OWNER_STATES.SAME_OWNER || value === true) {
    return OWNER_STATES.SAME_OWNER;
  }
  if (value === OWNER_STATES.FOREIGN_OWNER || value === false) {
    return OWNER_STATES.FOREIGN_OWNER;
  }
  return OWNER_STATES.UNKNOWN;
}

function safeRead(reader, pid, fallback) {
  try {
    return reader(pid);
  } catch {
    return fallback;
  }
}

function collectProcessEvidence(pid, {
  canonicalNode,
  runtimeRepository,
  controllerPid = process.pid,
  readLiveness,
  readOwner,
  readExecutable,
  readCwd,
  readCommandLine,
  readStartIdentity,
  classifyCommandShape,
  exactComponentMatcher
} = {}) {
  const evidence = baseEvidence(pid);
  evidence.canonicalNode = canonicalNode || evidence.canonicalNode;
  if (pid === controllerPid) {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: Object.freeze({
        decision: DECISIONS.IGNORE,
        reason: 'CONTROLLER_SELF',
        component: null
      })
    });
  }
  if (typeof readLiveness !== 'function' ||
      typeof readOwner !== 'function' ||
      typeof readExecutable !== 'function' ||
      typeof readCwd !== 'function' ||
      typeof readCommandLine !== 'function' ||
      typeof readStartIdentity !== 'function' ||
      typeof classifyCommandShape !== 'function' ||
      typeof exactComponentMatcher !== 'function') {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: Object.freeze({
        decision: DECISIONS.FAIL_CLOSED,
        reason: 'OBSERVER_CONTRACT_INVALID',
        component: null
      })
    });
  }
  const initiallyRunning = safeRead(readLiveness, pid, null);
  evidence.running = initiallyRunning === true
    ? true
    : initiallyRunning === false
      ? false
      : 'unknown';
  if (initiallyRunning !== true) {
    evidence.disappeared = initiallyRunning === false;
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  evidence.owner = { status: normalizeOwner(safeRead(readOwner, pid, null)) };
  if (evidence.owner.status === OWNER_STATES.FOREIGN_OWNER) {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  if (evidence.owner.status === OWNER_STATES.UNKNOWN) {
    const ownerCheckRunning = safeRead(readLiveness, pid, null);
    if (ownerCheckRunning === false) {
      evidence.running = false;
      evidence.disappeared = true;
    }
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  evidence.executable = normalizePathObservation(
    safeRead(readExecutable, pid, null)
  );
  evidence.cwd = normalizePathObservation(safeRead(readCwd, pid, null));
  const stillRunning = safeRead(readLiveness, pid, null);
  if (stillRunning === false) {
    evidence.running = false;
    evidence.disappeared = true;
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  if (stillRunning !== true) evidence.running = 'unknown';
  if (evidence.cwd.status === EVIDENCE_STATUS.READABLE &&
      evidence.cwd.path !== runtimeRepository) {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  if (evidence.canonicalNode.status === EVIDENCE_STATUS.RESOLVED &&
      evidence.executable.status === EVIDENCE_STATUS.READABLE &&
      evidence.executable.path !== evidence.canonicalNode.path) {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  const command = normalizeCommandObservation(
    safeRead(readCommandLine, pid, null)
  );
  evidence.command = {
    status: command.status,
    argv: command.argv
  };
  if (command.disappeared) {
    evidence.running = false;
    evidence.disappeared = true;
  } else {
    const afterCommandRunning = safeRead(readLiveness, pid, null);
    if (afterCommandRunning === false) {
      evidence.running = false;
      evidence.disappeared = true;
    } else if (afterCommandRunning !== true) {
      evidence.running = 'unknown';
    }
  }
  if (evidence.disappeared || evidence.running !== true ||
      command.status !== EVIDENCE_STATUS.READABLE) {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: classifyManagedProcessEvidence(evidence, {
        runtimeRepository,
        controllerSelf: false
      })
    });
  }
  let commandShape = COMMAND_SHAPES.AMBIGUOUS;
  try {
    commandShape = normalizeShape(
      classifyCommandShape(command.argv, {
      canonicalNode,
      evidence: { ...evidence }
      })
    );
  } catch {
    commandShape = COMMAND_SHAPES.AMBIGUOUS;
  }
  let exactComponent = null;
  let exactMatcherFailed = false;
  const identityComplete =
    canonicalNode?.status === EVIDENCE_STATUS.RESOLVED &&
    evidence.executable.status === EVIDENCE_STATUS.READABLE &&
    evidence.executable.path === canonicalNode.path &&
    evidence.cwd.status === EVIDENCE_STATUS.READABLE &&
    evidence.cwd.path === runtimeRepository;
  if (identityComplete && commandShape !== COMMAND_SHAPES.DEFINITIVELY_UNRELATED) {
    try {
      exactComponent = exactComponentMatcher(command.argv, {
        canonicalNode,
        evidence: { ...evidence }
      });
    } catch {
      exactMatcherFailed = true;
    }
  }
  if (exactMatcherFailed) {
    return Object.freeze({
      evidence: Object.freeze(evidence),
      result: Object.freeze({
        decision: DECISIONS.FAIL_CLOSED,
        reason: 'EXACT_MATCH_UNAVAILABLE',
        component: null
      })
    });
  }
  if (exactComponent) {
    evidence.startIdentity = normalizeStartIdentity(
      safeRead(readStartIdentity, pid, null)
    );
  }
  return Object.freeze({
    evidence: Object.freeze(evidence),
    result: classifyManagedProcessEvidence(evidence, {
      runtimeRepository,
      commandShape,
      exactComponent
    })
  });
}

function scanManagedProcesses({
  enumerateProcessIds,
  resolveCanonicalNode = fs.realpathSync,
  execPath = process.execPath,
  runtimeRepository,
  controllerPid = process.pid,
  readLiveness,
  readOwner,
  readExecutable,
  readCwd,
  readCommandLine,
  readStartIdentity,
  classifyCommandShape,
  exactComponentMatcher
} = {}) {
  const canonicalNode = createCanonicalNodeSnapshot({
    execPath,
    realpathSync: resolveCanonicalNode
  });
  let pids;
  try {
    pids = enumerateProcessIds();
  } catch {
    return Object.freeze({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'PROCESS_ENUMERATION_UNAVAILABLE',
      componentMatches: Object.freeze([]),
      canonicalNode
    });
  }
  if (!Array.isArray(pids)) {
    return Object.freeze({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'PROCESS_ENUMERATION_UNAVAILABLE',
      componentMatches: Object.freeze([]),
      canonicalNode
    });
  }
  const matches = [];
  for (const pid of pids) {
    const observation = collectProcessEvidence(pid, {
      canonicalNode,
      runtimeRepository,
      controllerPid,
      readLiveness,
      readOwner,
      readExecutable,
      readCwd,
      readCommandLine,
      readStartIdentity,
      classifyCommandShape,
      exactComponentMatcher
    });
    if (observation.result.decision === DECISIONS.FAIL_CLOSED) {
      return Object.freeze({
        decision: DECISIONS.FAIL_CLOSED,
        reason: observation.result.reason,
        componentMatches: Object.freeze([]),
        canonicalNode
      });
    }
    if (observation.result.decision === DECISIONS.EXACT) {
      matches.push(Object.freeze({
        pid,
        component: observation.result.component
      }));
    }
  }
  return Object.freeze({
    decision: matches.length > 0 ? DECISIONS.EXACT : DECISIONS.IGNORE,
    reason: matches.length > 0 ? 'EXACT_COMPONENT_IDENTITY' : 'NO_MANAGED_MATCH',
    componentMatches: Object.freeze(matches),
    canonicalNode
  });
}

module.exports = {
  COMMAND_SHAPES,
  DECISIONS,
  EVIDENCE_STATUS,
  OWNER_STATES,
  classifyManagedCommandShape,
  classifyManagedProcessEvidence,
  collectProcessEvidence,
  createCanonicalNodeSnapshot,
  scanManagedProcesses
};
