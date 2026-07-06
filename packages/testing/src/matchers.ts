/**
 * Vitest/Jest matchers (M1-T14): operate on the settled TestRunHandle and
 * its recorded event stream; they MUST NOT reach into engine internals
 * (docs/09, section "Matchers"). Import from '@lurker/testing/matchers'
 * and register with expect.extend.
 */
import type { TestRunHandle } from './test-engine.js';

export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

async function settled<R>(handle: TestRunHandle<R>): Promise<TestRunHandle<R>> {
  await handle.result;
  // One macrotask so the recorded stream drains past run:end.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return handle;
}

/** expect(run).toHaveCalledAgent('reviewer', { times: 3 }) */
export async function toHaveCalledAgent(
  received: TestRunHandle<unknown>,
  agentType: string,
  options?: { times?: number },
): Promise<MatcherResult> {
  const handle = await settled(received);
  const calls = handle.eventsSeen.filter(
    (event) => event.type === 'agent:end' && event.agentType === agentType,
  ).length;
  const expected = options?.times;
  const pass = expected === undefined ? calls > 0 : calls === expected;
  return {
    pass,
    message: () =>
      expected === undefined
        ? `expected run ${pass ? 'not ' : ''}to have called agent '${agentType}' (called ${calls} times)`
        : `expected run to have called agent '${agentType}' ${expected} times, saw ${calls}`,
  };
}

/** expect(run).toStayUnderBudget({ usd: 5 }) */
export async function toStayUnderBudget(
  received: TestRunHandle<unknown>,
  options: { usd: number },
): Promise<MatcherResult> {
  const outcome = await received.result;
  const spent = outcome.cost.totalUsd;
  const pass = spent < options.usd && outcome.status !== 'exhausted';
  return {
    pass,
    message: () =>
      `expected run to stay under ${options.usd.toFixed(4)} USD; spent ` +
      `${spent.toFixed(4)} USD with outcome '${outcome.status}'`,
  };
}

/** The bundle for expect.extend (Vitest 4 and Jest compatible shapes). */
export const lurkerMatchers: {
  toHaveCalledAgent: typeof toHaveCalledAgent;
  toStayUnderBudget: typeof toStayUnderBudget;
} = { toHaveCalledAgent, toStayUnderBudget };

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> {
    toHaveCalledAgent(agentType: string, options?: { times?: number }): Promise<T>;
    toStayUnderBudget(options: { usd: number }): Promise<T>;
  }
}
