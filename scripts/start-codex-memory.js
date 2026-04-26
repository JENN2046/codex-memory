'use strict';

const path = require('node:path');
const { bootstrapUserEnvironment } = require('./bootstrap-user-env');

bootstrapUserEnvironment();
process.chdir(path.resolve(__dirname, '..'));
require(path.resolve(__dirname, '..', 'src', 'index.js'));
