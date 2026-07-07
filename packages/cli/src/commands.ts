/**
 * The four M5 commands of the canonical CLI grammar (docs/06, section
 * 10.5; no aliases in v1):
 *
 *   lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]
 *   lurker resume <runId>  [--store PATH]
 *   lurker runs ls         [--store PATH]
 *   lurker inspect <runId> [--store PATH]
 *
 * `plan` and `kb` land with M6+/M10. Every command builds strictly from
 * the public @lurker/core API (docs/02, section 4).
 */
import { parseArgs } from 'node:util';

import { ConfigError, type RunOptions, type Workflow } from '@lurker/core';

import { loadCliConfig, loadWorkflowModule, looksLikeFile } from './config.js';
import { assembleEngine } from './engine-assembly.js';
import { driveRun, reportOutcome } from './drive.js';
import type { CliIo } from './io.js';

export interface CommandContext {
  cwd: string;
  io: CliIo;
}

interface CommonFlags {
  store?: string;
}

function parseRunFlags(argv: string[]): {
  positionals: string[];
  store?: string;
  args?: string;
  budgetUsd?: number;
} {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      args: { type: 'string' },
      store: { type: 'string' },
      'budget-usd': { type: 'string' },
    },
  });
  const parsed: ReturnType<typeof parseRunFlags> = { positionals };
  if (values.store !== undefined) {
    parsed.store = values.store;
  }
  if (values.args !== undefined) {
    parsed.args = values.args;
  }
  if (values['budget-usd'] !== undefined) {
    const budget = Number(values['budget-usd']);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new ConfigError(
        `--budget-usd must be a positive number, got '${values['budget-usd']}'`,
      );
    }
    parsed.budgetUsd = budget;
  }
  return parsed;
}

function parseCommonFlags(argv: string[]): { positionals: string[] } & CommonFlags {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { store: { type: 'string' } },
  });
  return { positionals, ...(values.store === undefined ? {} : { store: values.store }) };
}

export async function runCommand(argv: string[], context: CommandContext): Promise<number> {
  const flags = parseRunFlags(argv);
  const target = flags.positionals[0];
  if (target === undefined) {
    throw new ConfigError(
      'usage: lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]',
    );
  }
  const config = await loadCliConfig(context.cwd);
  const module = looksLikeFile(target) ? await loadWorkflowModule(target, context.cwd) : undefined;
  const assembled = assembleEngine({
    config,
    ...(module === undefined ? {} : { module }),
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    cwd: context.cwd,
  });
  const workflow = module?.workflow ?? assembled.workflows[target];
  if (workflow === undefined) {
    throw new ConfigError(
      looksLikeFile(target)
        ? `${target} exports no workflow (default export or named 'workflow')`
        : `no workflow named '${target}' in the registry; register it in lurker.config.mjs`,
    );
  }
  let args: unknown;
  if (flags.args !== undefined) {
    try {
      args = JSON.parse(flags.args);
    } catch {
      throw new ConfigError(`--args is not valid JSON: ${flags.args}`);
    }
  }
  const runOptions: RunOptions = {
    ...(flags.budgetUsd === undefined ? {} : { budgetUsd: flags.budgetUsd }),
  };
  const first = assembled.engine.run(
    workflow as unknown as Workflow<unknown, unknown>,
    args,
    runOptions,
  );
  context.io.err(`runId: ${first.runId}`);
  const outcome = await driveRun({
    engine: assembled.engine,
    workflow,
    first,
    io: context.io,
    args,
  });
  return reportOutcome(outcome, context.io);
}

export async function resumeCommand(argv: string[], context: CommandContext): Promise<number> {
  const flags = parseRunFlags(argv);
  const runId = flags.positionals[0];
  if (runId === undefined) {
    throw new ConfigError('usage: lurker resume <runId> [--args JSON] [--store PATH]');
  }
  // Original arguments are not journaled for in-process workflows in
  // v1: the host re-supplies them on resume (docs/06, section 10.5 as
  // amended; docs/14 resume binding residuals).
  let args: unknown;
  if (flags.args !== undefined) {
    try {
      args = JSON.parse(flags.args);
    } catch {
      throw new ConfigError(`--args is not valid JSON: ${flags.args}`);
    }
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    cwd: context.cwd,
  });
  const metas = await assembled.store.listRuns();
  const meta = metas.find((m) => m.runId === runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  const name = meta.workflowName;
  const workflow =
    name === undefined
      ? undefined
      : (assembled.workflows[name] as Workflow<never, unknown> | undefined);
  if (workflow === undefined) {
    throw new ConfigError(
      `run '${runId}' was started from workflow '${name ?? '(unknown)'}'; register it under ` +
        `that name in lurker.config.mjs workflows to resume (docs/06, section 10.2: resume ` +
        'requires the in-process workflow value)',
    );
  }
  const first = assembled.engine.resume(runId, workflow as unknown as Workflow<unknown, unknown>, {
    args,
  });
  const outcome = await driveRun({
    engine: assembled.engine,
    workflow,
    first,
    io: context.io,
    args,
  });
  return reportOutcome(outcome, context.io);
}

export async function runsLsCommand(argv: string[], context: CommandContext): Promise<number> {
  const flags = parseCommonFlags(argv);
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    cwd: context.cwd,
  });
  const metas = await assembled.store.listRuns();
  if (metas.length === 0) {
    context.io.err('no runs in the store');
    return 0;
  }
  for (const meta of metas) {
    const workflow = meta.workflowName === undefined ? '' : ` workflow=${meta.workflowName}`;
    const name = meta.name === undefined ? '' : ` name=${meta.name}`;
    context.io.out(`${meta.runId} ${meta.status} updated=${meta.updatedAt}${workflow}${name}`);
  }
  return 0;
}

export async function inspectCommand(argv: string[], context: CommandContext): Promise<number> {
  const flags = parseCommonFlags(argv);
  const runId = flags.positionals[0];
  if (runId === undefined) {
    throw new ConfigError('usage: lurker inspect <runId> [--store PATH]');
  }
  const config = await loadCliConfig(context.cwd);
  const assembled = assembleEngine({
    config,
    ...(flags.store === undefined ? {} : { storePath: flags.store }),
    cwd: context.cwd,
  });
  const metas = await assembled.store.listRuns();
  const meta = metas.find((m) => m.runId === runId);
  if (meta === undefined) {
    throw new ConfigError(`run '${runId}' not found in the store`);
  }
  const entries = await assembled.store.load(runId);
  context.io.out(`run ${meta.runId}: ${meta.status} (updated ${meta.updatedAt})`);
  if (meta.workflowName !== undefined) {
    context.io.out(`workflow: ${meta.workflowName}`);
  }
  // Journal summary without payload parsing beyond the engine's own
  // entry shapes (M5-T01 acceptance): counts per kind, terminal
  // statuses, and open suspensions from the entries themselves.
  const byKind = new Map<string, number>();
  let openSuspensions = 0;
  const resolvedRefs = new Set<number>();
  for (const entry of entries) {
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
    if (entry.kind === 'resolution' && typeof entry.ref === 'number') {
      resolvedRefs.add(entry.ref);
    }
  }
  for (const entry of entries) {
    if ((entry.kind === 'external' || entry.kind === 'approval') && entry.status === 'suspended') {
      if (!resolvedRefs.has(entry.seq)) {
        openSuspensions += 1;
      }
    }
  }
  context.io.out(`entries: ${entries.length}`);
  for (const [kind, count] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    context.io.out(`  ${kind}: ${count}`);
  }
  context.io.out(`open suspensions: ${openSuspensions}`);
  for (const entry of entries) {
    const status = entry.status === undefined ? '' : ` ${entry.status}`;
    const served = entry.servedBy === undefined ? '' : ` servedBy=${entry.servedBy}`;
    context.io.out(`#${entry.seq} ${entry.kind}${status}${served}`);
  }
  return 0;
}
