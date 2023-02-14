const tsPresets = require('ts-jest/presets');
const mongoPreset = require('@shelf/jest-mongodb/jest-preset');

const jestOverwrites = {
  testEnvironment: 'node',
  testRegex: '.*\.spec\.ts$',
  clearMocks: true,
};

module.exports = {
  ...tsPresets.jsWithTs,
  ...mongoPreset,
  ...jestOverwrites,
  moduleFileExtensions: [
    "js",
    "json",
    "ts"
  ],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  collectCoverageFrom: [
    "**/*.(t|j)s"
  ],
  setupFiles: [
    "<rootDir>/../jest.config.js"
  ],
  coverageDirectory: "../coverage",
  testEnvironment: "node"
};

const dotenv = require('dotenv');
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
