/**
 * Ported test subset for the vendored JSON Schema validator (M0-T08
 * acceptance). Exercises the draft 2020-12 subset committed as
 * "SchemaSpec": core keywords
 * plus local $ref; $dynamicRef and remote $ref are outside the subset (the
 * last block documents the boundary).
 */
import { describe, expect, it } from 'vitest';

import type { Schema } from './json-schema/index.js';
import { Validator } from './json-schema/index.js';

function valid(schema: Schema | boolean, instance: unknown): boolean {
  return new Validator(schema, '2020-12', false).validate(instance).valid;
}

describe('vendored JSON Schema validator (draft 2020-12 subset)', () => {
  it('boolean schemas', () => {
    expect(valid(true, 42)).toBe(true);
    expect(valid(false, 42)).toBe(false);
  });

  it('type keyword, including integer and unions', () => {
    expect(valid({ type: 'string' }, 'x')).toBe(true);
    expect(valid({ type: 'string' }, 5)).toBe(false);
    expect(valid({ type: 'integer' }, 5)).toBe(true);
    expect(valid({ type: 'integer' }, 5.5)).toBe(false);
    expect(valid({ type: 'number' }, 5.5)).toBe(true);
    expect(valid({ type: 'null' }, null)).toBe(true);
    expect(valid({ type: 'boolean' }, false)).toBe(true);
    expect(valid({ type: ['string', 'null'] }, null)).toBe(true);
    expect(valid({ type: ['string', 'null'] }, 3)).toBe(false);
    expect(valid({ type: 'array' }, [])).toBe(true);
    expect(valid({ type: 'object' }, {})).toBe(true);
    expect(valid({ type: 'object' }, [])).toBe(false);
  });

  it('const and enum use deep structural comparison', () => {
    expect(valid({ const: { a: [1, 2] } }, { a: [1, 2] })).toBe(true);
    expect(valid({ const: { a: [1, 2] } }, { a: [2, 1] })).toBe(false);
    expect(valid({ enum: ['red', 'green'] }, 'green')).toBe(true);
    expect(valid({ enum: ['red', 'green'] }, 'blue')).toBe(false);
    expect(valid({ enum: [[1], [2]] }, [2])).toBe(true);
  });

  it('object keywords: properties, required, additionalProperties', () => {
    const schema: Schema = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
      required: ['name'],
      additionalProperties: false,
    };
    expect(valid(schema, { name: 'ada', age: 36 })).toBe(true);
    expect(valid(schema, { age: 36 })).toBe(false);
    expect(valid(schema, { name: 'ada', extra: 1 })).toBe(false);
    expect(valid({ additionalProperties: { type: 'number' } }, { a: 1, b: 2 })).toBe(true);
    expect(valid({ additionalProperties: { type: 'number' } }, { a: 'x' })).toBe(false);
  });

  it('object keywords: patternProperties, propertyNames, size bounds', () => {
    expect(valid({ patternProperties: { '^n_': { type: 'number' } } }, { n_a: 1 })).toBe(true);
    expect(valid({ patternProperties: { '^n_': { type: 'number' } } }, { n_a: 'x' })).toBe(false);
    expect(valid({ propertyNames: { maxLength: 3 } }, { abc: 1 })).toBe(true);
    expect(valid({ propertyNames: { maxLength: 3 } }, { abcd: 1 })).toBe(false);
    expect(valid({ minProperties: 1 }, {})).toBe(false);
    expect(valid({ maxProperties: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('dependentRequired and dependentSchemas', () => {
    const dep: Schema = { dependentRequired: { card: ['cvv'] } };
    expect(valid(dep, { card: '4111', cvv: '123' })).toBe(true);
    expect(valid(dep, { card: '4111' })).toBe(false);
    const depSchema: Schema = {
      dependentSchemas: { card: { properties: { cvv: { type: 'string' } }, required: ['cvv'] } },
    };
    expect(valid(depSchema, { card: '4111', cvv: '123' })).toBe(true);
    expect(valid(depSchema, { card: '4111' })).toBe(false);
  });

  it('array keywords: items, prefixItems, contains, uniqueItems, bounds', () => {
    expect(valid({ items: { type: 'integer' } }, [1, 2, 3])).toBe(true);
    expect(valid({ items: { type: 'integer' } }, [1, 'x'])).toBe(false);
    const tuple: Schema = {
      prefixItems: [{ type: 'string' }, { type: 'integer' }],
      items: false,
    };
    expect(valid(tuple, ['a', 1])).toBe(true);
    expect(valid(tuple, ['a', 1, true])).toBe(false);
    expect(valid(tuple, [1, 'a'])).toBe(false);
    expect(valid({ contains: { type: 'integer' } }, ['a', 1])).toBe(true);
    expect(valid({ contains: { type: 'integer' } }, ['a'])).toBe(false);
    expect(valid({ contains: { type: 'integer' }, minContains: 2 }, ['a', 1])).toBe(false);
    expect(valid({ contains: { type: 'integer' }, maxContains: 1 }, [1, 2])).toBe(false);
    expect(valid({ uniqueItems: true }, [{ a: 1 }, { a: 1 }])).toBe(false);
    expect(valid({ uniqueItems: true }, [1, 2])).toBe(true);
    expect(valid({ minItems: 2 }, [1])).toBe(false);
    expect(valid({ maxItems: 1 }, [1, 2])).toBe(false);
  });

  it('numeric keywords', () => {
    expect(valid({ minimum: 3 }, 3)).toBe(true);
    expect(valid({ minimum: 3 }, 2.9)).toBe(false);
    expect(valid({ maximum: 3 }, 3.1)).toBe(false);
    expect(valid({ exclusiveMinimum: 3 }, 3)).toBe(false);
    expect(valid({ exclusiveMaximum: 3 }, 3)).toBe(false);
    expect(valid({ multipleOf: 0.5 }, 1.5)).toBe(true);
    expect(valid({ multipleOf: 2 }, 3)).toBe(false);
  });

  it('string keywords, counting code points not UTF-16 units', () => {
    expect(valid({ minLength: 2 }, 'ab')).toBe(true);
    expect(valid({ minLength: 2 }, 'a')).toBe(false);
    expect(valid({ maxLength: 2 }, 'abc')).toBe(false);
    // One astral symbol is two UTF-16 units but one code point.
    expect(valid({ maxLength: 1 }, '\u{1F600}')).toBe(true);
    expect(valid({ minLength: 2 }, '\u{1F600}')).toBe(false);
    expect(valid({ pattern: '^a+$' }, 'aaa')).toBe(true);
    expect(valid({ pattern: '^a+$' }, 'b')).toBe(false);
  });

  it('applicators: allOf, anyOf, oneOf, not, if/then/else', () => {
    expect(valid({ allOf: [{ minimum: 1 }, { maximum: 3 }] }, 2)).toBe(true);
    expect(valid({ allOf: [{ minimum: 1 }, { maximum: 3 }] }, 4)).toBe(false);
    expect(valid({ anyOf: [{ type: 'string' }, { type: 'number' }] }, 5)).toBe(true);
    expect(valid({ anyOf: [{ type: 'string' }, { type: 'number' }] }, null)).toBe(false);
    expect(valid({ oneOf: [{ multipleOf: 2 }, { multipleOf: 3 }] }, 4)).toBe(true);
    expect(valid({ oneOf: [{ multipleOf: 2 }, { multipleOf: 3 }] }, 6)).toBe(false);
    expect(valid({ not: { type: 'string' } }, 5)).toBe(true);
    expect(valid({ not: { type: 'string' } }, 'x')).toBe(false);
    const conditional: Schema = {
      if: { properties: { kind: { const: 'a' } } },
      then: { required: ['aField'] },
      else: { required: ['bField'] },
    };
    expect(valid(conditional, { kind: 'a', aField: 1 })).toBe(true);
    expect(valid(conditional, { kind: 'a' })).toBe(false);
    expect(valid(conditional, { kind: 'b', bField: 1 })).toBe(true);
  });

  it('unevaluatedProperties interacts with allOf', () => {
    const schema: Schema = {
      allOf: [{ properties: { a: { type: 'number' } } }],
      properties: { b: { type: 'number' } },
      unevaluatedProperties: false,
    };
    expect(valid(schema, { a: 1, b: 2 })).toBe(true);
    expect(valid(schema, { a: 1, c: 3 })).toBe(false);
  });

  it('known formats assert; unknown formats are ignored', () => {
    expect(valid({ format: 'email' }, 'a@example.com')).toBe(true);
    expect(valid({ format: 'email' }, 'not-an-email')).toBe(false);
    expect(valid({ format: 'uuid' }, '123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(valid({ format: 'uuid' }, 'nope')).toBe(false);
    expect(valid({ format: 'date-time' }, '2026-07-06T12:00:00Z')).toBe(true);
    expect(valid({ format: 'date-time' }, '2026-13-40T99:00:00Z')).toBe(false);
    expect(valid({ format: 'ipv4' }, '127.0.0.1')).toBe(true);
    expect(valid({ format: 'ipv4' }, '999.0.0.1')).toBe(false);
    expect(valid({ format: 'totally-unknown-format' }, 'anything')).toBe(true);
  });

  it('local $ref via $defs, nested refs, and root recursion', () => {
    const withDefs: Schema = {
      $defs: { positive: { type: 'integer', minimum: 1 } },
      properties: { count: { $ref: '#/$defs/positive' } },
    };
    expect(valid(withDefs, { count: 2 })).toBe(true);
    expect(valid(withDefs, { count: 0 })).toBe(false);

    const chained: Schema = {
      $defs: {
        a: { $ref: '#/$defs/b' },
        b: { type: 'string' },
      },
      $ref: '#/$defs/a',
    };
    expect(valid(chained, 'x')).toBe(true);
    expect(valid(chained, 1)).toBe(false);

    const tree: Schema = {
      type: 'object',
      properties: {
        value: { type: 'number' },
        children: { type: 'array', items: { $ref: '#' } },
      },
      required: ['value'],
    };
    expect(valid(tree, { value: 1, children: [{ value: 2, children: [] }] })).toBe(true);
    expect(valid(tree, { value: 1, children: [{ children: [] }] })).toBe(false);
  });

  it('local $ref via $anchor', () => {
    const schema: Schema = {
      $defs: { name: { $anchor: 'name', type: 'string' } },
      properties: { first: { $ref: '#name' } },
    };
    expect(valid(schema, { first: 'ada' })).toBe(true);
    expect(valid(schema, { first: 5 })).toBe(false);
  });

  it('collects every error when shortCircuit is off', () => {
    const result = new Validator(
      { type: 'object', properties: { a: { type: 'string' }, b: { type: 'number' } } },
      '2020-12',
      false,
    ).validate({ a: 1, b: 'x' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    const locations = result.errors.map((e) => e.instanceLocation);
    expect(locations).toContain('#/a');
    expect(locations).toContain('#/b');
  });

  it('subset boundary: an unresolvable remote $ref throws at validation', () => {
    // Remote $ref is outside the committed subset;
    // the SchemaSpec layer (M1-T03) rejects it earlier with ConfigError.
    const remote: Schema = { $ref: 'https://example.com/does-not-exist.json' };
    expect(() => new Validator(remote, '2020-12', false).validate({})).toThrow();
  });
});
