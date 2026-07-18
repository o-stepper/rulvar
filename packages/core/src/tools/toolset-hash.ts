/**
 * Toolset resolution and hashing (M3-T01): expands the per-spawn tools
 * array (ToolDef | ToolSource | string) into the spawn's toolset snapshot,
 * validates names and collisions, and derives toolsetHash from the
 * contracts only. A string entry names a registered toolset from
 * `createEngine({ defaults: { toolsets } })` (v1.17.0 review P1-3): the
 * registry snapshot belongs to the engine configuration, so the same
 * name expands identically for direct calls, agent profiles, and the
 * sandbox dialect, and an unknown name is a typed ConfigError at spawn
 * time, before any provider call. The snapshot is captured at spawn
 * time and stays stable for the agent's lifetime; provider-side drift
 * of a source's tools changes the content key of NEW spawns only.
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
 * Expands registered names and sources, validates every tool name and
 * duplicate names across the whole toolset (ConfigError at spawn time),
 * and computes the toolsetHash over contracts sorted by name. The
 * `toolsets` registry is the engine's `defaults.toolsets` snapshot;
 * without one, string entries fail with the same unknown-name error as
 * a miss, so nothing outside the declared registry is ever reachable.
 */
export async function resolveToolset(
  specs: ToolsOption | undefined,
  session: ToolSourceSession,
  toolsets?: Record<string, ToolsOption>,
): Promise<ResolvedToolset> {
  if (specs === undefined || specs.length === 0) {
    return emptyToolset();
  }
  const tools: ToolDef[] = [];
  // ToolDef entries push synchronously and only ToolSource expansion
  // awaits: the await profile of a defs-only toolset is part of fresh-run
  // byte determinism (cassette-pinned append interleavings).
  for (const spec of specs) {
    if (typeof spec === 'string') {
      const named = toolsets?.[spec];
      if (named === undefined) {
        throw new ConfigError(
          `unknown registered toolset '${spec}': register it under ` +
            'defaults.toolsets (https://docs.rulvar.com/guide/tools)',
        );
      }
      for (const entry of named) {
        if (typeof entry === 'string') {
          // No nesting: a registry value holds concrete ToolDef and
          // ToolSource entries, never other registered names, so a
          // registry can never cycle.
          throw new ConfigError(
            `registered toolset '${spec}' contains the name '${entry}': registry values ` +
              'hold ToolDef or ToolSource entries, never other registered names',
          );
        }
        if (isToolDef(entry)) {
          tools.push(entry);
          continue;
        }
        tools.push(...(await entry.tools(session)));
      }
      continue;
    }
    if (isToolDef(spec)) {
      tools.push(spec);
      continue;
    }
    tools.push(...(await spec.tools(session)));
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
