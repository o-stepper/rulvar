#!/usr/bin/env node
/**
 * The `rulvar` bin entry: thin wrapper over runCli with process io.
 */
import { inspect } from 'node:util';

import { sanitizeTerminalText } from '@rulvar/core';

import { runCli } from './cli-main.js';
import { processIo } from './io.js';

runCli(process.argv.slice(2), { cwd: process.cwd(), io: processIo() }).then(
  (code) => {
    process.exitCode = code;
  },
  (thrown: unknown) => {
    // inspect renders the whole cause chain; `stack` alone drops it,
    // and companion load failures carry the real defect there. Error
    // text can embed untrusted strings, so each line is sanitized while
    // the multi-line structure survives (v1.24.1 review P2-1).
    const rendered = inspect(thrown).split('\n').map(sanitizeTerminalText).join('\n');
    process.stderr.write(`${rendered}\n`);
    process.exitCode = 1;
  },
);
