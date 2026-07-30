/**
 * quotaRulesConformance (RV704): the executable construction contract
 * every reference QuotaLimiter shares. A rule set containing two
 * byte-identical rules is refused at construction with a typed
 * ConfigError naming both indexes and the canonical rule key, because
 * the SAME duplicated configuration admits differently per storage:
 * index-keyed memory buckets count each copy independently (the full
 * cap), while key-keyed store buckets are debited once per matching
 * copy (the cap divided by the copy count). Refusing the set before
 * any admission is what keeps equal configurations equal on every
 * storage.
 */
import { ConfigError, quotaRuleKey, type QuotaRule } from '@rulvar/core';
import { ensure, makeSuite, type ConformanceCheck, type ConformanceSuite } from './types.js';

/**
 * Constructs a limiter over the given rules; the suite closes whatever
 * it returns (a `close` method is called and awaited when present), so
 * factories may open real resources for the negative control.
 */
export type QuotaLimiterConstructor = (rules: readonly QuotaRule[]) => unknown;

const RULE_A: QuotaRule = { provider: 'fake', model: 'fake:model', requestsPerMinute: 4 };
const RULE_B: QuotaRule = { provider: 'fake', tokensPerMinute: 1000 };

async function closeQuietly(made: unknown): Promise<void> {
  if (typeof made !== 'object' || made === null) {
    return;
  }
  const close = (made as { close?: () => unknown }).close;
  if (typeof close === 'function') {
    try {
      await Promise.resolve(close.call(made));
    } catch {
      // The suite asserts construction semantics, not teardown health.
    }
  }
}

export function quotaRulesConformance(mk: QuotaLimiterConstructor): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'quota-duplicate-refused',
      title: 'a duplicated rule is refused at construction, naming both indexes and the key',
      async run() {
        let thrown: unknown;
        try {
          await closeQuietly(mk([RULE_A, RULE_B, { ...RULE_A }]));
        } catch (error) {
          thrown = error;
        }
        ensure(
          thrown !== undefined,
          'quota-duplicate-refused',
          'constructing a limiter over a rule set with a duplicated rule must throw: the same ' +
            'set admits the full cap on index-keyed memory buckets and half the cap on ' +
            'key-keyed store buckets, so admitting the configuration breaks storage parity',
        );
        const shown =
          thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : JSON.stringify(thrown);
        ensure(
          thrown instanceof ConfigError,
          'quota-duplicate-refused',
          `the duplicate refusal must be the typed ConfigError, got ${shown}`,
        );
        const message = (thrown as Error).message;
        ensure(
          message.includes('[2] duplicates ') && message.includes('[0]'),
          'quota-duplicate-refused',
          `the refusal must name both indexes of the duplicated rule, got: ${message}`,
        );
        ensure(
          message.includes(`(rule key ${quotaRuleKey(RULE_A)})`),
          'quota-duplicate-refused',
          `the refusal must name the canonical rule key, got: ${message}`,
        );
        ensure(
          message.includes('delete the duplicate'),
          'quota-duplicate-refused',
          `the refusal must name the remedy, got: ${message}`,
        );
      },
    },
    {
      id: 'quota-distinct-rules-admitted',
      title: 'distinct rules construct: the refusal is about identity, never about count',
      async run() {
        await closeQuietly(mk([RULE_A, RULE_B]));
      },
    },
  ];
  return makeSuite('quotaRulesConformance', checks);
}
