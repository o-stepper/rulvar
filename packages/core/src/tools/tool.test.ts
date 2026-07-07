import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { ConfigError } from '../l0/errors.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import { tool, toolContract } from './tool.js';

const noopExecute = (): Promise<unknown> => Promise.resolve(null);

describe('tool() definition (M3-T01)', () => {
  it('applies the documented defaults: inprocess executor, no approval', () => {
    const def = tool({
      name: 'echo',
      description: 'echoes',
      parameters: { type: 'object' },
      execute: noopExecute,
    });
    expect(def.kind).toBe('tool');
    expect(def.executor).toBe('inprocess');
    expect(def.needsApproval).toBe(false);
    expect(def.version).toBeUndefined();
    expect(def.risk).toBeUndefined();
  });

  it('rejects an illegal tool name at definition time', () => {
    expect(() =>
      tool({
        name: 'bad name!',
        description: 'x',
        parameters: {},
        execute: noopExecute,
      }),
    ).toThrow(ConfigError);
    expect(() =>
      tool({
        name: 'a'.repeat(65),
        description: 'x',
        parameters: {},
        execute: noopExecute,
      }),
    ).toThrow(ConfigError);
  });

  it('rejects a recursive local $ref at definition time, not at first call', () => {
    expect(() =>
      tool({
        name: 'recursive',
        description: 'x',
        parameters: {
          $defs: { node: { properties: { next: { $ref: '#/$defs/node' } } } },
          $ref: '#/$defs/node',
        },
        execute: noopExecute,
      }),
    ).toThrow(ConfigError);
  });

  it('rejects a remote $ref at definition time', () => {
    expect(() =>
      tool({
        name: 'remote',
        description: 'x',
        parameters: { $ref: 'https://example.com/schema.json' },
        execute: noopExecute,
      }),
    ).toThrow(ConfigError);
  });

  it('projects the contract tuple with canonicalized parameters and no execute', () => {
    const def = tool({
      name: 'lookup',
      description: 'looks things up',
      parameters: {
        type: 'object',
        title: 'stripped annotation',
        properties: { q: { type: 'string', description: 'stripped too' } },
      },
      version: '2',
      risk: 'read',
      execute: noopExecute,
    });
    const contract = toolContract(def);
    expect(contract).toEqual({
      name: 'lookup',
      description: 'looks things up',
      parameters: { type: 'object', properties: { q: { type: 'string' } } },
      version: '2',
    });
    expect('execute' in contract).toBe(false);
    expect('risk' in contract).toBe(false);
  });

  it('infers Out<S> per SchemaSpec form: standard schema, pair, bare JSON Schema', () => {
    const standard = tool({
      name: 'standard',
      description: 'form 1',
      parameters: z.strictObject({ count: z.number() }),
      execute: (input, ctx) => {
        expectTypeOf(input).toEqualTypeOf<{ count: number }>();
        expectTypeOf(ctx).toEqualTypeOf<ToolContext>();
        return Promise.resolve(input.count);
      },
    });
    expect(standard.name).toBe('standard');

    const pair = tool({
      name: 'pair',
      description: 'form 2',
      parameters: {
        jsonSchema: { type: 'string' },
        validate: (v: unknown): v is string => typeof v === 'string',
      },
      execute: (input) => {
        expectTypeOf(input).toEqualTypeOf<string>();
        return Promise.resolve(input.length);
      },
    });
    expect(pair.name).toBe('pair');

    const bare = tool({
      name: 'bare',
      description: 'form 3',
      parameters: { type: 'object' },
      execute: (input) => {
        expectTypeOf(input).toEqualTypeOf<unknown>();
        return Promise.resolve(null);
      },
    });
    expect(bare.name).toBe('bare');
  });
});
