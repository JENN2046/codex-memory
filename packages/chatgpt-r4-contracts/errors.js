'use strict';

class R4ContractError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'R4ContractError';
    this.code = code;
  }
}

function reject(code, detail = code) {
  throw new R4ContractError(code, detail);
}

module.exports = {
  R4ContractError,
  reject
};
