import type { CompiledWorkflow, Workflow } from '@rulvar/core';
import { ScriptRejected, defineWorkflow } from '@rulvar/core';
import { describe, expect, it } from 'vitest';

import { SANDBOX_GLOBALS, compileScript, scriptDiagnosticsOf } from './compile.js';

const VALID_SOURCE = [
  "const verdicts = await parallel([() => agent('check A'), () => agent('check B')]);",
  "const merged = await step('merge', () => verdicts.join('; '));",
  'return { merged };',
].join('\n');

describe('compileScript', () => {
  it('compiles valid dialect source into a CompiledWorkflow', () => {
    const wf = compileScript(VALID_SOURCE);
    expect(wf.kind).toBe('compiled-workflow');
    expect(wf.name).toBe('compiled');
    expect(wf.source).toBe(VALID_SOURCE);
    expect(wf.errorPolicy).toBe('lenient');
  });

  it('exposes the exact docs global set in docs order', () => {
    expect(SANDBOX_GLOBALS).toEqual([
      'agent',
      'parallel',
      'pipeline',
      'step',
      'phase',
      'log',
      'budget',
      'workflow',
      'awaitExternal',
      'now',
      'random',
      'uuid',
    ]);
  });

  it('rejects a syntax error with a structured diagnostic', () => {
    let caught: unknown;
    try {
      compileScript('return {');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    const rejected = caught as ScriptRejected;
    expect(rejected.code).toBe('script_rejected');
    const diagnostics = scriptDiagnosticsOf(rejected);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('syntax');
    expect(diagnostics[0].message.length).toBeGreaterThan(0);
  });

  it('rejects a dynamic import outside the allowlist with position info', () => {
    const source = "const fs = await import('node:fs');\nreturn 1;";
    let caught: unknown;
    try {
      compileScript(source);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    const diagnostics = scriptDiagnosticsOf(caught as ScriptRejected);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'disallowed-import',
      line: 1,
      column: 18,
    });
    expect(diagnostics[0].message).toContain("import('node:fs')");
    expect(diagnostics[0].message).toContain('none');
  });

  it('accepts a dynamic import named in allowImports', () => {
    const source = "const fs = await import('node:fs');\nreturn 1;";
    const wf = compileScript(source, { allowImports: ['node:fs'] });
    expect(wf.kind).toBe('compiled-workflow');
  });

  it('rejects an allowlisted specifier only for the exact literal', () => {
    const source = "await import('node:child_process');\nreturn 1;";
    expect(() => compileScript(source, { allowImports: ['node:fs'] })).toThrow(ScriptRejected);
  });

  it('rejects non-literal dynamic import specifiers', () => {
    const source = "const name = 'node:fs';\nawait import(name);\nreturn 1;";
    let caught: unknown;
    try {
      compileScript(source, { allowImports: ['node:fs'] });
    } catch (error) {
      caught = error;
    }
    const diagnostics = scriptDiagnosticsOf(caught as ScriptRejected);
    expect(diagnostics.map((d) => d.ruleId)).toEqual(['no-import']);
  });

  it('rejects require and export tokens', () => {
    const source = "const fs = require('fs');\nexport const x = 1;\nreturn 1;";
    let caught: unknown;
    try {
      compileScript(source);
    } catch (error) {
      caught = error;
    }
    const diagnostics = scriptDiagnosticsOf(caught as ScriptRejected);
    const rules = diagnostics.map((d) => d.ruleId);
    expect(rules).toContain('no-require');
    expect(rules).toContain('no-export');
  });

  it('ignores banned tokens inside strings, templates, and comments', () => {
    const source = [
      "const a = 'import fine in a string';",
      'const b = `require("x") in a template`;',
      '// import in a line comment',
      '/* export in a block comment */',
      'return { a, b };',
    ].join('\n');
    const wf = compileScript(source);
    expect(wf.kind).toBe('compiled-workflow');
  });

  it('rejects eval as dynamic code generation', () => {
    let caught: unknown;
    try {
      compileScript('const v = eval("1 + 1");\nreturn v;');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    const diagnostics = scriptDiagnosticsOf(caught as ScriptRejected);
    expect(diagnostics.map((d) => d.ruleId)).toContain('no-eval');
  });

  it('rejects the Function constructor in call and new form', () => {
    for (const source of [
      'const f = Function("return 42");\nreturn f();',
      'const f = new Function("return 42");\nreturn f();',
    ]) {
      let caught: unknown;
      try {
        compileScript(source);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ScriptRejected);
      expect(scriptDiagnosticsOf(caught as ScriptRejected).map((d) => d.ruleId)).toContain(
        'no-function-constructor',
      );
    }
  });

  it('rejects .constructor access (the Function constructor vector)', () => {
    let caught: unknown;
    try {
      compileScript('const F = (function () {}).constructor;\nreturn typeof F;');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    expect(scriptDiagnosticsOf(caught as ScriptRejected).map((d) => d.ruleId)).toContain(
      'no-constructor-access',
    );
  });

  it('rejects the import allowlist bypass through a generated function', () => {
    // The exact SEC-P2 shape: reach the Function constructor and compile a
    // dynamic import the static import ban never sees as a literal token.
    const source = [
      'const spec = "node:" + "os";',
      'const make = (function () {}).constructor;',
      'const load = make("s", "return import(s);");',
      'const os = await load(spec);',
      'return os.platform();',
    ].join('\n');
    let caught: unknown;
    try {
      compileScript(source);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    const rules = scriptDiagnosticsOf(caught as ScriptRejected).map((d) => d.ruleId);
    expect(rules).toContain('no-constructor-access');
  });

  it('does not flag identifiers or members that merely contain the banned words', () => {
    const source = [
      'const evaluation = 1;',
      'const myFunction = () => 2;',
      'const reconstructor = 3;',
      "const s = 'eval and Function and .constructor live in this string';",
      'return evaluation + myFunction() + reconstructor;',
    ].join('\n');
    const wf = compileScript(source);
    expect(wf.kind).toBe('compiled-workflow');
  });

  it('rejects every statically visible reconstruction form (v1.38.0 review P2-CODEGEN-PARITY)', () => {
    // The regex gate only saw the dotted form; the AST policy rejects the
    // bracket, folding-computed, folding-template, destructuring, and
    // reflection forms too, so compileScript matches the ESLint rule.
    for (const source of [
      'return (function () {})["constructor"];',
      'return (function () {})["con" + "structor"];',
      'return (function () {})[`con${""}structor`];',
      'const { constructor: C } = function () {}; return typeof C;',
      'const { ["constructor"]: C } = function () {}; return typeof C;',
      'return Reflect.get(function () {}, "constructor");',
    ]) {
      expect(() => compileScript(source), source).toThrow(ScriptRejected);
      let caught: unknown;
      try {
        compileScript(source);
      } catch (error) {
        caught = error;
      }
      expect(scriptDiagnosticsOf(caught as ScriptRejected).map((d) => d.ruleId)).toContain(
        'no-constructor-access',
      );
    }
  });

  it('accepts a truly dynamic constructor key (undecidable statically, left to the worker)', () => {
    // A key assembled at runtime cannot be resolved without rejecting every
    // dynamic property access, so compile accepts it; the worker realm is the
    // layer that neutralizes it at runtime.
    for (const source of [
      'const key = ["con", "structor"].join(""); return typeof (function () {})[key];',
      'const key = someInput; return typeof (function () {})[key];',
    ]) {
      const wf = compileScript(source, { allowImports: [] });
      expect(wf.kind, source).toBe('compiled-workflow');
    }
  });

  it('does not flag eval or Function as member or property names on other values', () => {
    // The AST policy only flags the GLOBAL eval/Function call and new forms;
    // a property named eval/Function/constructor on a data object is ordinary
    // access, not code generation. The regex gate wrongly rejected these.
    const source = [
      'const parsed = payload.eval;',
      'const shaped = payload.Function;',
      'const meta = { eval: 1, Function: 2, constructor: () => 3 };',
      'const viaBracket = payload["eval"];',
      'return parsed ?? shaped ?? meta.eval ?? viaBracket;',
    ].join('\n');
    const wf = compileScript(source);
    expect(wf.kind).toBe('compiled-workflow');
  });

  it('still catches an import hidden inside a template interpolation', () => {
    const source = "const a = `value: ${await import('node:os')}`;\nreturn a;";
    expect(() => compileScript(source)).toThrow(ScriptRejected);
  });

  it('does not match identifiers that merely contain the words', () => {
    const source = [
      'const important = 1;',
      'const exporter = 2;',
      'const required = 3;',
      'return important + exporter + required;',
    ].join('\n');
    const wf = compileScript(source);
    expect(wf.kind).toBe('compiled-workflow');
  });

  it('rejects empty source', () => {
    let caught: unknown;
    try {
      compileScript('   ');
    } catch (error) {
      caught = error;
    }
    const diagnostics = scriptDiagnosticsOf(caught as ScriptRejected);
    expect(diagnostics.map((d) => d.ruleId)).toEqual(['empty-source']);
  });

  it('accumulates every diagnostic in one rejection', () => {
    const source = "require('a');\nawait import('b');\nreturn {";
    let caught: unknown;
    try {
      compileScript(source);
    } catch (error) {
      caught = error;
    }
    const diagnostics = scriptDiagnosticsOf(caught as ScriptRejected);
    expect(diagnostics.length).toBeGreaterThanOrEqual(3);
    const rules = diagnostics.map((d) => d.ruleId);
    expect(rules).toContain('no-require');
    expect(rules).toContain('disallowed-import');
    expect(rules).toContain('syntax');
  });

  it('never executes the source at compile time', () => {
    const wf = compileScript("throw new Error('must not run at compile time');");
    expect(wf.kind).toBe('compiled-workflow');
  });
});

describe('type-level split: Workflow vs CompiledWorkflow', () => {
  it('keeps closure and compiled forms mutually unassignable', () => {
    const closure: Workflow<unknown, number> = defineWorkflow({ name: 'closure' }, () =>
      Promise.resolve(1),
    );
    const compiled: CompiledWorkflow = compileScript('return 1;');

    // @ts-expect-error a closure Workflow is not a CompiledWorkflow
    const notCompiled: CompiledWorkflow = closure;
    // @ts-expect-error a CompiledWorkflow is not a closure Workflow
    const notClosure: Workflow<unknown, number> = compiled;

    expect(notCompiled.kind).toBe('workflow');
    expect(notClosure.kind).toBe('compiled-workflow');
    expect(closure.kind).toBe('workflow');
    expect(compiled.kind).toBe('compiled-workflow');
  });
});
