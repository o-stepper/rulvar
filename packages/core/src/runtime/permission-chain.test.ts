import { describe, expect, it } from 'vitest';

import type { ToolContext } from '../l0/spi/toolsource.js';
import {
  compilePermissionChain,
  evaluatePermission,
  type PermissionHook,
} from './permission-chain.js';

const ctx: ToolContext = {
  runId: 'run-1',
  spanId: 'span-1',
  agent: { agentType: '' },
  cwd: process.cwd(),
  isolation: 'none',
  signal: new AbortController().signal,
  log: () => undefined,
};

const plainTool = { name: 'read_file', needsApproval: false } as const;
const approvalTool = { name: 'deploy', needsApproval: true } as const;
const riskyTool = { name: 'rm', needsApproval: false, risk: 'destructive' } as const;

describe('permission chain (M3-T03)', () => {
  it('terminal default: allow, unless needsApproval then ask', async () => {
    const chain = compilePermissionChain();
    expect(await evaluatePermission(chain, plainTool, { a: 1 }, ctx)).toEqual({
      verdict: 'allow',
      decidedBy: 'default',
      input: { a: 1 },
    });
    expect(await evaluatePermission(chain, approvalTool, {}, ctx)).toEqual({
      verdict: 'ask',
      decidedBy: 'default',
      input: {},
    });
  });

  it('hooks run in registration order; the first decisive verdict wins', async () => {
    const order: string[] = [];
    const first: PermissionHook = (name) => {
      order.push(`first:${name}`);
      return undefined;
    };
    const second: PermissionHook = () => {
      order.push('second');
      return 'deny';
    };
    const third: PermissionHook = () => {
      order.push('third');
      return 'allow';
    };
    const chain = compilePermissionChain({ hooks: [first, second, third] });
    const verdict = await evaluatePermission(chain, plainTool, {}, ctx);
    expect(verdict).toMatchObject({ verdict: 'deny', decidedBy: 'hook' });
    expect(order).toEqual(['first:read_file', 'second']);
  });

  it('modifiedInput substitutes and continues; later layers see the modified input', async () => {
    const redact: PermissionHook = (_name, input) => ({
      modifiedInput: { ...(input as object), token: 'redacted' },
    });
    let seenByCanUse: unknown;
    const chain = compilePermissionChain({
      hooks: [redact],
      canUseTool: (_name, input) => {
        seenByCanUse = input;
        return 'allow';
      },
    });
    const verdict = await evaluatePermission(chain, plainTool, { token: 'secret', q: 1 }, ctx);
    expect(verdict.input).toEqual({ token: 'redacted', q: 1 });
    expect(seenByCanUse).toEqual({ token: 'redacted', q: 1 });
  });

  it('a deny rule short-circuits BEFORE canUseTool', async () => {
    let canUseCalled = false;
    const chain = compilePermissionChain({
      deny: [{ tool: 'read_file' }],
      canUseTool: () => {
        canUseCalled = true;
        return 'allow';
      },
    });
    const verdict = await evaluatePermission(chain, plainTool, {}, ctx);
    expect(verdict).toMatchObject({
      verdict: 'deny',
      decidedBy: 'deny-rule',
      rule: { tool: 'read_file' },
    });
    expect(canUseCalled).toBe(false);
  });

  it('ask rules match by name array and by declared risk', async () => {
    const chain = compilePermissionChain({
      ask: [{ tool: ['deploy', 'other'] }, { risk: ['destructive', 'execute'] }],
    });
    expect((await evaluatePermission(chain, plainTool, {}, ctx)).verdict).toBe('allow');
    expect(await evaluatePermission(chain, riskyTool, {}, ctx)).toMatchObject({
      verdict: 'ask',
      decidedBy: 'ask-rule',
    });
    // Undeclared risk never matches a risk rule (presets handle it in M5).
    expect((await evaluatePermission(chain, { ...plainTool, name: 'x' }, {}, ctx)).verdict).toBe(
      'allow',
    );
  });

  it('an explicit canUseTool allow is decisive, including over needsApproval: true', async () => {
    const chain = compilePermissionChain({ canUseTool: () => 'allow' });
    expect(await evaluatePermission(chain, approvalTool, {}, ctx)).toEqual({
      verdict: 'allow',
      decidedBy: 'canUseTool',
      input: {},
    });
  });

  it('canUseTool modifiedInput proceeds to the terminal default', async () => {
    const chain = compilePermissionChain({
      canUseTool: () => ({ modifiedInput: { fixed: true } }),
    });
    expect(await evaluatePermission(chain, approvalTool, {}, ctx)).toEqual({
      verdict: 'ask',
      decidedBy: 'default',
      input: { fixed: true },
    });
  });

  it('profile layers merge after engine layers; profile canUseTool wins', async () => {
    const calls: string[] = [];
    const chain = compilePermissionChain(
      {
        hooks: [
          () => {
            calls.push('engine-hook');
            return undefined;
          },
        ],
        deny: [{ tool: 'a' }],
        canUseTool: () => {
          calls.push('engine-canUse');
          return 'deny';
        },
      },
      {
        hooks: [
          () => {
            calls.push('profile-hook');
            return undefined;
          },
        ],
        deny: [{ tool: 'b' }],
        canUseTool: () => {
          calls.push('profile-canUse');
          return 'allow';
        },
      },
    );
    expect(chain.deny).toEqual([{ tool: 'a' }, { tool: 'b' }]);
    const verdict = await evaluatePermission(chain, plainTool, {}, ctx);
    expect(verdict.verdict).toBe('allow');
    expect(calls).toEqual(['engine-hook', 'profile-hook', 'profile-canUse']);
  });

  it('argv, domain, and preset configuration compile from M5 on', () => {
    expect(() => compilePermissionChain({ deny: [{ tool: 'sh', argv: 'rm **' }] })).not.toThrow();
    expect(() =>
      compilePermissionChain({ ask: [{ tool: 'fetch', domains: ['example.com'] }] }),
    ).not.toThrow();
    const chain = compilePermissionChain(undefined, { preset: 'strict' });
    // The preset compiled INTO the layers, never a fifth.
    expect(chain.deny).toEqual([{ risk: 'destructive' }]);
    expect(chain.ask).toEqual([{ risk: ['write', 'network', 'execute'] }, { risk: 'undeclared' }]);
  });
});

/**
 * The strict approval composition (RV1507, the eighteenth improvement
 * plan). The chain's documented order lets a generic host allow (a
 * hook or canUseTool) clear a needsApproval: true tool, which is a
 * deliberate composition for tests and trusted hosts and a fail-open
 * hazard for a platform profile: the seventeenth comparison benchmark
 * asked for a monotonic mode where a blanket allow cannot silently
 * retire a declared approval requirement.
 */
describe('strictApprovals (RV1507)', () => {
  const needy = { name: 'deploy', needsApproval: true } as const;

  it('a generic canUseTool allow no longer clears a needsApproval tool', async () => {
    const chain = compilePermissionChain({ strictApprovals: true, canUseTool: () => 'allow' });
    const verdict = await evaluatePermission(chain, needy, {}, ctx);
    expect(verdict).toMatchObject({ verdict: 'ask', decidedBy: 'default' });
    // A tool without the declaration keeps the historical composition.
    const plain = await evaluatePermission(chain, plainTool, {}, ctx);
    expect(plain).toMatchObject({ verdict: 'allow', decidedBy: 'canUseTool' });
  });

  it('a hook allow falls through identically, while deny and modifiedInput keep their power', async () => {
    const allowing = compilePermissionChain({ strictApprovals: true, hooks: [() => 'allow'] });
    expect(await evaluatePermission(allowing, needy, {}, ctx)).toMatchObject({
      verdict: 'ask',
      decidedBy: 'default',
    });
    const denying = compilePermissionChain({
      strictApprovals: true,
      hooks: [() => 'deny'],
      canUseTool: () => 'allow',
    });
    // Tightening verdicts stay decisive: strict mode is monotonic, not inert.
    expect(await evaluatePermission(denying, needy, {}, ctx)).toMatchObject({
      verdict: 'deny',
      decidedBy: 'hook',
    });
    const modifying = compilePermissionChain({
      strictApprovals: true,
      hooks: [(_tool, input) => ({ modifiedInput: { ...(input as object), pinned: true } })],
    });
    const modified = await evaluatePermission(modifying, needy, { arg: 1 }, ctx);
    expect(modified).toMatchObject({ verdict: 'ask', decidedBy: 'default' });
    expect(modified.input).toEqual({ arg: 1, pinned: true });
  });

  it('the flag merges monotonically: either level arms it', async () => {
    const engineArmed = compilePermissionChain(
      { strictApprovals: true },
      { canUseTool: () => 'allow' },
    );
    expect(await evaluatePermission(engineArmed, needy, {}, ctx)).toMatchObject({
      verdict: 'ask',
    });
    const profileArmed = compilePermissionChain(
      { canUseTool: () => 'allow' },
      { strictApprovals: true },
    );
    expect(await evaluatePermission(profileArmed, needy, {}, ctx)).toMatchObject({
      verdict: 'ask',
    });
    // A profile cannot LOOSEN an engine-armed strict mode.
    const looseProfile = compilePermissionChain(
      { strictApprovals: true },
      { strictApprovals: false, canUseTool: () => 'allow' },
    );
    expect(await evaluatePermission(looseProfile, needy, {}, ctx)).toMatchObject({
      verdict: 'ask',
    });
  });

  it('a non-boolean flag refuses at compile, fail closed', () => {
    expect(() =>
      compilePermissionChain({ strictApprovals: 'yes' as unknown as boolean }),
    ).toThrow();
  });
});
