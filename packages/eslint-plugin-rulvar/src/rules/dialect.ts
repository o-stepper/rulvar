/**
 * The dialect integrity rule set (v1.37.0 review SEC-P2, broadened for the
 * v1.38.0 review P2-CODEGEN-PARITY): dynamic code generation is banned in
 * workflow modules. eval, the Function constructor, and constructor
 * reconstruction (`.constructor`, `["constructor"]`, a computed key that folds
 * to `"constructor"`, `{ constructor: x }` destructuring, and
 * `Reflect.get(fn, "constructor")`) all reach a fresh compilation scope where
 * import(), ambient time, and host capability are back in reach, so allowing
 * them would defeat the sandbox's import allowlist and its blast radius bound.
 * Like the determinism rules this raises the bar and keeps the workflow
 * dialect consistent; it is not a hostile code boundary.
 *
 * The constructor reconstruction forms are recognized by the SAME predicates
 * `compileScript` uses (`../dialect-scan.js`), so the advisory linter and the
 * structural compile gate reach one decision. Messages are prescriptive so the
 * mode (b) repair loop can act on them mechanically.
 *
 * As with `no-fetch`, eval and Function are flagged as the global call/`new`
 * forms; a bare reference merely captured as a value (`const f = Function`) or
 * a member on another object (`parser.eval`) is outside their reach.
 * `compileScript` is the strict structural backstop for machine generated
 * scripts, and the worker realm neutralizes any residual runtime path.
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

import {
  isConstructorMemberExpression,
  isConstructorPatternProperty,
  isReflectConstructorGet,
} from '../dialect-scan.js';
import { isGlobalMemberCall, isGlobalReference } from './shared.js';

export const noCodeGeneration: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban dynamic code generation (eval, the Function constructor, and constructor ' +
        'reconstruction) in workflow modules; it reopens the import allowlist and the ambient ' +
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
        'constructor access reaches the Function constructor from any function value and ' +
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
        if (isReflectConstructorGet(node)) {
          context.report({ node, messageId: 'noConstructorAccess' });
        }
      },
      NewExpression(node) {
        checkCallee(node, node.callee);
      },
      MemberExpression(node) {
        if (isConstructorMemberExpression(node)) {
          context.report({ node, messageId: 'noConstructorAccess' });
        }
      },
      ObjectPattern(node) {
        for (const property of node.properties) {
          if (property.type === 'Property' && isConstructorPatternProperty(property)) {
            context.report({ node: property, messageId: 'noConstructorAccess' });
          }
        }
      },
    };
  },
};
