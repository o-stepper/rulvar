/**
 * compileScript: validation and compilation of planner-generated source
 * into a CompiledWorkflow (M6-T01).
 *
 * Full contract: https://docs.rulvar.com/guide/planner. Any violation is a
 * typed ScriptRejected carrying machine-readable diagnostics for the
 * plan() self-repair loop; `allowImports` defaults to [] (no imports).
 *
 * Validation scope committed here (M6-T01 acceptance): syntax (the source
 * must compile as an async function body over the sandbox globals), the
 * import allowlist, and the dynamic code generation ban (eval, the
 * Function constructor, and constructor reconstruction). The last one keeps
 * the import allowlist meaningful: without it `new Function("return
 * import(x)")` would reopen the very import surface the allowlist closes. It
 * runs the SAME shared AST policy the `no-code-generation` ESLint rule uses
 * (scanDialect), so this structural gate and the linter reach one decision
 * for every statically visible form: `.constructor`, `["constructor"]`, a
 * computed key that folds to the constant, `{ constructor: x }`
 * destructuring, and `Reflect.get(fn, "constructor")`. This raises the bar
 * and keeps the dialect consistent; it is NOT a hostile code boundary (a
 * truly dynamic key cannot be seen statically, and a determined author still
 * reaches intrinsics), which is why the worker additionally neutralizes the
 * runtime reconstruction path and the sandbox is documented as a determinism
 * and blast radius boundary, not a security one. The deeper dialect rules
 * (schema literals only, no functions in options, tools by profile name) are
 * enforced at the sandbox boundary at runtime (JSON-only RPC) and advisorily
 * by eslint-plugin-rulvar in the self-repair loop.
 */
import type { CompiledWorkflow } from '@rulvar/core';
import { ScriptRejected } from '@rulvar/core';
import * as acorn from 'acorn';
import { scanDialect, type DialectFinding } from 'eslint-plugin-rulvar';

/**
 * The exact curated sandbox global set, in canonical order.
 * The worker binds the ctx methods as bare globals under these names and
 * the API card teaches exactly this list.
 */
export const SANDBOX_GLOBALS: readonly string[] = [
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
];

/** One machine-readable compileScript diagnostic (carried by ScriptRejected). */
export interface ScriptDiagnostic {
  ruleId: string;
  message: string;
  line?: number;
  column?: number;
}

export interface CompileScriptOptions {
  /** Dynamic-import specifiers permitted in the source; default [] (none). */
  allowImports?: string[];
}

/** Marker reaching the AsyncFunction constructor; never invoked. */
// eslint-disable-next-line @typescript-eslint/require-await
const asyncMarker = async (): Promise<undefined> => undefined;

/** The async-function constructor; building one compiles without running. */
const AsyncFunctionCtor: new (...args: string[]) => unknown = (
  Object.getPrototypeOf(asyncMarker) as {
    constructor: new (...args: string[]) => unknown;
  }
).constructor;

/**
 * Replaces string literals (single, double, template) and comments with
 * spaces of equal length so token scans never match inside them. Template
 * interpolations `${...}` are KEPT as code (a disallowed import inside an
 * interpolation must still be caught). Regex literals are not stripped:
 * a regex containing a banned word may false-positive, which errs on the
 * rejecting side for machine-generated source.
 */
function blankLiterals(source: string): string {
  const out = source.split('');
  const blank = (index: number): void => {
    if (out[index] !== '\n') {
      out[index] = ' ';
    }
  };
  // Template interpolations re-enter code mode; this stack tracks whether
  // a closing brace returns to a template literal.
  const templateStack: boolean[] = [];
  let i = 0;
  let mode: 'code' | 'single' | 'double' | 'template' | 'line' | 'block' = 'code';
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (mode === 'code') {
      if (ch === "'") {
        mode = 'single';
        blank(i);
      } else if (ch === '"') {
        mode = 'double';
        blank(i);
      } else if (ch === '`') {
        mode = 'template';
        blank(i);
      } else if (ch === '/' && next === '/') {
        mode = 'line';
        blank(i);
      } else if (ch === '/' && next === '*') {
        mode = 'block';
        blank(i);
      } else if (ch === '}' && templateStack.length > 0) {
        // End of a template interpolation: back into the literal.
        templateStack.pop();
        mode = 'template';
        blank(i);
      }
    } else if (mode === 'single' || mode === 'double') {
      if (ch === '\\') {
        blank(i);
        i += 1;
        if (i < source.length) {
          blank(i);
        }
        i += 1;
        continue;
      }
      if ((mode === 'single' && ch === "'") || (mode === 'double' && ch === '"')) {
        mode = 'code';
      }
      blank(i);
    } else if (mode === 'template') {
      if (ch === '\\') {
        blank(i);
        i += 1;
        if (i < source.length) {
          blank(i);
        }
        i += 1;
        continue;
      }
      if (ch === '$' && next === '{') {
        templateStack.push(true);
        blank(i);
        i += 1;
        blank(i);
        i += 1;
        mode = 'code';
        continue;
      }
      if (ch === '`') {
        mode = 'code';
      }
      blank(i);
    } else if (mode === 'line') {
      if (ch === '\n') {
        mode = 'code';
      } else {
        blank(i);
      }
    } else {
      // block comment
      if (ch === '*' && next === '/') {
        blank(i);
        i += 1;
        blank(i);
        mode = 'code';
        i += 1;
        continue;
      }
      blank(i);
    }
    i += 1;
  }
  return out.join('');
}

function positionAt(source: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

const DYNAMIC_IMPORT = /^import\s*\(\s*(['"`])([^'"`]*)\1\s*\)/;

function scanImports(
  source: string,
  blanked: string,
  allowImports: readonly string[],
): ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];
  const word = /\b(import|require|export)\b/g;
  for (let match = word.exec(blanked); match !== null; match = word.exec(blanked)) {
    const token = match[1];
    const at = positionAt(source, match.index);
    if (token === 'require') {
      const tail = blanked.slice(match.index + token.length);
      if (/^\s*\(/.test(tail)) {
        diagnostics.push({
          ruleId: 'no-require',
          message: 'require() is not available in the sandbox; the dialect has no module access',
          ...at,
        });
      }
      continue;
    }
    if (token === 'export') {
      diagnostics.push({
        ruleId: 'no-export',
        message: 'export declarations are not part of the sandbox dialect; return a value instead',
        ...at,
      });
      continue;
    }
    // 'import': distinguish the dynamic form (allowlistable) from
    // everything else (static import syntax, import.meta), always
    // resolving the specifier from the ORIGINAL source because literals
    // are blanked in the scan copy.
    const original = source.slice(match.index);
    const dynamic = DYNAMIC_IMPORT.exec(original);
    if (dynamic === null) {
      diagnostics.push({
        ruleId: 'no-import',
        message:
          'import is not available in the sandbox dialect (static imports, import.meta, and ' +
          'non-literal dynamic specifiers are always rejected)',
        ...at,
      });
      continue;
    }
    const specifier = dynamic[2];
    if (!allowImports.includes(specifier)) {
      diagnostics.push({
        ruleId: 'disallowed-import',
        message: `import('${specifier}') is not in allowImports (allowed: ${
          allowImports.length === 0 ? 'none' : allowImports.join(', ')
        })`,
        ...at,
      });
    }
  }
  return diagnostics;
}

const CODEGEN_DIAGNOSTIC: Record<DialectFinding['kind'], { ruleId: string; message: string }> = {
  eval: {
    ruleId: 'no-eval',
    message:
      'eval is not part of the sandbox dialect; dynamically generated code reopens the ' +
      'import allowlist and the ambient capability surface the dialect closes',
  },
  'function-constructor': {
    ruleId: 'no-function-constructor',
    message:
      'the Function constructor is not part of the sandbox dialect; it compiles arbitrary ' +
      'code that bypasses the import allowlist (use only the curated globals)',
  },
  'constructor-access': {
    ruleId: 'no-constructor-access',
    message:
      'constructor access is not part of the sandbox dialect; it reaches the Function ' +
      'constructor from any function value and reopens dynamic code generation',
  },
};

/**
 * Rejects dynamic code generation. `eval` and the Function constructor
 * compile attacker supplied text in a fresh scope where the import
 * expression, ambient time, and host capability are back in reach, so
 * banning `import` while allowing `new Function("return import(x)")` closes
 * nothing. Constructor reconstruction is the same vector by another name:
 * every function value exposes the Function constructor through its prototype
 * ((function(){}).constructor === Function), reachable as `.constructor`,
 * `["constructor"]`, a computed key that folds to the constant, a
 * `{ constructor: x }` destructuring, or `Reflect.get(fn, "constructor")`.
 *
 * The scan runs the SAME shared AST policy the `no-code-generation` ESLint
 * rule uses (`scanDialect`), so the linter and this structural gate reach one
 * decision for every statically visible form. A truly dynamic key
 * (`fn[valueFromAnAgent]`) cannot be resolved statically without rejecting
 * every dynamic property access, so it is left to the worker realm, which
 * neutralizes the runtime reconstruction path. A syntax error is reported by
 * the AsyncFunction construction below, so a parse failure here yields no
 * diagnostics rather than a duplicate.
 */
function scanCodegen(source: string): ScriptDiagnostic[] {
  let program: acorn.Program;
  try {
    program = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      locations: true,
    });
  } catch {
    return [];
  }
  return scanDialect(program).map((finding) => {
    const { ruleId, message } = CODEGEN_DIAGNOSTIC[finding.kind];
    return { ruleId, message, line: finding.line, column: finding.column };
  });
}

/**
 * Validates and compiles planner-generated source into a CompiledWorkflow.
 * The source is an async function body over the sandbox
 * globals; its `return` value is the workflow result. The compiled form is
 * pure data (the source is evaluated only inside the worker sandbox);
 * machine scripts run under errorPolicy 'lenient'.
 */
export function compileScript(source: string, o?: CompileScriptOptions): CompiledWorkflow {
  const allowImports = o?.allowImports ?? [];
  const diagnostics: ScriptDiagnostic[] = [];
  if (typeof (source as unknown) !== 'string' || source.trim() === '') {
    throw new ScriptRejected('compileScript: source must be a non-empty string', {
      data: { diagnostics: [{ ruleId: 'empty-source', message: 'source is empty' }] },
    });
  }
  const blanked = blankLiterals(source);
  diagnostics.push(...scanImports(source, blanked, allowImports));
  diagnostics.push(...scanCodegen(source));
  try {
    // Constructing the function compiles the body without executing it.
    new AsyncFunctionCtor(...SANDBOX_GLOBALS, source);
  } catch (error) {
    diagnostics.push({
      ruleId: 'syntax',
      message: error instanceof Error ? error.message : String(error),
    });
  }
  if (diagnostics.length > 0) {
    throw new ScriptRejected(
      `compileScript: source rejected with ${String(diagnostics.length)} diagnostic(s): ` +
        diagnostics.map((d) => d.ruleId).join(', '),
      { data: { diagnostics: diagnostics.map((d) => ({ ...d })) } },
    );
  }
  return {
    kind: 'compiled-workflow',
    name: 'compiled',
    source,
    errorPolicy: 'lenient',
  };
}

/** Typed accessor for the diagnostics carried on a ScriptRejected. */
export function scriptDiagnosticsOf(error: ScriptRejected): ScriptDiagnostic[] {
  const data = error.data as { diagnostics?: ScriptDiagnostic[] } | undefined;
  return data?.diagnostics ?? [];
}
