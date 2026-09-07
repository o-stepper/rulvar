import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import {
  compilePermissionChain,
  evaluatePermission,
  type CanUseTool,
  type PermissionHook,
  type PermissionRule,
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

/**
 * The advisory hook allow (RV4911, plan 49). The documented order let a
 * hook's allow decide before the deny tables for every tool without
 * needsApproval, so one engine level allow hook silently retired a
 * profile deny rule, the readonly isolation rule and the pilot
 * profile's denial, and no test covered the composition.
 */
describe('hookAllow (RV4911)', () => {
  const allowAll: PermissionHook = () => 'allow';
  const denyRead = { deny: [{ tool: 'read_file' }] };

  it('the default keeps its bytes: an engine allow hook decides before a profile deny rule', async () => {
    const decisive = compilePermissionChain({ hooks: [allowAll] }, denyRead);
    expect(decisive.hookAllow).toBeUndefined();
    expect(await evaluatePermission(decisive, plainTool, { a: 1 }, ctx)).toEqual({
      verdict: 'allow',
      decidedBy: 'hook',
      input: { a: 1 },
    });
    const explicit = compilePermissionChain({ hooks: [allowAll], hookAllow: 'decisive' }, denyRead);
    expect(explicit).toEqual(decisive);
    expect(await evaluatePermission(explicit, plainTool, { a: 1 }, ctx)).toEqual({
      verdict: 'allow',
      decidedBy: 'hook',
      input: { a: 1 },
    });
  });

  it("under 'advisory' the profile deny rule wins over the engine allow hook", async () => {
    const chain = compilePermissionChain({ hooks: [allowAll], hookAllow: 'advisory' }, denyRead);
    expect(chain.hookAllow).toBe('advisory');
    expect(await evaluatePermission(chain, plainTool, {}, ctx)).toEqual({
      verdict: 'deny',
      decidedBy: 'deny-rule',
      rule: { tool: 'read_file' },
      input: {},
    });
  });

  it('the readonly isolation rule survives an engine allow hook under advisory', async () => {
    // What ctx.agent appends for isolation 'readonly'.
    const readonlyDeny: PermissionRule = { risk: ['write', 'destructive'] };
    const advisory = compilePermissionChain({ hooks: [allowAll], hookAllow: 'advisory' });
    const chain = { ...advisory, deny: [...advisory.deny, readonlyDeny] };
    const writer = { name: 'write_note', needsApproval: false, risk: 'write' } as const;
    expect(await evaluatePermission(chain, writer, {}, ctx)).toMatchObject({
      verdict: 'deny',
      decidedBy: 'deny-rule',
      rule: readonlyDeny,
    });
    const decisive = compilePermissionChain({ hooks: [allowAll] });
    const today = { ...decisive, deny: [...decisive.deny, readonlyDeny] };
    expect(await evaluatePermission(today, writer, {}, ctx)).toMatchObject({
      verdict: 'allow',
      decidedBy: 'hook',
    });
  });

  it('once no deny rule matched the held allow decides: ask rules, canUseTool and the default stay unconsulted', async () => {
    let canUseCalled = false;
    const chain = compilePermissionChain({
      hooks: [allowAll],
      hookAllow: 'advisory',
      ask: [{ tool: 'read_file' }, { tool: 'deploy' }],
      canUseTool: () => {
        canUseCalled = true;
        return 'deny';
      },
    });
    expect(await evaluatePermission(chain, plainTool, { q: 1 }, ctx)).toEqual({
      verdict: 'allow',
      decidedBy: 'hook',
      input: { q: 1 },
    });
    // Without strict mode the held allow clears a needsApproval tool
    // exactly as the decisive one did.
    expect(await evaluatePermission(chain, approvalTool, {}, ctx)).toMatchObject({
      verdict: 'allow',
      decidedBy: 'hook',
    });
    expect(canUseCalled).toBe(false);
  });

  it('which hooks run does not change: the allow still ends the hook layer', async () => {
    const order: string[] = [];
    const chain = compilePermissionChain({
      hookAllow: 'advisory',
      hooks: [
        () => {
          order.push('first');
          return 'allow';
        },
        () => {
          order.push('second');
          return 'deny';
        },
      ],
    });
    expect((await evaluatePermission(chain, plainTool, {}, ctx)).verdict).toBe('allow');
    expect(order).toEqual(['first']);
  });

  it('the deny rules read the hook modified input', async () => {
    const chain = compilePermissionChain({
      hookAllow: 'advisory',
      hooks: [
        (_name, input) => ({
          modifiedInput: { command: `${(input as { command: string }).command} --force` },
        }),
        allowAll,
      ],
      deny: [{ tool: 'git', argv: 'git push --force' }],
    });
    const git = { name: 'git', needsApproval: false } as const;
    expect(await evaluatePermission(chain, git, { command: 'git push' }, ctx)).toMatchObject({
      verdict: 'deny',
      decidedBy: 'deny-rule',
      input: { command: 'git push --force' },
    });
  });

  it('merges monotonically: any layer arms it and a profile cannot loosen an engine armed mode', async () => {
    const engineArmed = compilePermissionChain(
      { hooks: [allowAll], hookAllow: 'advisory' },
      { ...denyRead, hookAllow: 'decisive' },
    );
    expect((await evaluatePermission(engineArmed, plainTool, {}, ctx)).verdict).toBe('deny');
    const profileArmed = compilePermissionChain(
      { hooks: [allowAll] },
      { ...denyRead, hookAllow: 'advisory' },
    );
    expect((await evaluatePermission(profileArmed, plainTool, {}, ctx)).verdict).toBe('deny');
  });

  it('strictApprovals keeps its precedence: over a needsApproval tool the allow falls through, not held', async () => {
    const chain = compilePermissionChain({
      hooks: [allowAll],
      hookAllow: 'advisory',
      strictApprovals: true,
    });
    expect(await evaluatePermission(chain, approvalTool, {}, ctx)).toMatchObject({
      verdict: 'ask',
      decidedBy: 'default',
    });
  });

  it('a value outside the two refuses at compile, fail closed', () => {
    expect(() => compilePermissionChain({ hookAllow: 'yes' as unknown as 'advisory' })).toThrow(
      ConfigError,
    );
    expect(() =>
      compilePermissionChain(undefined, { hookAllow: true as unknown as 'advisory' }),
    ).toThrow(/profile permissions\.hookAllow must be 'decisive' or 'advisory'/);
  });
});

/**
 * The wired inheritance (RV4912, plan 49): the third argument is the
 * spawning agent's chain compiled with no engine layer, applied only
 * when the profile opts in, between the engine layer and the profile's
 * own layers.
 */
describe('inheritPermissions (RV4912)', () => {
  it('the undeclared and the false opt in ignore the spawning layer byte for byte', () => {
    const parent = compilePermissionChain(undefined, {
      hooks: [() => 'deny'],
      deny: [{ tool: 'p' }],
      strictApprovals: true,
    });
    const plain = compilePermissionChain({ deny: [{ tool: 'e' }] }, { deny: [{ tool: 'c' }] });
    expect(
      compilePermissionChain({ deny: [{ tool: 'e' }] }, { deny: [{ tool: 'c' }] }, parent),
    ).toEqual(plain);
    expect(
      compilePermissionChain(
        { deny: [{ tool: 'e' }] },
        { deny: [{ tool: 'c' }], inheritPermissions: false },
        parent,
      ),
    ).toEqual(plain);
  });

  it('true prefixes the spawning layer between the engine layer and the profile, hooks and tables in order', async () => {
    const calls: string[] = [];
    const named =
      (name: string): PermissionHook =>
      () => {
        calls.push(name);
        return undefined;
      };
    const parent = compilePermissionChain(undefined, {
      hooks: [named('parent')],
      deny: [{ tool: 'p' }],
      ask: [{ tool: 'pa' }],
    });
    const chain = compilePermissionChain(
      { hooks: [named('engine')], deny: [{ tool: 'e' }], ask: [{ tool: 'ea' }] },
      {
        hooks: [named('child')],
        deny: [{ tool: 'c' }],
        ask: [{ tool: 'ca' }],
        preset: 'strict',
        inheritPermissions: true,
      },
      parent,
    );
    expect(chain.deny).toEqual([
      { tool: 'e' },
      { tool: 'p' },
      { tool: 'c' },
      { risk: 'destructive' },
    ]);
    expect(chain.ask).toEqual([
      { tool: 'ea' },
      { tool: 'pa' },
      { tool: 'ca' },
      { risk: ['write', 'network', 'execute'] },
      { risk: 'undeclared' },
    ]);
    await evaluatePermission(chain, plainTool, {}, ctx);
    expect(calls).toEqual(['engine', 'parent', 'child']);
    // A parent deny reaches the child.
    expect(
      await evaluatePermission(chain, { name: 'p', needsApproval: false }, {}, ctx),
    ).toMatchObject({ verdict: 'deny', decidedBy: 'deny-rule', rule: { tool: 'p' } });
  });

  it('single slots resolve profile over inherited over engine; the modes merge monotonically', () => {
    const engineCan: CanUseTool = () => 'deny';
    const parentCan: CanUseTool = () => 'allow';
    const childCan: CanUseTool = () => ({ modifiedInput: 1 });
    const parent = compilePermissionChain(undefined, {
      canUseTool: parentCan,
      approvalDeadlineMs: 500,
      strictApprovals: true,
      hookAllow: 'advisory',
    });
    const inheritedOnly = compilePermissionChain(
      { canUseTool: engineCan, approvalDeadlineMs: 900 },
      { inheritPermissions: true },
      parent,
    );
    expect(inheritedOnly.canUseTool).toBe(parentCan);
    expect(inheritedOnly.approvalDeadlineMs).toBe(500);
    expect(inheritedOnly.strictApprovals).toBe(true);
    expect(inheritedOnly.hookAllow).toBe('advisory');
    const childWins = compilePermissionChain(
      { canUseTool: engineCan, approvalDeadlineMs: 900 },
      {
        inheritPermissions: true,
        canUseTool: childCan,
        approvalDeadlineMs: 100,
        strictApprovals: false,
        hookAllow: 'decisive',
      },
      parent,
    );
    expect(childWins.canUseTool).toBe(childCan);
    expect(childWins.approvalDeadlineMs).toBe(100);
    // A child cannot loosen what it inherited.
    expect(childWins.strictApprovals).toBe(true);
    expect(childWins.hookAllow).toBe('advisory');
  });

  it('a non boolean opt in refuses at compile, fail closed', () => {
    expect(() =>
      compilePermissionChain(undefined, { inheritPermissions: 'yes' as unknown as boolean }),
    ).toThrow(ConfigError);
  });
});
