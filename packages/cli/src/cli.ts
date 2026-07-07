#!/usr/bin/env node
/**
 * The `lurker` bin entry: thin wrapper over runCli with process io.
 */
import { runCli } from './cli-main.js';
import { processIo } from './io.js';

runCli(process.argv.slice(2), { cwd: process.cwd(), io: processIo() }).then(
  (code) => {
    process.exitCode = code;
  },
  (thrown: unknown) => {
    process.stderr.write(`${thrown instanceof Error ? thrown.stack : String(thrown)}\n`);
    process.exitCode = 1;
  },
);
