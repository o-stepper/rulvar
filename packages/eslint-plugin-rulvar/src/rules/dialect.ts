/**
 * The dialect integrity rule set (v1.37.0 review SEC-P2): dynamic code
 * generation is banned in workflow modules. eval, the Function constructor,
 * and `.constructor` access all reach a fresh compilation scope where
 * import(), ambient time, and host capability are back in reach, so
 * allowing them would defeat the sandbox's import allowlist and its blast
 * radius bound. Like the determinism rules this raises the bar and keeps
 * the workflow dialect consistent; it is not a hostile code boundary.
 * Messages are prescriptive so the mode (b) repair loop can act on them
 * mechanically.
 *
 * As with `no-fetch`, the rule flags the call, `new`, and member forms; a
 * bare reference merely captured as a value (`const f = Function`) is
 * outside its reach. `compileScript` is the strict structural backstop for
 * machine generated scripts.
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

import { isGlobalMemberCall, isGlobalReference } from './shared.js';

export const noCodeGeneration: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban dynamic code generation (eval, the Function constructor, and .constructor ' +
        'access) in workflow modules; it reopens the import allowlist and the ambient ' +
        'capability surface the sandbox dialect closes',
    },
    messages: {
      noEval:
        'eval is not part of the workflow dialect; it compiles code in a fresh scope that ' +
        'reopens import() and ambient capability. Stay on the ctx surface.',
      noFunctionConstructor:
        'the Function constructor is not part of the workflow dialect; it compiles arbitrary ' +
        'code that bypasses the import allowlist. Stay on the ctx surface.',
      noConstructorAccess:
        '.constructor access reaches the Function constructor from any function value and ' +
        'reopens dynamic code generation; it is not part of the workflow dialect.',
    },
    schema: [],
  },
  create(context) {
    const checkCallee = (node: ESTree.Node, callee: ESTree.Expression | ESTree.Super): void => {
      if (callee.type === 'Identifier' && isGlobalReference(context, callee)) {
        if (callee.name === 'eval') {
          context.report({ node, messageId: 'noEval' });
          return;
        }
        if (callee.name === 'Function') {
          context.report({ node, messageId: 'noFunctionConstructor' });
          return;
        }
      }
      if (isGlobalMemberCall(context, callee, 'globalThis', 'eval')) {
        context.report({ node, messageId: 'noEval' });
        return;
      }
      if (isGlobalMemberCall(context, callee, 'globalThis', 'Function')) {
        context.report({ node, messageId: 'noFunctionConstructor' });
      }
    };
    return {
      CallExpression(node) {
        checkCallee(node, node.callee);
      },
      NewExpression(node) {
        checkCallee(node, node.callee);
      },
      MemberExpression(node) {
        const { property, computed } = node;
        if (!computed && property.type === 'Identifier' && property.name === 'constructor') {
          context.report({ node, messageId: 'noConstructorAccess' });
          return;
        }
        if (computed && property.type === 'Literal' && property.value === 'constructor') {
          context.report({ node, messageId: 'noConstructorAccess' });
        }
      },
    };
  },
};
