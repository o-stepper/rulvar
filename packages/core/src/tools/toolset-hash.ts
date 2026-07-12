/**
 * Toolset resolution and hashing (M3-T01): expands the per-spawn tools
 * array (ToolDef | ToolSource | string) into the spawn's toolset snapshot,
 * validates names and collisions, and derives toolsetHash from the
 * contracts only. The snapshot is captured at spawn time and stays stable
 * for the agent's lifetime; provider-side drift of a source's tools
 * changes the content key of NEW spawns only.
 *
 * Docs: https://docs.rulvar.com/guide/tools.
 */
import { ConfigError } from '../l0/errors.js';
import type { ToolContract } from '../l0/messages.js';
import { EMPTY_TOOLSET_HASH, toolsetHash } from '../l0/schema.js';
import type { ToolDef, ToolSource, ToolSourceSession } from '../l0/spi/toolsource.js';
import { TOOL_NAME_PATTERN, toolContract } from './tool.js';

/** The per-spawn tools option value domain. */
export type ToolsOption = ReadonlyArray<ToolDef | ToolSource | string>;

/** The spawn's frozen toolset snapshot plus its identity hash. */
export interface ResolvedToolset {
  tools: ToolDef[];
  contracts: ToolContract[];
  hash: string;
}

/** The empty toolset (no tools declared anywhere). */
export function emptyToolset(): ResolvedToolset {
  return { tools: [], contracts: [], hash: EMPTY_TOOLSET_HASH };
}

function isToolDef(spec: ToolDef | ToolSource | string): spec is ToolDef {
  return typeof spec !== 'string' && (spec as ToolDef).kind === 'tool';
}

/**
 * Expands sources, validates every tool name and duplicate names across
 * the whole toolset (ConfigError at spawn time), and computes the
 * toolsetHash over contracts sorted by name.
 */
export async function resolveToolset(
  specs: ToolsOption | undefined,
  session: ToolSourceSession,
): Promise<ResolvedToolset> {
  if (specs === undefined || specs.length === 0) {
    return emptyToolset();
  }
  const tools: ToolDef[] = [];
  for (const spec of specs) {
    if (typeof spec === 'string') {
      throw new ConfigError(
        `tools by registered name ('${spec}') are not supported here: pass ToolDef or ` +
          'ToolSource values. Registered toolset names exist only for the dynamic ' +
          "orchestrator's spawn_agent toolsetRef (https://docs.rulvar.com/guide/tools)",
      );
    }
    if (isToolDef(spec)) {
      tools.push(spec);
      continue;
    }
    const imported = await spec.tools(session);
    tools.push(...imported);
  }
  const seen = new Map<string, ToolDef>();
  for (const def of tools) {
    if (!TOOL_NAME_PATTERN.test(def.name)) {
      throw new ConfigError(
        `imported tool name '${def.name}' must match ^[a-zA-Z0-9_-]{1,64}$; ` +
          'namespace it with the source prefix option',
      );
    }
    if (seen.has(def.name)) {
      throw new ConfigError(
        `duplicate tool name '${def.name}' in one toolset; disambiguate with the ` +
          'MCP prefix option',
      );
    }
    if (def.executor !== 'inprocess') {
      // Fail at registration, not at first call: only the inprocess
      // executor is enforced in v1; subprocess/container stay declared
      // capability until the executor design closes (still an open question).
      throw new ConfigError(
        `tool '${def.name}' declares executor '${def.executor}', but this engine ` +
          "implements only 'inprocess' in v1",
      );
    }
    seen.set(def.name, def);
  }
  const contracts = tools.map((def) => toolContract(def));
  return { tools, contracts, hash: toolsetHash(contracts) };
}
