#!/usr/bin/env node
/* Simple regression check: run formatter on tests/data/before.hcl and compare with tests/data/after.hcl (canonical output). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const extPath = path.join(root, 'src', 'format.js');
const inputPath = path.join(root, 'tests', 'data', 'before.hcl');
const expectedPath = path.join(root, 'tests', 'data', 'after.hcl');

function loadFormatter() {
  const { prettyFormat } = require(extPath);
  return prettyFormat;
}

function main() {
  const { version } = require('../package.json');
  const prettyFormat = loadFormatter();
  const input = fs.readFileSync(inputPath, 'utf8');
  const expected = fs.readFileSync(expectedPath, 'utf8');
  const formatted = prettyFormat(input);

  if (formatted !== expected) {
    const payload = {
      timestamp: new Date().toISOString(),
      message: 'Formatter output does not match tests/after.hcl',
      version,
    };
    console.log(JSON.stringify(payload));
    process.exit(1);
  }

  const payload = {
    timestamp: new Date().toISOString(),
    message: 'Formatter output matches tests/after.hcl',
    version,
  };
  console.log(JSON.stringify(payload));
}

main();

