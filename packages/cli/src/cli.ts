#!/usr/bin/env node
/**
 * The `rulvar` bin entry: thin wrapper over runCli with process io.
 */
import { inspect } from 'node:util';

import { runCli } from './cli-main.js';
import { processIo } from './io.js';

runCli(process.argv.slice(2), { cwd: process.cwd(), io: processIo() }).then(
  (code) => {
    process.exitCode = code;
  },
  (thrown: unknown) => {
    // inspect renders the whole cause chain; `stack` alone drops it,
    // and companion load failures carry the real defect there.
    process.stderr.write(`${inspect(thrown)}\n`);
    process.exitCode = 1;
  },
);
