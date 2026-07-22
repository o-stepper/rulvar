import { RuleTester } from 'eslint';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import plugin, { rules, toJsonDiagnostics, workflowsConfig } from './index.js';

// Wire the ESLint RuleTester onto vitest's runner.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

tester.run('no-bare-date', rules['no-bare-date'], {
  valid: [
    'const t = ctx.now();',
    'const d = new Date(ctx.now());'.replace('new Date', 'newDate'), // helper named similarly
    // A shadowed Date is not the global.
    'function f(Date) { return Date.now(); }',
    'class Date2 {} const d = new Date2();',
  ],
  invalid: [
    { code: 'const t = Date.now();', errors: [{ messageId: 'bareDateNow' }] },
    { code: 'const d = new Date();', errors: [{ messageId: 'bareNewDate' }] },
    { code: 'const d = new Date(1700000000000);', errors: [{ messageId: 'bareNewDate' }] },
  ],
});

tester.run('no-bare-random', rules['no-bare-random'], {
  valid: [
    'const r = ctx.random();',
    "const r = ctx.random('branch');",
    'function f(Math) { return Math.random(); }',
  ],
  invalid: [{ code: 'const r = Math.random();', errors: [{ messageId: 'bareMathRandom' }] }],
});

tester.run('no-fetch', rules['no-fetch'], {
  valid: [
    "const data = await ctx.step('read api', () => client.get(url));",
    'function f(fetch) { return fetch(url); }',
    'const fetch = stub; fetch(url);',
  ],
  invalid: [
    { code: 'await fetch(url);', errors: [{ messageId: 'bareFetch' }] },
    { code: 'await globalThis.fetch(url);', errors: [{ messageId: 'bareFetch' }] },
  ],
});

tester.run('no-process-env', rules['no-process-env'], {
  valid: [
    'const key = args.apiKey;',
    'function f(process) { return process.env.KEY; }',
    'const env = settings.env;',
  ],
  invalid: [
    { code: 'const key = process.env.API_KEY;', errors: [{ messageId: 'processEnv' }] },
    { code: 'const env = process.env;', errors: [{ messageId: 'processEnv' }] },
  ],
});

tester.run('no-code-generation', rules['no-code-generation'], {
  valid: [
    'const t = ctx.now();',
    // A method named eval on some other object is not the global eval.
    'const r = parser.eval(expr);',
    // A property named Function/eval on a data value is ordinary access.
    'const shaped = payload.Function;',
    'const viaBracket = payload["eval"];',
    // Defining a property NAMED constructor in an object literal reaches
    // nothing; only READING a value's constructor does.
    'const o = { constructor: () => 1, eval: 2, Function: 3 };',
    // Shadowed Function is local, not the global constructor.
    'function f(Function) { return new Function("return 1"); }',
    // Plain data access with no constructor reach.
    'const names = items.map((i) => i.name);',
  ],
  invalid: [
    { code: 'const v = eval("1 + 1");', errors: [{ messageId: 'noEval' }] },
    { code: 'const e = globalThis.eval("1 + 1");', errors: [{ messageId: 'noEval' }] },
    { code: 'const f = Function("return 1");', errors: [{ messageId: 'noFunctionConstructor' }] },
    {
      code: 'const f = new Function("return 1");',
      errors: [{ messageId: 'noFunctionConstructor' }],
    },
    {
      code: 'const g = globalThis.Function("return 1");',
      errors: [{ messageId: 'noFunctionConstructor' }],
    },
    {
      code: 'const F = (function () {}).constructor;',
      errors: [{ messageId: 'noConstructorAccess' }],
    },
    { code: 'const c = obj["constructor"];', errors: [{ messageId: 'noConstructorAccess' }] },
    // Forms the regex gate missed, now caught by the shared AST policy.
    { code: 'const c = obj["con" + "structor"];', errors: [{ messageId: 'noConstructorAccess' }] },
    { code: 'const c = obj[`con${""}structor`];', errors: [{ messageId: 'noConstructorAccess' }] },
    {
      code: 'const { constructor: C } = fn;',
      errors: [{ messageId: 'noConstructorAccess' }],
    },
    {
      code: 'const c = Reflect.get(fn, "constructor");',
      errors: [{ messageId: 'noConstructorAccess' }],
    },
  ],
});

tester.run('no-promise-all-over-ctx', rules['no-promise-all-over-ctx'], {
  valid: [
    // ctx.parallel is the sanctioned combinator.
    "await ctx.parallel([() => ctx.agent('a'), () => ctx.agent('b')]);",
    // Promise.all over non-ctx work is allowed.
    'await Promise.all([readFile(a), readFile(b)]);',
    'function f(Promise) { return Promise.all([ctx.agent(p)]); }',
  ],
  invalid: [
    {
      code: "await Promise.all([ctx.agent('a'), ctx.agent('b')]);",
      errors: [{ messageId: 'promiseCombinator' }],
    },
    {
      code: "await Promise.all(items.map((i) => ctx.agent('judge ' + i)));",
      errors: [{ messageId: 'promiseCombinator' }],
    },
    {
      code: "await Promise.allSettled([ctx.workflow('w', {})]);",
      errors: [{ messageId: 'promiseCombinator' }],
    },
    {
      code: "await Promise.race([agent('bare sandbox call')]);",
      errors: [{ messageId: 'promiseCombinator' }],
    },
  ],
});

tester.run('duplicate-identical-call', rules['duplicate-identical-call'], {
  valid: [
    // Different arguments never collide.
    "async function f(ctx) { await ctx.agent('a'); await ctx.agent('b'); }",
    // A distinguishing key is exactly the sanctioned repeat.
    "async function f(ctx) { await ctx.agent('a', { key: 'first' }); await ctx.agent('a', { key: 'second' }); }",
    // Identical calls in DIFFERENT functions are separate scopes.
    "async function f(ctx) { await ctx.agent('a'); } async function g(ctx) { await ctx.agent('a'); }",
  ],
  invalid: [
    {
      code: "async function f(ctx) { await ctx.agent('a'); await ctx.agent('a'); }",
      errors: [{ messageId: 'duplicateCall' }],
    },
    {
      code: "async function f() { await agent('bare'); await agent('bare'); }",
      errors: [{ messageId: 'duplicateCall' }],
    },
    {
      code: "async function f(ctx) { await ctx.workflow('w', { a: 1 }); await ctx.workflow('w', { a: 1 }); }",
      errors: [{ messageId: 'duplicateCall' }],
    },
  ],
});

describe('plugin surface', () => {
  it('exposes every docs/06 8.4 rule and the workflows preset', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'duplicate-identical-call',
      'no-bare-date',
      'no-bare-random',
      'no-code-generation',
      'no-fetch',
      'no-process-env',
      'no-promise-all-over-ctx',
    ]);
    expect(plugin.configs).toMatchObject({ workflows: { name: 'rulvar/workflows' } });
    expect(workflowsConfig.rules?.['rulvar/duplicate-identical-call']).toBe('warn');
  });

  it('emits machine-readable JSON diagnostics through a flat-config Linter', () => {
    const linter = new Linter();
    const source = [
      'export async function wf(ctx) {',
      '  const t = Date.now();',
      "  await Promise.all([ctx.agent('a'), ctx.agent('b')]);",
      '  return t;',
      '}',
    ].join('\n');
    const messages = linter.verify(source, [
      { languageOptions: { ecmaVersion: 2024, sourceType: 'module' } },
      workflowsConfig,
    ]);
    const diagnostics = toJsonDiagnostics(messages);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'rulvar/no-bare-date',
      severity: 'error',
      line: 2,
    });
    expect(diagnostics[1]).toMatchObject({
      ruleId: 'rulvar/no-promise-all-over-ctx',
      severity: 'error',
      line: 3,
    });
    expect(typeof diagnostics[0].column).toBe('number');
    // The projection is pure JSON: it round-trips.
    expect(JSON.parse(JSON.stringify(diagnostics))).toEqual(diagnostics);
  });
});
