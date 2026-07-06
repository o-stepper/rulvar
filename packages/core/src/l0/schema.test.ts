import { type } from 'arktype';
import * as fc from 'fast-check';
import * as v from 'valibot';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { ConfigError } from './errors.js';
import type { JsonSchema } from './messages.js';
import type { Out, SchemaPair, SchemaSpec } from './schema.js';
import {
  canonicalizeSchema,
  EMPTY_SCHEMA_HASH,
  EMPTY_TOOLSET_HASH,
  isSchemaPairSpec,
  isStandardSchemaSpec,
  projectToJsonSchema,
  schemaHash,
  schemaHashOfSpec,
  toolsetHash,
  validateSchemaSpec,
} from './schema.js';

describe('SchemaSpec three forms (M1-T03)', () => {
  it('projects a Zod schema to JSON Schema via the standard projection', () => {
    const spec = z.object({ verdict: z.enum(['pass', 'fail']), score: z.number() });
    expect(isStandardSchemaSpec(spec)).toBe(true);
    const projected = projectToJsonSchema(spec);
    expect(projected.type).toBe('object');
    expect((projected.properties as JsonSchema).verdict).toBeDefined();
  });

  it('projects an ArkType schema', () => {
    const spec = type({ name: 'string', age: 'number' });
    expect(isStandardSchemaSpec(spec)).toBe(true);
    const projected = projectToJsonSchema(spec);
    expect(projected.type).toBe('object');
  });

  it('valibot 1.x validates as form 1 but rejects projection with ConfigError', async () => {
    // Valibot implements StandardSchemaV1 but (as of 1.4) not the
    // StandardJSONSchemaV1 converter; per docs/08 section 2.3 the missing
    // projection is a typed ConfigError at definition time (docs/10,
    // M1-T03 acceptance as amended in this change).
    const spec = v.object({ tag: v.string() });
    expect(isStandardSchemaSpec(spec)).toBe(true);
    expect(() => projectToJsonSchema(spec)).toThrow(ConfigError);
    expect(await validateSchemaSpec(spec, { tag: 'a' })).toEqual({
      valid: true,
      value: { tag: 'a' },
    });
  });

  it('a transforming schema projects its INPUT type', () => {
    const spec = z.string().transform((s) => s.length);
    const projected = projectToJsonSchema(spec);
    // The input is a string even though the output is a number.
    expect(projected.type).toBe('string');
  });

  it('takes a schema pair verbatim', () => {
    const pair: SchemaPair<{ n: number }> = {
      jsonSchema: { type: 'object', properties: { n: { type: 'number' } }, required: ['n'] },
      validate: (value): value is { n: number } =>
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { n: unknown }).n === 'number',
    };
    expect(isSchemaPairSpec(pair)).toBe(true);
    expect(projectToJsonSchema(pair)).toBe(pair.jsonSchema);
  });

  it('takes a bare JSON Schema verbatim', () => {
    const bare: JsonSchema = { type: 'string', minLength: 1 };
    expect(isStandardSchemaSpec(bare)).toBe(false);
    expect(isSchemaPairSpec(bare)).toBe(false);
    expect(projectToJsonSchema(bare)).toBe(bare);
  });

  it('Out<S> infers per form', () => {
    const zodSpec = z.object({ ok: z.boolean() });
    expectTypeOf<Out<typeof zodSpec>>().toEqualTypeOf<{ ok: boolean }>();
    expect(isStandardSchemaSpec(zodSpec)).toBe(true);

    const transforming = z.string().transform((s) => s.length);
    expectTypeOf<Out<typeof transforming>>().toEqualTypeOf<number>();
    expect(isStandardSchemaSpec(transforming)).toBe(true);

    const pair: SchemaPair<{ n: number }> = {
      jsonSchema: {},
      validate: (value): value is { n: number } => typeof value === 'object' && value !== null,
    };
    expectTypeOf<Out<typeof pair>>().toEqualTypeOf<{ n: number }>();
    expect(isSchemaPairSpec(pair)).toBe(true);

    const bare: JsonSchema = { type: 'string' };
    expectTypeOf<Out<typeof bare>>().toEqualTypeOf<unknown>();
    expect(isStandardSchemaSpec(bare)).toBe(false);

    expectTypeOf<SchemaSpec<{ ok: boolean }>>().toMatchTypeOf<SchemaSpec>();
  });
});

describe('canonicalizeSchema (M1-T03; docs/03 section 3)', () => {
  it('strips annotation keywords but retains format', () => {
    const canonical = canonicalizeSchema({
      type: 'string',
      title: 'Name',
      description: 'The name',
      default: 'x',
      deprecated: false,
      readOnly: true,
      writeOnly: false,
      examples: ['a'],
      $comment: 'internal',
      format: 'email',
    });
    expect(canonical).toEqual({ type: 'string', format: 'email' });
  });

  it('strips annotations from nested subschemas but not from data values', () => {
    const canonical = canonicalizeSchema({
      type: 'object',
      properties: {
        title: { type: 'string', title: 'strip me' },
        mode: { enum: [{ title: 'keep me' }] },
      },
    });
    expect(canonical).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string' },
        mode: { enum: [{ title: 'keep me' }] },
      },
    });
  });

  it('inlines local $defs references and drops the reference infrastructure', () => {
    const canonical = canonicalizeSchema({
      type: 'object',
      properties: { item: { $ref: '#/$defs/item' } },
      $defs: { item: { type: 'string', description: 'strip' } },
    });
    expect(canonical).toEqual({
      type: 'object',
      properties: { item: { type: 'string' } },
    });
  });

  it('resolves $anchor references and strips the anchor after inlining', () => {
    const canonical = canonicalizeSchema({
      type: 'object',
      properties: { a: { $ref: '#node' } },
      $defs: { target: { $anchor: 'node', type: 'number' } },
    });
    expect(canonical).toEqual({
      type: 'object',
      properties: { a: { type: 'number' } },
    });
  });

  it('composes $ref siblings through allOf', () => {
    const canonical = canonicalizeSchema({
      properties: { a: { $ref: '#/$defs/base', minLength: 2 } },
      $defs: { base: { type: 'string' } },
    });
    expect(canonical).toEqual({
      properties: { a: { minLength: 2, allOf: [{ type: 'string' }] } },
    });
  });

  it('rejects remote $ref with ConfigError', () => {
    expect(() => canonicalizeSchema({ $ref: 'https://example.com/schema.json' })).toThrow(
      ConfigError,
    );
  });

  it('rejects dynamic references with ConfigError', () => {
    expect(() => canonicalizeSchema({ $dynamicRef: '#x' })).toThrow(ConfigError);
    expect(() => canonicalizeSchema({ items: { $dynamicAnchor: 'x', type: 'string' } })).toThrow(
      ConfigError,
    );
  });

  it('rejects recursive local $ref with ConfigError', () => {
    expect(() =>
      canonicalizeSchema({
        type: 'object',
        properties: { child: { $ref: '#/$defs/node' } },
        $defs: { node: { properties: { next: { $ref: '#/$defs/node' } } } },
      }),
    ).toThrow(ConfigError);
    expect(() => canonicalizeSchema({ properties: { self: { $ref: '#' } } })).toThrow(ConfigError);
  });

  it('preserves boolean subschemas', () => {
    const canonical = canonicalizeSchema({
      type: 'object',
      additionalProperties: false,
      properties: { free: true },
    });
    expect(canonical).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: { free: true },
    });
  });
});

describe('schemaHash and toolsetHash (M1-T03; docs/03 section 3)', () => {
  it('uses the canonical true schema hash when no schema is declared', () => {
    expect(EMPTY_SCHEMA_HASH).toBe(
      'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b',
    );
    expect(schemaHash(undefined)).toBe(EMPTY_SCHEMA_HASH);
    expect(schemaHash(true)).toBe(EMPTY_SCHEMA_HASH);
    expect(schemaHashOfSpec(undefined)).toBe(EMPTY_SCHEMA_HASH);
  });

  it('is insensitive to object member order', () => {
    const a = schemaHash({
      type: 'object',
      properties: { x: { type: 'number' } },
      required: ['x'],
    });
    const b = schemaHash({
      required: ['x'],
      properties: { x: { type: 'number' } },
      type: 'object',
    });
    expect(a).toBe(b);
  });

  it('is insensitive to annotations', () => {
    const a = schemaHash({ type: 'string' });
    const b = schemaHash({ type: 'string', description: 'irrelevant', title: 'x' });
    expect(a).toBe(b);
  });

  it('property: canonicalization is idempotent and order-insensitive', () => {
    const jsonLeaf = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    ) as fc.Arbitrary<unknown>;
    const safeKey = fc
      .string({ minLength: 1, maxLength: 8 })
      .filter((k) => !k.startsWith('$') && k !== '__proto__');
    const schemaArb = fc.letrec<{ node: unknown }>((tie) => ({
      node: fc.oneof(
        { maxDepth: 3, withCrossShrink: true },
        jsonLeaf,
        fc.array(tie('node'), { maxLength: 4 }),
        fc.dictionary(safeKey, tie('node'), { maxKeys: 5 }),
      ),
    })).node;

    fc.assert(
      fc.property(fc.dictionary(safeKey, schemaArb, { maxKeys: 6 }), (schema) => {
        const once = canonicalizeSchema(schema);
        const twice = canonicalizeSchema(once);
        expect(twice).toEqual(once);

        const reversed = Object.fromEntries(Object.entries(schema).reverse());
        expect(schemaHash(reversed)).toBe(schemaHash(schema as JsonSchema));
      }),
      { numRuns: 200 },
    );
  });

  it('toolsetHash sorts contracts by name and honors the contract tuple', () => {
    const read = {
      name: 'read',
      description: 'Read a file',
      parameters: { type: 'object', properties: { path: { type: 'string', title: 'x' } } },
    };
    const write = {
      name: 'write',
      description: 'Write a file',
      parameters: { type: 'object' },
      version: '2',
    };
    expect(toolsetHash([read, write])).toBe(toolsetHash([write, read]));
    expect(toolsetHash([])).toBe(EMPTY_TOOLSET_HASH);

    // description participates; parameter annotations do not.
    expect(toolsetHash([{ ...read, description: 'other' }])).not.toBe(toolsetHash([read]));
    const noTitle = {
      ...read,
      parameters: { type: 'object', properties: { path: { type: 'string' } } },
    };
    expect(toolsetHash([noTitle])).toBe(toolsetHash([read]));

    // version participates; absent version participates as absent.
    expect(toolsetHash([{ ...write, version: '3' }])).not.toBe(toolsetHash([write]));
  });
});

describe('validateSchemaSpec (M1-T03; docs/08 section 2.4)', () => {
  it('validates through a standard schema with issues on failure', async () => {
    const spec = z.object({ n: z.number() });
    const pass = await validateSchemaSpec(spec, { n: 4 });
    expect(pass).toEqual({ valid: true, value: { n: 4 } });

    const fail = await validateSchemaSpec(spec, { n: 'x' });
    expect(fail.valid).toBe(false);
    if (!fail.valid) {
      expect(fail.issues.length).toBeGreaterThan(0);
      expect(fail.issues[0]?.message).toBeTruthy();
    }
  });

  it('validates through a pair type guard', async () => {
    const pair: SchemaPair<number> = {
      jsonSchema: { type: 'number' },
      validate: (value): value is number => typeof value === 'number',
    };
    expect(await validateSchemaSpec(pair, 4)).toEqual({ valid: true, value: 4 });
    const fail = await validateSchemaSpec(pair, 'x');
    expect(fail.valid).toBe(false);
  });

  it('validates a bare JSON Schema through the vendored validator with paths', async () => {
    const bare: JsonSchema = {
      type: 'object',
      properties: { user: { type: 'object', properties: { name: { type: 'string' } } } },
    };
    const pass = await validateSchemaSpec(bare, { user: { name: 'a' } });
    expect(pass.valid).toBe(true);

    const fail = await validateSchemaSpec(bare, { user: { name: 42 } });
    expect(fail.valid).toBe(false);
    if (!fail.valid) {
      const paths = fail.issues.map((issue) => issue.path).filter(Boolean);
      expect(paths.some((p) => JSON.stringify(p) === JSON.stringify(['user', 'name']))).toBe(true);
    }
  });
});
