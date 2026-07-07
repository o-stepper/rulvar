/**
 * Shared AST helpers for the determinism rules (M6-T03).
 *
 * Owning spec: docs/06-execution-spec.md, section 8.4. The rules ban
 * ambient nondeterminism in workflow modules and point at the journaled
 * ctx shims instead; diagnostics are structural so the mode (b)
 * self-repair loop can consume them.
 */
import type { Rule, Scope } from 'eslint';
import type * as ESTree from 'estree';

/**
 * True when `node` references the GLOBAL binding of its name: either the
 * name resolves to no variable at all or to a builtin with no local
 * definitions. A locally declared `Date`, `fetch`, or `process` shadows
 * the global and is never flagged.
 */
export function isGlobalReference(
  context: Rule.RuleContext,
  node: ESTree.Identifier & Partial<Rule.NodeParentExtension>,
): boolean {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope !== null) {
    const variable = scope.variables.find((candidate) => candidate.name === node.name);
    if (variable !== undefined) {
      return variable.defs.length === 0;
    }
    scope = scope.upper;
  }
  return true;
}

/** `object.property` where `object` is a global reference. */
export function isGlobalMemberCall(
  context: Rule.RuleContext,
  callee: ESTree.Expression | ESTree.Super,
  objectName: string,
  propertyName: string,
): boolean {
  if (callee.type !== 'MemberExpression' || callee.computed) {
    return false;
  }
  const { object, property } = callee;
  return (
    object.type === 'Identifier' &&
    object.name === objectName &&
    property.type === 'Identifier' &&
    property.name === propertyName &&
    isGlobalReference(context, object)
  );
}

/** Ctx member methods whose calls belong inside ctx.parallel, never Promise.all. */
export const CTX_CALL_METHODS: ReadonlySet<string> = new Set([
  'agent',
  'workflow',
  'orchestrate',
  'step',
  'brief',
  'parallel',
  'pipeline',
]);

/** Bare sandbox globals that are ctx calls in compiled scripts (docs/06, 8.2). */
export const SANDBOX_CALL_GLOBALS: ReadonlySet<string> = new Set([
  'agent',
  'workflow',
  'step',
  'parallel',
  'pipeline',
]);

/** True when the subtree under `root` contains a ctx-shaped call. */
export function containsCtxCall(root: ESTree.Node): boolean {
  let found = false;
  const visit = (node: unknown): void => {
    if (found || node === null || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }
    const candidate = node as ESTree.Node & Record<string, unknown>;
    if (typeof candidate.type !== 'string') {
      return;
    }
    if (candidate.type === 'CallExpression') {
      const callee = (candidate as unknown as ESTree.CallExpression).callee;
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        CTX_CALL_METHODS.has(callee.property.name)
      ) {
        found = true;
        return;
      }
      if (callee.type === 'Identifier' && SANDBOX_CALL_GLOBALS.has(callee.name)) {
        found = true;
        return;
      }
    }
    for (const [key, value] of Object.entries(candidate)) {
      if (key !== 'parent' && key !== 'loc' && key !== 'range') {
        visit(value);
      }
    }
  };
  visit(root);
  return found;
}
