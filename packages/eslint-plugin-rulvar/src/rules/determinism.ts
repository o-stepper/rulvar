/**
 * The determinism rule set (M6-T03): bare
 * Date.now, new Date, Math.random, fetch, and process.env are banned in
 * workflow modules because their values never enter the journal and
 * diverge on replay; the journaled ctx shims replace them. Messages are
 * prescriptive so the mode (b) self-repair loop can act on them
 * mechanically.
 */
import type { Rule } from 'eslint';

import { isGlobalMemberCall, isGlobalReference } from './shared.js';

export const noBareDate: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban bare Date.now() and new Date() in workflow modules; use ctx.now() so the value ' +
        'is journaled and stable on replay',
    },
    messages: {
      bareDateNow:
        'bare Date.now() is not replay-stable; use ctx.now() (the journaled deterministic shim)',
      bareNewDate:
        'bare new Date() is not replay-stable; derive dates from ctx.now() ' +
        '(new Date(ctx.now()))',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isGlobalMemberCall(context, node.callee, 'Date', 'now')) {
          context.report({ node, messageId: 'bareDateNow' });
        }
      },
      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Date' &&
          isGlobalReference(context, node.callee)
        ) {
          context.report({ node, messageId: 'bareNewDate' });
        }
      },
    };
  },
};

export const noBareRandom: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban bare Math.random() in workflow modules; use ctx.random() so the value is ' +
        'journaled and stable on replay',
    },
    messages: {
      bareMathRandom:
        'bare Math.random() is not replay-stable; use ctx.random(key?) ' +
        '(the journaled deterministic shim)',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isGlobalMemberCall(context, node.callee, 'Math', 'random')) {
          context.report({ node, messageId: 'bareMathRandom' });
        }
      },
    };
  },
};

export const noFetch: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban bare fetch in workflow modules; ambient network reads bypass the journal, ' +
        'wrap them in ctx.step or a tool',
    },
    messages: {
      bareFetch:
        'bare fetch() bypasses the journal and diverges on replay; wrap the read in ' +
        "ctx.step('label', ...) or declare a tool",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'Identifier' &&
          callee.name === 'fetch' &&
          isGlobalReference(context, callee)
        ) {
          context.report({ node, messageId: 'bareFetch' });
          return;
        }
        if (isGlobalMemberCall(context, callee, 'globalThis', 'fetch')) {
          context.report({ node, messageId: 'bareFetch' });
        }
      },
    };
  },
};

export const noProcessEnv: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ban process.env reads in workflow modules; ambient configuration bypasses the ' +
        'journal, pass values through workflow args or ctx.step',
    },
    messages: {
      processEnv:
        'process.env is ambient state that diverges on replay; pass configuration through ' +
        "workflow args or journal the read with ctx.step('read env', ...)",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          !node.computed &&
          node.object.type === 'Identifier' &&
          node.object.name === 'process' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'env' &&
          isGlobalReference(context, node.object)
        ) {
          context.report({ node, messageId: 'processEnv' });
        }
      },
    };
  },
};
