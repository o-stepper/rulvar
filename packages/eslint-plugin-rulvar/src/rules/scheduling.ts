/**
 * Scheduling and identity rules (M6-T03):
 * Promise.all over ctx calls bypasses the journal-aware scheduler
 * (ctx.parallel journals, schedules, and settles); byte-identical
 * repeated calls each get their own journal entry, told apart only by
 * execution order, so an edit that reorders or removes one can re-pair
 * recorded results with the wrong call site unless the caller
 * distinguishes the repeats with opts.key.
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

import { containsCtxCall, isGlobalReference, SANDBOX_CALL_GLOBALS } from './shared.js';

const PROMISE_COMBINATORS = new Set(['all', 'allSettled', 'race', 'any']);

export const noPromiseAllOverCtx: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban bare Promise.all/allSettled/race/any over ctx calls; use ctx.parallel, which ' +
        'journals, schedules, and settles branches',
    },
    messages: {
      promiseCombinator:
        'Promise.{{method}} over ctx calls bypasses the journal-aware scheduler; use ' +
        'ctx.parallel([...]) (settle: true replaces allSettled)',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          callee.object.type !== 'Identifier' ||
          callee.object.name !== 'Promise' ||
          callee.property.type !== 'Identifier' ||
          !PROMISE_COMBINATORS.has(callee.property.name) ||
          !isGlobalReference(context, callee.object)
        ) {
          return;
        }
        const spawnsCtxWork = node.arguments.some((argument) => containsCtxCall(argument));
        if (spawnsCtxWork) {
          context.report({
            node,
            messageId: 'promiseCombinator',
            data: { method: callee.property.name },
          });
        }
      },
    };
  },
};

/** The call text a duplicate is keyed by: callee plus every argument. */
function callIdentityText(context: Rule.RuleContext, node: ESTree.CallExpression): string {
  return context.sourceCode.getText(node);
}

function isCtxAgentCall(node: ESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    (callee.property.name === 'agent' || callee.property.name === 'workflow')
  ) {
    return true;
  }
  return (
    callee.type === 'Identifier' &&
    SANDBOX_CALL_GLOBALS.has(callee.name) &&
    (callee.name === 'agent' || callee.name === 'workflow')
  );
}

export const duplicateIdenticalCall: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'advisory: byte-identical ctx.agent/ctx.workflow calls in one function are told apart ' +
        'only by execution order; pass opts.key to give deliberate repeats stable identities',
    },
    messages: {
      duplicateCall:
        'this call is byte-identical to an earlier one in the same function; the journal tells ' +
        'identical repeats apart only by execution order, so an edit that reorders or removes ' +
        'one can re-pair recorded results with the wrong call site; give a deliberate repeat a ' +
        'distinguishing opts.key',
    },
    schema: [],
  },
  create(context) {
    // One occurrence set per enclosing function (or module body).
    const stacks: Array<Map<string, number>> = [new Map<string, number>()];
    const enter = (): void => {
      stacks.push(new Map<string, number>());
    };
    const exit = (): void => {
      stacks.pop();
    };
    return {
      FunctionDeclaration: enter,
      'FunctionDeclaration:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit,
      CallExpression(node) {
        if (!isCtxAgentCall(node)) {
          return;
        }
        const seen = stacks[stacks.length - 1];
        const text = callIdentityText(context, node);
        const count = seen.get(text) ?? 0;
        seen.set(text, count + 1);
        if (count > 0) {
          context.report({ node, messageId: 'duplicateCall' });
        }
      },
    };
  },
};
