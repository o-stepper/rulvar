/**
 * The wired subagent inheritance (RV4912, plan 49). `inheritPermissions`
 * was carried as data and read nowhere: the one runtime chain compile
 * took the engine layer and the child's own profile, so the opt in the
 * tools guide documents was a dead fuse. The spawning agent's layer now
 * rides the scope state its loop runs under, and a child spawned from
 * one of its tools prefixes that layer ahead of its own when its
 * profile opts in; the undeclared and the false opt in keep every byte.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type {
  AgentProfilePermissions,
  PermissionConfig,
  PermissionHook,
} from '../runtime/permission-chain.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const agentTypeOf = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

interface DriveOptions {
  child?: AgentProfilePermissions;
  parent?: AgentProfilePermissions;
  parentIsolation?: 'readonly';
  engine?: PermissionConfig;
}

interface Driven {
  probeRan: boolean;
  /** The child's second request, which carries the probe's tool result. */
  childSecondRequest: string;
}

function probeTool(ran: { value: boolean }): ReturnType<typeof tool> {
  return tool({
    name: 'probe',
    description: 'observable write risk probe',
    parameters: { type: 'object' },
    risk: 'write',
    execute: () => {
      ran.value = true;
      return Promise.resolve('probe ran');
    },
  });
}

/**
 * A parent agent whose only tool spawns the child from inside its
 * execute; the child's only tool is the write risk probe. The script
 * runs by global call order: the parent asks for the spawn, the child
 * asks for the probe, the child settles, the parent settles.
 */
async function drive(options: DriveOptions): Promise<Driven> {
  const ran = { value: false };
  const adapter = scriptedAdapter((_req, call): ScriptedTurn => {
    switch (call) {
      case 0:
        return { toolCall: { name: 'spawn_child', args: {} } };
      case 1:
        return { toolCall: { name: 'probe', args: {} } };
      case 2:
        return { text: 'child done' };
      default:
        return { text: 'parent done' };
    }
  });
  const { internals } = makeInternals({
    adapters: [adapter],
    routing: { loop: 'fake:model' },
    ...(options.engine === undefined ? {} : { permissions: options.engine }),
    profiles: {
      parent: options.parent === undefined ? {} : { permissions: options.parent },
      child: options.child === undefined ? {} : { permissions: options.child },
    },
  });
  const ctx = createCtx(internals);
  const probe = probeTool(ran);
  const spawnChild = tool({
    name: 'spawn_child',
    description: 'spawns the child agent from inside the parent',
    parameters: { type: 'object' },
    execute: () => ctx.agent('use the probe', { agentType: 'child', tools: [probe] }),
  });
  const result = await (options.parentIsolation === undefined
    ? ctx.agent('delegate', { agentType: 'parent', tools: [spawnChild] })
    : ctx.agent('delegate', { agentType: 'parent', tools: [spawnChild], isolation: 'readonly' }));
  expect(result).toBe('parent done');
  expect(adapter.calls.map(agentTypeOf)).toEqual(['parent', 'child', 'child', 'parent']);
  return { probeRan: ran.value, childSecondRequest: JSON.stringify(adapter.calls[2] ?? {}) };
}

describe('subagent permission inheritance through ctx.agent (RV4912)', () => {
  const parentDeny: AgentProfilePermissions = { deny: [{ tool: 'probe' }] };

  it('a parent deny rule reaches the child only under inheritPermissions: true', async () => {
    const inherited = await drive({ parent: parentDeny, child: { inheritPermissions: true } });
    expect(inherited.probeRan).toBe(false);
    expect(inherited.childSecondRequest).toMatch(/deny/i);
    const declined = await drive({ parent: parentDeny, child: { inheritPermissions: false } });
    expect(declined.probeRan).toBe(true);
    const undeclared = await drive({ parent: parentDeny, child: {} });
    expect(undeclared.probeRan).toBe(true);
    const bare = await drive({ parent: parentDeny });
    expect(bare.probeRan).toBe(true);
  });

  it("the deny rule the parent's readonly isolation compiled is part of what the child inherits", async () => {
    const inherited = await drive({
      parentIsolation: 'readonly',
      child: { inheritPermissions: true },
    });
    expect(inherited.probeRan).toBe(false);
    // The child itself runs without isolation: only the opt in carries the rule.
    const own = await drive({ parentIsolation: 'readonly', child: {} });
    expect(own.probeRan).toBe(true);
  });

  it('the engine layer is applied once: an engine hook runs once per evaluation under inheritance', async () => {
    const seen: string[] = [];
    const engineHook: PermissionHook = (name) => {
      seen.push(name);
      return undefined;
    };
    await drive({ engine: { hooks: [engineHook] }, child: { inheritPermissions: true } });
    expect(seen).toEqual(['spawn_child', 'probe']);
  });

  it('a child inherits from its own spawning agent, not from an ancestor that agent declined', async () => {
    // grandparent (deny probe) spawns parent (no opt in) spawns child
    // (opt in): the parent's layer above the engine is empty, so the
    // child's probe runs. The script by global call order: the
    // grandparent asks for the parent, the parent asks for the child,
    // the child asks for the probe, then the three settle inside out.
    const ran = { value: false };
    const adapter = scriptedAdapter((_req, call): ScriptedTurn => {
      switch (call) {
        case 0:
          return { toolCall: { name: 'spawn_parent', args: {} } };
        case 1:
          return { toolCall: { name: 'spawn_child', args: {} } };
        case 2:
          return { toolCall: { name: 'probe', args: {} } };
        case 3:
          return { text: 'child done' };
        case 4:
          return { text: 'parent done' };
        default:
          return { text: 'grandparent done' };
      }
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: {
        grandparent: { permissions: parentDeny },
        parent: {},
        child: { permissions: { inheritPermissions: true } },
      },
    });
    const ctx = createCtx(internals);
    const probe = probeTool(ran);
    const spawnChild = tool({
      name: 'spawn_child',
      description: 'spawns the child from inside the parent',
      parameters: { type: 'object' },
      execute: () => ctx.agent('use the probe', { agentType: 'child', tools: [probe] }),
    });
    const spawnParent = tool({
      name: 'spawn_parent',
      description: 'spawns the parent from inside the grandparent',
      parameters: { type: 'object' },
      execute: () => ctx.agent('delegate', { agentType: 'parent', tools: [spawnChild] }),
    });
    const result = await ctx.agent('delegate twice', {
      agentType: 'grandparent',
      tools: [spawnParent],
    });
    expect(result).toBe('grandparent done');
    expect(adapter.calls.map(agentTypeOf)).toEqual([
      'grandparent',
      'parent',
      'child',
      'child',
      'parent',
      'grandparent',
    ]);
    expect(ran.value).toBe(true);
  });
});
