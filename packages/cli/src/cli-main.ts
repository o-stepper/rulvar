/**
 * Command dispatch for the canonical grammar (docs/06, section 10.5):
 * no aliases in v1; unknown commands and flags fail loudly with usage.
 */
import { ConfigError } from '@lurker/core';

import { inspectCommand, resumeCommand, runCommand, runsLsCommand } from './commands.js';
import type { CliIo } from './io.js';

export const HELP = `lurker: durable multi-agent workflows (docs/06, section 10.5)

  lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]
  lurker resume <runId>  [--store PATH]
  lurker runs ls         [--store PATH]
  lurker inspect <runId> [--store PATH]

Engine assembly: adapters, defaults, and the workflow registry come from
lurker.config.mjs in the working directory (default export
{ engineOptions?, workflows? }) or from the workflow module's named
exports. --store selects the JsonlFileStore directory (default .lurker).
plan and kb commands arrive in later milestones.`;

export async function runCli(argv: string[], options: { cwd: string; io: CliIo }): Promise<number> {
  const [command, ...rest] = argv;
  const context = { cwd: options.cwd, io: options.io };
  try {
    switch (command) {
      case 'run':
        return await runCommand(rest, context);
      case 'resume':
        return await resumeCommand(rest, context);
      case 'runs': {
        const [sub, ...subRest] = rest;
        if (sub !== 'ls') {
          throw new ConfigError('usage: lurker runs ls [--store PATH] (no aliases in v1)');
        }
        return await runsLsCommand(subRest, context);
      }
      case 'inspect':
        return await inspectCommand(rest, context);
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        options.io.out(HELP);
        return command === undefined ? 1 : 0;
      default:
        throw new ConfigError(`unknown command '${command}' (no aliases in v1); see lurker --help`);
    }
  } catch (thrown) {
    if (thrown instanceof ConfigError) {
      options.io.err(`error: ${thrown.message}`);
      return 1;
    }
    throw thrown;
  }
}
