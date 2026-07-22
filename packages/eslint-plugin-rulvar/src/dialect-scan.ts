/**
 * Shared dialect scan for the dynamic code generation ban (v1.38.0 review
 * P2-CODEGEN-PARITY). One AST policy, used by BOTH the `no-code-generation`
 * ESLint rule and by `compileScript` in @rulvar/planner, so the linter and
 * the structural compile gate reach the SAME decision for every statically
 * visible constructor reconstruction form: dotted `.constructor`, literal
 * bracket `["constructor"]`, a computed key that folds to the constant
 * `"constructor"` (`"con" + "structor"`, a constant template), destructuring
 * `{ constructor: x }`, and `Reflect.get(fn, "constructor")`.
 *
 * The previous compile gate scanned blanked source with a regex that only
 * matched the dotted form, so bracket and computed keys slipped through while
 * the ESLint rule flagged some of them: the two gates disagreed. A regex
 * cannot model member access, which is why this policy walks the parse tree.
 *
 * A truly dynamic key (`fn[valueFromAnAgent]`, `fn[parts.join("")]`) cannot be
 * resolved statically without rejecting every dynamic property access, so it
 * is intentionally NOT flagged here; the worker realm neutralizes that path at
 * runtime instead. This scan raises the bar and keeps the dialect consistent;
 * it is not a hostile code boundary.
 */
import type * as ESTree from 'estree';

/** Where a finding sits in the ORIGINAL source (line and column counted from 1). */
export interface DialectFinding {
  kind: 'eval' | 'function-constructor' | 'constructor-access';
  line: number;
  column: number;
}

function positionOf(node: ESTree.Node): { line: number; column: number } {
  const start = node.loc?.start;
  return { line: start?.line ?? 1, column: (start?.column ?? 0) + 1 };
}

/**
 * Folds an expression that evaluates to a string to its constant value, or
 * undefined when it is not statically constant. Handles string literals, templates whose
 * every interpolation folds, and `+` concatenations of foldable operands.
 * This is deliberately conservative: anything it cannot prove constant (a
 * variable, a call, an index) folds to undefined and is left to the runtime.
 */
export function foldStaticString(node: ESTree.Node | null | undefined): string | undefined {
  if (node === null || node === undefined) {
    return undefined;
  }
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : undefined;
  }
  if (node.type === 'TemplateLiteral') {
    let out = '';
    for (let i = 0; i < node.quasis.length; i += 1) {
      out += node.quasis[i].value.cooked ?? node.quasis[i].value.raw;
      if (i < node.expressions.length) {
        const piece = foldStaticString(node.expressions[i]);
        if (piece === undefined) {
          return undefined;
        }
        out += piece;
      }
    }
    return out;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = node.left.type === 'PrivateIdentifier' ? undefined : foldStaticString(node.left);
    const right = foldStaticString(node.right);
    return left === undefined || right === undefined ? undefined : left + right;
  }
  return undefined;
}

/** `fn.constructor` or `fn["constructor"]` (any statically constant key). */
export function isConstructorMemberExpression(node: ESTree.MemberExpression): boolean {
  if (!node.computed) {
    return node.property.type === 'Identifier' && node.property.name === 'constructor';
  }
  return foldStaticString(node.property) === 'constructor';
}

/** A destructuring property that binds the `constructor` slot of its source. */
export function isConstructorPatternProperty(
  node: ESTree.Property | ESTree.AssignmentProperty,
): boolean {
  if (!node.computed) {
    if (node.key.type === 'Identifier') {
      return node.key.name === 'constructor';
    }
    if (node.key.type === 'Literal') {
      return node.key.value === 'constructor';
    }
    return false;
  }
  return foldStaticString(node.key) === 'constructor';
}

/** `Reflect.get(fn, "constructor")` with a statically constant key. */
export function isReflectConstructorGet(node: ESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.object.type !== 'Identifier' ||
    callee.object.name !== 'Reflect' ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'get'
  ) {
    return false;
  }
  const keyArg = node.arguments[1];
  return (
    keyArg !== undefined &&
    keyArg.type !== 'SpreadElement' &&
    foldStaticString(keyArg) === 'constructor'
  );
}

/** A bare global `eval`/`Function` used as a call or `new` target. */
function bareCodegenCallee(
  callee: ESTree.Expression | ESTree.Super,
): 'eval' | 'function-constructor' | null {
  if (callee.type === 'Identifier') {
    if (callee.name === 'eval') {
      return 'eval';
    }
    if (callee.name === 'Function') {
      return 'function-constructor';
    }
    return null;
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'globalThis' &&
    callee.property.type === 'Identifier'
  ) {
    if (callee.property.name === 'eval') {
      return 'eval';
    }
    if (callee.property.name === 'Function') {
      return 'function-constructor';
    }
  }
  return null;
}

const SKIP_KEYS = new Set([
  'loc',
  'range',
  'start',
  'end',
  'parent',
  'comments',
  'tokens',
  'leadingComments',
  'trailingComments',
]);

function walk(root: ESTree.Node, visit: (node: ESTree.Node) => void): void {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }
    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item);
      }
      continue;
    }
    const node = current as ESTree.Node & Record<string, unknown>;
    if (typeof node.type !== 'string') {
      continue;
    }
    visit(node);
    for (const [key, value] of Object.entries(node)) {
      if (!SKIP_KEYS.has(key)) {
        stack.push(value);
      }
    }
  }
}

/**
 * Structural scan for compileScript: every dynamic code generation form the
 * dialect rejects, as findings positioned in the original source. Covers bare
 * `eval`/`Function` calls and `new`, `globalThis.eval`/`globalThis.Function`,
 * and every constructor reconstruction form the shared predicates recognize.
 * Member access on other objects (`response.eval`, `parser.Function`) and a
 * property NAMED constructor in an object LITERAL are not code generation and
 * are left alone.
 *
 * Takes a parsed ESTree Program, typed `unknown` so a caller needs neither the
 * estree types nor a specific parser in its own public surface; any ESTree
 * compatible parser (espree in the lint pass, acorn in compileScript) works.
 */
export function scanDialect(program: unknown): DialectFinding[] {
  const findings: DialectFinding[] = [];
  walk(program as ESTree.Program, (node) => {
    switch (node.type) {
      case 'CallExpression':
      case 'NewExpression': {
        const codegen = bareCodegenCallee(node.callee);
        if (codegen !== null) {
          findings.push({ kind: codegen, ...positionOf(node) });
        }
        if (node.type === 'CallExpression' && isReflectConstructorGet(node)) {
          findings.push({ kind: 'constructor-access', ...positionOf(node) });
        }
        break;
      }
      case 'MemberExpression': {
        if (isConstructorMemberExpression(node)) {
          findings.push({ kind: 'constructor-access', ...positionOf(node) });
        }
        break;
      }
      case 'ObjectPattern': {
        for (const property of node.properties) {
          if (property.type === 'Property' && isConstructorPatternProperty(property)) {
            findings.push({ kind: 'constructor-access', ...positionOf(property) });
          }
        }
        break;
      }
      default:
        break;
    }
  });
  return findings;
}
