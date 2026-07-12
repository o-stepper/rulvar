/**
 * Permission presets, audit, and the offline dry-run API (M5-T05):
 * preset compilation equals the documented
 * rule tables verbatim; undeclared risk is treated conservatively;
 * audit fields ride tool:end; domain rules are advisory and reported,
 * never enforced; the offline evaluatePermission answers hypothetical
 * calls without executing anything.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { compilePermissionChain, evaluatePermission } from '../runtime/permission-chain.js';
import { compilePermissionPreset } from './presets.js';
import { tool, toolContract } from './tool.js';
import { createCtx } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter } from '../engine/test-harness.js';

describe('compilePermissionPreset (M5-T05 acceptance: equals the documented tables)', () => {
  it('strict', () => {
    expect(compilePermissionPreset('strict')).toEqual({
      deny: [{ risk: 'destructive' }],
      ask: [{ risk: ['write', 'network', 'execute'] }, { risk: 'undeclared' }],
    });
  });

  it('standard', () => {
    expect(compilePermissionPreset('standard')).toEqual({
      deny: [],
      ask: [{ risk: ['network', 'execute', 'destructive'] }, { risk: 'undeclared' }],
    });
  });

  it('open is exactly "chain without preset"', () => {
    expect(compilePermissionPreset('open')).toEqual({ deny: [], ask: [] });
  });

  it('compiled preset rules concatenate AFTER host-authored rules', () => {
    const chain = compilePermissionChain(
      { deny: [{ tool: 'host-banned' }] },
      { preset: 'strict', ask: [{ tool: 'host-asks' }] },
    );
    expect(chain.deny).toEqual([{ tool: 'host-banned' }, { risk: 'destructive' }]);
    expect(chain.ask[0]).toEqual({ tool: 'host-asks' });
  });
});

describe('offline evaluatePermission (docs/08, 4.5 dry-run API)', () => {
  const chain = compilePermissionChain(undefined, { preset: 'strict' });

  it('answers hypothetical calls by tool name without executing', async () => {
    // Unknown risk under strict: the undeclared-risk ask rule fires.
    const verdict = await evaluatePermission(chain, 'mystery-tool', {});
    expect(verdict.verdict).toBe('ask');
    expect(verdict.decidedBy).toBe('ask-rule');
    expect('rule' in verdict ? verdict.rule : undefined).toEqual({ risk: 'undeclared' });
  });

  it('resolves declared risks through the tables', async () => {
    const read = await evaluatePermission(
      chain,
      { name: 't', needsApproval: false, risk: 'read' },
      {},
    );
    expect(read.verdict).toBe('allow');
    expect(read.decidedBy).toBe('default');
    const destructive = await evaluatePermission(
      chain,
      { name: 't', needsApproval: false, risk: 'destructive' },
      {},
    );
    expect(destructive.verdict).toBe('deny');
    expect(destructive.decidedBy).toBe('deny-rule');
    const write = await evaluatePermission(
      chain,
      { name: 't', needsApproval: false, risk: 'write' },
      {},
    );
    expect(write.verdict).toBe('ask');
  });

  it('reports advisory domain-rule matches without changing the verdict', async () => {
    const advisoryChain = compilePermissionChain({
      ask: [{ tool: 'curl-ish', domains: ['example.com'] }],
    });
    const verdict = await evaluatePermission(advisoryChain, 'curl-ish', {
      url: 'https://evil.test/x',
    });
    // Advisory in the current release: allow by default, reported.
    expect(verdict.verdict).toBe('allow');
    expect(verdict.advisory).toEqual([{ tool: 'curl-ish', domains: ['example.com'] }]);
  });
});

describe('audit fields ride tool:end (M5-T05)', () => {
  it('emits verdict, deciding layer, and matched rule on allow and deny', async () => {
    const reader = tool({
      name: 'reader',
      description: 'reads',
      parameters: z.strictObject({}),
      risk: 'read',
      execute: () => Promise.resolve('data'),
    });
    const wrecker = tool({
      name: 'wrecker',
      description: 'destroys',
      parameters: z.strictObject({}),
      risk: 'destructive',
      execute: () => Promise.resolve('boom'),
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'reader', args: {} },
              { name: 'wrecker', args: {} },
            ],
          }
        : { text: 'done' },
    );
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { worker: { tools: [reader, wrecker], permissions: { preset: 'strict' } } },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('use the tools', { agentType: 'worker' });
    expect(result).toBe('done');
    const ends = events.ofType('tool:end');
    const readerEnd = ends.find((e) => e.toolName === 'reader');
    expect(readerEnd?.outcome).toBe('ok');
    expect(readerEnd?.verdict).toBe('allow');
    expect(readerEnd?.decidedBy).toBe('default');
    const wreckerEnd = ends.find((e) => e.toolName === 'wrecker');
    expect(wreckerEnd?.outcome).toBe('denied');
    expect(wreckerEnd?.verdict).toBe('deny');
    expect(wreckerEnd?.decidedBy).toBe('deny-rule');
    expect(wreckerEnd?.rule).toEqual({ risk: 'destructive' });
    void toolContract;
  });
});
