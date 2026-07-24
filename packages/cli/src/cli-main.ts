/**
 * Command dispatch for the canonical grammar (https://docs.rulvar.com/guide/cli):
 * no aliases in v1; unknown commands and flags fail loudly with usage.
 */
import { ConfigError, sanitizeTerminalText } from '@rulvar/core';

import {
  inspectCommand,
  invoiceCommand,
  kbCommand,
  planCommand,
  preflightCommand,
  replayCommand,
  resumeCommand,
  runCommand,
  runsAuditCommand,
  runsLsCommand,
} from './commands.js';
import { helpCommandLines, RUNS_FAMILY_USAGE } from './grammar.js';
import type { CliIo } from './io.js';

// The command block renders from the one canonical grammar structure
// (v1.16.2 review P3-1): help, per-command usage errors, and the docs
// grammar block can no longer drift apart.
export const HELP: string = `rulvar: durable multi-agent workflows (https://docs.rulvar.com)

${helpCommandLines()
  .map((line) => `  ${line}`)
  .join('\n')}

Engine assembly: adapters, defaults, and the workflow registry come from
rulvar.config.mjs in the working directory (default export
{ engineOptions?, workflows? }) or from the workflow module's named
exports. --store selects the JsonlFileStore directory (default .rulvar).
runs audit compares every run's meta row against its journal and names
the divergences worker sweeps cannot see (a stranded run's terminal
meta over live journal work); --repair rewrites the sound ones from
the journal under a brief lease, exit 1 while any divergence remains.
replay verifies a recorded run without paying: a dry-run resume (zero
journal or meta writes, zero adapter calls) that reports replay
accounting, localized determinism warnings, and the output digest;
--assert-no-live exits 1 unless the replay is pure, and
--compare-output-hash exits 1 unless the replayed result's digest
equals the journaled one.
invoice prints the per-dispatch reconciliation export: one row per
billable provider call (failed and retried attempts included) with the
provider's response id when the adapter surfaced one, plus the
gross/net ledger totals (gross includes abandoned subtrees, exactly
what the provider bills); --json emits the machine-readable form.
preflight is the effective-config linter and dry-run estimator: it
assembles the SAME options rulvar run would (config, module exports,
--profile, --budget-usd) but constructs no engine and dispatches
nothing, then prints the effective merged limits per declared spawn,
the layer-1 admission projection over the declared wave (which spawns
admit, which are denied and by what), the per-tool and weighted-unit
bottleneck ordering, the concurrency and quota exposure floors, and
the linter findings. The declared wave comes from the preflight export
of the config or workflow module, or --spawns JSON; --json emits the
machine-readable report; exit 1 when any finding is severity error.
plan asks the planner model (role plan) to write a workflow script,
lints and self-repairs it, then runs it in the worker sandbox; --dry-run
prints the accepted script without running. Both stages are paid runs
with their own immutable ceilings: --planning-budget-usd caps the
planning run, --budget-usd caps the execution run, and a missing
ceiling fails loudly unless --allow-unbounded waives it explicitly.
Requires @rulvar/planner installed. kb list shows the per-project claim store
(./rulvar.models.json) with full provenance. kb sweep runs the
falsification matrix from the kbSweep section of rulvar.config.mjs
(fixed pool UNIONED with every model carrying an active negative claim
plus the re-measure queue; optional canary probes flip drifted claims
stale first; kbSweep.budgets sets per-run ceilings plus the maxTotalUsd
envelope, required unless allowUnbounded waives it; requires
@rulvar/evals installed). kb inbox aggregates
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
      case 'replay':
        return await replayCommand(rest, context);
      case 'runs': {
        const [sub, ...subRest] = rest;
        if (sub === 'ls') {
          return await runsLsCommand(subRest, context);
        }
        if (sub === 'audit') {
          return await runsAuditCommand(subRest, context);
        }
        throw new ConfigError(RUNS_FAMILY_USAGE);
      }
      case 'inspect':
        return await inspectCommand(rest, context);
      case 'invoice':
        return await invoiceCommand(rest, context);
      case 'plan':
        return await planCommand(rest, context);
      case 'preflight':
        return await preflightCommand(rest, context);
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
      // The one print site for every typed CLI error: messages can embed
      // user-controlled text (a runId, a target, a command name), so the
      // whole line is sanitized here, matching what the TUI already does
      // to event text (v1.24.1 review P2-1). Exit semantics unchanged.
      options.io.err(`error: ${sanitizeTerminalText(thrown.message)}`);
      return 1;
    }
    throw thrown;
  }
}
