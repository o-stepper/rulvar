import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { EMPTY_TOOLSET_HASH } from '../l0/schema.js';
import type { ToolDef, ToolSource } from '../l0/spi/toolsource.js';
import { tool } from './tool.js';
import {
  attestToolset,
  EMPTY_AUTHORITY_HASH,
  emptyToolset,
  enforceToolsetAttestation,
  resolveToolset,
  validateToolsetAttestation,
} from './toolset-hash.js';

const SESSION = { runId: 'run-1' };

function greet(
  execute: ToolDef['execute'],
  overrides?: { version?: string; description?: string },
) {
  return tool({
    name: 'greet',
    description: overrides?.description ?? 'greets the user',
    parameters: { type: 'object', properties: { name: { type: 'string' } } },
    ...(overrides?.version === undefined ? {} : { version: overrides.version }),
    execute,
  });
}

describe('toolset resolution and hashing (M3-T01)', () => {
  it('an empty or absent tools option is the EMPTY_TOOLSET_HASH', async () => {
    expect((await resolveToolset(undefined, SESSION)).hash).toBe(EMPTY_TOOLSET_HASH);
    expect((await resolveToolset([], SESSION)).hash).toBe(EMPTY_TOOLSET_HASH);
    expect(emptyToolset().hash).toBe(EMPTY_TOOLSET_HASH);
  });

  it('editing an execute body does not change toolsetHash; bumping version does', async () => {
    const a = await resolveToolset([greet(() => Promise.resolve('v1 body'))], SESSION);
    const b = await resolveToolset(
      [greet(() => Promise.resolve('a completely different implementation body'))],
      SESSION,
    );
    const c = await resolveToolset(
      [greet(() => Promise.resolve('v1 body'), { version: '2' })],
      SESSION,
    );
    expect(a.hash).toBe(b.hash);
    expect(c.hash).not.toBe(a.hash);
  });

  it('changing name, description, or parameters changes toolsetHash', async () => {
    const base = await resolveToolset([greet(() => Promise.resolve(null))], SESSION);
    const description = await resolveToolset(
      [greet(() => Promise.resolve(null), { description: 'greets the user loudly' })],
      SESSION,
    );
    const parameters = await resolveToolset(
      [
        tool({
          name: 'greet',
          description: 'greets the user',
          parameters: { type: 'object', properties: { name: { type: 'number' } } },
          execute: () => Promise.resolve(null),
        }),
      ],
      SESSION,
    );
    expect(description.hash).not.toBe(base.hash);
    expect(parameters.hash).not.toBe(base.hash);
  });

  it('hash is order-insensitive: contracts sort by name', async () => {
    const alpha = tool({
      name: 'alpha',
      description: 'a',
      parameters: {},
      execute: () => Promise.resolve(null),
    });
    const beta = tool({
      name: 'beta',
      description: 'b',
      parameters: {},
      execute: () => Promise.resolve(null),
    });
    const ab = await resolveToolset([alpha, beta], SESSION);
    const ba = await resolveToolset([beta, alpha], SESSION);
    expect(ab.hash).toBe(ba.hash);
  });

  it('schema annotations inside parameters do not move the hash', async () => {
    const annotated = tool({
      name: 'greet',
      description: 'greets the user',
      parameters: {
        type: 'object',
        title: 'Greeting arguments',
        properties: { name: { type: 'string', description: 'who to greet' } },
      },
      execute: () => Promise.resolve(null),
    });
    const plain = greet(() => Promise.resolve(null));
    const a = await resolveToolset([annotated], SESSION);
    const b = await resolveToolset([plain], SESSION);
    expect(a.hash).toBe(b.hash);
  });

  it('expands ToolSources and passes the session through', async () => {
    let seenRunId: string | undefined;
    const source: ToolSource = {
      id: 'src',
      tools: (session) => {
        seenRunId = session.runId;
        return Promise.resolve([
          tool({
            name: 'from-source',
            description: 's',
            parameters: {},
            execute: () => Promise.resolve(1),
          }),
        ]);
      },
    };
    const resolvedSet = await resolveToolset([greet(() => Promise.resolve(null)), source], SESSION);
    expect(seenRunId).toBe('run-1');
    expect(resolvedSet.tools.map((t) => t.name).sort()).toEqual(['from-source', 'greet']);
  });

  it('a duplicate tool name across the toolset is a ConfigError at spawn time', async () => {
    const source: ToolSource = {
      id: 'src',
      tools: () =>
        Promise.resolve([
          tool({
            name: 'greet',
            description: 'clash',
            parameters: {},
            execute: () => Promise.resolve(1),
          }),
        ]),
    };
    await expect(
      resolveToolset([greet(() => Promise.resolve(null)), source], SESSION),
    ).rejects.toThrow(ConfigError);
  });

  it('a toolset name with no registry to resolve against is a typed ConfigError', async () => {
    // Names themselves are legal ToolsOption entries since v1.18 (they
    // resolve through defaults.toolsets); without a registry in scope
    // every name is unknown, which is the same preflight rejection an
    // unregistered name gets (v1.18.0 review P2-1: the old test name
    // claimed a general string ban that no longer exists).
    await expect(resolveToolset(['by-name'], SESSION)).rejects.toThrow(ConfigError);
  });

  it('a declared non-inprocess executor fails registration early', async () => {
    const subprocess = tool({
      name: 'contained',
      description: 'x',
      parameters: {},
      executor: 'subprocess',
      execute: () => Promise.resolve(null),
    });
    await expect(resolveToolset([subprocess], SESSION)).rejects.toThrow(ConfigError);
  });

  it('an imported tool with an illegal name is a ConfigError naming the prefix escape hatch', async () => {
    const source: ToolSource = {
      id: 'src',
      tools: () =>
        Promise.resolve([
          {
            kind: 'tool' as const,
            name: 'bad name',
            description: 'x',
            parameters: {},
            executor: 'inprocess' as const,
            needsApproval: false,
            execute: () => Promise.resolve(null as unknown),
          },
        ]),
    };
    await expect(resolveToolset([source], SESSION)).rejects.toThrow(/prefix/);
  });
});

describe('registered toolset names (v1.17.0 review P1-3)', () => {
  it('a string resolves through the registry to the same snapshot as direct defs', async () => {
    const def = greet(() => Promise.resolve('hi'));
    const named = await resolveToolset(['greeting-set'], SESSION, { 'greeting-set': [def] });
    const direct = await resolveToolset([def], SESSION);
    expect(named.hash).toBe(direct.hash);
    expect(named.tools).toEqual([def]);
    expect(named.contracts).toEqual(direct.contracts);
  });

  it('an unknown name is a typed ConfigError naming the registration slot', async () => {
    await expect(resolveToolset(['missing-set'], SESSION, {})).rejects.toThrow(
      /unknown registered toolset 'missing-set'.*defaults\.toolsets/su,
    );
    // No registry at all fails the same way: nothing outside the
    // declared registry is reachable by name.
    await expect(resolveToolset(['missing-set'], SESSION)).rejects.toThrow(ConfigError);
  });

  it('registry values never nest other names, so no cycle can exist', async () => {
    await expect(
      resolveToolset(['outer'], SESSION, { outer: ['inner'], inner: [] }),
    ).rejects.toThrow(/contains the name 'inner'/u);
  });

  it('collisions between a named set and direct defs fail after the union', async () => {
    const def = greet(() => Promise.resolve('hi'));
    await expect(
      resolveToolset(['greeting-set', def], SESSION, { 'greeting-set': [def] }),
    ).rejects.toThrow(/duplicate tool name 'greet'/u);
  });

  it('a named set expands ToolSource entries through the same session', async () => {
    let seenRunId: string | undefined;
    const source: ToolSource = {
      id: 'src',
      tools: (session) => {
        seenRunId = session.runId;
        return Promise.resolve([greet(() => Promise.resolve('hi'))]);
      },
    };
    const resolved = await resolveToolset(['sourced'], SESSION, { sourced: [source] });
    expect(resolved.tools.map((def) => def.name)).toEqual(['greet']);
    expect(seenRunId).toBe('run-1');
  });
});

describe('the authority attestation (RV1802)', () => {
  const guarded = (overrides?: {
    risk?: 'read' | 'write';
    needsApproval?: boolean;
    executor?: 'inprocess' | 'subprocess';
    executorSpec?: { command: string };
    version?: string;
    execute?: ToolDef['execute'];
  }) =>
    tool({
      name: 'guarded',
      description: 'a guarded effect',
      parameters: { type: 'object', properties: { key: { type: 'string' } } },
      risk: overrides?.risk ?? 'read',
      needsApproval: overrides?.needsApproval ?? true,
      ...(overrides?.executor === undefined ? {} : { executor: overrides.executor }),
      ...(overrides?.executorSpec === undefined ? {} : { executorSpec: overrides.executorSpec }),
      ...(overrides?.version === undefined ? {} : { version: overrides.version }),
      execute: overrides?.execute ?? (() => Promise.resolve('done')),
    });
  const EXECUTORS = new Set(['subprocess']);

  it('an empty toolset has the EMPTY_AUTHORITY_HASH', async () => {
    expect((await resolveToolset([], SESSION)).authorityHash).toBe(EMPTY_AUTHORITY_HASH);
    expect(emptyToolset().authorityHash).toBe(EMPTY_AUTHORITY_HASH);
  });

  it('a risk flip moves the authorityHash while the contract hash stays put', async () => {
    const read = await resolveToolset([guarded({ risk: 'read' })], SESSION);
    const write = await resolveToolset([guarded({ risk: 'write' })], SESSION);
    expect(write.hash).toBe(read.hash);
    expect(write.authorityHash).not.toBe(read.authorityHash);
    expect(() => enforceToolsetAttestation('worker', attestToolset(read), write)).toThrow(
      /risk \(attested read, resolved write\)/u,
    );
  });

  it('a needsApproval flip refuses with the field named, pre-wire', async () => {
    const gated = await resolveToolset([guarded({ needsApproval: true })], SESSION);
    const ungated = await resolveToolset([guarded({ needsApproval: false })], SESSION);
    expect(ungated.hash).toBe(gated.hash);
    expect(ungated.authorityHash).not.toBe(gated.authorityHash);
    expect(() => enforceToolsetAttestation('worker', attestToolset(gated), ungated)).toThrow(
      /needsApproval \(attested true, resolved false\)/u,
    );
  });

  it('an executor change refuses with the tag named', async () => {
    const inprocess = await resolveToolset([guarded()], SESSION);
    const subprocess = await resolveToolset(
      [guarded({ executor: 'subprocess', executorSpec: { command: 'run.sh' } })],
      SESSION,
      undefined,
      EXECUTORS,
    );
    expect(subprocess.hash).toBe(inprocess.hash);
    expect(() => enforceToolsetAttestation('worker', attestToolset(inprocess), subprocess)).toThrow(
      /executor \(attested inprocess, resolved subprocess\)/u,
    );
  });

  it('an executorSpec change refuses naming the field', async () => {
    const specA = await resolveToolset(
      [guarded({ executor: 'subprocess', executorSpec: { command: 'a.sh' } })],
      SESSION,
      undefined,
      EXECUTORS,
    );
    const specB = await resolveToolset(
      [guarded({ executor: 'subprocess', executorSpec: { command: 'b.sh' } })],
      SESSION,
      undefined,
      EXECUTORS,
    );
    expect(specB.hash).toBe(specA.hash);
    expect(specB.authorityHash).not.toBe(specA.authorityHash);
    expect(() => enforceToolsetAttestation('worker', attestToolset(specA), specB)).toThrow(
      /executorSpec/u,
    );
  });

  it('an execute body edit moves NEITHER hash: version stays the lever', async () => {
    const a = await resolveToolset([guarded({ execute: () => Promise.resolve('v1') })], SESSION);
    const b = await resolveToolset(
      [guarded({ execute: () => Promise.resolve('a wholly different body') })],
      SESSION,
    );
    expect(b.hash).toBe(a.hash);
    expect(b.authorityHash).toBe(a.authorityHash);
    const bumped = await resolveToolset(
      [guarded({ version: '2', execute: () => Promise.resolve('v1') })],
      SESSION,
    );
    expect(bumped.authorityHash).not.toBe(a.authorityHash);
  });

  it('a legacy contract-only pin passes authority drift: the documented posture', async () => {
    const read = await resolveToolset([guarded({ risk: 'read' })], SESSION);
    const write = await resolveToolset([guarded({ risk: 'write' })], SESSION);
    const full = attestToolset(read);
    const legacy = { hash: full.hash, tools: full.tools };
    expect(() => enforceToolsetAttestation('worker', legacy, write)).not.toThrow();
  });

  it('attest and enforce round-trip on the same resolution', async () => {
    const resolved = await resolveToolset(
      [guarded({ executor: 'subprocess', executorSpec: { command: 'run.sh' } })],
      SESSION,
      undefined,
      EXECUTORS,
    );
    const pin = attestToolset(resolved);
    expect(pin.authorityHash).toBe(resolved.authorityHash);
    expect(() => enforceToolsetAttestation('worker', pin, resolved)).not.toThrow();
  });

  it('a bare authorityHash pin still refuses and lists the resolved authority', async () => {
    const read = await resolveToolset([guarded({ risk: 'read' })], SESSION);
    const write = await resolveToolset([guarded({ risk: 'write' })], SESSION);
    const bare = { hash: read.hash, authorityHash: read.authorityHash };
    expect(() => enforceToolsetAttestation('worker', bare, write)).toThrow(
      /resolved authority: guarded \{ risk write, needsApproval true, executor inprocess \}/u,
    );
  });

  it('validateToolsetAttestation checks the authority shapes', () => {
    expect(() =>
      validateToolsetAttestation({ hash: 'f'.repeat(64), authorityHash: 'nope' }, 'p'),
    ).toThrow(/p\.authorityHash must be 64 lowercase hex chars/u);
    expect(() =>
      validateToolsetAttestation(
        {
          hash: 'f'.repeat(64),
          authority: {
            guarded: {
              contract: 'f'.repeat(64),
              needsApproval: 'yes' as unknown as boolean,
              executor: 'inprocess',
            },
          },
        },
        'p',
      ),
    ).toThrow(/p\.authority\['guarded'\]\.needsApproval must be a boolean/u);
  });
});
