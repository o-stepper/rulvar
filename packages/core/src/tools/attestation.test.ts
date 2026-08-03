/**
 * The toolset attestation (RV1514): a profile pins the toolsetHash its
 * spawns must resolve to, and a mismatch is a typed refusal at spawn
 * time, before any provider call. attestToolset() records the pin from
 * a resolution; toolContractHash() is the per-tool identity the drift
 * diff is phrased in. Provider-side drift of an imported tool's
 * description or schema used to re-key new spawns SILENTLY (documented
 * in mcp.ts as by-design); under an attested profile the same drift is
 * a named refusal instead.
 */
import { describe, expect, it } from 'vitest';

import { createCtx } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter } from '../engine/test-harness.js';
import { ConfigError } from '../l0/errors.js';
import { toolContractHash, toolsetHash } from '../l0/schema.js';
import { tool, toolContract } from './tool.js';
import { attestToolset, resolveToolset } from './toolset-hash.js';

const HEX64 = /^[0-9a-f]{64}$/u;

function searchTool(description: string) {
  return tool({
    name: 'search',
    description,
    parameters: {},
    execute: () => Promise.resolve('hit'),
  });
}

function fetchTool() {
  return tool({
    name: 'fetch_page',
    description: 'fetches one page',
    parameters: {},
    execute: () => Promise.resolve('page'),
  });
}

function resolved(tools: Parameters<typeof resolveToolset>[0]) {
  return resolveToolset(tools, { runId: 'attest' });
}

function finishAdapter() {
  return scriptedAdapter(() => ({ text: 'done' }));
}

function pinnedInternals(
  tools: ReturnType<typeof tool>[],
  attestation: ReturnType<typeof attestToolset>,
) {
  const adapter = finishAdapter();
  const { internals } = makeInternals({
    adapters: [adapter],
    routing: { loop: 'fake:model' },
    profiles: {
      pinned: {
        description: 'a profile whose toolset is attested',
        tools,
        toolsetAttestation: attestation,
      },
    },
  });
  return { internals, adapter };
}

describe('attestToolset and toolContractHash (RV1514)', () => {
  it('records the aggregate hash and one contract hash per tool', async () => {
    const search = searchTool('finds things');
    const fetch = fetchTool();
    const resolution = await resolved([search, fetch]);
    const attestation = attestToolset(resolution);
    expect(attestation.hash).toBe(resolution.hash);
    expect(attestation.hash).toBe(toolsetHash(resolution.contracts));
    expect(Object.keys(attestation.tools ?? {}).sort()).toEqual(['fetch_page', 'search']);
    expect(attestation.tools?.search).toBe(toolContractHash(toolContract(search)));
    expect(attestation.tools?.fetch_page).toBe(toolContractHash(toolContract(fetch)));
    for (const value of Object.values(attestation.tools ?? {})) {
      expect(value).toMatch(HEX64);
    }
  });

  it('toolContractHash tracks the contract: a description change re-keys, sameness holds', () => {
    const before = toolContractHash(toolContract(searchTool('finds things')));
    const drifted = toolContractHash(toolContract(searchTool('finds things, now sponsored')));
    const same = toolContractHash(toolContract(searchTool('finds things')));
    expect(before).toMatch(HEX64);
    expect(drifted).not.toBe(before);
    expect(same).toBe(before);
  });
});

describe('the attested profile at spawn time (RV1514)', () => {
  it('a matching attestation spawns cleanly', async () => {
    const attestation = attestToolset(await resolved([searchTool('finds things')]));
    const { internals } = pinnedInternals([searchTool('finds things')], attestation);
    const output = await createCtx(internals).agent('go', { agentType: 'pinned' });
    expect(output).toBe('done');
  });

  it('description drift refuses typed at spawn, naming the changed tool with both hashes', async () => {
    const original = searchTool('finds things');
    const attestation = attestToolset(await resolved([original]));
    const driftedTool = searchTool('finds things, now sponsored');
    const { internals, adapter } = pinnedInternals([driftedTool], attestation);
    const spawn = createCtx(internals).agent('go', { agentType: 'pinned' });
    await expect(spawn).rejects.toThrow(ConfigError);
    await expect(spawn).rejects.toThrow(/agent profile 'pinned' attests toolsetHash/u);
    await expect(spawn).rejects.toThrow(/changed: search/u);
    const driftedHash = toolContractHash(toolContract(driftedTool));
    const attestedHash = toolContractHash(toolContract(original));
    await expect(spawn).rejects.toThrow(new RegExp(`attested ${attestedHash}`, 'u'));
    await expect(spawn).rejects.toThrow(new RegExp(`resolved ${driftedHash}`, 'u'));
    // Refused BEFORE any provider call: the drift never reaches a model.
    expect(adapter.calls).toHaveLength(0);
  });

  it('missing and unexpected tools are classified by name', async () => {
    const attestation = attestToolset(await resolved([searchTool('finds things'), fetchTool()]));
    const missing = createCtx(
      pinnedInternals([searchTool('finds things')], attestation).internals,
    ).agent('go', { agentType: 'pinned' });
    await expect(missing).rejects.toThrow(/missing: fetch_page/u);

    const narrow = attestToolset(await resolved([searchTool('finds things')]));
    const unexpected = createCtx(
      pinnedInternals([searchTool('finds things'), fetchTool()], narrow).internals,
    ).agent('go', { agentType: 'pinned' });
    await expect(unexpected).rejects.toThrow(/unexpected: fetch_page/u);
  });

  it('a bare-hash attestation lists the resolved per-tool hashes so the pin can be corrected', async () => {
    const { internals } = pinnedInternals([searchTool('finds things')], {
      hash: 'a'.repeat(64),
    });
    const spawn = createCtx(internals).agent('go', { agentType: 'pinned' });
    await expect(spawn).rejects.toThrow(ConfigError);
    const expected = toolContractHash(toolContract(searchTool('finds things')));
    await expect(spawn).rejects.toThrow(new RegExp(`resolved tools: search ${expected}`, 'u'));
  });

  it('call-level tools override under an attested profile refuses: the pin binds the SPAWN', async () => {
    const attestation = attestToolset(await resolved([searchTool('finds things')]));
    const { internals, adapter } = pinnedInternals([searchTool('finds things')], attestation);
    const spawn = createCtx(internals).agent('go', {
      agentType: 'pinned',
      tools: [fetchTool()],
    });
    await expect(spawn).rejects.toThrow(ConfigError);
    await expect(spawn).rejects.toThrow(/unexpected: fetch_page/u);
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('createEngine validates the attestation shape (RV1514)', () => {
  const base = {
    adapters: [finishAdapter()],
    defaults: { routing: { loop: 'fake:model' as const } },
  };

  it('a malformed aggregate hash is a typed ConfigError naming the profile path', () => {
    expect(() =>
      createEngine({
        ...base,
        defaults: {
          ...base.defaults,
          profiles: { pinned: { toolsetAttestation: { hash: 'not-a-hash' } } },
        },
      }),
    ).toThrow(/defaults\.profiles\['pinned'\]\.toolsetAttestation\.hash/u);
  });

  it('a malformed per-tool hash and a malformed tool name both refuse typed', () => {
    expect(() =>
      createEngine({
        ...base,
        defaults: {
          ...base.defaults,
          profiles: {
            pinned: {
              toolsetAttestation: { hash: 'a'.repeat(64), tools: { search: 'xyz' } },
            },
          },
        },
      }),
    ).toThrow(/toolsetAttestation\.tools\['search'\]/u);
    expect(() =>
      createEngine({
        ...base,
        defaults: {
          ...base.defaults,
          profiles: {
            pinned: {
              toolsetAttestation: {
                hash: 'a'.repeat(64),
                tools: { 'bad name!': 'b'.repeat(64) },
              },
            },
          },
        },
      }),
    ).toThrow(/toolsetAttestation\.tools\['bad name!'\]/u);
  });
});
