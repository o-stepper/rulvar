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
