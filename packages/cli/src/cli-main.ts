/**
 * Command dispatch for the canonical grammar (https://docs.rulvar.com/guide/cli):
 * no aliases in v1; unknown commands and flags fail loudly with usage.
 */
import { ConfigError } from '@rulvar/core';

import {
  inspectCommand,
  kbCommand,
  planCommand,
  resumeCommand,
  runCommand,
  runsLsCommand,
} from './commands.js';
import type { CliIo } from './io.js';

export const HELP = `rulvar: durable multi-agent workflows (https://docs.rulvar.com)

  rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]
  rulvar resume <runId>  [--store PATH]
  rulvar runs ls         [--store PATH]
  rulvar inspect <runId> [--store PATH]
  rulvar plan "<goal>"   [--dry-run]
  rulvar kb <list | inbox | gate | sweep>

Engine assembly: adapters, defaults, and the workflow registry come from
rulvar.config.mjs in the working directory (default export
{ engineOptions?, workflows? }) or from the workflow module's named
exports. --store selects the JsonlFileStore directory (default .rulvar).
plan asks the planner model (role plan) to write a workflow script,
lints and self-repairs it, then runs it in the worker sandbox; --dry-run
prints the accepted script without running. Requires @rulvar/planner
installed. kb list shows the per-project claim store
(./rulvar.models.json) with full provenance. kb sweep runs the
falsification matrix from the kbSweep section of rulvar.config.mjs
(fixed pool UNIONED with every model carrying an active negative claim
plus the re-measure queue; optional canary probes flip drifted claims
stale first; requires @rulvar/evals installed). kb inbox aggregates
kb_propose proposals from finished runs (14 day TTL); kb gate turns one
inbox proposal into a committed claim behind a human attestation
(--approver and --ruled-out are mandatory). inbox and gate require
@rulvar/plan installed.`;

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
          throw new ConfigError('usage: rulvar runs ls [--store PATH] (no aliases in v1)');
        }
        return await runsLsCommand(subRest, context);
      }
      case 'inspect':
        return await inspectCommand(rest, context);
      case 'plan':
        return await planCommand(rest, context);
      case 'kb':
        return await kbCommand(rest, context);
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        options.io.out(HELP);
        return command === undefined ? 1 : 0;
      default:
        throw new ConfigError(`unknown command '${command}' (no aliases in v1); see rulvar --help`);
    }
  } catch (thrown) {
    if (thrown instanceof ConfigError) {
      options.io.err(`error: ${thrown.message}`);
      return 1;
    }
    throw thrown;
  }
}
